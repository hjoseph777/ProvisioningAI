// Shared id generator — used by every feature slice that creates nodes/edges.
// Extracted out of useBpmnStore.js (which still re-exports it, so existing
// `import { useBpmnStore, makeId } from '../store/useBpmnStore'` call sites
// keep working unchanged) so feature slices can import it directly without a
// circular dependency back on the store module itself.
export const makeId = () => Math.random().toString(36).slice(2, 9);
