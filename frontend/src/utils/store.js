class QueueStore {
  constructor() {
    this.jobQueue = [];
    this.selectedJobId = '';
    this.listeners = new Set();
    this.socket = null;
    this.reconnectTimer = null;
    this.reconnectDelay = 1000;
    this.connected = false;
    this.streams = {};
    this.localFieldLocks = {};
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error("Error in queue store listener:", error);
      }
    }
  }

  normalizeJob(job) {
    if (!job) return null;
    return {
      ...job,
      id: job.id || job.job_id,
      parentUuid: job.parentUuid ?? job.parent_uuid ?? null,
      rawPrompt: job.rawPrompt ?? job.raw_prompt ?? '',
      upsampledPrompt: job.upsampledPrompt ?? job.upsampled_prompt ?? null,
      displayText: job.displayText ?? job.display_text ?? '',
      chatMessages: job.chatMessages ?? job.chat_messages ?? [],
      providerParams: job.providerParams ?? job.provider_params ?? {},
      upsamplerParams: job.upsamplerParams ?? job.upsampler_params ?? {},
      draftJson: job.draftJson ?? job.draft_json ?? null,
      previewsUrl: job.previewsUrl ?? job.previews_url ?? null,
      llmStream: job.llmStream ?? this.streams[job.id || job.job_id] ?? null,
      params: job.params || {}
    };
  }

  getSelectedJob() {
    return this.jobQueue.find(job => job.id === this.selectedJobId) || null;
  }

  setQueue(newQueue) {
    this.jobQueue = (newQueue || []).map(job => this.normalizeJob(job)).filter(Boolean);
    if (this.selectedJobId && !this.jobQueue.some(job => job.id === this.selectedJobId)) {
      this.selectedJobId = this.jobQueue[0]?.id || '';
    }
    this.notify();
  }

  setSelectedJobId(id) {
    this.selectedJobId = id || '';
    this.notify();
  }

  markLocalEdit(jobId, fields, ttlMs = 10000) {
    if (!jobId || !fields?.length) return;
    const existing = this.localFieldLocks[jobId] || {};
    const until = Date.now() + ttlMs;
    for (const field of fields) {
      existing[field] = until;
    }
    this.localFieldLocks[jobId] = existing;
  }

  mergeRemoteJob(existingJob, remoteJob) {
    if (!existingJob) return remoteJob;
    const locks = this.localFieldLocks[existingJob.id] || {};
    const now = Date.now();
    const merged = { ...existingJob, ...remoteJob };
    for (const [field, until] of Object.entries(locks)) {
      if (until > now && Object.prototype.hasOwnProperty.call(remoteJob, field)) {
        if (remoteJob[field] === existingJob[field]) {
          delete locks[field];
        } else {
          merged[field] = existingJob[field];
        }
      } else if (until <= now) {
        delete locks[field];
      }
    }
    if (Object.keys(locks).length) {
      this.localFieldLocks[existingJob.id] = locks;
    } else {
      delete this.localFieldLocks[existingJob.id];
    }
    return merged;
  }

  addJob(job) {
    const normalized = this.normalizeJob(job);
    if (!normalized) return;
    const existing = this.jobQueue.findIndex(item => item.id === normalized.id);
    if (existing >= 0) {
      this.jobQueue = this.jobQueue.map(item => item.id === normalized.id ? this.normalizeJob(this.mergeRemoteJob(item, normalized)) : item);
    } else {
      this.jobQueue = [normalized, ...this.jobQueue];
    }
    this.notify();
  }

  updateJob(jobId, updates, options = {}) {
    if (options.local) {
      this.markLocalEdit(jobId, options.fields || Object.keys(updates || {}));
    }
    let changed = false;
    this.jobQueue = this.jobQueue.map(job => {
      if (job.id !== jobId) return job;
      changed = true;
      return this.normalizeJob({ ...job, ...updates });
    });
    if (changed) this.notify();
  }

  removeJobLocal(jobId) {
    this.jobQueue = this.jobQueue.filter(job => job.id !== jobId);
    delete this.streams[jobId];
    if (this.selectedJobId === jobId) {
      this.selectedJobId = this.jobQueue[0]?.id || '';
    }
    this.notify();
  }

  async removeJob(jobId) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to remove server job");
    }
    this.removeJobLocal(jobId);
  }

  clearCompletedLocal() {
    this.jobQueue = this.jobQueue.filter(job => !["completed", "failed", "cancelled"].includes(job.status));
    if (this.selectedJobId && !this.jobQueue.some(job => job.id === this.selectedJobId)) {
      this.selectedJobId = this.jobQueue[0]?.id || '';
    }
    this.notify();
  }

  async clearCompleted() {
    const response = await fetch("/api/jobs/completed", { method: "DELETE" });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to clear completed server jobs");
    }
    this.clearCompletedLocal();
  }

  async loadActiveJobs() {
    const response = await fetch("/api/jobs/active");
    if (!response.ok) throw new Error("Failed to load server jobs");
    this.setQueue(await response.json());
    return this.jobQueue;
  }

  async sendJobRequest(payload) {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to create job");
    }
    const result = await response.json();
    if (result.job) this.addJob(result.job);
    this.setSelectedJobId(result.job_id);
    return result;
  }

  async fetchJob(jobId) {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (!response.ok) return null;
    const job = await response.json();
    this.addJob(job);
    return this.normalizeJob(job);
  }

  applyLlmStream(payload) {
    const jobId = payload.job_id || payload.id;
    if (!jobId) return;
    const existing = this.streams[jobId] || { thinking: '', content: '', done: false, context: payload.context || 'progress' };
    const next = {
      ...existing,
      context: payload.context || existing.context || 'progress',
      done: Boolean(payload.done)
    };
    if (!payload.done && payload.token) {
      if (payload.stream_type === 'thinking') {
        next.thinking = `${next.thinking || ''}${payload.token}`;
      } else {
        next.content = `${next.content || ''}${payload.token}`;
      }
    }
    this.streams[jobId] = next;

    const job = this.jobQueue.find(item => item.id === jobId);
    if (job && next.context === 'chat') {
      const messages = [...(job.chatMessages || [])];
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.streaming) {
        messages[messages.length - 1] = { ...last, content: next.content, streaming: !next.done };
      } else if (!next.done) {
        messages.push({ role: 'assistant', content: next.content, streaming: true });
      }
      this.updateJob(jobId, { chatMessages: messages, llmStream: next });
      return;
    }
    this.updateJob(jobId, { llmStream: next });
  }

  applyGenerationProgress(payload) {
    const jobId = payload.job_id || payload.id;
    if (!jobId) return;
    const updates = {};
    if (payload.progress_event === 'step') {
      updates.genStep = payload.step;
      updates.genTotal = payload.total;
      if (payload.previews) {
        updates.genPreviews = payload.previews.map(p => `data:image/jpeg;base64,${p}`);
      }
    } else if (payload.progress_event === 'status') {
      updates.genStatus = payload.text;
    }
    if (Object.keys(updates).length) {
      this.updateJob(jobId, updates);
    }
  }

  connect() {
    if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(`${protocol}//${window.location.host}/ws/stream`);

    this.socket.addEventListener("open", () => {
      this.connected = true;
      this.reconnectDelay = 1000;
      this.notify();
    });

    this.socket.addEventListener("message", event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event_type === "initial_sync") {
          this.setQueue(payload.jobs || []);
          return;
        }
        if (payload.event_type === "job_removed") {
          this.removeJobLocal(payload.job_id || payload.id);
          return;
        }
        if (payload.event_type === "llm_stream") {
          this.applyLlmStream(payload);
          return;
        }
        if (payload.event_type === "generation_progress") {
          this.applyGenerationProgress(payload);
          return;
        }
        const job = payload.job || payload;
        if (job?.id || job?.job_id) this.addJob(job);
      } catch (error) {
        console.error("Invalid WebSocket job event:", error);
      }
    });

    const reconnect = () => {
      this.connected = false;
      this.notify();
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };
    this.socket.addEventListener("close", reconnect);
    this.socket.addEventListener("error", () => this.socket?.close());
  }
}

export const queueStore = new QueueStore();
