---
name: component-library
description: Ensures Claude uses existing project components instead of building from scratch
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
---

# Component Library — Use Existing Components First

## Critical Rule

**NEVER create a new UI component if one already exists.** Before writing any JSX, check both inventories below.

## Step 1: Check the Inventories

**Shared component catalog** (sourced from JF_DASHBOARD — 60+ components):

```
.claude/skills/component-library/references/component-quick-ref.md
```

**This project's own components:**

```
.claude/skills/component-library/references/dtgo-wiki-components.md
```

## Step 2: Read the Source Before Using

Before using a component, **read its source file** to understand its full props API. Don't guess at props.

**dtgo-wiki components:** `src/components/` (layout, pages, molecules, ui, org-chart subdirs)

**JF_DASHBOARD components** (when adapting for this project):
- UI primitives: `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/ui/`
- Shared: `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/shared/`
- Charts: `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/charts/`

## Step 3: Adapting Components from JF_DASHBOARD

Since dtgo-wiki is a separate project, you cannot import directly from JF_DASHBOARD. When you need a component that exists in the quick-ref but not in dtgo-wiki:

1. Read the source from JF_DASHBOARD
2. Copy and adapt it into the appropriate `src/components/` subdirectory
3. Adjust imports (Tailwind classes, design tokens, dependencies)
4. Update `dtgo-wiki-components.md` with the new addition

## Stack & Conventions

- **React 19** with TypeScript
- **Tailwind CSS 4** — no CSS modules, no styled-components
- **Headless UI v2** for accessible primitives (Dialog, Transition, Listbox)
- **Lucide React** for icons
- **Framer Motion** for animations
- Design tokens in `src/index.css` (shared token names with JF_DASHBOARD)
- Path alias: `@/*` → `./src/*`

## When You CAN Create a New Component

Only create a new component when:
1. No existing component covers the need (after checking BOTH inventories)
2. The new component is genuinely reusable, not a one-off
3. It follows the same patterns: TypeScript, Tailwind, design tokens from `index.css`
4. You add it to the appropriate `src/components/` subdirectory
5. You update `dtgo-wiki-components.md`
