import React, { useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ChromeTabProps } from './types';
import { TAB_GEOMETRY, getTabSvgPath } from './tabGeometry';

// SVG path for tab geometry - generated from shared constants
const TAB_SVG_PATH = getTabSvgPath();

export const ChromeTab: React.FC<ChromeTabProps> = ({
  tab,
  isActive,
  isHovered = false,
  width,
  position,
  tabHeight,
  zIndex = 1,
  onSelect,
  onClose,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onMouseEnter,
  onMouseLeave,
  isDragging = false,
  isHoverTransition = false,
  portalContainer,
  viewportPosition, // Pre-calculated position from ChromeTabs
  clipBounds, // Clip boundaries for curved clipping
}) => {
  const tabRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose?.();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onDoubleClick?.();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isActive) return; // Only show context menu for active tab
    if (tabRef.current) {
      const rect = tabRef.current.getBoundingClientRect();
      onContextMenu?.(e, rect);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return;
    // Don't start drag if clicking close button
    if ((e.target as HTMLElement).closest('.chrome-tab-close')) return;

    e.preventDefault();
    onDragStart?.(e.clientX);
  };

  // Determine if we should render through portal
  const usePortal = portalContainer && viewportPosition;

  // Calculate clip-path with curved edges when tab extends beyond container
  const clipPath = useMemo(() => {
    if (!usePortal || !clipBounds || !viewportPosition) return undefined;

    const tabLeft = viewportPosition.left;
    const tabRight = tabLeft + width;
    const R = TAB_GEOMETRY.CURVE_RADIUS; // 10
    const H = tabHeight;

    // Check if clipping needed on each side
    const needsLeftClip = tabLeft < clipBounds.left;
    const needsRightClip = tabRight > clipBounds.right;

    if (!needsLeftClip && !needsRightClip) return undefined;

    // Calculate clip positions in tab's LOCAL coordinates
    const leftClipX = needsLeftClip ? (clipBounds.left - tabLeft) : 0;
    const rightClipX = needsRightClip ? (clipBounds.right - tabLeft) : width;

    // Build path with curved edges where clipping occurs
    // The curve should match the tab flare geometry (concave, bulging outward)
    let path = '';

    if (needsLeftClip) {
      // Left edge: concave curve bulging LEFT
      path += `M ${leftClipX} 0 Q ${leftClipX - R} ${H/2} ${leftClipX} ${H}`;
    } else {
      // No left clip: extend past tab edge to include flare
      path += `M ${-R} 0 L ${-R} ${H}`;
    }

    if (needsRightClip) {
      // Bottom to right edge with concave curve bulging RIGHT
      path += ` L ${rightClipX} ${H} Q ${rightClipX + R} ${H/2} ${rightClipX} 0`;
    } else {
      // No right clip: extend past tab edge to include flare
      path += ` L ${width + R} ${H} L ${width + R} 0`;
    }

    path += ' Z';
    return `path('${path}')`;
  }, [usePortal, clipBounds, viewportPosition, width, tabHeight]);

  const tabElement = (
    <div
      ref={tabRef}
      className="chrome-tab"
      data-tab-id={tab.id}
      data-active={isActive}
      style={{
        position: usePortal ? 'fixed' : 'absolute',
        left: usePortal ? viewportPosition.left : 0,
        top: usePortal ? viewportPosition.top : undefined,
        height: `${tabHeight}px`,
        width: `${width}px`,
        transform: usePortal ? undefined : `translate3d(${position}px, 0, 0)`,
        transition: (isDragging || isHoverTransition) ? 'none' : 'transform 120ms ease-in-out, width 120ms ease-in-out',
        zIndex: usePortal ? 120 : zIndex, // Portal level (120)
        cursor: 'pointer',
        pointerEvents: 'auto', // Ensure clicks work through portal
        clipPath, // Curved clipping at container boundaries
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >

      {/* Tab background with SVG */}
      <div
        className="chrome-tab-background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${TAB_GEOMETRY.VIEWBOX_WIDTH} ${TAB_GEOMETRY.VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          style={{
            overflow: 'visible',
            width: '100%',
            height: '100%',
          }}
        >
          <path
            className="chrome-tab-geometry"
            d={TAB_SVG_PATH}
            style={{
              fill: isActive ? 'rgb(24, 24, 26)' : 'rgba(55, 55, 62, 0.95)',
            }}
          />
          {/* Active tab stroke removed - now handled by UnifiedOutline */}
        </svg>
      </div>

      {/* Tab content */}
      <div
        className="chrome-tab-content"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '18px 8px 18px 18px',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Favicon */}
        {tab.favicon && (
          <div
            className={`chrome-tab-favicon ${tab.pinned ? 'pinned' : ''}`}
            style={{
              width: '16px',
              height: '16px',
              minWidth: '16px',
              minHeight: '16px',
              backgroundImage: `url("${tab.favicon}")`,
              backgroundSize: '16px 16px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              opacity: isActive ? 1 : 0.6,
              marginRight: '8px',
              flexShrink: 0,
              filter: tab.pinned ? 'drop-shadow(0 0 4px rgba(216, 131, 10, 0.5))' : undefined,
            }}
          />
        )}

        {/* Title */}
        <div
          className={`chrome-tab-title ${tab.pinned ? 'pinned' : ''}`}
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: '0.8rem',
            fontWeight: isActive ? 600 : 500,
            color: tab.pinned
              ? '#d8830a'
              : isActive
                ? '#ebe7c7'
                : 'rgba(235, 231, 199, 0.5)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {tab.title}
        </div>

        {/* Drag handle (invisible) */}
        <div
          className="chrome-tab-drag-handle"
          onMouseDown={handleMouseDown}
          style={{
            touchAction: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        />

        {/* Close button */}
        {tab.closable !== false && onClose && (
          <div
            className="chrome-tab-close"
            onClick={handleClose}
            style={{
              position: 'relative',
              zIndex: 10,
              width: '16px',
              height: '16px',
              marginLeft: '8px',
              marginRight: !isActive && isHovered ? '16px' : '8px',
              borderRadius: '50%',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><path stroke='rgba(235, 231, 199, .4)' stroke-linecap='square' stroke-width='1.5' d='M0 0 L8 8 M8 0 L0 8'></path></svg>")`,
              backgroundSize: '8px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s ease, background-color 0.15s ease',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );

  // Render through portal if container is available, otherwise render normally
  if (portalContainer) {
    return createPortal(tabElement, portalContainer);
  }

  return tabElement;
};
