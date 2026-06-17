import { extractAndRepairJson } from '../utils/helpers.js';
import { appStore } from '../state/app-store.js';
import { selectActiveItem } from '../state/selectors.js';
import {
  aspectRatioFromProviderParams,
  promptWithAspectRatio,
  providerParamsFromHistory,
} from './generator-state.js';
import { scheduleSessionSave } from '../state/session.js';


export function promptToDraftJson(promptText) {
  try {
    return JSON.parse(promptText);
  } catch (_) {
    return null;
  }
}

function activeItem() {
  return selectActiveItem(appStore.getState());
}

function resolveUpsamplerId(explicit) {
  if (explicit && explicit !== 'deepseek') return explicit;
  return appStore.getState().generator.selectedUpsampler || appStore.defaultUpsamplerId() || null;
}


export function rememberEditorSnapshot(ctx, jobId, promptText) {
  if (!jobId || !promptText) return;
  appStore.dispatch({ type: 'PUSH_UNDO', itemId: jobId, prompt: promptText });
}


export async function ensureEditableEditorJob(ctx, nextPrompt = null) {
  const state = appStore.getState();
  const current = selectActiveItem(state);
  if (current?.status === 'editing') return current;
  if (!ctx.inspectorItem) return current;

  const item = ctx.inspectorItem;
  const providerParams = providerParamsFromHistory(item);
  const upsampledPrompt = promptWithAspectRatio(nextPrompt || item.upsampledPrompt, aspectRatioFromProviderParams(providerParams));
  const result = await appStore.createItem({
    raw_prompt: item.rawPrompt,
    provider: item.params?.provider || item.params?.endpoint || state.generator.selectedEndpoint,
    upsampler: resolveUpsamplerId(item.params?.upsampler),
    parent_uuid: item.uuid || null,
    magic_prompt: false,
    advanced_mode: true,
    provider_params: providerParams,
    upsampler_params: item.params?.upsamplerParams || { template: item.params?.upsampleTemplate || 'v1' },
    upsampled_prompt: upsampledPrompt,
    chat_messages: [
      { role: "system", content: "Visual Prompt Layout Chat Assistant." },
      { role: "user", content: `Editing existing layout from history.\nOriginal prompt: ${item.rawPrompt}` },
      { role: "assistant", content: upsampledPrompt }
    ],
    job_type: "editing"
  });
  const job = selectActiveItem(appStore.getState());
  if (job) {
    appStore.updateItem(job.id, { backgroundImage: item.images?.[0] || null }, { debounce: false, patchFields: [] });
    rememberEditorSnapshot(ctx, job.id, item.upsampledPrompt);
  }
  ctx.inspectorItem = null;
  appStore.dispatch({ type: 'SET_INSPECTOR', uuid: '' });
  window.location.hash = '#/editor/' + result.job_id;
  return selectActiveItem(appStore.getState());
}


export async function updateEditorPrompt(ctx, nextPrompt) {
  const job = await ensureEditableEditorJob(ctx, nextPrompt);
  if (!job) return;
  const alreadyEditing = appStore.hasPendingPatch?.(job.id);
  if (job.upsampledPrompt !== nextPrompt && !alreadyEditing) {
    rememberEditorSnapshot(ctx, job.id, job.upsampledPrompt);
  }
  const draftJson = promptToDraftJson(nextPrompt);
  appStore.updateItem(job.id, { upsampledPrompt: nextPrompt, draftJson });
  scheduleSessionSave();
}


export function editorUndo(ctx) {
  const job = activeItem();
  if (!job) return;
  const undoStack = (appStore.getState().editor.undoStacks[job.id] || []).slice();
  const previous = undoStack.pop();
  if (!previous) return;
  const redoStack = (appStore.getState().editor.redoStacks[job.id] || []).slice();
  redoStack.push(job.upsampledPrompt);
  appStore.dispatch({ type: 'SET_UNDO_REDO', itemId: job.id, undoStack, redoStack });
  const draftJson = promptToDraftJson(previous);
  appStore.updateItem(job.id, { upsampledPrompt: previous, draftJson }, { debounce: false });
}


export function editorRedo(ctx) {
  const job = activeItem();
  if (!job) return;
  const redoStack = (appStore.getState().editor.redoStacks[job.id] || []).slice();
  const next = redoStack.pop();
  if (!next) return;
  const undoStack = (appStore.getState().editor.undoStacks[job.id] || []).slice();
  undoStack.push(job.upsampledPrompt);
  appStore.dispatch({ type: 'SET_UNDO_REDO', itemId: job.id, undoStack, redoStack });
  const draftJson = promptToDraftJson(next);
  appStore.updateItem(job.id, { upsampledPrompt: next, draftJson }, { debounce: false });
}


export async function editorGenerate(ctx) {
  const state = appStore.getState();
  const editorJob = selectActiveItem(state);
  if (!editorJob) return;

  appStore.dispatch({ type: 'SET_EDITOR', pinnedIndex: null });
  const providerParams = { ...(state.generator.providerParams || editorJob.providerParams || {}) };
  const upsampledPrompt = promptWithAspectRatio(editorJob.upsampledPrompt, aspectRatioFromProviderParams(providerParams));

  // Chain from the editor session's persisted chain head (history ancestor for
  // the first generate, the previous result's uuid afterwards). Bug #6.
  const parentUuid = editorJob.editorChainHeadUuid || editorJob.parentUuid || null;

  const result = await appStore.createItem({
    raw_prompt: editorJob.rawPrompt,
    provider: editorJob.provider || editorJob.params?.endpoint || state.generator.selectedEndpoint,
    upsampler: resolveUpsamplerId(editorJob.upsampler),
    parent_uuid: parentUuid,
    magic_prompt: false,
    advanced_mode: false,
    provider_params: providerParams,
    upsampler_params: editorJob.upsamplerParams || { template: editorJob.params?.upsampleTemplate || 'v1' },
    upsampled_prompt: upsampledPrompt,
    chat_messages: editorJob.chatMessages || []
  });

  // Advance the editor chain head to the new result and persist it (survives
  // reload / device switch). Bug #6.
  if (result.uuid) {
    appStore.updateItem(editorJob.id, { editorChainHeadUuid: result.uuid }, { debounce: false });
  }

  if (result.held === true) {
    ctx.showToast(`Generation held — will start when "Hold Generation" is released.`, 'info');
  } else {
    ctx.showToast(`Queued generation for "${editorJob.rawPrompt.substring(0, 30)}..."`, 'success');
  }
  appStore.dispatch({ type: 'SET_PANEL', leftTab: 'progress' });
  window.location.hash = '#/job/' + result.job_id;
}


export async function sendEditorChat(ctx, text) {
  const job = await ensureEditableEditorJob(ctx);
  if (!job) return;

  appStore.dispatch({ type: 'SET_UI', partial: { isRefining: true } });
  ctx.requestUpdate();

  const updatedMessages = [...(job.chatMessages || []), { role: "user", content: text }];
  let lastAssistantIdx = -1;
  for (let i = updatedMessages.length - 1; i >= 0; i--) {
    if (updatedMessages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }
  if (lastAssistantIdx >= 0) {
    updatedMessages[lastAssistantIdx] = { ...updatedMessages[lastAssistantIdx], content: job.upsampledPrompt };
  }

  appStore.updateItem(job.id, { chatMessages: [...updatedMessages, { role: "assistant", content: "", streaming: true }] });

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        messages: updatedMessages,
        chat_provider: ctx.selectedChatProvider,
        chat_template: ctx.selectedChatTemplate
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server chat API failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let assistantReply = (data.upsampledPrompt || data.upsampled_prompt || data.content || '').trim();
    assistantReply = await extractAndRepairJson(assistantReply);
    const finalMessages = [...updatedMessages, { role: "assistant", content: assistantReply }];
    appStore.updateItem(job.id, { upsampledPrompt: assistantReply, chatMessages: finalMessages });
  } catch (err) {
    console.error("AI refinement failed:", err);
    const finalMessages = [...updatedMessages, { role: "assistant", content: `Error: ${err.message}` }];
    appStore.updateItem(job.id, { chatMessages: finalMessages });
  } finally {
    appStore.dispatch({ type: 'SET_UI', partial: { isRefining: false } });
    ctx.requestUpdate();
  }
}
