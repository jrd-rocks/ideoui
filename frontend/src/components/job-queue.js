import { LitElement, html } from 'lit';
import { icon } from '../utils/icons.js';

export class JobQueue extends LitElement {
  static properties = {
    jobQueue: { type: Array },
    selectedJobId: { type: String }
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.jobQueue = [];
    this.selectedJobId = '';
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

  render() {
    if (!this.jobQueue || this.jobQueue.length === 0) {
      return html``;
    }

    const activeCount = this.jobQueue.filter(j => j.status !== 'completed' && j.status !== 'failed').length;

    return html`
      <div id="queuePanel" class="queue-panel">
        <div class="queue-header">
          <h4>Active Queue (<span id="queueActiveCount">${activeCount}</span>)</h4>
          <button id="clearQueueBtn" class="clear-queue-btn" @click="${this.clearCompleted}">Clear Completed</button>
        </div>
        <div class="queue-list" id="queueList">
          ${this.jobQueue.map((job) => {
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
            }

            const detailedStatusText = job.displayText || job.display_text || job.status;
            const providerParams = job.providerParams || {};
            const sizeLabel = job.params?.size || providerParams.aspect_ratio || 'dynamic';
            const seedLabel = job.params?.seed ?? providerParams.seed ?? 0;

            return html`
              <div class="queue-item ${job.status} ${isSelected ? 'selected' : ''}" @click="${() => this.selectJob(job)}">
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
            `;
          })}
        </div>
      </div>
    `;
  }
}
customElements.define('job-queue', JobQueue);
