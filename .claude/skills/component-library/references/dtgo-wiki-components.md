# dtgo-wiki Component Reference

All paths relative to `src/`.

## UI Components (`components/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| Badge | `components/ui/Badge.tsx` | Label badge with variant styling |
| Chip | `components/ui/Chip.tsx` | Tag chip with forwardRef, provider colors, optional remove/dropdown |
| DataTable | `components/ui/DataTable.tsx` | Generic TanStack Table with sorting, pagination, search |
| Dropdown | `components/ui/Dropdown.tsx` | Portal-based dropdown with smart positioning |
| DropdownItem | `components/ui/DropdownItem.tsx` | Individual dropdown menu item |
| DropdownSeparator | `components/ui/Dropdown.tsx` | Divider for dropdown sections |
| DropdownLabel | `components/ui/Dropdown.tsx` | Section label within dropdown |
| FormSection | `components/ui/FormSection.tsx` | Collapsible section with Framer Motion animation |
| InlineEdit | `components/ui/InlineEdit.tsx` | Click-to-edit text field |
| Modal | `components/ui/Modal.tsx` | Compound modal (Root, Overlay, Content, Header, Title, Body, Footer) |
| PinClosedButton | `components/ui/PinClosedButton.tsx` | Sidebar pin toggle button |
| SidebarMenuItem | `components/ui/SidebarMenuItem.tsx` | Nav item with icon, collapse support, status dot |
| Toggle | `components/ui/Toggle.tsx` | Toggle switch |

**Barrel exports** (`components/ui/index.ts`): DataTable, Badge, Chip, Dropdown, DropdownSeparator, DropdownLabel, DropdownItem, Toggle

## Molecule Components (`components/molecules/`)

| Component | File | Purpose |
|-----------|------|---------|
| MarkdownRenderer | `components/molecules/MarkdownRenderer.tsx` | React-markdown wrapper with remark-gfm, heading extraction |
| TableOfContents | `components/molecules/TableOfContents.tsx` | Heading-based document navigation |
| EntityModal | `components/molecules/EntityModal.tsx` | Modal for viewing entity details |
| PersonModal | `components/molecules/PersonModal.tsx` | Modal for viewing person details with role parsing |
| SectionModal | `components/molecules/SectionModal.tsx` | Modal for viewing document sections |
| SourceModal | `components/molecules/SourceModal.tsx` | Modal for viewing intake session sources |

## Layout Components (`components/layout/`)

| Component | File | Purpose |
|-----------|------|---------|
| Shell | `components/layout/Shell.tsx` | App shell — fixed sidebar + content outlet |
| Sidebar | `components/layout/Sidebar.tsx` | Collapsible/hoverable nav sidebar |
| SidebarContext | `components/layout/SidebarContext.tsx` | Sidebar state provider (expand/collapse/pin) |
| SearchBar | `components/layout/SearchBar.tsx` | Top search input |
| RequireAuth | `components/layout/RequireAuth.tsx` | Auth-protected route wrapper |

## Page Components (`components/pages/`)

| Component | File | Purpose |
|-----------|------|---------|
| HomePage | `components/pages/HomePage.tsx` | Overview, stats, entity cards |
| FilePage | `components/pages/FilePage.tsx` | Document view + table of contents |
| SearchPage | `components/pages/SearchPage.tsx` | Full-text search results |
| OrgChartPage | `components/pages/OrgChartPage.tsx` | Interactive org hierarchy |
| IntakePage | `components/pages/IntakePage.tsx` | AI-powered content intake processor |
| TimelinePage | `components/pages/TimelinePage.tsx` | Timeline visualization with react-chrono |
| LoginPage | `components/pages/LoginPage.tsx` | Firebase authentication |

## Tab UI Components (`components/tab-ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| ChromeTabs | `components/tab-ui/ChromeTabs.tsx` | Chrome-style tab bar container |
| ChromeTab | `components/tab-ui/ChromeTab.tsx` | Individual chrome tab |
| AgendaHeader | `components/tab-ui/AgendaHeader.tsx` | Agenda view header |
| TabContextMenu | `components/tab-ui/TabContextMenu.tsx` | Right-click context menu for tabs |
| ToolbarButton | `components/tab-ui/ToolbarButton.tsx` | Toolbar action button |
| UnifiedOutline | `components/tab-ui/UnifiedOutline.tsx` | Unified outline view |

**Barrel exports** (`components/tab-ui/index.ts`): AgendaHeader, ChromeTabs, ChromeTab, TabContextMenu, UnifiedOutline, types, tabGeometry

## Org Chart Components (`components/org-chart/`)

| Component | File | Purpose |
|-----------|------|---------|
| OrgNode | `components/org-chart/OrgNode.tsx` | Individual org chart node (memoized) |
| EditableEdge | `components/org-chart/EditableEdge.tsx` | Editable edge between nodes |
| layoutUtils | `components/org-chart/layoutUtils.ts` | Dagre graph layout helpers |

## Model Components (`components/model/`)

| Component | File | Purpose |
|-----------|------|---------|
| ModelChip | `components/model/ModelChip.tsx` | AI model display chip |
| ProviderSwitcher | `components/model/ProviderSwitcher.tsx` | AI provider selection switcher |
| ModelVariantList | `components/model/ModelVariantList.tsx` | List of model variants |
| MemoryToggle | `components/model/MemoryToggle.tsx` | Memory on/off toggle |

## Hooks (`hooks/`)

| Hook | File | Purpose |
|------|------|---------|
| useClickOutside | `hooks/useClickOutside.ts` | Click-outside detection for dropdowns/modals |
| useDropdownPosition | `hooks/useDropdownPosition.ts` | Smart viewport-aware dropdown positioning |
| useKeyboardShortcut | `hooks/useKeyboardShortcut.ts` | Keyboard shortcut binding |
| useSidebarKeyboard | `hooks/useSidebarKeyboard.ts` | Sidebar-specific keyboard shortcuts |
| useTabs | `hooks/useTabs.ts` | Tab state management |

## Contexts (`contexts/`)

| Context | File | Purpose |
|---------|------|---------|
| AuthContext | `contexts/AuthContext.tsx` | AuthProvider, useAuth hook, Firebase auth |

## Lib (`lib/`)

| Module | File | Purpose |
|--------|------|---------|
| firebase | `lib/firebase.ts` | Firebase initialization (db, auth) |
| providerColors | `lib/providerColors.ts` | AI provider color schemes (PROVIDER_COLORS, getProviderColors, extractProvider) |
| useModelVariantsConfig | `lib/useModelVariantsConfig.ts` | Model configuration loader hook |

## Utilities (`utils/`)

| Utility | File | Purpose |
|---------|------|---------|
| cn | `utils/cn.ts` | clsx + tailwind-merge class name utility |

## Types (`types/`)

| File | Exports |
|------|---------|
| `types/models.ts` | ModelVariant, ProviderConfig, ModelVariantsConfig, Provider, ProviderColorScheme |

## Data Layer (`data/`)

| Module | File | Purpose |
|--------|------|---------|
| loader | `data/loader.ts` | Loads & parses markdown KB files via import.meta.glob |
| search | `data/search.ts` | Fuse.js search index |
| types | `data/types.ts` | KBFile, Heading, SearchResult types |
| orgData | `data/orgData.ts` | Org chart structure data |
