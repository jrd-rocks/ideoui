// Routing as a projection of store state (bug #2 fix). The hash is never a
// second source of truth: it is derived from {view, selection, lightbox}, and
// a hashchange parses back into selection/lightbox (navigate). Idempotent in
// both directions, so there are no loops.

export function parseRoute(hash = window.location.hash || '#/') {
  const route = hash || '#/';
  if (route === '#/' || route === '') return { name: 'home' };
  if (route === '#/queue') return { name: 'queue' };
  if (route === '#/history') return { name: 'history' };

  const jobMatch = route.match(/^#\/job\/([^/]+)(?:\/lightbox\/(\d+))?$/);
  if (jobMatch) {
    return {
      name: 'job',
      jobId: jobMatch[1],
      lightboxIndex: jobMatch[2] === undefined ? null : Number(jobMatch[2])
    };
  }

  const editorStartMatch = route.match(/^#\/editor\/start\/([^/]+)$/);
  if (editorStartMatch) return { name: 'editor-start', itemUuid: editorStartMatch[1] };

  const editorMatch = route.match(/^#\/editor\/([^/]+)$/);
  if (editorMatch) return { name: 'editor', jobId: editorMatch[1] };

  const historyLightboxMatch = route.match(/^#\/history\/([^/]+)\/lightbox\/(\d+)$/);
  if (historyLightboxMatch) {
    return {
      name: 'history-lightbox',
      uuid: historyLightboxMatch[1],
      lightboxIndex: Number(historyLightboxMatch[2])
    };
  }

  return { name: 'unknown', hash: route };
}

/**
 * Project store state to a hash string. Pure.
 */
export function selectionToHash(state) {
  const lb = state.lightbox || {};
  const sel = state.selection || {};

  if (!lb.hidden && lb.itemId && lb.index !== null && lb.index !== undefined) {
    if (state.view === 'history' || sel.inspectorHistoryUuid) {
      const uuid = sel.inspectorHistoryUuid || lb.itemId;
      return `#/history/${uuid}/lightbox/${lb.index}`;
    }
    if (sel.activeItemId) {
      return `#/job/${sel.activeItemId}/lightbox/${lb.index}`;
    }
  }

  if (sel.inspectorHistoryUuid) {
    // Inspector without lightbox stays on history view.
    return '#/history';
  }

  if (state.view === 'history') {
    return '#/history';
  }

  if (sel.activeItemId) {
    const item = (state.items || []).find((it) => it.id === sel.activeItemId);
    if (item?.status === 'editing') return `#/editor/${sel.activeItemId}`;
    return `#/job/${sel.activeItemId}`;
  }

  if (state.panels?.userLeftTab === 'progress') return '#/queue';
  return '#/';
}

/**
 * Given a parsed route, return the selection/lightbox/view deltas to apply.
 * Returns null if the hash does not imply a state change (idempotent guard).
 */
export function routeToState(route, state) {
  const sel = state.selection || {};
  switch (route.name) {
    case 'home':
      return { view: 'current', activeItemId: '', inspectorHistoryUuid: '', closeLightbox: true, userLeftTab: 'generator' };
    case 'queue':
      return { view: 'current', userLeftTab: 'progress', closeLightbox: true };
    case 'history':
      return { view: 'history', closeLightbox: true, inspectorHistoryUuid: '' };
    case 'job':
      return { view: 'current', activeItemId: route.jobId, inspectorHistoryUuid: '', lightboxIndex: route.lightboxIndex, lightboxFromJob: route.jobId };
    case 'editor':
      return { view: 'current', activeItemId: route.jobId, inspectorHistoryUuid: '', closeLightbox: true };
    case 'editor-start':
      return { view: 'current', inspectorHistoryUuid: '', closeLightbox: true, editorStartUuid: route.itemUuid };
    case 'history-lightbox':
      return { view: 'history', inspectorHistoryUuid: route.uuid, lightboxIndex: route.lightboxIndex, lightboxFromHistoryUuid: route.uuid };
    default:
      return null;
  }
}
