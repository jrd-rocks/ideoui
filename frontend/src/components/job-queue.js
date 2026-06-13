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

  renderJob(node, depth = 0) {
    const job = node.job;
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
    if (!this.jobQueue || this.jobQueue.length === 0) {
      return html``;
    }

    const activeCount = this.jobQueue.filter(j => j.status !== 'completed' && j.status !== 'failed').length;
    const heldCount = this.jobQueue.filter(j => j.status === 'held').length;
    const treeRoots = this.getTreeRoots();

    return html`
      <div id="queuePanel" class="queue-panel">
        <div class="queue-header">
          <h4>Active Queue (<span id="queueActiveCount">${activeCount}</span>)</h4>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label class="hold-generation-toggle" style="display: flex; align-items: center; gap: 5px; font-size: 0.8rem; cursor: pointer;">
              <input type="checkbox" .checked="${this.holdGeneration}" @change="${this.toggleHoldGeneration}" />
              Hold Generation ${heldCount > 0 ? `(${heldCount})` : ''}
            </label>
            <button id="clearQueueBtn" class="clear-queue-btn" @click="${this.clearCompleted}">Clear Completed</button>
          </div>
        </div>
        <div class="queue-list" id="queueList">
          ${treeRoots.map(rootNode => this.renderJob(rootNode, 0))}
        </div>
      </div>
    `;
  }
}
customElements.define('job-queue', JobQueue);
