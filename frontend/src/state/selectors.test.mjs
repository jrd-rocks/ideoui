// Node-runnable assertions for the pure selectors (deriveLayout, buildItemTree).
// Run with: node src/state/selectors.test.mjs
import { deriveLayout, buildItemTree, selectActiveItem, normalizeItem } from './selectors.js';

let failures = 0;
function assert(name, cond) {
  if (cond) {
    console.log(`  ok  - ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL- ${name}`);
  }
}

console.log('deriveLayout:');
assert('no active item -> generator/idle', deriveLayout({ selection: {}, items: [] }).leftTab === 'generator');
assert('pending -> progress/loading', deriveLayout({ selection: { activeItemId: 'a' }, items: [{ id: 'a', status: 'pending' }] }).centerView === 'loading');
assert('generating -> progress/loading', deriveLayout({ selection: { activeItemId: 'a' }, items: [{ id: 'a', status: 'generating' }] }).leftTab === 'progress');
assert('editing -> generator/editor + sidebar', (() => {
  const l = deriveLayout({ selection: { activeItemId: 'a' }, items: [{ id: 'a', status: 'editing' }] });
  return l.leftTab === 'generator' && l.centerView === 'editor' && l.showEditorSidebar;
})());
assert('completed -> progress/images', deriveLayout({ selection: { activeItemId: 'a' }, items: [{ id: 'a', status: 'completed' }] }).centerView === 'images');
assert('held -> progress/held', deriveLayout({ selection: { activeItemId: 'a' }, items: [{ id: 'a', status: 'held' }] }).centerView === 'held');
assert('failed -> progress/failed', deriveLayout({ selection: { activeItemId: 'a' }, items: [{ id: 'a', status: 'failed' }] }).centerView === 'failed');
assert('inspector without active -> inspector + sidebar', (() => {
  const l = deriveLayout({ selection: { inspectorHistoryUuid: 'h1' }, items: [] });
  return l.centerView === 'inspector' && l.showEditorSidebar;
})());
assert('userLeftTab override honored for completed item', deriveLayout({ selection: { activeItemId: 'a' }, panels: { userLeftTab: 'generator' }, items: [{ id: 'a', status: 'completed' }] }).leftTab === 'generator');
assert('userLeftTab override honored while editing (Progress reachable)', deriveLayout({ selection: { activeItemId: 'a' }, panels: { userLeftTab: 'progress' }, items: [{ id: 'a', status: 'editing' }] }).leftTab === 'progress');
assert('editing defaults to generator when no override', deriveLayout({ selection: { activeItemId: 'a' }, panels: {}, items: [{ id: 'a', status: 'editing' }] }).leftTab === 'generator');

console.log('buildItemTree:');
const items = [
  normalizeItem({ id: 'g2', uuid: 'u2', parentUuid: 'u1', status: 'completed', createdAt: '2026-06-01T00:00:03' }),
  normalizeItem({ id: 'g1', uuid: 'u1', parentUuid: 'hist', status: 'completed', createdAt: '2026-06-01T00:00:02' }),
  normalizeItem({ id: 'ed', uuid: 'ue', status: 'editing', editorChainHeadUuid: 'u2', createdAt: '2026-06-01T00:00:01' }),
];
const tree = buildItemTree(items);
assert('editor + chain yields a single root (the editor)', tree.length === 1 && tree[0].item.id === 'ed');
assert('editor owns its generated chain as children', tree[0].children.length === 2);
assert('chain is ordered oldest-first under editor', tree[0].children[0].item.id === 'g1' && tree[0].children[1].item.id === 'g2');

console.log('normalizeItem:');
assert('camelCases snake_case fields', normalizeItem({ job_id: 'j', raw_prompt: 'p' }).rawPrompt === 'p');
assert('editorChainHeadUuid falls back to parentUuid', normalizeItem({ id: 'j', parent_uuid: 'x' }).editorChainHeadUuid === 'x');

if (failures) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
} else {
  console.log('\nAll selector assertions passed.');
}
