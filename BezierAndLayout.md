# M-Files Diagram Tab — Bezier Curves, Layout, and Line Style

Session notes for `src/components/mflow/LiveTranslationView.jsx`'s "M-Files Diagram" tab (M-Files Flow's split-screen right panel). Everything below reflects what was actually verified live against the real Electron app and the real exported Conformity workflow data (`provisioningai-export-1787594363016.json`, 47 states / 67 transitions) — not assumed or invented. Where a decision came from the user directly rather than being derivable from data, that's stated explicitly.

## Scale fixes at a glance

Auto-fit was missing entirely, back-edge lanes didn't scale, dagre's spacing ignored real node widths, and there was no pan/zoom at all — all confirmed on the real Approbation data (110 states / 176 transitions / 47 back-edges) and fixed. Full investigation-then-fix writeup near the end of this file.

## Wide (left-to-right) layout at a glance

A third layout mode, `Wide Layout`, sits beside `Auto-Layout` in the toolbar for dense real-world workflows (confirmed on the real 110-state Approbation data) where the default/real layout leaves labels cramped and most of the panel's width unused. It's a genuinely new, independently-computed dagre layout (`rankdir:'LR'`), not a stretch of whatever's currently showing. Required making back-edge detection, lane routing, and edge connection points orientation-aware — they were hardcoded top-to-bottom assumptions. Full writeup below.

## Real M-Files layout at a glance

M-Files Admin stores real, human-authored per-state positions (`IWorkflowAdmin.LayoutData`) — it does not compute layout live, contrary to an earlier assumption. The right panel now uses those real positions by default when the imported workflow has them (confirmed live: `dx=215, dy=-2` between two real states matched the real M-Files coordinate delta exactly), falling back to the existing computed dagre/BFS layout for hand-drawn workflows or ones never arranged in M-Files Admin. Full investigation-then-implementation writeup near the end of this file.

## What this panel is, and isn't

`MFilesDiagramView` is a hand-rolled plain-SVG renderer (not React Flow) over the `TranslationPlan` JSON the CLI translator bridge (`ProvisioningAI.Workflow.Cli`) produces from the left canvas's Mermaid source. It only runs meaningfully inside the real Electron app — the translator bridge (`window.mfiles`-style IPC) doesn't exist in a plain browser dev session, so it shows "Translator bridge unavailable" there. The left authoring canvas (`MFlowCanvas.jsx`) and the Flattened/JSON/Validation tabs in this same file are untouched by anything below.

## Data model — confirmed, not assumed

Checked directly against the real export JSON and `src/store/useWorkflowStore.js` / `src/hooks/useExport.js`:

- **Per state**: only `name` and `initial` exist anywhere in this app's data (export JSON, Zustand store, Mermaid source, and by extension the translator's plan). **No true M-Files action-type metadata (SQL/UPD/RTE role) is captured anywhere in this pipeline.**
- **Per transition**: `conditions` and `permissions` fields exist in the store's shape but were `null` for every one of the 67 real transitions checked. This specific re-imported Conformity workflow has no grammar annotations (`if(...)`, `after(...)`, `script(...)`) on any transition.
- The richer `TranslationPlan` JSON (what this tab actually renders, produced by the CLI from Mermaid text) adds real computed fields per transition: `TriggerMode` (`Manual` / `AutomaticCriteria` / `AutomaticVBScript`), `TriggerCriteria`, `TriggerInDays`, `VBScriptName`, `IsSkeleton`, `EvaluationPriority`, etc. — but these are all *derived from the Mermaid grammar*, so a transition with no grammar annotation translates to `TriggerMode: "Manual"` by default.
- **Consequence, confirmed live**: because this real Conformity data has no grammar annotations, its translated plan comes out all-`Manual`, so the diagram renders **all solid lines** for this specific dataset. That's the data telling the truth about how this workflow was authored, not a rendering bug.

## Line style: solid vs. dashed

**Rule** (`LiveTranslationView.jsx`, inside `MFilesDiagramView`'s transitions loop):
```js
const dashArray = t.TriggerMode === 'Manual' ? undefined : '7,5';
```
- `TriggerMode === 'Manual'` → solid (no `strokeDasharray`).
- Anything else — `AutomaticCriteria`, `AutomaticVBScript`, or a missing/other value — → dashed (`'7,5'`).
- **Default polarity is dashed, not solid.** The ternary only special-cases the exact string `'Manual'`; every other case (including `undefined`) falls through to dashed. This was explicitly requested by the user and was already the ternary's actual behavior when checked — no code change was needed to satisfy it, just confirmation.

**Where this rule came from**: the user shared a real screenshot of M-Files Admin's own workflow canvas (the actual "Conformity" vault, not this app's re-import of it) and clarified the real semantic meaning directly: **solid = manual/human-driven transition, dashed = automatic** (script/criteria-triggered, no human action needed). This is a real M-Files convention, told to me directly, not inferred from the JSON — but it maps cleanly onto the JSON's own already-computed `TriggerMode` field, so the *implementation* is data-driven even though the *meaning* came from the user.

**This reverses an earlier, deliberate project decision** (recorded in `CLAUDE.md`, 2026-08-20 "follow-up session" entry): at that time the operator explicitly asked for every transition on this tab to render dashed regardless of `TriggerMode`, reversing an even earlier solid/dashed rule. This session reverses that again, back toward a `TriggerMode`-driven rule — with a different, better-justified reason (the real M-Files semantic meaning, confirmed against a live Admin screenshot) than whatever motivated the intermediate all-dashed state. Not a silent flip-flop — recorded here so a future session doesn't treat either prior decision as still current without checking this file.

## Line shape: bezier curves (not orthogonal)

Both edge branches use cubic bezier (`C`) SVG path commands:

- **Forward edges** (`to.cy > from.cy`): a vertical S-curve — `M sx sy C sx+bow my, tx+bow my, tx ty`, where `my` is the vertical midpoint between the source box's bottom and the target box's top. Degenerates to one straight vertical segment when `sx === tx` and there's no duplicate-pair offset (`bow === 0`).
- **Back-edges** (cycles/loops, `to.cy <= from.cy`, e.g. a `Rejected → Draft` retry loop): route through one shared vertical lane on the right side of the diagram rather than bowing out locally — `M sx sy C laneX sy, laneX ty, tx ty`. Each back-edge processed gets `backEdgeLaneOffset += 22` so multiple back-edges don't overlap in the same lane.
- **Duplicate (FromState → ToState) pairs**: when two or more transitions connect the exact same pair of states (so their curves would otherwise sit exactly on top of each other), each gets a small symmetric lateral `bow` offset via `dupBow()` — e.g. 2 duplicates get ∓12px, 3 get −24/0/+24px.

**This was a real back-and-forth this session, not a one-shot decision** — worth recording precisely so it isn't re-litigated from scratch next time:

1. First built: bezier curves for all edges (this section), plus an on-demand dagre-based "Auto-Layout" toggle for node *positions* — built and verified working.
2. Then the user shared the real M-Files Admin screenshot and asked to match it exactly. That screenshot shows **orthogonal (right-angle) connectors with small blue circular waypoint dots at the bends**, not smooth curves — genuinely how M-Files Admin's own canvas renders. Bezier curves were replaced with `M`/`L` polyline segments plus `<circle>` corner markers to match.
3. The user then explicitly said to use bezier curves again ("you should use bezier" / "use ONLY BEZIER"), confirmed via a direct yes/no question that this was a deliberate reversal of the orthogonal-matching decision, scoped to line style only. Orthogonal polylines and corner dots were removed; bezier curves (as described above) were restored, while **everything else from the M-Files-matching pass was kept**: the light theme, the icon-per-state glyphs, and the `TriggerMode`-driven solid/dashed rule.

**Current state, verified live**: bezier curves, light theme, icons, dynamic box widths, and `TriggerMode`-driven solid/dashed all render together correctly against the real 47-state Conformity data, with zero console errors, in both the default layout and with Auto-Layout toggled on.

## Visual theme: light, matching M-Files Admin — scoped to the canvas only

- `.mflow-ltv-diagram-wrap`'s background was changed to the same light dotted-grid pattern Studio's own canvas (`.diagram-wrap`) already uses: `background-color:#F8FAFC; background-image:radial-gradient(#CBD5E1 1.5px, transparent 1.5px); background-size:24px 24px`. This is existing, already-proven app CSS reused verbatim (`src/App.jsx`), not a new invented palette.
- Node boxes: white/near-white fill (`#ffffff`, or `#eff6ff` for the initial state), thin border (`#cbd5e1` normal, `#334155` terminal, `#2563eb` initial), dark text (`#1e293b`) — replacing the prior dark-theme `var(--s1)`/`var(--s2)`/`var(--text)` tokens for this tab specifically.
- **Scope boundary, deliberate**: only the diagram SVG content changes theme. The surrounding toolbar (`.mflow-ltv-head` — the four view tabs, Auto-Layout button, Force Refresh button) stays the app's existing dark chrome. This mirrors the existing precedent of Studio's own light canvas already coexisting inside an otherwise dark app shell.
- This reverses an earlier decision from *this same session* (first round of planning: "keep the app's existing dark theme tokens") — recorded as a deliberate reversal once the real M-Files Admin screenshot made clear the intent was visual fidelity to the real tool, not internal app consistency.

## Icons per state — a real limitation, not a claim of true metadata

Since no true action-type field exists anywhere in the data (see above), icons are inferred from the state's `Name` string via case-insensitive prefix/pattern matching, in `STATE_ICON_RULES`:

| Pattern | Icon (lucide-react) | Meaning |
|---|---|---|
| `/^sql_/i` | `Settings` (gray) | SQL action |
| `/^upd_/i` | `RefreshCw` (blue) | Update action |
| `/^(rte[-_]\|rte\s)/i` | `ArrowUp` (blue) | Route/RTE action |
| `/^in_to_/i` | `ArrowRightCircle` (green) | Entry marker |
| `/^out_to_/i` | `ArrowLeft` (gray) | Exit marker |
| `/^\d+-\s/` | `Flag` (blue) | Numbered control-gateway state, e.g. `"1- Contrôle facture"` |
| `/control/i` | `HelpCircle` (gray) | Control/test state |
| `/trash/i` | `XCircle` (red) | Trash/deletion |
| *(none of the above)* | plain gold square, no icon | Default/unclassified |

These prefixes match this project's own already-documented naming convention (`CLAUDE.md` §4.4's workflow-state classification: `SQL_*`, `UPD_*_CP1`, `RTE_*`, etc.) — grounded in real data (the `Name` field genuinely exists), but the mapping itself is a **heuristic approximation**, confirmed explicitly with the user before implementing. It will misclassify or fall back to the default icon for any state whose name doesn't follow these conventions — this is expected, not a bug, given the data genuinely doesn't carry true action-type metadata. **This is generic** — it works off any state's name string, not hardcoded to Conformity's specific 47 states, so it applies the same way to any other workflow authored or imported into this app.

Rendered via `StateGlyph`, a small nested `<svg x y width height>` positioned inside the parent diagram `<svg>` (valid SVG nesting — no new dependency), wrapping the matched lucide-react icon component at 12×12px.

### Generality — confirmed, not assumed, on a second workflow

Everything in this file was also tested against a second, unrelated workflow (the built-in "Document Approval" 6-state demo: Draft/Submitted/Under Review/Approved/Rejected/Closed), specifically to check whether any of this logic was secretly tuned to Conformity's shape. Result, split honestly by piece:

- **Layout, bezier curves, box-width-by-label-length, and the `TriggerMode`-driven solid/dashed rule are fully workflow-agnostic** — confirmed working correctly on both the 47-state Conformity import and the 6-state demo, with no code path that references specific state names. The dashed-line rule in particular was proven directly: a modified Document Approval workflow with two transitions given real `after(3d)`/`script(ArchiveDoc)` conditions rendered exactly those two edges dashed and the other four solid, including the `Rejected → Draft` back-edge.
- **Icon inference is a different story.** The code itself is generic (no hardcoded names, same regex rules run against any workflow), but every single state in the Document Approval demo — Draft, Submitted, Under Review, Approved, Rejected, Closed — rendered the default gold square, because none of those names match the `SQL_`/`UPD_`/`RTE_`/numbered-prefix convention. That convention (documented in `CLAUDE.md` §4.4) is specific to how the real Conformity/Approbation vaults happen to name their states — it is not a universal M-Files naming standard, and there is no data anywhere in this app's pipeline that could make it one (see "Data model" above). **Practical consequence for future workflows**: expect meaningful icons on workflows imported from or modeled after Conformity/Approbation's real naming style, and expect plain gold squares on freshly-authored or differently-named workflows — that's the honest ceiling of a name-string heuristic, not a bug to chase.

## Box width — generic, not tuned to any one workflow

`stateBoxWidth(name, baseW)` grows a state's rendered box width with its label length (`7 * name.length + 40`, same character-width-estimate idiom the file already used for edge labels), capped at `baseW + 45` so a long name can't grow into the neighboring column's slot — both `layoutPlan`'s BFS grid (`colWidth - boxW = 58px` gap) and dagre's layout (`nodesep: 60`) reserve enough margin for that cap to hold under either layout source. Fixed at the base 152px width, text was overflowing box borders for any name over ~15 characters (confirmed live with the real Conformity data — `SQL_ERROR__SET_CREDIT_OR_INVOICE` and similar visibly spilled out). This applies uniformly to every state by name length, so it generalizes to any workflow's real label lengths rather than being tuned to this one dataset's specific longest names.

## Auto-Layout toggle (on-demand node repositioning)

- `layoutPlanWithDagre(plan)` mirrors the exact pattern already proven in `src/features/layout/bpmnAutoLayout.js`'s `layoutWithDagre` (default `dagre` import from `@dagrejs/dagre`, already a project dependency — no new package), but returns `layoutPlan`'s own shape (`{pos, width, height, boxW, boxH, backEdgeLaneX}`) instead of a React Flow node array, so none of `MFilesDiagramView`'s edge-rendering code needs to know which layout produced its positions.
- **Default view is untouched**: `layoutPlan` (BFS-layer grid) still runs unconditionally and is memoized on `plan` alone — byte-identical to before this whole feature existed. Dagre only ever runs when the toggle (`autoLayoutActive`, local state in `LiveTranslationView`) is on, memoized on `[plan, autoLayoutActive]`.
- One toggle button, no separate "Reset Layout" — flipping the same toggle off is the reset, since `layoutPlan` is a pure function called fresh either way; nothing is mutated, unlike BPMN's own "Auto-arrange" which permanently mutates node state.
- Verified live against the real 47-state data: toggling on produces a visibly different, less-cluttered arrangement (confirmed via screenshot — SVG dimensions changed from 2496×1796 to 2482×2886, and specific nodes like `SQL_ERROR__GET_VENDOR_ID` visibly repositioned to reduce crossing).

## Verified facts, for anyone resuming this later

- Build: `npm run build` clean, zero errors, zero new chunk-size warnings, across every change described above.
- Live-tested in the real Electron app (not the browser dev server — required for the translator CLI bridge), connected via Chrome DevTools Protocol (`electron.exe . --remote-debugging-port=<port>`, `chromium.connectOverCDP`), against the real imported "Conformity" workflow (47 states / 67 transitions), injected via the store's own persist shape (`localStorage` key `provisioningai-workflow-store`) built directly from the real export JSON — not synthetic test data.
- Zero console errors across every verification pass in this session.
- Regression-checked and confirmed unaffected: Flattened tab, JSON tab (with syntax highlighting), Validation tab, Force Refresh (still triggers a real re-translation, unrelated to the Auto-Layout toggle), and the left authoring canvas (untouched file).
- One real environment issue hit and resolved along the way, unrelated to this feature's own code: the first Electron launch this session had `ELECTRON_RUN_AS_NODE=1` set in the shell, making `electron.exe` run as plain Node instead of launching the actual Electron runtime — fixed with `env -u ELECTRON_RUN_AS_NODE`. A later Electron session also hit GPU-disk-cache permission errors that made `page.screenshot()` hang indefinitely — fixed by relaunching with an explicit `--user-data-dir`/`--disk-cache-dir` pointed at a writable scratch location.

## Scale investigation and fix — Approbation (110 states, 176 transitions, 47 back-edges)

Everything above was verified on Conformity (47 states). The real Approbation export (`Approbationprovisioningai-export-1787604060238.json`, obtained from the user, 110 states / 176 transitions) exposed real problems that don't show up at Conformity's scale. Investigated first, fixed only after the root causes were confirmed — not guessed.

### What was found (investigation, before any fix)

1. **`layoutPlanWithDagre` was never failing.** Confirmed directly: zero console/page errors on every run, all 110 states got genuinely different positions after Auto-Layout (0 identical to before, 110 changed).
2. **No auto-fit existed anywhere on this panel.** The panel had only native `overflow:auto`. Dagre horizontally *centers* narrower ranks relative to the graph's widest rank (a real, normal dagre behavior, not a bug) — so on a wide 110-node graph the initial state could land far outside the panel's default (0,0) scroll view. Proven directly: manually scrolling revealed correctly-rendered, correctly-colored, correctly-positioned content that was simply never shown by default. This is why Auto-Layout looked like "no improvement" — the layout was fine, nothing ever brought it into view.
3. **Back-edge lanes didn't scale — confirmed via real path geometry, not estimated.** The old code gave every back-edge its own lane offset (`backEdgeLaneOffset += 22`, unconditional, no reuse), inside a canvas that reserved a flat `+130px` regardless of back-edge count. Approbation has 47 real back-edges (parsed directly from rendered path control points). Lane X-positions reached 4621 against a 4240-wide `viewBox` — **381px of back-edges rendered permanently outside the SVG's own bounds**, clipped and invisible, not just scrolled-out-of-view.
4. **Node-dimension mismatch, latent but real.** `layoutPlanWithDagre` fed dagre a fixed `width:152` for every node, while the actual rendered width varies per label via `stateBoxWidth()` (a function added in a later session, never fed back into dagre's spacing). Not causing visible overlap (the `+45` cap in `stateBoxWidth` already stayed under dagre's own `nodesep` gap), but dagre's crossing-minimization was optimizing against the wrong size assumption.
5. **No pan/zoom/drag existed on this panel at all** — confirmed via direct code read, just native browser scroll. Doesn't scale to real diagrams reaching 4000+px per side.

Both bugs #2 and #3's root causes (the flat `+130` fudge, no fit call) lived identically in **both** `layoutPlan` (BFS default) and `layoutPlanWithDagre` — so this affected the default view too, not just Auto-Layout, on any sufficiently dense/cyclic real workflow. Not a dagre-specific problem.

### The fix (all in `LiveTranslationView.jsx`, plus small CSS in `App.jsx`)

1. **Back-edge lane packing** — new `computeCanvasAndLanes(plan, pos, boxW, boxH)` function, generic (no hardcoded names or counts): every back-edge's vertical span gets packed via the standard greedy interval-scheduling algorithm ("minimum meeting rooms" — sort by span start, reuse the first lane whose last-assigned span doesn't overlap, else open a new lane). Bounds total lanes to the real *maximum concurrent* back-edges, not the raw count. Canvas `width` is then derived from the lanes actually used (`backEdgeLaneX + laneCount*22 + margin`), not a fixed guess — guaranteeing every lane sits inside the `viewBox` by construction.
2. **`layoutPlan`/`layoutPlanWithDagre` stopped owning canvas size.** Both now return only `{pos, boxW, boxH}` — node placement is their whole job. `computeCanvasAndLanes` (called once, memoized on `[plan, pos, boxW, boxH]`) owns width/height/back-edge-lane-X for both layout sources uniformly.
3. **Real widths fed into dagre.** `layoutPlanWithDagre` now calls `g.setNode(s.Name, { width: stateBoxWidth(s.Name, boxW), height: boxH })` instead of the fixed `boxW` — and the center→top-left conversion after `dagre.layout()` uses the same real per-node width, so nodes render exactly where dagre actually placed their centers, not offset by an assumption of an every wrong fixed width.
4. **Pan/zoom/fit, ported from `MFlowCanvas.jsx`** (the only other hand-rolled-SVG canvas in this codebase — confirmed Process Docs' pan/zoom is pure `@xyflow/react` framework config with nothing portable to a non-React-Flow panel). Pan writes directly to `svgRef.current.style.transform` during a drag (not React state) — same reasoning MFlowCanvas uses it for: re-rendering hundreds of paths per mousemove pixel on a 342-path Approbation-scale diagram would be genuinely janky. Wheel-zoom and the +/-/Fit buttons reuse the exact same `.mflow-view-controls` chip styling already shared by Studio and M-Files Flow's left canvas, floated bottom-right over the panel via a new `.mflow-ltv-zoom-controls-wrap` (mirrors Studio's existing `.cc-zoom-controls-wrap` pattern) rather than crowding the top toolbar's 4 tabs + Auto-Layout + Force Refresh.
5. **Auto-fit trigger** — a `useEffect` keyed on `[plan, autoLayoutActive]` calls the same `fitToView()` the manual Fit button uses, firing on both "fresh diagram's initial render" and "after Auto-Layout completes." This is the actual fix for the reported symptom.

**A real bug found and fixed during verification, not anticipated in the plan:** the zoom effect initially only scaled `svgRef.current.style.width`, mirroring `MFlowCanvas.jsx`'s own pattern — but that canvas explicitly strips its SVG's `width`/`height` *attributes* before ever applying CSS zoom (`svgEl.removeAttribute('width'); svgEl.removeAttribute('height')`, confirmed in its own code), while this panel's SVG keeps `width`/`height` as fixed React-rendered attributes. Scaling only CSS `width` while the `height` attribute stayed fixed created a viewBox aspect-ratio mismatch — the DOM/layout math reported content as correctly positioned (`getBoundingClientRect()` checks passed, 110/110 states "visible"), but nothing actually painted on screen, confirmed via repeated screenshots at increasing wait times (ruling out a timing race). Fixed by scaling `style.height` alongside `style.width`. A pure DOM-position check without a visual screenshot check would have missed this — both matter.

### Verified, real Approbation data, after the fix

- Default view: 110/110 states visible without scrolling, 57 back-edges detected, max lane X (2875) inside the SVG's own width (2925) — zero overflow.
- After Auto-Layout: 110/110 states still visible without scrolling (auto-fit re-triggered correctly on the toggle), 49 back-edges (dagre reorders which edges register as back-edges — expected, not a bug), max lane X (4793) inside SVG width (4843) — zero overflow.
- 176/176 transitions confirmed still using bezier `C` commands in both views — the curve logic itself was never touched, only where back-edge lanes sit.
- Pan (drag), zoom in/out (buttons + wheel), and Fit (resets pan, recomputes scale) all confirmed working via direct DOM/style assertions, not just visual glance.
- Zero console errors throughout every check.
- **Conformity re-confirmed working** after all the above changes: 47 states, 17/16 back-edges (default/Auto-Layout respectively), zero lane overflow, correctly fits by default — the new lane-packing algorithm behaves correctly at both the low end (Conformity) and high end (Approbation) it was designed to generalize across.
- Regression-confirmed unaffected: Flattened/JSON/Validation tabs, Studio, Process Docs — zero console errors, all rendering normally.

## Real M-Files LayoutData — investigation, GUID gap trace, and implementation

### The premise was wrong: M-Files stores real layout, it doesn't compute it live

An earlier assumption (from an external source, not this project) claimed M-Files computes workflow diagram layout on the fly with a graph algorithm, and never stores positions. Checked directly against the real COM interop assembly (`C:\Program Files\M-Files\<version>\Bin\x64\Interop.MFilesApi.dll`, loaded via .NET reflection, not just grepped for what this project happens to already use): `IState`/`IStateAdmin`/`IStatesAdmin`/`IStateTransitions` have zero position properties, but **`IWorkflowAdmin.LayoutData : String`** exists. Read it live off the real Conformity vault (workflow ID 103) — a real JSON blob: `{version, stateLayout:[{GUID,x,y}], transitionLayout, scale, xposition, yposition}`, 17,001 characters, 48 entries (47 real states + the all-zero-GUID "(no state)" pseudo-node/start-marker M-Files itself uses). A second real workflow on the same vault had `stateLayout: []` — confirming this is only populated once a human has actually arranged the workflow in M-Files Admin's Designer, not always present.

**Step 0, checked before anything else**: does Studio's own diagram already use this data? No — confirmed via a zero-match grep for `LayoutData`/`stateLayout`/`transitionLayout` across the *entire* frontend, and by reading `CommandCenter.jsx` directly: Studio positions states purely via Mermaid's own internal layout engine, with `st.x`/`st.y` only ever set by a manual drag (`updateStatePosition`) — identical architecture to M-Files Flow's own canvas. So Studio's appearance was never evidence this approach would work; it's a genuinely new technique in this codebase.

### The GUID gap — precise root cause, not "dropped somewhere in transit"

The real finding is more specific than "GUIDs get stripped mid-pipeline": `scripts/pull-from-vault.ps1` **never fetched them at all**. `IState`/`IStateAdmin` have no GUID property directly (confirmed via the same reflection pass) — M-Files resolves a state's GUID through a separate mechanism: the built-in "States" value list (ID 8), where each item carries the state's integer ID and its real `ItemGUID`. `ProvisioningAI.Discovery`'s `WorkflowScanner.cs` already does this join (`vault.ValueListItemOperations.GetValueListItems(8, true)`) — but for a completely unrelated pipeline (the C# Discovery scanner, which writes to the SQLite database, not what feeds M-Files Flow's import). `pull-from-vault.ps1` simply never made the equivalent call.

`electron/main.cjs` is a genuine pure pass-through (confirmed reading it — collects PowerShell stdout, `JSON.parse`s it, zero field manipulation). `useWorkflowStore.js`'s `seedImportedWorkflow` already spreads `{id: makeId(), ...s}` per state — a `guid` field would already have survived untouched if PowerShell had ever provided one. So the entire gap was one missing COM call in one script, not a multi-file leak.

**Proved the fix live, not just in theory**, against the real Conformity vault: `GetValueListItems(8, true)` → MFilesId→GUID map → joined against `$wfAdmin.States` → 47/47 real states matched. `LayoutData` is reachable directly off the same `$wfAdmin` object the script already holds — zero extra COM connections. Real coordinate range: x −956..2444, y −842..865 — genuinely negative on both axes, confirming this app's positive-only rendering needs a normalization shift, not just a passthrough.

### Architectural decision: side-channel prop, not a Mermaid/translator change

`plan.States`/`plan.Transitions` (what the diagram renders) come from the C# CLI translator, which takes **Mermaid text** as input — and Mermaid's `stateDiagram-v2` syntax has no way to carry a GUID or x/y through it. Extending the translator/grammar to carry position metadata would be a large change to a component whose real job is trigger-mode resolution, not positioning (positioning already lives entirely client-side). Instead: reused the *exact* existing pattern already proven for `hoveredStateKey` — `MFlowCanvas.jsx` resolves the GUID→name join itself (it has direct access to the store) and hands `LiveTranslationView.jsx` an already-resolved `Map<name, {x,y}>` as a plain prop. `LiveTranslationView.jsx` never needs to know a GUID exists.

**A real bug found during verification, not anticipated in the plan**: the join initially returned nothing usable. Root cause: `useMermaid.js` sanitizes state names when building Mermaid IDs (`name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')`) — a real state named `"RTE-NewDocument_+_CLEAN_PO"` becomes `"RTENewDocument__CLEAN_PO"` in the translated plan (hyphen and plus stripped). Under the all-or-nothing matching rule, this *one* mismatched state (the workflow's own initial state, no less) silently disqualified the entire diagram from using real layout at all. Fixed by applying the identical sanitization to the real state names before building the lookup map in `MFlowCanvas.jsx` (duplicated inline from `useMermaid.js` with a comment linking the two, rather than restructuring that shared file for a two-line regex). Confirmed via a precise coordinate check, not just "it looks different": two real states' rendered position delta (`dx=215, dy=-2`) matched their real M-Files coordinate delta exactly, proving genuine M-Files-authored positions were in use, not a coincidentally-similar computed layout.

### All-or-nothing use of real layout — deliberate, not a guess

Real data showed only two states across both samples checked: fully populated or fully empty, never partial. Mixing real M-Files coordinates (an arbitrary internal canvas scale) with this app's own computed dagre/BFS units for different states in the same diagram would produce visibly inconsistent spacing with no observed real-world case motivating it — so real layout is used only when *every* state in the plan has a matching real-data entry; otherwise the whole diagram falls back to the existing computed layout, unchanged.

### Verified, real data, end to end

- Ran the actual fixed `pull-from-vault.ps1` (not a simulation) against the live Conformity vault: 47/47 states with real `guid`, `layoutData.stateLayout` populated with 48 entries — confirmed by parsing its real stdout directly.
- Loaded that real output into the running app (via the same store-shape-injection technique used throughout this session — `window.mfiles`/`window.file`/every other preload-exposed global was confirmed invisible through this specific CDP debugging session, a tooling quirk unrelated to the app itself, not worth chasing further given the real PowerShell→JSON output was already independently verified).
- Real layout renders by default: 64/64 transitions still bezier curves, 29 back-edges all within canvas bounds, pan confirmed working.
- `Auto-Layout` toggle still fully functional: switches to dagre (different bounds, different back-edge count — genuinely a different layout), and switches back to the *exact same* real layout when toggled off (bounds byte-identical to before).
- Hand-drawn fallback (the built-in Document Approval demo, no GUIDs at all): renders correctly via the existing computed layout, zero errors — confirms the new code path never activates when there's nothing real to use.
- Studio, Process Docs, zero console errors throughout — all unaffected.

## Wide (left-to-right) layout — investigation, two real bugs found, and implementation

### Where this came from

The user shared a screenshot of the real Approbation-scale diagram (110 states, dense back-edge crossing) annotated with a red arrow and a green box highlighting a large empty region to the right of the rendered content, and asked for a layout option — beside the existing `Auto-Layout` button — that spreads the diagram width-wise for a more natural flow and readable labels on dense workflows. Confirmed via a clarifying question that this meant a genuinely new, independently-computed dagre layout (`rankdir:'LR'`, generous spacing), not a horizontal stretch of the layout already on screen.

### Implementation: parameterize, don't duplicate

`layoutPlanWithDagre` (previously hardcoded to `rankdir:'TB', nodesep:60, ranksep:70`) took an options parameter with those exact values as defaults, so the existing `Auto-Layout` call site is unchanged. The new call: `layoutPlanWithDagre(plan, { rankdir:'LR', nodesep:40, ranksep:90 })`. The `autoLayoutActive` boolean became a 3-way `layoutMode` state (`'default'|'auto'|'wide'`) — avoids an invalid "both active" state a second boolean would have needed guarding against. Every effect previously keyed on `[..., autoLayoutActive]` (zoom-apply, pan-attach, wheel-attach, auto-fit) and the wrapper `<div>`'s remount `key` switched to `layoutMode`.

### Bug 1: extreme aspect ratio (12678×1910px, ratio 6.64)

First attempt used `ranksep:160`. Too generous for a graph with many ranks in LR mode — width compounds directly with rank count in a way it doesn't in TB mode (TB's `ranksep` only multiplies against depth, which is typically far shallower than a workflow's total state count). Reduced to `ranksep:90`.

### Bug 2: back-edge detection was TB-specific, real logic bug not just tuning

`computeCanvasAndLanes` and the edge-rendering loop both tested `to.cy <= from.cy` to classify an edge as "backward" — correct for top-to-bottom flow, meaningless for left-to-right flow, where "backward" means `to.cx <= from.cx`. Running the TB test unmodified against the wide layout inflated the back-edge count from 68 (real/TB baseline) to 108, each getting its own lane-width addition to the canvas — a second, compounding contributor to the oversized bounds, not just the `ranksep` value alone.

Fixed by adding an `isHorizontal` parameter threaded through both functions:
- **`computeCanvasAndLanes`**: back-edge span and sort key use `cx` instead of `cy` when horizontal; the shared lane axis becomes a Y-band below the diagram (`backEdgeLaneY = maxBottom + 55`) instead of an X-band to the right (`backEdgeLaneX = maxRight + 55`); canvas `width`/`height` formulas swap which dimension absorbs the lane count.
- **Edge-rendering loop**: forward-edge connection points move from bottom-of-source/top-of-target (vertical S-curve) to right-of-source/left-of-target (horizontal S-curve); back-edge bezier control points route through the shared Y-lane instead of the shared X-lane.

After both fixes: 9843×2097px, aspect ratio 4.69 — wide (inherent to a 110-state graph laid out left-to-right) but no longer degenerate.

### Verified live, real data

- `wide-modest-zoom.png`: genuine left-to-right flow (`Restart_Process → START → UPD_DATE_ACOMBAVB → RTE_INVOICETYPE`), fully readable state names, correct icons, a back-edge curve visibly routed cleanly through its lane.
- Mutual exclusivity confirmed: switching from Wide to Auto-Layout mid-session produces genuinely different TB-dagre bounds (not a combined/stuck state); switching Auto-Layout off returns to the exact original real-layout bounds, byte-identical (2925×2428 both times).
- Pan confirmed working on Wide layout (after fixing a test-scoping bug — see below).
- Full regression (corrected CDP port 9335, not the stale 9334 from an earlier session's Electron instance): real-layout bounds, pan, Auto-Layout toggle round-trip, hand-drawn fallback (no GUIDs — 495×572px, 7 paths, uses the existing computed layout untouched), Studio (7 nodes), Process Docs (6 nodes, `.react-flow` canvas present) — all correct, zero console errors.

### Test-methodology bugs found along the way (not app bugs)

- A regex checking only `c1x === c2x` (the TB-style back-edge lane signature) missed the new LR-style `c1y === c2y` signature entirely, undercounting wide-mode back-edges. Fixed the test to check both — but then found ordinary TB *forward* edges also have equal-Y control points by design (the vertical S-curve's two control points share the same midpoint `my`), making "equal Y" ambiguous between "back-edge lane" and "ordinary forward curve." Relied on the more fundamental `laneOverflowsCanvas: false` check (true in every run) as the real correctness signal rather than chasing an exact back-edge count via an inherently ambiguous heuristic.
- An unscoped `document.querySelectorAll('button')` search for a zoom button by title matched Studio's own permanently-mounted (CSS-hidden) canvas instead of the M-Files Diagram tab's — the same class of bug hit repeatedly earlier in this project's session history. Diagnosed via an implausible post-zoom `svg.style.width`. Fixed by scoping to `.mflow-ltv-zoom-controls-wrap button`.

### Forward-looking constraint noted, not yet acted on

The user flagged a future requirement — an option to hide either the left or right panel for full real estate on one side — while this was mid-implementation. Nothing in this Wide Layout work hardcodes the current fixed panel-split proportions; `layoutMode` and all its geometry are computed independently of panel width, so this remains compatible without changes. Not built — noted here for the next session that touches panel layout.

**Update, later session (2026-08-25): built.** The divider chevron (bidirectional expand-left/expand-right, `MFlowCanvas.jsx`) and this panel getting its own bottom scrollbar are exactly that constraint being closed — see progress.md's "M-Files Flow follow-up round" entry for the full detail. Confirmed compatible with everything above: `layoutMode`/pan/zoom geometry never assumed a fixed panel width, so neither addition touched any of this file's own layout math.

## Line color/width — investigated against a real M-Files Admin screenshot, not yet applied (2026-08-25)

The operator shared a real M-Files Admin workflow diagram screenshot and asked whether this tab could match its connector-line look more closely. Investigated, findings only (explicitly asked not to change anything that pass):

- This tab's real values: `stroke:'#334155'` (slate-800), `strokeWidth:2` (`MFilesDiagramView`'s edge-drawing code, the `t.IsSkeleton ? '#b45309' : '#334155'` line). The reference screenshot's connector lines are visibly thinner and a lighter slate tone — a real, confirmed gap, not a subjective read.
- The reference's small blue circles on some lines are very likely `EvaluationPriority` (already computed by the translator, `t.EvaluationPriority`, §1.6 — already shown as small tucked-in text via `edgeLabel()`, never as a distinct badge).
- `TriggerCriteria.Operator` exists in the real plan JSON (`ProvisioningAI.Workflow.Translation.Models.cs`'s `TriggerCriteriaExpression(Property, Operator, Value)`) but nothing in this tab (or anywhere else in the frontend) reads it — every rendered condition silently assumes `=`.

**What got built instead, same session:** a plain blue circle badge (no number, deliberately — see progress.md's "Real M-Files trigger/guard data captured" entry for the operator's own explicit scope cut) on every transition with `TriggerMode !== 'Manual'`, added as a second `edgeEls.push(<circle .../>)` right after the existing edge `<path>` push, at the same raw `midX`/`midY` the label positioning already computes (before that logic's own collision-avoidance loop can nudge it away from the line). The arrow color/width change itself is still open — not applied this pass, the operator redirected to the bigger "why does nothing render dashed" gap first (which turned out to live in Studio's canvas and the import pipeline, not this file — see the same progress.md entry).
