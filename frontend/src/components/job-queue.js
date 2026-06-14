import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';

export class JobQueue extends LitElement {
  static properties = {
    jobQueue: { type: Array },
    selectedJobId: { type: String },
    holdGeneration: { type: Boolean }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.jobQueue = [];
    this.selectedJobId = '';
    this.holdGeneration = false;
    // Track which editing-parent nodes are expanded (collapsed by default)
    this._expandedEditors = new Set();
  }

  connectedCallback() {
    super.connectedCallback();
    this.fetchHoldState();
  }

  async fetchHoldState() {
    try {
      const resp = await fetch('/api/system/settings');
      if (resp.ok) {
        const data = await resp.json();
        this.holdGeneration = data.hold_generation;
      }
    } catch (e) {
      console.warn("Failed to fetch hold generation state");
    }
  }

  async toggleHoldGeneration(e) {
    const newState = e.target.checked;
    this.holdGeneration = newState;
    try {
      await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hold_generation: newState })
      });
    } catch (err) {
      console.warn("Failed to update hold generation state", err);
    }
  }

  selectJob(job) {
    this.dispatchEvent(new CustomEvent('select-job', { detail: job }));
  }

  cancelJob(jobId, e) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('cancel-job', { detail: jobId }));
  }

  clearCompleted() {
    this.dispatchEvent(new CustomEvent('clear-completed-jobs'));
  }

  toggleEditorExpand(jobId, e) {
    e.stopPropagation();
    if (this._expandedEditors.has(jobId)) {
      this._expandedEditors.delete(jobId);
    } else {
      this._expandedEditors.add(jobId);
    }
    this.requestUpdate();
  }

  getTreeRoots() {
    if (!this.jobQueue || this.jobQueue.length === 0) return [];

    const nodesMap = new Map();
    for (const job of this.jobQueue) {
      nodesMap.set(job.id, { job, children: [] });
      if (job.uuid) nodesMap.set(job.uuid, nodesMap.get(job.id));
    }

    const roots = [];
    for (const node of nodesMap.values()) {
      if (node.visited) continue;
      node.visited = true;

      const parentUuid = node.job.parentUuid;
      if (parentUuid && nodesMap.has(parentUuid)) {
        nodesMap.get(parentUuid).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /** Return status badge templates for the children, e.g. a HELD badge or GENERATING badge. */
  summariseChildren(children) {
    // Priority order for display (most active first)
    const priority = ['generating', 'upsampling', 'pending', 'held', 'failed', 'completed'];
    const counts = {};
    for (const child of children) {
      const s = child.job.status;
      counts[s] = (counts[s] || 0) + 1;
    }
    return priority
      .filter(s => counts[s])
      .map(s => {
        const n = counts[s];
        const label = n > 1 ? `${n}\u00d7 ${s}` : s;
        if (s === 'generating') return html`<span class="q-badge generating pulse-blue">${label}</span>`;
        if (s === 'upsampling') return html`<span class="q-badge upsampling pulse-purple">${label}</span>`;
        if (s === 'held')       return html`<span class="q-badge held">${label}</span>`;
        if (s === 'pending')    return html`<span class="q-badge pending">${label}</span>`;
        if (s === 'failed')     return html`<span class="q-badge failed">${label}</span>`;
        if (s === 'completed')  return html`<span class="q-badge completed">${label}</span>`;
        return html`<span class="q-badge pending">${label}</span>`;
      });
  }

  renderEditingParent(node) {
    const job = node.job;
    const isSelected = this.selectedJobId === job.id;
    const isExpanded = this._expandedEditors.has(job.id);
    const childCount = node.children.length;
    const childSummary = this.summariseChildren(node.children);

    return html`
      <div class="queue-item-wrapper">
        <div class="queue-item editing-parent ${isSelected ? 'selected' : ''}" @click="${() => this.selectJob(job)}">
          <div class="editing-parent-icon" title="Edit session">
            ${icon('edit', 13)}
          </div>
          <div class="q-item-info">
            <div class="q-item-prompt editing-parent-prompt">${job.rawPrompt}</div>
            <div class="q-item-meta">
              <span class="q-badge editing">Editing</span>
              ${childCount > 0 ? childSummary : ''}
            </div>
          </div>
          <div class="q-item-actions">
            ${childCount > 0 ? html`
              <button
                class="q-expand-btn ${isExpanded ? 'expanded' : ''}"
                title="${isExpanded ? 'Hide children' : 'Show children'}"
                @click="${(e) => this.toggleEditorExpand(job.id, e)}"
              >
                <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="2,4 6,8 10,4"/>
                </svg>
              </button>
            ` : ''}
            <button class="q-cancel-btn" title="Remove Job" @click="${(e) => this.cancelJob(job.id, e)}">
              ${icon('close', 12)}
            </button>
          </div>
        </div>
        ${isExpanded ? node.children.map(child => this.renderJob(child, 1)) : ''}
      </div>
    `;
  }

  renderJob(node, depth = 0) {
    const job = node.job;

    // Editing parents with children get a compact collapsed treatment
    if (job.status === 'editing' && node.children.length > 0) {
      return this.renderEditingParent(node);
    }

    const isSelected = this.selectedJobId === job.id;
    let statusBadge = '';

    if (job.status === "pending") {
      statusBadge = html`<span class="q-badge pending">Pending</span>`;
    } else if (job.status === "upsampling") {
      statusBadge = html`<span class="q-badge upsampling pulse-purple">Upsampling</span>`;
    } else if (job.status === "upsampled") {
      statusBadge = html`<span class="q-badge upsampled">Upsampled</span>`;
    } else if (job.status === "generating") {
      const stepInfo = job.genStep && job.genTotal ? html` <span class="q-step-counter">${job.genStep}/${job.genTotal}</span>` : '';
      statusBadge = html`<span class="q-badge generating pulse-blue">Generating${stepInfo}</span>`;
    } else if (job.status === "completed") {
      statusBadge = html`<span class="q-badge completed">Done</span>`;
    } else if (job.status === "failed") {
      statusBadge = html`<span class="q-badge failed">Failed</span>`;
    } else if (job.status === "editing") {
      statusBadge = html`<span class="q-badge editing pulse-purple">Editing</span>`;
    } else if (job.status === "held") {
      statusBadge = html`<span class="q-badge held">Held</span>`;
    }

    const detailedStatusText = job.displayText || job.display_text || job.status;
    const providerParams = job.providerParams || {};
    const sizeLabel = job.params?.size || providerParams.aspect_ratio || 'dynamic';
    const seedLabel = job.params?.seed ?? providerParams.seed ?? 0;

    return html`
      <div class="queue-item-wrapper">
        <div class="queue-item ${job.status} ${isSelected ? 'selected' : ''} ${depth > 0 ? 'nested-item' : ''}" @click="${() => this.selectJob(job)}">
          <div class="q-item-info">
            <div class="q-item-prompt">${job.rawPrompt}</div>
            <div class="q-item-meta">Size: ${sizeLabel} | Seed: ${seedLabel} | ${statusBadge} <span class="q-item-detail">${detailedStatusText}</span></div>
          </div>
          <div class="q-item-actions">
            <button class="q-cancel-btn" title="Remove Job" @click="${(e) => this.cancelJob(job.id, e)}">
              ${icon('close', 12)}
            </button>
          </div>
        </div>
        ${node.children.map(child => this.renderJob(child, depth + 1))}
      </div>
    `;
  }

  render() {
    const queueItems = this.jobQueue || [];
    const heldCount = queueItems.filter(j => j.status === 'held').length;
    const treeRoots = this.getTreeRoots();

    return html`
      <div id="queuePanel" class="queue-panel">
        <div class="queue-list" id="queueList">
          ${treeRoots.length > 0
            ? treeRoots.map(rootNode => this.renderJob(rootNode, 0))
            : html`
              <div class="queue-empty">
                <p>No active generations</p>
              </div>
            `}
        </div>
        <div class="queue-footer">
          <label class="switch-container">
            <span class="switch-label">Hold Generation ${heldCount > 0 ? `(${heldCount})` : ''}</span>
            <input type="checkbox" .checked="${this.holdGeneration}" @change="${this.toggleHoldGeneration}" />
            <span class="switch-slider"></span>
          </label>
          <button id="clearQueueBtn" class="clear-queue-btn" @click="${this.clearCompleted}">
            Clear Completed
          </button>
        </div>
      </div>
    `;
  }
}
customElements.define('job-queue', JobQueue);
