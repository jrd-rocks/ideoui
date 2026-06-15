// Pure selectors & derivation functions for the unified AppStore.
// No side effects, no DOM access — fully testable in isolation.

/**
 * Normalize a backend job object (mixed snake_case/camelCase) into the
 * canonical camelCase item shape used by the store. Mirrors the old
 * QueueStore.normalizeJob but lives in one place.
 */
export function normalizeItem(raw) {
  if (!raw) return null;
  const id = raw.id || raw.job_id;
  if (!id) return null;
  return {
    ...raw,
    id,
    parentUuid: raw.parentUuid ?? raw.parent_uuid ?? null,
    editorChainHeadUuid: raw.editorChainHeadUuid ?? raw.editor_chain_head_uuid ?? raw.parentUuid ?? raw.parent_uuid ?? null,
    rawPrompt: raw.rawPrompt ?? raw.raw_prompt ?? '',
    upsampledPrompt: raw.upsampledPrompt ?? raw.upsampled_prompt ?? null,
    displayText: raw.displayText ?? raw.display_text ?? '',
    chatMessages: raw.chatMessages ?? raw.chat_messages ?? [],
    providerParams: raw.providerParams ?? raw.provider_params ?? {},
    upsamplerParams: raw.upsamplerParams ?? raw.upsampler_params ?? {},
    draftJson: raw.draftJson ?? raw.draft_json ?? null,
    previewsUrl: raw.previewsUrl ?? raw.previews_url ?? null,
    images: raw.images ?? null,
    params: raw.params || {},
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? raw.updatedAt ?? raw.updated_at ?? null,
    llmStream: raw.llmStream ?? null,
  };
}

/**
 * Find the active progress item by id.
 */
export function selectActiveItem(state) {
  const id = state.selection?.activeItemId;
  if (!id) return null;
  return (state.items || []).find((item) => item.id === id) || null;
}

/**
 * Resolve default generation provider id from loaded schemas.
 */
export function selectDefaultProviderId(state) {
  const schemas = state.providers?.schemas || {};
  const def = Object.entries(schemas).find(([, s]) => s.type === 'generation' && s.default);
  if (def) return def[0];
  const first = Object.entries(schemas).find(([, s]) => s.type === 'generation');
  return first?.[0] || '';
}

/**
 * Resolve default upsampler id from loaded schemas.
 */
export function selectDefaultUpsamplerId(state) {
  const schemas = state.providers?.schemas || {};
  const def = Object.entries(schemas).find(([, s]) => s.type === 'upsampler' && s.default);
  if (def) return def[0];
  const first = Object.entries(schemas).find(([, s]) => s.type === 'upsampler');
  return first?.[0] || '';
}

/**
 * Snapshot of the generator slice used to render the control panel.
 */
export function selectGeneratorSnapshot(state) {
  return state.generator || {};
}

const ACTIVE_LOADING_STATUSES = new Set(['pending', 'upsampling', 'upsampled', 'generating']);

/**
 * Derive panel layout purely from {activeItemId, item.status, inspector, panels}.
 * This replaces _preserveNextHomeRoute / dual hash writers (bug #2).
 *
 * Returns { leftTab, centerView, showEditorSidebar, activeItemId }.
 */
export function deriveLayout(state) {
  const selection = state.selection || {};
  const panels = state.panels || {};
  const hasInspector = Boolean(selection.inspectorHistoryUuid);
  const item = selectActiveItem(state);

  const result = {
    leftTab: 'generator',
    centerView: 'idle',
    showEditorSidebar: false,
    activeItemId: selection.activeItemId || '',
  };

  if (hasInspector && !item) {
    result.centerView = 'inspector';
    result.showEditorSidebar = true;
    result.leftTab = 'generator';
    return result;
  }

  if (!item) {
    result.leftTab = panels.userLeftTab || 'generator';
    result.centerView = 'idle';
    return result;
  }

  switch (item.status) {
    case 'editing':
      result.leftTab = 'generator';
      result.centerView = 'editor';
      result.showEditorSidebar = true;
      break;
    case 'completed':
      result.leftTab = 'progress';
      result.centerView = 'images';
      break;
    case 'held':
      result.leftTab = 'progress';
      result.centerView = 'held';
      break;
    case 'failed':
      result.leftTab = 'progress';
      result.centerView = 'failed';
      break;
    default:
      if (ACTIVE_LOADING_STATUSES.has(item.status)) {
        result.leftTab = 'progress';
        result.centerView = 'loading';
      } else {
        result.leftTab = 'progress';
        result.centerView = 'idle';
      }
  }

  // Honor an explicit user override of the left tab (e.g. switch to Generator
  // to tweak settings, or to Progress to watch the queue while editing).
  // Switching items clears the override upstream so the default re-derives.
  if (panels.userLeftTab) {
    result.leftTab = panels.userLeftTab;
  }

  // Inspector takes precedence over the active item's center view.
  if (hasInspector) {
    result.centerView = 'inspector';
    result.showEditorSidebar = true;
  }

  return result;
}

/**
 * Build a stable, correctly-nested tree of progress items (bug #4).
 *
 * - Sort by createdAt asc for stable order.
 * - Resolve parent by uuid linkage (id & uuid alias the same node).
 * - Editor sessions own the generation chain reachable from their
 *   editorChainHeadUuid; those items are detached from the generic forest and
 *   rendered as the editor's (collapsed) children.
 *
 * Returns an array of root nodes: { item, children: [...], depth }.
 */
export function buildItemTree(items) {
  const list = (items || []).slice().sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return (ta || 0) - (tb || 0);
  });

  const byUuid = new Map();
  const byId = new Map();
  for (const item of list) {
    byId.set(item.id, item);
    if (item.uuid) byUuid.set(item.uuid, item);
  }

  // Determine which items are "owned" by an editor session (its generation chain).
  const ownedByEditor = new Set();
  const editorChildren = new Map(); // editorId -> [items] (newest first)
  for (const editor of list) {
    if (editor.status !== 'editing') continue;
    const chain = [];
    let cursor = editor.editorChainHeadUuid ? byUuid.get(editor.editorChainHeadUuid) : null;
    let guard = 0;
    while (cursor && guard < 1000) {
      guard += 1;
      if (ownedByEditor.has(cursor.id)) break;
      ownedByEditor.add(cursor.id);
      chain.unshift(cursor); // oldest first → natural chain order
      const parentItem = cursor.parentUuid ? byUuid.get(cursor.parentUuid) : null;
      cursor = parentItem && parentItem.id !== cursor.id ? parentItem : null;
    }
    if (chain.length) editorChildren.set(editor.id, chain);
  }

  // Generic forest by parentUuid -> parent.uuid (excluding editor-owned items).
  const childrenMap = new Map(); // itemId -> [items]
  const roots = [];
  for (const item of list) {
    if (ownedByEditor.has(item.id)) continue;
    const parent = item.parentUuid ? byUuid.get(item.parentUuid) : null;
    if (parent && parent.id !== item.id) {
      if (!childrenMap.has(parent.id)) childrenMap.set(parent.id, []);
      childrenMap.get(parent.id).push(item);
    } else {
      roots.push(item);
    }
  }

  const buildNode = (item, depth) => {
    const kids = childrenMap.get(item.id) || [];
    return {
      item,
      depth,
      children: kids.map((kid) => buildNode(kid, depth + 1)),
    };
  };

  const nodes = roots.map((item) => buildNode(item, 0));
  // Editor nodes: attach their owned chain as children (collapsed by the renderer).
  for (const node of nodes) {
    if (node.item.status === 'editing' && editorChildren.has(node.item.id)) {
      const chain = editorChildren.get(node.item.id);
      node.children = chain.map((kid, i) => buildNode(kid, node.depth + 1 + i * 0));
    }
  }
  return nodes;
}
