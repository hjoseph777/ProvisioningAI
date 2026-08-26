import { useRef, forwardRef, useImperativeHandle } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Shared bottom horizontal scrollbar — used identically by Studio,
// M-Files Flow, and Process Docs, each of which pans in a fundamentally
// different way (native scroll / a custom CSS transform / React Flow's own
// D3-zoom viewport). This component only ever deals in pixels — a
// viewportWidth, a contentWidth, and a 0..maxScroll "scrollLeft" number —
// never the underlying pan mechanism itself. Each host canvas is
// responsible for computing those three numbers from its own pan state and
// applying onScrollLeftChange back onto it; see MFlowCanvas.jsx's,
// CommandCenter.jsx's, and BpmnCanvas.jsx's own scrollbar-adapter comments
// for how each one maps its real pan state to/from this component.
//
// Imperative on purpose (setMetrics() via ref, not props) — two of the
// three host canvases update this during a raw mousemove drag, where a
// React state update (and the re-render it would trigger) would be wasted
// work on every pixel. Same reasoning MFlowCanvas.jsx's own
// updateScrollbarPos/updateToolbarPos already used before this component existed.
const HScrollBar = forwardRef(function HScrollBar({ onScrollLeftChange, step = 80 }, ref) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const metricsRef = useRef({ viewportWidth: 0, maxScroll: 0, scrollLeft: 0 });

  const applyThumb = () => {
    const track = trackRef.current, thumb = thumbRef.current;
    if (!track || !thumb) return;
    const { viewportWidth, maxScroll, scrollLeft } = metricsRef.current;
    const trackWidth = track.clientWidth;
    const thumbRatio = Math.max(0.08, Math.min(1, viewportWidth / (viewportWidth + maxScroll)));
    const thumbWidthPx = thumbRatio * trackWidth;
    const thumbLeftPx = maxScroll > 0 ? (scrollLeft / maxScroll) * (trackWidth - thumbWidthPx) : 0;
    thumb.style.width = `${thumbWidthPx}px`;
    thumb.style.transform = `translateX(${thumbLeftPx}px)`;
  };

  useImperativeHandle(ref, () => ({
    // contentWidth already includes whatever free-pan buffer the caller
    // wants baked in (Studio passes its real, exact scrollWidth; M-Files
    // Flow/Process Docs add one viewport-width of slack since their canvases
    // pan freely beyond the content's own edges) -- this component doesn't
    // know or care which, it just derives maxScroll = contentWidth - viewportWidth.
    setMetrics: ({ viewportWidth, contentWidth, scrollLeft }) => {
      const maxScroll = Math.max(contentWidth - viewportWidth, 0);
      metricsRef.current = { viewportWidth, maxScroll, scrollLeft: Math.max(0, Math.min(maxScroll, scrollLeft)) };
      applyThumb();
    },
  }), []);

  // Applies a new scrollLeft to this component's own thumb immediately
  // (so dragging/nudging/clicking feels instant regardless of how long the
  // host canvas's own pan round-trip takes to call setMetrics() back), and
  // separately hands the real value to the host via onScrollLeftChange.
  const setScrollLeft = newScrollLeft => {
    const { maxScroll } = metricsRef.current;
    const clamped = Math.max(0, Math.min(maxScroll, newScrollLeft));
    metricsRef.current = { ...metricsRef.current, scrollLeft: clamped };
    applyThumb();
    onScrollLeftChange(clamped);
  };

  const onThumbMouseDown = e => {
    e.preventDefault(); e.stopPropagation();
    const track = trackRef.current; if (!track) return;
    const trackWidth = track.clientWidth;
    const { viewportWidth, maxScroll, scrollLeft: startScrollLeft } = metricsRef.current;
    const thumbRatio = Math.max(0.08, Math.min(1, viewportWidth / (viewportWidth + maxScroll)));
    const draggableTrack = Math.max(1, trackWidth - thumbRatio * trackWidth);
    const startX = e.clientX;
    const onMove = ev => {
      const dxScroll = maxScroll > 0 ? ((ev.clientX - startX) / draggableTrack) * maxScroll : 0;
      setScrollLeft(startScrollLeft + dxScroll);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Click the bare track (not the thumb, which stops its own propagation)
  // to jump straight there -- standard scrollbar behavior.
  const onTrackMouseDown = e => {
    if (e.target !== trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const { maxScroll } = metricsRef.current;
    setScrollLeft(((e.clientX - rect.left) / rect.width) * maxScroll);
  };

  return (
    <div className="hscroll">
      <button type="button" className="hscroll-arrow" onClick={() => setScrollLeft(metricsRef.current.scrollLeft - step)} title="Scroll left">
        <ChevronLeft size={11}/>
      </button>
      <div className="hscroll-track" ref={trackRef} onMouseDown={onTrackMouseDown}>
        <div className="hscroll-thumb" ref={thumbRef} onMouseDown={onThumbMouseDown}/>
      </div>
      <button type="button" className="hscroll-arrow" onClick={() => setScrollLeft(metricsRef.current.scrollLeft + step)} title="Scroll right">
        <ChevronRight size={11}/>
      </button>
    </div>
  );
});

export default HScrollBar;
