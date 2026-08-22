import { useMemo, useState } from 'react';
import { RectangleHorizontal, Columns2, Play, CircleStop, X, Circle, Plus, ArrowRight, Rows3, Search, Pin, PinOff, CornerDownRight, Minus, Spline, Waypoints, PenTool, Route, ChevronRight, MoreHorizontal, Settings, User, Code2, ListChecks, Send, Inbox, Clock, Mail, CircleDot, FileText, StickyNote, Rows2, Radio, Zap, Asterisk, Hexagon, GitBranch, Database } from 'lucide-react';
import { useBpmnStore } from '../../store/useBpmnStore';

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
// `grid` (2026-08-22, operator-provided reference layout): icon-on-top,
// label-below, replacing the old full-width icon+label row for every
// expanded-palette category except Connectors (which gets its own compact
// row + shared description line, see below). `compact` (the 44px
// icon-only rail) is unaffected — still row-shaped internally since only
// the icon renders there either way.
function Tile({ Icon, label, title, onClick, disabled, dragPayload, compact, grid }) {
  const draggable = !disabled && !!dragPayload;
  return (
    <button
      type="button"
      className={`bpmn-pal-tile${disabled ? ' disabled' : ''}${compact ? ' compact' : ''}${grid ? ' grid' : ''}`}
      title={compact ? `${label} — ${title}` : title}
      disabled={disabled}
      onClick={onClick}
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.dataTransfer.setData('application/bpmn-palette-item', JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = 'move';
      } : undefined}
    >
      <Icon size={grid ? 17 : 15} strokeWidth={2} />
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

// New-connection edge type — same three options, same names, as the
// per-edge "Type:" submenu on the edge right-click menu (BpmnCanvas.jsx).
// This picker sets what a brand-new connection starts as; it never touches
// edges that already exist (that's still the right-click menu's job) — see
// edgesSlice.js's onConnect for the snapshot-at-connect-time semantics.
// Colors match each type's own real on-canvas default stroke (FlowEdge's
// `var(--mid)`, EditableEdge's default Bezier-Catmull-Rom green) so the
// swatch is a genuine preview, not an arbitrary color choice; Routable gets
// the app's own accent blue since routing is this canvas's "smart" option.
const EDGE_TYPES = [
  { value: 'flowEdge', Icon: Waypoints, label: 'Default', hint: 'Standard sequence flow line', color: 'var(--mid)' },
  { value: 'editable-edge', Icon: PenTool, label: 'Editable', hint: 'Drag points to reshape the line', color: '#68D391' },
  { value: 'routable-edge', Icon: Route, label: 'Routable', hint: 'Auto-routes around other nodes', color: 'var(--a3)' },
];

// Task subtypes (2026-08-22, Category A per progress.md's BPMN-
// completeness audit) — these 6 were confirmed already fully wired
// (TaskNode.jsx's icon/tooltip lookup, bpmnModdle.js's generic export
// fallback) before this palette entry existed; exposing them is a
// palette-only addition, same exception category as Sub-Process/Call
// Activity below. Icons match TaskNode.jsx's own TASK_TYPE_ICON exactly
// (not reinvented) so the palette tile previews the same icon the real
// node will render once placed.
const TASK_SUBTYPES = [
  { bpmnType: 'bpmn:UserTask', Icon: User, label: 'User Task', desc: 'performed by a person via a UI' },
  { bpmnType: 'bpmn:ServiceTask', Icon: Settings, label: 'Service Task', desc: 'automated, system-performed' },
  { bpmnType: 'bpmn:ScriptTask', Icon: Code2, label: 'Script Task', desc: 'an automated script runs' },
  { bpmnType: 'bpmn:BusinessRuleTask', Icon: ListChecks, label: 'Business Rule Task', desc: 'a decision/rule engine runs' },
  { bpmnType: 'bpmn:SendTask', Icon: Send, label: 'Send Task', desc: 'sends a message' },
  { bpmnType: 'bpmn:ReceiveTask', Icon: Inbox, label: 'Receive Task', desc: 'waits for a message' },
];

// Placeholder elements (2026-08-22, deferred BPMN-completeness backlog
// from progress.md/CLAUDE.md's audit) — NOT functional. No onClick, no
// dragPayload, disabled — same "intentional preview, not a broken
// control" pattern this section always used. None of these create a
// node and none export — the underlying support (new node types,
// data-shape changes, or a genuinely new interaction pattern like
// boundary-attachment or Pool-lane nesting) doesn't exist yet.
//
// Consolidated 2026-08-22, same day, into the Advanced section only —
// originally split "6 visible in their real category, 6 hidden" per an
// earlier instruction; operator then asked to give the *original*
// (already-functional) tiles precedence in the always-visible area and
// move every placeholder — visible or hidden — under Advanced, grouped
// by real BPMN category rather than one flat list, all icon-only. This
// declutters the top-level palette down to genuinely usable elements
// only; every deferred item still previews here, just consistently in
// one place instead of two.
const ADVANCED_PLACEHOLDER_GROUPS = [
  {
    label: 'Events',
    items: [
      { Icon: Clock, label: 'Timer Event', title: 'Intermediate Timer Event — a time-based wait step (e.g. "after 3 days") — planned, not yet built', disabled: true },
      { Icon: Mail, label: 'Message Event', title: 'Intermediate Message Event — waits for or sends a message mid-process — planned, not yet built', disabled: true },
      { Icon: CircleDot, label: 'Boundary Event', title: 'Boundary Event — attaches to a Task\'s edge for error/exception handling — planned, not yet built (structurally new)', disabled: true },
      { Icon: Radio, label: 'Signal Event', title: 'Intermediate Signal Event — broadcasts/catches a signal across the diagram — planned, not yet built', disabled: true },
      { Icon: Zap, label: 'Error Event', title: 'Intermediate Error Event — catches a thrown error — planned, not yet built', disabled: true },
      { Icon: Asterisk, label: 'Multiple Event', title: 'Multiple/Parallel Multiple Event — triggered by one or all of several conditions — planned, not yet built', disabled: true },
    ],
  },
  {
    label: 'Gateways',
    items: [
      { Icon: Hexagon, label: 'Event-Based Gateway', title: 'Event-Based Gateway — routes based on whichever event happens first — planned, not yet built', disabled: true },
      { Icon: GitBranch, label: 'Complex Gateway', title: 'Complex Gateway — custom branching logic beyond XOR/AND/OR — planned, not yet built', disabled: true },
    ],
  },
  {
    label: 'Data/Artifacts',
    items: [
      { Icon: FileText, label: 'Data Object', title: 'Data Object — represents a document/data item flowing alongside the process — planned, not yet built', disabled: true },
      { Icon: StickyNote, label: 'Text Annotation', title: 'Text Annotation — a free-text note attached to the diagram — planned, not yet built', disabled: true },
      { Icon: Database, label: 'Data Store', title: 'Data Store — represents a persistent data store (e.g. a database) — planned, not yet built', disabled: true },
    ],
  },
  {
    label: 'Containers',
    items: [
      { Icon: Rows2, label: 'Lanes', title: 'Lanes — subdivides a Pool by role (e.g. Vendor / AP Clerk / Approver) — planned, not yet built (structurally new, not a variant of Pool)', disabled: true },
    ],
  },
];

export default function BpmnPalette({ onAddTask, onAddSubProcess, onAddTaskSubtype, onAddStart, onAddEnd, onAddGateway, onAddPool, connectorStyle, onSetConnectorStyle, defaultEdgeType, onSetDefaultEdgeType, routableReady }) {
  // Search and pin state now live in paletteSlice (useBpmnStore), not local
  // useState/props — same direct-store-read pattern this codebase already
  // uses for animateFlow/businessView/connectorStyle, and read here without
  // prop-drilling for the same reason those do.
  // Which edge-type option is currently hovered/focused, for the shared
  // description line below the Connectors row (2026-08-22) — never touches
  // defaultEdgeType itself, purely a display concern, so plain local state
  // is correct here (matches this file's existing precedent: search/pin
  // state moved to the store because other components need to read it;
  // this never leaves BpmnPalette).
  const [hoveredEdgeType, setHoveredEdgeType] = useState(null);
  // Advanced section (2026-08-22, operator request) — a structural scaffold
  // only, collapsed by default. Deliberately local state, not paletteSlice:
  // this is a pure UI expand/collapse, same category as hoveredEdgeType
  // above, not app-wide data other components need to read. No new BPMN
  // element types, node kinds, or export logic are introduced by this —
  // see the full deferred-elements list logged in CLAUDE.md/progress.md.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const search = useBpmnStore(s => s.paletteSearch);
  const setSearch = useBpmnStore(s => s.setPaletteSearch);
  const pinned = useBpmnStore(s => s.palettePinned);
  const togglePalettePinned = useBpmnStore(s => s.togglePalettePinned);
  const expanded = pinned;

  // Category boundary was "Activities stops at Task (generic) + Sub-
  // Process/Call Activity" — extended 2026-08-22 to include the 6
  // TASK_SUBTYPES above, specifically because the BPMN-completeness audit
  // confirmed they're Category A (already fully wired internally, palette-
  // only addition), not because "it's now easier to add palette entries"
  // in general. SQL/VAF/Integration-endpoint-level entries are still
  // Action/script concepts that stay manual in M-Files per Decision 7 —
  // that boundary is untouched; this extension is scoped narrowly to
  // audit-confirmed BPMN task subtypes only.
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
        ...TASK_SUBTYPES.map(({ bpmnType, Icon, label, desc }) => ({
          Icon, label,
          title: `${label} — ${desc} (click to add, or drag onto the canvas)`,
          onClick: () => onAddTaskSubtype(bpmnType, label),
          dragPayload: { kind: 'taskSubtype', bpmnType, label },
        })),
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
  ], [onAddTask, onAddSubProcess, onAddTaskSubtype, onAddStart, onAddEnd, onAddGateway, onAddPool]);

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
    togglePalettePinned();
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
                    // Column count is CSS auto-fit/minmax, not JS-computed
                    // from item count (see .bpmn-pal-tiles-grid) — a 2-item
                    // row naturally shows 2 columns, a 3-item row shows 3
                    // when there's room, matching the reference layout
                    // without a fixed-width guess.
                    <div className="bpmn-pal-tiles-grid">
                      {cat.items.map(item => <Tile key={item.label} {...item} grid />)}
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
                  {cat.label === 'Connectors' && (() => {
                    // Compact 3-icon grid (2026-08-22, matches the reference
                    // layout's density) replacing the old vertical stacked
                    // cards — but the operator was explicit this shouldn't
                    // become hover-only like a tooltip: the description
                    // below is a real, always-rendered line, just showing
                    // whichever option is hovered/focused right now, falling
                    // back to the currently SELECTED option at rest so it's
                    // never blank. Same underlying data/state
                    // (defaultEdgeType, onSetDefaultEdgeType) as before —
                    // this is a display change, not a behavior change.
                    const shown = EDGE_TYPES.find(t => t.value === hoveredEdgeType)
                      || EDGE_TYPES.find(t => t.value === defaultEdgeType)
                      || EDGE_TYPES[0];
                    return (
                      <>
                        <span className="bpmn-pal-group-lbl bpmn-pal-edge-type-heading">New connection type</span>
                        <div className="bpmn-pal-edge-type-grid" role="radiogroup" aria-label="Default type for new connections">
                          {EDGE_TYPES.map(({ value, Icon, label, hint, color }) => {
                            const isRoutable = value === 'routable-edge';
                            const disabled = isRoutable && !routableReady;
                            const active = defaultEdgeType === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`bpmn-pal-edge-type-option${active ? ' active' : ''}`}
                                style={{ '--edge-type-color': color }}
                                disabled={disabled}
                                onClick={() => onSetDefaultEdgeType(value)}
                                onMouseEnter={() => setHoveredEdgeType(value)}
                                onMouseLeave={() => setHoveredEdgeType(null)}
                                onFocus={() => setHoveredEdgeType(value)}
                                onBlur={() => setHoveredEdgeType(null)}
                                title={disabled ? 'Loading libavoid routing engine…' : hint}
                              >
                                <Icon size={17} strokeWidth={2} />
                                <span className="bpmn-pal-tile-label">
                                  {label}
                                  {disabled && <span className="bpmn-pal-edge-type-loading">…</span>}
                                </span>
                                <span className="bpmn-pal-edge-type-check" aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                        <div className="bpmn-pal-edge-type-desc">{shown.hint}</div>
                        <div className="bpmn-pal-edge-type-note">
                          <Route size={11} strokeWidth={2} />
                          <span>Sets what new connections start as — right-click any existing edge to change its type.</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))}
              {filtered.length === 0 && <div className="bpmn-pal-empty">No matching elements</div>}
              {/* Advanced section (2026-08-22, structural scaffold; content
                  updated same day) — collapsed by default. Now shows the 6
                  PLACEHOLDER_ADVANCED items (the more niche/complex half of
                  the deferred backlog — Signal/Error/Multiple Events,
                  Event-Based/Complex Gateways, Data Store), icon-only
                  ("small icon only" per operator instruction) rather than
                  the single generic "more coming" tile this section
                  originally shipped with. Every tile is disabled, no
                  onClick/dragPayload — clearly non-functional previews, not
                  stubs of working features. The caption line makes that
                  explicit in words too, not just via the dimmed styling. */}
              <div className="bpmn-pal-group">
                <button
                  type="button"
                  className="bpmn-pal-advanced-toggle"
                  onClick={() => setAdvancedOpen(v => !v)}
                  aria-expanded={advancedOpen}
                >
                  <ChevronRight size={11} className={`bpmn-pal-advanced-chevron${advancedOpen ? ' open' : ''}`} />
                  <span className="bpmn-pal-group-lbl">Advanced</span>
                </button>
                {advancedOpen && (
                  <>
                    <div className="bpmn-pal-advanced-caption">More BPMN element types — planned, not yet built</div>
                    {ADVANCED_PLACEHOLDER_GROUPS.map(group => (
                      <div className="bpmn-pal-advanced-subgroup" key={group.label}>
                        <span className="bpmn-pal-advanced-subgroup-lbl">{group.label}</span>
                        <div className="bpmn-pal-tiles-compact-grid">
                          {group.items.map(item => <Tile key={item.label} {...item} compact />)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
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
            {/* Advanced show/hide, collapsed-rail version (2026-08-22) —
                same shared advancedOpen state as the expanded panel's own
                Advanced toggle, so expanding it in one view carries over
                to the other rather than tracking two independent states
                for what's conceptually one section. Icon-only, matching
                every other rail tile — no label text fits at 44px. */}
            <div className="bpmn-pal-rail-group">
              <div className="bpmn-pal-rail-divider" />
              <button
                type="button"
                className={`bpmn-pal-nudge${advancedOpen ? ' active' : ''}`}
                onClick={() => setAdvancedOpen(v => !v)}
                title={advancedOpen ? 'Hide advanced (more BPMN element types — planned, not yet built)' : 'Show advanced (more BPMN element types — planned, not yet built)'}
              >
                <ChevronRight size={12} className={`bpmn-pal-advanced-chevron${advancedOpen ? ' open' : ''}`} />
              </button>
              {advancedOpen && (
                <Tile
                  Icon={MoreHorizontal}
                  label="More elements coming soon"
                  title="Additional BPMN element types (Intermediate/Boundary Events, Service/User/Script Tasks, Event-Based/Complex Gateways, Data Objects, Lanes, and more) — planned, not yet built"
                  disabled
                  compact
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
