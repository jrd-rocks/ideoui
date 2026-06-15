// Unified AppStore — the single source of truth for IdeoUI.
// State shape, reconciliation (last-write-wins by server updatedAt, replacing
// the old localFieldLocks/mergeRemoteJob time locks), and async effects.

import {
  selectActiveItem,
  selectDefaultProviderId,
  selectDefaultUpsamplerId,
  normalizeItem,
} from './selectors.js';
import {
  aspectRatioFromProviderParams,
  looksLikeJsonPrompt,
  promptWithAspectRatio,
  providerParamsFromHistory,
  withProviderDefaults,
} from '../controllers/generator-state.js';

const ACTIVE_ITEMS = ['pending', 'upsampling', 'upsampled', 'generating', 'editing', 'held', 'failed', 'completed'];

function initialState() {
  return {
    providers: { schemas: {}, chatProviders: [], templates: [] },
    settings: { theme: 'dark', holdGeneration: false },
    generator: {
      prompt: '',
      magicPrompt: true,
      bypassUpsample: false,
      isJsonMode: false,
      selectedTemplate: 'v1',
      selectedUpsampler: '',
      selectedEndpoint: '',
      providerParams: {},
      advancedMode: false,
      cachedUpsampledPrompt: '',
    },
    items: [],
    selection: { activeItemId: '', inspectorHistoryUuid: '' },
    panels: { userLeftTab: '', userCenterTab: '' },
    lightbox: { hidden: true, src: '', prompt: '', seedLabel: '', itemId: '', index: null, previews: [] },
    editor: { selectedIndex: null, pinnedIndex: null, undoStacks: {}, redoStacks: {} },
    history: [],
    session: { tabUuid: '' },
    view: 'current',
    ui: { isRefining: false, apiOnline: true },
    toasts: [],
  };
}

function ctxFromState(state) {
  return {
    providerSchemas: state.providers.schemas,
    selectedEndpoint: state.generator.selectedEndpoint,
    selectedUpsampler: state.generator.selectedUpsampler,
    templates: state.providers.templates,
  };
}

class AppStore {
  constructor() {
    this.state = initialState();
    this.listeners = new Set();
    // Per-item fields with an in-flight optimistic patch not yet echoed by the server.
    this._pendingFields = new Map();
    this._patchTimers = new Map();
    this._lastUpdatedAt = new Map(); // itemId -> server updatedAt seen so far
  }

  getState() {
    return this.state;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.state);
      } catch (e) {
        console.error('[AppStore] listener error:', e);
      }
    }
  }

  dispatch(action) {
    this.state = reduce(this.state, action, this);
    this.notify();
  }

  // ---- Generator helpers -------------------------------------------------

  withDefaults(providerId, params = {}) {
    return withProviderDefaults(ctxFromState(this.state), providerId, params);
  }

  defaultProviderId() {
    return selectDefaultProviderId(this.state);
  }

  defaultUpsamplerId() {
    return selectDefaultUpsamplerId(this.state);
  }

  // ---- Reconciliation ----------------------------------------------------

  /** Apply a server item via last-write-wins by updatedAt, preserving any
   *  in-flight optimistic field edits (bug #3 fix). */
  reconcileItem(raw) {
    this.state = reconcileInto(this.state, this._pendingFields, this._lastUpdatedAt, raw);
  }

  markPending(itemId, fields) {
    if (!itemId || !fields?.length) return;
    const set = this._pendingFields.get(itemId) || new Set();
    for (const f of fields) set.add(f);
    this._pendingFields.set(itemId, set);
  }

  clearPending(itemId, fields) {
    const set = this._pendingFields.get(itemId);
    if (!set) return;
    if (fields) for (const f of fields) set.delete(f);
    else set.clear();
    if (!set.size) this._pendingFields.delete(itemId);
  }

  // ---- Async effects -----------------------------------------------------

  async loadProviders() {
    const [schemasResp, chatResp, templatesResp] = await Promise.all([
      fetch('/api/providers/schemas'),
      fetch('/api/providers/chat'),
      fetch('/api/upsample_templates'),
    ]);
    const schemas = schemasResp.ok ? await schemasResp.json() : {};
    const chatProviders = chatResp.ok ? await chatResp.json() : [];
    const templates = templatesResp.ok ? await templatesResp.json() : ['v1'];
    this.dispatch({ type: 'SET_PROVIDERS', schemas, chatProviders, templates });
    return { schemas, chatProviders, templates };
  }

  async loadActiveJobs() {
    const resp = await fetch('/api/jobs/active');
    if (!resp.ok) throw new Error('Failed to load server jobs');
    const jobs = await resp.json();
    this.dispatch({ type: 'INITIAL_SYNC', jobs });
    return this.state.items;
  }

  async createItem(payload) {
    const resp = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create job');
    }
    const result = await resp.json();
    if (result.job) this.reconcileItem(result.job);
    this.dispatch({ type: 'SET_ACTIVE_ITEM', id: result.job_id });
    this.notify();
    return result;
  }

  patchItem(itemId, updates, { debounce = true, fields = null } = {}) {
    if (!itemId || !updates) return Promise.resolve();
    if (debounce) {
      const pending = { ...(this._pendingPayload?.(itemId) || {}), ...updates };
      this._setPendingPayload(itemId, pending);
      this.markPending(itemId, fields || Object.keys(updates));
      clearTimeout(this._patchTimers.get(itemId));
      return new Promise((resolve) => {
        this._patchTimers.set(
          itemId,
          setTimeout(async () => {
            const payload = this._getPendingPayload(itemId);
            this._clearPendingPayload(itemId);
            this._patchTimers.delete(itemId);
            if (payload) {
              await this._sendPatch(itemId, payload);
              this.clearPending(itemId, Object.keys(payload));
            }
            resolve();
          }, 700),
        );
      });
    }
    this.markPending(itemId, fields || Object.keys(updates));
    return this._sendPatch(itemId, updates).then(() => this.clearPending(itemId, Object.keys(updates)));
  }

  async _sendPatch(itemId, payload) {
    try {
      await fetch(`/api/jobs/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('[AppStore] patch failed:', e);
    }
  }

  hasPendingPatch(itemId) {
    return Boolean(this._pendingPayload?.get(itemId));
  }

  /** Optimistic local item field update + debounced server patch (bug #3:
   *  single path, no parallel draft universe). Pass patchFields: [] for a
   *  purely local update (e.g. client-only backgroundImage). */
  updateItem(itemId, fields, { debounce = true, patchFields = null } = {}) {
    if (!itemId || !fields) return Promise.resolve();
    this.dispatch({ type: 'UPDATE_ITEM_FIELDS', id: itemId, fields });
    const payloadKeys = patchFields || Object.keys(fields);
    if (!payloadKeys.length) return Promise.resolve();
    return this.patchItem(itemId, fields, { debounce, fields: payloadKeys });
  }

  async fetchItem(itemId) {
    try {
      const resp = await fetch(`/api/jobs/${encodeURIComponent(itemId)}`);
      if (!resp.ok) return null;
      const job = await resp.json();
      this.reconcileItem(job);
      this.notify();
      return normalizeItem(job);
    } catch (e) {
      console.warn('[AppStore] fetchItem failed:', e);
      return null;
    }
  }

  async removeItem(itemId) {
    try {
      const resp = await fetch(`/api/jobs/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
      if (!resp.ok && resp.status !== 404) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to remove server job');
      }
    } finally {
      this.dispatch({ type: 'REMOVE_ITEM', id: itemId });
    }
  }

  async clearCompleted() {
    const resp = await fetch('/api/jobs/completed', { method: 'DELETE' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to clear completed server jobs');
    }
    this.dispatch({ type: 'CLEAR_COMPLETED' });
  }

  // pending-payload coalescing (mirrors the old scheduleJobPatch pattern)
  _getPendingPayload(itemId) {
    return this._pendingPayload?.get(itemId);
  }
  _setPendingPayload(itemId, payload) {
    if (!this._pendingPayload) this._pendingPayload = new Map();
    this._pendingPayload.set(itemId, payload);
  }
  _clearPendingPayload(itemId) {
    this._pendingPayload?.delete(itemId);
  }

  // ---- Toasts ------------------------------------------------------------

  showToast(message, type = 'info') {
    const toast = { id: Date.now() + '_' + Math.random().toString(36).slice(2, 9), message, type };
    this.dispatch({ type: 'ADD_TOAST', toast });
    setTimeout(() => this.dispatch({ type: 'REMOVE_TOAST', id: toast.id }), 4000);
  }
}

// Pending payload map lives on the instance (lazily).
AppStore.prototype._pendingPayload = undefined;

// ---- Reconciliation helper (pure: returns new state) --------------------

function reconcileInto(state, pendingFields, lastUpdatedAt, raw) {
  const incoming = normalizeItem(raw);
  if (!incoming) return state;
  const current = state.items.find((it) => it.id === incoming.id);
  const incomingTs = incoming.updatedAt ? Date.parse(incoming.updatedAt) : null;
  const currentTs = current?.updatedAt ? Date.parse(current.updatedAt) : null;

  // Gate: ignore an inbound update strictly older than what we already have.
  if (current && incomingTs !== null && currentTs !== null && incomingTs < currentTs) {
    return state;
  }

  let merged = incoming;
  if (current) {
    merged = { ...current, ...incoming };
    const pending = pendingFields?.get(incoming.id);
    if (pending && pending.size) {
      for (const field of pending) {
        if (Object.prototype.hasOwnProperty.call(current, field)) {
          merged[field] = current[field];
        }
      }
    }
  }

  if (incomingTs !== null) {
    const seen = lastUpdatedAt.get(incoming.id);
    if (!seen || incomingTs >= seen) lastUpdatedAt.set(incoming.id, incomingTs);
  }

  const items = current
    ? state.items.map((it) => (it.id === incoming.id ? merged : it))
    : [merged, ...state.items];
  return { ...state, items };
}

// ---- Reducer -------------------------------------------------------------

function reduce(state, action, store) {
  switch (action.type) {
    case 'SET_PROVIDERS': {
      const templates = action.templates || [];
      const firstTemplate = templates[0];
      const selectedTemplate = state.generator.selectedTemplate || (typeof firstTemplate === 'object' ? firstTemplate?.id : firstTemplate) || 'v1';
      const providerSchemas = action.schemas || {};
      const chatProviders = action.chatProviders || [];
      const schemasCtx = { providerSchemas, selectedEndpoint: state.generator.selectedEndpoint, selectedUpsampler: state.generator.selectedUpsampler, templates };
      // Resolve defaults for endpoint/upsampler if not yet set.
      let selectedEndpoint = state.generator.selectedEndpoint || selectDefaultProviderId({ providers: { schemas: providerSchemas } });
      let selectedUpsampler = state.generator.selectedUpsampler || selectDefaultUpsamplerId({ providers: { schemas: providerSchemas } });
      const providerParams = withProviderDefaults(schemasCtx, selectedEndpoint, state.generator.providerParams);
      return {
        ...state,
        providers: { schemas: providerSchemas, chatProviders, templates },
        generator: { ...state.generator, selectedTemplate, selectedEndpoint, selectedUpsampler, providerParams },
      };
    }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'SET_GENERATOR_FIELD':
      if (state.generator[action.field] === action.value) return state;
      return { ...state, generator: { ...state.generator, [action.field]: action.value } };

    case 'SET_GENERATOR_FIELDS':
      return { ...state, generator: { ...state.generator, ...action.fields } };

    case 'RESET_GENERATOR': {
      const g = state.generator;
      const provider = g.selectedEndpoint || selectDefaultProviderId(state);
      return {
        ...state,
        generator: {
          ...g,
          prompt: '',
          bypassUpsample: false,
          cachedUpsampledPrompt: '',
          isJsonMode: false,
          advancedMode: g.advancedMode,
          magicPrompt: g.magicPrompt,
          parentUuid: '',
          selectedEndpoint: provider,
          providerParams: withProviderDefaults(ctxFromState(state), provider, g.providerParams),
        },
        panels: { userLeftTab: '', userCenterTab: '' },
      };
    }

    case 'APPLY_HISTORY_TO_GENERATOR': {
      const item = action.item;
      const provider = item?.params?.provider || item?.params?.endpoint || state.generator.selectedEndpoint || selectDefaultProviderId(state);
      const providerParams = withProviderDefaults(ctxFromState(state), provider, providerParamsFromHistory(item));
      const selectedTemplate = item?.params?.upsampleTemplate || item?.params?.upsamplerParams?.template || state.generator.selectedTemplate || 'v1';
      const selectedUpsampler = item?.params?.upsampler || state.generator.selectedUpsampler || selectDefaultUpsamplerId(state);
      const historyWasJson = Boolean(item?.params?.isJsonMode);
      const sourcePrompt = item?.params?.sourceRawPrompt || (historyWasJson ? item?.upsampledPrompt : item?.rawPrompt) || '';
      const isJsonMode = Boolean(historyWasJson || looksLikeJsonPrompt(sourcePrompt));
      return {
        ...state,
        generator: {
          ...state.generator,
          selectedEndpoint: provider,
          providerParams,
          selectedTemplate,
          selectedUpsampler,
          parentUuid: item?.uuid || '',
          advancedMode: false,
          prompt: sourcePrompt,
          cachedUpsampledPrompt: historyWasJson ? '' : (item?.upsampledPrompt || ''),
          isJsonMode,
          magicPrompt: !isJsonMode,
          bypassUpsample: false,
        },
        panels: { userLeftTab: '', userCenterTab: '' },
      };
    }

    case 'UPSERT_ITEM':
      return reconcileInto(state, store._pendingFields, store._lastUpdatedAt, action.item);

    case 'INITIAL_SYNC': {
      let next = state;
      for (const job of action.jobs || []) {
        next = reconcileInto(next, store._pendingFields, store._lastUpdatedAt, job);
      }
      // Prune terminal items not present in the sync (server is authoritative),
      // but keep non-terminal / editing items even if absent (they resume).
      const incomingIds = new Set((action.jobs || []).map((j) => j.id || j.job_id));
      return {
        ...next,
        items: next.items.filter((it) => incomingIds.has(it.id) || !['completed', 'failed', 'cancelled'].includes(it.status)),
      };
    }

    case 'REMOVE_ITEM':
      store._pendingFields.delete(action.id);
      store._lastUpdatedAt.delete(action.id);
      return {
        ...state,
        items: state.items.filter((it) => it.id !== action.id),
        selection: state.selection.activeItemId === action.id
          ? { ...state.selection, activeItemId: firstActiveId(state, action.id) }
          : state.selection,
      };

    case 'UPDATE_ITEM_FIELDS':
      return {
        ...state,
        items: state.items.map((it) => (it.id === action.id ? { ...it, ...action.fields } : it)),
      };

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        items: state.items.filter((it) => !['completed', 'failed', 'cancelled'].includes(it.status)),
      };

    case 'SET_ACTIVE_ITEM': {
      const id = action.id || '';
      // Activating an item means entering the Current workspace (the editor /
      // result panels live there). Clearing the selection leaves the view as-is.
      return {
        ...state,
        view: id ? 'current' : state.view,
        selection: { ...state.selection, activeItemId: id, inspectorHistoryUuid: '' },
        panels: { userLeftTab: '', userCenterTab: '' },
        editor: { ...state.editor, pinnedIndex: null },
      };
    }

    case 'SET_INSPECTOR':
      if (state.selection.inspectorHistoryUuid === (action.uuid || '')) return state;
      return { ...state, selection: { ...state.selection, inspectorHistoryUuid: action.uuid || '' } };

    case 'SET_PANEL':
      if (action.leftTab !== undefined && state.panels.userLeftTab === action.leftTab && action.centerTab === undefined) return state;
      return { ...state, panels: { ...state.panels, ...(action.leftTab !== undefined ? { userLeftTab: action.leftTab } : {}), ...(action.centerTab !== undefined ? { userCenterTab: action.centerTab } : {}) } };

    case 'SET_LIGHTBOX':
      return { ...state, lightbox: { ...state.lightbox, ...action.partial } };

    case 'CLOSE_LIGHTBOX':
      if (state.lightbox.hidden && !state.lightbox.previews?.length && state.lightbox.index === null) return state;
      return { ...state, lightbox: { ...state.lightbox, hidden: true, index: null, previews: [] } };

    case 'SET_EDITOR':
      return { ...state, editor: { ...state.editor, ...(action.selectedIndex !== undefined ? { selectedIndex: action.selectedIndex } : {}), ...(action.pinnedIndex !== undefined ? { pinnedIndex: action.pinnedIndex } : {}) } };

    case 'PUSH_UNDO': {
      const stacks = { ...state.editor.undoStacks };
      const stack = (stacks[action.itemId] || []).slice();
      if (stack[stack.length - 1] !== action.prompt) {
        stack.push(action.prompt);
        if (stack.length > 80) stack.shift();
        stacks[action.itemId] = stack;
      }
      return { ...state, editor: { ...state.editor, undoStacks: stacks, redoStacks: { ...state.editor.redoStacks, [action.itemId]: [] } } };
    }

    case 'SET_UNDO_REDO':
      return {
        ...state,
        editor: {
          ...state.editor,
          undoStacks: { ...state.editor.undoStacks, [action.itemId]: action.undoStack },
          redoStacks: { ...state.editor.redoStacks, [action.itemId]: action.redoStack },
        },
      };

    case 'SET_HISTORY':
      return { ...state, history: action.items || [] };

    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.partial } };

    case 'SET_VIEW':
      if (state.view === (action.view || 'current')) return state;
      return { ...state, view: action.view || 'current' };

    case 'SET_SESSION':
      return { ...state, session: { ...state.session, ...action.partial } };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    default:
      return state;
  }
}

function firstActiveId(state, excludingId) {
  const candidate = state.items.find((it) => it.id !== excludingId && ACTIVE_ITEMS.includes(it.status));
  return candidate?.id || '';
}

export const appStore = new AppStore();
