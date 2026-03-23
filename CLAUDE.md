# dtgo-wiki — Project Instructions

## Overview

React 19 + Vite 6 + TypeScript + Tailwind CSS 4 knowledge base for DTGO Corporation. Displays markdown files with YAML frontmatter, full-text search (Fuse.js), interactive org chart (@xyflow/react + dagre), and an AI-powered intake processor (Claude Sonnet via `/api/intake`).

## Architecture

**Data flow:** `src/data/loader.ts` loads `.md` files from `knowledge-base/` via `import.meta.glob` → parses frontmatter (gray-matter) → returns `KBFile[]` with headings extracted for navigation.

**Routes** (defined in `src/App.tsx`):
- `/` — HomePage (overview, stats, entity cards)
- `/file/:slug` — FilePage (document view + table of contents)
- `/search` — SearchPage (Fuse.js full-text)
- `/org-chart` — OrgChartPage (hierarchy visualization)
- `/intake` — IntakePage (AI content processor)

**Component layers** (`src/components/`):
- `layout/` — Shell, Sidebar, SidebarContext, SearchBar, RequireAuth
- `pages/` — HomePage, FilePage, SearchPage, OrgChartPage, IntakePage, TimelinePage, LoginPage
- `molecules/` — MarkdownRenderer, TableOfContents, SectionModal, EntityModal, PersonModal, SourceModal
- `ui/` — Modal, Badge, Chip, DataTable, Dropdown, FormSection, InlineEdit, Toggle, SidebarMenuItem, PinClosedButton
- `tab-ui/` — ChromeTabs, ChromeTab, AgendaHeader, TabContextMenu, ToolbarButton, UnifiedOutline
- `org-chart/` — OrgNode, EditableEdge, layoutUtils
- `model/` — ModelChip, ProviderSwitcher, ModelVariantList, MemoryToggle

## Knowledge Base

- Location: `knowledge-base/` (symlink to `../knowledge-base/`)
- Format: Markdown with YAML frontmatter (`title`, `scope`, `updated`, `sources`)
- Intake rules: `knowledge-base/INTAKE.md`
- Contribution guidelines: `knowledge-base/CONTRIBUTING.md`
- Inbox for new content: `knowledge-base/_inbox/`

## Design System

All tokens in `src/index.css` — shared with JF_DASHBOARD/react-canvas:
- Colors: `--jf-gold`, `--jf-cream`, `--jf-lavender`, `--dtgo-green`, `--mqdc-blue`, `--tnb-orange`, `--dtp-pink`
- Backgrounds: `--bg-body` (#191918), `--bg-surface`, `--bg-surface-inset`, `--bg-input`
- Typography: `--font-serif` (EB Garamond), `--font-sans` (Avenir), `--font-mono` (SF Mono)
- Radii: `--radius-card` (14px), `--radius-input` (10px)

## Stack

- React 19, React Router 7, TypeScript ~5.7, Vite 6
- Tailwind CSS 4 (no CSS modules, no styled-components)
- Headless UI v2 for accessible primitives
- Lucide React for icons
- Framer Motion for animations
- Path alias: `@/*` → `./src/*`

## UI Design System Skill

This project has a **ui-design-system skill** (`.claude/skills/component-library/`) covering component reuse, design tokens, compound component patterns, and cross-project adaptation from JF_DASHBOARD (60+ components). Before creating any UI component, styling, or layout work, the skill auto-triggers and provides:
- Component inventories (local + JF_DASHBOARD)
- Design token reference with typography scale and CSS utility classes
- Pattern documentation (compound components, context, portals, motion)
- Cross-project adaptation checklist with token remapping

## Dev Commands

```
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview  # Preview production build
```
