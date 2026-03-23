import React, { useState, useCallback, useEffect, useRef as useReactRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChromeTabs } from './ChromeTabs';
import { TabContextMenu } from './TabContextMenu';
import { InlineEdit } from '../ui/InlineEdit';
import { useSidebar } from '../layout/SidebarContext';
import type { AgendaHeaderProps, TabData, TitleVariant, TabOverflowState } from './types';
import { TAB_GEOMETRY, getRightEdgeCapPath } from './tabGeometry';
import './header.css';

// Safe hook with fallback for use outside SidebarProvider (e.g., Storybook, isolated tests)
function useSidebarSafe() {
  try {
    return useSidebar();
  } catch {
    return { layoutWidth: 0, isExpanded: false };
  }
}

export const AgendaHeader: React.FC<AgendaHeaderProps> = ({
  // Deprecated: sidebar props kept for backward compatibility but no longer used
  sidebarWidth: _sidebarWidth = 260,
  sidebarCollapsed: _sidebarCollapsed = false,
  sidebarGap: _sidebarGap = 0,
  showPageTitle = true,
  pageTitle = "Jeffrey's Workbook",
  titlePlaceholder = "Enter title...",
  titleVariant,
  userName,
  onTitleSave,
  onTitleEditingChange,
  tabs = [],
  activeTabId = '',
  onActiveTabChange,
  onTabAdd,
  onTabRemove,
  onTabReorder,
  onTabDoubleClick,
  onTabRename,
  onTabContextMenu,
  onActiveTabMetrics,
  className = '',
  style,
  height = 80,
  onBackClick,
  contextMenuCloseRef,
  activeTabPortalRef,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number; width?: number; height?: number };
    tabId: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    tabId: '',
  });

  // Rename modal state
  const [renameState, setRenameState] = useState<{ isOpen: boolean; tabId: string; value: string }>({
    isOpen: false, tabId: '', value: '',
  });
  const renameInputRef = useReactRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameState.isOpen && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameState.isOpen]);

  // Track tab overflow state for rendering edge caps
  const [tabOverflow, setTabOverflow] = useState<TabOverflowState>({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const handleOverflowChange = useCallback((state: TabOverflowState) => {
    setTabOverflow(state);
  }, []);

  // Get sidebar layout width from context (with fallback for isolated usage)
  const { layoutWidth } = useSidebarSafe();

  // When embedded (position: relative via style prop), don't apply sidebar offset
  // because the parent container already handles sidebar awareness
  const isEmbedded = style?.position === 'relative';
  const effectiveLayoutWidth = isEmbedded ? 0 : layoutWidth;

  // Determine effective title variant (backward compatibility)
  const effectiveVariant: TitleVariant = titleVariant ?? (showPageTitle ? 'plain-text' : 'no-title');

  // Common title styles
  const titleStyles: React.CSSProperties = {
    color: '#d8830a',
    fontFamily: "'EB Garamond', serif",
    fontStyle: 'italic',
    fontSize: '1.35rem',
    fontWeight: 400,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    zIndex: 50,
    pointerEvents: 'auto',
    flexShrink: 0,
  };

  // Render the appropriate title variant
  const renderTitle = () => {
    switch (effectiveVariant) {
      case 'no-title':
        return null;

      case 'editable':
        return (
          <div className="agenda-heading agenda-heading--editable" style={titleStyles}>
            <InlineEdit
              value={pageTitle}
              onSave={onTitleSave ?? (() => { })}
              onEditingChange={onTitleEditingChange}
              placeholder={titlePlaceholder}
              variant="agenda-heading"
            />
          </div>
        );

      case 'username-workbook': {
        const name = userName || 'User';
        // Scale font size based on name length
        const scaledFontSize = name.length <= 6
          ? '1.35rem'
          : name.length <= 12
            ? '1.15rem'
            : '0.95rem';

        return (
          <h2
            className="agenda-heading"
            style={{
              ...titleStyles,
              fontSize: scaledFontSize,
            }}
          >
            <span className="name" style={{ fontStyle: 'italic', fontWeight: 600, marginRight: '0.25em' }}>{name}'s</span>
            <span style={{ fontStyle: 'normal' }}>Workbook</span>
          </h2>
        );
      }

      case 'plain-text':
      default: {
        const match = pageTitle.match(/^(.+'s)\s*(.*)$/);
        if (match) {
          return (
            <h2 className="agenda-heading" style={titleStyles}>
              <span className="name" style={{ fontStyle: 'italic', fontWeight: 600, marginRight: '0.25em' }}>{match[1]}</span>
              <span style={{ fontStyle: 'normal' }}>{match[2]}</span>
            </h2>
          );
        }
        return (
          <h2 className="agenda-heading" style={titleStyles}>
            <span className="name" style={{ fontStyle: 'normal' }}>
              {pageTitle}
            </span>
          </h2>
        );
      }
    }
  };

  const handleTabContextMenu = useCallback((tabId: string, event: React.MouseEvent, tabRect: DOMRect) => {
    event.preventDefault();
    // Position the tray below the tab, aligned to the tab's left edge
    setContextMenu({
      isOpen: true,
      position: {
        x: tabRect.left,
        y: tabRect.bottom,
        width: tabRect.width,
        height: tabRect.height
      },
      tabId,
    });
    onTabContextMenu?.(tabId, event, tabRect);
  }, [onTabContextMenu]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Expose close function to parent via ref
  useEffect(() => {
    if (contextMenuCloseRef) {
      contextMenuCloseRef.current = handleContextMenuClose;
    }
    return () => {
      if (contextMenuCloseRef) {
        contextMenuCloseRef.current = null;
      }
    };
  }, [contextMenuCloseRef, handleContextMenuClose]);

  const handleContextMenuAction = useCallback((action: string, tabId: string) => {
    switch (action) {
      case 'rename': {
        const tab = tabs.find(t => t.id === tabId);
        setRenameState({ isOpen: true, tabId, value: tab?.title || '' });
        break;
      }
      case 'pin':
        console.log('Pin tab:', tabId);
        break;
      case 'duplicate':
        console.log('Duplicate tab:', tabId);
        break;
      case 'close':
        onTabRemove?.(tabId);
        break;
      case 'close-others':
        tabs.forEach(tab => {
          if (tab.id !== tabId && tab.closable !== false) {
            onTabRemove?.(tab.id);
          }
        });
        break;
    }
  }, [tabs, onTabRemove]);

  const handleRenameSave = useCallback(() => {
    const trimmed = renameState.value.trim();
    if (trimmed && onTabRename) {
      onTabRename(renameState.tabId, trimmed);
    }
    setRenameState({ isOpen: false, tabId: '', value: '' });
  }, [renameState, onTabRename]);

  return (
    <div className="react-header">
      <motion.header
        className={`agenda-header-bar ${className}`}
        animate={{
          marginLeft: effectiveLayoutWidth,
          width: `calc(100% - ${effectiveLayoutWidth}px)`,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '1.5rem',
          background: 'rgba(20, 20, 24, 0.95)',
          padding: '0 1.5rem',
          height: `${height}px`,
          overflow: 'visible',
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 100,
          boxSizing: 'border-box',
          ...style,
        }}
      >
        {/* Back Button - left aligned */}
        {onBackClick && (
          <div style={{ alignSelf: 'flex-end', paddingBottom: '18px' }}>
            <button
              onClick={onBackClick}
              className="header-back-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                marginLeft: '-8px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(235, 231, 199, 0.6)',
                cursor: 'pointer',
                padding: 0,
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                transform: 'translateY(-2px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#d8830a';
                e.currentTarget.style.background = 'rgba(235, 231, 199, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(235, 231, 199, 0.6)';
                e.currentTarget.style.background = 'transparent';
              }}
              title="Go Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </button>
          </div>
        )}

        {/* Title Section - dynamic width to fit content */}
        <div
          style={{
            width: 'fit-content',
            minWidth: '120px',
            maxWidth: '40%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-end',
            paddingBottom: '18px',
          }}
        >
          {renderTitle()}
        </div>

        {/* Chrome tabs - wrapper provides right margin to clear canvas curve */}
        <div style={{ flex: 1, marginRight: '20px', overflow: 'hidden' }}>
          <ChromeTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onActiveTabChange={onActiveTabChange}
            onTabRemove={onTabRemove}
            onTabReorder={onTabReorder}
            onTabDoubleClick={onTabDoubleClick}
            onTabContextMenu={handleTabContextMenu}
            onOverflowChange={handleOverflowChange}
            onActiveTabMetrics={onActiveTabMetrics}
            activeTabPortalRef={activeTabPortalRef}
          />
        </div>

        {/* Add tab button */}
        {onTabAdd && (
          <button
            onClick={() => onTabAdd({ id: '', title: '' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid rgba(235, 231, 199, 0.1)',
              background: 'rgba(235, 231, 199, 0.05)',
              color: 'rgba(235, 231, 199, 0.6)',
              cursor: 'pointer',
              flexShrink: 0,
              marginRight: '8px',
              transition: 'all 0.2s',
              zIndex: 50,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(235, 231, 199, 0.1)';
              e.currentTarget.style.color = '#ebe7c7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(235, 231, 199, 0.05)';
              e.currentTarget.style.color = 'rgba(235, 231, 199, 0.6)';
            }}
            title="New org chart"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {/* Right edge cap - masks tabs at right boundary (1.5rem header padding + 20px canvas curve clearance) */}
        <svg
          style={{
            position: 'absolute',
            right: 'calc(1.5rem + 20px)',
            bottom: 0,
            width: `${Math.ceil(240 * (TAB_GEOMETRY.CURVE_RADIUS / TAB_GEOMETRY.VIEWBOX_WIDTH))}px`,
            height: '60px',
            pointerEvents: 'none',
            zIndex: 12,
          }}
          viewBox={`0 0 ${TAB_GEOMETRY.CURVE_RADIUS} ${TAB_GEOMETRY.VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <path d={getRightEdgeCapPath()} fill="rgba(20, 20, 24, 0.95)" />
        </svg>

        {/* Separator line removed - now handled by UnifiedOutline in FlowCanvas */}
      </motion.header>

      {/* Context menu */}
      <TabContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        tabId={contextMenu.tabId}
        onClose={handleContextMenuClose}
        onAction={handleContextMenuAction}
      />

      {/* Rename modal — portaled to body to escape stacking contexts */}
      {renameState.isOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setRenameState({ isOpen: false, tabId: '', value: '' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1e1e1d',
              border: '1px solid rgba(235, 231, 199, 0.1)',
              borderRadius: 12,
              padding: '20px 24px',
              width: 340,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ebe7c7', marginBottom: 12 }}>
              Rename Tab
            </div>
            <input
              ref={renameInputRef}
              type="text"
              value={renameState.value}
              onChange={(e) => setRenameState(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSave();
                if (e.key === 'Escape') setRenameState({ isOpen: false, tabId: '', value: '' });
              }}
              style={{
                width: '100%',
                background: 'rgba(235, 231, 199, 0.08)',
                border: '1px solid rgba(235, 231, 199, 0.2)',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#ebe7c7',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setRenameState({ isOpen: false, tabId: '', value: '' })}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid rgba(235, 231, 199, 0.1)',
                  background: 'transparent',
                  color: 'rgba(235, 231, 199, 0.6)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSave}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid rgba(216, 131, 10, 0.3)',
                  background: 'rgba(216, 131, 10, 0.15)',
                  color: '#d8830a',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
