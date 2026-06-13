import { extractAndRepairJson } from '../utils/helpers.js';
import { queueStore } from '../utils/store.js';


export function promptToDraftJson(promptText) {
  try {
    return JSON.parse(promptText);
  } catch (_) {
    return null;
  }
}


export function rememberEditorSnapshot(ctx, jobId, promptText) {
  if (!jobId || !promptText) return;
  const stack = ctx.editorUndoStacks.get(jobId) || [];
  if (stack[stack.length - 1] !== promptText) {
    stack.push(promptText);
    if (stack.length > 80) stack.shift();
    ctx.editorUndoStacks.set(jobId, stack);
    ctx.editorRedoStacks.set(jobId, []);
  }
}


export async function ensureEditableEditorJob(ctx, nextPrompt = null) {
  const current = ctx.jobQueue.find(j => j.id === ctx.selectedJobId);
  if (current?.status === 'editing') return current;
  if (!ctx.inspectorItem) return current;

  const item = ctx.inspectorItem;
  const provider = item.params?.provider || item.params?.endpoint || ctx.selectedEndpoint;
  const providerParams = ctx.providerParamsFromHistory(item);
  const upsampledPrompt = ctx.promptWithAspectRatio(nextPrompt || item.upsampledPrompt, ctx.aspectRatioFromProviderParams(providerParams));
  const result = await queueStore.sendJobRequest({
    raw_prompt: item.rawPrompt,
    provider,
    upsampler: item.params?.upsampler || 'deepseek',
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
  const job = queueStore.getSelectedJob();
  if (job) {
    queueStore.updateJob(job.id, { backgroundImage: item.images?.[0] || null });
    rememberEditorSnapshot(ctx, job.id, item.upsampledPrompt);
  }
  ctx.inspectorItem = null;
  window.location.hash = '#/editor/' + result.job_id;
  return queueStore.getSelectedJob();
}


export async function updateEditorPrompt(ctx, nextPrompt) {
  const job = await ensureEditableEditorJob(ctx, nextPrompt);
  if (!job) return;
  const alreadyEditing = ctx.hasPendingJobPatch?.(job.id);
  if (job.upsampledPrompt !== nextPrompt && !alreadyEditing) {
    rememberEditorSnapshot(ctx, job.id, job.upsampledPrompt);
  }
  const draftJson = promptToDraftJson(nextPrompt);
  queueStore.updateJob(
    job.id,
    { upsampledPrompt: nextPrompt, draftJson },
    { local: true, fields: ['upsampledPrompt', 'draftJson'] }
  );
  if (ctx.scheduleJobPatch) {
    ctx.scheduleJobPatch(job.id, { upsampledPrompt: nextPrompt, draftJson });
  } else {
    ctx.patchServerJob(job.id, { upsampledPrompt: nextPrompt, draftJson });
  }
  ctx.scheduleSessionSave();
}


export function editorUndo(ctx) {
  const job = queueStore.getSelectedJob();
  if (!job) return;
  const stack = ctx.editorUndoStacks.get(job.id) || [];
  const previous = stack.pop();
  if (!previous) return;
  const redo = ctx.editorRedoStacks.get(job.id) || [];
  redo.push(job.upsampledPrompt);
  ctx.editorUndoStacks.set(job.id, stack);
  ctx.editorRedoStacks.set(job.id, redo);
  const draftJson = promptToDraftJson(previous);
  queueStore.updateJob(job.id, { upsampledPrompt: previous, draftJson });
  ctx.patchServerJob(job.id, { upsampledPrompt: previous, draftJson });
}


export function editorRedo(ctx) {
  const job = queueStore.getSelectedJob();
  if (!job) return;
  const stack = ctx.editorRedoStacks.get(job.id) || [];
  const next = stack.pop();
  if (!next) return;
  const undo = ctx.editorUndoStacks.get(job.id) || [];
  undo.push(job.upsampledPrompt);
  ctx.editorRedoStacks.set(job.id, stack);
  ctx.editorUndoStacks.set(job.id, undo);
  const draftJson = promptToDraftJson(next);
  queueStore.updateJob(job.id, { upsampledPrompt: next, draftJson });
  ctx.patchServerJob(job.id, { upsampledPrompt: next, draftJson });
}


export async function editorGenerate(ctx) {
  const editorJob = queueStore.jobQueue.find(j => j.id === ctx.selectedJobId);
  if (!editorJob) return;

  ctx.editorPinnedIndex = null;
  const providerParams = { ...(ctx.providerParams || editorJob.providerParams || {}) };
  const upsampledPrompt = ctx.promptWithAspectRatio(editorJob.upsampledPrompt, ctx.aspectRatioFromProviderParams(providerParams));
  const result = await queueStore.sendJobRequest({
    raw_prompt: editorJob.rawPrompt,
    provider: editorJob.provider || editorJob.params.endpoint || ctx.selectedEndpoint,
    upsampler: editorJob.upsampler || 'deepseek',
    parent_uuid: editorJob.parentUuid || editorJob.uuid || null,
    magic_prompt: false,
    advanced_mode: false,
    provider_params: providerParams,
    upsampler_params: editorJob.upsamplerParams || { template: editorJob.params.upsampleTemplate || 'v1' },
    upsampled_prompt: upsampledPrompt,
    chat_messages: editorJob.chatMessages || []
  });
  ctx.showToast(`Queued generation for "${editorJob.rawPrompt.substring(0, 30)}..."`, 'success');
  ctx.activeLeftTab = 'progress';
  window.location.hash = '#/job/' + result.job_id;
}


export async function sendEditorChat(ctx, text) {
  const job = await ensureEditableEditorJob(ctx);
  if (!job) return;

  ctx.isRefining = true;
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
    updatedMessages[lastAssistantIdx] = {
      ...updatedMessages[lastAssistantIdx],
      content: job.upsampledPrompt
    };
  }

  queueStore.updateJob(job.id, { chatMessages: [...updatedMessages, { role: "assistant", content: "", streaming: true }] });
  ctx.patchServerJob(job.id, { chatMessages: updatedMessages });

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        messages: updatedMessages,
        chat_provider: ctx.selectedChatProvider
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
    queueStore.updateJob(job.id, {
      upsampledPrompt: assistantReply,
      chatMessages: finalMessages
    });
    ctx.patchServerJob(job.id, {
      upsampledPrompt: assistantReply,
      chatMessages: finalMessages
    });
  } catch (err) {
    console.error("AI refinement failed:", err);
    const finalMessages = [...updatedMessages, { role: "assistant", content: `Error: ${err.message}` }];
    queueStore.updateJob(job.id, { chatMessages: finalMessages });
    ctx.patchServerJob(job.id, { chatMessages: finalMessages });
  } finally {
    ctx.isRefining = false;
    ctx.requestUpdate();
  }
}
