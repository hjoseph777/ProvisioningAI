import { useState, useEffect, useRef } from 'react';

// Generic tier-2 strip — generalized from Studio's original workflow-tab bar so
// any section can supply its own item list later. Scroll arrows, expand toggle,
// rename, and delete are all generic "many tabs" chrome, not workflow-specific.
export default function ContextTabStrip({ items, activeId, onSelect, onRename, onDelete, onAdd, addLabel = '+ Add' }) {
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const stripRef = useRef(null);

  const updateScrollState = () => {
    const el = stripRef.current;
    if (!el) { setCanLeft(false); setCanRight(false); return; }
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => { updateScrollState(); }, [items.length, activeId, editId, expanded]);

  const scroll = (delta) => stripRef.current?.scrollBy({ left: delta, behavior: 'smooth' });

  const commitRename = () => {
    if (editId && draft.trim() && onRename) onRename(editId, draft.trim());
    setEditId(null);
    setDraft('');
  };

  return (
    <div className="cc-wf-tabs-wrap">
      <button className="cc-scroll-arrow left" onClick={() => scroll(-160)} disabled={!canLeft} title="Scroll left">◀</button>
      <div className={`cc-wf-tabs ${expanded ? 'expanded' : ''}`} ref={stripRef} onScroll={updateScrollState}>
        {items.map(item => (
          <div
            key={item.id}
            className={`cc-wf-tab ${item.id === activeId ? 'active' : ''} ${item.imported ? 'imported' : ''}`}
            onClick={() => onSelect(item.id)}
            onDoubleClick={() => { if (onRename) { setEditId(item.id); setDraft(item.label); } }}
            title={editId === item.id ? 'Rename' : (onRename ? `${item.label} · double-click to rename` : item.label)}
          >
            {editId === item.id
              ? <input
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text)', width: 80 }}
                  value={draft}
                  autoFocus
                  onChange={e => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditId(null); }}
                  onClick={e => e.stopPropagation()}
                />
              : <span className="cc-wf-tab-name" style={{ fontSize: 9 }}>{item.label}</span>}
            {onDelete && (
              <button className="cc-wf-tab-del" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>✕</button>
            )}
          </div>
        ))}
        {onAdd && <button className="cc-sec-add" style={{ marginLeft: 4, alignSelf: 'center' }} onClick={onAdd}>{addLabel}</button>}
      </div>
      <button className="cc-tab-expand" onClick={() => setExpanded(v => !v)} title={expanded ? 'Compact tab labels' : 'Expand tab labels'}>{expanded ? '⇤' : '⇥'}</button>
      <button className="cc-scroll-arrow right" onClick={() => scroll(160)} disabled={!canRight} title="Scroll right">▶</button>
    </div>
  );
}
