# M-Files Flow shape design tokens

Source: `React_Flow_Pro/shapes-pro-example` — its actual shipped visual design, read directly (`src/components/shape-node/index.tsx`, `src/components/shape/types/round-rectangle.tsx`, `src/components/sidebar/sidebar-item.tsx`, `src/index.css`), not approximated from a screenshot or description. Applies to M-Files Flow's custom-rendered shapes only — Mermaid's own rendering, the collapse/promote logic, the theme selector's color choices, and the animated indicators are unchanged by this document.

Every value below states where it came from. Two are genuinely derived from the source; two are honest extrapolations (clearly marked, not passed off as literal copies); two are confirmed as already correct and left alone.

## 1. Stroke width — derived, interpolated

The source uses two different weights at two different scales, not one fixed number:
- `shape-node/index.tsx` (full, resizable canvas node): `strokeWidth={2}`
- `sidebar-item.tsx` (28px icon-scale preview): `strokeWidth={1}`

M-Files Flow's gateway diamond is a fixed 40×40px shape — between those two reference sizes, closer to the icon-scale end. Linear interpolation between (28px → 1) and (~100px → 2) lands at **1.4px** for a 40px shape.

**Previous value: 1.6px** — a round-number guess with no derivation behind it.

## 2. Fill opacity — derived

`shape-node/index.tsx`: `fillOpacity={0.8}` on every shape, fill color equal to the stroke color. A soft, translucent fill rather than solid, applied uniformly regardless of shape type.

M-Files Flow's diamonds already use a *different* technique — a separate light-tint fill hex plus a separate saturated stroke hex (e.g. `fill:#eef0ff, stroke:#7c8cff`), not one color at reduced opacity. That two-color system predates this task (theme_comparison_mockup.html) and is the right choice to keep — it's what makes the three swappable themes (Neutral/Cacoo/Hub-accent) read distinctly. Rather than replace it, **layer the source's opacity idea on top of it**: apply `fill-opacity: 0.85` to the existing tint fills. Cacoo's solid olive fill gets the same treatment, softening it the same way the source's own solid-color example is softened.

## 3. Corner radius — derived, but no change needed

`round-rectangle.tsx`: `rounding = Math.min(12, 0.2 * Math.min(width, height))` — proportional, capped at 12px.

The gateway diamond is a straight-line polygon (`generatePath`, no curve command), and the source's own diamond shape (`diamond.tsx`) is drawn the identical way — sharp vertices, no rounding applied to diamonds in the source either. **No change: already matches.**

The status-badge annotation (`applyStateAnnotations`, `rx=3` on a 16px-tall rect) was checked against the formula too: `0.2 × 16 = 3.2`, capped at 12 → ≈3.2. Already within a rounding error of the derived formula. **No change: already matches.**

## 4. Drop shadow — extrapolated, provenance stated plainly

The shapes themselves carry **no shadow** in the source (`.react-flow__node { box-shadow: none; ... }` is explicit about this). The one real shadow value anywhere in the bundle belongs to UI chrome, not a shape: `--panel-shadow: 0 0 4px 0 rgb(0 0 0 / 0.2)` (toolbars/panels, `src/index.css`).

This is an extrapolation, not a literal shape token — stated here so it isn't mistaken for one. Applying that same recipe to the gateway diamonds as a subtle "lifted off the canvas" cue is a reasonable, small design choice in the spirit of the source, not a value the source uses for this exact purpose. Converted to this app's existing `filter: drop-shadow(...)` convention (already used for hover/selection glows elsewhere in this file): **`drop-shadow(0 0 3px rgba(0,0,0,.22))`** — same blur radius and opacity as the source's panel shadow, `0 0` offset kept (matches the source's own centered, non-directional shadow).

## 5. Icon sizing — not in the source, reasoned from proportion (corrected once against real geometry)

`shapes-pro-example` never composes an icon inside a shape — it's generic geometric shapes with a text label, not icon+diamond. There is no literal precedent to derive from here, so this number is a considered proportion choice, not a copy.

First pass reasoned off the diamond's 40×40 *bounding box* and landed on 22px — wrong, caught before shipping: a rhombus's largest axis-aligned inscribed square has side length equal to its own half-width (here, 20px), not its full bounding box. A 22px icon centered in this diamond would have its corners poke past the diamond's actual edges. Corrected to **18px** — 90% of the real 20px safe maximum, still a real, visible increase from the previous 16px (which itself was 80% of that same safe bound, i.e. already close to it — this is a modest refinement, not the large jump the uncorrected math implied). Centering offset: `translate(-9,-9)` (half of 18).

## 6. Marker-bar stroke weight — consistency extension

`applyStateAnnotations`'s "Predefined process" double-bar marker currently uses `stroke-width: 1.3`, close to but not matching the new 1.4px token above. Unified to 1.4px for one consistent stroke weight across every custom-SVG element in this file, rather than two near-identical numbers with no reason to differ.

## Summary table

| Token | Old | New | Source |
|---|---|---|---|
| Gateway diamond stroke width | 1.6px | **1.4px** | Derived (interpolated) |
| Gateway diamond fill opacity | 1.0 (opaque) | **0.85** | Derived (source's 0.8, adjusted for this app's already-tinted fills) |
| Gateway diamond corner treatment | sharp (polygon) | sharp (unchanged) | Confirmed already matches |
| Status-badge corner radius | rx=3 | rx=3 (unchanged) | Confirmed already matches (formula ≈3.2) |
| Gateway diamond drop shadow | none | **`drop-shadow(0 0 3px rgba(0,0,0,.22))`** | Extrapolated from panel/toolbar shadow (shapes themselves have none) |
| Gateway icon size | 16px | **22px** | Reasoned proportion (no source precedent) |
| State-recolor (`sc_<id>`) fill opacity | 1.0 (opaque) | **0.85** | Derived, same as gateway diamonds |
| Predefined-process marker stroke width | 1.3px | **1.4px** | Consistency with token #1 |
