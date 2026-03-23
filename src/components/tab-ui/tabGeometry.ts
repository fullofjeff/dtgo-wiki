// Shared tab geometry constants - single source of truth
// Both ChromeTab and TabContextMenu use these values for perfect alignment

export const TAB_GEOMETRY = {
  VIEWBOX_WIDTH: 234,
  VIEWBOX_HEIGHT: 60,
  CURVE_RADIUS: 10,
} as const;

// Generate the tab SVG path dynamically from constants
export const getTabSvgPath = () => {
  const { VIEWBOX_WIDTH, VIEWBOX_HEIGHT, CURVE_RADIUS } = TAB_GEOMETRY;
  const innerWidth = VIEWBOX_WIDTH - 2 * CURVE_RADIUS; // 214

  // Path breakdown:
  // - Start at top-left inner corner (10, 0)
  // - Horizontal line across top to (224, 0)
  // - Top-right corner arc to (234, 10)
  // - Vertical line down to (234, 50)
  // - Bottom-right concave arc extending to (244, 60) - OVERFLOW
  // - Horizontal line across bottom to (-10, 60) - OVERFLOW
  // - Bottom-left concave arc to (0, 50) - OVERFLOW
  // - Vertical line up to (0, 10)
  // - Top-left corner arc to (10, 0)
  return `M${CURVE_RADIUS},0 H${innerWidth + CURVE_RADIUS} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 1 ${VIEWBOX_WIDTH},${CURVE_RADIUS} V${VIEWBOX_HEIGHT - CURVE_RADIUS} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 0 ${VIEWBOX_WIDTH + CURVE_RADIUS},${VIEWBOX_HEIGHT} H-${CURVE_RADIUS} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 0 0,${VIEWBOX_HEIGHT - CURVE_RADIUS} V${CURVE_RADIUS} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 1 ${CURVE_RADIUS},0 Z`;
};

// Generate an open path for the top/side stroke only
export const getTabStrokePath = () => {
  const { VIEWBOX_WIDTH, VIEWBOX_HEIGHT, CURVE_RADIUS } = TAB_GEOMETRY;
  const innerWidth = VIEWBOX_WIDTH - 2 * CURVE_RADIUS;

  // Path traces the full upper outline from "ground" (baseline) to "ground"
  // Start at bottom-left flare tip (-10, 60)
  // Left Flare -> Left Vertical -> Top Left -> Top Edge -> Top Right -> Right Vertical -> Right Flare
  return `M -${CURVE_RADIUS},${VIEWBOX_HEIGHT} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 0 0,${VIEWBOX_HEIGHT - CURVE_RADIUS} V${CURVE_RADIUS} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 1 ${CURVE_RADIUS},0 H${innerWidth + CURVE_RADIUS} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 1 ${VIEWBOX_WIDTH},${CURVE_RADIUS} V${VIEWBOX_HEIGHT - CURVE_RADIUS} A${CURVE_RADIUS},${CURVE_RADIUS} 0 0 0 ${VIEWBOX_WIDTH + CURVE_RADIUS},${VIEWBOX_HEIGHT}`;
};

// Generate wing paths for context menu
// These fill the concave areas at the bottom of the tab
// Inner edges extend slightly inward (2 units) to overlap with menu body and eliminate gaps
export const getWingPaths = () => {
  const { VIEWBOX_WIDTH, CURVE_RADIUS } = TAB_GEOMETRY;
  const OVERLAP = 2; // Units to extend inward for seamless edge

  return {
    // Left wing: fills from (-10, 0) curving to (0, 10), then extends inward to (2, 10)
    left: `M -${CURVE_RADIUS} 0 A ${CURVE_RADIUS} ${CURVE_RADIUS} 0 0 1 0 ${CURVE_RADIUS} L ${OVERLAP} ${CURVE_RADIUS} L ${OVERLAP} 0 Z`,
    // Right wing: fills from (244, 0) curving to (234, 10), then extends inward to (232, 10)
    right: `M ${VIEWBOX_WIDTH + CURVE_RADIUS} 0 A ${CURVE_RADIUS} ${CURVE_RADIUS} 0 0 0 ${VIEWBOX_WIDTH} ${CURVE_RADIUS} L ${VIEWBOX_WIDTH - OVERLAP} ${CURVE_RADIUS} L ${VIEWBOX_WIDTH - OVERLAP} 0 Z`,
  };
};

// Calculate the scaled flare height based on actual tab height
// This ensures the FlareTop wings scale identically to the tab's bottom curves
export const getScaledFlareHeight = (tabHeight: number): number => {
  const { VIEWBOX_HEIGHT, CURVE_RADIUS } = TAB_GEOMETRY;
  return tabHeight * (CURVE_RADIUS / VIEWBOX_HEIGHT);
};

// Edge cap paths for container boundaries
// These provide curved edges at the left/right of the tab container
// to ensure no flat edges are ever visible when tabs are clipped

// Left edge cap - full height concave curve for container boundary
// Viewbox: width = CURVE_RADIUS, height = VIEWBOX_HEIGHT
// The curved edge faces RIGHT (toward tabs), fill extends LEFT (masks scrolled tabs)
export const getLeftEdgeCapPath = () => {
  const { CURVE_RADIUS, VIEWBOX_HEIGHT } = TAB_GEOMETRY;
  // Right edge is curved (concave, bulging left to match tab flares)
  // Fill covers the area to the left of the curve
  return `M ${CURVE_RADIUS} 0 Q 0 ${VIEWBOX_HEIGHT / 2} ${CURVE_RADIUS} ${VIEWBOX_HEIGHT} L 0 ${VIEWBOX_HEIGHT} L 0 0 Z`;
};

// Right edge cap - full height concave curve for container boundary
// Viewbox: width = CURVE_RADIUS, height = VIEWBOX_HEIGHT
export const getRightEdgeCapPath = () => {
  const { CURVE_RADIUS, VIEWBOX_HEIGHT } = TAB_GEOMETRY;
  // Concave curve from top-left to bottom-left, with the curve bulging right
  // Uses quadratic bezier for smooth concave shape
  return `M 0 0 Q ${CURVE_RADIUS} ${VIEWBOX_HEIGHT / 2} 0 ${VIEWBOX_HEIGHT} L ${CURVE_RADIUS} ${VIEWBOX_HEIGHT} L ${CURVE_RADIUS} 0 Z`;
};
