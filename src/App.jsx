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
.diagram-wrap{flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:18px;position:relative;cursor:grab;
  background-color:#F8FAFC;
  background-image:radial-gradient(#CBD5E1 1.5px, transparent 1.5px);
  background-size:24px 24px;
  background-position:0 0;
}
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
/* Object palette — Mermaid-side equivalent of BPMN's element rail (same
   labeled-tile visual language as .bpmn-pal-tile, deliberately reused rather
   than reinvented), limited to what this canvas actually has (states only —
   see the JSX comment for why there's no Gateway/Pool/Connector tile).
   Overlaid on diagram-wrap's top-left corner rather than a real flex-sibling
   rail like BPMN's, since this canvas's layout wasn't built with a side-rail
   slot and two tiles don't need a whole reserved column. Still Mermaid, not
   React Flow — this only ever calls the existing addState() action. */
.studio-pal-rail{position:absolute;top:14px;left:16px;width:132px;background:rgba(7,17,31,.9);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:7px;padding:8px;display:flex;flex-direction:column;gap:6px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.studio-pal-rail-lbl{font-size:8px;color:var(--mid);letter-spacing:.8px;text-transform:uppercase;padding:0 2px}
.studio-pal-tile{display:flex;align-items:center;gap:8px;padding:6px 8px;width:100%;background:var(--s3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s;text-align:left}
.studio-pal-tile:hover{border-color:var(--a2);color:var(--a3);background:var(--s4)}
/* .diagram-wrap svg{width:100%;height:auto} (meant for the Mermaid render)
   otherwise stretches these lucide icons to fill their button — this rail
   lives inside diagram-wrap so it needs an explicit override. */
.studio-pal-tile svg{width:13px!important;height:13px!important;flex-shrink:0}
.zoom-badge{position:absolute;bottom:14px;right:16px;background:rgba(5,14,26,.88);border:1px solid var(--border);border-radius:6px;padding:4px 10px 4px 12px;font-size:9px;font-family:var(--mono);color:var(--mid);display:flex;align-items:center;gap:7px;backdrop-filter:blur(6px);pointer-events:auto;z-index:20;user-select:none}
.zoom-badge span{color:var(--a3);letter-spacing:.5px}
.zoom-badge button{background:none;border:none;cursor:pointer;color:var(--mid);font-size:13px;padding:0;line-height:1;transition:color .15s}
.zoom-badge button:hover{color:var(--text)}
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px}
.stat-card{background:var(--s2);border:1px solid var(--border);border-radius:7px;padding:14px;text-align:center;transition:all .15s;cursor:default}
.stat-card:hover{border-color:var(--bdr2);background:var(--s3)}
.stat-card:hover .stat-lbl{color:var(--text)}
.stat-val{font-family:var(--display);font-size:24px;font-weight:700;color:var(--a3);line-height:1;margin-bottom:3px}
.stat-lbl{font-size:8.5px;color:var(--mid);letter-spacing:.5px}
.cc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--mid);font-size:11px;gap:10px;text-align:center;line-height:1.7}
.cc-empty-icon{font-size:34px;opacity:.2;margin-bottom:4px}

/* ── Shared utilities ── */
.panel-toggle{width:22px;height:22px;border-radius:4px;border:1px solid var(--border);background:var(--s2);color:var(--mid);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;padding:0;line-height:1;margin-right:4px}
.panel-toggle:hover{border-color:var(--a2);color:var(--a3);background:var(--s3)}
.xb{font-size:9.5px;font-family:var(--mono);padding:4px 10px;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--mid);cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0}
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

/* Floating Toolbar */
.cc-toolbar {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; padding: 6px 12px; border-radius: 8px;
  background: rgba(10,24,40, 0.85); backdrop-filter: blur(10px);
  border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 100;
}
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

/* ── App Shell: section nav, vault chip, empty states ── */
.cc-content-area{flex:1;display:flex;overflow:hidden;min-height:0}
.cc-section-tabs{display:flex;gap:2px;flex:1;padding:0 10px}
.cc-section-tab{font-size:10px;font-family:var(--mono);padding:6px 12px;border-radius:5px;border:1px solid transparent;background:transparent;color:var(--mid);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;white-space:nowrap}
.cc-section-tab:hover{color:var(--text);border-color:var(--border)}
.cc-section-tab.active{color:var(--a3);background:rgba(74,159,255,.1);border-color:rgba(74,159,255,.3)}
.cc-section-tab.gated:not(.active):not(:hover){color:var(--dim)}
.cc-vault-chip{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:5px;border:1px solid var(--border);background:var(--s2);font-size:9.5px;font-family:var(--mono);color:var(--mid);flex-shrink:0;cursor:default}
.cc-vault-chip.connected{color:var(--text)}
.cc-cmdk-hint{font-size:9px;font-family:var(--mono);padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--mid);cursor:pointer;transition:all .15s;flex-shrink:0}
.cc-cmdk-hint:hover{border-color:var(--a2);color:var(--a3)}
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
.mflow-shell{flex:1;display:flex;min-height:0;overflow:hidden;background:var(--bg)}
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
/* overflow:hidden, not auto — pan is now a free transform on the SVG
   itself (see MFlowCanvas.jsx's panRef), not native scroll, so there's no
   scrollable overflow to expose a scrollbar for; hidden just clips
   whatever pans outside the viewport, matching a free-pan canvas. */
.mflow-diagram{flex:1;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;padding:18px;cursor:grab;
  background-color:#F8FAFC;background-image:radial-gradient(#CBD5E1 1.5px, transparent 1.5px);background-size:24px 24px;background-position:0 0}
.mflow-diagram.panning{cursor:grabbing}
.mflow-diagram svg{width:100%;height:auto;display:block}
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

.mflow-pal-shell{width:44px;flex-shrink:0;position:relative;z-index:20}
.mflow-pal-shell.pinned{width:240px}
.mflow-pal-panel{position:relative;width:44px;height:100%;display:flex;flex-direction:column;overflow:hidden;background:rgba(7,17,31,0.85);backdrop-filter:blur(12px);border-right:1px solid var(--border)}
.mflow-pal-shell.pinned .mflow-pal-panel{width:240px;transition:width .15s ease}
.mflow-pal-head{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:8px;border-bottom:1px solid var(--border)}
.mflow-pal-title{font-size:9px;color:var(--mid);letter-spacing:.5px;text-transform:uppercase}
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
.mflow-pal-rail{flex:1;overflow-y:auto;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:4px}
.mflow-pal-tile.compact{width:32px;height:32px;padding:0;justify-content:center}
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

/* ── BPMN documentation canvas (Process Docs section) — isolated from Studio ── */
.bpmn-canvas-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;background:var(--bg)}
.bpmn-doc-banner{flex-shrink:0;padding:7px 14px;font-size:9.5px;line-height:1.6;color:var(--gold);background:rgba(240,165,0,.08);border-bottom:1px solid rgba(240,165,0,.3)}
.bpmn-body{flex:1;display:flex;min-height:0;overflow:hidden}
.bpmn-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
/* position+z-index above the palette overlay (z-index:20) — the hover-expanded
   palette panel is 240px wide but the rail it grows from is only 44px, so
   without this its solid background would cover Auto-arrange/Animate. */
.bpmn-toolbar{flex-shrink:0;position:relative;z-index:25;display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--s2);border-bottom:1px solid var(--border);flex-wrap:wrap}
.bpmn-viewport-controls,
.bpmn-history-controls,
.bpmn-layout-controls,
.bpmn-io-controls{display:flex;align-items:center;gap:4px;flex-shrink:0}
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
   hover) unless pinned, in which case it reserves 240px permanently — the
   panel inside is what actually changes size, floating over the canvas via
   position:absolute when expanded-but-unpinned. 44px is the VS Code/GitHub/
   Slack icon-rail convention — confirmed against this app's own 32px compact
   tile (bpmn-pal-tile.compact below) before using it: ~6px margin each side,
   comfortable, not forced. Was 48px; tightened here after checking, not
   guessed at (an external review guessed "60-80px" without checking either
   number — the real prior value was 48px, not that). */
.bpmn-pal-shell{width:44px;flex-shrink:0;position:relative;z-index:20}
.bpmn-pal-shell.pinned{width:240px}
.bpmn-pal-panel{
  position:relative;width:44px;height:100%;display:flex;flex-direction:column;overflow:hidden;
  background:rgba(7,17,31,0.85);backdrop-filter:blur(12px);border-right:1px solid var(--border);
}
/* Overlay case (hover, not pinned): position snaps from relative to absolute
   at the same moment width changes — animating width across that snap reads
   as a glitch (and measures unreliably), so this transitions instantly. */
.bpmn-pal-shell:not(.pinned) .bpmn-pal-panel.expanded{
  position:absolute;left:0;top:0;bottom:0;width:240px;box-shadow:8px 0 24px rgba(0,0,0,.45);
}
/* Pinned case: position never changes (stays relative/in-flow), so a width
   transition here is safe and reads as an intentional, smooth pin/unpin. */
.bpmn-pal-shell.pinned .bpmn-pal-panel{width:240px;transition:width .15s ease}
.bpmn-pal-sidebar-head{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid var(--border)}
.bpmn-pal-search-wrap{flex:1;position:relative;display:flex;align-items:center;min-width:0}
.bpmn-pal-search-icon{position:absolute;left:7px;color:var(--dim);pointer-events:none}
.bpmn-pal-search{width:100%;padding:5px 8px 5px 24px;background:var(--s3);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:var(--mono);font-size:9.5px}
.bpmn-pal-search:focus{outline:none;border-color:var(--a2)}
.bpmn-pal-toggle{width:20px;height:20px;flex-shrink:0;border-radius:4px;border:1px solid var(--border);background:linear-gradient(180deg,var(--s3),var(--s2));color:var(--mid);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.bpmn-pal-toggle:hover{color:var(--a3);border-color:var(--a2);background:linear-gradient(180deg,var(--s4),var(--s3))}
.bpmn-pal-toggle.active{color:var(--a3);border-color:var(--a2);background:rgba(74,159,255,.12)}
.bpmn-pal-sidebar-body{flex:1;overflow-y:auto;padding:10px 8px;display:flex;flex-direction:column;gap:12px}
.bpmn-pal-group{display:flex;flex-direction:column;gap:4px}
.bpmn-pal-group-lbl{font-size:8px;color:var(--mid);letter-spacing:.8px;text-transform:uppercase;padding:0 2px}
.bpmn-pal-tiles{display:flex;flex-direction:column;gap:3px}
.bpmn-pal-tile{
  display:flex;align-items:center;gap:8px;padding:6px 8px;width:100%;
  background:var(--s3);border:1px solid var(--border);border-radius:6px;
  color:var(--text);font-family:var(--mono);font-size:10px;cursor:pointer;transition:all .15s;text-align:left;
}
.bpmn-pal-tile:hover:not(:disabled){border-color:var(--a2);color:var(--a3);background:var(--s4)}
.bpmn-pal-tile:disabled{opacity:.4;cursor:not-allowed}
.bpmn-pal-tile-label{white-space:nowrap}
.bpmn-pal-empty{font-size:9.5px;color:var(--dim);padding:6px 2px}
/* Connectors' info note — deliberately NOT tile-shaped (no border/button
   look), so it reads as explanatory text rather than a broken control. */
.bpmn-pal-info{
  display:flex;align-items:flex-start;gap:7px;padding:7px 8px;
  background:rgba(74,159,255,.06);border:1px solid rgba(74,159,255,.18);border-radius:6px;
  color:var(--mid);font-size:9.5px;line-height:1.5;
}
.bpmn-pal-info svg{flex-shrink:0;margin-top:1px;color:var(--a3)}

/* Connector-style picker (Orthogonal/Straight/Curved) — whole-canvas, lives
   under the Connectors group, expanded-only (see BpmnPalette.jsx). */
.bpmn-pal-segmented{display:flex;gap:2px;margin-top:2px;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:2px}
.bpmn-pal-segmented button{flex:1;display:flex;align-items:center;justify-content:center;padding:5px 0;background:none;border:none;border-radius:4px;color:var(--mid);cursor:pointer;transition:all .15s}
.bpmn-pal-segmented button:hover{color:var(--a3)}
.bpmn-pal-segmented button.active{background:var(--a2);color:#fff}

/* Collapsed rail (44px, icon-only) — same tiles, compact variant. */
.bpmn-pal-rail{flex:1;overflow-y:auto;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:4px}
.bpmn-pal-nudge{
  width:28px;height:18px;border-radius:5px;border:1px solid var(--border);
  background:linear-gradient(180deg,var(--s3),var(--s2));color:var(--mid);
  cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;
  transition:all .15s;box-shadow:0 2px 6px rgba(0,0,0,.35);margin-bottom:2px;
}
.bpmn-pal-nudge:hover{color:var(--a3);border-color:var(--a2);background:linear-gradient(180deg,var(--s4),var(--s3))}
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
.bpmn-node-inspector-row>span{width:34px;flex-shrink:0;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;font-size:8px}
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
   handles reacted), which read as inert next to gateways/pools. */
.react-flow__node-default:hover,
.react-flow__node-input:hover,
.react-flow__node-output:hover{
  transform:translateY(-1px);
  box-shadow:0 8px 18px rgba(0,0,0,.5);
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
