import { LitElement, html } from 'lit';
import { computeAspectRatio } from '../utils/helpers.js';
import { icon } from '../utils/icons.js';
import './prompt-inspector.js';

export class HistoryList extends LitElement {
  static properties = {
    historyItems: { type: Array },
    showBboxes: { type: Boolean },
    providerSchemas: { type: Object }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.historyItems = [];
    this.showBboxes = false;
    this.providerSchemas = {};
  }

  reuse(item) {
    this.dispatchEvent(new CustomEvent('reuse', { detail: item }));
  }

  reuseAdvanced(item) {
    const bgImage = item.images && item.images.length > 0 ? item.images[0] : null;
    this.dispatchEvent(new CustomEvent('reuse-advanced', { detail: { item, bgImage } }));
  }

  deleteItem(item) {
    this.dispatchEvent(new CustomEvent('delete-item', { detail: item }));
  }

  openLightbox(imgSrc, rawPrompt, seed, item, imgIdx) {
    this.dispatchEvent(new CustomEvent('open-lightbox', {
      detail: { src: imgSrc, prompt: rawPrompt, seed: `${seed} (Image ${imgIdx + 1})`, item, imgIdx }
    }));
  }

  onMouseMoveBbox(e) {
    const box = e.currentTarget;
    const tooltip = box.querySelector('.bbox-tooltip');
    if (!tooltip) return;

    const width = 260;
    const height = tooltip.offsetHeight || 140;
    const gap = 15;

    // Calculate viewport-relative coordinates
    let clientX = e.clientX + gap;
    let clientY = e.clientY + gap;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Constrain horizontally
    if (clientX + width > viewportWidth - 10) {
      clientX = e.clientX - width - gap;
    }
    if (clientX < 10) {
      clientX = 10;
    }

    // Constrain vertically
    if (clientY + height > viewportHeight - 10) {
      clientY = e.clientY - height - gap;
    }
    if (clientY < 10) {
      clientY = 10;
    }

    // Temporarily position tooltip at (0, 0) relative to its containing block
    const originalLeft = tooltip.style.left;
    const originalTop = tooltip.style.top;
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';

    // Measure the containing block's viewport-relative origin
    const rect = tooltip.getBoundingClientRect();
    const offsetLeft = rect.left;
    const offsetTop = rect.top;

    // Position tooltip precisely relative to its containing block origin
    tooltip.style.left = `${clientX - offsetLeft}px`;
    tooltip.style.top = `${clientY - offsetTop}px`;
  }

  aspectRatioForItem(item) {
    const providerParams = item?.params?.providerParams || {};
    const aspectRatio = providerParams.aspect_ratio || item?.params?.aspect_ratio;
    if (aspectRatio && String(aspectRatio).includes(':')) {
      return {
        label: String(aspectRatio),
        css: String(aspectRatio).replace(':', ' / ')
      };
    }

    const sizeStr = providerParams.size || item?.params?.size || "1024x1024";
    const [w, h] = String(sizeStr).split("x").map(Number);
    return {
      label: computeAspectRatio(sizeStr),
      css: (w && h) ? `${w} / ${h}` : "1 / 1"
    };
  }

  upsampleBadgeText(item) {
    const upsamplerId = item.params?.upsampler;
    const template = item.params?.upsampleTemplate;
    
    let upsamplerAbbr = '';
    if (upsamplerId) {
      const schema = this.providerSchemas?.[upsamplerId];
      if (schema?.abbreviation) {
        upsamplerAbbr = schema.abbreviation;
      } else if (upsamplerId.includes('ideogram')) {
        upsamplerAbbr = 'IG';
      } else if (upsamplerId.includes('deepseek')) {
        upsamplerAbbr = 'DS';
      } else {
        upsamplerAbbr = upsamplerId;
      }
    }
    
    let templateAbbr = '';
    if (template) {
      if (template === 'v3 (minimal)') {
        templateAbbr = 'v3';
      } else if (template === 'v4 (full)') {
        templateAbbr = 'v4';
      } else {
        templateAbbr = template;
      }
    }

    if (upsamplerAbbr && templateAbbr && upsamplerId !== 'llm_ideogram_magic') {
      return `Magic ${upsamplerAbbr} (${templateAbbr})`;
    } else if (upsamplerAbbr) {
      return `Magic ${upsamplerAbbr}`;
    } else if (templateAbbr) {
      return `Magic (${templateAbbr})`;
    } else {
      return 'Magic';
    }
  }

  getTreeRoots() {
    if (!this.historyItems || this.historyItems.length === 0) {
      return [];
    }

    // 1. Create nodes for all items
    const nodesMap = new Map();
    for (const item of this.historyItems) {
      nodesMap.set(item.uuid, {
        item,
        children: []
      });
    }

    // 2. Identify roots and link children
    const roots = [];
    for (const node of nodesMap.values()) {
      // Find highest available ancestor in the current history items
      let ancestorUuid = node.item.parentUuid;
      let highestAncestor = null;

      while (ancestorUuid && nodesMap.has(ancestorUuid)) {
        highestAncestor = nodesMap.get(ancestorUuid);
        // Normally we just attach to the immediate parent if it exists.
        // Wait, if we attach to the immediate parent, a chain like A -> B -> C works correctly.
        // Let's just use immediate parent if it exists in the map.
        break;
      }

      if (highestAncestor) {
        highestAncestor.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // 3. Helper to compute the max timestamp for any node and its descendants recursively
    const getMaxTimestamp = (node) => {
      let maxTs = node.item.timestamp;
      for (const child of node.children) {
        maxTs = Math.max(maxTs, getMaxTimestamp(child));
      }
      return maxTs;
    };

    // 4. Sort roots by maxTimestamp of the tree descending
    const rootNodesWithMaxTs = roots.map(rootNode => ({
      rootNode,
      maxTimestamp: getMaxTimestamp(rootNode)
    }));
    rootNodesWithMaxTs.sort((a, b) => b.maxTimestamp - a.maxTimestamp);

    return rootNodesWithMaxTs.map(r => r.rootNode);
  }

  renderTree(node, depth = 0) {
    const item = node.item;
    const timeStr = new Date(item.timestamp).toLocaleString();
    const metaParts = [];
    const providerParams = item.params.providerParams || {};
    const samplerPreset = providerParams.sampler_preset || item.params.preset || "V4_QUALITY_48";
    const aspectInfo = this.aspectRatioForItem(item);
    metaParts.push(`Aspect: ${aspectInfo.label}`);
    if (samplerPreset === "custom") {
      metaParts.push(`Steps: ${providerParams.steps ?? item.params.steps ?? 48}`);
      const guidance = providerParams.guidance ?? item.params.guidance;
      if (guidance) metaParts.push(`CFG: ${guidance}`);
    } else {
      metaParts.push(`Preset: ${String(samplerPreset).replace("V4_", "").replace("_", " ")}`);
    }
    metaParts.push(`Seed: ${providerParams.seed ?? item.params.seed ?? 0}`);
    if (item.params.endpoint) {
      const epType = item.params.endpointType || "modal";
      metaParts.push(`Endpoint: ${epType} | ${item.params.endpoint}`);
    }

    const aspect = aspectInfo.css;

    // Sort children chronologically (oldest first)
    node.children.sort((a, b) => a.item.timestamp - b.item.timestamp);

    return html`
      <div class="history-card-wrapper" style="margin-left: ${depth * 28}px; position: relative;">
        ${depth > 0 ? html`
          <div class="history-card-branch-line"></div>
        ` : ''}
        <div class="history-card ${depth > 0 ? 'nested-card' : ''}">
          <div class="history-card-header">
            <div class="history-card-time-group">
              <span class="history-card-time">${timeStr}</span>
              ${item.upsampledPrompt ? html`
                <span class="history-badge magic">✨ ${this.upsampleBadgeText(item)}</span>
              ` : ''}
              ${item.parentUuid ? (() => {
                const parentItem = this.historyItems.find(h => h.uuid === item.parentUuid);
                const titleText = parentItem ? `Parent Prompt: ${parentItem.rawPrompt}` : 'Derived from a previous run';
                return html`
                  <span class="history-badge lineage history-lineage-badge" title="${titleText}">🌿 Derived run</span>
                `;
              })() : ''}
            </div>
            <div class="history-card-actions">
              <button class="history-btn reuse-settings-btn" @click="${() => this.reuse(item)}" title="Reuse settings from this generation">
                ${icon('refresh', 11)}
                Reuse
              </button>
              ${item.upsampledPrompt ? html`
                <button class="history-btn advanced-edit-btn" @click="${() => this.reuseAdvanced(item)}" title="Advanced edit layout boxes">
                  ${icon('edit', 11)}
                  Edit Layout
                </button>
              ` : ''}
              <button class="history-btn delete-item-btn" @click="${() => this.deleteItem(item)}" title="Delete run">
                ${icon('trash', 11)}
                Delete
              </button>
            </div>
          </div>
          <div class="history-card-prompt">${item.rawPrompt}</div>
          <div class="history-card-meta">${metaParts.join(" | ")}</div>
          <div class="history-card-thumbs">
            ${(item.images || []).map((imgUrl, imgIdx) => {
              let parsed = null;
              if (this.showBboxes && item.upsampledPrompt) {
                const trimmed = item.upsampledPrompt.trim();
                if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                  try {
                    parsed = JSON.parse(item.upsampledPrompt);
                  } catch (e) {}
                }
              }
              const elements = parsed?.compositional_deconstruction?.elements || [];
              return html`
                <div class="history-thumb-container" style="aspect-ratio: ${aspect}; cursor: pointer;" @click="${() => this.openLightbox(imgUrl, item.rawPrompt, item.params.seed, item, imgIdx)}">
                  <img src="${imgUrl}" alt="Thumbnail ${imgIdx + 1}" class="history-thumb ${this.showBboxes ? 'show-bboxes-active' : ''}" loading="lazy">
                  <!-- Boxed elements -->
                  ${elements.map((element, idx) => {
                    if (!element.bbox) return '';
                    const bbox = element.bbox;
                    const top = bbox[0] / 10;
                    const left = bbox[1] / 10;
                    const width = (bbox[3] - bbox[1]) / 10;
                    const height = (bbox[2] - bbox[0]) / 10;
                    const styleStr = `top: ${top}%; left: ${left}%; width: ${width}%; height: ${height}%;`;

                    return html`
                      <div class="history-bbox-overlay" 
                           style="${styleStr}" 
                           @mouseenter="${this.onMouseMoveBbox}"
                           @mousemove="${this.onMouseMoveBbox}"
                           @click="${(e) => { e.stopPropagation(); this.openLightbox(imgUrl, item.rawPrompt, item.params.seed, item, imgIdx); }}">
                        <span class="history-bbox-number">${idx + 1}</span>
                        <div class="bbox-tooltip">
                          <div style="font-weight: 700; color: var(--accent-purple); text-transform: uppercase; font-size: 0.72rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.15rem;">Element #${idx + 1}</div>
                          <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Prompt:</span> "${element.text || element.desc || 'Object'}"</div>
                          <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Type:</span> ${element.type || 'obj'}</div>
                          <div><span style="color: var(--text-secondary);">BBox:</span> [${element.bbox.join(', ')}]</div>
                        </div>
                      </div>
                    `;
                  })}

                  <!-- Unboxed elements wrapping container -->
                  <div class="history-unboxed-container">
                    ${elements.map((element, idx) => {
                      if (element.bbox) return '';
                      return html`
                        <div class="history-bbox-overlay unboxed" 
                             @mouseenter="${this.onMouseMoveBbox}"
                             @mousemove="${this.onMouseMoveBbox}"
                             @click="${(e) => { e.stopPropagation(); this.openLightbox(imgUrl, item.rawPrompt, item.params.seed, item, imgIdx); }}">
                          <span class="history-bbox-number">${idx + 1}</span>
                          <div class="bbox-tooltip">
                            <div style="font-weight: 700; color: var(--accent-purple); text-transform: uppercase; font-size: 0.72rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.15rem;">Element #${idx + 1}</div>
                            <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Prompt:</span> "${element.text || element.desc || 'Object'}"</div>
                            <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Type:</span> ${element.type || 'obj'}</div>
                            <div><span style="color: var(--text-secondary);">BBox:</span> None</div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              `;
            })}
          </div>
          ${item.upsampledPrompt ? html`
            <prompt-inspector .upsampledPrompt="${item.upsampledPrompt}"></prompt-inspector>
          ` : ''}
        </div>
      </div>
      ${node.children.map(child => this.renderTree(child, depth + 1))}
    `;
  }

  render() {
    const trees = this.getTreeRoots();

    if (trees.length === 0) {
      return html`
        <div class="history-empty">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p>No history yet. Generate some masterpieces!</p>
        </div>
      `;
    }

    return html`
      ${trees.map(rootNode => html`
        <div class="history-tree-group">
          ${this.renderTree(rootNode, 0)}
        </div>
      `)}
    `;
  }
}
customElements.define('history-list', HistoryList);
