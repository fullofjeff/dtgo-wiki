// Tab data structure
export interface TabData {
  id: string;
  title: string;
  favicon?: string;
  closable?: boolean;
  pinned?: boolean;
}

// Title variant type - controls how the header title is displayed
export type TitleVariant = 'plain-text' | 'editable' | 'username-workbook' | 'no-title';

// Events emitted by ChromeTabs
export interface TabChangeEvent {
  tabId: string;
  previousTabId?: string;
}

// ChromeTab component props
export interface ChromeTabProps {
  tab: TabData;
  isActive: boolean;
  isHovered?: boolean;
  width: number;
  position: number;
  tabHeight: number;
  zIndex?: number;
  onSelect: () => void;
  onClose?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (event: React.MouseEvent, tabRect: DOMRect) => void;
  onDragStart?: (clientX: number) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isDragging?: boolean;
  isHoverTransition?: boolean; // true when positions are changing due to hover (disables CSS transition)
  className?: string;
  // Portal container for rendering active tab at elevated z-index
  portalContainer?: HTMLElement | null;
  // Pre-calculated viewport position for portal rendering (avoids feedback loop)
  viewportPosition?: { left: number; top: number };
  // Clip boundaries for curved clipping when portal tab extends beyond container
  clipBounds?: { left: number; right: number };
}

// Overflow state for tab scrolling
export interface TabOverflowState {
  hasOverflow: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

// Active tab metrics for unified outline
export interface ActiveTabMetrics {
  left: number;         // px from ChromeTabs container left (relative)
  viewportLeft: number; // px from viewport left edge (absolute)
  width: number;        // tab width in px
  flareWidth: number;   // flare extension in px
  isDragging?: boolean; // true when tab is being dragged
  isHovering?: boolean; // true when any tab is being hovered (causes position shift)
  hoverSide?: 'left' | 'right' | null; // which side of active tab is being hovered
  clipLeft: number;     // left clip boundary in viewport coords (where tabs get clipped)
  clipRight: number;    // right clip boundary in viewport coords (where tabs get clipped)
  clipTop: number;      // top clip boundary in viewport coords (where tabs get clipped)
  hoveredTabViewportLeft?: number; // hovered tab's left edge (viewport coords)
  hoveredTabWidth?: number;        // hovered tab's width
}

// ChromeTabs component props
export interface ChromeTabsProps {
  tabs: TabData[];
  activeTabId: string;
  onActiveTabChange?: (tabId: string) => void;
  onTabAdd?: (tab: TabData) => void;
  onTabRemove?: (tabId: string) => void;
  onTabReorder?: (originIndex: number, destinationIndex: number) => void;
  onTabDoubleClick?: (tabId: string) => void;
  onTabContextMenu?: (tabId: string, event: React.MouseEvent, tabRect: DOMRect) => void;
  onOverflowChange?: (state: TabOverflowState) => void;
  onActiveTabMetrics?: (metrics: ActiveTabMetrics) => void;
  tabHeight?: number;
  // Tab area container settings
  paddingLeft?: number;
  paddingRight?: number;
  minTabWidth?: number;
  maxTabWidth?: number;
  className?: string;
  // Portal container ref for rendering active tab at elevated z-index
  activeTabPortalRef?: React.RefObject<HTMLDivElement | null>;
}

// AgendaHeader props
export interface AgendaHeaderProps {
  // Sidebar awareness (deprecated - now uses SidebarContext)
  /** @deprecated Use SidebarContext instead. This prop is ignored. */
  sidebarWidth?: number;
  /** @deprecated Use SidebarContext instead. This prop is ignored. */
  sidebarCollapsed?: boolean;
  /** @deprecated Use SidebarContext instead. This prop is ignored. */
  sidebarGap?: number;

  // Page title configuration
  showPageTitle?: boolean;
  pageTitle?: string;
  titlePlaceholder?: string;
  titleVariant?: TitleVariant;
  userName?: string;
  onTitleSave?: (newTitle: string) => void;
  onTitleEditingChange?: (isEditing: boolean) => void;
  onBackClick?: () => void;

  // Tab configuration
  tabs?: TabData[];
  activeTabId?: string;
  onActiveTabChange?: (tabId: string) => void;
  onTabAdd?: (tab: TabData) => void;
  onTabRemove?: (tabId: string) => void;
  onTabReorder?: (originIndex: number, destinationIndex: number) => void;
  onTabDoubleClick?: (tabId: string) => void;
  onTabRename?: (tabId: string, newTitle: string) => void;
  onTabContextMenu?: (tabId: string, event: React.MouseEvent, tabRect: DOMRect) => void;
  onActiveTabMetrics?: (metrics: ActiveTabMetrics) => void;

  // Styling
  className?: string;
  height?: number;
  style?: React.CSSProperties;

  // Ref for imperatively closing the context menu from parent
  contextMenuCloseRef?: React.MutableRefObject<(() => void) | null>;

  // Portal container ref for rendering active tab at elevated z-index
  activeTabPortalRef?: React.RefObject<HTMLDivElement | null>;
}

// TabContextMenu props
export interface TabContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number; width?: number; height?: number };
  tabId: string;
  onClose: () => void;
  onAction?: (action: string, tabId: string) => void;
}

// Default tabs configuration
export const DEFAULT_TABS: TabData[] = [
  {
    id: 'org-chart',
    title: 'Corporate Structure',
    pinned: true,
    closable: false,
    favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ebe7c7' stroke-width='2'%3E%3Cpath d='M18 21a8 8 0 0 0-16 0'/%3E%3Ccircle cx='10' cy='8' r='5'/%3E%3Cpath d='M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3'/%3E%3C/svg%3E",
  },
];

export const INITIAL_ACTIVE_TAB = 'org-chart';
