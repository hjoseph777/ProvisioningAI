import { toPng, toSvg } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';

// Client-side-only canvas snapshot export (2026-08-22 UX pass, operator's
// "Item B"). Follows reactflow.dev's own official "Download Image" example
// pattern exactly: getNodesBounds() -> getViewportForBounds() -> apply the
// resulting transform to a temporarily-sized clone of .react-flow__viewport
// -> html-to-image's toPng/toSvg. Deliberately NOT the deferred
// server-side-image-creation feature (Puppeteer/Express, still gated on
// standing up that service — see CLAUDE.md's Process Docs porting plan) —
// this never leaves the browser/Electron renderer.
const IMAGE_PADDING = 40;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;

async function captureViewport(nodes, format, backgroundColor) {
  const bounds = getNodesBounds(nodes);
  const width = Math.max(Math.round(bounds.width + IMAGE_PADDING * 2), 200);
  const height = Math.max(Math.round(bounds.height + IMAGE_PADDING * 2), 200);
  const viewport = getViewportForBounds(bounds, width, height, MIN_ZOOM, MAX_ZOOM, IMAGE_PADDING / 2);

  const viewportEl = document.querySelector('.react-flow__viewport');
  if (!viewportEl) throw new Error('canvas viewport not found');

  const capture = format === 'png' ? toPng : toSvg;
  return capture(viewportEl, {
    backgroundColor,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
}

// backgroundColor matches this canvas's real diagram-area background
// (.bpmn-flow-wrap -> .react-flow, no explicit bg of its own, so it
// inherits --bg) — a transparent PNG would show as broken/black in most
// viewers, and a plain white one wouldn't match anything else this app
// exports, so the real canvas color is what gets baked in.
const CANVAS_BG = '#030910';

export async function exportPng(nodes, filename) {
  const dataUrl = await captureViewport(nodes, 'png', CANVAS_BG);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function exportSvg(nodes, filename) {
  const dataUrl = await captureViewport(nodes, 'svg', CANVAS_BG);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
