// ── shapeDesignTokens ────────────────────────────────────────────
// Numeric values only — see gateway-diamond-design-tokens.md (project root)
// for what each one is, where it came from, and why. Applies to M-Files
// Flow's custom-rendered shapes (CommandCenter.jsx's applyGatewayDiamonds/
// applyStateAnnotations, useMermaid.js's state-recolor classDef) only.

export const SHAPE_STROKE_WIDTH = 1.4;      // token #1 — derived (interpolated)
export const SHAPE_FILL_OPACITY = 0.85;     // token #2 — derived
export const SHAPE_DROP_SHADOW = 'drop-shadow(0 0 3px rgba(0,0,0,.22))'; // token #4 — extrapolated
export const GATEWAY_ICON_SIZE = 18;        // token #5 — reasoned proportion, no source precedent; see spec doc for the geometry correction (a 40px diamond's safe inscribed square is ~20px, not 40px — an icon sized off the full bounding box overflows the diamond's edges)
