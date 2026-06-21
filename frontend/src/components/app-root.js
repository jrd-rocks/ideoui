import { LitElement, html } from 'lit';
import { initHistoryApi, getAllHistory, deleteHistoryItem, clearAllHistory } from '../utils/history-api.js';
import { icon } from '../utils/icons.js';
import { appStore } from '../state/app-store.js';
import { deriveLayout, selectActiveItem, selectDefaultProviderId, selectDefaultUpsamplerId } from '../state/selectors.js';
import { connectWs } from '../state/ws-client.js';
import { loadSession, saveSession, scheduleSessionSave, getTabUuid } from '../state/session.js';
import { parseRoute, selectionToHash, routeToState } from '../utils/router.js';
import {
  aspectRatioFromProviderParams,
  looksLikeJsonPrompt,
  promptWithAspectRatio,
  providerParamsFromHistory,
  withProviderDefaults,
} from '../controllers/generator-state.js';
import {
  editorGenerate as editorGenerateAction,
  editorRedo as editorRedoAction,
  editorUndo as editorUndoAction,
  ensureEditableEditorJob as ensureEditableEditorJobAction,
  sendEditorChat as sendEditorChatAction,
  updateEditorPrompt as updateEditorPromptAction,
} from '../controllers/editor-actions.js';
import './control-panel.js';
import './display-panel.js';
import './image-lightbox.js';
import './editor-sidebar.js';

export class AppRoot extends LitElement {
  static properties = {
    apiOnline: { type: Boolean },
    templates: { type: Array },
    providerSchemas: { type: Object },
    providerParams: { type: Object },
    chatProviders: { type: Array },
    selectedChatProvider: { type: String },
    selectedChatTemplate: { type: String },
    selectedUpsampler: { type: String },
    jobQueue: { type: Array },
    selectedJobId: { type: String },
    isRefining: { type: Boolean },
    activeTab: { type: String },
    activeLeftTab: { type: String },
    historyItems: { type: Array },
    cachedUpsampledPrompt: { type: String },
    lightboxSrc: { type: String },
    lightboxPrompt: { type: String },
    lightboxSeedLabel: { type: String },
    lightboxItem: { type: Object },
    lightboxHidden: { type: Boolean },
    lightboxPreviews: { type: Array },
    prompt: { type: String },
    magicPrompt: { type: Boolean },
    bypassUpsample: { type: Boolean },
    selectedTemplate: { type: String },
    advancedMode: { type: Boolean },
    selectedEndpoint: { type: String },
    isJsonMode: { type: Boolean },
    editorSelectedIndex: { type: Number },
    editorPinnedIndex: { type: Number },
    toasts: { type: Array },
    theme: { type: String },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.apiOnline = true;
    this.theme = localStorage.getItem('ideoui_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${this.theme}-theme`);
    this.templates = [];
    this.providerSchemas = {};
    this.providerParams = {};
    this.chatProviders = [];
    this.selectedChatProvider = '';
    this.selectedChatTemplate = '';
    this.selectedUpsampler = '';
    this.jobQueue = [];
    this.selectedJobId = '';
    this.isRefining = false;
    this.activeTab = 'current';
    this.activeLeftTab = 'generator';
    this.historyItems = [];
    this.cachedUpsampledPrompt = '';
    this.lightboxSrc = '';
    this.lightboxPrompt = '';
    this.lightboxSeedLabel = '';
    this.lightboxItem = null;
    this.lightboxHidden = true;
    this.lightboxPreviews = [];
    this.prompt = '';
    this.magicPrompt = true;
    this.bypassUpsample = false;
    this.selectedTemplate = 'v1';
    this.advancedMode = false;
    this.selectedEndpoint = '';
    this.isJsonMode = false;
    this.editorSelectedIndex = null;
    this.editorPinnedIndex = null;
    this.toasts = [];
    this.inspectorItem = null;
    this._previewsCache = new Map();
    this._projectingHash = false;
    this._lastStatuses = new Map();
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = appStore.subscribe(() => this.onStoreChange());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) this._unsubscribe();
  }

  async firstUpdated() {
    window.addEventListener('hashchange', () => {
      if (this._projectingHash) return;
      this.handleRouteFromHash();
      scheduleSessionSave();
    });
    appStore.dispatch({ type: 'SET_SESSION', partial: { tabUuid: getTabUuid() } });
    try {
      await initHistoryApi();
      await this.loadHistory();
      await appStore.loadProviders();
      this.syncProviders();
      await appStore.loadActiveJobs();
      connectWs();
      await loadSession();
      this.syncFromStore();
      this.applyRestoredRoute();
    } catch (e) {
      console.error('Initialization failed', e);
    }
    this.handleRouteFromHash();
  }

  // ---- Store -> reactive props ------------------------------------------

  onStoreChange() {
    const state = appStore.getState();
    const prev = this._lastStatuses;
    // Status transitions: completed -> refresh history; editing -> route.
    for (const job of state.items) {
      const previous = prev.get(job.id);
      if (job.status === 'completed' && previous !== 'completed') this.loadHistory();
      if (job.id === state.selection.activeItemId && job.status === 'editing' && previous !== 'editing') {
        this.projectRouteSoon(`#/editor/${job.id}`);
      }
      prev.set(job.id, job.status);
      if (!this.lightboxHidden && this.lightboxItem && this.lightboxItem.id === job.id) {
        this.lightboxItem = job;
        if (job.genPreviews && this.lightboxIndex !== null && job.genPreviews[this.lightboxIndex] !== undefined) {
          this.lightboxPreviews = [job.genPreviews[this.lightboxIndex]];
        }
      }
    }
    this.syncFromStore();
    this.projectRoute();
    this.requestUpdate();
  }

  syncProviders() {
    const state = appStore.getState();
    this.templates = state.providers.templates;
    this.providerSchemas = state.providers.schemas;
    this.chatProviders = state.providers.chatProviders;
    if (this.chatProviders.length && !this.selectedChatProvider) this.selectedChatProvider = this.chatProviders[0].id;
  }

  // Default the chat's Template Version to whatever template produced the JSON
  // being edited. When the active editor subject changes, rebind to its
  // template; a user's manual pick sticks until the subject changes again.
  syncChatTemplate(state) {
    const templates = state.providers?.templates || [];
    const firstId = (templates[0] && (templates[0].id || templates[0])) || 'v1';

    const active = selectActiveItem(state);
    let subjectId = '';
    let jobTemplate = '';
    if (active?.status === 'editing') {
      subjectId = active.id;
      jobTemplate = active.upsamplerParams?.template || active.params?.upsampleTemplate || '';
    } else {
      const inspectorUuid = state.selection?.inspectorHistoryUuid;
      if (inspectorUuid) {
        const h = (state.history || []).find((x) => x.uuid === inspectorUuid);
        if (h) {
          subjectId = `inspector:${h.uuid}`;
          jobTemplate = h.params?.upsampleTemplate || h.upsamplerParams?.template || '';
        }
      }
    }

    if (!jobTemplate) jobTemplate = firstId;

    if (subjectId && subjectId !== this._chatTemplateSubjectId) {
      this._chatTemplateSubjectId = subjectId;
      this.selectedChatTemplate = jobTemplate;
    } else if (!this.selectedChatTemplate) {
      this.selectedChatTemplate = jobTemplate;
    }
  }

  syncFromStore() {
    const state = appStore.getState();
    this.apiOnline = state.ui.apiOnline;
    this.isRefining = state.ui.isRefining;
    this.jobQueue = state.items;
    this.selectedJobId = state.selection.activeItemId;
    this.toasts = state.toasts;
    this.editorSelectedIndex = state.editor.selectedIndex;
    this.editorPinnedIndex = state.editor.pinnedIndex;

    const g = state.generator;
    this.prompt = g.prompt;
    this.magicPrompt = g.magicPrompt;
    this.bypassUpsample = g.bypassUpsample;
    this.isJsonMode = g.isJsonMode;
    this.selectedTemplate = g.selectedTemplate;
    this.selectedUpsampler = g.selectedUpsampler;
    this.selectedEndpoint = g.selectedEndpoint;
    this.providerParams = g.providerParams;
    this.advancedMode = g.advancedMode;
    this.cachedUpsampledPrompt = g.cachedUpsampledPrompt;

    // Inspector item from history.
    this.inspectorItem = state.selection.inspectorHistoryUuid
      ? (state.history || []).find((h) => h.uuid === state.selection.inspectorHistoryUuid) || null
      : null;

    // Default the chat Template Version to the edited subject's template.
    this.syncChatTemplate(state);

    // Layout is a pure projection of state (replaces _preserveNextHomeRoute).
    const layout = deriveLayout(state);
    this.activeLeftTab = layout.leftTab;
    this.activeTab = state.view;

    // Lightbox slice.
    const lb = state.lightbox;
    if (lb.hidden) {
      if (!this.lightboxHidden) {
        this.lightboxHidden = true;
        this.lightboxPreviews = [];
      }
    }
  }

  getHistoryItem(uuid) {
    return (this.historyItems || []).find((item) => item.uuid === uuid) || null;
  }

  itemAspect(item) {
    const aspect = item?.params?.providerParams?.aspect_ratio || item?.params?.aspect_ratio;
    if (aspect && String(aspect).includes(':')) return String(aspect).replace(':', ' / ');
    const sizeStr = item?.params?.size || '1024x1024';
    const [w, h] = String(sizeStr).split('x').map(Number);
    return w && h ? `${w} / ${h}` : '1 / 1';
  }

  // ---- Routing ----------------------------------------------------------

  projectRouteSoon(hash) {
    if ((window.location.hash || '#/') !== hash) {
      this._projectingHash = true;
      window.location.hash = hash;
      setTimeout(() => { this._projectingHash = false; }, 0);
    }
  }

  projectRoute() {
    const hash = selectionToHash(appStore.getState());
    if ((window.location.hash || '#/') !== hash) {
      this._projectingHash = true;
      window.location.hash = hash;
      setTimeout(() => { this._projectingHash = false; }, 0);
    }
  }

  applyRestoredRoute() {
    // Prefer the route restored from session if it points at a live item.
    if (window.location.hash) return;
    // handled by projection on next change; nothing else needed.
  }

  handleRouteFromHash() {
    const hash = window.location.hash || '#/';
    const route = parseRoute(hash);
    const deltas = routeToState(route, appStore.getState());
    if (!deltas) {
      window.location.hash = '#/';
      return;
    }
    if (deltas.view) appStore.dispatch({ type: 'SET_VIEW', view: deltas.view });
    if (deltas.userLeftTab !== undefined) appStore.dispatch({ type: 'SET_PANEL', leftTab: deltas.userLeftTab });
    if (deltas.closeLightbox) appStore.dispatch({ type: 'CLOSE_LIGHTBOX' });
    if (deltas.inspectorHistoryUuid !== undefined) appStore.dispatch({ type: 'SET_INSPECTOR', uuid: deltas.inspectorHistoryUuid });

    if (deltas.activeItemId !== undefined) {
      const target = deltas.activeItemId;
      const current = appStore.getState().selection.activeItemId;
      const exists = appStore.getState().items.some((it) => it.id === target);
      // Idempotent: skip re-selecting the already-active item (avoids resetting
      // panel overrides on a projected hash echo). Still open lightbox if asked.
      if (target === current) {
        if (deltas.lightboxIndex !== null && deltas.lightboxIndex !== undefined) {
          const job = selectActiveItem(appStore.getState());
          if (job) this.openLightboxFor(job, deltas.lightboxIndex);
        }
      } else if (exists) {
        appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: target });
        const job = selectActiveItem(appStore.getState());
        if (job) this.updateFormInputs(job);
        if (deltas.lightboxIndex !== null && deltas.lightboxIndex !== undefined) {
          this.openLightboxFor(job, deltas.lightboxIndex);
        }
      } else {
        appStore.fetchItem(target).then((found) => {
          if (found) {
            appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: target });
            this.updateFormInputs(found);
            if (deltas.lightboxIndex !== null && deltas.lightboxIndex !== undefined) this.openLightboxFor(found, deltas.lightboxIndex);
          } else {
            this.clearMissingJobRoute(target);
          }
        });
      }
    } else if (deltas.lightboxFromHistoryUuid) {
      const item = this.getHistoryItem(deltas.lightboxFromHistoryUuid);
      if (item) this.openLightboxFor(item, deltas.lightboxIndex);
      else this.loadHistory().then(() => this.openLightboxFor(this.getHistoryItem(deltas.lightboxFromHistoryUuid), deltas.lightboxIndex));
    } else if (deltas.editorStartUuid) {
      const item = this.getHistoryItem(deltas.editorStartUuid);
      this.inspectorItem = item;
      appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: '' });
      if (!item) this.loadHistory().then(() => { this.inspectorItem = this.getHistoryItem(deltas.editorStartUuid); this.requestUpdate(); });
    }
    this.syncFromStore();
    this.requestUpdate();
  }

  clearMissingJobRoute(jobId) {
    appStore.dispatch({ type: 'REMOVE_ITEM', id: jobId });
    appStore.dispatch({ type: 'CLOSE_LIGHTBOX' });
    appStore.dispatch({ type: 'SET_VIEW', view: 'current' });
    appStore.dispatch({ type: 'SET_PANEL', leftTab: 'generator' });
    appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: '' });
    this.resetGeneratorForm();
    scheduleSessionSave();
  }

  // ---- Lightbox ---------------------------------------------------------

  async loadLightboxPreviews(item, index) {
    this.lightboxPreviews = [];
    if (!item) return;
    const previewsUrl = item.previewsUrl || item.previews_url;
    if (previewsUrl) {
      const itemId = item.uuid || item.id;
      if (!this._previewsCache) this._previewsCache = new Map();
      const itemCache = this._previewsCache.get(itemId);
      if (itemCache && itemCache[index]) {
        this.lightboxPreviews = itemCache[index];
        this.requestUpdate();
        return;
      }
      try {
        const response = await fetch(`/api/history/${encodeURIComponent(itemId)}/previews.zip`);
        if (!response.ok) throw new Error(`Failed to fetch previews ZIP: ${response.statusText}`);
        const { unzipSync } = await import('fflate');
        const unzipped = unzipSync(new Uint8Array(await response.arrayBuffer()));
        const sortedNames = Object.keys(unzipped).sort();
        const files = sortedNames.map((name) => unzipped[name]);
        const numImages = item.images ? item.images.length : 1;
        const newItemCache = {};
        for (let imgIdx = 0; imgIdx < numImages; imgIdx++) {
          const idxPreviews = [];
          for (let idx = 0; idx < files.length; idx++) {
            if (idx % numImages === imgIdx) idxPreviews.push(URL.createObjectURL(new Blob([files[idx]], { type: 'image/jpeg' })));
          }
          newItemCache[imgIdx] = idxPreviews;
        }
        this._previewsCache.set(itemId, newItemCache);
        this.lightboxPreviews = newItemCache[index] || [];
        this.requestUpdate();
      } catch (e) {
        console.warn('Failed to load/unzip previews client-side:', e);
      }
    } else if (item.genPreviews && item.genPreviews[index] !== undefined) {
      this.lightboxPreviews = [item.genPreviews[index]];
    }
  }

  openLightboxFor(item, index) {
    if (!item || !item.images?.[index]) return;
    this.lightboxSrc = item.images[index];
    this.lightboxPrompt = item.rawPrompt || '';
    const seed = item.params?.seed ?? item.params?.providerParams?.seed ?? 0;
    this.lightboxSeedLabel = `${seed} (Image ${index + 1})`;
    this.lightboxItem = item;
    this.lightboxIndex = index;
    this.lightboxHidden = false;
    appStore.dispatch({ type: 'SET_LIGHTBOX', partial: { hidden: false, itemId: item.uuid || item.id, index } });
    const previewsUrl = item.previewsUrl || item.previews_url;
    const isCached = this._previewsCache && this._previewsCache.has(item.uuid || item.id);
    if (!previewsUrl || isCached) this.loadLightboxPreviews(item, index);
    else this.lightboxPreviews = [];
  }

  closeLightbox() {
    appStore.dispatch({ type: 'CLOSE_LIGHTBOX' });
    this.lightboxHidden = true;
    this.lightboxIndex = null;
    this.lightboxPreviews = [];
  }

  // ---- Generator form ---------------------------------------------------

  withProviderDefaults(providerId, params = {}) {
    return withProviderDefaults({ providerSchemas: this.providerSchemas }, providerId, params);
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
    appStore.dispatch({ type: 'APPLY_HISTORY_TO_GENERATOR', item });
    this.syncFromStore();
  }

  resetGeneratorForm() {
    appStore.dispatch({ type: 'RESET_GENERATOR' });
    this.syncFromStore();
  }

  updateFormInputs(job) {
    if (!job) return;
    const isJsonMode = job.params?.isJsonMode || false;
    const prompt = isJsonMode ? (job.upsampledPrompt || job.rawPrompt) : job.rawPrompt;
    const endpoint = job.provider || job.params?.endpoint || this.selectedEndpoint;
    const providerParams = this.withProviderDefaults(endpoint, job.providerParams || job.params?.providerParams || {});
    appStore.dispatch({ type: 'SET_GENERATOR_FIELDS', fields: {
      isJsonMode,
      prompt,
      magicPrompt: job.params?.magicPrompt,
      advancedMode: job.params?.advancedMode || false,
      selectedTemplate: job.params?.upsampleTemplate || 'v1',
      selectedEndpoint: endpoint,
      providerParams,
      cachedUpsampledPrompt: job.upsampledPrompt || '',
      bypassUpsample: Boolean(job.upsampledPrompt),
    } });
    this.syncFromStore();
  }

  // ---- Data loading -----------------------------------------------------

  async loadHistory() {
    try {
      const items = await getAllHistory();
      items.sort((a, b) => b.timestamp - a.timestamp);
      appStore.dispatch({ type: 'SET_HISTORY', items });
      this.historyItems = items;
    } catch (e) {
      console.error('Failed to load history from backend', e);
    }
  }

  // ---- Toasts -----------------------------------------------------------

  showToast(message, type = 'info') {
    appStore.showToast(message, type);
  }

  // ---- Event handlers ---------------------------------------------------

  goCleanHome() {
    appStore.dispatch({ type: 'SET_VIEW', view: 'current' });
    appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: '' });
    appStore.dispatch({ type: 'SET_PANEL', leftTab: 'generator' });
    this.resetGeneratorForm();
    scheduleSessionSave();
  }

  async onGenerate(e) {
    const params = e.detail;
    appStore.dispatch({ type: 'SET_GENERATOR_FIELDS', fields: {
      prompt: params.prompt,
      magicPrompt: params.magicPrompt,
      bypassUpsample: params.bypassUpsample,
      selectedTemplate: params.selectedTemplate,
      advancedMode: params.advancedMode,
      selectedEndpoint: params.endpoint,
      providerParams: { ...(params.providerParams || this.providerParams) },
    } });
    try {
      const g = appStore.getState().generator;
      const result = await appStore.createItem({
        raw_prompt: params.prompt,
        provider: params.endpoint,
        upsampler: params.upsampler || g.selectedUpsampler || selectDefaultUpsamplerId(appStore.getState()) || null,
        parent_uuid: g.parentUuid || null,
        magic_prompt: Boolean(params.magicPrompt && !params.bypassUpsample),
        advanced_mode: Boolean(params.advancedMode),
        is_json_mode: Boolean(params.isJsonMode),
        provider_params: g.providerParams,
        upsampler_params: { template: params.selectedTemplate || 'v1' },
        upsampled_prompt: params.bypassUpsample ? g.cachedUpsampledPrompt : null,
      });
      appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'parentUuid', value: '' });
      const isEditing = result.job?.status === 'editing';
      if (isEditing) {
        appStore.dispatch({ type: 'SET_PANEL', leftTab: 'generator' });
      } else {
        appStore.dispatch({ type: 'SET_PANEL', leftTab: 'progress' });
      }
      scheduleSessionSave();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  onSelectJob(e) {
    const job = e.detail;
    appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: job.id });
    appStore.dispatch({ type: 'SET_PANEL', leftTab: 'progress' });
    appStore.dispatch({ type: 'SET_EDITOR', pinnedIndex: null });
  }

  onCancelJob(e) {
    this.removeJob(e.detail);
  }

  async removeJob(jobId) {
    try {
      await appStore.removeItem(jobId);
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async onClearCompletedJobs() {
    try {
      await appStore.clearCompleted();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  onPromptChange(e) {
    appStore.dispatch({ type: 'SET_GENERATOR_FIELDS', fields: { prompt: e.detail, cachedUpsampledPrompt: '', bypassUpsample: false } });
    scheduleSessionSave();
  }

  onMagicChange(e) {
    appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'magicPrompt', value: e.detail });
    scheduleSessionSave();
  }

  onBypassChange(e) {
    appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'bypassUpsample', value: e.detail });
    scheduleSessionSave();
  }

  onTemplateChange(e) {
    appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'selectedTemplate', value: e.detail });
    scheduleSessionSave();
  }

  onAdvancedChange(e) {
    appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'advancedMode', value: e.detail });
    scheduleSessionSave();
  }

  onUpsamplerChange(e) {
    appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'selectedUpsampler', value: e.detail });
    scheduleSessionSave();
  }

  onIsJsonChange(e) {
    appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'isJsonMode', value: e.detail });
    scheduleSessionSave();
  }

  onEndpointChange(e) {
    const providerId = e.detail;
    const providerParams = this.withProviderDefaults(providerId, {});
    appStore.dispatch({ type: 'SET_GENERATOR_FIELDS', fields: { selectedEndpoint: providerId, providerParams } });
    scheduleSessionSave();
  }

  onProviderParamsChange(e) {
    const previousAspect = this.aspectRatioFromProviderParams(this.providerParams);
    const providerParams = { ...e.detail };
    const nextAspect = this.aspectRatioFromProviderParams(providerParams);
    appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'providerParams', value: providerParams });
    const job = selectActiveItem(appStore.getState());
    if (job?.status === 'editing') {
      const updates = { providerParams };
      if (nextAspect !== previousAspect) {
        updates.upsampledPrompt = this.promptWithAspectRatio(job.upsampledPrompt, nextAspect);
        updates.draftJson = JSON.parse(updates.upsampledPrompt);
      }
      appStore.updateItem(job.id, updates);
    }
    scheduleSessionSave();
  }

  async onSwitchTab(e) {
    const tab = e.detail;
    if (tab === 'history') appStore.dispatch({ type: 'SET_VIEW', view: 'history' });
    else appStore.dispatch({ type: 'SET_VIEW', view: 'current' });
  }

  onLeftTabChange(e) {
    appStore.dispatch({ type: 'SET_PANEL', leftTab: e.detail });
  }

  onReuseSettings(e) {
    const item = e.detail;
    this.applyHistoryItemToForm(item, Boolean(item.upsampledPrompt));
    // Atomic reuse: switch to Current view, clear active item, close lightbox;
    // the panel follows from derived layout and the hash projects to '#/'.
    appStore.dispatch({ type: 'SET_VIEW', view: 'current' });
    appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: '' });
    appStore.dispatch({ type: 'SET_PANEL', leftTab: 'generator' });
    appStore.dispatch({ type: 'CLOSE_LIGHTBOX' });
    scheduleSessionSave();
  }

  async onReuseAdvancedSettings(e) {
    const { item, bgImage } = e.detail;
    this.applyHistoryItemToForm(item, false);
    try {
      const g = appStore.getState().generator;
      const providerParams = providerParamsFromHistory(item);
      const upsampledPrompt = promptWithAspectRatio(item.upsampledPrompt, aspectRatioFromProviderParams(providerParams));
      const requestedProvider = item.params?.provider || item.params?.endpoint || g.selectedEndpoint;
      const provider = this.providerSchemas?.[requestedProvider]
        ? requestedProvider
        : selectDefaultProviderId(appStore.getState());
      if (requestedProvider && provider !== requestedProvider) {
        this.showToast(`Endpoint "${requestedProvider}" is no longer available; using default.`, 'info');
        appStore.dispatch({ type: 'SET_GENERATOR_FIELD', field: 'selectedEndpoint', value: provider });
        this.syncFromStore();
      }
      const result = await appStore.createItem({
        raw_prompt: item.rawPrompt,
        provider,
        upsampler: item.params?.upsampler && item.params.upsampler !== 'deepseek' ? item.params.upsampler : (g.selectedUpsampler || selectDefaultUpsamplerId(appStore.getState()) || null),
        parent_uuid: item.uuid || null,
        magic_prompt: false,
        advanced_mode: true,
        provider_params: providerParams,
        upsampler_params: item.params?.upsamplerParams || { template: item.params?.upsampleTemplate || 'v1' },
        upsampled_prompt: upsampledPrompt,
        chat_messages: [
          { role: 'system', content: 'Visual Prompt Layout Chat Assistant.' },
          { role: 'assistant', content: upsampledPrompt },
        ],
        job_type: 'editing',
      });
      const job = selectActiveItem(appStore.getState());
      if (job && bgImage) appStore.updateItem(job.id, { backgroundImage: bgImage }, { debounce: false, patchFields: [] });
      appStore.dispatch({ type: 'CLOSE_LIGHTBOX' });
      appStore.dispatch({ type: 'SET_PANEL', leftTab: 'generator' });
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

  async onEditHeldJob(e) {
    const jobId = e.detail;
    try {
      appStore.updateItem(jobId, { status: 'editing' }, { debounce: false });
      appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: jobId });
      appStore.dispatch({ type: 'SET_PANEL', leftTab: 'generator' });
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  onOpenLightbox(e) {
    const { src, prompt, seed, item } = e.detail;
    const idx = Number(e.detail.imgIdx || 0);
    this.lightboxSrc = src;
    this.lightboxPrompt = prompt;
    this.lightboxSeedLabel = seed;
    this.lightboxItem = item;
    this.lightboxIndex = idx;
    this.lightboxHidden = false;
    appStore.dispatch({ type: 'SET_LIGHTBOX', partial: { hidden: false, src, prompt, seedLabel: seed, itemId: item.uuid || item.id, index: idx } });
    const previewsUrl = item.previewsUrl || item.previews_url;
    const isCached = this._previewsCache && this._previewsCache.has(item.uuid || item.id);
    if (!previewsUrl || isCached) this.loadLightboxPreviews(item, idx);
    else this.lightboxPreviews = [];
  }

  onHoverPrompt() {
    if (this.lightboxItem && this.lightboxIndex !== null && (!this.lightboxPreviews || this.lightboxPreviews.length === 0)) {
      this.loadLightboxPreviews(this.lightboxItem, this.lightboxIndex);
    }
  }

  onCloseLightbox() {
    this.closeLightbox();
  }

  async onUpdateEditorPrompt(e) {
    await updateEditorPromptAction(this, e.detail);
  }

  onEditorUndo() {
    editorUndoAction(this);
  }

  onEditorRedo() {
    editorRedoAction(this);
  }

  onEditorCancel() {
    appStore.dispatch({ type: 'SET_EDITOR', selectedIndex: null, pinnedIndex: null });
    if (this.selectedJobId) this.removeJob(this.selectedJobId);
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

  onChatProviderChange(e) {
    this.selectedChatProvider = e.detail;
  }

  onChatTemplateChange(e) {
    this.selectedChatTemplate = e.detail;
  }

  render() {
    const selectedJob = this.jobQueue.find((j) => j.id === this.selectedJobId);
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

        <main class="workspace ${showEditorSidebar ? 'editing' : ''}">
          <control-panel
            .templates="${this.templates}"
            .hasCachedUpsample="${!!this.cachedUpsampledPrompt}"
            .prompt="${this.prompt}"
            .magicPrompt="${this.magicPrompt}"
            .bypassUpsample="${this.bypassUpsample}"
            .selectedTemplate="${this.selectedTemplate}"
            .advancedMode="${this.advancedMode}"
            .providerSchemas="${this.providerSchemas}"
            .providerParams="${this.providerParams}"
            .selectedEndpoint="${this.selectedEndpoint}"
            .selectedUpsampler="${this.selectedUpsampler}"
            .isEditing="${showEditorSidebar}"
            .jobQueue="${this.jobQueue}"
            .selectedJobId="${this.selectedJobId}"
            .activeLeftTab="${this.activeLeftTab}"
            .isJsonMode="${this.isJsonMode}"
            @is-json-change="${(e) => this.onIsJsonChange(e)}"
            @prompt-change="${this.onPromptChange}"
            @magic-change="${this.onMagicChange}"
            @bypass-change="${this.onBypassChange}"
            @template-change="${this.onTemplateChange}"
            @upsampler-change="${(e) => this.onUpsamplerChange(e)}"
            @advanced-change="${this.onAdvancedChange}"
            @endpoint-change="${this.onEndpointChange}"
            @provider-params-change="${this.onProviderParamsChange}"
            @left-tab-change="${this.onLeftTabChange}"
            @generate="${this.onGenerate}"
            @select-job="${this.onSelectJob}"
            @cancel-job="${this.onCancelJob}"
            @clear-completed-jobs="${this.onClearCompletedJobs}">
          </control-panel>

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
            .providerSchemas="${this.providerSchemas}"
            @switch-tab="${this.onSwitchTab}"
            @cancel-active-job="${() => this.removeJob(this.selectedJobId)}"
            @edit-held-job="${this.onEditHeldJob}"
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
            @element-selected="${(e) => { appStore.dispatch({ type: 'SET_EDITOR', selectedIndex: e.detail }); }}"
            @element-pinned="${(e) => { appStore.dispatch({ type: 'SET_EDITOR', pinnedIndex: e.detail }); }}"
            @editor-cancel="${this.onEditorCancel}"
            @editor-generate="${this.onEditorGenerate}">
          </display-panel>

          ${showEditorSidebar && editorJob ? html`
            <section class="editor-sidebar-column glass-card">
              <editor-sidebar
                .upsampledPrompt="${editorJob.upsampledPrompt}"
                .chatMessages="${editorJob.chatMessages || []}"
                .isRefining="${this.isRefining}"
                .selectedElementIndex="${this.editorSelectedIndex}"
                .pinnedBoxIndex="${this.editorPinnedIndex}"
                .readOnly="${isInspector}"
                .chatProviders="${this.chatProviders}"
                .selectedChatProvider="${this.selectedChatProvider}"
                .templates="${this.templates}"
                .selectedChatTemplate="${this.selectedChatTemplate}"
                @chat-provider-change="${this.onChatProviderChange}"
                @chat-template-change="${this.onChatTemplateChange}"
                @update-prompt="${(e) => this.onUpdateEditorPrompt(e)}"
                @send-chat="${this.onSendEditorChat}"
                @element-selected="${(e) => { appStore.dispatch({ type: 'SET_EDITOR', selectedIndex: e.detail }); }}"
                @element-pinned="${(e) => { appStore.dispatch({ type: 'SET_EDITOR', pinnedIndex: e.detail }); }}">
              </editor-sidebar>
            </section>
          ` : ''}
        </main>
      </div>

      <div class="toast-container">
        ${this.toasts.map((t) => html`
          <div class="toast ${t.type}">
            <div class="toast-content">
              <span class="toast-icon">
                ${t.type === 'success' ? html`${icon('check', 16)}` : html`${icon('info', 16)}`}
              </span>
              <span class="toast-message">${t.message}</span>
            </div>
          </div>
        `)}
      </div>

      <image-lightbox
        .src="${this.lightboxSrc}"
        .prompt="${this.lightboxPrompt}"
        .seedLabel="${this.lightboxSeedLabel}"
        .item="${this.lightboxItem}"
        .previews="${this.lightboxPreviews || []}"
        .hidden="${this.lightboxHidden}"
        @close="${this.onCloseLightbox}"
        @reuse="${this.onReuseSettings}"
        @reuse-advanced="${this.onReuseAdvancedSettings}"
        @hover-prompt="${this.onHoverPrompt}">
      </image-lightbox>
    `;
  }
}
customElements.define('app-root', AppRoot);
