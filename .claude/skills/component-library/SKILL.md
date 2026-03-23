---
name: ui-design-system
description: >
  Complete UI design system for dtgo-wiki. Enforces component reuse, design token usage,
  compound component patterns, and cross-project adaptation from JF_DASHBOARD (60+ components).
  Triggers on any frontend, UI, component, page, form, modal, chart, styling, or design work.
triggers:
  - build a page
  - create a component
  - add a form
  - design a dashboard
  - add a modal
  - add a table
  - add a chart
  - create a view
  - build a section
  - add UI
  - frontend
  - new page
  - settings page
  - form fields
  - styling
  - design tokens
  - colors
  - typography
  - layout
  - animation
  - dark theme
---

# UI Design System — dtgo-wiki

## Critical Rules

1. **NEVER create a new UI component if one already exists.** Check both inventories before writing any JSX.
2. **NEVER hardcode colors, fonts, radii, or shadows.** Use design tokens from `src/index.css`.
3. **ALWAYS read the source file** of a component before using it — don't guess at props.

## Thinking Framework

When building any UI:

**Step 1 — Check dtgo-wiki components first:**
→ [dtgo-wiki-components.md](references/dtgo-wiki-components.md) (60+ local components, hooks, utilities)

**Step 2 — Check JF_DASHBOARD catalog:**
→ [component-quick-ref.md](references/component-quick-ref.md) (60+ components available for adaptation)

**Step 3 — Adapting from JF_DASHBOARD?**
→ [cross-project-adaptation.md](references/cross-project-adaptation.md) (checklist, token remapping, gotchas)

**Step 4 — Creating something new?**
→ [patterns.md](references/patterns.md) (compound components, context, forwardRef, portals, motion)

**Step 5 — Styling?**
→ [design-tokens.md](references/design-tokens.md) (all tokens, typography scale, CSS utility classes)

## Stack

- **React 19** + TypeScript ~5.7 + Vite 6 + React Router 7
- **Tailwind CSS 4** — no CSS modules, no styled-components
- **Headless UI v2** — Dialog, Transition, Listbox for accessible primitives
- **Lucide React** — icons
- **Framer Motion** — animations (spring: stiffness 300, damping 35)
- **TanStack Table** — data tables
- **Fuse.js** — full-text search
- **Path alias:** `@/*` → `./src/*`
- **Class utility:** `cn()` from `@/utils/cn` (clsx + tailwind-merge)

## Component Locations

```
src/components/
├── ui/            Modal, Badge, Chip, DataTable, Dropdown, FormSection, InlineEdit, Toggle, SidebarMenuItem, PinClosedButton
├── molecules/     MarkdownRenderer, TableOfContents, EntityModal, PersonModal, SectionModal, SourceModal
├── layout/        Shell, Sidebar, SidebarContext, SearchBar, RequireAuth
├── pages/         HomePage, FilePage, SearchPage, OrgChartPage, IntakePage, TimelinePage, LoginPage
├── tab-ui/        ChromeTabs, ChromeTab, AgendaHeader, TabContextMenu, ToolbarButton, UnifiedOutline
├── org-chart/     OrgNode, EditableEdge, layoutUtils
└── model/         ModelChip, ProviderSwitcher, ModelVariantList, MemoryToggle

src/hooks/         useClickOutside, useDropdownPosition, useKeyboardShortcut, useSidebarKeyboard, useTabs
src/contexts/      AuthContext (AuthProvider, useAuth)
src/lib/           firebase, providerColors, useModelVariantsConfig
src/utils/         cn (clsx + tailwind-merge)
```

## Import Patterns

**Barrel exports** (from `components/ui/index.ts`):
```tsx
import { Badge, Chip, DataTable, Toggle, Dropdown, DropdownSeparator, DropdownLabel, DropdownItem } from '@/components/ui';
```

**Direct imports** (everything else):
```tsx
import { Modal } from '@/components/ui/Modal';
import { FormSection } from '@/components/ui/FormSection';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { SidebarMenuItem } from '@/components/ui/SidebarMenuItem';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/utils/cn';
```

## Design Aesthetic

- **Dark-first:** `--bg-body` (#191918), surfaces at same or darker shade, no light mode
- **Glassmorphism:** Card shadows with inset highlights, noise overlay on sidebar, backdrop blur on modals/dropdowns
- **Typography:** EB Garamond serif for headings/hero/stat text, Avenir sans for body, SF Mono for code
- **Color philosophy:** Muted surfaces + entity accent colors for identity (DTGO green, MQDC blue, T&B orange, DTP pink), gold for brand/active, lavender for interactive/links, cream for emphasis
- **Labels:** 0.65rem, uppercase, 1.5px letter-spacing, secondary color, 500-600 weight
- **Motion:** Framer Motion with spring transitions (stiffness: 300, damping: 35), AnimatePresence for enter/exit
- **Spacing:** Generous padding (px-10 py-6 page content), 14px card radius, 10px input radius
- **Cards:** Use `.wiki-card` / `.wiki-card-clickable` CSS classes, `.accent-top` with inline `borderColor` for entity stripes
- **Badges:** Use `.badge-dtgo`, `.badge-mqdc`, `.badge-tnb`, `.badge-dtp`, `.badge-default` CSS classes

## When You CAN Create a New Component

Only when ALL of these are true:
1. No existing component covers the need (checked BOTH inventories)
2. The component is genuinely reusable, not a one-off
3. It follows project patterns: TypeScript, Tailwind, design tokens from `index.css`
4. Compound components use the namespace export pattern (see `patterns.md`)
5. Components needing DOM refs use `forwardRef`
6. Dropdowns/tooltips use the portal + `useDropdownPosition` pattern
7. You place it in the appropriate `src/components/` subdirectory
8. You update `dtgo-wiki-components.md` and barrel exports if in `ui/`
