// WebSocket bridge: connects to /ws/stream and dispatches store actions.
// Replaces QueueStore.connect(); uses last-write-wins reconciliation (no
// localFieldLocks / mergeRemoteJob).

import { appStore } from './app-store.js';

let socket = null;
let reconnectTimer = null;
let reconnectDelay = 1000;

export function isWsConnected() {
  return Boolean(socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState));
}

export function connectWs() {
  if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}/ws/stream`);

  socket.addEventListener('open', () => {
    reconnectDelay = 1000;
    appStore.dispatch({ type: 'SET_UI', partial: { apiOnline: true } });
  });

  socket.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (e) {
      console.error('[ws-client] invalid message:', e);
      return;
    }
    handleWsEvent(payload);
  });

  const reconnect = () => {
    appStore.dispatch({ type: 'SET_UI', partial: { apiOnline: false } });
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWs, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  };
  socket.addEventListener('close', reconnect);
  socket.addEventListener('error', () => socket?.close());
}

function handleWsEvent(payload) {
  switch (payload.event_type) {
    case 'initial_sync':
      appStore.dispatch({ type: 'INITIAL_SYNC', jobs: payload.jobs || [] });
      return;
    case 'job_removed':
      appStore.dispatch({ type: 'REMOVE_ITEM', id: payload.job_id || payload.id });
      return;
    case 'llm_stream':
      applyLlmStream(payload);
      return;
    case 'generation_progress':
      applyGenerationProgress(payload);
      return;
    default: {
      const job = payload.job || payload;
      if (job?.id || job?.job_id) appStore.reconcileItem(job);
      appStore.notify();
    }
  }
}

function applyLlmStream(payload) {
  const jobId = payload.job_id || payload.id;
  if (!jobId) return;
  const item = appStore.getState().items.find((it) => it.id === jobId);
  if (!item) return;
  const prev = item.llmStream || { thinking: '', content: '', done: false, context: payload.context || 'progress' };
  const next = {
    ...prev,
    context: payload.context || prev.context || 'progress',
    done: Boolean(payload.done),
  };
  if (!payload.done && payload.token) {
    if (payload.stream_type === 'thinking') {
      next.thinking = `${next.thinking || ''}${payload.token}`;
    } else {
      next.content = `${next.content || ''}${payload.token}`;
    }
  }

  const updates = { llmStream: next };
  if (next.context === 'chat') {
    const messages = [...(item.chatMessages || [])];
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.streaming) {
      messages[messages.length - 1] = { ...last, content: next.content, streaming: !next.done };
    } else if (!next.done) {
      messages.push({ role: 'assistant', content: next.content, streaming: true });
    }
    updates.chatMessages = messages;
  } else if (item.status === 'pending') {
    // Progress-context LLM tokens imply the job is upsampling.
    updates.status = 'upsampling';
  }
  appStore.reconcileItem({ ...item, ...updates });
  appStore.notify();
}

function applyGenerationProgress(payload) {
  const jobId = payload.job_id || payload.id;
  if (!jobId) return;
  const item = appStore.getState().items.find((it) => it.id === jobId);
  if (!item) return;
  const updates = {};
  if (payload.progress_event === 'step') {
    updates.genStep = payload.step;
    updates.genTotal = payload.total;
    updates.genImageCurrent = payload.imageCurrent ?? null;
    updates.genImageTotal = payload.imageTotal ?? null;
    updates.genStepCurrent = payload.stepCurrent ?? null;
    updates.genStepTotal = payload.stepTotal ?? null;
    if (payload.previews) {
      const imageCount = getGenerationImageCount(item);
      const nextPreviews = Array.from(
        { length: imageCount },
        (_, index) => item.genPreviews?.[index] || null
      );
      let changed = false;
      for (const [key, value] of Object.entries(payload.previews)) {
        const previews = Array.isArray(value) ? value : [];
        if (!previews.length) continue;

        if (previews.length === 1 && imageCount > 1) {
          const numericKey = Number(key);
          const slot = Number.isFinite(numericKey) ? (Math.max(1, Math.floor(numericKey)) - 1) % imageCount : 0;
          nextPreviews[slot] = `data:image/jpeg;base64,${previews[0]}`;
          changed = true;
        } else {
          previews.slice(0, imageCount).forEach((preview, index) => {
            nextPreviews[index] = `data:image/jpeg;base64,${preview}`;
            changed = true;
          });
        }
      }
      if (changed) updates.genPreviews = nextPreviews;
    }
  } else if (payload.progress_event === 'status') {
    updates.genStatus = payload.text;
  }
  if (item.status !== 'generating') updates.status = 'generating';
  appStore.reconcileItem({ ...item, ...updates });
  appStore.notify();
}

function getGenerationImageCount(item) {
  const providerParams = item.providerParams || item.params?.providerParams || {};
  const raw = providerParams.image_count ?? providerParams.imageCount ?? item.params?.imageCount ?? item.params?.image_count ?? 1;
  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? Math.max(1, Math.round(count)) : 1;
}
