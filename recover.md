# Recovery Notes

Purpose: if a session runs out of tokens or gets cut off mid-work, read this
first to know exactly where things stand before doing anything else — don't
re-derive it from scratch, don't assume, don't re-ask questions already
answered below.

Last updated: 2026-08-16 (session pausing, operator back in ~4 hours).

---

## ACTIVE — New "M-Files Flow" section (clean-slate canvas + palette)

**This supersedes the "restoration" framing below** — after the toolbar
Palette + object-rail were built and confirmed matching what the user
pointed at, the user clarified the real ask is bigger: a genuinely new top-
nav section, not more additions to `CommandCenter.jsx`. Confirmed via
AskUserQuestion before starting:

- **New nav entry** in `sections.js`, positioned beside "Process Docs",
  labeled **"M-Files Flow"**, with a distinct icon (not `Workflow`, which
  Studio already uses — pick something visually different, e.g. `Network` or
  `Waypoints` from lucide-react).
- **Architecture patterned after BPMN's Process Docs canvas** — categorized/
  hover-expand palette rail, floating toolbars, that general UX language —
  but rendered with **Mermaid.js, not React Flow**. Scoped to the minimal
  State + Transition model (see
  `studio_minimal_state_transition_model.md` in global memory for the full
  rationale: future prompt-to-workflow generation needs an easy, minimal
  translation path to M-Files' native style, which is exactly this
  two-primitive shape).
- **Runs alongside Studio, not replacing it** (user's explicit choice) —
  Studio stays exactly as-is, untouched, until M-Files Flow is proven out.
  Studio is still "legacy" in the user's own words from earlier in this
  session and may be retired later, but that's a future decision, not this
  task.
- **Shares Studio's data** (user's explicit choice) — same
  `useWorkflowStore`, same workflows array, same `Service Agreement` example
  data. This is a new view/edit surface on the exact same states and
  transitions, not a parallel data model.

### Investigation done before writing any code

Checked what's actually reusable vs. what would need duplicating. Findings:

- `useMermaid` hook (`src/hooks/useMermaid.js`) — already a clean, exported,
  standalone hook. Reusable as-is, no changes needed.
- **Everything else in Studio's render pipeline is a private, unexported,
  module-level function inside `CommandCenter.jsx`** — `highlightNode`,
  `addClicks`, `enableEdgeInteraction`, `buildLayoutModel`,
  `applyGatewayDiamonds`, `applyStateAnnotations`, `applyEdgeFlowAnimation`,
  `applyManualLayout`, `enableNodeDrag`, `highlightEdge`, `buildEdgeMap`,
  `redrawEdge`, `growViewBoxToFit`, `rectEdgePoint` (all found at their own
  top-level `function` declarations, `CommandCenter.jsx` lines 111-620ish).
  None of these are exported, so a new component can't import them yet.

### Planned approach — REVISED after reading the actual functions

Reading the code changed the plan. `highlightNode`/`addClicks`/
`enableEdgeInteraction`/`buildLayoutModel`/`applyGatewayDiamonds`/
`applyManualLayout`/`enableNodeDrag`/etc. (`CommandCenter.jsx` lines
111-620) are not independent utilities — they're a tightly interdependent
~500-line system (shared mutable layout-model objects, edge bend-dragging,
gateway-diamond DOM surgery, node-drag position persistence, viewBox
growing). Exporting them and importing into a new file is technically
possible but would mean the new component inherits every one of Studio's
accumulated edge cases on day one, and "just export it" undersells how
coupled this actually is.

**Decision: build M-Files Flow v1 genuinely minimal, not full parity with
Studio's diagram from the start.** This matches "clean slate" more honestly
than re-importing Studio's whole accumulated feature set in one move:

- Reuse `useMermaid` (clean, already exported) to get the Mermaid source
  string.
- Render it with a fresh, simple `mermaid.render()` call — no gateway
  diamonds, no edge-bend dragging, no node dragging, no flow animation, no
  theme picker. Just the diagram.
- Basic click-to-select on state nodes — reimplemented fresh in ~15 lines
  (this part is cheap and self-contained, not worth importing for).
- Palette (State / Initial State tiles) calls the existing
  `addState`/`updateState` actions — same store, so this still edits real
  data.
- Advanced Studio features (gateway diamonds, edge dragging, animation,
  themes) are **deliberately deferred**, not abandoned — add them
  incrementally once this basic shell is proven, and only then decide
  per-feature whether to export-and-share from `CommandCenter.jsx` or
  reimplement. Don't silently expand scope back to full parity without
  checking first — that's a meaningfully bigger task than what was agreed.

New files planned:

- `src/components/MFlowCanvas.jsx` — top-level canvas for the new section,
  mirrors `BpmnCanvas.jsx`'s role.
- `src/components/mflow/MFlowPalette.jsx` — palette component, mirrors
  `BpmnPalette.jsx`'s hover-expand/categorized pattern, trimmed to a single
  "States" category (State, Initial State tiles) per the minimal-model rule
  above.

### Built and verified live

- New section registered in `sections.js` (id `mflow`, label "M-Files Flow",
  `Network` icon from lucide-react — deliberately different from Studio's
  `Workflow` icon), positioned between Studio and Process Docs.
- `AppShell.jsx`: added `isMflow` routing, extended the Reset button and
  `ContextTabStrip` (workflow tab strip) to show for `isStudio || isMflow`
  since they share the same `useWorkflowStore` data.
- `src/components/MFlowCanvas.jsx` — new top-level canvas. Own
  `loadMermaid()` (small, duplicated from `CommandCenter.jsx`'s — safe to
  duplicate, it's idempotent and only touches `window.mermaid`, no shared
  module state). Reuses `useMermaid` hook unchanged. Fresh, simple
  `mermaid.render()` call, no gateway diamonds/edge-dragging/node-dragging/
  animation (deliberately deferred, see the scope note above). Basic
  click-to-select on nodes, ~10 lines, not imported from Studio.
- `src/components/mflow/MFlowPalette.jsx` — hover-expand palette shell,
  visual language copied from `BpmnPalette.jsx`/`.bpmn-pal-*` (confirmed
  with the user as the right reference point) but as an independent
  component/CSS ruleset (`.mflow-pal-*`), not a shared one — so BPMN's and
  M-Files Flow's palettes can diverge later without coupling. One category
  ("States"), two tiles (State, Initial State), calling `addState(activeId)`
  / `addState(activeId, {initial:true})`.
- `useWorkflowStore.js`'s `addState` already had the optional-patch
  extension from the earlier Studio-toolbar work — reused as-is, no further
  store changes needed.
- CSS: `.mflow-*` rules added to `App.jsx`, right before the existing
  `.bpmn-*` block.

**Verified live, this session:**

- Navigated to the new "M-Files Flow" nav entry — zero console errors, zero
  failed requests.
- Diagram renders the exact same Service Agreement workflow Studio shows,
  including existing state fill colors — confirmed shared data, not a copy.
- Clicked the palette's "State" tile, then switched to Studio and confirmed
  the States table row count went 12→13 — the new state genuinely landed in
  the shared store, visible from both sections.

### Known rough edges — not yet fixed, worth a follow-up pass

- **Diagram renders oversized** — `width:100%` with no fit-to-view/zoom
  constraint means a diagram bigger than the viewport (this 12-13 state one)
  renders at a scale where only 1-2 nodes are visible without scrolling.
  Studio has zoom/pan/auto-arrange for this; M-Files Flow currently has
  none. Needs at least a basic fit-to-view on first render.
- Selecting a state (`sel`) currently only drives the status-line text —
  there's no visual highlight on the selected node in the diagram itself yet
  (Studio's `highlightNode` does this but wasn't imported, per the
  deliberate-minimal-v1 scope decision above).
- No styling control (fill color / status label) surfaced in M-Files Flow
  yet — it inherits whatever Studio's toolbar Palette already set on shared
  data, but there's no way to set it from this new canvas directly. May or
  may not need porting depending on how this canvas is meant to be used
  going forward — ask before adding rather than assuming.

**Status: v1 shell built and verified working end-to-end (nav → canvas →
palette → shared data). Rough edges above are real but not blockers.** If
picking this up cold, the rough-edges list is the natural next-step queue.

### Professional canvas/palette pass (2026-08-15, same session)

User feedback: palette was "missing a lot of options — line type, diamond,
node, transition, option to clear canvas" — asked for a professional
canvas/palette using Process Docs as the reference. Resolved the tension
with the minimal-model rule (see top of this section) via AskUserQuestion
before building anything:

- **Diamond** = confirmed auto-render only, no new placeable object type.
- **Line type** = confirmed "automatic solid, default orthogonal only" —
  no line-type picker was built; transitions just render as plain solid
  lines, matching what was actually asked for.
- **"Status box outside the workflow, for comments"** = a genuinely new,
  freestanding object type — but explicitly NOT part of the state machine
  (no `from`/`to`, never exported), so it doesn't violate the minimal-model
  rule either.

**Built, all verified live:**

1. `useWorkflowStore.js` — new `comments` array field on every workflow
   object (seed + every creation path: `addWorkflow`, stress-test generator,
   `importWorkflow`, `seedImportedWorkflow` — checked all 4, not just the
   seed). New actions: `addComment`, `updateComment`, `deleteComment`.
   `clearWorkflow` extended to also clear `comments`.
2. `MFlowPalette.jsx` — three sections now: **States** (State, Initial
   State — unchanged), **Annotations** (new: Status tile →
   `addComment`), **Style** (new: fill-color swatch bound to whichever
   state is currently selected, shows "Select a state…" placeholder when
   nothing is). Collapsed rail also got a third compact tile for Status.
3. `MFlowCanvas.jsx` — comment boxes render as absolutely-positioned,
   draggable, colored boxes with an editable textarea and a delete button
   (own local drag handler, container-relative pixels — no zoom/pan to
   account for yet, consistent with the canvas's existing limitation).
   Diamond auto-rendering ported in (simplified rule — see the file's own
   header comment for exactly how it differs from Studio's real
   `group`-based mechanism, and why). Full node-dragging implemented:
   click-drag a state, position persists via the pre-existing
   `updateStatePosition` action, survives remount. Connected edges redraw
   live during drag and after remount (straight-line redraw, not Mermaid's
   original curve — a deliberate simplification, not a bug). Clear Canvas
   button added to the status line, confirms before wiping.
4. `App.jsx` — new CSS for `.mflow-comment*`, `.mflow-clear-btn`,
   `.mflow-pal-style-*`.

**Debugging note worth keeping for next time:** while verifying the drag
feature, `window.*` globals and `element.onmousedown` reads via
`page.evaluate()` in the `browser-automation` skill consistently read back
as unset/null even when the real handler was demonstrably attached and
firing correctly (confirmed by triggering it via `dispatchEvent` and
watching the actual DOM change — state selection, color application, and
drag all worked when tested this way). Root cause not fully pinned down
(a plausible theory is `patchright`'s evaluate() running in an isolated
world that doesn't share JS-level globals/properties with the page's own
main-world execution, even though DOM structure/attributes ARE shared
across both) — but the practical lesson is: **don't trust `window.X`/
`element.onX` reads via this tool's `page.evaluate()` as proof something
didn't run. Trust real DOM state changes and `dispatchEvent`-triggered
behavior instead.** This cost significant time this session before the
distinction was found. Also independently confirmed: `page.mouse.move/down/
up` (real OS-level mouse simulation) silently fails to hit elements
positioned outside the current viewport (relevant here because the known
"diagram renders oversized" issue puts most nodes off-screen) —
`dispatchEvent` with explicit `clientX`/`clientY` on the target element
directly sidesteps this and is the reliable method for this app's
oversized-diagram situation specifically.

Also: restarted the Vite dev server with `node_modules/.vite` cleared
partway through this debugging (in case of a stale transform cache) — this
did NOT turn out to be the actual cause (the isolated-world theory above
better fits the evidence), but doesn't hurt to know a clean restart is a
cheap first move if something looks like it should work but doesn't.

### Rapid-fire polish round (2026-08-15, same session, right after the professional-canvas pass above)

User fired off a fast sequence of gaps found while actually using the canvas.
Addressed all of them, verified live:

1. **End icon/End State missing** — palette only had State + Initial State.
   Added an **End State** tile (`CircleStop` icon, matches BPMN's End glyph).
   Wired to `addState(activeId, {terminal:true})`. Required a new
   `state.terminal` field — added to `useMermaid.js`: emits Mermaid's own
   native `id --> [*]` end-marker syntax (no custom SVG needed, unlike
   diamonds — confirmed live: Mermaid renders this as a ringed circle,
   distinct from the start marker, 3 total `<circle>` elements once a named
   terminal state exists — 0 states show 1, since an unnamed/blank state
   never reaches the diagram at all, same as every other blank state).
   `stateKey` memo dependency in `useMermaid.js` updated to include
   `terminal` so color/name/terminal changes all correctly invalidate the
   cached diagram string.
2. **Comment/status color dot** — palette's Status tile now has its own
   circular color-swatch dot (`commentColor` state in `MFlowCanvas.jsx`,
   lifted so it persists across multiple comments added in one session);
   `addComment` extended to accept a color argument. Also separately fixed:
   the ALREADY-BUILT color picker inside each placed comment box's header
   was a barely-visible 16px square — restyled to a clear circular dot with
   a visible border, since the user flagged it as looking "missing" even
   though the input technically existed.
3. **"Selection doesn't add anything to the canvas"** — this was the
   already-logged rough edge (`sel` only drove status-line text, no visual
   feedback on the node itself). Fixed: new effect keyed on `[sel,
   mermaidStr]` applies a blue stroke + glow filter to the selected node's
   shape, clears it from all others. Known limitation: if `mermaidStr`
   itself changes (e.g. color edited) at the exact same moment a selection
   is active, the highlight can be briefly lost until the next click —
   acceptable v1 tradeoff, not fixed, since the common case (click to
   select, nothing else changing) works correctly.
4. **Zoom / pan / lock controls missing** — this turned out to be the same
   root cause as two other complaints below. Added a real toolbar
   (`.mflow-view-controls`, in the status line): `-`/`+` zoom, `Fit`
   (recomputes a fit-to-container scale on demand), and a Lock/Unlock
   toggle (`Lock` icon from lucide-react) that disables node dragging while
   still allowing selection — `lockedRef` (a ref mirroring `locked` state)
   is what the drag `onmousedown` handler actually checks, since that
   handler is a raw DOM callback that doesn't re-subscribe to React state.
   **Also added automatic fit-to-view on every fresh render** — the
   diagram's natural size is stashed on the svg's `dataset.baseWidth/
   baseHeight` the first time it's built, then scaled to fit the
   container (capped at 1, never scales up past natural size).
5. **"Drag missing" / "diamond missing"** — both were downstream of the
   same oversized-diagram issue fit-to-view (#4) now fixes: nodes were
   rendering far outside the visible viewport (confirmed earlier: one
   node's `getBoundingClientRect().y` was 1883px down on a ~720-800px
   viewport), so both dragging and the diamond were real and working all
   along, just unreachable/invisible without scrolling. Confirmed fixed —
   full diagram now fits on screen by default.
6. **"Grouping missing"** — NOT built, genuinely ambiguous, flagged back to
   the user rather than guessed at. Could mean either (a) Studio's existing
   `transition.group` field (already real, already in the shared data
   model, just has no UI in M-Files Flow to set it — safe to add, doesn't
   reopen the minimal-model boundary), or (b) BPMN's Pool/container concept
   (explicitly excluded earlier as a placeable object type). **Ask before
   building — these are very different scopes.**
7. **Branch arrows not orthogonal** — real regression from this same
   session's own earlier `redrawEdge`, which drew a plain diagonal
   `M...L...` line between two points. Replaced with a new `orthogonalPath`
   helper (single-elbow, right-angle-only routing — horizontal/vertical/one
   90° bend, matching `theme_comparison_mockup.html`'s already-established
   "no diagonals" convention for this project). `rectEdgePoint` (the old
   diagonal-endpoint helper) removed as dead code once nothing called it
   anymore. **User confirmed this fix looks right.**
8. **Arrowheads missing at branch ends** — found via direct DOM inspection
   after the orthogonal fix: `marker-end` attributes and marker
   `<defs>` were both present and valid (not a broken reference), but the
   marker's own `<path>` was resolving to `fill: white` (Mermaid's
   theme-scoped CSS not landing the expected color in this render
   pipeline) — invisible against the canvas's light background. Fixed by
   forcing `marker path` fill to `#2A5FA8` directly after each render,
   rather than chasing Mermaid's CSS scoping. Confirmed live: arrowheads
   now visible on every edge.
9. **Diamond label clipping** — "Under Review" (a real two-word state name)
   was clipped inside the original 20×20-half-extent diamond, which was
   sized for Studio's icon-only treatment, not real text. This canvas's
   diamond keeps the state's own name as its label (no separate hub node
   like Studio has — see the file's own header comment on why), so it
   needed real room for text. Enlarged to 46×34 half-extents, reduced label
   font-size to 9px for diamond nodes specifically. Confirmed fits cleanly
   now.

**All of the above verified together in one final pass**: zero console
errors, orthogonal edges with visible arrowheads, correctly-fitting diamond
with readable label, fit-to-view working automatically, end-marker
confirmed rendering (3 circles) once a terminal state is named, lock
correctly blocks dragging while leaving selection intact.

**Still open, needs the user's answer before building:** what "Grouping"
means (#6 above).

### Icon dot-badges + main state color (2026-08-15, same session, right after the polish round above)

User shared a reference image: a rounded-icon tile with a small colored dot
badge overlapping its bottom-right corner (one green, one red on a
"STATUS ANNOTATION" tile) — clarifying that the color pickers should be a
small badge ON the icon, not a separate full-size swatch next to the label.
Also asked for the same treatment on the **State** tile, as a "main color"
default for newly-created states (not just the existing per-selected-state
Style-section picker).

- New `IconWithDot` helper component in `MFlowPalette.jsx` — icon +
  absolutely-positioned 9px circular color-dot badge, reusable.
- New `stateColor` state in `MFlowCanvas.jsx` (default `#3A7FD5`), applied
  to `addState`'s patch for all three State-category tiles (State, Initial
  State, End State) so whichever color is set on the badge is what new
  states are created with.
- Old `.mflow-pal-color-dot` (full-size swatch) CSS removed, replaced with
  `.mflow-icon-badge`/`.mflow-icon-badge-dot`.
- Checked first whether an icon+corner-dot pattern already existed
  anywhere else in the codebase before building a new one (per the user's
  explicit "don't reinvent the wheel" reminder) — it didn't
  (`grep -ri "icon-badge|corner-dot|badge-dot|color-badge"` across `src/`
  only matched this new code and one unrelated legacy investigation HTML
  file). Everything else in this pass reuses existing pieces:
  `gatewayStyleFor`/`SHAPE_STROKE_WIDTH` from the shared utils, `.style-clear`
  CSS, the `.bpmn-pal-tile` visual language.
- **Verified live**: both dots render (State tile blue, Status tile
  orange), zero console errors, changing the State dot's color and adding
  a new state correctly created it with that color (confirmed via Studio's
  own table row count, `wf.states` growing to 15 across the session's
  cumulative testing).

### Diamond spec question resolved

User was shown `GUI_HANDOFF_2026-08-13.md` for context (it documents
Studio's real gateway-diamond design tokens — 40×40, icon-only, exact
per-type colors) and confirmed: the new M-Files Flow diamond should stay
independent of that spec. The enlarged 46×34 text-label version built in
the polish round above is the intended, final approach for this canvas,
not a gap to reconcile.

### Multi-select + right-click context menu (2026-08-15, same session)

"Grouping missing" (flagged earlier, deliberately left unbuilt pending
clarification) turned out to mean neither of the two guesses offered —
user clarified directly: **not** Studio's `transition.group` field, **not**
BPMN's Pool container. Wanted: right-click → Select All / Edit / Duplicate /
Delete, matching BPMN's own node context menu.

- `useWorkflowStore.js`: new `duplicateState(wfId, stateId)` action —
  clones a state's own fields (color etc.), NOT its transitions (same
  "duplicate doesn't bring edges along" convention BPMN's `duplicateNode`
  already uses), never marked initial even if the original was, offsets
  stored x/y by +30/+30 if present. `renameState`/`deleteState` already
  existed and needed no changes — reused as-is.
- `MFlowCanvas.jsx`: `sel` (single string) replaced with `selected` (a
  `Set` of state names) throughout — selection highlight, status line,
  Style panel's `selectedState` all updated to work off the set.
  - Click a node: replace selection. Ctrl/Cmd/Shift+click: toggle in
    selection (matches BPMN's own modifier-click convention).
  - Right-click a node: if it's already part of a multi-selection, keeps
    the whole selection for the menu's actions (same as BPMN); otherwise
    selects just that node first.
  - Right-click empty canvas: menu with just "Select All."
  - Ctrl/Cmd+A: select every named state — skipped while focus is in a
    real text input/textarea so it doesn't hijack native text select-all.
  - Escape: clears selection and closes any open context menu.
  - Edit: only enabled for a single-node selection (disabled, not hidden,
    when multiple are selected — same "show why, don't hide" convention
    BPMN's own disabled buttons use). Implemented via `window.prompt`
    pre-filled with the current name, committing through `renameState` —
    deliberately not a custom inline-input UI, since `window.prompt`/
    `window.confirm`/`window.alert` are already the established pattern
    this file and Studio both use (Clear Canvas's confirm, the delete
    guard's alert).
  - Duplicate/Delete: operate on the whole current selection, not just the
    right-clicked node.
- **Context menu chrome directly reuses BPMN's own `.bpmn-context-menu`
  CSS class** (not a copy) — per the user's explicit "if you find the code
  already exists, reuse it, don't reinvent the wheel." This is a deliberate
  exception to this file's usual "independent CSS, same visual language"
  approach (used everywhere else, e.g. `.mflow-pal-*` vs `.bpmn-pal-*`):
  a context-menu box is pure generic UI chrome with zero coupling to
  either canvas's data, so sharing the actual class was judged safe where
  the palette/tile styles (which encode canvas-specific interaction
  assumptions) were not.

**Verified live**: Ctrl+A selected all 6 states (confirmed via status line
text and visible highlight ring on every node); right-clicking a selected
node kept the 6-state selection and showed "6 states" in the menu, Edit
correctly disabled; Duplicate on that 6-state selection correctly created
6 new states (Studio's own table row count went 6→12, confirmed
independently); a fresh single right-click (no prior selection) correctly
enabled Edit; renaming via the prompt correctly changed "Draft" to
"Draft Renamed" in the live diagram. Zero console errors across all of it.

### Drag-clipping bug fix + undo/redo (2026-08-15, same session)

User: "when you drag the workflow it's part disappear or part are invisible."

Root cause: `growViewBoxToFit` — the exact fix Studio already has for this
exact problem (SVG hides content outside its `viewBox` by default; Mermaid
only sizes the viewBox to its own auto-computed layout) — was never ported
into this canvas's drag handler at all. Ported it in (`MFlowCanvas.jsx`,
same math as Studio's version, not imported since Studio's isn't exported —
small enough to duplicate correctly). **First fix attempt was incomplete**:
called it during the live drag's `onMove`, which helped during the drag
itself but the bug persisted afterward — traced further and found the REAL
trigger: `updateStatePosition` at drag-end changes `wf.states`, which
re-runs the whole render effect, and that fresh render starts from
Mermaid's own natural (small) viewBox and reapplies stored x/y positions
via transform WITHOUT re-growing the viewBox for them — so a dragged node
stayed visible only for the live-drag frames and vanished again the instant
the position committed. Fixed by also calling `growViewBoxToFit` in the
"apply stored positions" step that runs on every render, not just live
drags. Verified live: dragged a node from `(48.7,411.5)` to
`(448.7,811.5)` (well outside the original `0 0 215.6 435` viewBox) — after
the fix, the viewBox correctly grew to `0 0 508.7 871.5` and every node
stayed visible and connected, confirmed via screenshot.

**Undo/redo added at the same time** (user's follow-up request, "add
undo/redo on the right click"): new snapshot-based `history`/`takeSnapshot`/
`undo`/`redo` added to `useWorkflowStore.js` itself (same pattern
`useBpmnStore.js` already proved out — push `{workflows}` before each
mutating action, not a diff/reducer). **This is a shared-store change**,
so the capability now technically exists for Studio too, but nothing in
Studio calls `takeSnapshot()` — purely additive, zero behavior change
there. `MFlowCanvas.jsx` calls `takeSnapshot()` before: every palette add
action, Duplicate/Delete/Edit(rename) from the context menu, Clear Canvas,
comment add/delete/drag-start, and state drag-start (snapshotted once when
a real drag begins, not every move frame — same reasoning BPMN's own
`onNodeDragStart` snapshot uses, to avoid flooding history). Ctrl+Z/
Ctrl+Shift+Z (and Ctrl+Y) wired into the existing keydown listener,
skipped while focus is in a real text field so browser-native text-undo
still works there. Undo/Redo also added as entries on both context-menu
variants (node and canvas), matching BPMN's own convention of having them
on every menu type. Verified live: dragged a node, confirmed its
`transform` changed, pressed Ctrl+Z, confirmed it reverted to the exact
pre-drag position.

### Group-drag fix (2026-08-15, same session, right after undo/redo)

User: "select all does not work it select all objects however I can NOT
drag the workflow around." Select All itself was working correctly
(confirmed already-verified) — the actual gap: this canvas's drag handler
only ever moved the single node under the cursor, with no concept of
moving a multi-selection together at all. BPMN's own canvas already has
exactly this feature, explicitly documented in its own shortcuts panel:
*"Ctrl+A — Select all — then drag any of them to move the whole
workflow."* That's the established convention this canvas was missing.

Fixed in `MFlowCanvas.jsx`'s `onmousedown`: if the dragged node is part of
a multi-selection (`selected.size > 1`), every selected node's starting
position is captured up front, and every `onMove` frame applies the same
delta to all of them (transform update, viewBox growth, and edge redraw
all extended from "the one node" to "the touched set"). `onUp` persists
every moved node's final position via `updateStatePosition`, not just one.
Single-node drag (no multi-selection) is unaffected — same code path,
`groupIds` just resolves to a length-1 array in that case.

**Verified live**: Select All (Ctrl+A), dragged one node by (80,40) screen
px — every one of the 6 named states moved by exactly (80,40) in SVG
space, confirmed by diffing each node's `transform` before/after. The
unlabeled `[*]` start-marker circle correctly did not move (not a real
state, was never part of the selection). Zero console errors.

### New states now get a real default name (2026-08-15, same session)

User: "the only object that goes to canvas when I select it's Status" —
State/Initial State/End State appeared to do nothing when clicked. Root
cause: `addState` (both Studio's and this canvas's) creates a new state
with `name: ''` by default, and `useMermaid.js` deliberately excludes
blank-named states from the diagram (`if (!name) return`) — the state WAS
being added to the store correctly, just invisible until named, which
Studio's table-based UI makes obvious (an empty-name row right there to
type into) but this canvas's palette gives no such affordance for yet.
Comments don't have this exclusion, which is why only Status appeared to
work.

Fixed by matching BPMN's own palette convention instead of Studio's
blank-then-rename one — `useBpmnStore.js`'s `addTask` already labels a
fresh node `"New task"` immediately, never blank. New `uniqueStateName(base)`
helper in `MFlowCanvas.jsx` checks existing state names and appends `" 2"`,
`" 3"`, etc. as needed (names are the lookup key everywhere in this shared
model — Mermaid rendering, selection, transitions all key off `s.name`, so
collisions aren't just cosmetic). Wired into all three State-category
palette tiles: `"New State"` / `"New Initial State"` / `"New End State"`.

**Verified live**: clicked State once — node count went 7→8, "New State"
immediately visible in the diagram (floating, disconnected, correctly —
it has no transitions yet). Clicked again — correctly produced
"New State 2", confirming the uniqueness check. Zero console errors.

### Quick preset color swatches on the state right-click menu (2026-08-15, same session)

User asked for a faster way to set a state's fill color than opening the
palette's Style section — a row of preset color dots (red, blue, green,
yellow, black, etc.) directly in the right-click menu.

- New `PRESET_COLORS` constant (8 named colors + a clear/none option) in
  `MFlowCanvas.jsx`.
- New `handleSetColorSelected(color)` — applies to the whole current
  context-menu selection (same convention as Duplicate/Delete), snapshots
  first (undo-friendly).
- Added a "Fill color" section to the node context menu, rendered as a row
  of small circular swatch buttons.
- **Real bug hit and fixed**: first pass rendered as full-width bars, not
  dots — `.bpmn-context-menu button{width:100%;display:block}` (reused
  chrome from earlier) has higher CSS specificity (class+element) than a
  bare `.mflow-menu-swatch` class selector, so it was silently winning.
  Fixed with a more specific `.mflow-menu-swatches .mflow-menu-swatch`
  selector plus explicit `!important` on the sizing/display properties —
  needed since beating an element-typed selector purely on specificity
  ordering wasn't reliable enough here. Sized to 12px per the user's
  follow-up ("make the color tiny dot instead") after seeing the first,
  larger (18px) version.

**Verified live**: 9 swatches present (8 colors + clear), clicking Green
correctly set the state's fill (`rgb(34,197,94)` confirmed via computed
style), screenshot confirms proper small circular dots matching the
reference image. Zero console errors.

Follow-up: user wanted a fixed 3-per-row grid rather than width-based
wrapping (`flex-wrap` happened to fit all 9 on one line at this menu
width). Changed `.mflow-menu-swatches` from flex to
`display:grid;grid-template-columns:repeat(3,12px)` — always exactly 3
per row regardless of container width. Verified via screenshot.

Second follow-up: "Fill color" wording replaced with "Background color"
throughout — the context menu's section label, its Clear swatch's tooltip,
and the matching wording in the palette's Style section (label, tooltip,
and the "select a state…" empty-state message). Verified live: context
menu label confirmed reading "Background color."

Third follow-up: user asked for the same right-click background-color
concept on Status/comment boxes, which had none — only an always-visible
small color-input dot in the comment's own header. Added
`onContextMenu` to the comment box div, a `type: 'comment'` branch in the
shared context-menu JSX (same `PRESET_COLORS` swatch grid, no Clear
button — a comment always has some background, unlike a state's fill
which can be genuinely unset), and `handleSetCommentColorSelected`. Also
added Delete to the comment's right-click menu (comments already had a
delete button in their header; this is a second path to the same action,
for menu-shape consistency with states' menu). Verified live:
right-clicking a Status box shows "Background color" + 8 swatches +
Delete + Undo/Redo, clicking Purple correctly set the box's background
(`rgb(168,85,247)` confirmed via computed style). Zero console errors.

Fourth follow-up: "make the look and size of status blend better" — the
box was 160px wide, fully filled solid with the chosen color, and had a
harsh two-tone look (a semi-transparent dark header bar sitting directly
on top of the saturated fill). Redesigned: 128px wide (closer to a state
node's footprint), body now uses the app's own dark theme surface
(`var(--s2)`/`var(--s3)`) instead of the raw color, with the chosen color
reduced to a 3px accent stripe across the top (JSX now sets
`borderTopColor: c.color` instead of `background: c.color`) plus the
small color dot already in the header — same "color = identity, not the
whole surface" idea the state nodes' own fill-color feature doesn't need
but this note benefits from, since it sits on top of a light diagram
background rather than being part of the diagram itself. Reduced textarea
min-height (52px→32px) and font sizes to match. Verified live via
screenshot and computed style (`width:128px`, accent stripe color
confirmed, body background confirmed as the dark theme token, not the
raw comment color).

### Canvas pan rebuilt as free transform, not scroll (2026-08-15, same session)

User: "the hand is not moving the canvas up and down left and right" —
confirmed this meant panning the whole canvas view itself, not group-drag
(select-all-then-drag, already working and confirmed separately). The
original pan implementation (ported from Studio's `.diagram-wrap`) used
native `scrollLeft`/`scrollTop`, which only moves anything when the
diagram is actually bigger than its container — since this canvas
auto-fits by default, there's usually zero scrollable overflow, so
dragging correctly did nothing. BPMN's React Flow canvas, by contrast,
pans freely regardless of content size (a virtual/transform-based
viewport, not scroll-bound).

Rebuilt to match: pan is now a `transform: translate(x,y)` applied
directly to the SVG element (`panRef`, a ref rather than React state — same
reasoning as `layoutRef`, avoids a re-render per drag-frame). Changes:

- `.mflow-diagram` CSS: `overflow:auto` → `overflow:hidden` (no more
  scrollable region to expose a scrollbar for; hidden just clips whatever
  pans outside the viewport).
- Every fresh render (a new `<svg>` element each time) reapplies whatever
  pan offset was already in `panRef.current` — otherwise a re-render (e.g.
  from renaming a state) would silently snap the view back to center.
- The "Fit" button now also resets `panRef` to `{0,0}` and applies
  `translate(0px,0px)` — an explicit recenter, not just a rescale.
- Zoom (`+`/`-`) and node-dragging are untouched — independent mechanisms
  (zoom scales `svg.style.width`, pan transforms the whole element, node
  drag repositions individual `<g class="node">` elements via their own
  transform) that don't interfere with each other.

**Verified live**: dragged empty canvas space at default fit-to-view zoom
(no scroll overflow existed) — `transform` went from `translate(0px,0px)`
to `translate(-80px,60px)`, confirming pan now works with zero dependency
on content overflow. Separately confirmed node-dragging (Draft) still
works correctly and independently of the pan change. Confirmed Fit
correctly resets pan to `translate(0px,0px)`. Zero console errors.

### Pan/zoom feel compared directly against Process Docs (2026-08-15, same session)

User asked whether M-Files Flow's canvas-move feature felt different from
Process Docs' (BPMN) — **explicitly: don't change Process Docs, it's the
point of truth.** Checked `BpmnCanvas.jsx` directly (read-only) rather than
guessing: it uses React Flow's own native `panOnDrag`/`zoomOnScroll` props
— i.e. D3-zoom's built-in drag/wheel behavior, not a hand-rolled handler.
Found two real, concrete gaps in `MFlowCanvas.jsx` versus that and fixed
both there only:

1. **5px pan dead-zone.** React Flow's native drag engages the instant the
   pointer moves — no threshold. This canvas's own hand-rolled pan handler
   had a 5px `PAN_THRESHOLD` before panning kicked in, a small but real lag
   BPMN doesn't have. Reduced to 1px (kept, not removed entirely, so a
   genuine zero-movement click still doesn't register as a drag — though
   click-to-deselect is a separate React `onClick` handler anyway, unaffected
   either way).
2. **No scroll-wheel zoom at all.** BPMN's `zoomOnScroll` lets you zoom by
   scrolling while hovering the canvas; this canvas had zero wheel handling
   — scrolling over it did nothing. Added a `wheel` listener (`{ passive:
   false }` so `preventDefault()` works) that adjusts `zoom` state by ±0.1
   per notch, same 0.2–3 clamp range the +/- buttons already use.

Also switched every `svg.style.transform` pan assignment (drag, re-render
reapply, Fit's recenter) from `translate(x,y)` to `translate3d(x,y,0)` —
GPU-composited, matching how React Flow's own `.react-flow__viewport`
transform is applied, for closer rendering-smoothness parity.

**Verified live**: scroll-wheel over the canvas correctly zoomed
(`215.6px`→`237.2px` width on scroll-up); a 3px drag (below the old 5px
threshold, above the new 1px one) already showed a live
`translate3d(3px,0px,0px)` mid-drag, confirming panning now engages
essentially immediately instead of after a perceptible dead zone. Zero
console errors. `BpmnCanvas.jsx` and every other Process Docs file were
read-only for this — not edited.

### Live States & Transitions table panel (2026-08-15, same session)

User pointed at Studio's own States/Transitions tables and asked for the
same idea in M-Files Flow — this canvas had zero text/table view of its
own data before, only the diagram. Explicitly asked for it to be
collapsible ("a tab to expand it and hide"), and for genuine two-way
sync with the canvas ("it's 2 way relations investigate first understand
then implement").

- New `tablePanelOpen` state, toggled via a `List`-icon button added to
  the existing view-controls toolbar. Collapsed by default (canvas-first),
  matching the user's own framing.
- New right-side panel (`.mflow-table-panel`) — States table (name,
  color dot, initial marker) and Transitions table (from, to), both
  **read-only** (no rename/add-transition inputs here — this is a
  reference view; the palette/canvas/right-click menu remain the only way
  to change anything, deliberately not a second editing surface).
  Reuses Studio's own `.inline-mini` table CSS directly for the rows
  (only the panel shell/header CSS is new) — same "don't reinvent the
  wheel" reasoning as reusing `.bpmn-context-menu`.
- Empty states match Studio's own pattern ("No states yet" / "No
  transitions yet" placeholder rows) and the panel auto-updates live from
  the same `wf.states`/`wf.transitions` the canvas already renders from —
  nothing new to wire for "as you create them" data-syncing, it's the
  same store subscription this whole component already has.
- **Two-way sync investigated before claiming it, per the user's explicit
  request** — clicking a table row calls `setSelected(new Set([s.name]))`
  (same setter canvas node-clicks already use), and table rows read
  `selected.has(s.name)` for their own highlight — since both directions
  share the exact same `selected` Set, this was already correctly
  bidirectional the moment the table was wired up, not something that
  needed separate building. Verified directly rather than assumed: clicked
  "Rejected" on the canvas, confirmed its table row picked up the
  `sel-row` class (`className` read directly from the DOM) — full
  screenshot confirms both the canvas node and its table row highlighted
  together.

Zero console errors throughout.

### Seed data rebuilt too (2026-08-15, same session)

User: "remove the current workflow and rebuild accordingly" — confirmed via
AskUserQuestion this meant the hardcoded `SERVICE_AGREEMENT` example data in
`useWorkflowStore.js`, not the canvas code. Replaced with `DOCUMENT_APPROVAL`
(`id: 'wf-da'`): 6 states (Draft→Submitted→Under Review→Approved/Rejected,
Rejected→Draft, Approved→Closed), 6 transitions, **no `color`/`group`/theme
overrides on any individual state or transition** — deliberately built to
look like something the new palette itself could produce (plain
State+Transition only), not a richer example the palette can't reproduce.
`id`/`name` both changed (`wf-sa`/"Service Agreement" →
`wf-da`/"Document Approval") — confirmed no other file referenced the old
id/name (`grep -r "wf-sa\|Service Agreement"` across `src/` came back empty
after the edit). Verified live in both Studio and M-Files Flow — same data,
renders correctly in both, zero console errors.

---

## DONE (superseded by the section above, kept for its own detail) — M-Files Flow (Studio) "canvas and palette" restoration

**User-confirmed match, this session.** Both palettes built, verified live,
and explicitly approved by the user against the original ask. Treat this
thread as closed unless new issues surface. Remaining checklist items below
(PNG upload smoke test, object-URL leak on reset, a real `npm run build`)
are polish, not blockers.

**Context:** the user had a parallel session running in Codex (a different
AI coding tool, not another Claude Code window) working this same codebase.
Codex ran out of tokens mid-task. The user asked Claude Code to pick up and
"restore the canvas and palette, anything you can think of."

**What "the palette" turned out to mean**, after a long investigation (see
prior conversation for full trail — VS Code local history at
`%APPDATA%\Code\User\History\` was the key source, since none of this was
ever git-committed): a toolbar control, positioned beside the Neutral/Cacoo/
Hub-accent theme selector, for styling the currently-selected state directly
— fill color + a floating status-label with its own color — without having
to open the per-row "Cosmetic style…" popover first. Confirmed distinct from:

- Compare PNG (a real, separate feature — see below)
- The existing per-row "Cosmetic style…" popover (`CommandCenter.jsx`, STYLE
  column) — already existed, still exists, unchanged
- The Cacoo import panel — explicitly ruled out by the user
- BPMN's `BpmnPalette.jsx` — a different canvas entirely (Process Docs, not
  Studio), explicitly ruled out ("strictly for M-Files... based on Mermaid")

### Built this session (both verified live, zero console errors, screenshots taken)

1. **Toolbar Palette control** — `CommandCenter.jsx`, in the diagram toolbar
   row, right after the `.theme-toggle` (Neutral/Cacoo/Hub-accent) block.
   - New derived var `selStateObj` (finds the currently-selected state by
     `sel` name) — added right after `selTransObj`'s definition (~line 1101).
   - New `.toolbar-palette` JSX block: Palette icon, fill-color swatch,
     status-label text input, status-label-color swatch, clear button.
     Disabled (not hidden) when no state is selected.
   - Wired to the *same* `state.color`/`state.badge`/`state.badgeColor`
     fields the existing "Cosmetic style…" popover already uses via
     `updateState(activeId, id, {...})` — no new data model, just a second
     UI surface onto data that already existed and already worked.
   - CSS: `App.jsx`, new `.toolbar-palette` rules added right after the
     existing `.theme-toggle` rules.

2. **Object palette rail** — `CommandCenter.jsx`, top-left corner of
   `diagram-wrap`, small overlay (not a flex-sibling rail like BPMN's — this
   canvas's layout has no side-rail slot and two tiles didn't need one).
   This is a *different* palette from #1 above — #1 styles an existing
   selected state, this one *creates new states*. Deliberately limited to
   what a Mermaid stateDiagram actually has (confirmed with the user: "basic
   objects... mermaid not BPMN compliant"):
   - **+ State** tile → calls `addState(activeId)` (already existed in
     `useWorkflowStore.js`, used by the States table's own "+ Add" button —
     this is a second UI surface onto the same action, not new data).
   - **+ Initial State** tile → calls `addState(activeId, {initial:true})`.
     `addState` needed a small extension for this: it now takes an optional
     `patch` param merged into the new state object
     (`useWorkflowStore.js:165-170`), backward-compatible with every
     existing no-arg caller.
   - **No Gateway/Pool/Sub-Process/Connector tiles** — Studio's "gateway"
     diamonds are auto-derived from transition fan-out, not a placeable
     element; transitions need two real state endpoints already on the
     board, so (matching BPMN's own Connectors-category precedent) they're
     added from the Transitions table, not click-to-place.
   - CSS: `.studio-pal-rail`/`.studio-pal-tile` in `App.jsx`, added right
     before `.zoom-badge`. Upgraded mid-session from icon-only buttons to
     labeled tiles (icon + text, category header "STATES") after the user
     pointed at BPMN's expanded/pinned palette view and said "something
     similar" — reused `.bpmn-pal-tile`'s exact visual spec rather than
     inventing a new look, but did NOT adopt BPMN's hover-expand/search/
     multi-category machinery, since 2 tiles don't need it. Still Mermaid,
     confirmed with the user ("but we are using mermaid.js") — this is a
     visual-language match to BPMN's palette, not an engine change.
   - **Real bug hit and fixed while building this**: the rail sits inside
     `.diagram-wrap`, and `.diagram-wrap svg{width:100%;height:auto}`
     (written for the Mermaid-rendered diagram) was also catching the
     lucide-react icon `<svg>`s inside the tiles, stretching them huge.
     Fixed with an explicit `.studio-pal-tile svg{width:13px!important...}`
     override. Worth remembering if anything else ever gets added inside
     `diagram-wrap` — that rule is broad enough to catch any svg dropped in
     there, not just Mermaid's own output.
   - **Verified live**: state count went 12→13 after clicking + Initial
     State (confirmed via DOM query before/after), and the labeled-tile
     visual fix confirmed via screenshot after the icon-sizing bug was
     caught and fixed.

3. **Compare PNG tab rebuilt** — `CommandCenter.jsx`, `centerView` tab array
   now `Diagram / Compare PNG / JSON / Stats` (was 3-tab before today).
   - This is a *real* feature with real history: added Aug 5, broken
     (drag-to-reorder never worked), removed same day at the user's request.
     Codex rebuilt it this morning (Aug 15, ~7:11–7:12 AM) per an explicit
     task, then a separate "undo, wrong track" instruction reverted it before
     this session started. The rebuild here matches that same task spec.
   - New state: `pngCompareItems` (array of `{id, name, url}` via
     `URL.createObjectURL`), `pngCompareLayout` (`'horizontal'|'vertical'`).
   - Handlers: `addPngCompareFiles`, `removePngCompareItem`,
     `clearPngCompareItems` — added right before `const wf=getActive()`.
   - **Deliberately excluded**: drag-to-reorder. Fixed upload order only.
     This was the original's actual bug and is out of scope entirely, not
     hidden/fixed.
   - New render block (`centerView==='compare'`) between the diagram block
     and the JSON block. New CSS: `.png-compare-*` classes in `App.jsx`,
     added right after `.diagram-wrap.panning`.

### Verified so far

- Both features render live (`localhost:3001`, dev server started this
  session), zero console errors, zero failed requests.
- Compare PNG tab: empty-state message renders correctly, layout toggle
  buttons present, Clear all correctly disabled with 0 items.
- Toolbar Palette: renders in the correct toolbar position, disabled state
  looks correct with nothing selected.

### Verified end-to-end (as of this update)

- [x] Selected a real state via its table row (`Under Review`), confirmed
      the toolbar Palette enabled and showed that state's values, set its
      fill color to red via the toolbar's color input, and confirmed the
      live Mermaid diagram actually re-rendered that node red — full data
      flow confirmed working, not just UI presence.
      (Note for future browser-automation tests against this app: setting a
      `<input type=color>`'s `.value` directly and dispatching `input` does
      **not** reliably trigger React's `onChange` — use the native
      `HTMLInputElement.prototype.value` setter via
      `Object.getOwnPropertyDescriptor` first, then dispatch. Confirmed this
      is a test-script issue, not an app bug — first attempt silently no-op'd
      even though the UI looked right.)

### NOT yet verified — do this before calling it fully done

- [ ] Actually upload a real PNG through the Compare PNG tab and confirm it
      displays (only the empty state has been screenshotted so far). Lower
      priority — the upload mechanism (`<input type=file>` +
      `URL.createObjectURL`) is standard and low-risk, not novel to this
      codebase.
- [ ] Confirm the Reset button / `resetAll()` doesn't leak the
      `URL.createObjectURL` object URLs from `pngCompareItems` (minor,
      not a blocker, but worth a real fix — either revoke on reset or accept
      it as a known small leak since it's dev-session-scoped only).
- [ ] Run `npm run build` (or equivalent) once to confirm no build-time
      errors from the new JSX/state — only HMR/dev-server has been checked
      so far.

---

## Environment notes (avoid re-discovering these)

- **Four separate Vite dev servers were found running simultaneously**
  during today's investigation: ports 3000, 3001 (this session's), 3002,
  3003. At least one of these is/was Codex's. Don't assume a single
  `npm run dev` in this project — check `netstat -ano | grep LISTENING` for
  ports 3000-3003 before starting another one blind.
- **`browser-automation` skill's `--script` flag is broken on Windows** for
  absolute paths (`ERR_UNSUPPORTED_ESM_URL_SCHEME` — the tool's own
  `process.cwd() + '/' + scriptPath` concatenation mishandles Windows
  backslash paths, and Git Bash's automatic path conversion mangles a
  leading-slash workaround too). **Working pattern**, confirmed repeatedly
  this session:

  ```bash
  MSYS_NO_PATHCONV=1 node "<skill-dir>/browser.mjs" <url> --script "/C:/full/windows/path/to/script.mjs"
  ```

  (leading `/` before the drive letter, plus `MSYS_NO_PATHCONV=1` so Git
  Bash doesn't rewrite the argument before Node sees it.)
- **No persistence anywhere in Studio's data** — `useWorkflowStore.js` has
  no `persist` middleware, no localStorage. The `SERVICE_AGREEMENT` workflow
  is hardcoded source (`useWorkflowStore.js:10-47`) — it cannot be "lost" by
  a refresh, only by editing that array directly. Any workflow created via
  "+ Workflow" is genuinely gone on reload; that's by design, not a bug.
- **Compare PNG and the toolbar Palette are BOTH intentionally
  Mermaid-based**, not React Flow. The bigger open question from earlier in
  the session — whether Studio should eventually get a full React-Flow-based
  "Studio v2" canvas like BPMN's — is **still unresolved, not decided**. Do
  not build that without asking first; it directly conflicts with
  `CLAUDE.md` §1 ("React Flow... arrive with V1.5... do not introduce them
  earlier") and §2.1 ("do not refactor Studio internals"). Today's work
  deliberately stayed inside the Mermaid-based model to avoid that
  conflict — confirm this is still the right call if picking this back up.

### M-Files Flow: full Users/Properties/Business Rules panel (2026-08-15)

Per explicit request ("futher down there are users properties and business
rules please go for it do the best implemetnation ever"), M-Files Flow's
collapsible table panel (`tablePanelOpen`, toggled via the "Show/Hide
states/transitions list" canvas-toolbar button) now mirrors Studio's full
left panel with all five sections, not just States/Transitions:

- Added a local `Sec` component to `MFlowCanvas.jsx`, mirroring
  `CommandCenter.jsx`'s own (reuses `.cc-sec*` CSS directly — same
  "don't reinvent the wheel" instruction as everywhere else this session).
- Wired the panel to the store's existing **global** (not per-workflow)
  `users`/`properties`/`rules` arrays and their CRUD actions — no new store
  code was needed; `useWorkflowStore.js` already had everything.
- Five sections, each in its own `<Sec>`: States (read-only, click-to-select
  into the diagram, same as before), Transitions (read-only, same as
  before), Users (editable — Name/Role/CM checkbox/delete), Properties
  (editable — Field Name/Type dropdown/Required checkbox/delete), Business
  Rules (editable — rule text/delete). Column structures copied verbatim
  from Studio's own JSX. States/Transitions open by default; Users/
  Properties/Business Rules start collapsed.
- `App.jsx` CSS: widened `.mflow-table-panel` to 230px, dropped body padding
  so `.cc-sec` sections span edge-to-edge like they do in Studio, added an
  explicit `.mflow-clickable-row` class to the States table's `<tr>`s
  (replacing a fragile `:first-child`-based selector).

**Bug hit and fixed during this work — worth remembering for any future CSS
edit inside `App.jsx`:** `App.jsx`'s entire stylesheet lives inside one JS
template literal (`` const CSS = `...` `` at the top of the file, closing
near the bottom). A CSS *comment* was added that used literal backticks for
inline-code formatting (`` `.cc-sec*` ``, `` `.inline-mini` ``) — those
backticks prematurely closed the outer template literal, and everything
after was parsed as real JavaScript. `.cc-sec*` outside a string is `.cc -
sec*`, i.e. subtraction against an undefined `sec` — hence the exact error
seen: `ReferenceError: sec is not defined` at `App.jsx:406`. This broke the
entire app (`bodyChars: 0`, nothing mounted) until fixed by removing the
backticks from the comment text. **Never use backtick characters inside any
comment or string written into `App.jsx`'s CSS block — plain text or single
straight quotes only.**

Verified live via `browser-automation` after the fix (see
`skills.md`'s / this session's note on the `--script` Windows-path
workaround, `MSYS_NO_PATHCONV=1` + leading-slash):

- App mounts cleanly, zero console errors, zero failed requests.
- All 5 sections render with correct titles and live row counts (States 6,
  Transitions 6, Users/Properties/Business Rules 0 before testing).
- Expand/collapse confirmed working on Users (the `.cc-sec-hd` header isn't
  a `<button>`, so it doesn't show up in the accessibility-tree snapshot —
  had to dispatch a real `click` MouseEvent on `.cc-sec-hd` via
  `page.evaluate` instead of `ui.click`).
- **Cross-canvas sync confirmed**: clicking "+ Add" on Users in M-Files
  Flow's panel took the row count from 0→1 in *both* M-Files Flow's own
  panel and Studio's — same global Zustand array, no duplication, no drift.
- Filling the new user's Name field via direct DOM `.value` + dispatched
  `input`/`change` events did **not** persist into Studio (React's
  controlled-input value tracker ignores a native property set unless you
  go through the native setter first) — this is the same
  "isolated-world"/direct-DOM-write test-tooling limitation already logged
  earlier in this file, not an app bug. Row-level add/remove and count sync
  are the parts that matter and both are confirmed; per-field text editing
  wasn't independently re-verified this pass beyond that known tooling
  caveat.
- No cleanup needed after testing — confirmed (again) `useWorkflowStore.js`
  has no `persist` middleware, so the test user row was gone on next reload.

**Correction to the direct-DOM-write test-tooling limitation logged just above:**
it IS fixable, and the fix was used successfully later this same session (see
the diamond-badge entry below) — go through React's native property setter
before dispatching the `input` event, instead of setting `.value` directly:

```js
const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
setter.call(inputEl, 'new value');
inputEl.dispatchEvent(new Event('input', { bubbles: true }));
```

Plain `inputEl.value = 'x'; inputEl.dispatchEvent(...)` gets silently ignored
by React's controlled-input value tracker; going through the native setter
first bypasses that tracker correctly. Confirmed working end-to-end (typed
"Closed"/"Under Review" into Studio's Transitions table via this method,
values persisted into the store and were read back correctly). Use this
pattern for any future test that needs to fill a React-controlled input via
`page.evaluate` instead of `ui.fill`.

### M-Files Flow: branching-state diamond badge in the States table (2026-08-15)

Per explicit request — the user pointed at `GUI_HANDOFF_2026-08-13.md` (BPMN
Standard's gateway-diamond work) and asked for "a logical diamond icon,"
clarified via AskUserQuestion into a specific, scoped task: a live badge on
the States table (not a placeable palette object — that idea was explicitly
rejected again, the "diamonds stay an auto-render rule, never a separate
object type" boundary from earlier this session holds).

**What was built**, all in `MFlowCanvas.jsx`'s States section (~line 813) and
`App.jsx`'s CSS:

- A small `Diamond` icon (lucide-react) badge appears next to a state's name
  in the States table whenever that state has 2+ outgoing transitions in the
  live data — the exact same "2+ outgoing" rule this canvas already uses to
  auto-render the diamond shape on the diagram itself (see the file's own
  header comment on that simplification).
- Hover text is a genuine live calculation of that state's own inbound
  transition count, not a static example, matching
  `MfilesProperties.md` §3.5 **Decision 3** exactly (the dividing line is the
  diamond's own inbound-edge count):
  - Exactly 1 inbound → *"Single inbound → this diamond will collapse. Its
    branches become direct transitions of this state — no new state is
    created."*
  - 0 or 2+ inbound → *"Multiple inbound → this diamond will promote to a
    real, separate state in the final workflow."* (0-inbound folded into the
    "promote" bucket on purpose — collapsing requires a single real
    predecessor to reattach branches to, and there isn't one; Decision 3's
    text only names the 1-vs-many cases explicitly, this is the correct
    extension of its own stated reasoning, not a documented third case.)
- Badge color (`#7c8cff`) reuses the exact literal already used as this
  canvas's gateway-diamond fallback fill/stroke (`gatewayStyleFor`'s
  'decision' output) — same value, not a new arbitrary color.
- Tooltip mechanism: native `title=""`, matching the convention already used
  throughout this file (zoom/lock/fit buttons, Studio's own "Cosmetic
  style…" button) — no new tooltip component introduced.

**One factual correction to the task brief, caught by checking the real data
before assuming (per this project's own standing discipline):** the brief
referenced "Service Agreement's 12 states." The actual current seed workflow
is **`Document Approval`, 6 states** (`Draft/Submitted/Under Review/Approved/
Rejected/Closed`) — `SERVICE_AGREEMENT` was replaced by `DOCUMENT_APPROVAL`
earlier in this project's history (`useWorkflowStore.js:15-17`). Verified
against this real, current data instead.

**Verified live, both directions:**

- Real data: only `Under Review` (→Approved, →Rejected) is a genuine
  branching state; it correctly (and exclusively) got the badge, with 1
  inbound (from `Submitted`) → correct "will collapse" text. The other 5
  states correctly got no badge.
- **Live reactivity confirmed cross-canvas**: added a second inbound
  transition to `Under Review` (`Closed → Under Review`) via Studio's own
  editable Transitions table (same shared `useWorkflowStore`), then switched
  back to M-Files Flow — the badge's tooltip text switched live from
  "will collapse" to "will promote," with zero code changes needed to make
  that happen (it's a pure derived calculation off the same store both
  canvases read).
- Note for future tests: switching away from and back to M-Files Flow
  **remounts** `MFlowCanvas.jsx`, resetting its local `tablePanelOpen` state
  — the table panel has to be re-opened after returning, this is not a bug.
- Zero console errors, zero failed requests, across every step.
- Confirmed zero changes touched BPMN Standard/`useBpmnStore.js`/anything
  under Process Docs — this work was entirely inside `MFlowCanvas.jsx` and
  `App.jsx`'s CSS.

### M-Files Flow: live "Layers" list in the palette, click-to-select + pan (2026-08-16)

Per explicit request — a Figma-style Layers panel inside `MFlowPalette.jsx`,
listing the active workflow's real, live states, click-to-select/highlight
the matching canvas node, with auto-pan/center if it's off-screen. Confirmed
decision going in: Studio and M-Files Flow both stay, as parallel UIs over
the same `useWorkflowStore` — no consolidation.

**Checked Studio's own established pattern first, per the task's own
instruction, before building anything:** `CommandCenter.jsx`'s States table
row click only calls `setSel(s.name)`, which drives `highlightNode()` — a
pure visual highlight (blue stroke + drop-shadow glow), confirmed via direct
source read. **No pan/center-on-node behavior exists anywhere in Studio.**
So there was no established pan pattern to match — the highlight half reuses
Studio's exact visual language (same stroke color/width/glow), the pan half
is new, scoped to what this task explicitly asked for.

**What was built:**

- `MFlowCanvas.jsx`: `statesWithMeta` (states + the same `isDiamond`/
  `diamondTitle` computation as the table badge, duplicated rather than
  refactored — task said keep this scoped, don't touch the working table
  code) and `panToState(name)`, which (1) sets the same `selected` Set the
  table panel and diagram-click already share — so highlighting stays in
  sync everywhere, not a second selection mechanism — and (2) finds the
  target node by label text (same DOM lookup the selection-highlight effect
  already uses), computes the real screen-space delta between the node's
  center and the diagram container's center via `getBoundingClientRect()`,
  and adds that delta to `panRef.current` before reapplying the transform —
  same imperative pan mechanism the existing drag-to-pan code already uses,
  no new state or library.
- `MFlowPalette.jsx`: new "Layers" group (only rendered when there's at
  least one state), positioned right after the States tool-tiles group. Each row: color
  dot (`state.color`), name, an Initial flag (●) if applicable, and the same
  Diamond badge/tooltip as the table when the state is genuinely branching.
  Row chrome intentionally mirrors `.mflow-pal-tile`'s existing look rather
  than inventing new visual language.

**Verified live, with real numbers, not just pass/fail:**

- Layers list on the real current data (`Document Approval`): `Draft`
  correctly flagged Initial, `Under Review` correctly flagged with the
  diamond badge and the exact same "Single inbound → will collapse..."
  tooltip text as the table's badge — same underlying rule, independently
  computed, same result.
- **Click-to-select + pan, precise before/after measurement**: on the
  natural (unpanned) layout, `Closed` started **140.5px** from the diagram
  container's true center. After clicking its Layers row: distance
  **0.00003px** (effectively exact), the node picked up
  `stroke: rgb(74, 159, 255)` (the same highlight color Studio uses), the
  transform updated to a real computed value
  (`translate3d(59.11px, -127.49px, 0)`), and the status line updated to
  "State — Closed".
- **Cross-canvas store sync, both directions already covered by earlier
  work; re-confirmed here for the new list specifically**: added a state
  named `CrossSyncTestState` via Studio's own editable table, switched to
  M-Files Flow — the new Layers list picked it up live, 7th row, no reload
  needed. Same shared `useWorkflowStore`, no duplication.
- Table-panel badge (the separately-scoped prior task) re-checked after
  these changes: identical result on a fresh load (`Under Review` badged,
  the other 5 states not) — unaffected.
- Zero console errors, zero failed requests, across every step of every
  test this task ran.
- `CommandCenter.jsx` (Studio) received zero `Edit`/`Write` calls this task
  — confirmed via `git status`, the file's pre-existing modified state
  predates this task entirely.

### Diamond principle formalized across project docs — addendum, not a new decision (2026-08-16)

Two investigation-only tasks preceded this one and are the reason it exists:
first, confirming Studio's data model has no structural collapse-vs-promote
distinction to hang a disabled right-click on (every branching state is
equally real regardless of inbound count — `deleteState`'s only guard is
"used in any transition," not inbound-specific; `inbound`/`isDiamond` are
computed fresh for display only, never gate any action, confirmed via grep
across `useWorkflowStore.js`/`CommandCenter.jsx`/`MFlowCanvas.jsx`). Second,
this task: formalize the actual diamond principle — outgoing-count-only
trigger, never incoming; never a diamond in real M-Files-style output,
either system — across every doc that should state it, checking real
current state first per this session's standing discipline throughout.

**Where it landed, and why:**

- **`MfilesProperties.md`** — new "Clarifying note (addendum to Decisions 3
  and 5), 2026-08-16," inserted directly after Decision 5's own paragraph
  block, before Decision 6. Checked the real decision count first
  (`grep -n "^\*\*Decision [0-9]" MfilesProperties.md` → exactly 8, Decision
  1 through 8, no assumption) before deciding addendum vs. new Decision 9.
  Chose addendum: every part of the principle is a direct logical
  consequence already implied by Decision 3's own opening premise ("M-Files
  has no equivalent diamond/decision-node object") and Decision 5's own
  outgoing-count-only trigger — nothing new was actually decided.
- **`TranslationPlanRenderer.html`** — 4th item added to the existing
  gap-note list (`renderGapNote()`), following its established pattern
  exactly. Verified the underlying claim directly against real code first,
  not assumed from the task brief: `renderMFilesDiagram`'s state-drawing
  loop (~line 917) calls `el('rect', ...)` unconditionally for every state;
  a promoted state (`WasCollapsedChoicePromotedToState`) only gets an added
  caption text, never a different shape — confirmed by reading the actual
  function, not by trusting the claim. **Incidental fix, directly adjacent
  to what was being edited, not scope creep:** the section's own heading and
  intro text said "two gaps" while the list already had three `<li>` items
  before this task added a fourth — a pre-existing count/text mismatch that
  this task's own edit would have made more wrong if left alone. Reworded
  both to not name a specific count, avoiding the same drift recurring.
  Verified live via `file://` load: zero console errors, gap-target list
  confirmed to have exactly 4 `<li>` elements via direct DOM query.
- **`progress.md`** — new dated entry, `## Diamond principle formalized —
  addendum to Decisions 3 and 5, not a new decision (2026-08-16)`, inserted
  right after the last existing dated entry ("Handoff continuity note,
  2026-08-14") and before the fixed-report "Executive Summary" section —
  matching the exact boundary already established between this file's
  chronological log and its static dashboard content.
- **`skills.md`** — new dated "Skill:" entry (matching the exact voice/
  structure of the file's existing "first real implementation is itself a
  validation step" entry, 2026-08-11) capturing the reusable meta-lesson:
  check real current state before treating something as a recurring open
  question — it might already be correctly decided and just never written
  down that way. Inserted after the last dated Skill entry, before the
  fixed "Recommended Learning Path" reference section. `Last Updated` header
  at the top of the file bumped 2026-08-14 → 2026-08-16 to match.
- **`V1_DEVELOPMENT_ROADMAP.md`** — checked for a genuinely relevant open
  item rather than forcing a fit anywhere; found one real match, the
  not-yet-built "Interactive click-to-edit popup UI" row (the collapse/
  promote hover-preview sub-deliverable, spec'd 2026-08-12, still `⬜ Not
  started`). Added a short annotation to that exact row so whoever builds it
  later doesn't have to rediscover from `TranslationPlanRenderer.html`'s
  source that both preview outcomes render as plain rectangles, never
  diamonds. Did not touch the already-`✅ Done` gateway-diamond sub-milestone
  table above it — that's a different mechanism (Studio's `transition.group`
  gateway grouping), not what this principle is about.
- **`CLAUDE.md`** — checked first per the task's own instruction, and it
  does not itself contain the Decision 1-8 list (confirmed via grep — only
  reference found is "MfilesProperties.md's Decision 8," a citation, not the
  definition). The task's "CLAUDE.md" instruction is read as pointing at
  wherever the Decision list actually lives, which is `MfilesProperties.md`
  §3.5 — landed there instead of forcing an edit into `CLAUDE.md` itself.

### M-Files Flow: right-click diamond info on branching states — informational/navigation only (2026-08-16)

Checked first, per the user's own "if this duplicate let me know otherwise
go ahead" — grepped `MFlowCanvas.jsx` for any existing diamond content in
the context-menu code before starting; found `isDiamond`/`diamondTitle`
only in the table badge and Layers-list computations, nothing in
`contextMenu`/`handleEditSelected` etc. Not a duplicate — proceeded.

**Checked BPMN's own node context menu first**, per the task's instruction,
for the established convention on content that doesn't apply to a given
node: BPMN uses conditional omission (the "Detach" button only renders
`{selectedNode?.parentId && (...)}`), distinct from `disabled` (used for
Undo/Redo, which apply but aren't currently actionable). A non-branching
state's diamond info is the "doesn't apply" case, not the "applies but
can't act" case — matched the Detach precedent: **omit entirely**, never
show disabled.

**What was built**, single-selection right-click only (`contextMenuNames
.length === 1`), inserted at the top of the existing node-menu JSX in
`MFlowCanvas.jsx`, before Edit/Duplicate:

- Looks up the target state's `isDiamond`/`diamondTitle` from
  `statesWithMeta` — **reused, not recomputed a third time**, per the
  task's explicit instruction.
- If diamond: a "Diamond (auto-detected)" label, the exact same live
  collapse/promote sentence already in the badge tooltip (verbatim,
  same string), a "Branches" label, then one button per real outgoing
  transition (`→ Approved`, `→ Rejected`, etc.).
- Each branch button calls `panToState(t.to)` — **the exact same
  select-and-center function already built for the Layers palette**, not
  a new mechanism — then closes the menu, matching every other action's
  own `setContextMenu(null)` convention in this file.
- **Deliberately did not add a "Jump to canvas" action for the
  right-clicked state itself** — right-clicking a node means it's already
  on-screen and already the thing selected, so a self-referential jump
  button would be inert. The per-branch jump buttons are the genuinely
  useful version of that idea (the branch target may well be off-screen),
  so that's what got built instead of both.
- **Zero creation.** No "Add"/"Create"/"Place"/"Insert" anything anywhere
  in this block — confirmed by construction (every line either reads
  existing `wf.transitions`/`statesWithMeta` or calls the pre-existing
  `panToState`), and confirmed by the structural test below.
- New CSS: `.mflow-menu-diamond-info` (wrapped body text, `App.jsx`) — the
  one genuinely new class needed, since nothing in the existing menu chrome
  supported multi-line text before (`.bpmn-context-menu-label` is a
  single-line header convention, reused as-is for the two label rows).

**Verified live, with real evidence:**

- Right-clicked `Under Review` (the real branching state, 2 outgoing at
  the time): menu correctly showed "Diamond (auto-detected)", the exact
  string `"Single inbound → this diamond will collapse. Its branches
  become direct transitions of this state — no new state is created."`,
  and two real branch buttons, `→ Approved`/`→ Rejected`.
- Right-clicked `Draft` (1 outgoing, non-branching): confirmed **zero**
  diamond-related content — no label, no info text, no Branches section.
- Clicked `→ Approved`: distance from canvas center went **75.2px →
  0.00003px**, correct highlight stroke (`rgb(74, 159, 255)`), status line
  updated to "State — Approved", menu closed. Same numbers-based proof
  pattern as the Layers-palette task.
- **The structural test the task asked for**: deleted `Under Review →
  Rejected` via Studio's own table (dropping Under Review to 1 outgoing).
  Confirmed **both** the table badge and the right-click diamond content
  disappeared together on the very next render — no diamond can exist or
  persist independent of real transition data backing it.
- Existing hover tooltip and Layers-palette click-to-select-and-center
  re-confirmed unaffected (same underlying functions, untouched).
- Process Docs (BPMN Standard) loads clean, zero console errors — no file
  under that canvas received any edit this task.
- Zero console errors, zero failed requests, across every step.

### Backfill — end-to-end multi-diamond verification pass (2026-08-16, reported in chat only, not logged here at the time)

Built a real 10-state/12-transition scenario via Studio's table (two independent diamonds — `Triage`, exactly-2-outgoing/promote-shaped; `Split`, 3-outgoing/collapse-shaped — plus two convergence points, `Merge` and `Done`, both correctly rendering as ordinary `rect` states, never diamonds). Confirmed badge/Layers/right-click/canvas-shape all agree word-for-word across every state, and confirmed full isolation: deleting `Triage → PathB` (dropping Triage below 2 outgoing) removed Triage's badge/Layers entry/right-click content/diamond shape together, while `Split` was completely unaffected on all four dimensions. One rough edge found and flagged, not fixed: `MfilesProperties.md`'s Decisions 3/5 addendum's phrase "Studio's own model" is ambiguously worded — read one way it could seem to contradict the live canvas (which correctly *does* render diamonds, that being the authoring-side point of the whole feature); the addendum's actual claim is about M-Files-style *output*, not the canvas. Left as-is pending a future wording pass, per "flag drift, don't silently reconcile."

### M-Files Flow scoped to automatic-only; real schema gap found in `conditions`/`permissions` (2026-08-16)

Two-part task: file a scope decision, then investigate the store's transition schema against the real, empirically-confirmed grammar (not the abstract spec).

**Decision filed** as an addendum to Decision 7 in `MfilesProperties.md` (not a new decision, per explicit instruction) — M-Files Flow's authoring UI only generates automatic transitions; manual/`role()`/`+esign`/permissions/properties/Action-script-bodies stay out of scope, authored in M-Files Admin. Worded carefully to distinguish this from Decision 7's own boundary (the Translator's *output* format already includes permissions/esign) — this is narrower, about what this specific *UI* generates, not a restriction on the grammar itself. **Caught and fixed a real dating mistake before it could propagate**: first draft used "2026-08-17" with no actual evidence the date had advanced past the last confirmed 2026-08-16 — corrected before writing progress.md/here.

**Investigation, real findings:** grepped `useWorkflowStore.js` fully — every `conditions`/`permissions` field defaults to `null`, and the only place either is ever populated is `CommandCenter.jsx`'s `parseNLP()`, reading raw markdown-table cells verbatim with zero grammar parsing. **More significant than expected**: checked `useMermaid.js` (shared by both canvases) — zero references to either field, meaning they never reach the live diagram as an edge label at all. Studio's own manual Transitions table only exposes From/To/Group for editing — no UI field for conditions/permissions exists anywhere. M-Files Flow's own Transitions section is entirely read-only, so it doesn't even have this much. Net finding: these fields are functionally dead data — reachable only via NLP free-text import, passed through opaquely on export/vault-push, never structured, never validated against `after(Nd)`/`if(Property=Value)`/`script(Name)`/`+priority(N)`, never rendered. No manual/`role()`-specific field exists to flag as newly out-of-scope, because no such structured field exists at all — reported honestly rather than forcing a "flag it" answer where there was nothing to flag.

No COM work, no live vault connection — code/schema read only, per the task's explicit scope.

### M-Files Flow: automatic-transition grammar authoring built (2026-08-16)

Closes the dead-data gap from the investigation above, for the in-scope half only (automatic transitions — `after(Nd)`/`if(Property=Value)`/`script(Name)`/`+priority(N)`; `role()`/permissions/esign explicitly excluded per the Decision 7 addendum).

**New file**: `src/utils/transitionGrammar.js` — a disconnected JS mirror of `EdgeResolver.cs`'s automatic-only subset (`parseCondition`/`describeCondition`/`isRenderable`). No import/call/bridge to `ProvisioningAI.Workflow/Translation/` anywhere — confirmed, "Studio-only for now, connect later" stands.

**Wired in**: `useMermaid.js` (shared by both canvases) now emits a real Mermaid edge label for a genuinely parsed condition — `transKey`'s memo dependency extended to include `t.conditions`, or edits wouldn't trigger a re-render. Studio's Transitions table (`CommandCenter.jsx`) got a real "Condition" input column with live parsing and a `TriangleAlert`/`--gold` warning flag for unparsed text (the app's real existing warning token, not a new color). M-Files Flow's Transitions section stays read-only (confirmed deliberate, see below) but now also shows the condition text, live via the shared store.

**Mid-task correction handled correctly, worth recording precisely (user's own framing, confirmed accurate):** the user interrupted with a "Step 0" amendment asking me to check for reusable logic before building — investigated two things:

1. Studio's own code for hidden grammar-handling logic — found none; a pre-existing comment on `applyEdgeFlowAnimation` independently confirms "Studio's transition schema... has never carried TriggerMode," matching the earlier investigation.
2. Whether `TranslationPlanRenderer.html`'s `renderMFilesDiagram` label logic (collision-nudging, skeleton styling, approximate background-rect sizing) should be reused for M-Files Flow's diagram. **Read the actual code closely enough to see why it exists before deciding whether it transfers** (per the user's own framing of why this was the right call) — that logic exists specifically because it has no layout engine under it (hand-computed SVG positions, no dagre). Mermaid.js already does real layout, already sizes label backgrounds from actual rendered `getBBox()`, already spaces labels natively. Declined the port — reusing it would replace something Mermaid already does correctly with a cruder approximation.

Also caught, in the same exchange: the original task's own phrasing ("adapted to React Flow's rendering model") was a real mistake on the user's part, confirmed by them — M-Files Flow renders via Mermaid.js; `@xyflow/react` is BPMN Standard's engine, a deliberately separate, isolated canvas. Flagged rather than silently built toward the wrong canvas. No scope change resulted.

**One design point confirmed, by the user, as better than what the original task itself described:** unparsed input never reaches the diagram in any form, not even flagged/skeleton-styled — it stays entirely in the editing table. Only genuinely parsed grammar becomes a Mermaid label at all. Stricter and more correct than "flag it visually on the diagram," which is what the original task phrasing implied.

**Verified live, real evidence, both directions** (also caught and fixed a real test-script bug along the way, not an app bug — `.diagram-wrap svg` matched the palette's tiny lucide icon SVG before the real `svg.statediagram`, since Studio's palette overlay sits inside `.diagram-wrap`; M-Files Flow's `.mflow-diagram` has no such ambiguity):

- `after(3d)` on `Draft → Submitted`: no flag, real edge label on **both** Studio's own diagram and M-Files Flow's (same shared hook), inherited live into M-Files Flow's read-only table.
- `"when it gets overdue"` on `Submitted → Under Review`: `TriangleAlert` flag with the correct explanatory tooltip, confirmed **absent** from both diagrams' rendered SVG.
- Diamond badge on `Under Review` re-checked, unaffected. Zero console errors across every run. No file under BPMN Standard touched.

### M-Files Flow: Hub badge — incoming-count mirror of the diamond badge (2026-08-16)

Per explicit task: an independent auto-detect badge for 2+ incoming transitions, same mechanism as the diamond badge (which is outgoing-only), fully orthogonal — neither/either/both, cited against real Conformity's "Control Invoices" state being both at once.

**Built** in the exact three places the diamond badge already lives — confirmed via grep this is `MFlowCanvas.jsx`'s `statesWithMeta`/table-panel States section and `MFlowPalette.jsx`'s Layers list, never real Studio (`CommandCenter.jsx` has no diamond badge at all, zero matches) — user's own mid-task reminder ("we are building for M-Files Flow") is what settled the brief's ambiguous "Studio's table" wording, since a literal Studio table badge would have been new scope, not parity:

- `statesWithMeta` extended with `isHub`/`hubTitle` alongside the existing `isDiamond`/`diamondTitle`, same `>=2` threshold, opposite direction (`t.to === s.name` instead of `t.from`). `hubTitle` is real data: `"{n} incoming from: {source names}"`, not a generic string.
- Table panel's own independently-computed inline block (separate from `statesWithMeta`, matching how the diamond badge was already duplicated there) got the same `isHub`/`hubTitle` calculation and a `GitMerge` badge next to the existing `Diamond` one.
- `MFlowPalette.jsx`'s Layers row got a matching `GitMerge` badge.
- Right-click menu got a second block mirroring the diamond block's exact shape (reused `statesWithMeta`, not recomputed; omitted when not applicable, same as the diamond's BPMN-Detach-precedent convention; source buttons reuse `panToState`, walking `t.from` instead of `t.to`) — renders independently below the diamond block when both apply.
- New CSS: `.mflow-hub-badge`/`.mflow-pal-layer-hub`, `var(--green)` (distinct from diamond's `#7c8cff`). `GitMerge` imported from lucide-react in both files.

**Verified live via `browser-automation`** (script-driven: switch to Studio, add/delete a real transition via the Transitions table's native-setter-and-dispatch pattern already established earlier this session, switch back to M-Files Flow, re-open the table panel + palette — both reset on every section-switch remount, confirmed already-known behavior, not a new bug):

- Baseline (`Under Review`, seed data: 2 out/1 in) — diamond only, no hub, table panel + Layers palette both agree. `Draft` — neither (negative control).
- Added `Approved → Under Review` (now 2 out/2 in) — **both badges present together**, table panel, Layers palette, and right-click menu (`Diamond (auto-detected)` + `Branches → Approved/→ Rejected` stacked with `Hub (auto-detected)` + `Sources ← Submitted/← Approved`) — confirmed via exact DOM/menu-text capture, not screenshot-only. Screenshot also taken, confirms clean side-by-side rendering, no overlap.
- Deleted `Under Review → Rejected` (now 1 out/2 in) — **diamond badge/menu-block disappeared, hub badge/menu-block stayed, independently**, re-confirmed in all three surfaces plus a second screenshot. Canvas shape check: dual-signal state had a real `<polygon>` (pre-existing diamond mechanism, outgoing-driven only); after the drop, `<polygon>` gone, plain `<rect>` remained, hub badge still showing in the panels — hub confirmed never touching canvas node geometry.
- `git diff --stat` after the edits: only `MFlowCanvas.jsx`, `MFlowPalette.jsx`, `App.jsx` (CSS) — confirms zero touch to `useMermaid.js`, `transitionGrammar.js`, or `CommandCenter.jsx`. Process Docs (BPMN Standard) loaded clean on the same run. Zero console errors, zero failed requests, across every script run.

### M-Files Flow: canvas visible immediately on new workflow, not gated behind Initial state (2026-08-16)

Reported bug: `+ Workflow` creates a new workflow but the canvas stays hidden; only clicking the "Initial State" palette tile specifically revealed it — plain "State"/"End State" did nothing visible.

**Investigated first, per the task's own instruction, before changing anything.** Read `useMermaid.js` (shared by Studio and M-Files Flow) and found the actual gate is not `states.length > 0` — it's `states.some(s => s.initial)`. `MFlowCanvas.jsx`'s JSX then fully unmounted the diagram div and swapped in the `.blueprint-empty`/"No Diagram Available" placeholder whenever no state was flagged Initial, regardless of how many other states existed. This exactly matches the report: only the Initial State tile ever set `initial: true`, so it was the only thing that ever flipped the gate.

**Scoped the fix to not touch Studio at all**, since the hook is genuinely shared — confirmed via a live test rather than assuming: `useMermaid.js` gained an optional `{ requireInitial }` param, defaulting to `true` (Studio's own call site is unchanged, byte-for-byte, still requires an Initial state). `MFlowCanvas.jsx` is the only caller passing `{ requireInitial: false }`.

**JSX restructured** so the diagram div (dotted-grid background — the actual "canvas" look) is mounted the moment a workflow is selected, not swapped out for a placeholder: new `.mflow-diagram-wrap` (`position:relative`) wraps the always-present `.mflow-diagram`, with a new non-blocking (`pointer-events:none`) `.mflow-diagram-empty` overlay shown only when `!mermaidStr` (true zero-states case). Overlay text adapted per the task's own suggestion, reusing the existing "No Diagram Available" title/style classes rather than inventing new copy: "Add a state from the palette to begin." The pre-existing "no workflow selected at all" case (`!wf`) keeps the original full-block treatment — untouched, unrelated to this bug.

**Verified live** (`browser-automation`, fresh `+ Workflow` creation, all in one run):

- New empty workflow: canvas div mounted immediately, overlay shown with the adapted text, **not** the old full blueprint block.
- Clicked plain "State" tile (not Initial) on the empty canvas — a real node appeared immediately, overlay gone. No hidden-reveal step.
- Second fresh workflow, clicked "Initial State" specifically — still works too (that icon wasn't broken, just no longer the *only* thing that worked).
- Existing seeded workflow (`Document Approval`, 6 states + Draft marked Initial) — loads exactly as before, 7 rendered nodes (6 states + the `[*]` start marker), no overlay, no full blueprint.
- **Studio confirmed genuinely untouched**: switched to Studio, selected the same plain-State-only workflow created above (states exist, none Initial) — Studio's own `.blueprint-empty` still shows, with its **original, unchanged** text ("Add at least one state and mark it as \"Initial\"..."), proving the shared hook's default behavior is byte-identical for Studio's call site.
- Diamond/hub badges (table panel + Layers palette), right-click menu's "Diamond (auto-detected)" block, and Process Docs (BPMN Standard) all re-checked afterward on the existing `Document Approval` workflow — unaffected.
- Zero console errors, zero failed requests, across every script run.

### M-Files Flow: drag-to-connect built, then a real bug it surfaced (the [*] start-marker) found and fixed — both real-Playwright-verified (2026-08-16)

**Drag-to-connect (genuine new feature, not a bug fix)** — this canvas had no way to draw a transition except Studio's table; Mermaid gives no native connection-handle/drag the way `@xyflow/react` gives BPMN Standard for free, so this is real custom interaction-layer code, built and verified with actual `page.mouse.move/down/up` sequences, not `dispatchEvent`, per explicit instruction.

- `useWorkflowStore.js`: `addTransition(wfId, patch = {})` — optional patch, same precedent `addState` already established. Studio's zero-arg call untouched.
- `MFlowCanvas.jsx`: a small SVG `<circle>` handle, child of each node's own `<g>` (so it travels for free on node-reposition), hidden until real CSS `:hover` (confirmed via computed `opacity` reading "0"→"1" under an actual `page.mouse.move`, not inferred). Mousedown on it starts a drag: a dashed line tracks the cursor (screen→SVG via `getScreenCTM`, same technique already used elsewhere in this file), `document.elementFromPoint` hit-tests the real node under the cursor each move with a live green-stroke highlight on the candidate target. Mouseup over a valid, different state creates a real transition (`takeSnapshot()` + `addTransition(activeId, {from, to})`); mouseup anywhere else cleans up only — confirmed live, canceling over empty canvas creates zero rows.
- Checked BPMN's "magic connector" CSS first per instruction — it's React Flow's own `Handle`/`onConnect`, nothing importable for a Mermaid canvas; only the visual language (small dot, hidden until hover, accent color) carried over. Reused this canvas's own existing `--a3` accent rather than a new color.
- **Verified with real Playwright mouse events, both the branching (diamond) and converging (hub) cases**, each independently read back through Studio's own table (a separate code path from the canvas that created them) and confirmed in the right-click menu, Layers palette, and table panel: dragging two edges from one source produced the exact diamond menu/badges already proven for table-created transitions; dragging two edges from separate sources into one target produced the exact hub menu ("2 incoming from: ...", real source names) and badges, identically. Canvas shape confirmed unaffected by hub either way (plain rect stays a rect). BPMN Standard and Studio's own table-based path re-confirmed unaffected on every pass.

**Bug found while using the feature — the [*] Initial-state entry marker doesn't follow its state on drag ("detach, can't reattach").** Investigated live before touching anything, per instruction:

- Reproduced with a real `page.mouse` drag on the Initial state's own node: screenshots (before/after) show the ● circle and its arrow frozen exactly at the original spot while the state box visibly moves away — not misoriented, a pure position-tracking failure. DOM-level confirmation: the marker edge's path `d` attribute and the circle's `transform` were byte-identical before and after the drag.
- Confirmed drag-to-connect itself is **unaffected**, both directions (dragged a real edge out of the Initial state and a real edge into it, both landed correctly) — the "detach" symptom is specific to node-reposition, not the new connect feature.
- Root mechanism, found by reading `MFlowCanvas.jsx`'s own node-centers-building loop: the `[*]` pseudostate node has an empty label, and the loop's `if (!lbl) return;` guard excluded it from `nodeCenters` entirely. Since `nearest(x,y)` (used to resolve every edge's real fromId/toId) only searches `nodeCenters`, the `[*]-->state` edge's own fromId fell through to the *next*-closest real node — on a single-state workflow, the Initial state itself — making `fromId===toId`, which the very next line's guard silently drops from `edgeList`. Never in `edgeList` means never redrawn, on a live drag or on any fresh render, which is why it never reattaches either — same broken resolution happens again every time.
- **Fix matches the direction confirmed before building it**: gave the `[*]` node a synthetic id (`__mflow_marker_N__`) so it gets a real `nodeCenters` entry — invisible to every real-state lookup (`wf.states.forEach` only ever looks up `sanitizeStateId(name)`) but now a genuine candidate for `nearest()`/`redrawEdge`, the exact same mechanism every real transition already uses correctly. Also fixed the marker's own connection-point size while in there: its shape is a bare `<circle>`, not a rect/polygon, so the old code's `rectOrPoly?.getBBox?.() ?? {width:80,height:30}` fallback would have sized it like a full state box the moment it started being tracked — added a `<circle>`-specific bbox fallback so the edge starts right at the dot, not 40px off it.
- **Re-verified with the exact same real-Playwright reproduction script, before vs. after**: the marker edge's path now completely recomputes to the node's real post-drag position (`...L 296.7 222`, matching the actual drop point) instead of staying frozen; screenshot confirms the line now visibly reaches the moved box. Full regression re-run: diamond-via-drag, right-click menu, Studio's table (both reading and its own add-path), BPMN Standard — all unaffected. Zero console errors across every script run this session.

### Session stopped for the day (2026-08-16) — resume codeword is "word" (case-insensitive)

**⚠ "word" is still ambiguous across THREE candidate threads — this has not changed, only this thread's own content has moved forward a lot since the note below was first written.** Originally flagged in `BPMN_PROCESS_DOC.md` §10 (Conformity vs. BPMN collision), then extended here when M-Files Flow became a third candidate with no codeword of its own. The operator has now explicitly confirmed **"word"** as tomorrow's resume codeword — but per the standing rule, still check actual request/context before assuming which of the three is meant: Conformity/M-Files vault investigation, BPMN Standard/Process Docs polish queue, or this M-Files Flow thread. If it's this thread, resume from this entry.

**Where M-Files Flow actually stands right now — everything below is built, real-Playwright/browser-automation-verified, and logged in both `recover.md` (this file, entries above) and `progress.md`. Nothing is mid-edit, nothing is known-broken, dev server was last confirmed live on port 3004, zero console errors on every verification pass today:**

1. Diamond badge (outgoing-count auto-detect) — table panel, Layers palette, right-click menu.
2. Hub badge (incoming-count auto-detect, fully independent of diamond) — same three surfaces.
3. Automatic-transition grammar authoring (`after()`/`if()`/`script()`/`+priority()`).
4. New-workflow canvas-visibility fix — canvas now renders immediately on `+ Workflow`/any real state, not gated behind marking one Initial (Studio's own stricter behavior deliberately left untouched).
5. **Drag-to-connect** — this canvas's first native way to draw a transition without Studio's table. Hover-revealed handle, live drag-line with target highlight, real transition on drop. Verified for both the diamond (branching) and hub (converging) cases with genuine `page.mouse.move/down/up` sequences, not synthetic events — explicit hard requirement, satisfied.
6. **Initial-state `[*]` marker fix** — found by using drag-to-connect (unrelated to it functionally, just surfaced during the same investigation pass): the entry marker didn't follow its state on a node-reposition drag. Root-caused to the marker's label-less node being excluded from the canvas's own position-tracking map, corrupting nearest-neighbor resolution for its own edge. Fixed by folding it into the same tracking mechanism real states already use. Re-verified with the identical reproduction, before/after.

Last real commit of the day: `85949b9` (drag-to-connect + marker fix, pushed to `main`). Everything through item 6 above is committed and pushed — nothing left uncommitted from today's work.

**Other threads mentioned as queued (BPMN Standard's own list, directly below this entry) — untouched today, still exactly as queued.**

**No open loose ends specific to M-Files Flow's own thread** — the one documentation imprecision flagged earlier (`MfilesProperties.md`'s "Studio's own model" wording in the diamond addendum) is still deliberately left as a flag, not a fix, pending the operator's own call on rewording; low priority, not blocking anything.

**Concrete next step, if picked up tomorrow, not yet decided:** no specific task is queued for M-Files Flow — everything asked for today is closed out clean. Most likely next moves, not yet chosen: more canvas polish (zoom/pan around drag-to-connect, e.g. does the handle still work correctly mid-pan/mid-zoom — not tested today), or a different thread entirely. Ask rather than assume.

---

## Other threads mentioned as queued (not started this session)

Per the user's own status summary mid-session — still outstanding, unrelated
to the above:

- Edge-bend dragging for BPMN Standard (Process Docs) — Pro example check,
  picker/toolbar interaction, implementation.
- Edge toolbar path hit-testing fix — `bp-e3`/`bp-e4` inconsistent vs.
  `bp-e1`/`bp-e5`. A task for this exists verbatim in `App.jsx`'s local
  history (`RSs8.jsx`, Aug 14 4:15 PM) — diagnose root cause before
  widening hit-areas blindly, per that task's own instruction.
- Gateway + duplicate fix — click-to-duplicate, not drag.
- Full reconciliation against `BPMN_PROCESS_DOC.md` and real current code —
  Stage 4's superseded status, the resume-codeword collision (**"word"** is
  ambiguous between this BPMN thread and an unrelated Conformity/M-Files
  investigation thread in memory — check context before assuming which one
  someone means), and re-confirming the still-open items in
  `BPMN_PROCESS_DOC.md` §9 (gateway parity, edge-insert/comments, command
  palette) actually match reality.

**Resume codeword for the BPMN/Process Docs thread specifically: "BNMP"**
(check `BPMN_PROCESS_DOC.md` §10 first, per that file's own instruction).
