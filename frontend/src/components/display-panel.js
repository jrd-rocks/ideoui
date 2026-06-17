import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';
import './image-grid.js';
import './prompt-inspector.js';
import './layout-editor.js';
import './history-list.js';
import './job-queue.js';

export class DisplayPanel extends LitElement {
  static properties = {
    selectedJob: { type: Object },
    activeTab: { type: String },
    historyItems: { type: Array },
    isRefining: { type: Boolean },
    jobQueue: { type: Array },
    selectedJobId: { type: String },
    showBboxes: { type: Boolean },
    selectedElementIndex: { type: Number },
    pinnedBoxIndex: { type: Number },
    readOnlyEditor: { type: Boolean },
    providerSchemas: { type: Object }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.selectedJob = null;
    this.activeTab = 'current';
    this.historyItems = [];
    this.isRefining = false;
    this.jobQueue = [];
    this.selectedJobId = '';
    this.showBboxes = false;
    this.selectedElementIndex = null;
    this.pinnedBoxIndex = null;
    this.readOnlyEditor = false;
    this._streamStickiness = new Map();
    this._streamObservers = new Map();
  }

  updated(changedProperties) {
    this.setupStreamScrollObservers();
    this.updateStreamScroll();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const observer of this._streamObservers.values()) {
      observer.disconnect();
    }
    this._streamObservers.clear();
  }

  isNearBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 36;
  }

  updateStreamScroll() {
    requestAnimationFrame(() => {
      const panes = this.querySelectorAll('[data-stream-pane]');
      panes.forEach((pane) => {
        const key = pane.getAttribute('data-stream-pane');
        const sticky = this._streamStickiness.get(key) ?? true;
        if (sticky) {
          pane.scrollTop = pane.scrollHeight;
        }
      });
    });
  }

  setupStreamScrollObservers() {
    const panes = Array.from(this.querySelectorAll('[data-stream-pane]'));
    const liveKeys = new Set(panes.map(pane => pane.getAttribute('data-stream-pane')));

    for (const [key, observer] of this._streamObservers.entries()) {
      if (!liveKeys.has(key)) {
        observer.disconnect();
        this._streamObservers.delete(key);
      }
    }

    panes.forEach((pane) => {
      const key = pane.getAttribute('data-stream-pane');
      if (!key || this._streamObservers.has(key)) return;
      const observer = new MutationObserver(() => {
        const sticky = this._streamStickiness.get(key) ?? true;
        if (sticky) {
          requestAnimationFrame(() => {
            pane.scrollTop = pane.scrollHeight;
          });
        }
      });
      observer.observe(pane, { childList: true, characterData: true, subtree: true });
      this._streamObservers.set(key, observer);
      pane.scrollTop = pane.scrollHeight;
    });
  }

  onStreamScroll(e) {
    const pane = e.currentTarget;
    const key = pane.getAttribute('data-stream-pane');
    if (!key) return;
    this._streamStickiness.set(key, this.isNearBottom(pane));
  }

  switchTab(tabName) {
    this.dispatchEvent(new CustomEvent('switch-tab', { detail: tabName }));
  }

  cancelActiveJob() {
    this.dispatchEvent(new CustomEvent('cancel-active-job'));
  }

  clearHistory() {
    if (confirm("Are you sure you want to delete ALL history? This action cannot be undone.")) {
      this.dispatchEvent(new CustomEvent('clear-history'));
    }
  }

  toggleBboxes(e) {
    this.showBboxes = e.target.checked;
  }

  /**
   * Provider params to show in read-only views (held detail), filtered the same
   * way the control panel does: only schema-defined inputs whose `visible_when`
   * conditions are met. Hides both derived params (width/height) and params that
   * are inert under the current preset (e.g. steps/guidance when preset != custom).
   */
  visibleProviderParams(job) {
    const params = job.providerParams || {};
    const inputs = this.providerSchemas?.[job.provider]?.inputs || {};
    return Object.entries(params).filter(([key]) => {
      const def = inputs[key];
      if (!def) return false;
      if (!def.visible_when) return true;
      return Object.entries(def.visible_when).every(([dep, expected]) => params[dep] === expected);
    });
  }

  formatParamLabel(key, definition) {
    if (definition?.label) return definition.label;
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  render() {
    const isCurrent = this.activeTab === 'current';

    return html`
      <section class="display-panel glass-card">
        <div class="panel-tabs">
          <button class="tab-btn ${isCurrent ? 'active' : ''}" id="tabCurrent" @click="${() => this.switchTab('current')}">Current Output</button>
          <button class="tab-btn ${!isCurrent ? 'active' : ''}" id="tabHistory" @click="${() => this.switchTab('history')}">History (<span id="historyCount">${(this.historyItems || []).length}</span>)</button>
        </div>

        <!-- Tab: Current Output -->
        <div id="currentTabContent" class="tab-content ${isCurrent ? '' : 'hidden'}">
          ${this.renderCurrentContent()}
        </div>
      <!-- Tab: History -->
      <div id="historyTabContent" class="tab-content ${!isCurrent ? '' : 'hidden'}">
        <div class="history-header">
          <h3>Past Masterpieces</h3>
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <label class="toggle-switch-container" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; user-select: none; color: var(--text-secondary);">
              <input type="checkbox" ?checked="${this.showBboxes}" @change="${this.toggleBboxes}" style="cursor: pointer; accent-color: var(--accent-purple);">
              <span>Show Bounding Boxes</span>
            </label>
            <button id="clearHistoryBtn" class="clear-history-btn" @click="${this.clearHistory}">Clear All</button>
          </div>
        </div>
        <div class="history-list" id="historyList">
          <history-list 
            .historyItems="${this.historyItems}"
            .showBboxes="${this.showBboxes}"
            .providerSchemas="${this.providerSchemas}"
            @reuse="${(e) => this.dispatchEvent(new CustomEvent('reuse-settings', { detail: e.detail }))}"
            @reuse-advanced="${(e) => this.dispatchEvent(new CustomEvent('reuse-advanced', { detail: e.detail }))}"
            @delete-item="${(e) => this.dispatchEvent(new CustomEvent('delete-history-item', { detail: e.detail }))}"
            @open-lightbox="${(e) => this.dispatchEvent(new CustomEvent('open-lightbox', { detail: e.detail }))}">
          </history-list>
        </div>
      </div>
    </section>
  `;
}

  renderCurrentContent() {
    if (!this.selectedJob) {
      return html`
        <!-- Idle State -->
        <div class="idle-state" id="idleState">
          <div class="idle-cursive-text">Ready to generate when you are</div>
        </div>
      `;
    }

  const job = this.selectedJob;

  if (job.status === "held") {
    const promptToShow = job.upsampledPrompt || job.rawPrompt || '';
    const isJson = Boolean(job.upsampledPrompt);

    return html`
      <div class="held-job-detail">
        <div class="held-job-header">
          <span class="q-badge held">Held</span>
          <h2>Held Generation Detail</h2>
        </div>
        
        <div class="held-job-body">
          <div class="held-prompt-section">
            <h4>Input Text Prompt</h4>
            <div class="held-prompt-text">${job.rawPrompt}</div>
          </div>

          ${isJson ? html`
            <div class="held-prompt-section expandable">
              <h4>Upsampled JSON Prompt</h4>
              <pre class="held-prompt-content json-format">${promptToShow}</pre>
            </div>
          ` : ''}
          
          <div class="held-meta-section">
            <h4>Parameters</h4>
            <div class="held-params-grid">
              <div class="param-item">
                <span class="param-name">Endpoint</span>
                <span class="param-value">${job.provider || 'default'}</span>
              </div>
              ${job.upsampler ? html`
                <div class="param-item">
                  <span class="param-name">Upsampler</span>
                  <span class="param-value">${job.upsampler}</span>
                </div>
              ` : ''}
              ${this.visibleProviderParams(job).map(([k, v]) => {
                const inputs = this.providerSchemas?.[job.provider]?.inputs || {};
                return html`
                  <div class="param-item">
                    <span class="param-name">${this.formatParamLabel(k, inputs[k])}</span>
                    <span class="param-value">${typeof v === 'object' ? JSON.stringify(v) : v}</span>
                  </div>
                `;
              })}
            </div>
          </div>

          <div class="held-actions-section">
            <button class="action-btn primary-action" @click="${() => this.dispatchEvent(new CustomEvent('edit-held-job', { detail: job.id }))}">
              <span class="btn-icon">${icon('edit', 14)}</span>
              Advanced Layout Editor
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (job.status === "pending" || job.status === "upsampling" || job.status === "upsampled" || job.status === "generating") {
    const loadingTitle = job.status === "pending" ? "Queued" : job.status === "generating" ? "Generating" : job.status === "upsampling" ? "Upsampling" : "Working";
    const loadingMsg = job.displayText || job.display_text || "Waiting for the next server update...";
    const steps = job.steps && job.steps.length ? job.steps : [{ name: loadingMsg, status: "active" }];
    const hasPreviews = job.genPreviews && job.genPreviews.length > 0;
    const providerParams = job.providerParams || job.params?.providerParams || {};
    const rawImageCount = providerParams.image_count ?? providerParams.imageCount ?? job.params?.imageCount ?? job.params?.image_count ?? 1;
    const imageCount = Number.isFinite(Number(rawImageCount)) && Number(rawImageCount) > 0 ? Math.max(1, Math.round(Number(rawImageCount))) : 1;
    const previewSlots = hasPreviews ? Array.from({ length: imageCount }, (_, index) => job.genPreviews?.[index] || null) : [];
    const splitStepLabel = job.genImageCurrent && job.genImageTotal && job.genStepCurrent && job.genStepTotal
      ? `Image ${job.genImageCurrent}/${job.genImageTotal} | Step ${job.genStepCurrent}/${job.genStepTotal}`
      : '';
    const stepLabel = splitStepLabel || (job.genStep && job.genTotal ? `Step ${job.genStep}/${job.genTotal}` : '');

    return html`
      <!-- Loading State -->
      <div class="loading-state" id="loadingState">
        <div class="loading-status-row">
          <div class="spinner-wrapper">
            <div class="spinner"></div>
            <div class="spinner-glow"></div>
          </div>
          <div class="loading-copy">
            <h3 id="loadingTitle">${loadingTitle}${stepLabel ? html` <span class="step-counter">${stepLabel}</span>` : ''}</h3>
            <p id="loadingMsg">${loadingMsg}</p>
          </div>
          <div class="loading-steps">
            ${steps.map(step => html`
              <div class="loading-step ${step.status || 'pending'}">
                <span class="step-bullet"></span>
                <span class="step-text">${step.name}</span>
              </div>
            `)}
          </div>
        </div>
        ${hasPreviews ? html`
          <div class="gen-preview-grid">
            ${previewSlots.map((src, i) => {
              const sizeStr = job.params?.size || "1024x1024";
              const [w, h] = sizeStr.split("x").map(Number);
              const aspect = (w && h) ? `${w} / ${h}` : "1 / 1";
              return html`
                <div class="gen-preview-card ${src ? '' : 'pending'}" style="aspect-ratio: ${aspect};">
                  ${src ? html`
                    <img class="gen-preview-img" src="${src}" alt="Preview ${i + 1}">
                  ` : html`
                    <div class="gen-preview-placeholder">Waiting for image ${i + 1}</div>
                  `}
                </div>
              `;
            })}
          </div>
        ` : ''}
        ${(!hasPreviews || job.status === 'upsampling' || job.llmStream?.content || job.llmStream?.thinking) ? html`
          <div class="loading-main">
            ${job.status === 'upsampling' || job.llmStream?.content || job.llmStream?.thinking ? html`
              <details class="llm-stream-panel" ?open="${!job.llmStream?.done}">
                <summary>
                  <span class="thinking-pulse"></span>
                  ${job.llmStream?.done ? 'Final prompt' : 'Thinking and building prompt'}
                </summary>
                <div class="llm-stream-body">
                  ${job.llmStream?.thinking ? html`
                    <section class="llm-stream-section thinking">
                      <div class="llm-stream-label">Thinking</div>
                      <pre class="llm-stream-thinking" data-stream-pane="thinking" @scroll="${this.onStreamScroll}">${job.llmStream.thinking}</pre>
                    </section>
                  ` : ''}
                  <section class="llm-stream-section content">
                    <div class="llm-stream-label">Generated prompt</div>
                    ${job.llmStream?.content ? html`<pre class="llm-stream-content" data-stream-pane="content" @scroll="${this.onStreamScroll}">${job.llmStream.content}</pre>` : html`<div class="llm-stream-placeholder">Waiting for generated prompt tokens...</div>`}
                  </section>
                </div>
              </details>
            ` : html`
              <div class="loading-empty-stream">Waiting for the first provider update...</div>
            `}
          </div>
        ` : ''}
        <div class="loading-cancel-wrapper">
          <button id="cancelActiveJobBtn" class="loading-cancel-btn" @click="${this.cancelActiveJob}">Cancel Generation</button>
        </div>
      </div>
    `;
  }

  if (job.status === "editing" || job.status === "inspecting") {
    return html`
      <layout-editor
        .upsampledPrompt="${job.upsampledPrompt}"
        .aspectRatio="${job.providerParams?.aspect_ratio || job.params?.providerParams?.aspect_ratio || job.params?.aspect_ratio || '1:1'}"
        .backgroundImage="${job.backgroundImage}"
        .selectedElementIndex="${this.selectedElementIndex}"
        .pinnedBoxIndex="${this.pinnedBoxIndex}"
        .readOnly="${this.readOnlyEditor || job.status === 'inspecting'}"
        @update-prompt="${(e) => this.dispatchEvent(new CustomEvent('update-editor-prompt', { detail: e.detail }))}"
        @editor-undo="${() => this.dispatchEvent(new CustomEvent('editor-undo'))}"
        @editor-redo="${() => this.dispatchEvent(new CustomEvent('editor-redo'))}"
        @element-selected="${(e) => this.dispatchEvent(new CustomEvent('element-selected', { detail: e.detail }))}"
        @element-pinned="${(e) => this.dispatchEvent(new CustomEvent('element-pinned', { detail: e.detail }))}"
        @cancel="${() => this.dispatchEvent(new CustomEvent('editor-cancel'))}"
        @generate="${() => this.dispatchEvent(new CustomEvent('editor-generate'))}">
      </layout-editor>
    `;
  }

  if (job.status === "completed") {
    return html`
      <!-- Outputs Panel -->
      <div class="outputs-content" id="outputsContent">
        <image-grid 
          .images="${job.images}" 
          .rawPrompt="${job.rawPrompt}" 
          .seed="${job.params.seed}" 
          .params="${job.params}"
          .upsampledPrompt="${job.upsampledPrompt}"
          .uuid="${job.uuid}"
          .parentUuid="${job.parentUuid}"
          .genPreviews="${job.genPreviews || []}"
          @open-lightbox="${(e) => this.dispatchEvent(new CustomEvent('open-lightbox', { detail: e.detail }))}">
        </image-grid>
        <prompt-inspector .upsampledPrompt="${job.upsampledPrompt}"></prompt-inspector>
      </div>
    `;
  }

  if (job.status === "failed") {
    return html`
      <div class="loading-state">
        <div class="spinner-wrapper" style="animation: none;">
          <div class="spinner" style="border-top-color: var(--status-red-border); border-bottom-color: var(--status-red-text); animation: none;"></div>
        </div>
        <h3>Execution Failed</h3>
        <p><span style="color: var(--status-red-text);">${job.error || 'Unknown error'}</span></p>
        <div class="loading-cancel-wrapper">
          <button class="loading-cancel-btn" @click="${this.cancelActiveJob}">Clear Job</button>
        </div>
      </div>
    `;
  }

  return html``;
}
}
customElements.define('display-panel', DisplayPanel);
