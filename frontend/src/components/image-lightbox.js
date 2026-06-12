import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';

export class ImageLightbox extends LitElement {
  static properties = {
    src: { type: String },
    prompt: { type: String },
    seedLabel: { type: String },
    item: { type: Object },
    hidden: { type: Boolean },
    showBboxes: { type: Boolean }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.hidden = true;
    this.src = '';
    this.prompt = '';
    this.seedLabel = '';
    this.item = null;
    this.showBboxes = false;
  }

  close() {
    this.hidden = true;
    this.showBboxes = false;
    this.dispatchEvent(new CustomEvent('close'));
  }

  reuse() {
    this.dispatchEvent(new CustomEvent('reuse', { detail: this.item }));
    this.close();
  }

  advancedEdit() {
    this.dispatchEvent(new CustomEvent('reuse-advanced', {
      detail: {
        item: this.item,
        bgImage: this.src
      }
    }));
    this.close();
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
    const bottomBar = this.querySelector('.lightbox-bottom-bar');
    const bottomConstraint = bottomBar ? bottomBar.getBoundingClientRect().top : viewportHeight;

    if (clientY + height > bottomConstraint - 10) {
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

  render() {
    if (this.hidden) return html``;

    let parsed = null;
    if (this.showBboxes && this.item && this.item.upsampledPrompt) {
      try {
        parsed = JSON.parse(this.item.upsampledPrompt);
      } catch (e) {}
    }
    const elements = parsed?.compositional_deconstruction?.elements || [];

    return html`
      <div id="lightbox" class="lightbox" @click="${(e) => { if (e.target.id === 'lightbox') this.close(); }}">
        <button class="lightbox-close" @click="${this.close}" title="Close Lightbox">
          ${icon('close', 24)}
        </button>
        <div class="lightbox-image-wrapper">
          <div class="lightbox-image-container">
            <img class="lightbox-content" id="lightboxImg" src="${this.src}">
            ${elements.map((element, idx) => {
              const bbox = element.bbox || [0, 0, 1000, 1000];
              const y1 = bbox[0];
              const x1 = bbox[1];
              const y2 = bbox[2];
              const x2 = bbox[3];
              const top = y1 / 10;
              const left = x1 / 10;
              const width = (x2 - x1) / 10;
              const height = (y2 - y1) / 10;

              return html`
                <div class="lightbox-bbox-overlay" 
                     style="top: ${top}%; left: ${left}%; width: ${width}%; height: ${height}%;"
                     @mouseenter="${this.onMouseMoveBbox}"
                     @mousemove="${this.onMouseMoveBbox}">
                  <span class="lightbox-bbox-number">${idx + 1}</span>
                  <span class="lightbox-bbox-label">${element.text || element.desc || 'Element'}</span>
                  <div class="bbox-tooltip">
                    <div style="font-weight: 700; color: var(--accent-purple); text-transform: uppercase; font-size: 0.72rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.15rem;">Element #${idx + 1}</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Prompt:</span> "${element.text || element.desc || 'Object'}"</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Type:</span> ${element.type || 'obj'}</div>
                    <div><span style="color: var(--text-secondary);">BBox:</span> [${bbox.join(', ')}]</div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
        <div class="lightbox-bottom-bar">
          <div class="lightbox-prompt-container">
            <span class="lightbox-prompt-label">Prompt Idea</span>
            <div id="lightboxCaption" class="lightbox-caption">${this.prompt}</div>
          </div>
          <div class="lightbox-row">
            <span class="lightbox-meta-badge" id="lightboxMeta">Seed: ${this.seedLabel}</span>
            <div class="lightbox-actions">
              ${this.item && this.item.upsampledPrompt ? html`
                <label class="toggle-switch-container" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; user-select: none; color: var(--text-secondary); margin-right: 1rem;">
                  <input type="checkbox" ?checked="${this.showBboxes}" @change="${(e) => this.showBboxes = e.target.checked}" style="cursor: pointer; accent-color: var(--accent-purple);">
                  <span>Show Bounding Boxes</span>
                </label>
              ` : ''}
              ${this.item ? html`
                <button id="lightboxReuseBtn" class="lightbox-action-btn" @click="${this.reuse}">
                  ${icon('refresh', 14)}
                  Reuse Settings
                </button>
              ` : ''}
              ${this.item && this.item.upsampledPrompt ? html`
                <button id="lightboxAdvancedEditBtn" class="lightbox-action-btn advanced-edit-btn" @click="${this.advancedEdit}">
                  ${icon('edit', 14)}
                  Advanced Edit Prompt
                </button>
              ` : ''}
              <a id="lightboxDownload" href="${this.src}" download="generated_image.png" class="lightbox-download-btn">
                ${icon('download', 14)}
                Download High-Res
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('image-lightbox', ImageLightbox);
