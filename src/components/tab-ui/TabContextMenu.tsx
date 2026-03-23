import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TabContextMenuProps } from './types';
import { TAB_GEOMETRY, getWingPaths, getScaledFlareHeight } from './tabGeometry';

// FlareTop SVG Component - creates flared wing corners matching Chrome tab bottom flare
// Uses shared constants from tabGeometry.ts for perfect alignment with ChromeTab
const FlareTop: React.FC<{ tabHeight: number }> = ({ tabHeight }) => {
  const { VIEWBOX_WIDTH, CURVE_RADIUS } = TAB_GEOMETRY;
  const { left: leftWingPath, right: rightWingPath } = getWingPaths();
  const flareHeight = getScaledFlareHeight(tabHeight);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',  // Matches container width = tab width
        height: `${flareHeight}px`,  // Dynamic height matching tab's scaled curve
        overflow: 'visible',  // Allow wings to extend beyond, just like tab
        pointerEvents: 'none',
      }}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${CURVE_RADIUS}`}
      preserveAspectRatio="none"  // Same as tab - scales identically
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={leftWingPath} fill="rgb(32, 32, 36)" />
      <path d={rightWingPath} fill="rgb(32, 32, 36)" />
    </svg>
  );
};

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  isOpen,
  position,
  tabId,
  onClose,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready for transition
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    { id: 'rename', label: 'Rename Tab' },
    { id: 'pin', label: 'Pin Tab' },
    { id: 'duplicate', label: 'Duplicate Tab' },
    { id: 'separator', label: '', separator: true },
    { id: 'close', label: 'Close Tab' },
    { id: 'close-others', label: 'Close Other Tabs' },
  ];

  const handleItemClick = (actionId: string) => {
    onAction?.(actionId, tabId);
    onClose();
  };

  const menu = (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: position.width ? `${position.width}px` : '180px',
        zIndex: 10000,
        overflow: 'visible',
      }}
    >
      {/* Flare Top - matches Chrome tab flare via shared tabGeometry constants */}
      <FlareTop tabHeight={position.height || 60} />

      {/* Animation wrapper for menu body */}
      <div
        style={{
          clipPath: isAnimating ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)',
          transition: 'clip-path 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >

      {/* Main Menu Box */}
      <div
        ref={menuRef}
        style={{
          width: '100%',
          backgroundColor: 'rgb(32, 32, 36)',
          borderRadius: '0 0 8px 8px',
          padding: '4px 0',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        {menuItems.map((item, index) => {
          if (item.separator) {
            return (
              <div
                key={index}
                style={{
                  margin: '4px 0',
                  height: '1px',
                  backgroundColor: 'rgba(235, 231, 199, 0.1)',
                }}
              />
            );
          }

          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                cursor: 'pointer',
                color: 'rgba(235, 231, 199, 0.8)',
                fontSize: '0.85rem',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(235, 231, 199, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
};
