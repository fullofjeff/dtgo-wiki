import React, { useEffect, useState, useRef, RefObject } from 'react';
import { motion } from 'framer-motion';
import { TAB_GEOMETRY } from './tabGeometry';
import type { ActiveTabMetrics } from './types';

interface UnifiedOutlineProps {
  tabMetrics: ActiveTabMetrics | null;
  canvasRef: RefObject<HTMLDivElement | null>;
  headerHeight?: number;
  tabHeight?: number;
  canvasBorderRadius?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

interface CanvasBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export const UnifiedOutline: React.FC<UnifiedOutlineProps> = ({
  tabMetrics,
  canvasRef,
  headerHeight = 80,
  tabHeight = 60,
  canvasBorderRadius = 16,
  strokeColor = '#2a2a2a',
  strokeWidth = 1,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | null>(null);
  const containerLeftRef = useRef(0);

  // Track SVG container's viewport position on mount and resize
  useEffect(() => {
    const updateContainerPosition = () => {
      if (svgRef.current) {
        containerLeftRef.current = svgRef.current.getBoundingClientRect().left;
      }
    };

    updateContainerPosition();
    window.addEventListener('resize', updateContainerPosition);
    return () => window.removeEventListener('resize', updateContainerPosition);
  }, []);

  // Track canvas dimensions (in viewport coords)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateBounds = () => {
      const rect = canvas.getBoundingClientRect();
      setCanvasBounds({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      });
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [canvasRef]);

  if (!tabMetrics || !canvasBounds) return null;

  // Synchronously update containerLeft to ensure consistency with tabMetrics
  if (svgRef.current) {
    containerLeftRef.current = svgRef.current.getBoundingClientRect().left;
  }

  // Calculate scaled tab curve radius (scales with tab width)
  const tabCurveRadius = tabMetrics.width * (TAB_GEOMETRY.CURVE_RADIUS / TAB_GEOMETRY.VIEWBOX_WIDTH);
  const flareWidth = tabMetrics.flareWidth;

  // Convert tab viewport position to container-relative
  const tabLeft = tabMetrics.viewportLeft - containerLeftRef.current;
  const tabRight = tabLeft + tabMetrics.width;

  // Tab geometry points
  const tabTopY = headerHeight - tabHeight; // Where tab top starts
  const baselineY = headerHeight; // Where tab bottom / canvas top meets

  // Convert canvas viewport coords to container-relative
  const canvasLeft = canvasBounds.left - containerLeftRef.current;
  const canvasRight = canvasBounds.right - containerLeftRef.current;
  const canvasTop = baselineY; // Align with tab baseline
  const canvasBottom = canvasTop + canvasBounds.height;
  const r = canvasBorderRadius;

  // Flare positions
  const leftFlareX = tabLeft - flareWidth;
  const rightFlareX = tabRight + flareWidth;

  // Convert clip boundaries to container-relative coords
  const clipLeftLocal = tabMetrics.clipLeft - containerLeftRef.current;
  const clipRightLocal = tabMetrics.clipRight - containerLeftRef.current;

  // Detect clipping
  const isLeftClipped = leftFlareX < clipLeftLocal;
  const isRightClipped = rightFlareX > clipRightLocal;

  // Detect if tab is completely outside the clip area
  const isCompletelyOutsideRight = leftFlareX > clipRightLocal;
  const isCompletelyOutsideLeft = rightFlareX < clipLeftLocal;
  const isCompletelyOutside = isCompletelyOutsideRight || isCompletelyOutsideLeft;

  // Generate path segments based on clipping state
  // The curved clip edges use quadratic beziers that bulge outward (matching edge cap visual)
  const curveControlOffset = tabCurveRadius; // How far the clip curve bulges

  // LEFT SIDE: Either full tab left side or clipped
  // Note: hoverSide === 'left' is handled separately at the full path level
  let leftSidePath: string;
  if (isLeftClipped) {
    // Clipped: Draw from baseline UP to tab top at clipLeft, with curve bulging LEFT
    // Path goes: H to clipLeft at baseline, then Q curve UP to clipLeft at tabTop
    leftSidePath = `
      H ${clipLeftLocal}
      Q ${clipLeftLocal - curveControlOffset} ${(tabTopY + baselineY) / 2} ${clipLeftLocal} ${tabTopY}
    `;
  } else {
    // Not clipped: Draw full left flare, left side, and top-left corner
    leftSidePath = `
      H ${leftFlareX}
      A ${tabCurveRadius} ${tabCurveRadius} 0 0 0 ${tabLeft} ${baselineY - tabCurveRadius}
      V ${tabTopY + tabCurveRadius}
      A ${tabCurveRadius} ${tabCurveRadius} 0 0 1 ${tabLeft + tabCurveRadius} ${tabTopY}
    `;
  }

  // TAB TOP: Horizontal line across top (adjusted for clipping or hover)
  // TAB TOP: Horizontal line across top
  const tabTopEndX = isRightClipped ? clipRightLocal : tabRight - tabCurveRadius;
  const tabTopPath = `H ${tabTopEndX}`;

  // RIGHT SIDE: Either full tab right side or clipped with curve
  let rightSidePath: string;
  if (isRightClipped) {
    // Clipped: Draw curve from top down to clipRight at baseline, matching edge cap bulge
    // The curve goes from top to bottom, bulging RIGHT (outward from tab)
    rightSidePath = `
      Q ${clipRightLocal + curveControlOffset} ${(tabTopY + baselineY) / 2} ${clipRightLocal} ${baselineY}
    `;
  } else {
    // Not clipped: Draw top-right corner, right side, and right flare
    rightSidePath = `
      A ${tabCurveRadius} ${tabCurveRadius} 0 0 1 ${tabRight} ${tabTopY + tabCurveRadius}
      V ${baselineY - tabCurveRadius}
      A ${tabCurveRadius} ${tabCurveRadius} 0 0 0 ${rightFlareX} ${baselineY}
    `;
  }

  // Generate the unified path
  // When hovering left, restructure path to avoid closing line across canvas
  let path: string;

  if (isCompletelyOutside) {
    // Tab is completely outside visible area - draw only canvas outline (no tab shape)
    path = `
      M ${canvasLeft + r} ${canvasTop}
      H ${canvasRight - r}
      A ${r} ${r} 0 0 1 ${canvasRight} ${canvasTop + r}
      V ${canvasBottom - r}
      A ${r} ${r} 0 0 1 ${canvasRight - r} ${canvasBottom}
      H ${canvasLeft + r}
      A ${r} ${r} 0 0 1 ${canvasLeft} ${canvasBottom - r}
      V ${canvasTop + r}
      A ${r} ${r} 0 0 1 ${canvasLeft + r} ${canvasTop}
      Z
    `.replace(/\s+/g, ' ').trim();
  } else if (tabMetrics.hoverSide === 'left' && tabMetrics.hoveredTabViewportLeft != null) {
    // Calculate hovered tab's right edge
    const hoveredTabLeft = tabMetrics.hoveredTabViewportLeft - containerLeftRef.current;
    const hoveredTabRight = hoveredTabLeft + (tabMetrics.hoveredTabWidth || 0);
    const hoveredRightFlareX = hoveredTabRight + flareWidth;

    // Start at tab top, go clockwise around everything, end at hovered tab's right flare
    // NO Z close - intentional gap where hovered tab covers
    path = `
      M ${tabLeft + tabCurveRadius} ${tabTopY}
      ${tabTopPath}
      ${rightSidePath}
      H ${canvasRight - r}
      A ${r} ${r} 0 0 1 ${canvasRight} ${canvasTop + r}
      V ${canvasBottom - r}
      A ${r} ${r} 0 0 1 ${canvasRight - r} ${canvasBottom}
      H ${canvasLeft + r}
      A ${r} ${r} 0 0 1 ${canvasLeft} ${canvasBottom - r}
      V ${canvasTop + r}
      A ${r} ${r} 0 0 1 ${canvasLeft + r} ${canvasTop}
      H ${hoveredRightFlareX}
    `.replace(/\s+/g, ' ').trim();
  } else {
    // Normal case: Start at canvas top-left corner (after border radius), go clockwise
    path = `
      M ${canvasLeft + r} ${canvasTop}
      ${leftSidePath}
      ${tabTopPath}
      ${rightSidePath}
      H ${canvasRight - r}
      A ${r} ${r} 0 0 1 ${canvasRight} ${canvasTop + r}
      V ${canvasBottom - r}
      A ${r} ${r} 0 0 1 ${canvasRight - r} ${canvasBottom}
      H ${canvasLeft + r}
      A ${r} ${r} 0 0 1 ${canvasLeft} ${canvasBottom - r}
      V ${canvasTop + r}
      A ${r} ${r} 0 0 1 ${canvasLeft + r} ${canvasTop}
      Z
    `.replace(/\s+/g, ' ').trim();
  }

  // Bypass Framer Motion entirely during hover/drag for instant updates
  const shouldAnimate = !tabMetrics.isDragging && !tabMetrics.isHovering;

  // Gradient colors for beveled edge effect
  const gradientId = 'outline-gradient';
  const hoverGradientId = 'outline-gradient-hover';
  const useGradient = tabMetrics.isHovering ? `url(#${hoverGradientId})` : `url(#${gradientId})`;

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 200, // Above header (100) and canvas (150)
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Default gradient - subtle bevel from light top to darker bottom */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2e2e2e" />
          <stop offset="50%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#1f1f1f" />
        </linearGradient>
        {/* Hover gradient - slightly brighter */}
        <linearGradient id={hoverGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#454545" />
          <stop offset="50%" stopColor="#353535" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
      </defs>
      {shouldAnimate ? (
        <motion.path
          d={path}
          fill="none"
          stroke={useGradient}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={{ d: path }}
          transition={{
            type: "spring",
            stiffness: 800,
            damping: 35,
          }}
          style={{ transition: 'stroke 0.2s ease-out' }}
        />
      ) : (
        <path
          d={path}
          fill="none"
          stroke={useGradient}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          style={{ transition: 'stroke 0.2s ease-out' }}
        />
      )}
    </svg>
  );
};
