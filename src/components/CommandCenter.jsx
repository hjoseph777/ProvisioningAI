import { Fragment, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Users, Cog, Palette, Plus, Play, TriangleAlert } from 'lucide-react';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useMermaid } from '../hooks/useMermaid';
import { useExport } from '../hooks/useExport';
import { computeGatewayGroups, gatewayLabel } from '../utils/gatewayGroups';
import { parseCondition, describeCondition } from '../utils/transitionGrammar';
import { CANVAS_THEMES, DEFAULT_CANVAS_THEME, gatewayStyleFor } from '../utils/canvasThemes';
import { attachTravelingDot } from '../utils/edgeDotAnimation';
import { SHAPE_STROKE_WIDTH, SHAPE_FILL_OPACITY, SHAPE_DROP_SHADOW, GATEWAY_ICON_SIZE } from '../utils/shapeDesignTokens';

// Pre-rendered once at module load — reused lucide-react icon markup (not hand-drawn
// SVG) for the two gateway diamond variants, in both color variants a theme can pick:
// 'accent' is the blue/gray split colors (#7c8cff/#9aa2b8, deliberately not --a3, the
// app's existing node-selection/hover blue, so a gateway never reads as "currently
// selected") already shipped with the gateway work; 'mono' is plain white, used only
// under the Cacoo theme's solid-olive diamonds where both variants share one fill.
// Size is GATEWAY_ICON_SIZE (shapeDesignTokens.js, token #5) — was a fixed 16px,
// which read as small/lost inside the 40px diamond; see gateway-diamond-design-tokens.md.
const GATEWAY_ICON_SVG = {
  decision:  {
    accent: renderToStaticMarkup(<Users size={GATEWAY_ICON_SIZE} strokeWidth={2} color="#7c8cff" />),
    mono:   renderToStaticMarkup(<Users size={GATEWAY_ICON_SIZE} strokeWidth={2} color="#fff" />),
  },
  automatic: {
    accent: renderToStaticMarkup(<Cog size={GATEWAY_ICON_SIZE} strokeWidth={2} color="#9aa2b8" />),
    mono:   renderToStaticMarkup(<Cog size={GATEWAY_ICON_SIZE} strokeWidth={2} color="#fff" />),
  },
};

const mkId = () => Math.random().toString(36).slice(2,9);
const delay = ms => new Promise(r => setTimeout(r, ms));
const TS = () => new Date().toLocaleTimeString('en-CA',{hour12:false});
const MODES = [['manual','⊞ Manual'],['nlp','◈ NLP'],['ai','✦ AI'],['cacoo','⬡ Cacoo']];

const AI_SYSTEM = `Extract a workflow and return ONLY this JSON (no markdown):
{"workflow":{"name":"string","states":[{"name":"string","initial":true}],"transitions":[{"from":"string","to":"string","conditions":null,"permissions":null}]},"users":[{"name":"string","role":"string","email":"string","isCM":false}],"properties":[{"name":"string","type":"Text","required":false}],"rules":[{"text":"string"}]}
One state must have initial:true. Transition names must match states exactly.`;

function parseTable(text, header) {
  const idx = text.search(new RegExp(`###\\s+${header}[^\\n]*\\n`,'im'));
  if (idx===-1) return [];
  const rows=[]; let sep=false;
  for (const ln of text.slice(idx).split('\n').slice(1)) {
    const l=ln.trim();
    if (!l.startsWith('|')) break;
    if (/^\|[\s\-:|]+\|/.test(l)){sep=true;continue;}
    if (!sep) continue;
    rows.push(l.split('|').map(c=>c.trim()).filter(Boolean));
  }
  return rows;
}

function parseNLP(text) {
  const nm=text.match(/^##\s+Workflow[:\s]+(.+)/im)||text.match(/^#\s+(.+)/m);
  const name=nm?nm[1].trim():'Extracted Workflow';
  const states=parseTable(text,'States').filter(r=>r[0]&&!/state.*name/i.test(r[0]))
    .map(r=>({id:mkId(),name:r[0],initial:/yes/i.test(r[1]||'')}));
  const transitions=parseTable(text,'Transitions').filter(r=>r[0]&&!/^from$/i.test(r[0]))
    .map(r=>({id:mkId(),from:r[0],to:r[1]||'',conditions:r[2]&&r[2]!=='—'?r[2]:null,permissions:r[3]&&r[3]!=='—'?r[3]:null}));
  const users=parseTable(text,'Users').filter(r=>r[0]&&!/^name$/i.test(r[0]))
    .map(r=>({id:mkId(),name:r[0],role:r[1]||'',email:r[2]||'',isCM:/yes/i.test(r[3]||'')}));
  const properties=parseTable(text,'Properties').filter(r=>r[0]&&!/field.*name/i.test(r[0]))
    .map(r=>({id:mkId(),name:r[0],type:r[1]||'Text',required:/yes/i.test(r[2]||'')}));
  const rm=text.match(/###\s+(?:Business\s+)?Rules[^\n]*\n([\s\S]+?)(?=\n##|$)/im);
  const rules=rm?(rm[1].match(/^(?:\d+\.\s*|-\s*)(.+)/gm)||[])
    .map(i=>({id:mkId(),text:i.replace(/^[\d.]+\s*|-\s*/,'').trim()})).filter(r=>r.text):[];
  return {name,workflow:{name,states,transitions},users,properties,rules};
}

function buildSOW(wf, users, props, rules) {
  const d=new Date().toLocaleDateString('en-CA');
  let s=`# ${wf.name}\n## Statement of Work\n\n| Field | Detail |\n|:---|:---|\n| **Project** | ${wf.name} |\n| **Date** | ${d} |\n\n`;
  s+=`## 1. States\n\n| State | Initial |\n|:---|:---|\n`;
  wf.states.forEach(st=>{s+=`| ${st.name} | ${st.initial?'Yes':'No'} |\n`;});
  s+=`\n## 2. Transitions\n\n| From | To | Condition | Permission |\n|:---|:---|:---|:---|\n`;
  wf.transitions.forEach(t=>{s+=`| ${t.from} | ${t.to} | ${t.conditions||'—'} | ${t.permissions||'—'} |\n`;});
  if(users.length){s+=`\n## 3. Users\n\n| Name | Role | Email | CM |\n|:---|:---|:---|:---|\n`;users.forEach(u=>{s+=`| ${u.name} | ${u.role||'—'} | ${u.email||'—'} | ${u.isCM?'Yes':'No'} |\n`;});}
  if(props.length){s+=`\n## 4. Properties\n\n| Field | Type | Required |\n|:---|:---|:---|\n`;props.forEach(p=>{s+=`| ${p.name} | ${p.type} | ${p.required?'Yes':'No'} |\n`;});}
  if(rules.length){s+=`\n## 5. Business Rules\n\n`;rules.forEach((r,i)=>{s+=`${i+1}. ${r.text||r}\n`;});}
  return s;
}

function buildPRD(wf, users, props, rules) {
  const hrs=wf.states.length*3+wf.transitions.length+25;
  return buildSOW(wf,users,props,rules).replace('## Statement of Work','## Product Requirements Document')
    +`\n## 6. Build Estimate\n\n| Phase | Hours |\n|:---|:---|\n| Schema + Parser | 15–20 |\n| COM Provisioner | ${hrs-15}–${Math.round((hrs-15)*1.3)} |\n| Testing | 10–15 |\n| **Total** | **${hrs}–${Math.round(hrs*1.3)}** |\n\n*ProvisioningAI · ${new Date().getFullYear()}*\n`;
}

const loadMermaid=()=>new Promise(res=>{
  if(window.mermaid) return res(window.mermaid);
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js';
  s.onload=()=>{
    window.mermaid.initialize({startOnLoad:false,theme:'base',
      // Prevent Mermaid from injecting style="max-width:Xpx" on the SVG element.
      // Without this flag, the inline style overrides all CSS and locks the SVG to
      // a fixed pixel width even when the column expands.
      state:{useMaxWidth:false},
      themeVariables:{
        primaryColor:'#3A7FD5',primaryTextColor:'#FFFFFF',primaryBorderColor:'#2A5FA8',
        lineColor:'#3A7FD5',secondaryColor:'#071828',background:'#F8FAFC',
        mainBkg:'#3A7FD5',nodeBorder:'#2A5FA8',edgeLabelBackground:'#071828',
        fontFamily:'JetBrains Mono,monospace',fontSize:'12px',
      }});
    res(window.mermaid);
  };
  document.head.appendChild(s);
});

function highlightNode(el,name){
  if(!el||!name) return;
  const svg=el.querySelector('svg'); if(!svg) return;
  svg.querySelectorAll('.node rect,.node circle,.node polygon').forEach(e=>{e.style.stroke='';e.style.strokeWidth='';});
  svg.querySelectorAll('.node').forEach(n=>{n.style.filter='';});
  svg.querySelectorAll('.node').forEach(n=>{
    const lbl=n.querySelector('.nodeLabel,text,span')?.textContent?.trim()||'';
    if(lbl===name){
      const sh=n.querySelector('rect,circle,polygon');
      if(sh){sh.style.stroke='#4A9FFF';sh.style.strokeWidth='2.5';}
      n.style.filter='drop-shadow(0 0 7px rgba(74,159,255,.8))';
    }
  });
}

// buildEdgeMap: parses mermaid string -> [{fromId,toId}] for highlightEdge index lookup.
// Note: [*] lines never match [A-Za-z0-9_]+ so the continue guard is redundant but kept for clarity.
function buildEdgeMap(mermaidStr) {
  if (!mermaidStr) return [];
  const map = [];
  const re = /^\s+([A-Za-z0-9_]+)\s+-->\s+([A-Za-z0-9_]+)/gm;
  let m;
  while ((m = re.exec(mermaidStr)) !== null) {
    const from = m[1], to = m[2];
    if (from === '[*]' || to === '[*]') continue;
    map.push({ fromId: from, toId: to });
  }
  return map;
}

// addClicks: wires state-node clicks, plus hover (diagram -> table direction
// of bidirectional highlighting; the table -> diagram direction is the
// separate hoveredState/hoveredTransition effect below). Edge click +
// drag-to-bend is handled separately by enableEdgeInteraction, which
// consumes the layout model's already-resolved fromId/toId/transId instead
// of recomputing them (this used to duplicate that nearest-neighbor pass
// independently — now there's exactly one source of truth for "which edge is this").
function addClicks(el, onNode, onNodeHover) {
  const svg = el?.querySelector('svg'); if (!svg) return;
  svg.querySelectorAll('.node').forEach(n => {
    if (n.classList.contains('gw-node')) return; // gateway diamonds aren't states — nothing to select or hover-report
    n.style.cursor = 'pointer';
    n.onclick = e => {
      e.stopPropagation();
      const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
      if (lbl) onNode(lbl);
    };
    n.onmouseenter = () => {
      const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
      if (lbl) onNodeHover?.(lbl);
    };
    n.onmouseleave = () => onNodeHover?.(null);
  });
}

// enableEdgeInteraction: click an arrow to select it (existing behavior,
// unchanged in feel), or drag its middle to add/move a bend point that
// persists via updateBend — a plain click (movement under DRAG_THRESHOLD)
// still fires onEdge, unaffected. Also fires onEdgeHover on enter/leave (the
// diagram -> table direction of bidirectional highlighting) using the same
// already-resolved fromId/toId this ghost overlay already carries — this
// correctly follows gateway-routed edges too, since model.edges comes from
// buildLayoutModel's geometric resolution, not a raw mermaid-text lookup.
// Ghost overlays are rebuilt from model.edges (already resolved: fromId,
// toId, transId) instead of a second independent nearest-neighbor pass.
function enableEdgeInteraction(el, model, onEdge, updateBend, onEdgeHover) {
  const svg = el?.querySelector('svg'); if (!svg || !model) return;
  const { nodes, edges, finalPos, bendPos } = model;
  const DRAG_THRESHOLD = 5;

  svg.querySelectorAll('.ghost-overlay').forEach(g => g.remove());
  const ghostLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  ghostLayer.setAttribute('class', 'ghost-overlay');
  svg.appendChild(ghostLayer);

  edges.forEach(({ path, fromId, toId, transId }) => {
    const ghost = path.cloneNode(false);
    ghost.removeAttribute('id');
    ghost.removeAttribute('class');
    ghost.removeAttribute('marker-end');
    ghost.removeAttribute('marker-start');
    ghost.removeAttribute('marker-mid');
    ghost.style.cssText = 'stroke-width:32px;stroke:transparent;fill:none;cursor:pointer;pointer-events:stroke';
    ghost.onmouseenter = () => onEdgeHover?.({ fromId, toId });
    ghost.onmouseleave = () => onEdgeHover?.(null);
    ghostLayer.appendChild(ghost);

    const toUserSpace = (clientX, clientY) => {
      const ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
      return pt.matrixTransform(ctm.inverse());
    };

    ghost.onmousedown = (e) => {
      e.stopPropagation();
      const startClientX = e.clientX, startClientY = e.clientY;
      let dragging = false;

      const onMove = (ev) => {
        const dxScreen = ev.clientX - startClientX, dyScreen = ev.clientY - startClientY;
        if (!dragging && Math.hypot(dxScreen, dyScreen) > DRAG_THRESHOLD) dragging = true;
        if (!dragging || !transId) return;
        const cur = toUserSpace(ev.clientX, ev.clientY);
        bendPos[transId] = { x: cur.x, y: cur.y };
        growViewBoxToFit(svg, cur.x, cur.y);
        redrawEdge(path, fromId, toId, nodes, finalPos, bendPos[transId]);
        redrawEdge(ghost, fromId, toId, nodes, finalPos, bendPos[transId]);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (dragging && transId) updateBend(transId, bendPos[transId].x, bendPos[transId].y);
        else if (!dragging) onEdge({ fromId, toId });
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
  });
}

// rectEdgePoint: where a ray from a box's center toward (tx,ty) crosses the
// box's own boundary — used so a redrawn straight edge starts/ends at the
// node's border, not its center (which would draw through the box).
function rectEdgePoint(cx, cy, halfW, halfH, tx, ty) {
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

// growViewBoxToFit: Mermaid sizes the SVG's viewBox to fit only its own
// auto-computed layout — anything dragged past that box's edge gets clipped,
// since SVG hides content outside its viewBox by default. Expands (never
// shrinks) the viewBox so a point stays inside with headroom to spare.
// Call on every drag move a node/bend could cross the current boundary.
function growViewBoxToFit(svg, x, y, pad = 60) {
  const vb = svg.viewBox.baseVal;
  let [minX, minY, w, h] = [vb.x, vb.y, vb.width, vb.height];
  let changed = false;
  if (x - pad < minX) { const d = minX - (x - pad); minX -= d; w += d; changed = true; }
  if (y - pad < minY) { const d = minY - (y - pad); minY -= d; h += d; changed = true; }
  if (x + pad > minX + w) { w = (x + pad) - minX; changed = true; }
  if (y + pad > minY + h) { h = (y + pad) - minY; changed = true; }
  if (changed) {
    svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
    // Keep the on-screen zoom level visually correct — width/height in CSS
    // px were sized off the ORIGINAL viewBox width (svgEl.dataset.baseWidth),
    // so growing the viewBox without updating that reference would silently
    // shrink everything else on screen relative to the new, larger canvas.
    svg.dataset.baseWidth = w;
    const zoom = parseFloat(svg.dataset.currentZoom) || 1;
    svg.style.width = `${w * zoom}px`;
  }
}

// sanitizeStateId: same name->id scheme useMermaid.js uses to build node ids.
// Mermaid's node id is derived from the state NAME, not the store's state.id,
// so every place that needs to go from "diagram node" back to "store record"
// has to re-derive it the same way.
const sanitizeStateId = name => (name || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

// buildLayoutModel: reads each node's Mermaid-computed center + box half-extents,
// and resolves every edge's real fromId/toId geometrically (sampling near each
// end of the path and finding the nearest node — Mermaid can render path
// elements in a different order than the input string, so this is the only
// reliable way; same approach addClicks already uses for click hit-testing).
// Also resolves each edge's store transition id (by from/to name, first-unused-
// match — mirrors the existing index-based matching buildEdgeMap/highlightEdge
// already rely on) so a dragged bend point can be persisted per-transition.
function buildLayoutModel(svg, wf) {
  const idToStateId = {};
  wf.states.forEach(s => { idToStateId[sanitizeStateId(s.name)] = s.id; });

  const nodes = {};
  svg.querySelectorAll('.node').forEach(n => {
    const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
    if (!lbl) return;
    const id = sanitizeStateId(lbl);
    const rect = n.querySelector('rect.basic, rect');
    // Gateway diamonds have no <rect> (applyGatewayDiamonds swaps it for a <polygon>)
    // — their own fixed half-extents are stashed as data attributes at swap time.
    const hw = n.dataset.gwHw ? parseFloat(n.dataset.gwHw) : (rect ? parseFloat(rect.getAttribute('width')) / 2  : 30);
    const hh = n.dataset.gwHh ? parseFloat(n.dataset.gwHh) : (rect ? parseFloat(rect.getAttribute('height')) / 2 : 15);
    const m = /translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/.exec(n.getAttribute('transform') || '');
    nodes[id] = { el: n, hw, hh, mermaidX: m ? parseFloat(m[1]) : 0, mermaidY: m ? parseFloat(m[2]) : 0 };
  });

  const nodeScreenCenters = Object.entries(nodes).map(([id, n]) => {
    const r = n.el.getBoundingClientRect();
    return { id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  const nearest = (x, y) => {
    let best = null, bestD = Infinity;
    nodeScreenCenters.forEach(nb => { const d = (nb.cx-x)**2 + (nb.cy-y)**2; if (d < bestD) { bestD = d; best = nb.id; } });
    return best;
  };

  const usedTransIds = new Set();
  const findTransId = (fromId, toId) => {
    const t = wf.transitions.find(t =>
      !usedTransIds.has(t.id) && sanitizeStateId(t.from) === fromId && sanitizeStateId(t.to) === toId);
    if (t) usedTransIds.add(t.id);
    return t ? t.id : null;
  };

  const transPaths = [...svg.querySelectorAll('path.transition')].filter(p => !p.getAttribute('marker-start'));
  const edges = [];
  transPaths.forEach(p => {
    const len = p.getTotalLength(); if (len < 1) return;
    const s = p.getPointAtLength(len * 0.05), e2 = p.getPointAtLength(len * 0.95);
    const ctm = p.getScreenCTM();
    const toScreen = pt => { const sp = svg.createSVGPoint(); sp.x = pt.x; sp.y = pt.y; return ctm ? sp.matrixTransform(ctm) : sp; };
    const ss = toScreen(s), es = toScreen(e2);
    const fromId = nearest(ss.x, ss.y), toId = nearest(es.x, es.y);
    if (!fromId || !toId || fromId === toId) return;
    edges.push({ path: p, fromId, toId, transId: findTransId(fromId, toId) });
  });

  const isMoved = id => {
    const st = wf.states.find(s => s.id === idToStateId[id]);
    return st && st.x != null && st.y != null;
  };
  const finalPos = {};
  Object.entries(nodes).forEach(([id, n]) => {
    const st = wf.states.find(s => s.id === idToStateId[id]);
    finalPos[id] = (st && st.x != null && st.y != null) ? { x: st.x, y: st.y } : { x: n.mermaidX, y: n.mermaidY };
  });

  // bendPos: current bend-point per transition id, seeded from the store.
  // Mutated live during an edge drag; read back by redrawEdge on every move.
  const bendPos = {};
  edges.forEach(({ transId }) => {
    if (!transId) return;
    const t = wf.transitions.find(t => t.id === transId);
    if (t?.bend) bendPos[transId] = { x: t.bend.x, y: t.bend.y };
  });

  return { idToStateId, nodes, edges, finalPos, isMoved, bendPos };
}

// redrawEdge: recompute one edge's `d`, clipped to both nodes' borders.
// With no bend point: a straight line, each end aimed at the OTHER node's
// center (original behavior). With a bend point: a quadratic curve pulled
// toward the bend, with each end aimed at the bend instead — so the line
// actually leaves each node heading toward the bend, not toward the other
// node and then correcting, which would look like a kink at the border.
function redrawEdge(path, fromId, toId, nodes, finalPos, bend) {
  const a = finalPos[fromId], b = finalPos[toId], na = nodes[fromId], nb = nodes[toId];
  if (!a || !b || !na || !nb) return;
  if (bend) {
    const p1 = rectEdgePoint(a.x, a.y, na.hw, na.hh, bend.x, bend.y);
    const p2 = rectEdgePoint(b.x, b.y, nb.hw, nb.hh, bend.x, bend.y);
    path.setAttribute('d', `M${p1.x},${p1.y} Q${bend.x},${bend.y} ${p2.x},${p2.y}`);
  } else {
    const p1 = rectEdgePoint(a.x, a.y, na.hw, na.hh, b.x, b.y);
    const p2 = rectEdgePoint(b.x, b.y, nb.hw, nb.hh, a.x, a.y);
    path.setAttribute('d', `M${p1.x},${p1.y} L${p2.x},${p2.y}`);
  }
}

// applyGatewayDiamonds: after a fresh Mermaid render, finds every node whose
// rendered label matches a promoted gateway (2+ distinct source states sharing a
// transition.group — see gatewayGroups.js) and swaps its <rect> for a <polygon>
// diamond with the decision/automatic icon centered inside. Must run before
// addClicks/applyManualLayout/enableNodeDrag so their .gw-node guards and
// data-gw-hw/hh geometry are in place before those passes read node shape.
// Fixed-size diamonds (not derived from the hidden label's text width) — a gateway's
// group name is arbitrary-length free text, and sizing off it would make every
// diamond a different size for no meaningful reason.
function applyGatewayDiamonds(el, wf) {
  const svg = el?.querySelector('svg'); if (!svg || !wf) return;
  const promoted = computeGatewayGroups(wf.transitions);
  if (!promoted.length) return;

  const theme = wf.theme || DEFAULT_CANVAS_THEME;
  const hubLabelToType = new Map(promoted.map(g => {
    const type = (wf.groups || []).find(x => x.id === g.id)?.type === 'automatic' ? 'automatic' : 'decision';
    return [gatewayLabel(g.id), type];
  }));

  const HW = 20, HH = 20; // half-width/half-height — matches worked_example_mockup.html's ~40px tile scale

  svg.querySelectorAll('.node').forEach(n => {
    const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
    if (!hubLabelToType.has(lbl)) return;
    const type = hubLabelToType.get(lbl);
    const rect = n.querySelector('rect');
    if (!rect) return; // already swapped on a prior pass, or unexpected node shape

    const style = gatewayStyleFor(theme, type);
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', `0,${-HH} ${HW},0 0,${HH} ${-HW},0`);
    poly.setAttribute('fill', style.fill);
    poly.setAttribute('fill-opacity', String(SHAPE_FILL_OPACITY));
    poly.setAttribute('stroke', style.stroke);
    poly.setAttribute('stroke-width', String(SHAPE_STROKE_WIDTH));
    poly.style.filter = SHAPE_DROP_SHADOW;
    rect.replaceWith(poly);

    // Hide the raw "Gateway <id>" fallback text — the icon is the real label.
    n.querySelectorAll('.nodeLabel, text, span, foreignObject').forEach(t => { t.style.display = 'none'; });

    const iconWrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const iconOffset = -GATEWAY_ICON_SIZE / 2;
    iconWrap.setAttribute('transform', `translate(${iconOffset},${iconOffset})`);
    iconWrap.innerHTML = GATEWAY_ICON_SVG[type][style.iconVariant];
    n.appendChild(iconWrap);

    n.classList.add('gw-node');
    n.dataset.gwHw = String(HW);
    n.dataset.gwHh = String(HH);
  });
}

// applyStateAnnotations: paints the two purely-cosmetic per-state markers from
// worked_example_mockup.html that have no Mermaid stateDiagram-v2 equivalent — the
// "Predefined process" double-bar (state.markerType, an external-system-handoff flag)
// and a free-text status badge (state.badge/state.badgeColor). state.color (the
// "Fermé pattern" — a state colored as its own identity) is NOT handled here: fill is
// something Mermaid already knows how to draw, so it's a plain classDef in
// useMermaid.js instead of custom SVG. Same rendering category as
// applyGatewayDiamonds — purely additive, doesn't touch node shape/class, so it can
// run any time after the node exists.
function applyStateAnnotations(el, wf) {
  const svg = el?.querySelector('svg'); if (!svg || !wf) return;
  const byName = new Map(wf.states.map(s => [s.name, s]));
  if (!wf.states.some(s => s.markerType || s.badge)) return;

  svg.querySelectorAll('.node').forEach(n => {
    if (n.classList.contains('gw-node')) return; // gateways have no state record to annotate
    const lbl = n.querySelector('.nodeLabel,text,span')?.textContent?.trim() || '';
    const st = byName.get(lbl);
    if (!st) return;
    const rect = n.querySelector('rect');
    if (!rect) return;
    const hw = parseFloat(rect.getAttribute('width')) / 2;
    const hh = parseFloat(rect.getAttribute('height')) / 2;

    if (st.markerType) {
      const inset = hw * 0.6;
      [-inset, inset].forEach(x => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x); line.setAttribute('x2', x);
        line.setAttribute('y1', -hh); line.setAttribute('y2', hh);
        line.setAttribute('stroke', '#e0b84a');
        line.setAttribute('stroke-width', String(SHAPE_STROKE_WIDTH)); // token #1 — unified with the gateway diamond's stroke weight, was a separate near-identical 1.3
        n.appendChild(line);
      });
    }

    if (st.badge) {
      const bw = Math.max(46, st.badge.length * 6 + 14), bh = 16;
      const by = -hh - bh - 4;
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', -bw / 2); bg.setAttribute('y', by);
      bg.setAttribute('width', bw); bg.setAttribute('height', bh);
      bg.setAttribute('rx', 3); // token #3 — confirmed already matches the source's proportional-radius formula (~3.2), left as-is
      bg.setAttribute('fill', st.badgeColor || '#e07b1a');
      bg.style.filter = SHAPE_DROP_SHADOW; // token #4 — same lifted-off-canvas treatment as the gateway diamonds
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', 0); txt.setAttribute('y', by + bh / 2 + 3.5);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('font-size', '9.5');
      txt.setAttribute('font-weight', 'bold');
      txt.setAttribute('fill', '#fff');
      txt.textContent = st.badge;
      n.appendChild(bg);
      n.appendChild(txt);
    }
  });
}

// applyEdgeFlowAnimation: attaches a traveling dot (edgeDotAnimation.js) to edges
// whose owning transition is honestly known to be automatic.
//
// IMPORTANT — this is NOT the TriggerMode field. Studio's transition schema
// ({id, from, to, conditions, permissions, bend, group}) has never carried
// TriggerMode; that enum (Manual=0, AutomaticCriteria=4, AutomaticVBScript=5)
// lives only in ProvisioningAI.Workflow/Translation/Models.cs and is never
// written by scripts/pull-from-vault.ps1 (confirmed: its transitions only ever
// carry from/to/label) or by anything in this store. The real, already-known
// signal used instead: a transition that belongs to a promoted gateway
// (gatewayGroups.js) whose type is 'automatic' — the same "engine-evaluated, not
// human-initiated" fact TriggerMode 4/5 would represent, sourced from a field
// Studio actually has. Every other transition — including 'decision'-gateway
// branches and all ungrouped/plain transitions — stays static. That's deliberate,
// not an oversight: claiming "automatic" without a real signal is exactly the
// dishonest rendering this feature exists to avoid.
//
// Matches by rendered node id, not layoutModel's transId: a promoted gateway's
// transitions render as source-->hub and hub-->target (gatewayGroups.js), never
// as a direct source-->target edge, so findTransId's from/to lookup (built for
// plain point-to-point edges) never resolves them — every animated transition
// would otherwise be silently skipped. Checking whether either endpoint IS one
// of the automatic hubs correctly catches both the inbound and outbound half of
// each animated gateway instead.
function applyEdgeFlowAnimation(el, wf, layoutModel) {
  const svg = el?.querySelector('svg'); if (!svg || !wf || !layoutModel) return;
  const promoted = computeGatewayGroups(wf.transitions);
  const automaticGroups = promoted.filter(g => (wf.groups || []).find(x => x.id === g.id)?.type === 'automatic');
  if (!automaticGroups.length) return;

  const animatedHubIds = new Set(automaticGroups.map(g => sanitizeStateId(gatewayLabel(g.id))));

  layoutModel.edges.forEach(({ path, fromId, toId }) => {
    if (animatedHubIds.has(fromId) || animatedHubIds.has(toId)) {
      attachTravelingDot(path, { color: 'var(--green)' });
    }
  });
}

// applyManualLayout: overrides any node's position with its stored x/y (a
// previously-dragged state persists across every re-render/reload), and any
// transition's path with its stored bend point — then redraws only the edges
// that actually need it (touching a moved node, or carrying a saved bend).
// Edges between two untouched nodes with no saved bend keep Mermaid's own
// curve untouched. Must run BEFORE addClicks, so addClicks' edge-click
// hitboxes are built from the already-correct, already-adjusted geometry.
function applyManualLayout(el, wf) {
  const svg = el?.querySelector('svg'); if (!svg || !wf) return null;
  const model = buildLayoutModel(svg, wf);
  const { nodes, edges, idToStateId, finalPos, isMoved, bendPos } = model;

  Object.entries(nodes).forEach(([id, n]) => {
    const st = wf.states.find(s => s.id === idToStateId[id]);
    if (st && st.x != null && st.y != null) {
      n.el.setAttribute('transform', `translate(${st.x}, ${st.y})`);
      growViewBoxToFit(svg, st.x, st.y);
    }
  });
  edges.forEach(({ path, fromId, toId, transId }) => {
    const bend = transId ? bendPos[transId] : null;
    if (bend) growViewBoxToFit(svg, bend.x, bend.y);
    if (!isMoved(fromId) && !isMoved(toId) && !bend) return;
    redrawEdge(path, fromId, toId, nodes, finalPos, bend);
  });
  return model;
}

// enableNodeDrag: click-and-drag repositioning for state boxes. A short
// mouse movement past DRAG_THRESHOLD engages an actual drag (so a plain
// click still opens the state inspector, unaffected); dropping persists the
// new position via updatePosition. Must run AFTER addClicks so it can wrap
// the click handler addClicks already attached and suppress it post-drag.
function enableNodeDrag(el, model, updatePosition) {
  const svg = el?.querySelector('svg'); if (!svg || !model) return;
  const { nodes, edges, idToStateId, finalPos, bendPos } = model;
  const DRAG_THRESHOLD = 5;

  Object.entries(nodes).forEach(([id, n]) => {
    if (n.el.classList.contains('gw-node')) return; // gateway diamonds have no store position to drag
    const stateId = idToStateId[id];
    const origOnClick = n.el.onclick;
    n.el.style.cursor = 'grab';

    n.el.onmousedown = (e) => {
      e.stopPropagation();
      const startClientX = e.clientX, startClientY = e.clientY;
      const startPos = { x: finalPos[id].x, y: finalPos[id].y };
      let dragging = false;

      const toUserSpace = (clientX, clientY) => {
        const ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
        const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
        return pt.matrixTransform(ctm.inverse());
      };
      const startUser = toUserSpace(startClientX, startClientY);

      const onMove = (ev) => {
        const dxScreen = ev.clientX - startClientX, dyScreen = ev.clientY - startClientY;
        if (!dragging && Math.hypot(dxScreen, dyScreen) > DRAG_THRESHOLD) { dragging = true; n.el.style.cursor = 'grabbing'; }
        if (!dragging) return;
        const curUser = toUserSpace(ev.clientX, ev.clientY);
        const nx = startPos.x + (curUser.x - startUser.x);
        const ny = startPos.y + (curUser.y - startUser.y);
        n.el.setAttribute('transform', `translate(${nx}, ${ny})`);
        finalPos[id] = { x: nx, y: ny };
        growViewBoxToFit(svg, nx, ny);
        edges.forEach(({ path, fromId, toId, transId }) => {
          if (fromId !== id && toId !== id) return;
          redrawEdge(path, fromId, toId, nodes, finalPos, transId ? bendPos[transId] : null);
        });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        n.el.style.cursor = 'grab';
        if (dragging && stateId) updatePosition(stateId, finalPos[id].x, finalPos[id].y);
        n.el.dataset.wasDrag = dragging ? '1' : '0';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    // Suppress the click that follows a drag (browsers still fire it on
    // mouseup over the same element) so dragging a node doesn't also select it.
    n.el.onclick = (e) => {
      if (n.el.dataset.wasDrag === '1') { n.el.dataset.wasDrag = '0'; e.stopPropagation(); return; }
      origOnClick && origOnClick(e);
    };
  });
}

// highlightEdge: lights up the matching path.transition in blue
// NOTE: do NOT change strokeWidth — Mermaid markers use markerUnits="strokeWidth"
// so changing strokeWidth scales the arrowhead proportionally (makes it expand).
// Color change + drop-shadow filter is sufficient visual feedback.
function highlightEdge(el, selTrans, edgeMap) {
  if (!el || !selTrans) return;
  const svg = el.querySelector('svg'); if (!svg) return;

  // Reset all transition paths (stroke color + filter only — not strokeWidth)
  const allTransPaths = [...svg.querySelectorAll('path.transition')];
  const transPaths = allTransPaths.filter(p => !p.getAttribute('marker-start'));
  transPaths.forEach(p => { p.style.stroke = ''; p.style.filter = ''; });

  // Highlight the matching path by edgeMap index
  const matchIdx = edgeMap.findIndex(e => e.fromId === selTrans.fromId && e.toId === selTrans.toId);
  if (matchIdx >= 0 && transPaths[matchIdx]) {
    const p = transPaths[matchIdx];
    p.style.stroke = '#4A9FFF';
    // strokeWidth intentionally NOT set — arrowhead marker scales with it
    p.style.filter = 'drop-shadow(0 0 6px rgba(74,159,255,.85))';
  }
}

async function dl(content, filename) {
  if (window.file?.save) {
    // Electron: native OS Save-As dialog
    await window.file.save({ content, defaultName: filename });
  } else {
    // Browser fallback
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {type: 'text/markdown'}));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }
}

export default function CommandCenter() {
  const workflows=useWorkflowStore(s=>s.workflows), activeId=useWorkflowStore(s=>s.activeId);
  const getActive=useWorkflowStore(s=>s.getActive);
  const renameWorkflow=useWorkflowStore(s=>s.renameWorkflow), clearWorkflow=useWorkflowStore(s=>s.clearWorkflow);
  const importWorkflow=useWorkflowStore(s=>s.importWorkflow), resetAll=useWorkflowStore(s=>s.resetAll);
  const addState=useWorkflowStore(s=>s.addState), updateState=useWorkflowStore(s=>s.updateState);
  const updateStatePosition=useWorkflowStore(s=>s.updateStatePosition);
  const renameState=useWorkflowStore(s=>s.renameState), deleteState=useWorkflowStore(s=>s.deleteState);
  const addTransition=useWorkflowStore(s=>s.addTransition), updateTransition=useWorkflowStore(s=>s.updateTransition);
  const updateTransitionBend=useWorkflowStore(s=>s.updateTransitionBend);
  const setGroupType=useWorkflowStore(s=>s.setGroupType);
  const setWorkflowTheme=useWorkflowStore(s=>s.setWorkflowTheme);
  const resetDiagramLayout=useWorkflowStore(s=>s.resetDiagramLayout);
  const deleteTransition=useWorkflowStore(s=>s.deleteTransition);
  const seedStressTest=useWorkflowStore(s=>s.seedStressTest);
  const users=useWorkflowStore(s=>s.users), properties=useWorkflowStore(s=>s.properties), rules=useWorkflowStore(s=>s.rules);
  const addUser=useWorkflowStore(s=>s.addUser), updateUser=useWorkflowStore(s=>s.updateUser), deleteUser=useWorkflowStore(s=>s.deleteUser);
  const addProperty=useWorkflowStore(s=>s.addProperty), updateProperty=useWorkflowStore(s=>s.updateProperty), deleteProperty=useWorkflowStore(s=>s.deleteProperty);
  const addRule=useWorkflowStore(s=>s.addRule), updateRule=useWorkflowStore(s=>s.updateRule), deleteRule=useWorkflowStore(s=>s.deleteRule);
  const hoveredState=useWorkflowStore(s=>s.hoveredState), setHoveredState=useWorkflowStore(s=>s.setHoveredState);
  const hoveredTransition=useWorkflowStore(s=>s.hoveredTransition), setHoveredTransition=useWorkflowStore(s=>s.setHoveredTransition);
  const setCmdPaletteOpen=useWorkflowStore(s=>s.setCmdPaletteOpen);
  const mfServer=useWorkflowStore(s=>s.mfServer), setMfServer=useWorkflowStore(s=>s.setMfServer);
  const mfVault=useWorkflowStore(s=>s.mfVault), setMfVault=useWorkflowStore(s=>s.setMfVault);
  const mfAuth=useWorkflowStore(s=>s.mfAuth), setMfAuth=useWorkflowStore(s=>s.setMfAuth);
  const setStudioResetHandler=useWorkflowStore(s=>s.setStudioResetHandler);

  const [mode,setMode]=useState('manual');
  const [nlpText,setNlpText]=useState(''), [aiText,setAiText]=useState('');
  const [aiKey,setAiKey]=useState(''), [aiModel,setAiModel]=useState('claude-sonnet-4-5');
  const [cacooId,setCacooId]=useState(''), [cacooKey,setCacooKey]=useState('');
  const [log,setLog]=useState([]), [busy,setBusy]=useState(false);
  const [sel,setSel]=useState(''), [selTrans,setSelTrans]=useState(null); // selTrans: {fromId,toId} | null
  const [styleOpenFor,setStyleOpenFor]=useState(null); // state id whose cosmetic-style row is expanded, or null
  // Off by default, every load — local component state, never persisted (no
  // localStorage, not in useWorkflowStore). CommandCenter never unmounts while
  // switching sections (see AppShell.jsx's own comment on why), so this survives
  // a quick tab-away-and-back within a session but always resets on a real reload.
  const [animateFlow,setAnimateFlow]=useState(false);
  const [centerView,setCenterView]=useState('diagram');
  // Compare PNG — upload real Conformity workflow screenshots and view them
  // beside the live Mermaid diagram. Fixed upload order only, deliberately —
  // the original's drag-to-reorder never worked reliably and is out of scope
  // here, not just hidden.
  const [pngCompareItems,setPngCompareItems]=useState([]);
  const [pngCompareLayout,setPngCompareLayout]=useState('horizontal');
  const edgeMapRef=useRef([]);
  const [saveFlash,setSaveFlash]=useState(false), [saved,setSaved]=useState(false);
  const [mfLog,setMfLog]=useState([]), [mfBusy,setMfBusy]=useState(false), [mfOk,setMfOk]=useState(null);
  const [mfAdv,setMfAdv]=useState(false);
  const [mfUser,setMfUser]=useState(''), [mfPass,setMfPass]=useState('');
  const [open,setOpen]=useState({states:true,trans:true,users:false,props:false,rules:false});
  const [stateFilter,setStateFilter]=useState(''), [transFilter,setTransFilter]=useState('');
  const [leftOpen,setLeftOpen]=useState(true);
  const [rightOpen,setRightOpen]=useState(false);
  const [zoom,setZoom]=useState(1);
  // Bumped by resetDiagramLayout so the diagram effect re-runs even though
  // mermaidStr itself doesn't change (x/y/bend are layout-only overrides,
  // not part of the states/transitions shape useMermaid derives its string from).
  const [layoutResetTick,setLayoutResetTick]=useState(0);
  const [mfPushQueue,setMfPushQueue]=useState([]);
  const [mfPullQueue,setMfPullQueue]=useState([]);
  const [mfVaultWorkflows,setMfVaultWorkflows]=useState([]);
  const [syncMode,setSyncMode]=useState('export');
  const [canScrollUp,setCanScrollUp]=useState(false);
  const [canScrollDown,setCanScrollDown]=useState(false);
  const [showEdgeSearch,setShowEdgeSearch]=useState(false);

  const addPngCompareFiles=(fileList)=>{
    const files=Array.from(fileList||[]).filter(f=>f.type.startsWith('image/'));
    const next=files.map(f=>({id:mkId(),name:f.name,url:URL.createObjectURL(f)}));
    if(next.length)setPngCompareItems(prev=>[...prev,...next]);
  };
  const removePngCompareItem=(id)=>{
    setPngCompareItems(prev=>{
      const found=prev.find(i=>i.id===id);
      if(found)URL.revokeObjectURL(found.url);
      return prev.filter(i=>i.id!==id);
    });
  };
  const clearPngCompareItems=()=>{
    setPngCompareItems(prev=>{
      prev.forEach(i=>URL.revokeObjectURL(i.url));
      return [];
    });
  };

  const wf=getActive(), mermaidStr=useMermaid(wf);
  // applyGatewayDiamonds reads wf.groups directly (decision/automatic is a rendering-only
  // choice, never embedded in mermaidStr) — this key forces the diagram effect to redo the
  // diamond pass when a gateway's type toggles, even though the mermaid text itself didn't change.
  const groupsTypeKey=(wf?.groups||[]).map(g=>`${g.id}:${g.type}`).join('|');
  // applyGatewayDiamonds also reads wf.theme directly for diamond fill/stroke — same
  // reasoning as groupsTypeKey above, since the theme's effect on the diamonds is a
  // JS-side rendering choice, not something embedded in mermaidStr.
  const themeKey=wf?.theme||DEFAULT_CANVAS_THEME;
  // applyStateAnnotations reads badge/badgeColor/markerType directly — none of the
  // three touch mermaidStr (state.color does, via useMermaid's own stateKey, so it's
  // not repeated here), so they need the same "force the effect to redo the custom
  // SVG pass" treatment as groupsTypeKey/themeKey above.
  const annotationsKey=(wf?.states||[]).map(s=>`${s.id}:${s.badge||''}:${s.badgeColor||''}:${s.markerType?1:0}`).join('|');
  const filteredStates=(wf?.states||[]).filter(s=>!stateFilter||s.name.toLowerCase().includes(stateFilter.toLowerCase()));
  const filteredTrans=(wf?.transitions||[]).filter(t=>!transFilter||t.from.toLowerCase().includes(transFilter.toLowerCase())||t.to.toLowerCase().includes(transFilter.toLowerCase()));
  const {exportJSON}=useExport();
  const diagRef=useRef(null), rcRef=useRef(0), zoomRef=useRef(1), wrapRef=useRef(null);
  const leftBodyRef=useRef(null);
  const logRef=useRef(null), mfLogRef=useRef(null);
  const logTailRef=useRef(null), mfLogTailRef=useRef(null);
  const logFollowRef=useRef(true), mfLogFollowRef=useRef(true);
  const tog=k=>setOpen(o=>({...o,[k]:!o[k]}));
  const addLog=(msg,t='info')=>setLog(p=>[...p,{msg,t,ts:TS()}]);
  const addMfLog=(msg,t='info')=>setMfLog(p=>[...p,{msg,t,ts:TS()}]);

  const keepLogAtBottom=(el, followRef)=>{
    if(!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 16;
    followRef.current = nearBottom;
  };

  const updateLeftScrollState=()=>{
    const el=leftBodyRef.current;
    if(!el){setCanScrollUp(false);setCanScrollDown(false);return;}
    setCanScrollUp(el.scrollTop>2);
    setCanScrollDown(el.scrollTop+el.clientHeight<el.scrollHeight-2);
  };

  const scrollLeftPanel=(delta)=>{
    const el=leftBodyRef.current;
    if(!el) return;
    el.scrollBy({top:delta,behavior:'smooth'});
  };

  useEffect(()=>{updateLeftScrollState();},[open.states,open.trans,open.users,open.props,open.rules,workflows.length,activeId,mode]);
  // Active workflow changed (tab click, add, delete, import) — clear any
  // selection/highlight left over from the previous workflow's diagram.
  useEffect(()=>{setSel('');setSelTrans(null);},[activeId]);
  useLayoutEffect(()=>{
    if(logFollowRef.current) logTailRef.current?.scrollIntoView({block:'end'});
  },[log.length,busy]);
  useLayoutEffect(()=>{
    if(mfLogFollowRef.current) mfLogTailRef.current?.scrollIntoView({block:'end'});
  },[mfLog.length,mfBusy,mfOk]);

  useEffect(()=>{
    if(!mermaidStr||centerView!=='diagram'){
      // Always clear the diagram container on tab switch to a workflow with no states.
      // diagRef.current may be null here (JSX conditionally unmounts it when !mermaidStr)
      // so we target the wrapper directly instead.
      if(diagRef.current) diagRef.current.innerHTML='';
      return;
    }
    let dead=false;
    (async()=>{
      const m=await loadMermaid(); rcRef.current++; const id=`cc${rcRef.current}`;
      try{
        const{svg}=await m.render(id,mermaidStr);
        if(!dead&&diagRef.current){
          // Build edge map BEFORE addClicks so it's ready for click handlers
          const map=buildEdgeMap(mermaidStr);
          edgeMapRef.current=map;
          diagRef.current.innerHTML=svg;
          // Override Mermaid's inline style="max-width:Xpx" — JS .style wins over
          // both stylesheet rules and Mermaid's own style attribute.
          const svgEl=diagRef.current.querySelector('svg');
          if(svgEl){
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.maxWidth='none';
            // Use intrinsic width from viewBox so it scales naturally, default to 800 if missing
            const vb = svgEl.viewBox.baseVal;
            const baseW = (vb && vb.width > 0) ? vb.width : 800;
            svgEl.dataset.baseWidth = baseW;
            svgEl.dataset.currentZoom = zoomRef.current;
            svgEl.style.width=`${baseW * zoomRef.current}px`;
            svgEl.style.height='auto';
            svgEl.style.display='block';
            svgEl.style.margin='0 auto';
          }
          // Swap any promoted-gateway node's box for a diamond before anything else
          // reads node shape/classList — addClicks and enableNodeDrag both check for
          // the .gw-node class this adds to skip treating a diamond as a real state.
          applyGatewayDiamonds(diagRef.current,wf);
          applyStateAnnotations(diagRef.current,wf);
          highlightNode(diagRef.current,sel);
          // Re-apply any previously-dragged node positions / bent edges before
          // building click hitboxes, so hitbox geometry matches what's on screen.
          const layoutModel=applyManualLayout(diagRef.current,wf);
          addClicks(diagRef.current, name=>{setSel(name);setSelTrans(null);}, name=>setHoveredState(name));
          enableEdgeInteraction(
            diagRef.current,
            layoutModel,
            entry=>{
              setSelTrans(entry);
              setSel('');
              setOpen(o=>({...o,trans:true}));
              setTimeout(()=>{
                const fromName=entry.fromId.replace(/_/g,' ');
                const toName=entry.toId.replace(/_/g,' ');
                const rows=document.querySelectorAll('.trans-row');
                rows.forEach(row=>{
                  const inputs=row.querySelectorAll('input');
                  if(inputs[0]?.value===fromName&&inputs[1]?.value===toName){
                    row.scrollIntoView({behavior:'smooth',block:'nearest'});
                  }
                });
              },50);
            },
            (transId,x,y)=>updateTransitionBend(wf.id,transId,x,y),
            entry=>{
              if(!entry){setHoveredTransition(null);return;}
              setHoveredTransition(entry.fromId.replace(/_/g,' '),entry.toId.replace(/_/g,' '));
            }
          );
          enableNodeDrag(diagRef.current,layoutModel,
            (stateId,x,y)=>updateStatePosition(wf.id,stateId,x,y));
          // Runs last, purely additive — never affects hit-testing/geometry the
          // steps above already finished building.
          if(animateFlow) applyEdgeFlowAnimation(diagRef.current,wf,layoutModel);
        }
      }catch{if(!dead&&diagRef.current)diagRef.current.innerHTML=`<div style="color:var(--red);font-size:11px;padding:16px">Diagram error</div>`;}
    })();
    return()=>{dead=true;};
  }, [mermaidStr, centerView, leftOpen, layoutResetTick, groupsTypeKey, themeKey, annotationsKey, animateFlow]);

  // Handle Bi-Directional Diagram Highlighting (table -> diagram direction;
  // the diagram -> table direction is addClicks'/enableEdgeInteraction's
  // onNodeHover/onEdgeHover callbacks above).
  //
  // Both lookups below were confirmed broken by direct DOM inspection
  // (2026-08-13 audit) and fixed against the real current output, not a new
  // guess: Mermaid's real node id is `state-<name>-<index>` (never the plain
  // sanitized name), and real transition edges carry no LS-/LE- classes at
  // all on this Mermaid version (confirmed: `class="edge-thickness-normal
  // transition"` only) — there is no per-edge wrapper element either, so the
  // edge lookup reuses the same fromId/toId -> rendered-index resolution
  // (edgeMapRef, built from the raw mermaid text in declaration order) the
  // already-working click-based highlightEdge relies on, and .highlight is
  // added directly to the path element itself.
  useEffect(() => {
    if (!diagRef.current) return;
    diagRef.current.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    const svg = diagRef.current.querySelector('svg');
    if (hoveredState && svg) {
      const id = hoveredState.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
      const node = svg.querySelector(`[id^="state-${id}-"]`);
      if (node) node.classList.add('highlight');
    }
    if (hoveredTransition?.from && hoveredTransition?.to && svg) {
      const f = hoveredTransition.from.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
      const t = hoveredTransition.to.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
      const transPaths = [...svg.querySelectorAll('path.transition')].filter(p => !p.getAttribute('marker-start'));
      const matchIdx = edgeMapRef.current.findIndex(e => e.fromId === f && e.toId === t);
      if (matchIdx >= 0 && transPaths[matchIdx]) transPaths[matchIdx].classList.add('highlight');
    }
  }, [hoveredState, hoveredTransition, mermaidStr, zoom]);

  // ── Sync Logic (M-Files) ──────────────────────────────────────────────
  // Uses a non-passive listener so e.preventDefault() can suppress browser zoom.
  // zoomRef keeps the value accessible inside the setZoom updater (closure-safe).
  useEffect(()=>{
    const el=wrapRef.current; if(!el) return;
    const onWheel=(e)=>{
      if(!e.ctrlKey) return;
      e.preventDefault();
      setZoom(z=>{
        // scroll up (deltaY<0) = zoom in ×1.12, scroll down = zoom out ×0.90
        const next=Math.min(4,Math.max(0.25,z*(e.deltaY<0?1.12:0.90)));
        zoomRef.current=next;
        return next;
      });
    };
    el.addEventListener('wheel',onWheel,{passive:false});
    return()=>el.removeEventListener('wheel',onWheel);
  },[]);

  // Click-drag empty canvas to pan (scroll) the diagram — mousedown on a
  // node, an edge's ghost-overlay hitbox, or any other interactive element
  // is left alone (those already have their own mousedown handlers for
  // node-drag / edge-bend; this only engages on the plain background).
  useEffect(()=>{
    const el=wrapRef.current; if(!el) return;
    const PAN_THRESHOLD=5;
    const onMouseDown=(e)=>{
      if(e.target.closest('.node')||e.target.closest('.ghost-overlay')||e.button!==0) return;
      const startX=e.clientX, startY=e.clientY;
      const startScrollLeft=el.scrollLeft, startScrollTop=el.scrollTop;
      let panning=false;
      const onMove=(ev)=>{
        const dx=ev.clientX-startX, dy=ev.clientY-startY;
        if(!panning && Math.hypot(dx,dy)>PAN_THRESHOLD){ panning=true; el.classList.add('panning'); }
        if(!panning) return;
        el.scrollLeft=startScrollLeft-dx;
        el.scrollTop=startScrollTop-dy;
      };
      const onUp=()=>{
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
        el.classList.remove('panning');
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    };
    el.addEventListener('mousedown',onMouseDown);
    return()=>el.removeEventListener('mousedown',onMouseDown);
  },[centerView]);

  // Apply zoom to the live SVG whenever zoom state changes
  useEffect(()=>{
    zoomRef.current=zoom;
    const svgEl=diagRef.current?.querySelector('svg');
    if(svgEl) {
      const baseW = parseFloat(svgEl.dataset.baseWidth) || 800;
      svgEl.dataset.currentZoom = zoom;
      svgEl.style.width=`${baseW * zoom}px`;
    }
  },[zoom]);

  // Reset zoom to 100% when switching workflows
  useEffect(()=>{ setZoom(1); zoomRef.current=1; },[activeId]);

  useEffect(()=>{if(diagRef.current)highlightNode(diagRef.current,sel);},[sel]);
  useEffect(()=>{
    if(!diagRef.current) return;
    if(selTrans==null){
      const svg=diagRef.current.querySelector('svg');
      svg?.querySelectorAll('path.transition').forEach(p=>{
        if(!p.getAttribute('marker-start')){
          p.style.stroke=''; p.style.filter='';
        }
      });
    } else {
      // Pass edgeMap from ref so highlightEdge can find the correct SVG edge by name
      highlightEdge(diagRef.current,selTrans,edgeMapRef.current);
    }
  },[selTrans]);

  const changeMode=m=>{setMode(m);setLog([]);setSel('');};
  const applyExtracted=r=>{
    importWorkflow(r);
    setOpen({states:true,trans:true,users:!!r.users.length,props:!!r.properties.length,rules:!!r.rules.length});
    setCenterView('diagram');
  };
  const runNLP=async()=>{
    if(!nlpText.trim())return; setBusy(true);setLog([]);
    addLog('Parsing…'); await delay(300);
    const r=parseNLP(nlpText);
    if(!r.workflow.states.length){addLog('No ### States table found','error');setBusy(false);return;}
    addLog(`States: ${r.workflow.states.length} · Transitions: ${r.workflow.transitions.length}`,'ok');
    if(r.users.length)addLog(`Users: ${r.users.length}`,'ok');
    if(r.properties.length)addLog(`Properties: ${r.properties.length}`,'ok');
    if(r.rules.length)addLog(`Rules: ${r.rules.length}`,'ok');
    applyExtracted(r); addLog('Loaded ✓','ok'); setBusy(false);
  };
  const runAI=async()=>{
    if(!aiText.trim())return;
    if(!aiKey.trim()){addLog('Paste Claude API key first','error');return;}
    setBusy(true);setLog([]);addLog('Sending to Claude…');
    try{
      let js;
      if(window.sow?.claudeExtract){
        const res=await window.sow.claudeExtract({apiKey:aiKey.trim(),model:aiModel,systemPrompt:AI_SYSTEM,text:aiText.trim()});
        if(!res.ok)throw new Error(res.error); js=res.json;
      }else{
        const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':aiKey.trim(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:aiModel,max_tokens:4096,system:AI_SYSTEM,messages:[{role:'user',content:aiText.trim()}]})});
        if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
        const d=await res.json(); js=(d.content?.[0]?.text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
      }
      addLog('Parsing JSON…');
      const obj=JSON.parse(js);
      if(!obj.workflow?.states?.length)throw new Error('No states in response');
      const r={name:obj.workflow.name||'AI Extracted',workflow:{name:obj.workflow.name||'AI Extracted',states:(obj.workflow.states||[]).map(s=>({id:mkId(),...s})),transitions:(obj.workflow.transitions||[]).map(t=>({id:mkId(),...t}))},users:(obj.users||[]).map(u=>({id:mkId(),...u})),properties:(obj.properties||[]).map(p=>({id:mkId(),...p})),rules:(obj.rules||[]).map(r=>({id:mkId(),...r}))};
      addLog(`States: ${r.workflow.states.length} · Transitions: ${r.workflow.transitions.length}`,'ok');
      applyExtracted(r); addLog('Loaded ✓','ok');
    }catch(e){addLog(`Error: ${e.message}`,'error');}
    setBusy(false);
  };
  const runCacoo=async()=>{
    if(!cacooId.trim()){addLog('Enter Diagram ID','error');return;}
    setBusy(true);setLog([]);addLog(`Fetching ${cacooId}…`);
    try{
      let obj;
      if(window.sow?.cacooFetch){const res=await window.sow.cacooFetch({diagramId:cacooId,apiKey:cacooKey});if(!res.ok)throw new Error(res.error);obj=res.raw;}
      else{const res=await fetch(`http://localhost:5000/api/cacoo-fetch?diagramId=${encodeURIComponent(cacooId)}&apiKey=${encodeURIComponent(cacooKey)}`,{signal:AbortSignal.timeout(15000)});if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error||`HTTP ${res.status}`);}obj=await res.json();}
      if(!obj.workflow?.states?.length)throw new Error('No states returned');
      const r={name:obj.workflow.name||`Cacoo: ${cacooId}`,workflow:{name:obj.workflow.name||`Cacoo: ${cacooId}`,states:(obj.workflow.states||[]).map(s=>({id:mkId(),...s})),transitions:(obj.workflow.transitions||[]).map(t=>({id:mkId(),...t}))},users:(obj.users||[]).map(u=>({id:mkId(),...u})),properties:(obj.properties||[]).map(p=>({id:mkId(),...p})),rules:(obj.rules||[]).map(r=>({id:mkId(),...r}))};
      applyExtracted(r); addLog('Loaded ✓','ok');
    }catch(e){addLog(`Error: ${e.message}`,'error');}
    setBusy(false);
  };
  const handleReset=()=>{resetAll();setLog([]);setSel('');setSelTrans(null);setMfLog([]);setMfOk(null);setSaved(false);setStateFilter('');setTransFilter('');};
  // Registers with the store so AppShell's tier-1 Reset button (rendered
  // outside Studio) can trigger this without lifting Studio's local UI state.
  useEffect(()=>{setStudioResetHandler(handleReset);});
  const handleSave=()=>{exportJSON();setSaved(true);setSaveFlash(true);setTimeout(()=>setSaveFlash(false),2000);};
  const handleSOW=()=>{if(wf?.states.length)dl(buildSOW(wf,users,properties,rules),`${(wf.name||'sow').replace(/\s+/g,'_')}.md`);};
  const handlePRD=()=>{if(wf?.states.length)dl(buildPRD(wf,users,properties,rules),`${(wf.name||'prd').replace(/\s+/g,'_')}_PRD.md`);};
  const handleMfFetch=async()=>{
    if(!mfVault.trim()){addMfLog('Vault GUID is required','error');return;}
    setMfBusy(true);setMfLog([]);setMfPullQueue([]);addMfLog('Fetching available workflows...');
    try{
      const res=await window.mfiles.listWorkflows({
        vaultGuid:mfVault,server:mfServer,authType:mfAuth,username:mfUser,password:mfPass
      });
      if(!res.ok) throw new Error(res.error||'Fetch failed');
      const fetched=(res.workflows||[])
        .map(w=>({id:Number(w?.id),name:String(w?.name||'').trim()}))
        .filter(w=>Number.isFinite(w.id)&&w.name);
      const seen=new Set();
      const unique=fetched.filter(w=>{
        if(seen.has(w.id)) return false;
        seen.add(w.id);
        return true;
      });
      setMfVaultWorkflows(unique);
      addMfLog(`Found ${unique.length} workflows`,'ok');
    }catch(e){addMfLog(e.message,'error');}
    finally{setMfBusy(false);}
  };

  const handleMfPull=async()=>{
    if(!mfVault.trim()){addMfLog('Vault GUID is required','error');return;}
    if(!mfPullQueue.length)return;
    setMfBusy(true);setMfLog([]);addMfLog(`Pulling ${mfPullQueue.length} workflows...`);
    window.mfiles.onProgress(m=>addMfLog(m));
    try{
      const res=await window.mfiles.pullWorkflows({
        workflowIds:mfPullQueue,vaultGuid:mfVault,server:mfServer,authType:mfAuth,username:mfUser,password:mfPass
      });
      if(!res.ok) throw new Error(res.error||'Pull failed');
      (res.workflows||[]).forEach(w=>useWorkflowStore.getState().seedImportedWorkflow(w));
      addMfLog(`Successfully pulled ${(res.workflows||[]).length} workflows into tabs`,'ok');
      setMfPullQueue([]);
    }catch(e){addMfLog(e.message,'error');}
    finally{
      setMfBusy(false);
      try{ window.mfiles.offProgress(); }catch(e){}
    }
  };

  const handleMfPush=async()=>{
    if(!mfVault.trim()){addMfLog('Vault GUID is required','error');return;}
    if(!mfPushQueue.length)return;
    if(!window.mfiles){addMfLog('window.mfiles not found — run in Electron','error');return;}
    setMfBusy(true);setMfLog([]);setMfOk(null);
    addMfLog(`Staging ${mfPushQueue.length} workflows for push...`);
    window.mfiles.onProgress(msg=>addMfLog(msg));
    try{
      for(const id of mfPushQueue){
        const targetWf=workflows.find(w=>w.id===id);
        if(!targetWf)continue;
        addMfLog(`Pushing "${targetWf.name}"...`);
        const json={
          name: targetWf.name||'Unnamed Workflow',
          states: targetWf.states.map(s=>({name:s.name, initial:!!s.initial})),
          transitions: targetWf.transitions.map(t=>({from:t.from, to:t.to, ...(t.conditions?{conditions:t.conditions}:{}), ...(t.permissions?{allowedUsers:t.permissions}:{})})),
        };
        const res=await window.mfiles.pushWorkflow({json,vaultGuid:mfVault,server:mfServer,authType:mfAuth,username:mfUser,password:mfPass});
        if(!res.ok) throw new Error(`${targetWf.name}: ${res.error||'Unknown push error'}`);
      }
      setMfOk(true);
      addMfLog('All staged workflows pushed successfully','ok');
      setMfPushQueue([]);
    }catch(e){
      setMfOk(false);
      addMfLog(e.message,'error');
    }finally{
      setMfBusy(false);
      try{ window.mfiles.offProgress(); }catch(e){}
    }
  };

  const hasStates=!!wf?.states.length;
  // selTrans is now {fromId,toId} — convert underscored IDs back to display names for the header
  const selTransObj=selTrans!=null
    ?{from:selTrans.fromId.replace(/_/g,' '),to:selTrans.toId.replace(/_/g,' ')}
    :null;
  // Toolbar Palette (beside the theme selector) mirrors the per-row "Cosmetic
  // style…" popover's fields exactly — same state.color/badge/badgeColor data,
  // just reachable without opening a table row first.
  const selStateObj=sel?wf?.states.find(s=>s.name===sel):null;

  return (
      <div className="cc-body" style={{gridTemplateColumns:`${leftOpen?'35%':'0px'} 1fr ${rightOpen?'20%':'0px'}`}}>

        {/* ═══ LEFT — INPUT ═══ */}
        <div className={`cc-left${leftOpen?'':' left-collapsed'}`}>
          {/* Workflow name */}
          {wf&&<div className="cc-wf-bar">
            <input className="cc-wf-name-input" value={wf.name} placeholder="Workflow name…"
              onChange={e=>renameWorkflow(activeId,e.target.value)}/>
            <button className="xb" onClick={()=>{clearWorkflow(activeId);setSel('');}}>↺</button>
          </div>}

          {/* Ingestion source toggle — scoped to Studio, not app-level navigation */}
          <div className="cc-source-row">
            <span className="cc-source-lbl">Source</span>
            <div className="cc-source-tabs">
              {MODES.map(([id,lbl])=>(
                <button key={id} className={`cc-mode-tab ${mode===id?`active-${id}`:''}`} onClick={()=>changeMode(id)}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Parse input panel (NLP / AI / Cacoo) */}
          {mode!=='manual'&&(
            <div className="parse-panel">
              {mode==='nlp'&&(<>
                <div className="parse-lbl">Paste Markdown SOW</div>
                <textarea className="parse-ta" rows={6} value={nlpText} onChange={e=>setNlpText(e.target.value)} placeholder={'## Workflow: Contract Lifecycle\n\n### States\n| State Name | Initial |\n| Draft | Yes |\n\n### Transitions\n| From | To |\n| Draft | Under Review |'}/>
                <button className="xb blue" onClick={runNLP} disabled={!nlpText.trim()||busy}>{busy?<><span className="spin"/>  Parsing…</>:'◈ Parse with NLP'}</button>
              </>)}
              {mode==='ai'&&(<>
                <div className="parse-lbl">Claude API Key</div>
                <div style={{display:'flex',gap:6}}>
                  <input className="parse-input" type="password" value={aiKey} onChange={e=>setAiKey(e.target.value)} placeholder="sk-ant-…" style={{flex:1}}/>
                  <select value={aiModel} onChange={e=>setAiModel(e.target.value)} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:4,padding:'0 6px',fontFamily:'var(--mono)',fontSize:9.5,color:'var(--text)',outline:'none'}}>
                    <option value="claude-sonnet-4-5">Sonnet 4.5</option>
                    <option value="claude-opus-4-5">Opus 4.5</option>
                    <option value="claude-haiku-3-5">Haiku 3.5</option>
                  </select>
                </div>
                <div className="parse-lbl" style={{marginTop:4}}>Paste SOW Text</div>
                <textarea className="parse-ta" rows={5} value={aiText} onChange={e=>setAiText(e.target.value)} placeholder="Paste any SOW, requirements doc, or workflow description…"/>
                <button className="xb purple" onClick={runAI} disabled={!aiText.trim()||!aiKey.trim()||busy}>{busy?<><span className="spin"/>  Extracting…</>:'✦ Extract with Claude'}</button>
              </>)}
              {mode==='cacoo'&&(<>
                <div className="parse-lbl">Cacoo Diagram ID</div>
                <input className="parse-input" value={cacooId} onChange={e=>setCacooId(e.target.value)} placeholder="e.g. AbCdEf12"/>
                <div className="parse-lbl" style={{marginTop:4}}>API Key (optional)</div>
                <input className="parse-input" type="password" value={cacooKey} onChange={e=>setCacooKey(e.target.value)} placeholder="Cacoo API token…"/>
                <button className="xb green" onClick={runCacoo} disabled={!cacooId.trim()||busy} style={{marginTop:4}}>{busy?<><span className="spin"/>  Fetching…</>:'⬡ Fetch from Cacoo'}</button>
                <div style={{fontSize:8.5,color:'var(--dim)',marginTop:4}}>Requires <code style={{color:'var(--a3)'}}>python backend/app.py</code> on :5000</div>
              </>)}
              {log.length>0&&<div className="log" ref={logRef} onScroll={()=>keepLogAtBottom(logRef.current, logFollowRef)} style={{marginTop:4}}>{log.map((l,i)=><div key={i} ref={i===log.length-1?logTailRef:null} className="ll"><span className="lt">{l.ts}</span><span className={l.t==='ok'?'lok':l.t==='warn'?'lwarn':l.t==='error'?'lerr':'linf'}>{l.msg}</span></div>)}</div>}
            </div>
          )}

          {/* Sections — States, Transitions, Users, Props, Rules */}
          <div className="cc-col-body" ref={leftBodyRef} onScroll={updateLeftScrollState}>
            {/* States */}
            <Sec icon="○" title="States" count={wf?.states.length||0} isOpen={open.states} onToggle={()=>tog('states')} onAdd={()=>wf&&addState(activeId)}
              filterSlot={open.states&&(
                <input className="sec-filter" placeholder="Filter states…" value={stateFilter}
                  onClick={e=>e.stopPropagation()}
                  onChange={e=>setStateFilter(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Escape')setStateFilter('');e.stopPropagation();}}/>
              )}>
              {wf?.states.length>0&&<table className="inline-mini"><thead><tr><th>Name</th><th style={{width:50}}>Initial</th><th style={{width:20}} title="Color, badge, predefined-process marker — cosmetic only, no effect on the exported workflow">Style</th><th style={{width:22}}/></tr></thead>
                <tbody>
                  {filteredStates.map(s=>(<Fragment key={s.id}>
                    <tr className={`${sel===s.name?'sel-row':''} ${hoveredState===s.name?'hover-row':''}`.trim()} onClick={()=>setSel(s.name)}
                      onMouseEnter={()=>setHoveredState(s.name)} onMouseLeave={()=>setHoveredState(null)}>
                      <td><input value={s.name} placeholder="State name…" onChange={e=>renameState(activeId,s.id,e.target.value)}/></td>
                      <td><div className="mini-check"><input type="checkbox" checked={!!s.initial} onChange={e=>updateState(activeId,s.id,{initial:e.target.checked})}/></div></td>
                      <td><button type="button" className={`mini-style ${styleOpenFor===s.id?'on':''}`} title="Cosmetic style…" onClick={e=>{e.stopPropagation();setStyleOpenFor(o=>o===s.id?null:s.id);}}><Palette size={11}/></button></td>
                      <td><button className="mini-del" onClick={e=>{e.stopPropagation();const r=deleteState(activeId,s.id);if(!r?.ok)alert(r?.error);}}>✕</button></td>
                    </tr>
                    {styleOpenFor===s.id&&(
                      <tr className="style-row" onClick={e=>e.stopPropagation()}>
                        <td colSpan={4}>
                          <div className="style-row-body">
                            <label title="Fills the state itself — the 'Fermé' pattern, a state colored as its own identity">
                              <span>Color</span>
                              <input type="color" value={s.color||'#3A7FD5'} onChange={e=>updateState(activeId,s.id,{color:e.target.value})}/>
                              {s.color&&<button type="button" className="style-clear" onClick={()=>updateState(activeId,s.id,{color:null})}>clear</button>}
                            </label>
                            <label title="Double-bar marker flagging an external-system handoff (e.g. ERP, OCR) — cosmetic only">
                              <input type="checkbox" checked={!!s.markerType} onChange={e=>updateState(activeId,s.id,{markerType:e.target.checked})}/>
                              <span>Predefined process</span>
                            </label>
                            <label title="Free-text floating caption above the state — doesn't touch its fill">
                              <span>Badge</span>
                              <input className="style-badge-text" value={s.badge||''} placeholder="e.g. Préfacture-style" onChange={e=>updateState(activeId,s.id,{badge:e.target.value})}/>
                              <input type="color" value={s.badgeColor||'#e07b1a'} onChange={e=>updateState(activeId,s.id,{badgeColor:e.target.value})}/>
                            </label>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>))}
                  <tr className="ghost-row"><td colSpan={4}>
                    {stateFilter
                      ?`${filteredStates.length} of ${wf.states.length} shown — ESC to clear`
                      :`─ ─  ${wf.states.length} state${wf.states.length!==1?'s':''} · click + Add for more  ─ ─`}
                  </td></tr>
                </tbody>
              </table>}
            </Sec>

            {/* Transitions */}
            <Sec icon="→" title="Transitions" count={wf?.transitions.length||0} isOpen={open.trans} onToggle={()=>tog('trans')} onAdd={()=>wf&&addTransition(activeId)}
              filterSlot={open.trans&&(
                <input className="sec-filter" placeholder="Filter transitions…" value={transFilter}
                  onClick={e=>e.stopPropagation()}
                  onChange={e=>setTransFilter(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Escape')setTransFilter('');e.stopPropagation();}}/>
              )}>
              {wf?.transitions.length>0&&<table className="inline-mini"><thead><tr><th>From</th><th>To</th><th title="Automatic-transition grammar only — after(Nd), if(Property=Value), script(Name), optional +priority(N) suffix. Manual/role()/permissions/esign stay out of scope for this tool (MfilesProperties.md Decision 7 addendum) — author those in M-Files Admin.">Condition</th><th style={{width:56}} title="Transitions sharing a Group value are a candidate gateway — see Gateways below">Group</th><th style={{width:22}}/></tr></thead>
                <tbody>
                  {filteredTrans.map((t)=>{
                    // Name-based match: immune to Mermaid SVG reordering
                    const fromId=t.from.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
                    const toId=t.to.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
                    const isSelected=selTrans!=null&&selTrans.fromId===fromId&&selTrans.toId===toId;
                    const isHovered=hoveredTransition?.from===t.from&&hoveredTransition?.to===t.to;
                    const parsedCondition=parseCondition(t.conditions);
                    return(<tr key={t.id} className={`trans-row ${isSelected?'sel-row':''} ${isHovered?'hover-row':''}`.trim()}
                      onMouseEnter={()=>setHoveredTransition(t.from, t.to)} onMouseLeave={()=>setHoveredTransition(null)}
                      onClick={()=>{
                        setSel('');
                        setSelTrans({fromId,toId});
                        setOpen(o=>({...o,trans:true}));
                      }}>
                      <td><input value={t.from} placeholder="From…" onClick={e=>e.stopPropagation()} onChange={e=>updateTransition(activeId,t.id,{from:e.target.value})}/></td>
                      <td><input value={t.to} placeholder="To…" onClick={e=>e.stopPropagation()} onChange={e=>updateTransition(activeId,t.id,{to:e.target.value})}/></td>
                      <td className="cond-cell">
                        <input value={t.conditions||''} placeholder="after(3d), if(P=V), script(Name)…" onClick={e=>e.stopPropagation()} onChange={e=>updateTransition(activeId,t.id,{conditions:e.target.value||null})}/>
                        {parsedCondition.kind==='unparsed'&&<TriangleAlert size={11} className="cond-unparsed-flag" title={describeCondition(parsedCondition)}/>}
                      </td>
                      <td><input value={t.group||''} placeholder="—" onClick={e=>e.stopPropagation()} onChange={e=>updateTransition(activeId,t.id,{group:e.target.value})}/></td>
                      <td><button className="mini-del" onClick={e=>{e.stopPropagation();deleteTransition(activeId,t.id);}}>✕</button></td>
                    </tr>);
                  })}
                  <tr className="ghost-row"><td colSpan={5}>
                    {transFilter
                      ?`${filteredTrans.length} of ${wf.transitions.length} shown — ESC to clear`
                      :`─ ─  ${wf.transitions.length} transition${wf.transitions.length!==1?'s':''} · click + Add for more  ─ ─`}
                  </td></tr>
                </tbody>
              </table>}
              {wf?.transitions.length>0&&(()=>{
                const promoted=computeGatewayGroups(wf.transitions);
                if(!promoted.length)return null;
                return(
                  <div className="gw-list">
                    <div className="gw-list-lbl" title="Two or more distinct 'From' states sharing a Group value can't collapse into one predecessor's fan-out, so they render as one diamond instead of separate arrows — mirrors the Translator's <<choice>> collapse/promote rule.">Gateways</div>
                    {promoted.map(g=>{
                      const type=(wf.groups||[]).find(x=>x.id===g.id)?.type==='automatic'?'automatic':'decision';
                      return(
                        <div key={g.id} className="gw-row">
                          <span className="gw-name">{g.id}</span>
                          <span className="gw-meta">{g.sources.length} src → {g.targets.length} branch{g.targets.length!==1?'es':''}</span>
                          <div className="gw-type-toggle">
                            <button type="button" className={type==='decision'?'on':''} title="Decision hub — human, exclusive choice" onClick={()=>setGroupType(activeId,g.id,'decision')}><Users size={12}/></button>
                            <button type="button" className={type==='automatic'?'on':''} title="Automatic hub — engine-evaluated branches" onClick={()=>setGroupType(activeId,g.id,'automatic')}><Cog size={12}/></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Sec>

            {/* Users */}
            <Sec icon="i" title="Users" count={users.length} isOpen={open.users} onToggle={()=>tog('users')} onAdd={addUser}>
              {users.length>0&&<table className="inline-mini"><thead><tr><th>Name</th><th>Role</th><th style={{width:36}}>CM</th><th style={{width:22}}/></tr></thead>
                <tbody>{users.map(u=>(<tr key={u.id}>
                  <td><input value={u.name} placeholder="Full name…" onChange={e=>updateUser(u.id,{name:e.target.value})}/></td>
                  <td><input value={u.role} placeholder="e.g. CEO" onChange={e=>updateUser(u.id,{role:e.target.value})}/></td>
                  <td><div className="mini-check"><input type="checkbox" checked={!!u.isCM} onChange={e=>updateUser(u.id,{isCM:e.target.checked})}/></div></td>
                  <td><button className="mini-del" onClick={()=>deleteUser(u.id)}>✕</button></td>
                </tr>))}</tbody>
              </table>}
            </Sec>

            {/* Properties */}
            <Sec icon="=" title="Properties" count={properties.length} isOpen={open.props} onToggle={()=>tog('props')} onAdd={addProperty}>
              {properties.length>0&&<table className="inline-mini"><thead><tr><th>Field Name</th><th style={{width:80}}>Type</th><th style={{width:36}}>Req.</th><th style={{width:22}}/></tr></thead>
                <tbody>{properties.map(p=>(<tr key={p.id}>
                  <td><input value={p.name} placeholder="Field name…" onChange={e=>updateProperty(p.id,{name:e.target.value})}/></td>
                  <td><select value={p.type} onChange={e=>updateProperty(p.id,{type:e.target.value})}>{['Text','Integer','Decimal','Date','Lookup','Boolean'].map(t=><option key={t}>{t}</option>)}</select></td>
                  <td><div className="mini-check"><input type="checkbox" checked={!!p.required} onChange={e=>updateProperty(p.id,{required:e.target.checked})}/></div></td>
                  <td><button className="mini-del" onClick={()=>deleteProperty(p.id)}>✕</button></td>
                </tr>))}</tbody>
              </table>}
            </Sec>

            {/* Rules */}
            <Sec icon="§" title="Business Rules" count={rules.length} isOpen={open.rules} onToggle={()=>tog('rules')} onAdd={addRule}>
              {rules.length>0&&<table className="inline-mini"><thead><tr><th>Rule</th><th style={{width:22}}/></tr></thead>
                <tbody>{rules.map(r=>(<tr key={r.id}>
                  <td><input value={r.text} placeholder="Business rule…" onChange={e=>updateRule(r.id,e.target.value)}/></td>
                  <td><button className="mini-del" onClick={()=>deleteRule(r.id)}>✕</button></td>
                </tr>))}</tbody>
              </table>}
            </Sec>
          </div>

          <div className="cc-left-scroll-arrows" aria-hidden={!leftOpen}>
            <button className="cc-scroll-arrow up" onClick={()=>scrollLeftPanel(-180)} disabled={!canScrollUp} title="Scroll up">▲</button>
            <button className="cc-scroll-arrow down" onClick={()=>scrollLeftPanel(180)} disabled={!canScrollDown} title="Scroll down">▼</button>
          </div>
        </div>

        {/* ═══ CENTER — LIVE DIAGRAM ═══ */}
        <div className="cc-center">
          <div className="cc-col-head">
            {/* Panel toggle — collapses/expands the left configuration panel */}
            <button className="panel-toggle" onClick={()=>setLeftOpen(o=>!o)}
              title={leftOpen?'Hide panel (more diagram space)':'Show panel'}>
              {leftOpen?'‹':'›'}
            </button>
            <span className="cc-col-lbl">
              {centerView==='compare' ? 'Conformity PNG Compare'
                : sel ? `State — ${sel}` : selTransObj ? `→ ${selTransObj.from} → ${selTransObj.to}` : 'Live Diagram'}
            </span>
            <div className="tab-row">
              {[['diagram','Diagram'],['compare','Compare PNG'],['json','JSON'],['stats','Stats']].map(([id,lbl])=>(
                <button key={id} className={`tab ${centerView===id?'on':''}`} onClick={()=>setCenterView(id)}>{lbl}</button>
              ))}
              {centerView==='diagram'&&wf&&(
                <button className="tab" onClick={()=>{
                  resetDiagramLayout(wf.id);
                  setZoom(1); zoomRef.current=1;
                  if(wrapRef.current){wrapRef.current.scrollTop=0;wrapRef.current.scrollLeft=0;}
                  setLayoutResetTick(t=>t+1);
                }}
                  title="Clear all dragged node positions and bent arrows — back to Mermaid's automatic layout">
                  ⟲ Auto-arrange
                </button>
              )}
              {centerView==='diagram'&&wf&&(
                <div className="theme-toggle" style={{marginLeft:6}}>
                  {CANVAS_THEMES.map(th=>(
                    <button key={th.id} type="button"
                      className={(wf.theme||DEFAULT_CANVAS_THEME)===th.id?'on':''}
                      title={th.description}
                      onClick={()=>setWorkflowTheme(wf.id,th.id)}>{th.label}</button>
                  ))}
                </div>
              )}
              {centerView==='diagram'&&wf&&(
                <div className="toolbar-palette" style={{marginLeft:6}}
                  title={selStateObj?`Style "${selStateObj.name}"`:'Select a state to style it'}>
                  <Palette size={11} style={{opacity:selStateObj?1:0.35,flexShrink:0}}/>
                  <input type="color" disabled={!selStateObj}
                    title="Fill — colors the state itself"
                    value={selStateObj?.color||'#3A7FD5'}
                    onChange={e=>selStateObj&&updateState(activeId,selStateObj.id,{color:e.target.value})}/>
                  <input className="style-badge-text" style={{width:84}} disabled={!selStateObj}
                    placeholder="Status label…"
                    title="Free-text floating caption above the state — doesn't touch its fill"
                    value={selStateObj?.badge||''}
                    onChange={e=>selStateObj&&updateState(activeId,selStateObj.id,{badge:e.target.value})}/>
                  <input type="color" disabled={!selStateObj}
                    title="Status label color"
                    value={selStateObj?.badgeColor||'#e07b1a'}
                    onChange={e=>selStateObj&&updateState(activeId,selStateObj.id,{badgeColor:e.target.value})}/>
                  {selStateObj&&(selStateObj.color||selStateObj.badge)&&(
                    <button type="button" className="style-clear"
                      onClick={()=>updateState(activeId,selStateObj.id,{color:null,badge:'',badgeColor:null})}>clear</button>
                  )}
                </div>
              )}
              {centerView==='diagram'&&wf&&(
                <button type="button" className={`tab ${animateFlow?'on':''}`} style={{marginLeft:6}}
                  onClick={()=>setAnimateFlow(a=>!a)}
                  title="Animate automatic transitions (branches of an 'Automatic hub' gateway) as traveling dots — manual transitions stay static since they only move when a human acts">
                  ▶ Animate
                </button>
              )}
              {/* Right panel toggle — mirrors left panel button */}
              <button className="panel-toggle" onClick={()=>setRightOpen(o=>!o)}
                title={rightOpen?'Hide Deliver panel':'Show Deliver panel'}
                style={{marginLeft:6}}>
                {rightOpen?'›':'‹'}
              </button>
            </div>
          </div>
          {centerView==='diagram'&&(
            <div className="diagram-wrap" ref={wrapRef} onClick={()=>{setSel('');setSelTrans(null);}}>
              {wf&&(
                /* Object palette — the Mermaid-side equivalent of BPMN's element
                   rail, deliberately limited to what a Mermaid stateDiagram
                   actually has: states (plain or initial). No Gateway/Pool/
                   Sub-Process tiles — those are either auto-derived from
                   transition fan-out (gateways) or don't exist in this model at
                   all; a Studio "Task" tile would just be a State by another
                   name, so it isn't duplicated as a second tile. Transitions
                   aren't click-to-place either, same reasoning BPMN's own
                   Connectors category uses — a transition needs two real
                   state endpoints, so it's added from the Transitions table. */
                <div className="studio-pal-rail" onClick={e=>e.stopPropagation()}>
                  <span className="studio-pal-rail-lbl">States</span>
                  <button type="button" className="studio-pal-tile" onClick={()=>addState(activeId)}>
                    <Plus size={13} strokeWidth={2}/><span>State</span>
                  </button>
                  <button type="button" className="studio-pal-tile" onClick={()=>addState(activeId,{initial:true})}>
                    <Play size={12} strokeWidth={2}/><span>Initial State</span>
                  </button>
                </div>
              )}
              {!mermaidStr
                ?<div key="empty" className="blueprint-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  <div className="blueprint-title">No Diagram Available</div>
                  <div className="blueprint-sub">{wf ? 'Add at least one state and mark it as "Initial" to begin building the diagram.' : 'Create a new workflow, parse a Markdown file, or import from M-Files to get started.'}</div>
                </div>
                :<div key="diagram" ref={diagRef} style={{width:'100%'}} onClick={e=>e.stopPropagation()}/>}
              {mermaidStr&&zoom!==1&&(
                <div className="zoom-badge" onClick={e=>e.stopPropagation()}>
                  <span>{Math.round(zoom*100)}%</span>
                  <button title="Reset zoom (Ctrl+Scroll)" onClick={()=>{setZoom(1);zoomRef.current=1;}}>⟳</button>
                </div>
              )}

              <div className={`cc-edge-search ${showEdgeSearch?'open':'closed'}`} onClick={e=>e.stopPropagation()}>
                {showEdgeSearch
                  ?<>
                    <button className="xb" onClick={()=>setCmdPaletteOpen(true)} title="Open search menu">⌕ Search</button>
                    <button className="cc-edge-toggle" onClick={()=>setShowEdgeSearch(false)} title="Hide search control">›</button>
                  </>
                  :<button className="cc-edge-toggle" onClick={()=>setShowEdgeSearch(true)} title="Show search control">‹</button>}
              </div>

              {mermaidStr&&zoom!==1&&<div className="cc-toolbar" onClick={e=>e.stopPropagation()}>
                <button className="xb" onClick={()=>{setZoom(1);zoomRef.current=1;if(wrapRef.current){wrapRef.current.scrollTop=0;wrapRef.current.scrollLeft=0;}}} title="Reset Zoom">⟳ Recenter</button>
              </div>}
            </div>
          )}
          {centerView==='compare'&&(
            <div className="png-compare-wrap">
              <div className="png-compare-controls">
                <label className="xb" htmlFor="png-compare-input">＋ Add PNG</label>
                <input
                  id="png-compare-input"
                  type="file"
                  accept="image/png,image/*"
                  multiple
                  style={{display:'none'}}
                  onChange={e=>{addPngCompareFiles(e.target.files);e.target.value='';}}
                />
                <div className="png-layout-toggle" role="group" aria-label="PNG compare layout">
                  <button type="button" className={`xb ${pngCompareLayout==='horizontal'?'blue':''}`}
                    onClick={()=>setPngCompareLayout('horizontal')}>Side by Side</button>
                  <button type="button" className={`xb ${pngCompareLayout==='vertical'?'blue':''}`}
                    onClick={()=>setPngCompareLayout('vertical')}>Vertical</button>
                </div>
                <button className="xb" disabled={!pngCompareItems.length} onClick={clearPngCompareItems} title="Remove all images">
                  Clear all
                </button>
              </div>
              {!pngCompareItems.length
                ?<div className="blueprint-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  <div className="blueprint-title">No PNGs added</div>
                  <div className="blueprint-sub">Add one or more Conformity PNG files to compare against the live diagram. Use Side by Side or Vertical layout.</div>
                </div>
                :<div className={`png-compare-list ${pngCompareLayout==='vertical'?'vertical':'horizontal'}`}>
                  {pngCompareItems.map(item=>(
                    <div key={item.id} className="png-compare-card">
                      <div className="png-compare-card-head">
                        <span className="png-compare-name" title={item.name}>{item.name}</span>
                        <div className="png-compare-card-actions">
                          <button className="mini-del" onClick={()=>removePngCompareItem(item.id)} title="Remove">✕</button>
                        </div>
                      </div>
                      <img className="png-compare-image" src={item.url} alt={item.name} draggable={false}/>
                    </div>
                  ))}
                </div>}
            </div>
          )}
          {centerView==='json'&&(
            <div className="cc-col-body" style={{padding:'14px 16px'}}>
              <pre style={{fontFamily:'var(--mono)',fontSize:10,lineHeight:1.7,color:'var(--text)',whiteSpace:'pre-wrap'}}>
                {wf?JSON.stringify(wf,null,2):'No workflow loaded'}
              </pre>
            </div>
          )}
          {centerView==='stats'&&(
            <div className="stats-grid">
              {[['States',wf?.states.length||0,'var(--a3)'],['Transitions',wf?.transitions.length||0,'var(--a3)'],['Users',users.length,'var(--green)'],['Properties',properties.length,'var(--green)'],['Rules',rules.length,'var(--gold)'],['Workflows',workflows.length,'var(--mid)']].map(([lbl,val,col])=>(
                <div key={lbl} className="stat-card">
                  <div className="stat-val" style={{color:col}}>{val}</div>
                  <div className="stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ RIGHT — DELIVER ═══ */}
        <div className={`cc-right${rightOpen?'':' right-collapsed'}`}>
          <div className="cc-col-head" style={{gap:8}}>
            <span className="cc-col-lbl">Deliver</span>
            {syncMode !== 'export' && <span className={`status-pulse ${mfBusy ? 'amber' : (mfVault ? 'green' : 'dim')}`} title={mfBusy ? 'Syncing...' : (mfVault ? 'Connected' : 'Disconnected')} />}
          </div>
          <div className="cc-col-body">

            {/* SOW */}
            <div className="deliver-section">
              <div className="deliver-section-lbl">Documents</div>
              <div className="deliver-row">
                <div className="deliver-icon">📄</div>
                <div className="deliver-info">
                  <div className="deliver-title">SOW</div>
                  <div className="deliver-sub">Statement of Work · .md</div>
                </div>
                <button className={`xb ${hasStates?'blue':''}`} disabled={!hasStates} onClick={handleSOW}>↓</button>
              </div>
              <div className="deliver-row">
                <div className="deliver-icon">📋</div>
                <div className="deliver-info">
                  <div className="deliver-title">PRD</div>
                  <div className="deliver-sub">Product Requirements · .md</div>
                </div>
                <button className={`xb ${hasStates?'green':''}`} disabled={!hasStates} onClick={handlePRD}>↓</button>
              </div>
            </div>

            {/* M-Files */}
            <div className="deliver-section">
              <div className="deliver-section-lbl">M-Files Sync</div>
              <button onClick={()=>setMfAdv(a=>!a)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--mid)',fontSize:9,fontFamily:'var(--mono)',padding:'2px 0',marginBottom:4,textAlign:'left'}}>
                {mfAdv?'▾':'▸'} Connection settings
              </button>
              {mfAdv&&<div className="mf-adv">
                <input className="mf-input" value={mfServer} onChange={e=>setMfServer(e.target.value)} placeholder="Server (localhost)"/>
                <input className="mf-input" value={mfVault} onChange={e=>setMfVault(e.target.value)} placeholder="Vault GUID"/>
                <div style={{display:'flex',gap:6}}>
                  <select value={mfAuth} onChange={e=>setMfAuth(e.target.value)} className="mf-input" style={{flex:1}}>
                    <option value="windows">Windows SSO</option>
                    <option value="mfiles">M-Files credentials</option>
                  </select>
                </div>
                {mfAuth==='mfiles'&&<>
                  <input className="mf-input" value={mfUser} onChange={e=>setMfUser(e.target.value)} placeholder="Username"/>
                  <input className="mf-input" type="password" value={mfPass} onChange={e=>setMfPass(e.target.value)} placeholder="Password"/>
                </>}
              </div>}

              {!mfVault.trim()&&<div style={{fontSize:8.5,color:'var(--red)',marginTop:4,lineHeight:1.6}}>A Vault GUID is required to connect.</div>}

              {/* Unified Sync Menu */}
              <div style={{marginTop:12,borderTop:'1px solid var(--border)',paddingTop:8}}>
                <div style={{fontSize:8.5,color:'var(--mid)',marginBottom:8}}>
                  Target vault: <span style={{color:mfVault.trim()?'var(--text)':'var(--red)'}}>{mfServer.trim() || 'not set'}</span>
                </div>
                <div style={{display:'flex',gap:4,marginBottom:8,background:'var(--s2)',padding:3,borderRadius:4,border:'1px solid var(--border)'}}>
                  <button onClick={()=>{setSyncMode('export');setMfOk(null);setMfLog([]);}} style={{flex:1,padding:'4px 0',fontSize:9,fontFamily:'var(--mono)',background:syncMode==='export'?'var(--s3)':'transparent',color:syncMode==='export'?'var(--text)':'var(--mid)',border:syncMode==='export'?'1px solid var(--border)':'1px solid transparent',borderRadius:3,cursor:'pointer',transition:'all 0.15s'}}>
                    Export to Vault
                  </button>
                  <button onClick={()=>{setSyncMode('import');setMfOk(null);setMfLog([]);setMfPullQueue([]);setMfVaultWorkflows([]);}} style={{flex:1,padding:'4px 0',fontSize:9,fontFamily:'var(--mono)',background:syncMode==='import'?'var(--s3)':'transparent',color:syncMode==='import'?'var(--text)':'var(--mid)',border:syncMode==='import'?'1px solid var(--border)':'1px solid transparent',borderRadius:3,cursor:'pointer',transition:'all 0.15s'}}>
                    Import from Vault
                  </button>
                </div>

                {syncMode==='export' && (
                  <div>
                    <SyncQueue available={workflows} queue={mfPushQueue} setQueue={setMfPushQueue} stagedLabel="Staged for Push" />
                    <button className={`xb ${saveFlash?'green':''}`} style={{width:'100%',padding:'6px 0',fontSize:10,marginTop:6}} onClick={handleSave} disabled={mfBusy||!mfVault.trim()||!mfPushQueue.length}>
                      {saveFlash?'✓ Saved':'Review & Save →'}
                    </button>
                    <button className={`xb ${mfOk===true?'green':mfOk===false?'red':'blue'}`} style={{width:'100%',padding:'6px 0',fontSize:10,marginTop:6}} onClick={handleMfPush} disabled={mfBusy||!saved||!mfVault.trim()||!mfPushQueue.length}>
                      {mfBusy?'Pushing…':mfOk===true?'✓ Pushed':mfOk===false?'✗ Retry Push':'→ Push Staged'}
                    </button>
                    {(!saved||!mfPushQueue.length||!mfVault.trim())&&<div style={{fontSize:8.5,color:'var(--mid)',marginTop:4,textAlign:'center'}}>
                      {!mfPushQueue.length?'Select at least one workflow to export':!mfVault.trim()?'Connect to a vault to continue':'Click “Review & Save” to enable push'}
                    </div>}
                  </div>
                )}

                {syncMode==='import' && (
                  <div>
                    {mfVaultWorkflows.length===0 ? (
                      <button className="xb" style={{width:'100%',padding:'6px 0',fontSize:10}} onClick={handleMfFetch} disabled={mfBusy||!mfVault.trim()}>
                        {mfBusy?'Fetching…':'Fetch Vault Workflows'}
                      </button>
                    ) : (
                      <>
                        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:4}}>
                          <button onClick={handleMfFetch} disabled={mfBusy||!mfVault.trim()} style={{background:'none',border:'none',color:'var(--a2)',cursor:'pointer',fontSize:9,fontFamily:'var(--mono)'}}>⟳ Refresh List</button>
                        </div>
                        <SyncQueue available={mfVaultWorkflows} queue={mfPullQueue} setQueue={setMfPullQueue} stagedLabel="Staged for Pull" />
                        <button className="xb green" style={{width:'100%',padding:'6px 0',fontSize:10,marginTop:6}} onClick={handleMfPull} disabled={mfBusy||!mfVault.trim()||!mfPullQueue.length}>
                          {mfBusy?'Pulling…':'← Pull Staged into Tabs'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {mfLog.length>0&&<div className="mf-log" ref={mfLogRef} onScroll={()=>keepLogAtBottom(mfLogRef.current, mfLogFollowRef)} style={{marginTop:12}}>{mfLog.map((l,i)=><div key={i} ref={i===mfLog.length-1?mfLogTailRef:null} className="ll"><span className="lt">{l.ts}</span><span className={l.t==='ok'?'lok':l.t==='error'?'lerr':'linf'}>{l.msg}</span></div>)}</div>}
            </div>
          </div>
        </div>
      </div>
  );
}

function Sec({icon,title,count,isOpen,onToggle,onAdd,filterSlot,children}){
  return(
    <div className="cc-sec">
      <div className="cc-sec-hd" onClick={onToggle}>
        <span className={`cc-sec-chev ${isOpen?'open':''}`}>▶</span>
        <span className="cc-sec-icon">{icon}</span>
        <span className="cc-sec-title">{title}</span>
        <span className="cc-sec-count">{count} rows</span>
        {filterSlot}
        <button className="cc-sec-add" onClick={e=>{e.stopPropagation();onAdd();}}>+ Add</button>
      </div>
      {isOpen&&<div>{children||<div style={{padding:'6px 12px 8px',fontSize:9,color:'var(--dim)',fontStyle:'italic'}}>No {title.toLowerCase()} yet — click + Add</div>}</div>}
    </div>
  );
}

function SyncQueue({ available, queue, setQueue, stagedLabel }) {
  const unqueued = available.filter(w => !queue.includes(w.id));
  return (
    <div className="q-list">
      {unqueued.length > 0 && (
        <div style={{maxHeight: 130, overflowY: unqueued.length > 5 ? 'auto' : 'visible'}}>
          {unqueued.map(w => (
            <div key={w.id} className="q-row">
              <span className="q-name">{w.name}</span>
              <button className="q-btn add" onClick={() => setQueue(q => [...q, w.id])}>+</button>
            </div>
          ))}
        </div>
      )}
      {queue.length > 0 && <div className="q-staged-lbl">{stagedLabel}</div>}
      {queue.map(id => {
        const w = available.find(x => x.id === id);
        if (!w) return null;
        return (
          <div key={w.id} className="q-row staged">
            <span className="q-name">{w.name}</span>
            <button className="q-btn del" onClick={() => setQueue(q => q.filter(x => x !== id))}>✕</button>
          </div>
        );
      })}
    </div>
  );
}
