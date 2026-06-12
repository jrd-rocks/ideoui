import { queueStore } from '../utils/store.js';
import { parseRoute } from '../utils/router.js';


export function clearMissingJobRoute(ctx, jobId) {
  if (jobId) queueStore.removeJobLocal(jobId);
  ctx.closeRouteLightbox();
  ctx.activeTab = 'current';
  ctx.activeLeftTab = 'generator';
  queueStore.setSelectedJobId('');
  ctx.resetGeneratorForm();
  ctx.scheduleSessionSave();
  if ((window.location.hash || '#/') !== '#/') {
    window.location.hash = '#/';
  }
}


export function handleAppRoute(ctx, options = {}) {
  const hash = window.location.hash || '#/';
  const route = parseRoute(hash);
  ctx.currentRoute = hash;
  ctx.editorPinnedIndex = null;
  ctx.inspectorItem = null;

  if (route.name === 'job') {
    const { jobId } = route;
    const job = ctx.jobQueue.find(j => j.id === jobId);
    if (job) {
      queueStore.setSelectedJobId(jobId);
      ctx.activeTab = 'current';
      ctx.activeLeftTab = 'progress';
      ctx.updateFormInputs(job);
      if (route.lightboxIndex !== null) ctx.openRouteLightbox(job, route.lightboxIndex);
    } else {
      queueStore.fetchJob(jobId).then(found => {
        if (found) {
          queueStore.setSelectedJobId(jobId);
          ctx.activeLeftTab = 'progress';
          ctx.updateFormInputs(found);
          if (route.lightboxIndex !== null) ctx.openRouteLightbox(found, route.lightboxIndex);
        } else if ((window.location.hash || '').startsWith(`#/job/${jobId}`)) {
          clearMissingJobRoute(ctx, jobId);
        }
      });
    }
  } else if (route.name === 'queue') {
    ctx.activeTab = 'current';
    ctx.activeLeftTab = 'progress';
    ctx.closeRouteLightbox();
  } else if (route.name === 'editor-start' || route.name === 'editor') {
    ctx.activeTab = 'current';
    ctx.closeRouteLightbox();
    if (route.name === 'editor-start') {
      const item = ctx.getHistoryItem(route.itemUuid);
      ctx.inspectorItem = item;
      queueStore.setSelectedJobId('');
      if (!item) ctx.loadHistory().then(() => {
        ctx.inspectorItem = ctx.getHistoryItem(route.itemUuid);
        ctx.requestUpdate();
      });
    } else {
      const jobId = route.jobId;
      queueStore.setSelectedJobId(jobId);
      queueStore.fetchJob(jobId).then(found => {
        if (!found && (window.location.hash || '').startsWith(`#/editor/${jobId}`)) {
          clearMissingJobRoute(ctx, jobId);
        }
      });
    }
  } else if (route.name === 'history') {
    ctx.activeTab = 'history';
    ctx.closeRouteLightbox();
  } else if (route.name === 'history-lightbox') {
    ctx.activeTab = 'history';
    const item = ctx.getHistoryItem(route.uuid);
    if (item) {
      ctx.openRouteLightbox(item, route.lightboxIndex);
    } else {
      ctx.loadHistory().then(() => ctx.openRouteLightbox(ctx.getHistoryItem(route.uuid), route.lightboxIndex));
    }
  } else {
    ctx.activeTab = 'current';
    ctx.closeRouteLightbox();
    if (hash === '#/' && !options.preserveHome && !ctx._preserveNextHomeRoute) {
      queueStore.setSelectedJobId('');
      ctx.activeLeftTab = 'generator';
      ctx.resetGeneratorForm();
    }
    ctx._preserveNextHomeRoute = false;
  }
  ctx.requestUpdate();
}
