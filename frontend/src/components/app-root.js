import { LitElement, html } from 'lit';
import { initHistoryApi, getAllHistory, deleteHistoryItem, clearAllHistory } from '../utils/history-api.js';
import { queueStore } from '../utils/store.js';
import { icon } from '../utils/icons.js';
import { clearMissingJobRoute, handleAppRoute } from '../controllers/route-controller.js';
import {
  applyHistoryItemToForm,
  aspectRatioFromProviderParams,
  captureLastGeneratorSettings,
  getDefaultProviderId,
  getSessionFormState,
  looksLikeJsonPrompt,
  promptWithAspectRatio,
  providerParamsFromHistory,
  resetGeneratorForm,
  withProviderDefaults
} from '../controllers/generator-state.js';
import {
  editorGenerate as editorGenerateAction,
  editorRedo as editorRedoAction,
  editorUndo as editorUndoAction,
  ensureEditableEditorJob as ensureEditableEditorJobAction,
  promptToDraftJson as promptToDraftJsonValue,
  rememberEditorSnapshot as rememberEditorSnapshotAction,
  sendEditorChat as sendEditorChatAction,
  updateEditorPrompt as updateEditorPromptAction
} from '../controllers/editor-actions.js';
import './control-panel.js';
import './display-panel.js';
import './image-lightbox.js';
import './editor-sidebar.js';

export class AppRoot extends LitElement {
  static properties = {
    // API & Status
    apiOnline: { type: Boolean },
    templates: { type: Array },
    endpoints: { type: Array },
    selectedEndpoint: { type: String },
    providerSchemas: { type: Object },
    providerParams: { type: Object },

    // Queue / Jobs
    jobQueue: { type: Array },
    selectedJobId: { type: String },
    isRefining: { type: Boolean },

    // Tabs
    activeTab: { type: String },
    activeLeftTab: { type: String },

    // Local DB / History
    historyItems: { type: Array },
    cachedUpsampledPrompt: { type: String },

    // Lightbox
    lightboxSrc: { type: String },
    lightboxPrompt: { type: String },
    lightboxSeedLabel: { type: String },
    lightboxItem: { type: Object },
    lightboxHidden: { type: Boolean },

    // Active form values synced to control-panel
    prompt: { type: String },
    magicPrompt: { type: Boolean },
    bypassUpsample: { type: Boolean },
    selectedTemplate: { type: String },
    advancedMode: { type: Boolean },
    // Editor: shared selection state between canvas and sidebar
    editorSelectedIndex: { type: Number },
    editorPinnedIndex: { type: Number },

    // Router & toasts
    currentRoute: { type: String },
    toasts: { type: Array },
    parentUuid: { type: String },
    isJsonMode: { type: Boolean },
    inspectorItem: { type: Object },
    lightboxIndex: { type: Number },
    theme: { type: String }
  };

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeQueue = queueStore.subscribe(() => {
      const previousStatuses = this._lastJobStatuses;
      this.jobQueue = queueStore.jobQueue;
      this.selectedJobId = queueStore.selectedJobId;
      this.apiOnline = queueStore.connected;
      for (const job of this.jobQueue) {
        const previous = previousStatuses.get(job.id);
        if (job.status === 'completed' && previous !== 'completed') {
          this.loadHistory();
        }
        previousStatuses.set(job.id, job.status);
      }
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribeQueue) {
      this._unsubscribeQueue();
    }
  }

  constructor() {
    super();
    this.apiOnline = true;
    this.theme = localStorage.getItem('ideoui_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${this.theme}-theme`);
    this.templates = ['v1'];

    this.jobQueue = queueStore.jobQueue;
    this.selectedJobId = queueStore.selectedJobId;
    this.isRefining = false;

    this.activeTab = 'current';
    this.activeLeftTab = 'generator';
    this.historyItems = [];
    this.cachedUpsampledPrompt = '';

    // Lightbox defaults
    this.lightboxSrc = '';
    this.lightboxPrompt = '';
    this.lightboxSeedLabel = '';
    this.lightboxItem = null;
    this.lightboxHidden = true;

    // Form defaults
    this.prompt = '';
    this.magicPrompt = true;
    this.bypassUpsample = false;
    this.selectedTemplate = 'v1';
    this.advancedMode = false;
    this.endpoints = [];
    this.selectedEndpoint = '';
    this.providerSchemas = {};
    this.providerParams = {};
    this.tabUuid = '';
    this._sessionSaveTimer = null;

    // Shared editor state
    this.editorSelectedIndex = null;
    this.editorPinnedIndex = null;

    // Router & toasts defaults
    this.currentRoute = '#/';
    this.toasts = [];
    this.parentUuid = '';
    this.isJsonMode = false;
    this.inspectorItem = null;
    this.lightboxIndex = null;
    this.editorUndoStacks = new Map();
    this.editorRedoStacks = new Map();
    this._pendingJobPatches = new Map();
    this._jobPatchTimers = new Map();
    this._lastJobStatuses = new Map();
    this._preserveNextHomeRoute = false;
    this.lastGeneratorSettings = null;
  }

  async firstUpdated() {
    // Listen to hash change routing
    window.addEventListener('hashchange', () => {
      this.handleRoute();
      this.scheduleSessionSave();
    });
    this.tabUuid = sessionStorage.getItem('ideoui_tab_uuid') || (crypto.randomUUID ? crypto.randomUUID() : `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem('ideoui_tab_uuid', this.tabUuid);
    
    try {
      await initHistoryApi();
      await this.loadHistory();
      await this.loadTemplates();
      await this.loadProviderSchemas();
      await this.loadEndpoints();
      await queueStore.loadActiveJobs();
      queueStore.connect();
      await this.restoreSessionState();
    } catch (e) {
      console.error("Initialization failed", e);
      this.loadTemplates();
    }
    this.handleRoute({ preserveHome: true });
  }

  getDefaultProviderId() {
    return getDefaultProviderId(this);
  }

  resetGeneratorForm() {
    resetGeneratorForm(this);
  }

  goCleanHome() {
    this._preserveNextHomeRoute = false;
    queueStore.setSelectedJobId('');
    this.activeLeftTab = 'generator';
    this.resetGeneratorForm();
    if (window.location.hash !== '#/') {
      window.location.hash = '#/';
    } else {
      this.handleRoute({ preserveHome: true });
    }
  }

  getHistoryItem(uuid) {
    return (this.historyItems || []).find(item => item.uuid === uuid) || null;
  }

  itemAspect(item) {
    const aspect = item?.params?.providerParams?.aspect_ratio || item?.params?.aspect_ratio;
    if (aspect && String(aspect).includes(':')) return String(aspect).replace(':', ' / ');
    const sizeStr = item?.params?.size || '1024x1024';
    const [w, h] = String(sizeStr).split('x').map(Number);
    return w && h ? `${w} / ${h}` : '1 / 1';
  }

  openRouteLightbox(item, index) {
    if (!item || !item.images?.[index]) return;
    this.lightboxSrc = item.images[index];
    this.lightboxPrompt = item.rawPrompt || '';
    const seed = item.params?.seed ?? item.params?.providerParams?.seed ?? 0;
    this.lightboxSeedLabel = `${seed} (Image ${index + 1})`;
    this.lightboxItem = item;
    this.lightboxIndex = index;
    this.lightboxHidden = false;
  }

  closeRouteLightbox() {
    this.lightboxHidden = true;
    this.lightboxIndex = null;
  }

  clearMissingJobRoute(jobId) {
    clearMissingJobRoute(this, jobId);
  }

  handleRoute(options = {}) {
    handleAppRoute(this, options);
  }

  showToast(message, type = 'info') {
    const toast = { id: Date.now() + '_' + Math.random().toString(36).substr(2, 9), message, type };
    this.toasts = [...this.toasts, toast];
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== toast.id);
    }, 4000);
  }

  async loadTemplates() {
    try {
      const resp = await fetch("/api/upsample_templates");
      if (resp.ok) {
        this.templates = await resp.json();
        if (this.templates.length > 0) {
          this.selectedTemplate = this.templates[0];
        }
        this.apiOnline = true;
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn("Backend API templates fetch failed");
      this.apiOnline = false;
      this.templates = ['v1', 'v2'];
    }
  }

  async loadHistory() {
    try {
      const items = await getAllHistory();
      items.sort((a, b) => b.timestamp - a.timestamp);
      this.historyItems = items;
    } catch (e) {
      console.error("Failed to load history from backend", e);
    }
  }

  async loadEndpoints() {
    try {
      const resp = await fetch("/api/endpoints");
      if (resp.ok) {
        this.endpoints = await resp.json();
        const defaultEp = this.endpoints.find(ep => ep.default);
        if (defaultEp) {
          this.selectedEndpoint = defaultEp.name;
        } else if (this.endpoints.length > 0) {
          this.selectedEndpoint = this.endpoints[0].name;
        }
        this.providerParams = this.withProviderDefaults(this.selectedEndpoint, this.providerParams);
      }
    } catch (e) {
      console.error("Failed to load endpoints:", e);
    }
  }

  async loadProviderSchemas() {
    const resp = await fetch("/api/providers/schemas");
    if (!resp.ok) throw new Error("Failed to load provider schemas");
    this.providerSchemas = await resp.json();
    const defaultEntry = Object.entries(this.providerSchemas).find(([, schema]) => schema.type === 'generation' && schema.default);
    const firstGeneration = Object.entries(this.providerSchemas).find(([, schema]) => schema.type === 'generation');
    if (!this.selectedEndpoint) {
      this.selectedEndpoint = defaultEntry?.[0] || firstGeneration?.[0] || '';
    }
    this.providerParams = this.withProviderDefaults(this.selectedEndpoint, this.providerParams);
  }

  withProviderDefaults(providerId, params = {}) {
    return withProviderDefaults(this, providerId, params);
  }

  providerParamsFromHistory(item) {
    return providerParamsFromHistory(item);
  }

  aspectRatioFromProviderParams(params = {}) {
    return aspectRatioFromProviderParams(params);
  }

  promptWithAspectRatio(promptText, aspectRatio) {
    return promptWithAspectRatio(promptText, aspectRatio);
  }

  looksLikeJsonPrompt(promptText) {
    return looksLikeJsonPrompt(promptText);
  }

  applyHistoryItemToForm(item, preferJson = false) {
    applyHistoryItemToForm(this, item, preferJson);
  }

  async restoreSessionState() {
    const resp = await fetch(`/api/session/state?tab_uuid=${encodeURIComponent(this.tabUuid)}`);
    let state = resp.ok ? await resp.json() : null;
    if (!state) {
      const latestResp = await fetch("/api/session/state");
      state = latestResp.ok ? await latestResp.json() : null;
    }
    if (!state) return;
    const form = state.form_state || state.formState || {};
    this.prompt = form.prompt ?? this.prompt;
    this.magicPrompt = form.magicPrompt ?? form.magic_prompt ?? this.magicPrompt;
    this.advancedMode = form.advancedMode ?? form.advanced_mode ?? this.advancedMode;
    this.isJsonMode = form.isJsonMode ?? form.is_json_mode ?? this.isJsonMode;
    this.selectedTemplate = form.selectedTemplate ?? form.template ?? this.selectedTemplate;
    this.selectedEndpoint = form.provider ?? form.endpoint ?? this.selectedEndpoint;
    this.providerParams = this.withProviderDefaults(this.selectedEndpoint, form.providerParams || form.provider_params || this.providerParams);
    this.captureLastGeneratorSettings();
    const activeJobId = state.active_job_id || state.activeJobId;
    const hasActiveJob = activeJobId && queueStore.jobQueue.some(job => job.id === activeJobId);
    if (hasActiveJob) queueStore.setSelectedJobId(activeJobId);
    if (state.route && window.location.hash === '') {
      const routeJob = state.route.match(/^#\/(?:job|editor)\/([^/]+)/)?.[1];
      if (!routeJob || queueStore.jobQueue.some(job => job.id === routeJob)) {
        window.location.hash = state.route;
      }
    }
  }

  getSessionFormState() {
    return getSessionFormState(this);
  }

  captureLastGeneratorSettings() {
    captureLastGeneratorSettings(this);
  }

  scheduleSessionSave() {
    clearTimeout(this._sessionSaveTimer);
    this._sessionSaveTimer = setTimeout(() => this.saveSessionState(), 500);
  }

  async saveSessionState() {
    if (!this.tabUuid) return;
    try {
      const selectedJob = this.jobQueue.find(job => job.id === this.selectedJobId);
      await fetch("/api/session/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab_uuid: this.tabUuid,
          active_job_id: this.selectedJobId || null,
          route: window.location.hash || '#/',
          form_state: this.getSessionFormState(),
          draft_json: selectedJob?.draftJson || null
        })
      });
    } catch (error) {
      console.warn("Session autosave failed:", error);
    }
  }

  rememberEditorSnapshot(jobId, promptText) {
    rememberEditorSnapshotAction(this, jobId, promptText);
  }

  async ensureEditableEditorJob(nextPrompt = null) {
    return ensureEditableEditorJobAction(this, nextPrompt);
  }

  async patchServerJob(jobId, payload) {
    try {
      await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn("Job patch failed:", error);
    }
  }

  hasPendingJobPatch(jobId) {
    return this._pendingJobPatches.has(jobId);
  }

  scheduleJobPatch(jobId, payload, delayMs = 700) {
    if (!jobId || !payload) return;
    const pending = {
      ...(this._pendingJobPatches.get(jobId) || {}),
      ...payload
    };
    this._pendingJobPatches.set(jobId, pending);
    clearTimeout(this._jobPatchTimers.get(jobId));
    this._jobPatchTimers.set(jobId, setTimeout(async () => {
      const nextPayload = this._pendingJobPatches.get(jobId);
      this._pendingJobPatches.delete(jobId);
      this._jobPatchTimers.delete(jobId);
      if (nextPayload) {
        await this.patchServerJob(jobId, nextPayload);
      }
    }, delayMs));
  }

  async onGenerate(e) {
    const params = e.detail;
    this.prompt = params.prompt;
    this.magicPrompt = params.magicPrompt;
    this.bypassUpsample = params.bypassUpsample;
    this.selectedTemplate = params.selectedTemplate;
    this.advancedMode = params.advancedMode;
    this.selectedEndpoint = params.endpoint;
    this.providerParams = { ...(params.providerParams || this.providerParams) };
    this.captureLastGeneratorSettings();
    try {
      const result = await queueStore.sendJobRequest({
        raw_prompt: params.prompt,
        provider: params.endpoint,
        upsampler: 'deepseek',
        parent_uuid: this.parentUuid || null,
        magic_prompt: Boolean(params.magicPrompt && !params.bypassUpsample),
        advanced_mode: Boolean(params.advancedMode),
        is_json_mode: Boolean(params.isJsonMode),
        provider_params: this.providerParams,
        upsampler_params: { template: params.selectedTemplate || 'v1' },
        upsampled_prompt: params.bypassUpsample ? this.cachedUpsampledPrompt : null
      });
      this.parentUuid = '';
      this.activeLeftTab = 'progress';
      window.location.hash = '#/job/' + result.job_id;
      this.scheduleSessionSave();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  onSelectJob(e) {
    const job = e.detail;
    queueStore.setSelectedJobId(job.id);
    this.activeLeftTab = 'progress';
    this.editorPinnedIndex = null;
    window.location.hash = '#/job/' + job.id;
  }

  onCancelJob(e) {
    const jobId = e.detail;
    this.removeJob(jobId);
  }

  async removeJob(jobId) {
    try {
      await queueStore.removeJob(jobId);
      if (this.selectedJobId === jobId) {
        if (queueStore.selectedJobId) {
          window.location.hash = '#/job/' + queueStore.selectedJobId;
        } else {
          window.location.hash = '#/';
        }
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async onClearCompletedJobs() {
    try {
      await queueStore.clearCompleted();
      if (this.selectedJobId && !queueStore.jobQueue.find(j => j.id === this.selectedJobId)) {
        if (queueStore.selectedJobId) {
          window.location.hash = '#/job/' + queueStore.selectedJobId;
        } else {
          window.location.hash = '#/';
        }
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  updateFormInputs(job) {
    this.isJsonMode = job.params.isJsonMode || false;
    this.prompt = this.isJsonMode ? (job.upsampledPrompt || job.rawPrompt) : job.rawPrompt;
    this.magicPrompt = job.params.magicPrompt;
    this.advancedMode = job.params.advancedMode || false;
    this.selectedTemplate = job.params.upsampleTemplate || 'v1';
    this.selectedEndpoint = job.provider || job.params.endpoint || (this.endpoints.find(ep => ep.default)?.name || '');
    this.providerParams = this.withProviderDefaults(this.selectedEndpoint, job.providerParams || job.params.providerParams || {});
 
    if (job.upsampledPrompt) {
      this.cachedUpsampledPrompt = job.upsampledPrompt;
      this.bypassUpsample = true;
    } else {
      this.cachedUpsampledPrompt = '';
      this.bypassUpsample = false;
    }
  }

  onPromptChange(e) {
    this.prompt = e.detail;
    this.cachedUpsampledPrompt = '';
    this.bypassUpsample = false;
    this.scheduleSessionSave();
  }
 
  onMagicChange(e) {
    this.magicPrompt = e.detail;
    this.captureLastGeneratorSettings();
    this.scheduleSessionSave();
  }
 
  onBypassChange(e) {
    this.bypassUpsample = e.detail;
    this.scheduleSessionSave();
  }

  onTemplateChange(e) {
    this.selectedTemplate = e.detail;
    this.captureLastGeneratorSettings();
    this.scheduleSessionSave();
  }

  onAdvancedChange(e) {
    this.advancedMode = e.detail;
    this.captureLastGeneratorSettings();
    this.scheduleSessionSave();
  }

  onEndpointChange(e) {
    this.selectedEndpoint = e.detail;
    this.providerParams = this.withProviderDefaults(this.selectedEndpoint, {});
    this.captureLastGeneratorSettings();
    this.scheduleSessionSave();
  }

  onProviderParamsChange(e) {
    const previousAspect = this.aspectRatioFromProviderParams(this.providerParams);
    this.providerParams = { ...e.detail };
    const nextAspect = this.aspectRatioFromProviderParams(this.providerParams);
    const job = queueStore.getSelectedJob();
    if (job?.status === 'editing') {
      const updates = { providerParams: this.providerParams };
      if (nextAspect !== previousAspect) {
        updates.upsampledPrompt = this.promptWithAspectRatio(job.upsampledPrompt, nextAspect);
        updates.draftJson = this.promptToDraftJson(updates.upsampledPrompt);
      }
      queueStore.updateJob(job.id, updates);
      this.patchServerJob(job.id, updates);
    }
    this.captureLastGeneratorSettings();
    this.scheduleSessionSave();
  }

  async onSwitchTab(e) {
    const tab = e.detail;
    if (tab === 'history') {
      window.location.hash = '#/history';
    } else {
      if (this.selectedJobId) {
        window.location.hash = '#/job/' + this.selectedJobId;
      } else {
        window.location.hash = '#/';
      }
    }
  }

  onLeftTabChange(e) {
    const tab = e.detail;
    this.activeLeftTab = tab;
    if (tab === 'progress' && this.currentRoute === '#/') {
      window.location.hash = '#/queue';
    }
  }

  onReuseSettings(e) {
    const item = e.detail;
    this.applyHistoryItemToForm(item, Boolean(item.upsampledPrompt));
    this.captureLastGeneratorSettings();
    this.activeLeftTab = 'generator';
    this._preserveNextHomeRoute = true;
    window.location.hash = '#/';
  }

  async onReuseAdvancedSettings(e) {
    const { item, bgImage } = e.detail;
    this.applyHistoryItemToForm(item, false);
    this.captureLastGeneratorSettings();
    try {
      const provider = item.params.provider || item.params.endpoint || this.selectedEndpoint;
      const providerParams = this.providerParamsFromHistory(item);
      const upsampledPrompt = this.promptWithAspectRatio(item.upsampledPrompt, this.aspectRatioFromProviderParams(providerParams));
      const result = await queueStore.sendJobRequest({
        raw_prompt: item.rawPrompt,
        provider,
        upsampler: item.params.upsampler || 'deepseek',
        parent_uuid: item.uuid || null,
        magic_prompt: false,
        advanced_mode: true,
        provider_params: providerParams,
        upsampler_params: item.params.upsamplerParams || { template: item.params.upsampleTemplate || 'v1' },
        upsampled_prompt: upsampledPrompt,
        chat_messages: [
          { role: "system", content: "Visual Prompt Layout Chat Assistant." },
          { role: "assistant", content: upsampledPrompt }
        ],
        job_type: "editing"
      });
      const job = queueStore.getSelectedJob();
      if (job && bgImage) queueStore.updateJob(job.id, { backgroundImage: bgImage });
      this.activeLeftTab = 'generator';
      window.location.hash = '#/editor/' + result.job_id;
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async onDeleteHistoryItem(e) {
    const item = e.detail;
    await deleteHistoryItem(item.id, item.timestamp);
    await this.loadHistory();
  }

  async onClearHistory() {
    await clearAllHistory();
    await this.loadHistory();
  }

  onOpenLightbox(e) {
    const { src, prompt, seed, item } = e.detail;
    this.lightboxSrc = src;
    this.lightboxPrompt = prompt;
    this.lightboxSeedLabel = seed;
    this.lightboxItem = item;
    this.lightboxHidden = false;
    const idx = Number(e.detail.imgIdx || 0);
    this.lightboxIndex = idx;
    if (item?.uuid) {
      if (this.activeTab === 'history' || this.currentRoute.startsWith('#/history')) {
        window.location.hash = `#/history/${item.uuid}/lightbox/${idx}`;
      } else if (this.selectedJobId) {
        window.location.hash = `#/job/${this.selectedJobId}/lightbox/${idx}`;
      }
    }
  }

  onCloseLightbox() {
    this.closeRouteLightbox();
    if (this.currentRoute.includes('/lightbox/')) {
      const next = this.currentRoute.replace(/\/lightbox\/\d+$/, '');
      window.location.hash = next || '#/';
    }
  }

  async onUpdateEditorPrompt(e) {
    await updateEditorPromptAction(this, e.detail);
  }

  promptToDraftJson(promptText) {
    return promptToDraftJsonValue(promptText);
  }

  onEditorUndo() {
    editorUndoAction(this);
  }

  onEditorRedo() {
    editorRedoAction(this);
  }

  onEditorCancel() {
    this.editorSelectedIndex = null;
    this.editorPinnedIndex = null;
    if (this.selectedJobId) {
      this.removeJob(this.selectedJobId);
    }
    window.location.hash = '#/';
  }

  async onEditorGenerate() {
    try {
      await editorGenerateAction(this);
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async onSendEditorChat(e) {
    await sendEditorChatAction(this, e.detail);
  }

  toggleTheme() {
    const nextTheme = this.theme === 'light' ? 'dark' : 'light';
    document.body.classList.remove(`${this.theme}-theme`);
    document.body.classList.add(`${nextTheme}-theme`);
    this.theme = nextTheme;
    localStorage.setItem('ideoui_theme', nextTheme);
  }

  render() {
    const selectedJob = this.jobQueue.find(j => j.id === this.selectedJobId);
    const inspectorJob = this.inspectorItem ? {
      id: `inspector_${this.inspectorItem.uuid}`,
      uuid: this.inspectorItem.uuid,
      parentUuid: this.inspectorItem.parentUuid,
      rawPrompt: this.inspectorItem.rawPrompt,
      upsampledPrompt: this.inspectorItem.upsampledPrompt,
      providerParams: this.providerParams,
      params: this.inspectorItem.params || {},
      images: this.inspectorItem.images || [],
      status: 'inspecting',
      backgroundImage: this.inspectorItem.images?.[0] || ''
    } : null;
    const editorJob = inspectorJob || selectedJob;
    const isEditing = this.activeTab === 'current' && selectedJob?.status === 'editing';
    const isInspector = this.activeTab === 'current' && !!inspectorJob;
    const showEditorSidebar = isEditing || isInspector;

    return html`
      <div class="glow-bg"></div>
      <div class="app-container">
        <!-- Header -->
        <header class="app-header">
          <div class="logo-area" @click="${this.goCleanHome}" role="button" title="New Prompt">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22H22L12 2Z" stroke="url(#logoGrad)" stroke-width="2" stroke-linejoin="round"/>
                <path d="M12 6L5 20H19L12 6Z" fill="url(#logoGrad)" fill-opacity="0.2"/>
                <circle cx="12" cy="14" r="3" stroke="url(#logoGrad)" stroke-width="2"/>
                <defs>
                  <linearGradient id="logoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#a855f7"/>
                    <stop offset="1" stop-color="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1>Ideogram 4 <span>Studio</span></h1>
          </div>
          <div class="header-actions">
            <button class="theme-toggle-btn" @click="${this.toggleTheme}" title="Toggle light/dark theme" aria-label="Toggle theme">
              ${this.theme === 'light' ? 
                html`<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>` : 
                html`<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="4.22" x2="19.78" y2="5.64"/></svg>`
              }
            </button>
            <div class="api-status">
              <span class="status-indicator ${this.apiOnline ? 'online' : 'offline'}" id="backendStatus"></span>
              <span class="status-text">${this.apiOnline ? 'Backend Connected' : 'Backend Disconnected'}</span>
            </div>
          </div>
        </header>

        <!-- Main Workspace -->
        <main class="workspace ${showEditorSidebar ? 'editing' : ''}">
          <!-- Left Panel: Controls -->
          <control-panel
            .templates="${this.templates}"
            .hasCachedUpsample="${!!this.cachedUpsampledPrompt}"
            .prompt="${this.prompt}"
            .magicPrompt="${this.magicPrompt}"
            .bypassUpsample="${this.bypassUpsample}"
            .selectedTemplate="${this.selectedTemplate}"
            .advancedMode="${this.advancedMode}"
            .endpoints="${this.endpoints}"
            .selectedEndpoint="${this.selectedEndpoint}"
            .providerSchemas="${this.providerSchemas}"
            .providerParams="${this.providerParams}"
            .isEditing="${showEditorSidebar}"
            .jobQueue="${this.jobQueue}"
            .selectedJobId="${this.selectedJobId}"
            .activeLeftTab="${this.activeLeftTab}"
            .isJsonMode="${this.isJsonMode}"
            @is-json-change="${(e) => { this.isJsonMode = e.detail; this.scheduleSessionSave(); }}"
            @prompt-change="${this.onPromptChange}"
            @magic-change="${this.onMagicChange}"
            @bypass-change="${this.onBypassChange}"
            @template-change="${this.onTemplateChange}"
            @advanced-change="${this.onAdvancedChange}"
            @endpoint-change="${this.onEndpointChange}"
            @provider-params-change="${this.onProviderParamsChange}"
            @left-tab-change="${this.onLeftTabChange}"
            @generate="${this.onGenerate}"
            @select-job="${this.onSelectJob}"
            @cancel-job="${this.onCancelJob}"
            @clear-completed-jobs="${this.onClearCompletedJobs}">
          </control-panel>

          <!-- Center Panel: Results & Status -->
          <display-panel
            .selectedJob="${editorJob}"
            .activeTab="${this.activeTab}"
            .historyItems="${this.historyItems}"
            .isRefining="${this.isRefining}"
            .jobQueue="${this.jobQueue}"
            .selectedJobId="${this.selectedJobId}"
            .selectedElementIndex="${this.editorSelectedIndex}"
            .pinnedBoxIndex="${this.editorPinnedIndex}"
            .readOnlyEditor="${isInspector}"
            @switch-tab="${this.onSwitchTab}"
            @cancel-active-job="${() => this.removeJob(this.selectedJobId)}"
            @select-job="${this.onSelectJob}"
            @cancel-job="${this.onCancelJob}"
            @clear-completed-jobs="${this.onClearCompletedJobs}"
            @reuse-settings="${this.onReuseSettings}"
            @reuse-advanced="${this.onReuseAdvancedSettings}"
            @delete-history-item="${this.onDeleteHistoryItem}"
            @clear-history="${this.onClearHistory}"
            @open-lightbox="${this.onOpenLightbox}"
            @update-editor-prompt="${this.onUpdateEditorPrompt}"
            @editor-undo="${this.onEditorUndo}"
            @editor-redo="${this.onEditorRedo}"
            @element-selected="${(e) => { this.editorSelectedIndex = e.detail; this.requestUpdate(); }}"
            @element-pinned="${(e) => { this.editorPinnedIndex = e.detail; this.requestUpdate(); }}"
            @editor-cancel="${this.onEditorCancel}"
            @editor-generate="${this.onEditorGenerate}">
          </display-panel>

          <!-- Right Panel: Editor Sidebar (only in editing mode) -->
          ${showEditorSidebar && editorJob ? html`
            <section class="editor-sidebar-column glass-card">
              <editor-sidebar
                .upsampledPrompt="${editorJob.upsampledPrompt}"
                .chatMessages="${editorJob.chatMessages || []}"
                .isRefining="${this.isRefining}"
                .selectedElementIndex="${this.editorSelectedIndex}"
                .pinnedBoxIndex="${this.editorPinnedIndex}"
                .readOnly="${isInspector}"
                @update-prompt="${(e) => this.onUpdateEditorPrompt(e)}"
                @send-chat="${this.onSendEditorChat}"
                @element-selected="${(e) => { this.editorSelectedIndex = e.detail; this.requestUpdate(); }}"
                @element-pinned="${(e) => { this.editorPinnedIndex = e.detail; this.requestUpdate(); }}">
              </editor-sidebar>
            </section>
          ` : ''}
        </main>
      </div>

      <!-- Toast notifications -->
      <div class="toast-container">
        ${this.toasts.map(t => html`
          <div class="toast ${t.type}">
            <div class="toast-content">
              <span class="toast-icon">
                ${t.type === 'success' ? html`
                  ${icon('check', 16)}
                ` : html`
                  ${icon('info', 16)}
                `}
              </span>
              <span class="toast-message">${t.message}</span>
            </div>
          </div>
        `)}
      </div>

      <!-- Lightbox overlay -->
      <image-lightbox
        .src="${this.lightboxSrc}"
        .prompt="${this.lightboxPrompt}"
        .seedLabel="${this.lightboxSeedLabel}"
        .item="${this.lightboxItem}"
        .hidden="${this.lightboxHidden}"
        @close="${this.onCloseLightbox}"
        @reuse="${this.onReuseSettings}"
        @reuse-advanced="${this.onReuseAdvancedSettings}">
      </image-lightbox>
    `;
  }
}
customElements.define('app-root', AppRoot);
