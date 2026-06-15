// Session persistence: loads/saves the full persistent slice to the backend,
// which mirrors every save to both a per-tab row and a global '__global__'
// row so the latest write from any device wins on read (cross-device).

import { appStore } from './app-store.js';

let saveTimer = null;

export function getTabUuid() {
  let tabUuid = sessionStorage.getItem('ideoui_tab_uuid');
  if (!tabUuid) {
    tabUuid = crypto.randomUUID ? crypto.randomUUID() : `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('ideoui_tab_uuid', tabUuid);
  }
  return tabUuid;
}

function buildFormState(state) {
  const g = state.generator || {};
  return {
    prompt: g.prompt,
    magicPrompt: g.magicPrompt,
    bypassUpsample: g.bypassUpsample,
    isJsonMode: g.isJsonMode,
    selectedTemplate: g.selectedTemplate,
    selectedUpsampler: g.selectedUpsampler,
    selectedEndpoint: g.selectedEndpoint,
    providerParams: g.providerParams,
    advancedMode: g.advancedMode,
    cachedUpsampledPrompt: g.cachedUpsampledPrompt,
    activeItemId: state.selection?.activeItemId || '',
    inspectorHistoryUuid: state.selection?.inspectorHistoryUuid || '',
    lightbox: state.lightbox || {},
  };
}

export async function saveSession(route) {
  const tabUuid = getTabUuid();
  const state = appStore.getState();
  const activeItem = (state.items || []).find((it) => it.id === state.selection?.activeItemId);
  try {
    await fetch('/api/session/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab_uuid: tabUuid,
        active_job_id: state.selection?.activeItemId || null,
        route: route || window.location.hash || '#/',
        form_state: buildFormState(state),
        draft_json: activeItem?.draftJson || null,
      }),
    });
  } catch (e) {
    console.warn('[session] autosave failed:', e);
  }
}

export function scheduleSessionSave(route, delayMs = 500) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveSession(route), delayMs);
}

export async function loadSession() {
  const tabUuid = getTabUuid();
  let resp = await fetch(`/api/session/state?tab_uuid=${encodeURIComponent(tabUuid)}`);
  let data = resp.ok ? await resp.json() : null;
  if (!data) {
    // No tab context — fall back to the newest row overall (cross-device).
    const latest = await fetch('/api/session/state');
    data = latest.ok ? await latest.json() : null;
  }
  if (!data) return null;

  const form = data.form_state || data.formState || {};
  appStore.dispatch({ type: 'SET_GENERATOR_FIELDS', fields: {
    prompt: form.prompt ?? appStore.getState().generator.prompt,
    magicPrompt: form.magicPrompt ?? appStore.getState().generator.magicPrompt,
    bypassUpsample: form.bypassUpsample ?? false,
    isJsonMode: form.isJsonMode ?? false,
    selectedTemplate: form.selectedTemplate ?? appStore.getState().generator.selectedTemplate,
    selectedUpsampler: form.selectedUpsampler ?? appStore.getState().generator.selectedUpsampler,
    selectedEndpoint: form.selectedEndpoint ?? appStore.getState().generator.selectedEndpoint,
    providerParams: form.providerParams ?? appStore.getState().generator.providerParams,
    advancedMode: form.advancedMode ?? false,
    cachedUpsampledPrompt: form.cachedUpsampledPrompt ?? '',
  } });

  const activeJobId = data.active_job_id || data.activeJobId || form.activeItemId;
  if (activeJobId && appStore.getState().items.some((it) => it.id === activeJobId)) {
    appStore.dispatch({ type: 'SET_ACTIVE_ITEM', id: activeJobId });
  }
  return { data, activeJobId, route: data.route };
}
