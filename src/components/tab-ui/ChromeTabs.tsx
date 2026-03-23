import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ChromeTab } from './ChromeTab';
import type { ChromeTabsProps } from './types';
import { TAB_GEOMETRY, getLeftEdgeCapPath } from './tabGeometry';

const TAB_OVERLAP = 19; // Tabs overlap slightly like real Chrome tabs
// The tab flare extends beyond the bounding box by this ratio of the tab width
const FLARE_WIDTH_RATIO = TAB_GEOMETRY.CURVE_RADIUS / TAB_GEOMETRY.VIEWBOX_WIDTH;

export const ChromeTabs: React.FC<ChromeTabsProps> = ({
  tabs,
  activeTabId,
  onActiveTabChange,
  onTabRemove,
  onTabReorder,
  onTabDoubleClick,
  onTabContextMenu,
  onOverflowChange,
  onActiveTabMetrics,
  tabHeight = 60,
  paddingLeft = 20,
  paddingRight = 20,
  minTabWidth = 120,
  maxTabWidth = 240,
  className = '',
  activeTabPortalRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); // Ref to the overflow:hidden content container
  const [containerWidth, setContainerWidth] = useState(0);

  // Scroll state for overflow
  const [scrollOffset, setScrollOffset] = useState(0);

  // Drag state
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef(0);
  const dragStartIndex = useRef(0);

  // Hover state for tab expansion
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

  // Track container width with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.offsetWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate flare width that extends beyond tab bounding box
  const flareWidth = useMemo(() => {
    // Use maxTabWidth as approximation for flare calculation
    return Math.ceil(maxTabWidth * FLARE_WIDTH_RATIO);
  }, [maxTabWidth]);

  // Active tab is always full size
  const activeTabWidth = maxTabWidth;

  // Calculate base tab width for inactive tabs based on remaining space
  const baseTabWidth = useMemo(() => {
    if (tabs.length <= 1) return maxTabWidth;

    const inactiveCount = tabs.length - 1;
    // Reserve space for: padding, active tab at full size, and right flare
    const availableWidth = containerWidth - paddingLeft - paddingRight - activeTabWidth - flareWidth;
    // Account for overlapping between all tabs
    const totalOverlap = Math.max(0, tabs.length - 1) * TAB_OVERLAP;
    const widthPerInactiveTab = (availableWidth + totalOverlap) / inactiveCount;

    return Math.max(minTabWidth, Math.min(maxTabWidth, widthPerInactiveTab));
  }, [containerWidth, tabs.length, paddingLeft, paddingRight, minTabWidth, maxTabWidth, flareWidth, activeTabWidth]);

  // Find the active tab index
  const activeTabIndex = useMemo(() => {
    return tabs.findIndex(t => t.id === activeTabId);
  }, [tabs, activeTabId]);

  // Find the hovered tab index
  const hoveredTabIndex = useMemo(() => {
    return tabs.findIndex(t => t.id === hoveredTabId);
  }, [tabs, hoveredTabId]);

  // Check if hovered tab is immediately left of active (for portal logic)
  const isLeftAdjacentHovered = useMemo(() => {
    return hoveredTabIndex !== -1 && hoveredTabIndex === activeTabIndex - 1;
  }, [hoveredTabIndex, activeTabIndex]);

  // Calculate position for each tab, accounting for active/hovered tabs being wider
  const getTabPosition = useCallback((index: number): number => {
    let position = paddingLeft;
    for (let i = 0; i < index; i++) {
      const isExpanded = i === activeTabIndex || i === hoveredTabIndex;
      const w = isExpanded ? activeTabWidth : baseTabWidth;
      position += w - TAB_OVERLAP;
    }
    return position;
  }, [paddingLeft, activeTabIndex, hoveredTabIndex, activeTabWidth, baseTabWidth]);

  // Get the width for a specific tab (expanded if active or hovered)
  const getTabWidth = useCallback((tabId: string): number => {
    const isExpanded = tabId === activeTabId || tabId === hoveredTabId;
    return isExpanded ? activeTabWidth : baseTabWidth;
  }, [activeTabId, hoveredTabId, activeTabWidth, baseTabWidth]);

  // Get z-index for a tab - active tab is highest, hovered/inactive below the separator line
  const getTabZIndex = useCallback((tabId: string, index: number): number => {
    if (tabId === activeTabId) return 10; // Above separator line (z:5)
    if (tabId === hoveredTabId) {
      // If hovered tab is immediately left of active, raise above active so X isn't covered
      if (index === activeTabIndex - 1) return 11;
      return index < activeTabIndex ? 3 : 2;
    }
    return 1; // Inactive tabs below line
  }, [hoveredTabId, activeTabId, activeTabIndex]);

  const handleTabSelect = useCallback((tabId: string) => {
    onActiveTabChange?.(tabId);
  }, [onActiveTabChange]);

  const handleTabClose = useCallback((tabId: string) => {
    onTabRemove?.(tabId);
  }, [onTabRemove]);

  const handleTabDoubleClick = useCallback((tabId: string) => {
    onTabDoubleClick?.(tabId);
  }, [onTabDoubleClick]);

  const handleTabContextMenu = useCallback((tabId: string, event: React.MouseEvent, tabRect: DOMRect) => {
    onTabContextMenu?.(tabId, event, tabRect);
  }, [onTabContextMenu]);

  // Drag handlers
  const handleDragStart = useCallback((tabId: string, clientX: number) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    // Select the tab when starting to drag
    onActiveTabChange?.(tabId);

    setDraggingTabId(tabId);
    setDragOffset(0);
    dragStartX.current = clientX;
    dragStartIndex.current = tabIndex;
  }, [tabs, onActiveTabChange]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!draggingTabId) return;
    const offset = clientX - dragStartX.current;
    setDragOffset(offset);
  }, [draggingTabId]);

  const handleDragEnd = useCallback(() => {
    if (!draggingTabId || !onTabReorder) {
      setDraggingTabId(null);
      setDragOffset(0);
      return;
    }

    // Calculate which position the tab should move to (use base width for step calculation)
    const tabStep = baseTabWidth - TAB_OVERLAP;
    const indexOffset = Math.round(dragOffset / tabStep);
    const newIndex = Math.max(0, Math.min(tabs.length - 1, dragStartIndex.current + indexOffset));

    if (newIndex !== dragStartIndex.current) {
      onTabReorder(dragStartIndex.current, newIndex);
    }

    setDraggingTabId(null);
    setDragOffset(0);
  }, [draggingTabId, dragOffset, baseTabWidth, tabs.length, onTabReorder]);

  // Global mouse move/up listeners for drag
  useEffect(() => {
    if (!draggingTabId) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTabId, handleDragMove, handleDragEnd]);

  // Get position for a tab, accounting for drag offset and scroll
  const getDisplayPosition = useCallback((tabId: string, index: number): number => {
    const basePosition = getTabPosition(index) - scrollOffset;
    if (tabId === draggingTabId) {
      return basePosition + dragOffset;
    }
    return basePosition;
  }, [getTabPosition, draggingTabId, dragOffset, scrollOffset]);

  // Calculate total width needed for all tabs (one active tab is wider)
  const totalTabsWidth = useMemo(() => {
    if (tabs.length === 0) return 0;
    const inactiveCount = tabs.length - 1;
    const totalWidth = paddingLeft
      + inactiveCount * baseTabWidth
      + activeTabWidth
      - (tabs.length - 1) * TAB_OVERLAP
      + paddingRight
      + flareWidth; // Extra space for the rightmost tab's flare
    return totalWidth;
  }, [tabs.length, baseTabWidth, activeTabWidth, paddingLeft, paddingRight, flareWidth]);

  // Calculate if we have overflow
  const hasOverflow = totalTabsWidth > containerWidth;
  const maxScroll = Math.max(0, totalTabsWidth - containerWidth);
  const canScrollLeft = scrollOffset > 0;
  const canScrollRight = scrollOffset < maxScroll;

  // Notify parent of overflow state changes
  useEffect(() => {
    onOverflowChange?.({
      hasOverflow,
      canScrollLeft,
      canScrollRight,
    });
  }, [hasOverflow, canScrollLeft, canScrollRight, onOverflowChange]);

  // Notify parent of active tab metrics for unified outline
  useEffect(() => {
    // Use requestAnimationFrame to ensure browser layout is complete before measuring
    const frameId = requestAnimationFrame(() => {
      if (activeTabIndex >= 0 && containerRef.current && contentRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        const containerStyle = getComputedStyle(containerRef.current);
        const containerPaddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
        const tabLocalLeft = getTabPosition(activeTabIndex);
        const effectiveDragOffset = draggingTabId === tabs[activeTabIndex]?.id ? dragOffset : 0;
        const isHovering = hoveredTabIndex >= 0 && hoveredTabIndex !== activeTabIndex;

        // Calculate hovered tab position if hovering
        let hoveredTabViewportLeft: number | undefined;
        let hoveredTabWidth: number | undefined;
        if (isHovering) {
          const hoveredTabLocalLeft = getTabPosition(hoveredTabIndex);
          hoveredTabViewportLeft = containerRect.left + containerPaddingLeft + hoveredTabLocalLeft;
          hoveredTabWidth = getTabWidth(tabs[hoveredTabIndex].id);
        }

        onActiveTabMetrics?.({
          left: tabLocalLeft,
          viewportLeft: containerRect.left + containerPaddingLeft + tabLocalLeft + effectiveDragOffset,
          width: activeTabWidth,
          flareWidth,
          isDragging: draggingTabId === tabs[activeTabIndex]?.id,
          isHovering,
          hoverSide: isHovering ? (hoveredTabIndex === activeTabIndex - 1 ? 'left' : null) : null,
          clipLeft: contentRect.left,   // Left edge of overflow:hidden container
          clipRight: contentRect.right, // Right edge of overflow:hidden container
          clipTop: contentRect.top,     // Top of tab container in viewport coords
          hoveredTabViewportLeft,
          hoveredTabWidth,
        });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeTabIndex, activeTabWidth, flareWidth, getTabPosition, getTabWidth, onActiveTabMetrics, draggingTabId, dragOffset, tabs, hoveredTabIndex, containerWidth]);

  // Clamp scroll offset when container resizes or tabs change
  useEffect(() => {
    if (scrollOffset > maxScroll) {
      setScrollOffset(maxScroll);
    }
  }, [maxScroll, scrollOffset]);

  // Wheel handler for horizontal scrolling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!hasOverflow) return;
    e.preventDefault();
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    setScrollOffset(prev => Math.max(0, Math.min(maxScroll, prev + delta)));
  }, [hasOverflow, maxScroll]);

  // Keyboard handler for tab navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      if (e.shiftKey) {
        // Previous tab
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        onActiveTabChange?.(tabs[prevIndex].id);
      } else {
        // Next tab
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        onActiveTabChange?.(tabs[nextIndex].id);
      }
    }
  }, [tabs, activeTabId, onActiveTabChange]);

  return (
    <div
      className={`chrome-tabs chrome-tabs-dark-theme ${className}`}
      ref={containerRef}
      tabIndex={0}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      style={{
        flex: 1,
        background: 'transparent',
        borderRadius: 0,
        height: '100%',
        padding: '0 3px',
        alignSelf: 'stretch',
        overflow: 'visible', // Allow tab strokes to extend outside (e.g. flares)
        display: 'flex',
        alignItems: 'flex-end',
        position: 'relative',
        outline: 'none', // Remove focus outline
      }}
    >
      {/* Tab area container */}
      <div
        ref={contentRef}
        className="chrome-tabs-content"
        style={{
          height: `${tabHeight}px`,
          position: 'relative',
          width: '100%',
          paddingRight: `${flareWidth}px`, // Reserve space for the rightmost tab's flare
          boxSizing: 'border-box',
          overflow: 'hidden', // Clip tabs at container boundaries to prevent canvas overlap
        }}
      >
        {tabs.map((tab, index) => {
          // Calculate viewport position for portal rendering (active tab only)
          // Disable portal when left-adjacent tab is hovered so local z-index (11 > 10) works
          const isActiveTab = tab.id === activeTabId;
          const shouldUsePortal = isActiveTab &&
                                  !!activeTabPortalRef?.current &&
                                  !!contentRef.current &&
                                  !isLeftAdjacentHovered;
          let viewportPosition: { left: number; top: number } | undefined;
          let clipBounds: { left: number; right: number } | undefined;
          if (shouldUsePortal && contentRef.current) {
            const contentRect = contentRef.current.getBoundingClientRect();
            viewportPosition = {
              left: contentRect.left + getDisplayPosition(tab.id, index),
              top: contentRect.bottom - tabHeight, // Align to bottom of container
            };
            clipBounds = {
              left: contentRect.left,
              right: contentRect.right,
            };
          }

          return (
            <ChromeTab
              key={tab.id}
              tab={tab}
              isActive={isActiveTab}
              isHovered={tab.id === hoveredTabId}
              width={getTabWidth(tab.id)}
              position={getDisplayPosition(tab.id, index)}
              tabHeight={tabHeight}
              zIndex={getTabZIndex(tab.id, index)}
              isDragging={tab.id === draggingTabId}
              isHoverTransition={hoveredTabId !== null && hoveredTabId !== activeTabId}
              onSelect={() => handleTabSelect(tab.id)}
              onClose={tab.closable !== false ? () => handleTabClose(tab.id) : undefined}
              onDoubleClick={() => handleTabDoubleClick(tab.id)}
              onContextMenu={(e, tabRect) => handleTabContextMenu(tab.id, e, tabRect)}
              onDragStart={(clientX) => handleDragStart(tab.id, clientX)}
              onMouseEnter={() => setHoveredTabId(tab.id)}
              onMouseLeave={() => setHoveredTabId(null)}
              portalContainer={shouldUsePortal ? activeTabPortalRef?.current : undefined}
              viewportPosition={viewportPosition}
              clipBounds={clipBounds}
            />
          );
        })}
      </div>

      {/* Left edge cap - OUTSIDE overflow:hidden container so it's not clipped */}
      <svg
        style={{
          position: 'absolute',
          left: -flareWidth,
          bottom: 0,
          width: `${flareWidth}px`,
          height: `${tabHeight}px`,
          pointerEvents: 'none',
          zIndex: 12,
        }}
        viewBox={`0 0 ${TAB_GEOMETRY.CURVE_RADIUS} ${TAB_GEOMETRY.VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <path d={getLeftEdgeCapPath()} fill="rgba(20, 20, 24, 0.95)" />
      </svg>
    </div>
  );
};
