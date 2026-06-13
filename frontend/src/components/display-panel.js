import { LitElement, html } from 'lit';
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
    readOnlyEditor: { type: Boolean }
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
        <div class="sparkles-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 3V4M12 20V21M4 12H3M21 12H20M18.364 5.636L17.657 6.343M6.343 17.657L5.636 18.364M18.364 18.364L17.657 17.657M6.343 5.636L5.636 6.343" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9.5 9.5L12 8.5L14.5 9.5L13.5 12L14.5 14.5L12 13.5L9.5 14.5L10.5 12L9.5 9.5Z" fill="currentColor"/>
          </svg>
        </div>
        <h2>Create Something Amazing</h2>
        <p>Enter a prompt, configure your parameters, and click Generate to see Ideogram 4's incredible layout and text rendering capabilities.</p>
      </div>
    `;
  }

  const job = this.selectedJob;

  if (job.status === "pending" || job.status === "upsampling" || job.status === "upsampled" || job.status === "generating") {
    const loadingTitle = job.status === "pending" ? "Queued" : job.status === "generating" ? "Generating" : job.status === "upsampling" ? "Upsampling" : "Working";
    const loadingMsg = job.displayText || job.display_text || "Waiting for the next server update...";
    const steps = job.steps && job.steps.length ? job.steps : [{ name: loadingMsg, status: "active" }];
    const hasPreviews = job.genPreviews && job.genPreviews.length > 0 && job.status === "generating";
    const stepLabel = job.genStep && job.genTotal ? `Step ${job.genStep}/${job.genTotal}` : '';

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
            ${job.genPreviews.map((src, i) => html`
              <img class="gen-preview-img" src="${src}" alt="Preview ${i + 1}">
            `)}
          </div>
        ` : ''}
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
