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
