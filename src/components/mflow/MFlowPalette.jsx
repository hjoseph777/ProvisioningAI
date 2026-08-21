import { useMemo, useState } from 'react';
import { RectangleHorizontal, Play, CircleStop, Pin, PinOff, StickyNote, Diamond, GitMerge, Search, ArrowRight } from 'lucide-react';

// Left-side palette for M-Files Flow — shell pattern (collapsible icon rail,
// pin-to-expand, search, categorized sections) adopted from BpmnPalette.jsx
// per direct instruction, with one correction made after actually reading
// that component rather than trusting its own header comment: the comment
// there claims "hover-to-expand," but the real code is `expanded = pinned`,
// no hover state anywhere — a plain click-to-pin toggle. This file already
// used that exact mechanism before this task touched it, so there was
// nothing to port for the expand behavior itself; the real gap closed here
// is search + multi-category grouping + rail dividers.
//
// Content stays exactly what a Mermaid stateDiagram actually has — still no
// Gateway/Diamond/Hub category and still no tile that places a diamond/hub
// SHAPE directly. The one addition since that rule was written is the
// Shortcuts category's "Decision" tile below: it creates three ordinary
// states and two ordinary transitions via the exact same addState/
// addTransition calls the State tile already uses, one click instead of
// five. The diamond that then appears is still the pre-existing 2+-outgoing
// auto-detect firing on real data — no new rendering path, no directly
// placeable diamond object. Diamond/hub badges themselves stay exactly what
// they already were: auto-detected, read-only icons inside the Layers list
// below, never a button, never draggable.
//
// Layers and Style are deliberately NOT part of the searchable/categorized
// tile machinery, and deliberately always visible regardless of the search
// box's contents — they aren't tools to place, they're a live view of what
// already exists (Layers) and an editor for whatever's currently selected
// (Style). Hiding either because someone typed a search string meant to
// find a different tile would hide the one place showing real, current
// data at exactly the moment someone's using the palette.
// cornerMark is purely cosmetic — a small static badge at the icon's OTHER
// corner from the color dot, no click handler, no state of its own. Used
// only on the State tile, as a visual hint that this is the same object
// type that turns into a diamond automatically (Decision 5) once it has 2+
// outgoing transitions — it does not make the tile place a diamond, or
// anything different from a plain state; onClick below is still onAddState,
// unchanged. Keeping this cosmetic-only distinction explicit since the hard
// exclusion at the top of this file (no placeable diamond) still applies.
function IconWithDot({ Icon, size, color, onSetColor, title, cornerMark: CornerMark }) {
  return (
    <span className="mflow-icon-badge">
      <Icon size={size} strokeWidth={2}/>
      {CornerMark && <CornerMark size={8} strokeWidth={2.5} className="mflow-icon-badge-corner"/>}
      <input type="color" className="mflow-icon-badge-dot" value={color}
        title={title} onChange={e => onSetColor(e.target.value)}
        onClick={e => e.stopPropagation()}/>
    </span>
  );
}

// Plain icon+label tile — Initial State/End State only. State/Status use
// their own IconWithDot-based markup directly (see the render section)
// since they carry a color-dot badge this generic shape doesn't need to
// know about.
function Tile({ Icon, label, title, size, onClick, compact }) {
  return (
    <button type="button" className={`mflow-pal-tile${compact ? ' compact' : ''}`}
      title={compact ? `${label} — ${title}` : title} onClick={onClick}>
      <Icon size={size} strokeWidth={2}/>
      {!compact && <span className="mflow-pal-tile-label">{label}</span>}
    </button>
  );
}

export default function MFlowPalette({
  onAddState, onAddInitialState, onAddEndState, onAddComment, onAddDecision,
  pinned, onTogglePinned,
  selectedState, onSetStateColor,
  stateColor, onSetStateDefaultColor,
  commentColor, onSetCommentColor,
  states = [], selectedNames = new Set(), onSelectState,
}) {
  const [search, setSearch] = useState('');
  const expanded = pinned;

  // 'state'/'status' items are rendered specially (IconWithDot) below —
  // this array exists so search can filter across every category uniformly,
  // the same structural role BPMN's `categories` plays there.
  const categories = useMemo(() => [
    {
      label: 'Annotations',
      items: [
        { key: 'status', label: 'Status', title: 'Status — a colored comment box, not part of the workflow itself' },
      ],
    },
    {
      // No click-to-place item — same reasoning as BPMN's own Connectors
      // category: a transition needs two real endpoints, so there's
      // nothing to add with a single click. Info text describes THIS
      // canvas's real mechanism, not BPMN's — adapted, not copied: this
      // one only ever creates a transition on drop, it never auto-creates
      // a new state the way BPMN's does for an empty-canvas drop.
      label: 'Connectors',
      items: [],
    },
    {
      label: 'Shortcuts',
      items: [
        { key: 'decision', label: 'Decision', Icon: Diamond, size: 12,
          title: 'Decision — adds one state and two outcome states, pre-wired with two transitions. The diamond is the existing 2+-outgoing auto-detect firing on real data, not a new shape.' },
      ],
    },
    {
      // States deliberately LAST — Initial/State/End ordered so End State
      // is the final tile in the whole palette (Layers/Style below this
      // point are the always-visible, non-tile sections, not part of this
      // ordering).
      label: 'States',
      items: [
        { key: 'initial', label: 'Initial State', title: 'Initial State — where the workflow begins', Icon: Play, size: 12 },
        { key: 'state', label: 'State', title: 'State — a step in the workflow' },
        { key: 'end', label: 'End State', title: 'End State — where the workflow terminates', Icon: CircleStop, size: 13 },
      ],
    },
  ], []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? categories
        .map(cat => ({ ...cat, items: cat.label.toLowerCase().includes(q) ? cat.items : cat.items.filter(i => i.label.toLowerCase().includes(q)) }))
        .filter(cat => cat.items.length > 0 || (cat.label === 'Connectors' && (cat.label.toLowerCase().includes(q) || 'drag connect transition edge'.includes(q))))
    : categories;

  const toggleExpanded = () => {
    onTogglePinned();
    if (pinned) setSearch('');
  };

  return (
    <div className={`mflow-pal-shell${pinned ? ' pinned' : ''}`}>
      <div className={`mflow-pal-panel${expanded ? ' expanded' : ''}`}>
        {expanded ? (
          <>
            <div className="mflow-pal-head">
              <div className="mflow-pal-search-wrap">
                <Search size={12} className="mflow-pal-search-icon"/>
                <input className="mflow-pal-search" type="text" placeholder="Search elements…"
                  value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              <button type="button" className={`mflow-pal-toggle${pinned ? ' active' : ''}`}
                onClick={toggleExpanded} title={pinned ? 'Collapse palette' : 'Expand palette'}>
                {pinned ? <PinOff size={12}/> : <Pin size={12}/>}
              </button>
            </div>
            <div className="mflow-pal-body">
              {filtered.map(cat => (
                <div className="mflow-pal-group" key={cat.label}>
                  <span className="mflow-pal-group-lbl">{cat.label}</span>
                  {cat.label === 'Connectors' ? (
                    <div className="mflow-pal-info">
                      <ArrowRight size={13} strokeWidth={2}/>
                      <span>Hover a state to reveal its connector dot, then drag to another state to create a transition. Drop on empty canvas, or back on the same state, and it cancels — nothing is created.</span>
                    </div>
                  ) : (
                    <div className="mflow-pal-tiles">
                      {cat.items.map(item => (
                        item.key === 'state' ? (
                          <div className="mflow-pal-tile mflow-pal-tile-with-dot" key={item.key}>
                            <button type="button" className="mflow-pal-tile-inner" onClick={onAddState} title={item.title}>
                              <IconWithDot Icon={RectangleHorizontal} size={13} color={stateColor} onSetColor={onSetStateDefaultColor}
                                title="Main color for new states" cornerMark={Diamond}/>
                              <span className="mflow-pal-tile-label">{item.label}</span>
                            </button>
                          </div>
                        ) : item.key === 'status' ? (
                          <div className="mflow-pal-tile mflow-pal-tile-with-dot" key={item.key}>
                            <button type="button" className="mflow-pal-tile-inner" onClick={onAddComment} title={item.title}>
                              <IconWithDot Icon={StickyNote} size={13} color={commentColor} onSetColor={onSetCommentColor}
                                title="Color for the next Status box you add"/>
                              <span className="mflow-pal-tile-label">{item.label}</span>
                            </button>
                          </div>
                        ) : (
                          <Tile key={item.key} Icon={item.Icon} label={item.label} title={item.title} size={item.size}
                            onClick={item.key === 'initial' ? onAddInitialState : item.key === 'decision' ? onAddDecision : onAddEndState}/>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && <div className="mflow-pal-empty">No matching elements</div>}

              {states.length > 0 && (
                <div className="mflow-pal-group">
                  <span className="mflow-pal-group-lbl">Layers</span>
                  <div className="mflow-pal-layers">
                    {states.map(s => (
                      <button type="button" key={s.id}
                        className={`mflow-pal-layer-row${selectedNames.has(s.name) ? ' sel' : ''}`}
                        onClick={() => s.name && onSelectState?.(s.name)}
                        title={s.name || '(unnamed state)'}>
                        <span className="mflow-pal-layer-dot" style={{ background: s.color || 'var(--mid)' }}/>
                        <span className="mflow-pal-layer-name">{s.name || <em>(unnamed)</em>}</span>
                        {s.initial && <span className="mflow-pal-layer-flag" title="Initial state">●</span>}
                        {s.isDiamond && <Diamond size={10} className="mflow-pal-layer-diamond" title={s.diamondTitle}/>}
                        {s.isHub && <GitMerge size={10} className="mflow-pal-layer-hub" title={s.hubTitle}/>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mflow-pal-group">
                <span className="mflow-pal-group-lbl">Style</span>
                {selectedState ? (
                  <div className="mflow-pal-style-row" title={`Background color for "${selectedState.name}"`}>
                    <input type="color" value={selectedState.color || '#3A7FD5'}
                      onChange={e => onSetStateColor(selectedState.id, e.target.value)}/>
                    <span>Background — {selectedState.name}</span>
                    {selectedState.color && (
                      <button type="button" className="style-clear" onClick={() => onSetStateColor(selectedState.id, null)}>clear</button>
                    )}
                  </div>
                ) : (
                  <div className="mflow-pal-style-empty">Select a state to set its background color</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mflow-pal-rail">
            <button type="button" className="mflow-pal-nudge" onClick={toggleExpanded} title="Expand palette">»</button>
            {categories.filter(cat => cat.items.length > 0).map((cat, i) => (
              <div className="mflow-pal-rail-group" key={cat.label}>
                {i > 0 && <div className="mflow-pal-rail-divider"/>}
                {cat.items.map(item => (
                  item.key === 'state'
                    ? <button type="button" key={item.key} className="mflow-pal-tile compact" onClick={onAddState} title={item.label}><RectangleHorizontal size={13} strokeWidth={2}/></button>
                    : item.key === 'status'
                    ? <button type="button" key={item.key} className="mflow-pal-tile compact" onClick={onAddComment} title={item.label}><StickyNote size={13} strokeWidth={2}/></button>
                    : <Tile key={item.key} Icon={item.Icon} label={item.label} title={item.title} size={item.size} compact
                        onClick={item.key === 'initial' ? onAddInitialState : item.key === 'decision' ? onAddDecision : onAddEndState}/>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
