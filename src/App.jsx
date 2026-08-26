import AppShell from './components/AppShell';
import CommandCenter from './components/CommandCenter';
import CommandPalette from './components/CommandPalette';

// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#030910;--s1:#07111F;--s2:#0A1828;--s3:#0E2038;--s4:#142848;
  --border:#162C4A;--bdr2:#1E3D60;
  --accent:#1565D8;--a2:#2478F0;--a3:#4A9FFF;
  --green:#00C870;--red:#FF3D5A;--gold:#F0A500;--purple:#7C5CFC;
  --text:#C8DCFF;--mid:#5878A0;--dim:#243A58;
  /* --mid2: an AA-passing stand-in for --mid/--dim, added 2026-08-22 UX pass.
     --mid measures 3.93:1 against --s2 and --dim measures ~1.4:1 against
     --s3 — both computed live via getComputedStyle, not guessed — well
     under WCAG AA's 4.5:1 for normal text. --mid2 measures ~5.4:1 against
     --s2 and ~5.0:1 against --s3. Scoped to the specific selectors that
     failed the live check (Process Docs toolbar/palette) rather than
     redefining --mid/--dim globally, which would recolor selectors never
     audited this pass. */
  --mid2:#6E90BE;
  --mono:'JetBrains Mono',monospace;--display:'Fraunces',serif;
}
html,body{height:100%;overflow:hidden}
body{background:var(--bg);color:var(--text);font-family:var(--mono);font-size:13px}

/* ── Command Center shell ── */
.cc-shell{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.cc-topbar{height:48px;flex-shrink:0;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 14px;gap:10px}
.cc-logo{font-family:var(--display);font-size:20px;font-weight:700;color:#fff;letter-spacing:-.5px;flex-shrink:0;user-select:none}
.cc-logo em{color:var(--a3);font-style:normal}
.cc-mode-tab{font-size:9.5px;font-family:var(--mono);padding:5px 12px;border-radius:4px;border:1px solid transparent;background:transparent;color:var(--mid);cursor:pointer;transition:all .15s}
.cc-mode-tab:hover{color:var(--text);border-color:var(--border)}
.cc-mode-tab.active-manual{color:var(--a3);background:rgba(74,159,255,.1);border-color:rgba(74,159,255,.3)}
.cc-mode-tab.active-nlp{color:var(--accent);background:rgba(21,101,216,.1);border-color:rgba(21,101,216,.3)}
.cc-mode-tab.active-ai{color:#A78BFA;background:rgba(124,92,252,.1);border-color:rgba(124,92,252,.3)}
.cc-mode-tab.active-cacoo{color:var(--green);background:rgba(0,200,112,.1);border-color:rgba(0,200,112,.3)}
.cc-body{flex:1;display:grid;grid-template-columns:35% 45% 20%;overflow:hidden;transition:grid-template-columns .28s cubic-bezier(.4,0,.2,1)}
.cc-left{display:flex;flex-direction:column;overflow:hidden;border-right:1px solid var(--border);background:rgba(7,17,31,0.85);backdrop-filter:blur(12px);transition:opacity .22s ease,border-color .28s ease;position:relative;z-index:2;box-shadow:4px 0 6px -1px rgba(0,0,0,.15)}
.cc-left.left-collapsed{opacity:0;pointer-events:none;border-right-color:transparent}
.cc-center{display:flex;flex-direction:column;overflow:hidden;border-right:1px solid var(--border);background:var(--bg);min-width:0}
.cc-right{display:flex;flex-direction:column;overflow:hidden;background:rgba(7,17,31,0.85);backdrop-filter:blur(12px);transition:opacity .22s ease;z-index:2}
.cc-right.right-collapsed{opacity:0;pointer-events:none}
.cc-col-head{padding:7px 12px;background:var(--s2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;min-height:36px}
.cc-col-lbl{font-size:9px;font-weight:600;color:var(--mid);letter-spacing:.8px;text-transform:uppercase}
.cc-col-body{flex:1;overflow-y:auto}
.cc-wf-bar{padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;flex-shrink:0;background:var(--s2)}
.cc-wf-name-input{flex:1;background:transparent;border:none;outline:none;font-family:var(--display);font-size:14px;font-weight:600;color:#fff}
.cc-wf-name-input::placeholder{color:var(--dim)}
/* SaveIndicator — shared by Studio's workflow-name bar and M-Files Flow's
   status line. Fades in/out via opacity only (no layout shift), so its
   presence never nudges neighboring controls. */
.save-indicator{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:9px;color:var(--green);opacity:0;transition:opacity .3s ease;pointer-events:none;flex-shrink:0}
.save-indicator.visible{opacity:1}
.cc-wf-tabs-wrap{display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--border);background:var(--s2);padding:4px 6px 0;flex-shrink:0}
.cc-wf-tabs{display:flex;overflow-x:auto;scroll-behavior:smooth;background:transparent;padding:0 2px;gap:2px;flex:1;min-width:0}
.cc-wf-tab{font-size:9px;font-family:var(--mono);color:var(--mid);padding:4px 6px;cursor:pointer;border:1px solid transparent;border-bottom:none;border-radius:3px 3px 0 0;background:transparent;white-space:nowrap;transition:all .15s;position:relative;top:1px;display:flex;align-items:center;gap:4px}
.cc-wf-tab-name{display:inline-block;max-width:40px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}
.cc-wf-tabs.expanded .cc-wf-tab-name{max-width:140px}
.cc-wf-tab:hover{color:var(--text);background:var(--s3)}
.cc-wf-tab.active{color:var(--text);background:var(--bg);border-color:var(--border)}
.cc-wf-tab-del{font-size:9px;color:var(--dim);background:none;border:none;cursor:pointer;padding:0 0 0 2px;line-height:1}
.cc-wf-tab-del:hover{color:var(--red)}
.cc-wf-tab.imported{border-top-color:var(--mid);color:var(--text)}
.cc-wf-tab.imported.active{border-top-color:var(--green);background:rgba(0,200,112,.05);color:var(--green)}
.cc-tab-expand{width:20px;height:20px;border-radius:4px;border:1px solid var(--border);background:linear-gradient(180deg,var(--s3),var(--s2));color:var(--mid);font-size:10px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;box-shadow:0 2px 6px rgba(0,0,0,.35);margin-bottom:2px}
.cc-tab-expand:hover{color:var(--a3);border-color:var(--a2);background:linear-gradient(180deg,var(--s4),var(--s3))}
.cc-left-scroll-arrows{position:absolute;right:8px;bottom:10px;display:flex;flex-direction:column;gap:5px;z-index:8;pointer-events:none}
.cc-scroll-arrow{width:20px;height:20px;border-radius:4px;border:1px solid var(--border);background:linear-gradient(180deg,var(--s3),var(--s2));color:var(--mid);font-size:9px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;box-shadow:0 2px 6px rgba(0,0,0,.35);pointer-events:auto}
.cc-scroll-arrow:hover:not(:disabled){color:var(--a3);border-color:var(--a2);background:linear-gradient(180deg,var(--s4),var(--s3))}
.cc-scroll-arrow:disabled{opacity:.35;cursor:not-allowed;color:var(--dim)}
.cc-scroll-arrow.left,.cc-scroll-arrow.right{margin-bottom:2px;width:18px;height:18px;font-size:8px}

/* ── Inline sections ── */
.cc-sec{border-bottom:1px solid rgba(255,255,255,.04)}
.cc-sec-hd{display:flex;align-items:center;gap:7px;padding:7px 12px;cursor:pointer;user-select:none;background:var(--s2);border-bottom:1px solid var(--border);flex-shrink:0;transition:all .2s cubic-bezier(0.4,0,0.2,1)}
.cc-sec-hd:hover{background:var(--s3)}
.cc-sec-chev{font-size:9px;color:var(--mid);transition:transform .2s;flex-shrink:0}
.cc-sec-chev.open{transform:rotate(90deg)}
.cc-sec-icon{font-size:11px;color:var(--mid);width:14px;text-align:center;flex-shrink:0}
.cc-sec-title{font-size:10px;font-weight:600;color:var(--text);flex:1}
.cc-sec-count{font-size:8.5px;color:var(--mid);font-family:var(--mono)}
.cc-sec-add{font-size:8.5px;padding:2px 6px;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--mid);cursor:pointer;transition:all .15s;font-family:var(--mono)}
.cc-sec-add:hover{border-color:var(--green);color:var(--green)}
/* Section header children brighten when parent row is hovered */
.cc-sec-hd:hover .cc-sec-chev{color:var(--text)}
.cc-sec-hd:hover .cc-sec-icon{color:var(--a3)}
.cc-sec-hd:hover .cc-sec-count{color:var(--mid)}

/* ── Inline mini-table (left column grids) ── */
.inline-mini{width:100%;border-collapse:collapse}
.inline-mini th{font-size:8px;color:var(--mid);font-weight:500;padding:4px 7px;text-align:left;border-bottom:1px solid var(--border);letter-spacing:.5px;text-transform:uppercase;background:var(--s3);position:sticky;top:0;z-index:2}
.inline-mini td{padding:0;border-bottom:1px solid rgba(22,44,74,.5);vertical-align:middle}
.inline-mini td:last-child{width:24px}
.inline-mini input,.inline-mini select{display:block;width:100%;background:transparent;border:none;outline:none;font-family:var(--mono);font-size:10.5px;color:var(--text);padding:5px 7px;line-height:1.4}
.inline-mini input:focus,.inline-mini select:focus{background:var(--s3);outline:1px solid var(--accent)}
.inline-mini input::placeholder{color:var(--mid)}
.inline-mini tr:hover td{background:rgba(21,101,216,.05)}
.inline-mini tr.hover-row td{background:rgba(0,200,112,.08) !important}
.inline-mini tr.sel-row td{background:rgba(21,101,216,.12) !important;border-bottom:1px solid rgba(21,101,216,.3)}
.inline-mini tr.sel-row input{color:#fff}
.mini-del{background:transparent;border:none;cursor:pointer;color:var(--dim);font-size:11px;padding:4px 5px;line-height:1;display:block;width:100%;transition:color .15s}
.mini-del:hover{color:var(--red)}
.mini-check{display:flex;align-items:center;justify-content:center;padding:4px}
/* Transition condition input — flags unparsed text (Decision 2's skeleton
   philosophy: don't guess, don't drop, flag visibly) with the app's real
   existing warning token, not a new color. */
.cond-cell{display:flex;align-items:center;gap:4px}
.cond-cell input{flex:1;min-width:0}
.cond-unparsed-flag{flex-shrink:0;color:var(--gold)}
.mini-check input[type=checkbox]{width:12px;height:12px;cursor:pointer;accent-color:var(--accent)}
.mini-style{background:transparent;border:none;cursor:pointer;color:var(--dim);padding:4px;display:flex;align-items:center;justify-content:center;width:100%;transition:color .15s}
.mini-style:hover{color:var(--mid)}
.mini-style.on{color:var(--a3)}
.style-row td{background:var(--s1);padding:0;border-bottom:1px solid var(--border)}
.style-row-body{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:8px 10px}
.style-row-body label{display:flex;align-items:center;gap:5px;font-size:9px;color:var(--mid);cursor:pointer}
.style-row-body label span{white-space:nowrap}
.style-row-body input[type=color]{width:20px;height:20px;padding:0;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer}
.style-row-body input[type=checkbox]{width:12px;height:12px;cursor:pointer;accent-color:var(--accent)}
.style-badge-text{background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:3px 6px;font-family:var(--mono);font-size:9.5px;color:var(--text);outline:none;width:110px}
.style-badge-text:focus{border-color:var(--a2)}
.style-clear{background:none;border:none;color:var(--mid);font-size:8.5px;cursor:pointer;text-decoration:underline;padding:0}
.style-clear:hover{color:var(--red)}
.sec-filter{background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:2px 7px;font-family:var(--mono);font-size:9px;color:var(--text);outline:none;width:120px;flex-shrink:0;transition:border-color .15s}
.sec-filter:focus{border-color:var(--a2)}
.sec-filter::placeholder{color:var(--mid)}
.ghost-row td{padding:6px 10px;font-size:8.5px;color:var(--mid);text-align:center;font-style:italic;background:var(--s3);border-top:1px solid var(--border);transition:color .15s}
.ghost-row:hover td{color:var(--text)}

/* ── Gateways (decision/automatic-hub diamonds) ── */
.gw-list{padding:6px 10px 8px;border-top:1px solid var(--border);background:var(--s1)}
.gw-list-lbl{font-size:8px;color:var(--mid);letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px;cursor:help}
.gw-row{display:flex;align-items:center;gap:8px;padding:4px 2px}
.gw-name{font-size:10px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px}
.gw-meta{font-size:8.5px;color:var(--mid);flex:1}
.gw-type-toggle{display:flex;gap:2px;background:var(--s2);border:1px solid var(--border);border-radius:4px;padding:2px}
.gw-type-toggle button{background:transparent;border:none;border-radius:3px;color:var(--mid);cursor:pointer;padding:3px 5px;display:flex;align-items:center;transition:all .15s}
.gw-type-toggle button:hover{color:var(--text)}
.gw-type-toggle button.on{background:var(--s4);color:#7c8cff}

/* ── Canvas theme selector (mirrors .gw-type-toggle's segmented-pill pattern) ── */
.theme-toggle{display:flex;gap:2px;background:var(--s2);border:1px solid var(--border);border-radius:4px;padding:2px}
.theme-toggle button{background:transparent;border:none;border-radius:3px;color:var(--mid);cursor:pointer;padding:3px 8px;font-size:9px;font-family:var(--mono);transition:all .15s}
.theme-toggle button:hover{color:var(--text)}
.theme-toggle button.on{background:var(--s4);color:var(--a3)}
/* Toolbar Palette — the same per-state color/badge fields the "Cosmetic style…"
   row popover exposes, surfaced beside the theme selector so styling the
   currently-selected state doesn't require opening a table row first. */
.toolbar-palette{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--border);border-radius:4px;padding:3px 7px;color:var(--mid)}
.toolbar-palette input[type=color]{width:18px;height:18px;padding:0;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer}
.toolbar-palette input:disabled{opacity:.35;cursor:default}

/* ── Parse input panel ── */
.parse-panel{padding:12px;display:flex;flex-direction:column;gap:8px;flex-shrink:0;border-bottom:1px solid var(--border)}
.parse-lbl{font-size:8.5px;color:var(--mid);letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
.parse-ta{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:8px 10px;font-family:var(--mono);font-size:10px;color:var(--text);outline:none;line-height:1.7;resize:none;box-sizing:border-box}
.parse-ta:focus{border-color:var(--a2)}
.parse-ta::placeholder{color:var(--dim)}
.parse-input{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:7px 10px;font-family:var(--mono);font-size:10px;color:var(--text);outline:none;box-sizing:border-box}
.parse-input:focus{border-color:var(--a2)}
.parse-input::placeholder{color:var(--dim)}

/* ── Deliver column ── */
.deliver-end-marker{padding:14px 12px;font-size:8.5px;color:var(--dim);text-align:center;font-style:italic;letter-spacing:.5px}
.deliver-section{padding:12px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
.deliver-section-lbl{font-size:8.5px;color:var(--mid);letter-spacing:1px;text-transform:uppercase}
.deliver-row{display:flex;align-items:center;gap:8px;border-radius:4px;padding:2px 4px;margin:0 -4px;transition:background .15s}
.deliver-row:hover{background:rgba(74,159,255,.05)}
.deliver-row:hover .deliver-title{color:#fff}
.deliver-row:hover .deliver-sub{color:var(--mid)}
.deliver-icon{font-size:18px;flex-shrink:0}
.deliver-info{flex:1}
.deliver-title{font-size:10.5px;font-weight:600;color:var(--text)}
.deliver-sub{font-size:8.5px;color:var(--mid);margin-top:1px}
.mf-log{background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:9px 11px;font-size:9.5px;line-height:1.9;max-height:160px;overflow-y:auto}
/* "Menu Studio" — the M-Files activity log floated bottom-right. Anchored to
   the bottom (not top) deliberately: the Deliver panel's content above it
   (Documents/SOW/PRD, M-Files Sync, Connection settings, the vault tree) has
   variable height, and a top anchor landed the log directly on top of the
   Documents row. The bottom-right corner stays empty regardless of how much
   content is above it, so this can't recur as that content grows/shrinks. */
.mf-log-float{position:fixed;bottom:12px;right:12px;width:300px;z-index:500;box-shadow:0 4px 16px rgba(0,0,0,0.35)}
.mf-adv{background:var(--s2);border:1px solid var(--border);border-radius:5px;padding:10px;display:flex;flex-direction:column;gap:7px}
.mf-input{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:5px 8px;font-family:var(--mono);font-size:10px;color:var(--text);outline:none;box-sizing:border-box}
.mf-input:focus{border-color:var(--a2)}

/* ── Queue Builder (Deliver Panel) ── */
.q-list{display:flex;flex-direction:column;gap:3px}
.q-row{display:flex;align-items:center;justify-content:space-between;background:var(--s2);border:1px solid var(--border);border-radius:4px;padding:4px 6px 4px 8px;transition:all .15s}
.q-row:hover{border-color:var(--a3)}
.q-row.staged{background:rgba(21,101,216,.1);border-color:var(--a3)}
.q-name{font-size:9.5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
.q-btn{background:transparent;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;transition:all .1s}
.q-btn.add{color:var(--green)}
.q-btn.add:hover{background:rgba(0,200,112,.15)}
.q-btn.del{color:var(--red)}
.q-btn.del:hover{background:rgba(255,61,90,.15)}
.q-staged-lbl{font-size:8.5px;color:var(--a3);letter-spacing:1px;text-transform:uppercase;margin:4px 0 2px;text-align:center}

/* ── Center column ── */
/* Still overflow-x:auto, NOT hidden -- confirmed live (headless Chromium)
   that overflow-x:hidden silently stops the 'scroll' event from firing on
   programmatic scrollLeft writes at all, even though scrollLeft itself
   still updates -- the exact mechanism syncDiagramHScroll's listener
   depends on, so hidden would have left the shared scrollbar's thumb
   permanently stale. The native scrollbar is hidden purely visually
   instead (.diagram-wrap::-webkit-scrollbar below + scrollbar-width:none),
   which doesn't touch scroll-event behavior at all -- wrapRef.current.
   scrollLeft (drag-pan, handleFitToView, the new scrollbar) all still work
   exactly as before. overflow-y is untouched either way -- horizontal-only
   change. Webkit-only selector deliberately, not a blanket scrollbar-width:
   none -- this app only ever actually runs in Chromium (Electron), and a
   blanket rule would also hide the vertical scrollbar in Firefox, which
   this element was never asked to touch. */
/* Real M-Files Admin shows no inline text on a transition line at all —
   just the line itself, dashed/solid, plus a guard badge; the actual
   condition/label content only ever shows on hover (confirmed against a
   real Admin screenshot, 2026-08-25). Mermaid's own edge-label text is kept
   generating in useMermaid.js, not removed at the source, because
   buildLayoutModel's parallel-transition disambiguation (CommandCenter.jsx)
   reads the real rendered label text/position to tell two transitions
   sharing a state pair apart — hiding it visually here, rather than never
   generating it, keeps that mechanism working while matching the real
   M-Files convention on screen. Scoped to both canvases that share
   useMermaid.js (Studio's .diagram-wrap, M-Files Flow's own
   .mflow-diagram-wrap below) — Process Docs is unrelated (React Flow, not
   Mermaid) and untouched. */
.diagram-wrap .edgeLabel,.mflow-diagram-wrap .edgeLabel{display:none}

.diagram-wrap{flex:1;overflow-y:auto;overflow-x:auto;display:flex;align-items:flex-start;justify-content:center;padding:18px;position:relative;cursor:grab;
  background-color:#F8FAFC;
  background-image:radial-gradient(#CBD5E1 1.5px, transparent 1.5px);
  background-size:24px 24px;
  background-position:0 0;
}
.diagram-wrap::-webkit-scrollbar:horizontal{display:none}
.diagram-wrap.panning{cursor:grabbing}
/* ── Compare PNG — real Conformity workflow screenshots beside the live diagram.
   Fixed upload order, no drag-to-reorder (the original's broken feature, cut
   from scope entirely rather than fixed). ── */
.png-compare-wrap{flex:1;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.png-compare-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.png-layout-toggle{display:flex;gap:4px;margin-left:auto}
.png-compare-list{display:flex;gap:14px;flex-wrap:wrap}
.png-compare-list.vertical{flex-direction:column}
.png-compare-card{background:var(--s2);border:1px solid var(--border);border-radius:7px;overflow:hidden;flex:1 1 340px;max-width:100%}
.png-compare-list.vertical .png-compare-card{flex:none}
.png-compare-card-head{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid var(--border);background:var(--s3)}
.png-compare-name{font-size:9.5px;font-family:var(--mono);color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.png-compare-card-actions{display:flex;align-items:center}
.png-compare-image{display:block;width:100%;height:auto;background:#fff}
.diagram-wrap svg{width:100%;height:auto;display:block;background:transparent!important;background-color:transparent!important}
/* Editing palette — Mermaid-side equivalent of BPMN's element rail (same
   labeled-tile visual language as .bpmn-pal-tile, deliberately reused rather
   than reinvented), limited to what this canvas actually has (states +
   transitions — see the JSX comment for why there's no Gateway/Pool/
   Connector tile). Overlaid on diagram-wrap's top-left corner rather than a
   real flex-sibling rail like BPMN's, since this canvas's layout wasn't
   built with a side-rail slot — this stays an absolute overlay even now that
   it's collapsible, so a plain width transition on the inner clip wrapper is
   safe (no position-snap glitch to work around, unlike BPMN's pinned/hover
   dual-mode palette, which changes position:relative<->absolute on toggle).
   The toggle button itself lives in the toolbar (.panel-toggle, cc-col-head)
   rather than floating here over the canvas — moved there per operator
   request, this shell is now just the sliding panel's positioning anchor.
   Still Mermaid, not React Flow. */
.studio-pal-shell{position:absolute;top:14px;left:16px;z-index:20}
/* Panel content is always rendered at its full intended width; this
   wrapper's own width is what animates 0<->175px, clipping (not reflowing)
   the content — the same "clip, don't reflow" trick BPMN's pinned palette
   uses, so button text never wraps awkwardly mid-transition. 175px matches
   BPMN's own .bpmn-pal-shell.pinned width exactly — reused rather than a
   fresh number, consistent narrow "tool palette" sizing across both canvases.
   Narrowed from an original 300px per operator request (real estate over the
   canvas, no quick way to tell how much space it was costing at a glance). */
.studio-pal-panel-clip{width:175px;overflow:hidden;transition:width .3s ease}
.studio-pal-shell.closed .studio-pal-panel-clip{width:0}
.studio-pal-panel{width:175px;background:rgba(7,17,31,.9);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:7px;padding:8px;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.studio-pal-group{display:flex;flex-direction:column;gap:4px}
.studio-pal-rail-lbl{font-size:8px;color:var(--mid);letter-spacing:.8px;text-transform:uppercase;padding:0 2px}
.studio-pal-tile{display:flex;align-items:center;gap:6px;padding:5px 6px;width:100%;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:var(--mono);font-size:9.5px;cursor:pointer;transition:all .15s;text-align:left;white-space:nowrap}
.studio-pal-tile:hover{border-color:var(--a2);color:var(--a3);background:var(--s4)}
.studio-pal-tile.danger:hover{border-color:var(--red);color:var(--red)}
.studio-pal-tile:disabled{opacity:.35;cursor:not-allowed}
.studio-pal-tile:disabled:hover{border-color:var(--border);color:var(--text);background:var(--s3)}
/* .diagram-wrap svg{width:100%;height:auto} (meant for the Mermaid render)
   otherwise stretches these lucide icons to fill their button — this palette
   lives inside diagram-wrap so it needs an explicit override. */
.studio-pal-tile svg{width:12px!important;height:12px!important;flex-shrink:0}
/* Undo/Redo share one row, half-width each — the two-small-buttons-side-by-side
   layout this narrower palette has real room for, unlike every other action
   here which needs its full row for a real label. */
.studio-pal-row2{display:flex;gap:4px}
.studio-pal-row2 .studio-pal-tile{justify-content:center}
.studio-pal-label-input{width:100%;background:var(--s3);border:1px solid var(--border);border-radius:5px;padding:5px 6px;color:var(--text);font-family:var(--mono);font-size:9.5px;box-sizing:border-box}
.studio-pal-label-input:focus{outline:none;border-color:var(--a2)}
.studio-pal-empty-hint{font-size:8.5px;color:var(--dim);font-style:italic;padding:2px;line-height:1.4}
/* Inline-rename overlay — a small fixed-position input near the double-clicked
   node/edge or the context menu's "Edit Label" trigger. Not a true SVG text
   swap (positioning/font-matching an editable node inside a Mermaid-rendered
   <g> is far riskier for comparatively little UX gain over a docked field
   right next to it) — see the investigation report this was scoped from. */
.studio-rename-box{z-index:200}
.studio-rename-box input{background:var(--s2);border:1px solid var(--a2);border-radius:5px;padding:5px 8px;color:var(--text);font-family:var(--mono);font-size:11px;box-shadow:0 8px 20px rgba(0,0,0,.4);min-width:160px}
.studio-rename-box input:focus{outline:none}
/* Zoom controls — positions the shared .mflow-view-controls chip (see
   MFlowCanvas.jsx / App.jsx's own .mflow-view-controls rule, reused as-is,
   not redefined here) over Studio's canvas. Replaces the old .zoom-badge/
   .cc-toolbar pair — same Studio/M-Files Flow toolbar-language alignment
   this was written for. */
.cc-zoom-controls-wrap{position:absolute;bottom:14px;right:16px;z-index:20}
.cc-zoom-readout{font-family:var(--mono);font-size:9px;color:var(--mid);padding:0 4px;letter-spacing:.3px;user-select:none}
/* .stats-grid on its own only ever took its natural (short) content height —
   the large empty area beneath it in the review's screenshot was .cc-center's
   own unfilled flex space below that short content, not the grid itself
   being too tall. .stats-wrap centers the grid within whatever space is
   actually available (both axes) instead of leaving it pinned to the top
   with the rest of the panel reading as unfinished. */
.stats-wrap{flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;padding:16px}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:520px;width:100%}
.stat-card{background:var(--s2);border:1px solid var(--border);border-radius:7px;padding:18px 14px;text-align:center;transition:all .15s;cursor:default}
.stat-card:hover{border-color:var(--bdr2);background:var(--s3)}
.stat-card:hover .stat-lbl{color:var(--text)}
.stat-val{font-family:var(--display);font-size:24px;font-weight:700;color:var(--a3);line-height:1;margin-bottom:3px}
.stat-lbl{font-size:8.5px;color:var(--mid);letter-spacing:.5px}
.cc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--mid);font-size:11px;gap:10px;text-align:center;line-height:1.7}
.cc-empty-icon{font-size:34px;opacity:.2;margin-bottom:4px}

/* ── Shared utilities ── */
.panel-toggle{width:22px;height:22px;border-radius:4px;border:1px solid var(--border);background:var(--s2);color:var(--mid);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;padding:0;line-height:1;margin-right:4px}
.panel-toggle:hover{border-color:var(--a2);color:var(--a3);background:var(--s3)}
/* Palette toggle — a .panel-toggle carrying a permanent blue tint (not just
   on hover, like its plain left/right siblings) so it visibly "belongs to"
   the editing palette's own blue accent language instead of reading as an
   identical, unlabeled third chevron. */
.panel-toggle.palette-toggle{border-color:var(--a2);color:var(--a3);background:rgba(74,159,255,.1)}
.panel-toggle.palette-toggle:hover{background:rgba(74,159,255,.2)}
.xb{font-size:9.5px;font-family:var(--mono);padding:4px 10px;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--mid2);cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0}
.xb:hover{border-color:var(--a2);color:var(--a3)}
.xb.blue{background:var(--accent);border-color:var(--accent);color:#fff}
.xb.blue:hover{background:var(--a2)}
.xb.green{background:rgba(0,200,112,.12);border-color:var(--green);color:var(--green)}
.xb.purple{background:rgba(124,92,252,.15);border-color:rgba(124,92,252,.4);color:#A78BFA}
.xb:disabled{opacity:.35;cursor:not-allowed}
.tab-row{display:flex;gap:2px}
.tab{font-size:9.5px;padding:3px 8px;border-radius:3px;border:1px solid transparent;background:transparent;color:var(--mid);cursor:pointer;transition:all .15s;font-family:var(--mono)}
.tab:hover{color:var(--text)}
.tab.on{background:var(--s3);border-color:var(--border);color:var(--text)}
.log{background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:9px 11px;font-size:9.5px;line-height:1.9;max-height:110px;overflow-y:auto}
.ll{display:flex;gap:8px}
.lt{color:var(--dim);flex-shrink:0;font-size:9px}
.lok{color:var(--green)}.linf{color:var(--a3)}.lwarn{color:var(--gold)}.lerr{color:var(--red)}
.spin{width:11px;height:11px;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);border-top-color:#fff;animation:rot .6s linear infinite;flex-shrink:0;display:inline-block}
@keyframes rot{to{transform:rotate(360deg)}}
@keyframes tip-pulse{0%,100%{opacity:.2}50%{opacity:.8}}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}

/* Pro UI Enhancements */
@keyframes pulse-amber { 0% { box-shadow: 0 0 0 0 rgba(240,165,0,0.4); } 70% { box-shadow: 0 0 0 6px rgba(240,165,0,0); } 100% { box-shadow: 0 0 0 0 rgba(240,165,0,0); } }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(0,200,112,0.4); } 70% { box-shadow: 0 0 0 6px rgba(0,200,112,0); } 100% { box-shadow: 0 0 0 0 rgba(0,200,112,0); } }
@keyframes pulse-blue  { 0% { box-shadow: 0 0 0 0 rgba(74,159,255,0.4); } 70% { box-shadow: 0 0 0 6px rgba(74,159,255,0); } 100% { box-shadow: 0 0 0 0 rgba(74,159,255,0); } }
.status-pulse { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.status-pulse.amber { background: var(--gold); animation: pulse-amber 1.5s infinite; }
.status-pulse.green { background: var(--green); animation: pulse-green 2s infinite; }
.status-pulse.blue  { background: var(--a3); animation: pulse-blue 2.5s infinite; }
.status-pulse.dim   { background: var(--dim); }

/* Mermaid Highlights */
.node.highlight rect, .node.highlight polygon, .node.highlight circle {
  stroke: var(--green) !important; stroke-width: 3px !important; filter: drop-shadow(0 0 6px rgba(0,200,112,0.6));
}
/* .highlight is added directly to the path.transition element itself — this
   Mermaid version renders edges with no per-edge wrapper (all paths share one
   <g class="edgePaths">), so ".edgePath.highlight path" never matched anything. */
path.transition.highlight {
  stroke: var(--green) !important; stroke-width: 3px !important; filter: drop-shadow(0 0 4px rgba(0,200,112,0.5));
}

/* Arrowhead markers render pale (theme reuses primaryTextColor for marker fill,
   not lineColor) and were nearly invisible against the light canvas — force a
   solid, visible fill instead of fighting Mermaid's theme variable for it.
   NOTE: markerUnits="strokeWidth" means the marker size scales with the line's
   own stroke-width — do NOT thicken path.transition to make arrows bigger,
   it inflates the whole triangle disproportionately. Leave stroke-width alone. */
.diagram-wrap svg marker path { fill: #1E293B !important; }

/* Drag-to-connect hit-zone — a small invisible circle at each state's
   edge, dragged to another state to create a transition. Deliberately NO
   visible marker at all, unlike MFlowCanvas.jsx's own hover-revealed
   .mflow-connect-handle — the real M-Files Admin workflow editor shows no
   handle graphic either, confirmed against it directly, so this stays
   permanently invisible (opacity:0, never revealed on hover) rather than
   matching that precedent. cursor:crosshair on hover is the only cue. */
.studio-connect-handle{opacity:0;fill:var(--a3);stroke:none;cursor:crosshair}
.studio-connect-dragline{stroke:var(--a3);stroke-width:2px;stroke-dasharray:5 4;pointer-events:none}

.cc-edge-search{
  position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:110;
  display:flex;align-items:center;gap:6px;padding:6px 6px 6px 8px;
  background:rgba(10,24,40,.88);backdrop-filter:blur(10px);
  border:1px solid var(--border);border-right:none;border-radius:8px 0 0 8px;
  box-shadow:0 4px 12px rgba(0,0,0,.45);transition:all .2s ease;
}
.cc-edge-search.closed{padding:4px;border-radius:8px 0 0 8px}
.cc-edge-toggle{
  width:18px;height:18px;border-radius:4px;border:1px solid var(--border);
  background:var(--s2);color:var(--mid);cursor:pointer;font-size:11px;line-height:1;
  display:flex;align-items:center;justify-content:center;transition:all .15s;
}
.cc-edge-toggle:hover{color:var(--a3);border-color:var(--a2);background:var(--s3)}

/* Empty Blueprint */
.blueprint-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; color: var(--dim); font-family: var(--display); text-align: center;
}
.blueprint-empty svg { opacity: 0.15; width: 120px; height: 120px; margin-bottom: 20px; }
.blueprint-title { font-size: 24px; font-weight: 700; color: var(--mid); margin-bottom: 8px; }
.blueprint-sub { font-size: 13px; font-family: var(--mono); color: var(--dim); max-width: 300px; line-height: 1.5; }

/* Command Palette */
.cmd-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 9999;
  display: flex; justify-content: center; padding-top: 15vh;
}
.cmd-modal {
  width: 600px; max-width: 90vw; background: var(--s1); border: 1px solid var(--border);
  border-radius: 8px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); display: flex; flex-direction: column;
  overflow: hidden;
}
.cmd-head{display:flex;align-items:center;border-bottom:1px solid var(--border)}
.cmd-input {
  width: 100%; padding: 16px 20px; font-size: 18px; font-family: var(--mono); color: var(--text);
  background: transparent; border: none; outline: none;
}
.cmd-close{
  width:34px;height:34px;margin-right:10px;border-radius:6px;border:1px solid var(--border);
  background:var(--s2);color:var(--mid);cursor:pointer;font-size:12px;line-height:1;
  display:flex;align-items:center;justify-content:center;transition:all .15s;
}
.cmd-close:hover{color:var(--text);border-color:var(--a2);background:var(--s3)}
.cmd-results { max-height: 350px; overflow-y: auto; padding: 8px; }
.cmd-item {
  padding: 10px 14px; display: flex; align-items: center; gap: 12px; cursor: pointer;
  border-radius: 4px; color: var(--mid); transition: background 0.1s;
}
.cmd-item:hover, .cmd-item.selected { background: var(--s3); color: var(--text); }
.cmd-item-icon { width: 24px; text-align: center; font-size: 14px; opacity: 0.7; }
.cmd-item-text { flex: 1; font-size: 13px; }
.cmd-item-type { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; }
.cmd-footer{display:flex;gap:16px;padding:9px 16px;border-top:1px solid var(--border);background:var(--s2);font-family:var(--mono);font-size:10px;color:var(--mid)}
.cmd-footer kbd{display:inline-block;min-width:16px;padding:1px 5px;margin-right:3px;border-radius:3px;border:1px solid var(--border);background:var(--s3);color:var(--mid2);font-family:var(--mono);font-size:9.5px;text-align:center;line-height:1.5}

/* ── App Shell: section nav, vault chip, empty states ── */
.cc-content-area{flex:1;display:flex;overflow:hidden;min-height:0}
.cc-section-tabs{display:flex;gap:2px;flex:1;padding:0 10px}
.cc-section-tab{font-size:10px;font-family:var(--mono);padding:6px 12px;border-radius:5px;border:1px solid transparent;background:transparent;color:var(--mid);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;white-space:nowrap}
.cc-section-tab:hover{color:var(--text);border-color:var(--border)}
.cc-section-tab.active{color:var(--a3);background:rgba(74,159,255,.1);border-color:rgba(74,159,255,.3)}
.cc-section-tab.gated:not(.active):not(:hover){color:var(--dim)}
.cc-section-tab-lock{opacity:.55;flex-shrink:0}
.cc-vault-chip{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:5px;border:1px solid var(--border);background:var(--s2);font-size:9.5px;font-family:var(--mono);color:var(--mid);flex-shrink:0;cursor:default}
.cc-vault-chip.connected{color:var(--text)}
.cc-cmdk-hint{font-size:9px;font-family:var(--mono);padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--mid);cursor:pointer;transition:all .15s;flex-shrink:0}
.cc-cmdk-hint:hover{border-color:var(--a2);color:var(--a3)}
/* Reset — previously reused the same generic .xb style as every other small
   button in the app, sitting flush against the passive ⌘K/vault-status
   chips with nothing distinguishing "destructive action" from "informational
   indicator." A thin divider + extra spacing separates it from that cluster;
   the red hover state (not a permanent red at rest, which would read as a
   constant warning rather than a real one) signals "this one is different"
   only when it's actually about to be clicked. */
.cc-reset-btn{font-size:9.5px;font-family:var(--mono);padding:4px 10px;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--mid2);cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0;margin-left:12px;position:relative}
.cc-reset-btn::before{content:'';position:absolute;left:-8px;top:50%;transform:translateY(-50%);width:1px;height:16px;background:var(--border)}
.cc-reset-btn:hover{border-color:var(--red);color:var(--red);background:rgba(255,61,90,.08)}
.cc-source-row{display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid var(--border);background:var(--s2);flex-shrink:0}
.cc-source-lbl{font-size:8.5px;color:var(--mid);letter-spacing:1px;text-transform:uppercase;flex-shrink:0}
.cc-source-tabs{display:flex;gap:2px}
.gate-badge{display:inline-block;margin-top:14px;font-size:9px;font-family:var(--mono);padding:5px 12px;border-radius:20px;border:1px solid var(--border);color:var(--mid);letter-spacing:.3px}

/* ── M-Files Flow (clean-slate canvas, shares Studio's data) ──
   Palette shell/tile styles are a deliberate copy of .bpmn-pal-* — same
   visual language, confirmed with the user ("something similar" to BPMN's
   palette). Kept as its own separate ruleset rather than sharing selectors
   with BPMN's, so the two canvases stay stylistically independent (one
   could change without silently affecting the other) even though they
   currently look alike. */
/* .mflow-split(-left/-right/-handle) — the permanent split-screen wrapper
   added for the Live Translating Split-Screen View. .mflow-shell used to be
   cc-content-area's direct flex child (flex:1); now it's nested one level
   deeper inside a react-resizable-panels Panel, so it fills that Panel's
   own 100% height instead of flex-growing directly. */
.mflow-split{flex:1;min-height:0;overflow:hidden}
.mflow-split-left{height:100%;overflow:hidden}
.mflow-split-right{height:100%;overflow:hidden;display:flex;flex-direction:column}
.mflow-split-handle{width:5px;background:var(--border);cursor:col-resize;transition:background .15s;position:relative}
.mflow-split-handle:hover,.mflow-split-handle[data-resize-handle-active]{background:var(--a3)}
/* Expand/collapse chevron pair — flush with the very top of the divider
   (top:2px), at the same height as the shared ContextTabStrip row just
   above the split, per direct operator correction against a real
   47-state workflow (the earlier top:29/36px placement sat inside each
   panel's own per-panel toolbar row instead, one row too low). Non-
   intrusive by default (small, muted, semi-transparent), a distinct cyan
   glow on hover/focus so it still reads as interactive against the thin
   5px handle it sits on. Deliberately its own accent (rgba(0,212,255,...))
   rather than this app's --a3 blue, so a toggle this consequential (hides
   an entire panel) doesn't blend in with ordinary selection/hover blue
   used everywhere else on the canvas. */
.mflow-split-toggle-group{position:absolute;top:2px;left:50%;transform:translateX(-50%);
  display:flex;gap:3px;z-index:2}
.mflow-split-toggle{width:16px;height:16px;
  display:flex;align-items:center;justify-content:center;border-radius:4px;cursor:pointer;
  background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.25);color:var(--mid);
  transition:background .15s,border-color .15s,box-shadow .15s,color .15s}
.mflow-split-toggle:hover,.mflow-split-toggle:focus-visible{
  background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.5);color:#00D4FF;
  box-shadow:0 0 8px rgba(0,212,255,.5);outline:none}
.mflow-shell{height:100%;display:flex;min-height:0;overflow:hidden;background:var(--bg)}
.mflow-canvas-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;position:relative}
.mflow-status-line{flex-shrink:0;padding:8px 16px;font-size:10px;font-family:var(--mono);color:var(--mid);border-bottom:1px solid var(--border);background:var(--s1);display:flex;align-items:center;justify-content:space-between;gap:8px}
.mflow-clear-btn{font-size:9px;font-family:var(--mono);padding:3px 9px;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--mid);cursor:pointer;transition:all .15s}
.mflow-clear-btn:hover{border-color:var(--red);color:var(--red)}
.mflow-view-controls{display:flex;align-items:center;gap:2px;background:var(--s2);border:1px solid var(--border);border-radius:4px;padding:2px;margin-left:auto}
.mflow-view-controls button{display:flex;align-items:center;gap:3px;background:transparent;border:none;border-radius:3px;color:var(--mid);cursor:pointer;padding:3px 6px;font-size:9px;font-family:var(--mono);transition:all .15s}
.mflow-view-controls button:hover{color:var(--text);background:var(--s3)}
.mflow-view-controls button.on{background:var(--s4);color:var(--a3)}
/* Comment/status boxes — positioned relative to .mflow-canvas-area, not the
   scrollable .mflow-diagram, so (deliberately, v1) they don't pan/scroll
   with the diagram content. Consistent with this canvas having no zoom/pan
   yet at all — a known, logged limitation, not unique to comments. */
/* Redesigned to blend with the rest of the diagram — was a large (160px),
   two-tone block (dark header overlay directly on top of a fully-saturated
   fill, quite a bit bigger than a typical state box). Now: a compact card
   sized closer to a state node, a thin colored top accent for identity
   (matches the state-node convention of color = fill, but restrained to a
   stripe rather than the whole card), everything else a plain neutral
   surface so it reads as "a note on the diagram" rather than a bright
   sticky slapped over it. */
.mflow-comment{position:absolute;width:128px;background:var(--s2);border:1px solid var(--border);border-top:3px solid var(--border);border-radius:5px;box-shadow:0 3px 10px rgba(0,0,0,.25);z-index:15;overflow:hidden;font-family:var(--mono)}
.mflow-comment-head{display:flex;align-items:center;justify-content:space-between;padding:3px 5px;cursor:move;background:var(--s3);border-bottom:1px solid var(--border)}
.mflow-comment-head input[type=color]{width:12px;height:12px;padding:0;border:1px solid var(--border);border-radius:50%;background:none;cursor:pointer;overflow:hidden}
.mflow-comment-head input[type=color]::-webkit-color-swatch-wrapper{padding:0}
.mflow-comment-head input[type=color]::-webkit-color-swatch{border:none;border-radius:50%}
.mflow-comment-del{background:none;border:none;color:var(--mid);cursor:pointer;font-size:9px;padding:2px 3px;line-height:1}
.mflow-comment-del:hover{color:var(--red)}
.mflow-comment textarea{width:100%;min-height:32px;border:none;background:transparent;color:var(--text);font-family:var(--mono);font-size:9px;padding:5px;resize:vertical;outline:none;line-height:1.4}
.mflow-comment textarea::placeholder{color:inherit;opacity:0.5}
/* overflow:hidden, not auto — pan is a free transform on the SVG itself
   (see MFlowCanvas.jsx's panRef), not native scroll, so there's no native
   scrollable overflow for the browser to attach its own scrollbar to;
   hidden just clips whatever pans outside the viewport. The shared .hscroll
   bar (below, in the "Shared bottom horizontal scrollbar" block) is a
   separate control wired to that same transform (applyPanX), not a native
   scrollbar on this element. */
.mflow-diagram{flex:1;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;padding:18px;cursor:grab;
  background-color:#F8FAFC;background-image:radial-gradient(#CBD5E1 1.5px, transparent 1.5px);background-size:24px 24px;background-position:0 0}
.mflow-diagram.panning{cursor:grabbing}
/* Shared bottom horizontal scrollbar (src/components/HScrollBar.jsx) — one
   set of classes used identically by Studio, M-Files Flow, and Process
   Docs, each wiring the same onScrollLeftChange/setMetrics contract onto
   its own pan mechanism (see HScrollBar.jsx's own header comment). A real
   flex-shrink:0 bar in each canvas's own layout, not an overlay. Thin
   track + a distinct pill thumb, plus small nudge arrows on both ends.
   Sits on the same var(--s1) tone as each canvas's own top toolbar row,
   for visual continuity underneath a lighter canvas background above it. */
.hscroll{flex-shrink:0;height:18px;display:flex;align-items:center;gap:4px;padding:0 6px;
  background:var(--s1);border-top:1px solid var(--border)}
.hscroll-arrow{flex-shrink:0;width:14px;height:14px;display:flex;align-items:center;justify-content:center;
  background:transparent;border:none;border-radius:3px;color:var(--mid);cursor:pointer;padding:0;transition:all .15s}
.hscroll-arrow:hover{color:var(--text);background:var(--s3)}
.hscroll-track{flex:1;position:relative;height:6px;background:var(--s3);border:1px solid var(--border);
  border-radius:3px;cursor:pointer}
.hscroll-thumb{position:absolute;top:-1px;left:0;height:6px;min-width:20px;border-radius:3px;
  background:var(--mid2,var(--mid));cursor:grab;transition:background .15s}
.hscroll-thumb:hover{background:var(--a3)}
.hscroll-thumb:active{cursor:grabbing;background:var(--a3)}
/* flex-shrink:0 is load-bearing, not cosmetic: .mflow-diagram is a flex
   container, and JS (growViewBoxToFit/the zoom effect/Fit) sets this svg's
   style.width directly to control zoom. Without flex-shrink:0, the CSS
   default (flex-shrink:1) lets the flex container silently render the svg
   SMALLER than its own requested width whenever that width exceeds the
   container — the code has no idea this clamping happened, so
   getScreenCTM()'s real scale ends up smaller than the zoom value the code
   assumes. During a node drag, toUserDelta() divides by that wrong
   (too-small) scale, producing inflated position deltas, which grow the
   viewBox even further next frame — a real, confirmed-live exponential
   feedback loop (a ~650px screen-space drag inflated the viewBox from
   ~420 to ~6,459 units over ~20 mousemove steps), collapsing the effective
   zoom for every node on screen, not just the dragged one.*/
.mflow-diagram svg{width:100%;height:auto;display:block;flex-shrink:0}
/* Drag-to-connect handle — visual precedent checked against BPMN Standard's
   own "magic connector" (react-flow__handle-bottom, hidden until node
   hover, accent-colored) but reimplemented as raw SVG here since Mermaid
   gives no Handle/onConnect equivalent to reuse; only the visual language
   (accent color, hidden-until-hover) carries over, not the mechanism.
   Reuses this canvas's own selection-highlight blue rather than a new
   color. */
.mflow-connect-handle{opacity:0;fill:var(--a3);stroke:var(--s1);stroke-width:1.5px;cursor:crosshair;transition:opacity .15s}
.node:hover .mflow-connect-handle{opacity:1}
.mflow-connect-dragline{stroke:var(--a3);stroke-width:2px;stroke-dasharray:5 4;pointer-events:none}
.mflow-group-bg{fill:rgba(74,159,255,.05);stroke:var(--border);stroke-width:1.4px;stroke-dasharray:6 5;pointer-events:none}
.mflow-group-label{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.4px;fill:var(--mid);text-transform:uppercase;pointer-events:none}
/* Edge right-click hit area — an invisible, much wider sibling of the real
   transition line (2px visible vs. this 14px), same reasoning BPMN
   Standard's own FlowEdge.jsx widens its interaction stroke: a thin visible
   line is a poor mouse/Playwright target on its own. */
.mflow-edge-hit{stroke:transparent;stroke-width:14px;cursor:context-menu;pointer-events:stroke}
.mflow-edge-hit:hover{cursor:pointer}
path.transition.mflow-transition-hover{stroke:var(--a3) !important;stroke-width:3px !important;filter:drop-shadow(0 0 5px rgba(74,159,255,0.7))}
/* Reconnect handles — sit right at an edge's own start/end point. Unlike
   .mflow-connect-handle (hidden until the NODE is hovered), these stay
   dimly visible always, since they're small and easy to miss otherwise —
   discoverability matters more here than tidiness, there's no per-node
   clutter concern the way there would be with N nodes each showing one. */
.mflow-edge-endpoint{opacity:.45;fill:var(--a3);stroke:var(--s1);stroke-width:1.2px;cursor:grab;transition:opacity .15s}
.mflow-edge-endpoint:hover{opacity:1;cursor:grabbing}
/* Floating multi-select toolbar — built fresh for this canvas (see
   MFlowCanvas.jsx's updateToolbarPos), NOT a port of BPMN's NodeToolbar.
   Visual language matches .mflow-view-controls (same pill/chip look this
   canvas already established) rather than .bpmn-context-menu's vertical
   list, since this is a horizontal action bar, not a menu. */
.mflow-selection-toolbar{position:absolute;transform:translate(-50%,-100%);display:flex;align-items:center;gap:4px;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:4px 6px;box-shadow:0 4px 14px rgba(0,0,0,.35);z-index:20;white-space:nowrap}
.mflow-selection-toolbar-count{font-size:9px;font-family:var(--mono);color:var(--dim);padding:0 4px}
.mflow-selection-toolbar button{display:flex;align-items:center;gap:3px;background:transparent;border:none;border-radius:3px;color:var(--mid);cursor:pointer;padding:3px 7px;font-size:9px;font-family:var(--mono);transition:all .15s}
.mflow-selection-toolbar button:hover{color:var(--text);background:var(--s3)}
/* Wraps .mflow-diagram so the empty-state message can sit as a non-blocking
   overlay on top of the real (always-mounted) canvas instead of replacing
   it — the dotted-grid background above IS the canvas, visible immediately
   once a workflow exists, zero states or not. */
.mflow-diagram-wrap{flex:1;display:flex;position:relative;min-height:0}
.mflow-diagram-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  pointer-events:none;color:var(--dim);font-family:var(--display);text-align:center;padding:20px}
.mflow-diagram-empty svg{opacity:.15;width:70px;height:70px;margin-bottom:12px}
.mflow-diagram-empty .blueprint-title{font-size:15px;margin-bottom:4px}
.mflow-diagram-empty .blueprint-sub{font-size:10.5px}

/* Live workflow-data panel — mirrors Studio's full left panel (States,
   Transitions, Users, Properties, Business Rules). Reuses .cc-sec*
   (Studio's collapsible section chrome) and .inline-mini (Studio's table
   styling) directly for the rows/sections, per "don't reinvent the wheel";
   only the panel shell/header here is new. Zero horizontal padding on the
   body so .cc-sec sections span edge-to-edge, matching how they look in
   Studio's own left panel. */
.mflow-table-panel{width:230px;flex-shrink:0;display:flex;flex-direction:column;background:var(--s1);border-left:1px solid var(--border);z-index:15}
.mflow-table-panel-head{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid var(--border);font-size:9.5px;color:var(--text);font-weight:600}
.mflow-table-panel-head button{background:none;border:none;color:var(--mid);cursor:pointer;padding:2px}
.mflow-table-panel-head button:hover{color:var(--text)}
.mflow-table-panel-body{flex:1;overflow-y:auto}
.mflow-table-panel .inline-mini{font-size:10px}
.mflow-table-panel .inline-mini th{font-size:8px;color:var(--dim);text-transform:uppercase;text-align:left;padding:2px 6px}
.mflow-table-panel tr.mflow-clickable-row{cursor:pointer}
.mflow-table-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.mflow-diamond-badge{color:#7c8cff;flex-shrink:0;margin-left:2px}
.mflow-hub-badge{color:var(--green);flex-shrink:0;margin-left:2px}

/* ── LiveTranslationView (right-hand split-screen panel) ── */
.mflow-ltv{height:100%;display:flex;flex-direction:column;background:var(--s1);overflow:hidden}
.mflow-ltv-head{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border);background:var(--s2)}
/* margin-left clears the divider chevron pair (.mflow-split-toggle-group,
   top:2px, centered on the divider right at this panel's left edge) --
   without it "M-Files Diagram" (the first tab label) sits directly under
   the chevron buttons. */
.mflow-ltv-tabs{display:flex;gap:2px;margin-left:26px}
.mflow-ltv-tabs button{font-size:9.5px;font-family:var(--mono);padding:4px 9px;border-radius:3px;border:1px solid transparent;background:transparent;color:var(--mid);cursor:pointer;transition:all .15s}
.mflow-ltv-tabs button:hover{color:var(--text);border-color:var(--border)}
.mflow-ltv-tabs button.on{color:var(--a3);background:rgba(74,159,255,.1);border-color:rgba(74,159,255,.3)}
.mflow-ltv-syncing{display:flex;align-items:center;gap:5px;font-size:9px;color:var(--a3);flex-shrink:0}
.mflow-ltv-spin{animation:mflow-ltv-spin .9s linear infinite}
@keyframes mflow-ltv-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.mflow-ltv-error{flex-shrink:0;padding:7px 10px;font-size:10px;color:var(--red);background:rgba(255,61,90,.08);border-bottom:1px solid var(--border)}
/* display:flex;flex-direction:column -- needed so .mflow-ltv-diagram-tab's
   own flex:1 (below) resolves against a real flex-computed height rather
   than a percentage through a scrolling ancestor, which Chromium doesn't
   reliably honor here (confirmed live: min-height:100% alone left a real
   gap below a short diagram on a tall real window, not just this app's
   earlier small dev-server test window). Flattened/JSON/Validation's own
   single-child content is unaffected -- a flex item with no explicit flex
   property still sizes to its own content, same as plain block flow did. */
.mflow-ltv-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column}
.mflow-ltv-empty{font-size:10px;color:var(--dim);font-style:italic;padding:6px 2px}
.mflow-ltv-empty-root{padding:20px;text-align:center}
.mflow-ltv-fade{animation:mflow-ltv-fadein .2s ease}
@keyframes mflow-ltv-fadein{from{opacity:0}to{opacity:1}}
/* .mflow-ltv-view-wrap -- the version-keyed fade wrapper (LiveTranslationView.
   jsx, shared by all 4 tabs) sits BETWEEN .mflow-ltv-body and .mflow-ltv-
   diagram-tab and is plain block by default, which was silently breaking
   the flex chain .mflow-ltv-body's own flex:1 comment above assumed was
   direct -- confirmed live via a real DOM parent-chain dump (Playwright),
   not guessed: .mflow-ltv-diagram-tab's flex:1 was correctly applied but
   had no effect because its actual parent wasn't a flex container. Only
   applied to that wrapper when the diagram tab is active (see the JSX's
   own conditional className), so Flattened/JSON/Validation never receive
   it and stay exactly as they were. */
.mflow-ltv-view-wrap{flex:1;min-height:0;display:flex;flex-direction:column}

/* .mflow-ltv-diagram-tab -- flex column wrapping the diagram wrap + its
   bottom scrollbar together, a real flex:1 child of .mflow-ltv-body (now
   also a flex column, see its own comment) so the dotted-grid canvas
   background runs all the way down (the left canvas's equivalent already
   fills its column the same way) instead of leaving a gap below a short
   diagram. min-height:0 overrides the flex default (min-height:auto),
   which would otherwise refuse to shrink below its own content height and
   defeat the scrolling this whole adapter depends on. */
.mflow-ltv-diagram-tab{flex:1;min-height:0;display:flex;flex-direction:column}
.mflow-ltv-diagram-wrap{flex:1;min-height:0;overflow:auto;position:relative;cursor:grab;
  background-color:#F8FAFC;
  background-image:radial-gradient(#CBD5E1 1.5px, transparent 1.5px);
  background-size:24px 24px;
  background-position:0 0;
}
.mflow-ltv-diagram-wrap.panning{cursor:grabbing}
/* Positions the shared .mflow-view-controls chip over this panel's own
   canvas — same floating-bottom-right pattern .cc-zoom-controls-wrap
   already established for Studio, applied here since this panel isn't
   .mflow-canvas-header (M-Files Flow's own top-bar placement doesn't apply). */
.mflow-ltv-zoom-controls-wrap{position:absolute;bottom:14px;right:16px;z-index:20}
.mflow-ltv-flat-label{font-size:9px;font-weight:600;color:var(--mid);letter-spacing:.6px;text-transform:uppercase;margin:14px 0 6px}
.mflow-ltv-flat-label:first-child{margin-top:0}
.mflow-ltv-states{display:flex;flex-wrap:wrap;gap:8px}
.mflow-ltv-state-box{min-width:96px;padding:8px 10px;border:1px solid var(--border);border-radius:4px;background:var(--s2);transition:border-color .12s,box-shadow .12s}
.mflow-ltv-state-box.hover{border-color:var(--a3);box-shadow:0 0 0 1px var(--a3),0 0 8px rgba(74,159,255,.35)}
.mflow-ltv-state-name{font-size:11px;color:var(--text);font-weight:600}
.mflow-ltv-state-badges{display:flex;gap:4px;margin-top:4px}
.mflow-ltv-badge{font-size:8px;padding:1px 5px;border-radius:3px;letter-spacing:.3px}
.mflow-ltv-badge-initial{color:var(--green);background:rgba(0,200,112,.12)}
.mflow-ltv-badge-terminal{color:var(--gold);background:rgba(240,165,0,.12)}
.mflow-ltv-state-caption{margin-top:5px;font-size:8.5px;color:var(--dim);font-style:italic}

.mflow-ltv-transitions{display:flex;flex-direction:column;gap:6px}
.mflow-ltv-trans-row{padding:8px 10px;border:1px solid var(--border);border-radius:4px;background:var(--s2)}
.mflow-ltv-trans-path{font-size:10.5px;color:var(--text)}
.mflow-ltv-arrow{color:var(--mid);margin:0 3px}
.mflow-ltv-trans-meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.mflow-ltv-chip{font-size:8px;padding:1px 6px;border-radius:8px;border:1px solid var(--border);color:var(--mid)}
.mflow-ltv-chip-warn{color:var(--gold);border-color:var(--gold)}
.mflow-ltv-trans-rule{margin-top:5px;font-size:8.5px;color:var(--dim)}

.mflow-ltv-json{font-size:9.5px;line-height:1.5;color:var(--text);white-space:pre-wrap;word-break:break-word;margin:0}
/* Studio's own JSON tab — same layout properties its old inline-styled
   <pre> had (font-family var(--mono) comes from body's own default, so
   isn't repeated here), now a real class so it can share the token-color
   rules below with M-Files Flow's .mflow-ltv-json instead of each view
   needing its own copy. */
.cc-json-view{font-size:10px;line-height:1.7;color:var(--text);white-space:pre-wrap;margin:0}
/* JSON syntax-highlight tokens — shared by .cc-json-view (Studio) and
   .mflow-ltv-json (M-Files Flow), see utils/jsonHighlight.js. Colors reuse
   tokens already established elsewhere rather than a new palette: --a3 is
   the diagram's own accent/selection blue, --green/--gold/--purple already
   distinguish States/Users/Properties/Rules on the Stats view. */
.jk{color:var(--a3)}          /* object keys */
.js{color:var(--green)}       /* string values */
.jn{color:var(--gold)}        /* numbers */
.jb{color:#A78BFA}            /* booleans — matches the AI-mode accent purple used elsewhere */
.jz{color:var(--dim)}         /* null */

.mflow-ltv-status-banner{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:600;padding:7px 10px;border-radius:4px;margin-bottom:10px}
.mflow-ltv-status-banner.ok{color:var(--green);background:rgba(0,200,112,.1)}
.mflow-ltv-status-banner.error{color:var(--red);background:rgba(255,61,90,.1)}
.mflow-ltv-validation-summary{font-size:9.5px;color:var(--mid2);padding:0 2px 10px;font-family:var(--mono)}
.mflow-ltv-issue{display:flex;gap:7px;padding:8px 10px;border:1px solid var(--border);border-radius:4px;background:var(--s2);margin-bottom:6px}
.mflow-ltv-issue-error{border-color:rgba(255,61,90,.35)}
.mflow-ltv-issue-error svg{color:var(--red);flex-shrink:0}
.mflow-ltv-issue-warning svg{color:var(--gold);flex-shrink:0}
.mflow-ltv-issue-head{font-size:9.5px;font-weight:600;color:var(--text)}
.mflow-ltv-issue-msg{font-size:9.5px;color:var(--mid);margin-top:3px;line-height:1.4}
.mflow-ltv-issue-edge{font-size:8.5px;color:var(--dim);margin-top:3px;font-style:italic}

.mflow-pal-shell{width:44px;flex-shrink:0;position:relative;z-index:20}
.mflow-pal-shell.pinned{width:240px}
.mflow-pal-panel{position:relative;width:44px;height:100%;display:flex;flex-direction:column;overflow:hidden;background:rgba(7,17,31,0.85);backdrop-filter:blur(12px);border-right:1px solid var(--border)}
.mflow-pal-shell.pinned .mflow-pal-panel{width:240px;transition:width .15s ease}
.mflow-pal-head{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--border)}
.mflow-pal-search-wrap{flex:1;position:relative;display:flex;align-items:center;min-width:0}
.mflow-pal-search-icon{position:absolute;left:7px;color:var(--dim);pointer-events:none}
.mflow-pal-search{width:100%;padding:5px 8px 5px 24px;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:var(--mono);font-size:9.5px}
.mflow-pal-search:focus{outline:none;border-color:var(--a2)}
.mflow-pal-toggle{width:20px;height:20px;flex-shrink:0;border-radius:4px;border:1px solid var(--border);background:linear-gradient(180deg,var(--s3),var(--s2));color:var(--mid);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.mflow-pal-toggle:hover{color:var(--a3);border-color:var(--a2)}
.mflow-pal-toggle.active{color:var(--a3);border-color:var(--a2);background:rgba(74,159,255,.12)}
.mflow-pal-body{flex:1;overflow-y:auto;padding:10px 8px;display:flex;flex-direction:column;gap:12px}
.mflow-pal-group{display:flex;flex-direction:column;gap:4px}
.mflow-pal-group-lbl{font-size:8px;color:var(--mid);letter-spacing:.8px;text-transform:uppercase;padding:0 2px}
.mflow-pal-tiles{display:flex;flex-direction:column;gap:3px}
.mflow-pal-tile{display:flex;align-items:center;gap:8px;padding:6px 8px;width:100%;background:var(--s3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s;text-align:left}
.mflow-pal-tile:hover{border-color:var(--a2);color:var(--a3);background:var(--s4)}
.mflow-pal-tile svg{flex-shrink:0}
.mflow-pal-tile-label{white-space:nowrap}
.mflow-pal-empty{font-size:9.5px;color:var(--dim);padding:6px 2px}
/* Connectors' info note — deliberately not tile-shaped, so it reads as
   explanatory text (this canvas's real drag-to-connect mechanism) rather
   than a broken/disabled control. */
.mflow-pal-info{display:flex;align-items:flex-start;gap:7px;padding:7px 8px;background:rgba(74,159,255,.06);border:1px solid rgba(74,159,255,.18);border-radius:6px;color:var(--mid);font-size:9.5px;line-height:1.5}
.mflow-pal-info svg{flex-shrink:0;margin-top:1px;color:var(--a3)}
.mflow-pal-rail{flex:1;overflow-y:auto;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:4px}
.mflow-pal-tile.compact{width:32px;height:32px;padding:0;justify-content:center}
.mflow-pal-rail-group{display:flex;flex-direction:column;align-items:center;gap:4px;width:100%}
.mflow-pal-rail-divider{width:24px;height:1px;background:var(--border);margin:4px 0}
.mflow-pal-nudge{width:32px;height:22px;background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--mid);cursor:pointer;font-size:11px;margin-bottom:4px}
.mflow-pal-nudge:hover{color:var(--a3);border-color:var(--a2)}
.mflow-pal-style-row{display:flex;align-items:center;gap:6px;font-size:9.5px;color:var(--mid);padding:2px}
.mflow-pal-style-row input[type=color]{width:20px;height:20px;padding:0;border:1px solid var(--border);border-radius:3px;background:none;cursor:pointer;flex-shrink:0}
.mflow-pal-style-row span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mflow-pal-style-empty{font-size:9px;color:var(--dim);padding:2px;font-style:italic}
/* Palette "Layers" list — Figma-style click-to-select/highlight, live off
   the active workflow's real states. Row chrome intentionally mirrors
   .mflow-pal-tile's own look (same padding/radius/hover) rather than
   inventing a new one. */
.mflow-pal-layers{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto}
.mflow-pal-layer-row{display:flex;align-items:center;gap:6px;padding:4px 8px;width:100%;background:transparent;border:1px solid transparent;border-radius:6px;color:var(--text);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s;text-align:left}
.mflow-pal-layer-row:hover{background:var(--s3);border-color:var(--border)}
.mflow-pal-layer-row.sel{background:rgba(74,159,255,.12);border-color:var(--a2);color:var(--a3)}
.mflow-pal-layer-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.mflow-pal-layer-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mflow-pal-layer-flag{flex-shrink:0;color:var(--a3);font-size:8px}
.mflow-pal-layer-diamond{flex-shrink:0;color:#7c8cff}
.mflow-pal-layer-hub{flex-shrink:0;color:var(--green)}
/* Quick preset color-dot row on the state right-click menu — reuses
   .bpmn-context-menu's own padding/font language, just adds the dot grid. */
.mflow-menu-swatches{display:grid;grid-template-columns:repeat(3,12px);gap:8px 12px;padding:4px 10px 6px}
/* Diamond right-click info block — wrapped body text, distinct from
   .bpmn-context-menu-label's single-line convention since this is the
   first place this menu needs a multi-line explanation rather than a
   short header. */
.mflow-menu-diamond-info{max-width:220px;padding:0 10px 4px;font-family:var(--mono);font-size:9.5px;line-height:1.4;color:var(--dim);white-space:normal}
/* .bpmn-context-menu button{width:100%;display:block;...} otherwise wins on
   specificity (class+element vs. class alone) and stretches these into
   full-width bars instead of dots — beat it explicitly rather than relying
   on source order. */
.mflow-menu-swatches .mflow-menu-swatch{width:12px!important;height:12px!important;display:inline-block!important;border-radius:50%;border:1px solid rgba(255,255,255,.15);cursor:pointer;padding:0;transition:transform .1s}
.mflow-menu-swatches .mflow-menu-swatch:hover{transform:scale(1.3);border-color:rgba(255,255,255,.5)}
.mflow-menu-swatches .mflow-menu-swatch-clear{background:var(--s2);display:inline-flex!important;align-items:center;justify-content:center;font-size:6px;color:var(--dim);line-height:1}
.mflow-pal-tile-with-dot{display:flex;align-items:center;gap:0;padding:0}
.mflow-pal-tile-inner{flex:1;display:flex;align-items:center;gap:8px;padding:6px 8px;background:none;border:none;color:inherit;font-family:var(--mono);font-size:10px;cursor:pointer;text-align:left}
/* Icon + corner color-dot badge — matches the reference the user provided:
   a small colored dot overlapping the icon's bottom-right corner, not a
   separate full-size swatch. Used for the State tile's "main color for new
   states" and the Status tile's "color for new comment boxes." */
.mflow-icon-badge{position:relative;display:inline-flex;flex-shrink:0}
.mflow-icon-badge-dot{position:absolute;bottom:-3px;right:-4px;width:9px;height:9px;padding:0;border:1.5px solid var(--s3);border-radius:50%;background:none;cursor:pointer;overflow:hidden}
.mflow-icon-badge-dot::-webkit-color-swatch-wrapper{padding:0}
.mflow-icon-badge-dot::-webkit-color-swatch{border:none;border-radius:50%}
/* State tile's cosmetic corner mark (top-left, opposite the color dot) —
   same diamond color already used for the auto-detected badge elsewhere
   (Layers list, canvas, right-click menu), purely a visual hint here, not
   interactive — pointer-events:none so it can never intercept the tile's
   own click/color-input targets sitting right next to it. */
.mflow-icon-badge-corner{position:absolute;top:-3px;left:-4px;color:#7c8cff;background:var(--s3);border-radius:2px;pointer-events:none}

/* ── BPMN documentation canvas (Process Docs section) — isolated from Studio ── */
.bpmn-canvas-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;background:var(--bg)}
.bpmn-body{flex:1;display:flex;min-height:0;overflow:hidden}
.bpmn-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
/* position+z-index above the palette overlay (z-index:20) — the hover-expanded
   palette panel is 240px wide but the rail it grows from is only 44px, so
   without this its solid background would cover Auto-arrange/Animate. */
.bpmn-toolbar{flex-shrink:0;position:relative;z-index:25;display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--s2);border-bottom:1px solid var(--border);flex-wrap:wrap}
.bpmn-viewport-controls,
.bpmn-layout-controls,
.bpmn-io-controls,
.bpmn-reference-controls{display:flex;align-items:center;gap:4px;flex-shrink:0}
/* Export/Import dropdown wrapper (2026-08-22 UX pass, unified control) —
   reuses .bpmn-history/.bpmn-shortcuts' own position:relative + dropdown
   pattern rather than inventing a new one. */
.bpmn-export-menu{position:relative}
/* Icon glyph, normalized (2026-08-22 UX pass, item 3) — toolbar icons are a
   mix of emoji (💾📂⌨🔓🔒) and monospace math/arrow glyphs (＋－↶↷⟲↺⇩⇧▶),
   which render at different natural sizes/baselines side by side. Wrapping
   each in this span and fixing font-size/line-height/width makes every
   button's leading icon occupy the same visual footprint regardless of
   which glyph family it comes from, without replacing the glyphs
   themselves (an icon-library swap is a bigger, riskier change than this
   purely-visual pass calls for). */
.bpmn-tb-icon{display:inline-block;width:13px;font-size:11px;line-height:1;text-align:center;vertical-align:-1px}
/* Zoom stepper (2026-08-22) — Zoom in/out combined into one visual control,
   + on top / - on bottom, same outer chrome .xb buttons already use so it
   still reads as part of the toolbar's own button family. */
.bpmn-zoom-stack{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:3px;overflow:hidden;flex-shrink:0}
.bpmn-zoom-stack button{
  font-size:9.5px;font-family:var(--mono);padding:1px 10px;border:none;background:transparent;
  color:var(--mid2);cursor:pointer;transition:all .15s;line-height:1.5;
}
.bpmn-zoom-stack button:first-child{border-bottom:1px solid var(--border)}
.bpmn-zoom-stack button:hover{background:var(--s3);color:var(--a3)}
/* Groups functional clusters instead of one flat button row — height only
   (not the toolbar's own top/bottom padding), so it reads as a quiet
   separator rather than a heavy rule. */
.bpmn-toolbar-divider{width:1px;align-self:stretch;background:var(--border);flex-shrink:0}
.bpmn-status{font-size:9.5px;padding:3px 8px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}
.bpmn-status-ok{color:var(--green);background:rgba(76,201,145,.1)}
.bpmn-status-warn{color:var(--gold);background:rgba(240,165,0,.1)}
.bpmn-status-error{color:var(--red);background:rgba(230,90,90,.1)}
.bpmn-flow-wrap{flex:1;min-height:0}

/* ── BPMN left palette — hover-expand rail, grouped by category ──
   Structurally still a left-docked sidebar (one review argued for replacing
   it with a floating toolbar entirely; rejected, kept as-is here). The shell
   always reserves 44px of real layout width (so the canvas never reflows on
   hover) unless pinned, in which case it reserves 200px permanently — the
   panel inside is what actually changes size, floating over the canvas via
   position:absolute when expanded-but-unpinned. 44px is the VS Code/GitHub/
   Slack icon-rail convention — confirmed against this app's own 32px compact
   tile (bpmn-pal-tile.compact below) before using it: ~6px margin each side,
   comfortable, not forced. Was 48px; tightened here after checking, not
   guessed at (an external review guessed "60-80px" without checking either
   number — the real prior value was 48px, not that).
   175px (was 200px, then 240px before that — 2026-08-22, second UX pass,
   grid-layout redesign): measured, not guessed, same discipline as the
   first width change but with a real lesson learned along the way. The
   palette's expanded categories moved from full-width icon+label rows to
   an icon-on-top/label-below grid (operator-provided reference layout).
   grid-template-columns:repeat(auto-fit,minmax(64px,1fr)) — 64px is the
   measured minimum that keeps this app's longest real single-word labels
   ("Exclusive"/"Inclusive", no hyphen or space to wrap at) on one line.
   Below 160px real container width, auto-fit silently collapses every
   category to 1 column instead of 2 — that's NOT the same thing as "zero
   horizontal overflow," which stayed true even at 130px because a 1-column
   stack always fits; a naive overflow-only check would have picked a width
   that looked fine numerically while actually regressing back to the old
   row-list layout visually. Caught by measuring actual rendered column
   COUNT per category at each width, not just overflow. 175px sits safely
   above the exact 155->160px collapse cliff (padding + the sidebar's own
   scrollbar eat into the raw minmax math, so the real threshold is tighter
   than 2*64px+gap suggests), giving every category a real 2-column grid
   (Gateways/Connectors settle into a clean 2+1 layout, three real items
   never fitting 3-wide at any width narrow enough to be worth using) with
   zero truncation and zero mid-word breaks. */
.bpmn-pal-shell{width:44px;flex-shrink:0;position:relative;z-index:20}
.bpmn-pal-shell.pinned{width:175px}
.bpmn-pal-panel{
  position:relative;width:44px;height:100%;display:flex;flex-direction:column;overflow:hidden;
  background:rgba(7,17,31,0.85);backdrop-filter:blur(12px);border-right:1px solid var(--border);
}
/* Overlay case (hover, not pinned): position snaps from relative to absolute
   at the same moment width changes — animating width across that snap reads
   as a glitch (and measures unreliably), so this transitions instantly. */
.bpmn-pal-shell:not(.pinned) .bpmn-pal-panel.expanded{
  position:absolute;left:0;top:0;bottom:0;width:175px;box-shadow:8px 0 24px rgba(0,0,0,.45);
}
/* Pinned case: position never changes (stays relative/in-flow), so a width
   transition here is safe and reads as an intentional, smooth pin/unpin. */
.bpmn-pal-shell.pinned .bpmn-pal-panel{width:175px;transition:width .15s ease}
.bpmn-pal-sidebar-head{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--border)}
/* Advanced section toggle (2026-08-22) — same chevron-rotate convention
   Command Center's own collapsible sections already use (.cc-sec-chev),
   applied here rather than inventing a new expand/collapse visual
   language. Reuses .bpmn-pal-group-lbl for the text so the label itself
   looks identical to every other category heading; only the button
   wrapper and chevron are new. */
.bpmn-pal-advanced-toggle{display:flex;align-items:center;gap:4px;width:100%;padding:0;background:none;border:none;cursor:pointer;text-align:left}
.bpmn-pal-advanced-toggle:hover .bpmn-pal-group-lbl{color:var(--a3)}
.bpmn-pal-advanced-chevron{color:var(--mid2);transition:transform .15s;flex-shrink:0}
.bpmn-pal-advanced-chevron.open{transform:rotate(90deg)}
/* Advanced section content (2026-08-22) — 6 icon-only placeholders,
   "small icon only" per operator instruction, not the icon+label grid
   every real category uses. flex-wrap, not CSS grid: these are 32px
   .bpmn-pal-tile.compact tiles, much smaller than .bpmn-pal-tiles-grid's
   64px minmax track, so reusing that grid would leave large gaps —
   a wrapping flex row packs them tightly instead, as many per row as
   the panel width allows. */
.bpmn-pal-advanced-caption{font-size:8.5px;color:var(--dim);font-style:italic;padding:0 2px 2px;line-height:1.4}
.bpmn-pal-tiles-compact-grid{display:flex;flex-wrap:wrap;gap:6px}
/* Sub-group headers inside Advanced (2026-08-22) — all 12 placeholders
   consolidated here, grouped by real BPMN category (Events/Gateways/
   Data-Artifacts/Containers) rather than one undifferentiated row of 12
   icons. Smaller/dimmer than .bpmn-pal-group-lbl (the top-level category
   heading) so the nesting reads clearly — this is a sub-heading within
   Advanced, not a peer of Events/Activities/Gateways/etc. */
.bpmn-pal-advanced-subgroup{display:flex;flex-direction:column;gap:4px;margin-top:6px}
.bpmn-pal-advanced-subgroup:first-of-type{margin-top:0}
.bpmn-pal-advanced-subgroup-lbl{font-size:7.5px;color:var(--dim);letter-spacing:.6px;text-transform:uppercase;padding:0 2px}
.bpmn-pal-search-wrap{flex:1;position:relative;display:flex;align-items:center;min-width:0}
.bpmn-pal-search-icon{position:absolute;left:7px;color:var(--dim);pointer-events:none}
.bpmn-pal-search{width:100%;padding:5px 8px 5px 24px;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:var(--mono);font-size:9.5px}
.bpmn-pal-search:focus{outline:none;border-color:var(--a2)}
.bpmn-pal-toggle{width:20px;height:20px;flex-shrink:0;border-radius:4px;border:1px solid var(--border);background:linear-gradient(180deg,var(--s3),var(--s2));color:var(--mid);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.bpmn-pal-toggle:hover{color:var(--a3);border-color:var(--a2);background:linear-gradient(180deg,var(--s4),var(--s3))}
.bpmn-pal-toggle.active{color:var(--a3);border-color:var(--a2);background:rgba(74,159,255,.12)}
.bpmn-pal-sidebar-body{flex:1;overflow-y:auto;padding:10px 8px;display:flex;flex-direction:column;gap:12px}
.bpmn-pal-group{display:flex;flex-direction:column;gap:4px}
.bpmn-pal-group-lbl{font-size:8px;color:var(--mid2);letter-spacing:.8px;text-transform:uppercase;padding:0 2px}
.bpmn-pal-tiles{display:flex;flex-direction:column;gap:3px}
/* auto-fit + minmax, not a hardcoded column count: 64px is the measured
   minimum that keeps every real label here ("Exclusive"/"Inclusive",
   this app's longest single-word, unhyphenatable BPMN names) on one
   line without the ugly mid-word breaks a fixed 3-column grid forced at
   this panel's narrower widths. A 2-item row naturally shows 2 columns,
   a 3-item row shows 3 when there's room and wraps to 2+1 otherwise —
   content-driven, not JS-computed from item count. */
.bpmn-pal-tiles-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(64px,1fr));gap:6px}
.bpmn-pal-tile{
  display:flex;align-items:center;gap:8px;padding:6px 8px;width:100%;
  background:var(--s3);border:1px solid var(--border);border-radius:6px;
  color:var(--text);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s;text-align:left;
}
.bpmn-pal-tile:hover:not(:disabled){border-color:var(--a2);color:var(--a3);background:var(--s4)}
.bpmn-pal-tile:disabled{opacity:.4;cursor:not-allowed}
.bpmn-pal-tile-label{white-space:nowrap}
/* Grid tiles (2026-08-22, operator-provided reference layout) — icon on
   top, label below, replacing the old full-width icon+label row for every
   expanded category except Connectors (own compact grid, below). Label
   wraps here (unlike the row variant above) since a 2-3-column tile is
   narrower than the longest label ("Sub-Process") at any width worth
   using — confirmed via live measurement before picking the final panel
   width, not assumed. */
/* min-width:0 overrides a grid item's default min-width:auto, which
   otherwise equals the tile's longest unbreakable word ("Exclusive",
   "Routable", …) and silently floors the whole grid's real width no
   matter how narrow the container is set — found live via a fixed
   234px horizontal-overflow that didn't budge across seven tested
   container widths, before this fix. */
.bpmn-pal-tile.grid{flex-direction:column;justify-content:center;gap:5px;padding:9px 4px;min-width:0}
/* white-space:normal only, no word-break:break-word — a first pass with
   break-word produced "Exclu"/"sive" and "Paral"/"lel", genuinely ugly
   mid-word splits, since these BPMN gateway names have no natural break
   point (no hyphen/space) for the browser to use. The real fix is
   auto-fit's minmax() below keeping every tile wide enough for its
   longest single-word label on one line; word-wrap is still allowed for
   labels that DO have a natural break point ("Sub-Process"). */
.bpmn-pal-tile.grid .bpmn-pal-tile-label{white-space:normal;line-height:1.25;text-align:center}
.bpmn-pal-empty{font-size:9.5px;color:var(--dim);padding:6px 2px}
/* Connectors' info note — deliberately NOT tile-shaped (no border/button
   look), so it reads as explanatory text rather than a broken control. */
.bpmn-pal-info{
  display:flex;align-items:flex-start;gap:7px;padding:7px 8px;
  background:rgba(74,159,255,.06);border:1px solid rgba(74,159,255,.18);border-radius:6px;
  color:var(--mid2);font-size:9.5px;line-height:1.5;
}
.bpmn-pal-info svg{flex-shrink:0;margin-top:1px;color:var(--a3)}

/* Connector-style picker (Orthogonal/Straight/Curved) — whole-canvas, lives
   under the Connectors group, expanded-only (see BpmnPalette.jsx). */
.bpmn-pal-segmented{display:flex;gap:2px;margin-top:2px;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:2px}
.bpmn-pal-segmented button{flex:1;display:flex;align-items:center;justify-content:center;padding:5px 0;background:none;border:none;border-radius:4px;color:var(--mid2);cursor:pointer;transition:all .15s}
.bpmn-pal-segmented button:hover{color:var(--a3)}
.bpmn-pal-segmented button.active{background:var(--a2);color:#fff}

/* New-connection edge-type picker (Default/Editable/Routable), sits below
   the connector-style segmented control, same Connectors group.
   Redesigned 2026-08-22 (operator-provided reference layout) from vertical
   stacked cards into a compact 3-icon grid, matching the reference's
   density — but the operator was explicit this must not become
   hover-only like a plain tooltip, since which renderer a new edge gets
   is a real, consequential choice. Resolution: .bpmn-pal-edge-type-desc
   below is a real, always-rendered line (not a :hover-only reveal) that
   shows whichever option is hovered/focused (BpmnPalette.jsx's
   hoveredEdgeType), falling back to the currently SELECTED option at
   rest — so a description is always visible, never blank, while the
   grid itself stays compact. --edge-type-color is set inline per option
   (each type's own real on-canvas default stroke color), driving the
   icon tint, active tint, and the radio-dot badge together from one
   value — same mechanism as before, just applied to a tile shape instead
   of a card row. */
.bpmn-pal-edge-type-heading{margin-top:2px}
.bpmn-pal-edge-type-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(64px,1fr));gap:6px;margin-top:2px}
.bpmn-pal-edge-type-option{
  position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;
  padding:9px 4px;background:var(--s3);border:1px solid var(--border);border-radius:7px;
  color:var(--text);font-family:var(--mono);cursor:pointer;text-align:center;
  transition:border-color .15s,background .15s;min-width:0; /* same grid-shrink fix as .bpmn-pal-tile.grid */
}
.bpmn-pal-edge-type-option:hover:not(:disabled){border-color:var(--edge-type-color);background:var(--s4)}
.bpmn-pal-edge-type-option:hover:not(:disabled) .bpmn-pal-tile-label{color:var(--a3)}
.bpmn-pal-edge-type-option.active{border-color:var(--edge-type-color);background:color-mix(in srgb, var(--edge-type-color) 12%, var(--s3))}
.bpmn-pal-edge-type-option:disabled{opacity:.45;cursor:not-allowed}
.bpmn-pal-edge-type-option svg{flex-shrink:0;color:var(--edge-type-color)}
.bpmn-pal-edge-type-option .bpmn-pal-tile-label{white-space:normal;line-height:1.25}
.bpmn-pal-edge-type-loading{display:block;font-size:7px;color:var(--gold);font-weight:500}
/* Radio-dot badge — corner overlay instead of the old trailing-dot-in-a-row
   position, since the tile is vertical now. Filled center only on .active. */
.bpmn-pal-edge-type-check{
  position:absolute;top:4px;right:4px;width:9px;height:9px;border-radius:50%;
  border:1.5px solid var(--edge-type-color);opacity:.5;transition:opacity .15s;
}
.bpmn-pal-edge-type-check::after{content:'';position:absolute;inset:1.5px;border-radius:50%;background:var(--edge-type-color);transform:scale(0);transition:transform .15s}
.bpmn-pal-edge-type-option.active .bpmn-pal-edge-type-check{opacity:1}
.bpmn-pal-edge-type-option.active .bpmn-pal-edge-type-check::after{transform:scale(1)}
/* Shared description line — see the big comment above for why this exists
   instead of a per-card hint or a hover-only tooltip. min-height reserves
   space for the longest hint at this font size/width so the grid below it
   doesn't shift up and down as the shown text's line count changes. */
.bpmn-pal-edge-type-desc{font-size:8.5px;color:var(--mid2);line-height:1.4;padding:3px 2px 0;min-height:2.8em}
.bpmn-pal-edge-type-note{display:flex;align-items:flex-start;gap:6px;padding:1px 2px 0;color:var(--dim);font-size:8.5px;line-height:1.4}
.bpmn-pal-edge-type-note svg{flex-shrink:0;margin-top:1px;opacity:.6}

/* Collapsed rail (44px, icon-only) — same tiles, compact variant. */
.bpmn-pal-rail{flex:1;overflow-y:auto;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:4px}
.bpmn-pal-nudge{
  width:28px;height:18px;border-radius:5px;border:1px solid var(--border);
  background:linear-gradient(180deg,var(--s3),var(--s2));color:var(--mid);
  cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;
  transition:all .15s;box-shadow:0 2px 6px rgba(0,0,0,.35);margin-bottom:2px;
}
.bpmn-pal-nudge:hover{color:var(--a3);border-color:var(--a2);background:linear-gradient(180deg,var(--s4),var(--s3))}
/* Advanced rail toggle's pressed/open state (2026-08-22) — same active
   convention as .bpmn-pal-toggle.active elsewhere in this palette. The
   chevron's own rotate-on-open behavior is already covered by
   .bpmn-pal-advanced-chevron.open (shared with the expanded panel's
   toggle), so nothing extra is needed for it here. */
.bpmn-pal-nudge.active{color:var(--a3);border-color:var(--a2);background:rgba(74,159,255,.12)}
.bpmn-pal-rail-group{display:flex;flex-direction:column;align-items:center;gap:4px;width:100%}
.bpmn-pal-rail-divider{width:24px;height:1px;background:var(--border);margin:4px 0}
.bpmn-pal-tile.compact{width:32px;height:32px;padding:0;justify-content:center}

/* ── BPMN typed-element icons (Phase C) — only appear for real bpmn-moddle
   subtypes read off imported XML; a generic Task/Start/End renders as plain
   text, unchanged. text-align:center on the node itself won't center a flex
   row, hence the explicit justify-content here. ── */
.bpmn-node-icon-row{display:flex;align-items:center;justify-content:center;gap:6px}

/* ── Handle hit-testing fix — without an explicit z-index, a handle sitting
   at its parent node's own edge (Top/Bottom/Right/Left position all place it
   right on the node's boundary, half in/half out) loses hit-testing to the
   parent node's own draggable surface across most of its visible area —
   confirmed live: a 16x16px grid scan around a handle found only a thin
   sliver at its outermost edge actually resolved to the handle itself, the
   rest fell through to the node underneath and started a node-drag instead
   of a connection. Applies to every handle on this canvas (task/event/
   gateway), not just one type. ── */
.react-flow__handle{ z-index: 1; }

/* ── Magic connector (Phase D) — the "+" is the existing source handle,
   grown and given a plus glyph on node hover rather than a second element
   layered on top of it (which would risk a duplicate connection point). ── */
.react-flow__node-default .react-flow__handle-bottom,
.react-flow__node-input .react-flow__handle-bottom{
  width:7px;height:7px;opacity:.6;transition:all .15s;background:var(--mid);border-color:var(--bdr2);
}
.react-flow__node-default:hover .react-flow__handle-bottom,
.react-flow__node-input:hover .react-flow__handle-bottom{
  width:17px;height:17px;opacity:1;background:var(--a2);border-color:var(--a3);
  display:flex;align-items:center;justify-content:center;
}
.react-flow__node-default:hover .react-flow__handle-bottom::after,
.react-flow__node-input:hover .react-flow__handle-bottom::after{
  content:'+';color:#fff;font-size:12px;font-weight:700;line-height:1;
}

/* ── Gateway connection handles — hidden by default, revealed on hover or
   selection, color-matched per instance via GatewayNode.jsx's own inline
   background/borderColor (background-color here would only win if it beat
   inline on specificity, which it can't — this rule exists purely for
   opacity/border-width, which don't vary per type and so belong in CSS). ── */
.react-flow__node-gateway .react-flow__handle{
  opacity:0;transition:opacity .15s,width .15s,height .15s,border-color .15s;border-width:1.5px;
  width:8px;height:8px;
}
.react-flow__node-gateway:hover .react-flow__handle,
.react-flow__node-gateway.selected .react-flow__handle{
  opacity:1;
  width:12px;height:12px;
  border-color:var(--a3);
}

@media (prefers-reduced-motion: reduce){
  .react-flow__node-gateway,
  .react-flow__node-gateway .react-flow__handle{
    transition:none !important;
  }
}

/* ── Floating node toolbar + inline inspector (Phase D) — Edit/Duplicate/
   Delete on the selected element; Edit expands the inspector in place
   rather than opening a second floating element. ── */
.bpmn-node-toolbar{display:flex;flex-direction:column;gap:6px;background:var(--s3);border:1px solid var(--border);border-radius:7px;padding:5px;box-shadow:0 6px 18px rgba(0,0,0,.4)}
.bpmn-node-toolbar-actions{display:flex;gap:4px}
.bpmn-node-toolbar-actions button{
  padding:4px 9px;background:var(--s4);border:1px solid var(--border);border-radius:5px;
  color:var(--text);font-family:var(--mono);font-size:9.5px;cursor:pointer;white-space:nowrap;transition:all .15s;
}
.bpmn-node-toolbar-actions button:hover{border-color:var(--a2);color:var(--a3)}
.bpmn-node-toolbar-actions button.active{border-color:var(--a2);color:var(--a3);background:rgba(74,159,255,.12)}
/* Right-click context menu — a second, faster path alongside double-click.
   position:fixed at the raw cursor coordinates (set inline per-open), so
   this needs no positioning logic here beyond the visual chrome. */
.bpmn-context-menu{
  position:fixed; z-index:50; display:flex; flex-direction:column; gap:2px; padding:5px;
  background:var(--s3); border:1px solid var(--border); border-radius:7px; box-shadow:0 8px 24px rgba(0,0,0,.5);
  min-width:140px;
}
.bpmn-context-menu button{
  display:block; width:100%; text-align:left; padding:6px 10px;
  background:none; border:none; border-radius:5px; color:var(--text);
  font-family:var(--mono); font-size:10.5px; cursor:pointer; transition:all .1s;
}
.bpmn-context-menu button:hover{ background:var(--s4); color:var(--a3); }
.bpmn-context-menu button:disabled{ color:var(--dim); cursor:not-allowed; background:none; }
.mflow-menu-input{ background:var(--s2); border:1px solid var(--border); border-radius:5px; color:var(--text); font-family:var(--mono); font-size:10px; padding:5px 8px; margin:2px; outline:none; width:calc(100% - 4px); box-sizing:border-box; }
.mflow-menu-input:focus{ border-color:var(--a3); box-shadow:0 0 4px rgba(74,159,255,0.4); }
.bpmn-context-menu-divider{ height:1px; background:var(--border); margin:3px 2px; }
.bpmn-context-menu-label{
  padding:5px 10px 2px; color:var(--a3); font-family:var(--mono); font-size:9.5px; font-weight:600;
}

.bpmn-bulk-count{
  display:flex;align-items:center;padding:0 8px 0 2px;
  color:var(--a3);font-family:var(--mono);font-size:9.5px;font-weight:600;white-space:nowrap;
}
.bpmn-node-inspector{display:flex;flex-direction:column;gap:5px;padding:7px;border-top:1px solid var(--border);min-width:200px}
.bpmn-node-inspector-row{display:flex;align-items:center;gap:8px;font-size:9.5px}
/* --mid2, not --dim: --dim measured ~1.4:1 against this row's real
   background (var(--s3), the floating node-toolbar's own bg) via
   getComputedStyle — the same catastrophic-contrast bug already found
   and fixed on the edge-type picker's hint text, just never checked
   here until this pass. --mid2 measures ~5:1 on the same background. */
.bpmn-node-inspector-row>span{width:34px;flex-shrink:0;color:var(--mid2);text-transform:uppercase;letter-spacing:.5px;font-size:8px}
.bpmn-node-inspector-row code{color:var(--a3);font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpmn-node-inspector-row input{flex:1;padding:3px 6px;background:var(--s2);border:1px solid var(--border);border-radius:4px;color:var(--text);font-family:var(--mono);font-size:10px}
.bpmn-node-inspector-row input:focus{outline:none;border-color:var(--a2)}

/* Edge toolbar reuses node-toolbar visual language; this wrapper only anchors
  it in edge-label space from EdgeLabelRenderer. */
.bpmn-edge-toolbar{position:absolute;z-index:30;pointer-events:all}

/* Edge hit-testing: orthogonal gateway branches can have a large route bbox
  whose visual center sits in empty space; using SVG bounding-box hit testing
  keeps selection behavior consistent across edge geometries. */
.react-flow__edge-flowEdge{pointer-events:bounding-box}

/* ── Pool container (Stage 1, React Flow Pro enhancements) — sizing comes
   from node.style.width/height (set in useBpmnStore.js's addPool), applied
   by React Flow to the outer wrapper; this just fills it. Vertical label
   strip is real BPMN pool/lane convention, not invented layout. The dashed
   border reads as "documentation-only structure," distinct from the solid
   borders on real Task/Event/Gateway shapes. ── */
.bpmn-pool{
  width:100%;height:100%;position:relative;box-sizing:border-box;
  border:1.5px dashed var(--bdr2);border-radius:6px;
  background:rgba(255,255,255,.02);
  transition:border-color .15s ease, background .15s ease;
}
.bpmn-pool-active .bpmn-pool{border-color:var(--a3);border-style:solid;background:rgba(74,159,255,.06)}
.bpmn-pool-label{
  position:absolute;left:0;top:0;bottom:0;width:26px;
  background:var(--s3);border-right:1.5px dashed var(--bdr2);border-radius:5px 0 0 5px;
  display:flex;align-items:center;justify-content:center;
}
.bpmn-pool-active .bpmn-pool-label{border-right-style:solid;border-right-color:var(--a3)}
.bpmn-pool-label span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;font-family:var(--mono);letter-spacing:.5px;color:var(--mid);white-space:nowrap}
/* Pool resize handles/lines (React Flow's own NodeResizer) — restyled to the
   app's accent blue instead of the library's default, so it reads as part
   of this canvas rather than a generic widget dropped on top. */
.bpmn-pool-resize-handle{ background:var(--a3) !important; border:1.5px solid var(--s1) !important; width:9px !important; height:9px !important; border-radius:3px !important; }
.bpmn-pool-resize-line{ border-color:var(--a3) !important; }

/* ── Persistent validation status bar (Phase E) — real docked strip, not an
   overlay, so it never obscures diagram content. ── */
.bpmn-status-bar{flex-shrink:0;display:flex;flex-direction:column;border-top:1px solid var(--border);background:var(--s2);max-height:160px}
.bpmn-status-bar-summary{
  display:flex;align-items:center;gap:6px;padding:5px 12px;text-align:left;
  background:none;border:none;font-family:var(--mono);font-size:9.5px;font-weight:600;cursor:pointer;
}
.bpmn-status-bar-summary:disabled{cursor:default}
.bpmn-status-bar-summary.ok{color:var(--green)}
.bpmn-status-bar-summary.warn{color:var(--gold)}
.bpmn-status-bar-chevron{font-size:8px;color:var(--dim)}
/* Chevron only, not the row's own text — .ok/.warn's green/gold conveys
   real validation state and shouldn't turn blue on hover and lose that
   meaning, but the chevron is purely decorative and gets the same
   hover-highlight every other interactive element in this canvas has. */
.bpmn-status-bar-summary:hover:not(:disabled) .bpmn-status-bar-chevron{color:var(--a3)}
.bpmn-status-bar-list{overflow-y:auto;border-top:1px solid var(--border);padding:4px}
.bpmn-status-bar-item{
  display:block;width:100%;text-align:left;padding:4px 8px;background:none;border:none;border-radius:4px;
  color:var(--mid);font-family:var(--mono);font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.bpmn-status-bar-item.clickable{cursor:pointer;color:var(--text)}
.bpmn-status-bar-item.clickable:hover{background:var(--s3);color:var(--a3)}
.bpmn-status-bar-item:disabled{cursor:default}

/* ── Version history dropdown (Phase E, lowest priority — kept minimal) ── */
.bpmn-history{position:relative}
.bpmn-history-dropdown{
  position:absolute;top:calc(100% + 4px);right:0;z-index:30;width:200px;
  display:flex;flex-direction:column;gap:2px;padding:6px;
  background:var(--s3);border:1px solid var(--border);border-radius:7px;box-shadow:0 6px 18px rgba(0,0,0,.4);
}
.bpmn-history-save{padding:5px 8px;background:var(--s4);border:1px solid var(--border);border-radius:5px;color:var(--a3);font-family:var(--mono);font-size:9.5px;cursor:pointer;margin-bottom:2px}
.bpmn-history-save:hover{border-color:var(--a2)}
.bpmn-history-item{display:flex;justify-content:space-between;gap:6px;padding:5px 8px;background:none;border:none;border-radius:5px;color:var(--text);font-family:var(--mono);font-size:9.5px;cursor:pointer;text-align:left}
.bpmn-history-item:hover{background:var(--s4);color:var(--a3)}
.bpmn-history-item-count{color:var(--dim);flex-shrink:0}
/* count has its own explicit color, so it doesn't inherit the row's hover
   color change above — without this it would stay dim while the rest of
   the row turned blue. */
.bpmn-history-item:hover .bpmn-history-item-count{color:var(--a3)}

/* ── Keyboard-shortcuts reference — the report's own finding: ~6 real
   shortcuts existed with zero discoverability (no help panel, no "?"
   anywhere). Same dropdown-from-toolbar-button pattern as version history
   above, for visual consistency rather than a new UI idiom. ── */
.bpmn-shortcuts{position:relative}
.bpmn-shortcuts-dropdown{
  position:absolute;top:calc(100% + 4px);right:0;z-index:30;width:260px;
  display:flex;flex-direction:column;gap:1px;padding:6px;
  background:var(--s3);border:1px solid var(--border);border-radius:7px;box-shadow:0 6px 18px rgba(0,0,0,.4);
}
.bpmn-shortcuts-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 6px}
.bpmn-shortcuts-row span{color:var(--mid);font-size:10px}
.bpmn-shortcuts-keys{display:flex;gap:3px;flex-shrink:0}
.bpmn-shortcuts-keys kbd{
  font-family:var(--mono);font-size:9px;color:var(--text);background:var(--s4);
  border:1px solid var(--border);border-bottom-width:2px;border-radius:4px;padding:2px 6px;
}

/* ── BPMN Task/Start/End nodes — React Flow's built-in default/input/output
   node types (GatewayNode is the only custom node component; these three
   were rendering as completely unstyled default boxes before this pass). ── */
.react-flow__node-default,
.react-flow__node-input,
.react-flow__node-output{
  padding:11px 20px;min-width:150px;text-align:center;
  background:linear-gradient(180deg,var(--s3),var(--s2));
  border:1px solid var(--bdr2);
  border-radius:8px;
  box-shadow:0 4px 12px rgba(0,0,0,.45);
  color:var(--text);
  font-family:var(--mono);font-size:13px;font-weight:500;line-height:1.4;
  transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;
}
/* Same hover-lift language gateways already had — Task/Start/End were the
   one node family with zero hover feedback on the body itself (only their
   handles reacted), which read as inert next to gateways/pools.
   REAL BUG found and fixed 2026-08-22: this rule never actually applied.
   xyflow's own base.css carries a two-class-plus-pseudo hover rule for
   these same node classes (react-flow__node-default.selectable:hover
   and siblings, confirmed directly in node_modules), which beats this
   rule's one-class-plus-pseudo on pure specificity. getComputedStyle()
   on a really-hovered node showed the library's own faint default
   shadow the entire time, never this one — same class of bug as the
   minimap fix earlier (a more-specific library rule silently winning),
   just discovered on a different element. Fixed by matching the
   .selectable class and adding !important, the exact same pattern this
   file's own .selected-state override below already uses for the
   identical reason. transform:translateY(-1px) is dropped entirely, not
   just re-specificity-fixed: React Flow sets this node's own position
   via an INLINE transform (translate(x,y)), which any plain CSS rule —
   !important or not — cannot compose with; forcing it would have
   discarded the node's real x/y and snapped it to the inline's other
   translate origin. Confirmed via getComputedStyle that the hover
   transform was already silently doing nothing (not broken by this fix,
   already broken before it) — box-shadow is the whole real effect. */
.react-flow__node-default.selectable:hover,
.react-flow__node-input.selectable:hover,
.react-flow__node-output.selectable:hover{
  box-shadow:0 8px 18px rgba(0,0,0,.5) !important;
}
/* React Flow's own default selected state is a 0.5px near-black outline —
   correct for a light canvas, effectively invisible against this one's dark
   navy background. Matches the accent-blue ring gateways already use, so
   "this is selected" reads the same regardless of node type. !important
   because the base rule it overrides is also selector-scoped this
   specifically (.selectable.selected), not just a low-specificity default. */
.react-flow__node-default.selectable.selected,
.react-flow__node-input.selectable.selected,
.react-flow__node-output.selectable.selected,
.react-flow__node-group.selectable.selected{
  box-shadow:0 0 0 2px var(--a3),0 6px 20px rgba(74,159,255,.3) !important;
  border-color:var(--a3);
}
/* Sub-Process / Call Activity — the standard "predefined process" flowchart
   marker: two solid vertical bars inset from the left/right edges of an
   otherwise ordinary Task-shaped rectangle, per the user's own description.
   Pure CSS on top of the unmodified TaskNode component (className set by
   addSubProcess in useBpmnStore.js) — same border color as the node's own
   border for visual consistency, not a separate invented accent. ::after is
   already claimed by the forgiving-hit-area rule above, so this deliberately
   uses ::before instead (unclaimed on these node types) and draws both bars
   from a single pseudo-element's left/right borders rather than needing two
   pseudo-elements. Extra horizontal padding keeps the bars clear of the
   label text. */
.react-flow__node-default.bpmn-node-callactivity{
  padding-left:26px;padding-right:26px;
}
.react-flow__node-default.bpmn-node-callactivity::before{
  content:'';position:absolute;top:6px;bottom:6px;left:8px;right:8px;
  border-left:2px solid var(--bdr2);border-right:2px solid var(--bdr2);
  pointer-events:none;
}

/* Start/End read as visually distinct from ordinary Task nodes — pill shape
   (the same convention worked_example_mockup.html used for Start/End) plus a
   dedicated accent color, not just a differently-worded rectangle. Green =
   go/start; gold rather than red for End, since red is this app's reserved
   error color (--red, used for real failure states) and finishing a document
   flow isn't an error. */
.react-flow__node-input{
  border-radius:999px;border-color:var(--green);color:var(--green);font-weight:600;
}
.react-flow__node-output{
  border-radius:999px;border-color:var(--gold);color:var(--gold);font-weight:600;
}

/* Make node selection more forgiving without changing the visible geometry.
   The pseudo hit area slightly extends click target around nodes.
   Deliberately NOT setting position:relative here (an earlier version did) —
   React Flow's own base stylesheet already sets position:absolute on every
   .react-flow__node, which is already a valid positioned ancestor for the
   ::after pseudo below. Overriding it to relative took the node out of
   React Flow's absolute-positioned/shrink-to-fit sizing model and back into
   normal block flow, where width:auto fills the containing block instead of
   hugging content — confirmed live: gateway nodes (the only type with no
   width/min-width rule of its own to mask it) were stretching to the full
   canvas width (1236px measured, vs. their real 56px diamond), which was
   also silently swallowing most of their connection handles' clickable area
   underneath that oversized invisible box. Task/Start/End happened to escape
   visibly breaking only because they carry their own min-width:150px. */
.react-flow__node-default::after,
.react-flow__node-input::after,
.react-flow__node-output::after,
.react-flow__node-gateway::after{
  content:'';
  position:absolute;
  inset:-6px;
}

/* Gateway nodes now follow the same dark-surface depth language as other
   BPMN nodes; type semantics remain in the diamond glyph color, not in a
   separate light-theme fill that looked disconnected from the canvas. */
.react-flow__node-gateway{
  transition:transform .15s ease,filter .15s ease;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,.45));
}
.react-flow__node-gateway:hover,
.react-flow__node-gateway.selected{
  transform:translateY(-1px);
  filter:drop-shadow(0 8px 18px rgba(0,0,0,.5));
}
.react-flow__node-gateway .bpmn-gateway-ring{pointer-events:none}
.react-flow__node-gateway:focus-visible{outline:2px solid var(--a3);outline-offset:2px;border-radius:8px}

/* Edge label pill (the "valid"/"invalid" branch labels) — rounded badge via
   FlowEdge.jsx's labelBgBorderRadius, not floating text; only React Flow
   (BPMN Standard) ever renders these classes, M-Files Flow is Mermaid/SVG. */
.react-flow__edge-textbg{ fill:var(--s3); stroke:var(--bdr2); stroke-width:1px; }
.react-flow__edge-text{ fill:var(--text); font-family:var(--mono); font-size:10.5px; font-weight:600; }

/* Edge hover/selected feedback — previously neither state had any visual
   distinction beyond React Flow's own default selected-stroke (a generic
   grey, not this app's own accent), so a branch gave zero feedback before
   you actually clicked it. !important is required here because FlowEdge.jsx
   sets stroke/stroke-width as an inline style prop (needed for the
   connector-style-driven color), which always outranks a plain class rule. */
.react-flow__edge-path{ transition:stroke .15s ease,stroke-width .15s ease,filter .15s ease; }
.react-flow__edge:hover .react-flow__edge-path{ stroke:var(--a3) !important; }
.react-flow__edge.selected .react-flow__edge-path{
  stroke:var(--a3) !important; stroke-width:2.5px !important;
  filter:drop-shadow(0 0 4px rgba(74,159,255,.5));
}

/* Minimap — React Flow's own default is a plain white card, which reads as
   a foreign element dropped onto this canvas's dark surface. Matching the
   app's own border/shadow language keeps it feeling like part of the same
   tool rather than a bolted-on widget. */
.react-flow__minimap{
  border:1px solid var(--bdr2); border-radius:8px;
  box-shadow:0 4px 16px rgba(0,0,0,.5); overflow:hidden;
}
.react-flow__minimap-mask{ fill:rgba(3,9,16,.65); stroke:var(--a3); stroke-width:1px; }

/* Edge comment badge — an edge's comment was saveable (FlowEdge.jsx's own
   Comment panel) but never rendered anywhere on the edge itself, so a
   commented branch was visually indistinguishable from an uncommented one
   unless you reopened its toolbar to check. This is the fix: a small
   always-visible marker when comment is non-empty, with the actual text on
   hover via the native title attribute rather than duplicating it as canvas
   text (comments are meant to stay out of the way, per their own "internal,
   never exported" design — this makes their *existence* visible, not their
   full content). */
.bpmn-edge-comment-badge{
  display:flex;align-items:center;justify-content:center;
  width:16px;height:16px;border-radius:50%;
  background:var(--s3);border:1px solid var(--bdr2);color:var(--a3);
  cursor:default;pointer-events:auto;
}

/* ── Animated flow dots (both canvases) ── */
.edge-flow-dot{filter:drop-shadow(0 0 3px currentColor)}
/* ── Guard/trigger badge (both Mermaid canvases; the M-Files Diagram tab's
   own copy is inline JSX, not this shared class) — white ring so the solid
   blue circle pops against any line color/theme it sits on. ── */
.edge-guard-badge{stroke:#fff;stroke-width:1.5px}
/* React Flow's attribution link is left visible deliberately — hiding it
   (proOptions.hideAttribution) is its own separate Pro feature, not something
   this task scoped or authorized alongside the gateway-shapes/auto-layout use. */
`;

export default function App() {
  return (
    <>
      <style>{CSS}</style>
      <AppShell>
        <CommandCenter />
      </AppShell>
      <CommandPalette />
    </>
  );
}
