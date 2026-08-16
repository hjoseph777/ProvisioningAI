import { useMemo, useState } from 'react';
import { RectangleHorizontal, Columns2, Play, CircleStop, X, Circle, Plus, ArrowRight, Rows3, Search, Pin, PinOff, CornerDownRight, Minus, Spline } from 'lucide-react';

// Left-side palette. Structurally unchanged since Phase B (still docked left,
// categorized, searchable) — one review suggested replacing it with a
// floating toolbar entirely; that was explicitly rejected. What changed here
// is the interaction: click-to-toggle is replaced by hover-to-expand (a 44px
// icon-only rail that overlays a 240px panel on hover), with an explicit pin
// for users who want it permanently open — the old click-toggle behavior,
// repurposed rather than removed.
//
// dragPayload identifies what to create — read back in BpmnCanvas.jsx's onDrop
// via the same 'application/bpmn-palette-item' key, adapted from
// React_Flow_Pro/shapes-pro-example's own sidebar-item.tsx/App.tsx drag-drop
// pattern (setData on dragstart, screenToFlowPosition + setNodes on drop).
// Click-to-add still works unchanged — drag is an addition, not a replacement.
function Tile({ Icon, label, title, onClick, disabled, dragPayload, compact }) {
  const draggable = !disabled && !!dragPayload;
  return (
    <button
      type="button"
      className={`bpmn-pal-tile${disabled ? ' disabled' : ''}${compact ? ' compact' : ''}`}
      title={compact ? `${label} — ${title}` : title}
      disabled={disabled}
      onClick={onClick}
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.dataTransfer.setData('application/bpmn-palette-item', JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = 'move';
      } : undefined}
    >
      <Icon size={15} strokeWidth={2} />
      {!compact && <span className="bpmn-pal-tile-label">{label}</span>}
    </button>
  );
}

// Only present when expanded — no room for a 3-way segmented control in the
// 44px rail (same reasoning as search not showing there). Wired directly to
// React Flow's own native path-generator functions inside FlowEdge.jsx
// (getSmoothStepPath/getStraightPath/getBezierPath) — this control just picks
// which one, no custom routing math. Whole-canvas, not per-edge: a per-edge
// choice would need its own UI surface (a toolbar on edge-select, which
// doesn't exist) for a case that's mostly a one-time diagram-wide style call.
const CONNECTOR_STYLES = [
  { value: 'orthogonal', Icon: CornerDownRight, label: 'Orthogonal', title: 'Orthogonal — right-angle routing (default)' },
  { value: 'straight', Icon: Minus, label: 'Straight', title: 'Straight — direct line' },
  { value: 'curved', Icon: Spline, label: 'Curved', title: 'Curved — smooth bezier curve' },
];

export default function BpmnPalette({ onAddTask, onAddSubProcess, onAddStart, onAddEnd, onAddGateway, onAddPool, pinned, onTogglePinned, connectorStyle, onSetConnectorStyle }) {
  const [search, setSearch] = useState('');
  const expanded = pinned;

  // Category boundary is deliberate, not incidental — Activities stops at
  // "Task" (generic). SQL/VAF/Integration-endpoint-level entries are
  // Action/script concepts that stay manual in M-Files per Decision 7;
  // this palette must not quietly reopen that line just because it's now
  // easier to add palette entries.
  const categories = useMemo(() => [
    {
      label: 'Events',
      items: [
        { Icon: Play, label: 'Start', title: 'Start event — where the process begins (click to add, or drag onto the canvas)', onClick: () => onAddStart(), dragPayload: { kind: 'start' } },
        { Icon: CircleStop, label: 'End', title: 'End event — where the process ends (click to add, or drag onto the canvas)', onClick: () => onAddEnd(), dragPayload: { kind: 'end' } },
      ],
    },
    {
      label: 'Activities',
      items: [
        { Icon: RectangleHorizontal, label: 'Task', title: 'Task — a unit of work in the process (click to add, or drag onto the canvas)', onClick: () => onAddTask(), dragPayload: { kind: 'task' } },
        { Icon: Columns2, label: 'Sub-Process', title: 'Sub-Process (Call Activity) — a reference to a separate, predefined process (click to add, or drag onto the canvas)', onClick: () => onAddSubProcess(), dragPayload: { kind: 'subprocess' } },
      ],
    },
    {
      label: 'Gateways',
      items: [
        { Icon: X, label: 'Exclusive', title: 'Exclusive gateway (XOR) — exactly one branch taken (click to add, or drag onto the canvas)', onClick: () => onAddGateway('exclusive'), dragPayload: { kind: 'gateway', gatewayType: 'exclusive' } },
        { Icon: Circle, label: 'Inclusive', title: 'Inclusive gateway (OR) — one or more branches taken, by condition (click to add, or drag onto the canvas)', onClick: () => onAddGateway('inclusive'), dragPayload: { kind: 'gateway', gatewayType: 'inclusive' } },
        { Icon: Plus, label: 'Parallel', title: 'Parallel gateway (AND) — every branch taken (click to add, or drag onto the canvas)', onClick: () => onAddGateway('parallel'), dragPayload: { kind: 'gateway', gatewayType: 'parallel' } },
      ],
    },
    {
      // No click-to-place item here — an edge needs two real endpoints, so
      // there's nothing to add with a single click. This used to be a
      // disabled Tile styled exactly like every clickable one, which read as
      // a broken button rather than what it actually was (a note). Rendered
      // as plain info text below instead — see the `cat.label === 'Connectors'`
      // branch in the render section.
      label: 'Connectors',
      items: [],
    },
    {
      // Was "Soon" (deferred, dimmed) — Pool was its only item and Stage 1
      // (React Flow Pro enhancements) built it, so the category is real now,
      // not a placeholder. A single container per pool this stage (checked
      // against parent-child-relation-pro-example directly — no multi-lane
      // divider concept exists there to build against).
      label: 'Containers',
      items: [
        { Icon: Rows3, label: 'Pool', title: 'Pool — a container; drag other elements into it to make them its children (click to add, or drag onto the canvas)', onClick: () => onAddPool(), dragPayload: { kind: 'pool' } },
      ],
    },
  ], [onAddTask, onAddSubProcess, onAddStart, onAddEnd, onAddGateway, onAddPool]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? categories
        // A category-name match (e.g. "gate") surfaces every item in it —
        // otherwise typing the exact word shown in the group header ("Gateways")
        // returns nothing, since none of "Exclusive"/"Inclusive"/"Parallel"
        // contain that substring themselves.
        .map(cat => ({ ...cat, items: cat.label.toLowerCase().includes(q) ? cat.items : cat.items.filter(i => i.label.toLowerCase().includes(q)) }))
        // Connectors has no items by design (see above) — its info text is
        // still worth surfacing on a "connectors"/"sequence"/"flow" search.
        .filter(cat => cat.items.length > 0 || (cat.label === 'Connectors' && (cat.label.toLowerCase().includes(q) || 'sequence flow'.includes(q))))
    : categories;

  const toggleExpanded = () => {
    onTogglePinned();
    if (pinned) setSearch('');
  };

  return (
    <div
      className={`bpmn-pal-shell${pinned ? ' pinned' : ''}`}
    >
      <div className={`bpmn-pal-panel${expanded ? ' expanded' : ''}`}>
        {expanded ? (
          <>
            <div className="bpmn-pal-sidebar-head">
              <div className="bpmn-pal-search-wrap">
                <Search size={12} className="bpmn-pal-search-icon" />
                <input
                  className="bpmn-pal-search"
                  type="text"
                  placeholder="Search elements…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`bpmn-pal-toggle${pinned ? ' active' : ''}`}
                onClick={toggleExpanded}
                title={pinned ? 'Collapse palette' : 'Expand palette'}
              >
                {pinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
            </div>
            <div className="bpmn-pal-sidebar-body">
              {filtered.map(cat => (
                <div className="bpmn-pal-group" key={cat.label}>
                  <span className="bpmn-pal-group-lbl">{cat.label}</span>
                  {cat.label === 'Connectors' ? (
                    // Was a permanently-disabled Tile styled exactly like the
                    // clickable ones above it — read as a broken button, not
                    // a note. An edge needs two real endpoints, so there was
                    // never anything to click-to-place here; this explains
                    // both real ways to actually draw one (including the
                    // magic connector, previously mentioned only in a
                    // tooltip on the very tile a first click couldn't act on).
                    <div className="bpmn-pal-info">
                      <ArrowRight size={13} strokeWidth={2} />
                      <span>Drag from a node's own connector dot to another node. Drop on empty canvas instead and it creates a connected task for you automatically.</span>
                    </div>
                  ) : (
                    <div className="bpmn-pal-tiles">
                      {cat.items.map(item => <Tile key={item.label} {...item} />)}
                    </div>
                  )}
                  {cat.label === 'Connectors' && (
                    <div className="bpmn-pal-segmented" role="group" aria-label="Connector routing style">
                      {CONNECTOR_STYLES.map(({ value, Icon, title }) => (
                        <button
                          key={value}
                          type="button"
                          className={connectorStyle === value ? 'active' : ''}
                          onClick={() => onSetConnectorStyle(value)}
                          title={title}
                        >
                          <Icon size={13} strokeWidth={2} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && <div className="bpmn-pal-empty">No matching elements</div>}
            </div>
          </>
        ) : (
          <div className="bpmn-pal-rail">
            <button
              type="button"
              className="bpmn-pal-nudge"
              onClick={toggleExpanded}
              title="Expand palette"
            >
              »
            </button>
            {categories.filter(cat => cat.items.length > 0).map((cat, i) => (
              <div className="bpmn-pal-rail-group" key={cat.label}>
                {i > 0 && <div className="bpmn-pal-rail-divider" />}
                {cat.items.map(item => <Tile key={item.label} {...item} compact />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
