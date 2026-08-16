import { Plus, Play, CircleStop, Pin, PinOff, StickyNote, Diamond } from 'lucide-react';

// Left-side palette for M-Files Flow — same hover-expand shell pattern as
// BpmnPalette.jsx (44px icon rail, pin to hold it open at 240px), reused
// deliberately since the user pointed at BPMN's expanded palette view and
// asked for "something similar." Trimmed to what this canvas actually has:
// a Mermaid stateDiagram only knows States (plain, initial, or terminal) —
// no Gateway/Pool/Sub-Process/Connector tiles as PLACEABLE objects
// (confirmed with the user: gateway diamonds stay an automatic rendering
// rule on branching states, not a separate object type). Comments/status
// boxes ARE a real second object type, but explicitly freestanding/
// non-state-machine (see useWorkflowStore.js's `comments` field comment) —
// added per the user's direct request for "a status box outside the
// workflow, for comments." See studio_minimal_state_transition_model.md
// (project memory) for the full rationale on why this stays narrower than
// BPMN's vocabulary.
// Icon + small color-dot badge, overlapping the icon's bottom-right corner —
// matches the reference the user provided directly (a rounded icon with a
// colored dot badge on it, not a separate full-size swatch next to the
// label). Reused for both the State tile's "main color for new states" and
// the Status tile's "color for new comment boxes."
function IconWithDot({ Icon, size, color, onSetColor, title }) {
  return (
    <span className="mflow-icon-badge">
      <Icon size={size} strokeWidth={2}/>
      <input type="color" className="mflow-icon-badge-dot" value={color}
        title={title} onChange={e => onSetColor(e.target.value)}
        onClick={e => e.stopPropagation()}/>
    </span>
  );
}

export default function MFlowPalette({
  onAddState, onAddInitialState, onAddEndState, onAddComment,
  pinned, onTogglePinned,
  selectedState, onSetStateColor,
  stateColor, onSetStateDefaultColor,
  commentColor, onSetCommentColor,
  states = [], selectedNames = new Set(), onSelectState,
}) {
  const expanded = pinned;

  return (
    <div className={`mflow-pal-shell${pinned ? ' pinned' : ''}`}>
      <div className={`mflow-pal-panel${expanded ? ' expanded' : ''}`}>
        {expanded ? (
          <>
            <div className="mflow-pal-head">
              <span className="mflow-pal-title">Palette</span>
              <button type="button" className={`mflow-pal-toggle${pinned ? ' active' : ''}`}
                onClick={onTogglePinned} title={pinned ? 'Collapse palette' : 'Pin palette open'}>
                {pinned ? <PinOff size={12}/> : <Pin size={12}/>}
              </button>
            </div>
            <div className="mflow-pal-body">
              <div className="mflow-pal-group">
                <span className="mflow-pal-group-lbl">States</span>
                <div className="mflow-pal-tiles">
                  <div className="mflow-pal-tile mflow-pal-tile-with-dot">
                    <button type="button" className="mflow-pal-tile-inner" onClick={onAddState}
                      title="State — a step in the workflow">
                      <IconWithDot Icon={Plus} size={13} color={stateColor} onSetColor={onSetStateDefaultColor}
                        title="Main color for new states"/>
                      <span className="mflow-pal-tile-label">State</span>
                    </button>
                  </div>
                  <button type="button" className="mflow-pal-tile" onClick={onAddInitialState}
                    title="Initial State — where the workflow begins">
                    <Play size={12} strokeWidth={2}/>
                    <span className="mflow-pal-tile-label">Initial State</span>
                  </button>
                  <button type="button" className="mflow-pal-tile" onClick={onAddEndState}
                    title="End State — where the workflow terminates">
                    <CircleStop size={13} strokeWidth={2}/>
                    <span className="mflow-pal-tile-label">End State</span>
                  </button>
                </div>
              </div>

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
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mflow-pal-group">
                <span className="mflow-pal-group-lbl">Annotations</span>
                <div className="mflow-pal-tiles">
                  <div className="mflow-pal-tile mflow-pal-tile-with-dot">
                    <button type="button" className="mflow-pal-tile-inner" onClick={onAddComment}
                      title="Status — a colored comment box, not part of the workflow itself">
                      <IconWithDot Icon={StickyNote} size={13} color={commentColor} onSetColor={onSetCommentColor}
                        title="Color for the next Status box you add"/>
                      <span className="mflow-pal-tile-label">Status</span>
                    </button>
                  </div>
                </div>
              </div>

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
            <button type="button" className="mflow-pal-nudge" onClick={onTogglePinned} title="Expand palette">»</button>
            <button type="button" className="mflow-pal-tile compact" onClick={onAddState} title="State">
              <Plus size={13} strokeWidth={2}/>
            </button>
            <button type="button" className="mflow-pal-tile compact" onClick={onAddInitialState} title="Initial State">
              <Play size={12} strokeWidth={2}/>
            </button>
            <button type="button" className="mflow-pal-tile compact" onClick={onAddEndState} title="End State">
              <CircleStop size={13} strokeWidth={2}/>
            </button>
            <button type="button" className="mflow-pal-tile compact" onClick={onAddComment} title="Status (comment box)">
              <StickyNote size={13} strokeWidth={2}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
