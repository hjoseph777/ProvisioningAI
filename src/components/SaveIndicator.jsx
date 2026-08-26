import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

// SaveIndicator — a small "Saved" confirmation that fades IN ~700ms after
// `watch` (the active workflow object) last changed, stays visible briefly,
// then fades back out — never shown mid-keystroke, since any further change
// hides it immediately and restarts the settle timer. Skips the very first
// mount (nothing was just "saved" by simply loading existing data).
//
// The underlying persistence is already real and instant (zustand's persist
// middleware writes to localStorage synchronously on every store update) —
// this component makes that fact visible rather than changing anything
// about how or when data is actually saved.
//
// Shared by Studio (CommandCenter.jsx) and M-Files Flow (MFlowCanvas.jsx) —
// both read/write the same useWorkflowStore, so both get identical
// confirmation behavior from one implementation instead of two that could
// drift out of sync.
export default function SaveIndicator({ watch }) {
  const [visible, setVisible] = useState(false);
  const settleTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const isFirstRef = useRef(true);

  useEffect(() => {
    if (isFirstRef.current) { isFirstRef.current = false; return; }
    if (!watch) return;
    setVisible(false);
    clearTimeout(settleTimerRef.current);
    clearTimeout(hideTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      setVisible(true);
      hideTimerRef.current = setTimeout(() => setVisible(false), 2200);
    }, 700);
    return () => { clearTimeout(settleTimerRef.current); clearTimeout(hideTimerRef.current); };
  }, [watch]);

  return (
    <span className={`save-indicator${visible ? ' visible' : ''}`} aria-live="polite">
      <Check size={11}/> Saved
    </span>
  );
}
