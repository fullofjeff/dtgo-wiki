# dtgo-wiki Component Reference

Components in `src/components/`. All paths relative to `src/components/`.

## Layout

| Component | File | Purpose |
|-----------|------|---------|
| Shell | `layout/Shell.tsx` | App shell — fixed sidebar + content outlet |
| Sidebar | `layout/Sidebar.tsx` | Collapsible/hoverable nav sidebar |
| SidebarContext | `layout/SidebarContext.tsx` | Sidebar state (expand/collapse/pin) |
| SearchBar | `layout/SearchBar.tsx` | Top search input |
| SidebarMenuItem | `layout/SidebarMenuItem.tsx` | Individual nav items |

## Pages

| Component | File | Purpose |
|-----------|------|---------|
| HomePage | `pages/HomePage.tsx` | Overview, stats, entity cards |
| FilePage | `pages/FilePage.tsx` | Document view + table of contents |
| SearchPage | `pages/SearchPage.tsx` | Full-text search results |
| OrgChartPage | `pages/OrgChartPage.tsx` | Interactive org hierarchy |
| IntakePage | `pages/IntakePage.tsx` | AI-powered content intake |

## Molecules

| Component | File | Purpose |
|-----------|------|---------|
| MarkdownRenderer | `molecules/MarkdownRenderer.tsx` | React-markdown wrapper with remark-gfm |
| TableOfContents | `molecules/TableOfContents.tsx` | Heading-based nav for documents |
| SectionModal | `molecules/SectionModal.tsx` | Modal for viewing document sections |

## UI

| Component | File | Purpose |
|-----------|------|---------|
| Modal | `ui/Modal.tsx` | Reusable modal dialog |
| PinClosedButton | `ui/PinClosedButton.tsx` | Sidebar pin toggle |
| SidebarMenuItem | `ui/SidebarMenuItem.tsx` | Nav item with icon |

## Org Chart

| Component | File | Purpose |
|-----------|------|---------|
| OrgNode | `org-chart/OrgNode.tsx` | Individual org chart node |
| layoutUtils | `org-chart/layoutUtils.ts` | Dagre graph layout helpers |

## Data Layer (not components, but key modules)

| Module | File | Purpose |
|--------|------|---------|
| loader | `data/loader.ts` | Loads & parses markdown KB files |
| search | `data/search.ts` | Fuse.js search index |
| types | `data/types.ts` | KBFile, Heading, SearchResult types |
| orgData | `data/orgData.ts` | Org chart structure data |
