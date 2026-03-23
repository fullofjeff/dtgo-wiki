# Cross-Project Component Adaptation

How to bring JF_DASHBOARD components into dtgo-wiki.

## Decision Tree

1. **Need a component?** Check `dtgo-wiki-components.md` first — use it if it exists locally.
2. **Not in dtgo-wiki?** Check `component-quick-ref.md` — if it exists in JF_DASHBOARD, adapt it.
3. **Not in either?** Create a new component following `patterns.md`.

## JF_DASHBOARD Source Paths

| Category | Absolute Path |
|----------|---------------|
| UI primitives | `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/ui/` |
| Shared | `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/shared/` |
| Charts | `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/charts/` |
| Layout | `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/layout/` |
| Embeds | `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/embeds/` |
| Portfolio | `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/portfolio/` |
| Nivo theme | `/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/admin/config/nivoTheme.ts` |

## Adaptation Checklist

When copying a component from JF_DASHBOARD:

- [ ] Read the JF_DASHBOARD source file completely
- [ ] Copy to appropriate `src/components/` subdirectory in dtgo-wiki
- [ ] Remap design tokens (see `design-tokens.md` mapping table)
- [ ] Replace `../../components/` import paths with `@/components/`
- [ ] Replace `../../hooks/` with `@/hooks/`
- [ ] Remove JF_DASHBOARD-specific dependencies (e.g., `@jf/ui`)
- [ ] Replace `#react-canvas-root` scoping if present
- [ ] Update barrel exports in `components/ui/index.ts` if appropriate
- [ ] Update `dtgo-wiki-components.md` with the new component

## Token Remapping Quick Reference

| Find in JF_DASHBOARD | Replace with in dtgo-wiki |
|-----------------------|---------------------------|
| `--jf-dark-bg` | `--bg-body` |
| `--jf-bg-body` | `--bg-body` |
| `--jf-bg-surface` | `--bg-surface` |
| `--jf-text-primary` | `--text-primary` |
| `--pwv-lavender` | `--jf-lavender` |
| `--pwv-red` | Inline `#e74c3c` or add token |
| `--pwv-green` | `--dtgo-green` |
| `--pwv-amber` | `--tnb-orange` |

## Already Adapted (do NOT re-copy)

These JF_DASHBOARD components already exist in dtgo-wiki (may have modified APIs):

| Component | dtgo-wiki Location | Differences |
|-----------|-------------------|-------------|
| Modal | `components/ui/Modal.tsx` | Compound pattern (namespace object) |
| Badge | `components/ui/Badge.tsx` | Simplified variants |
| Chip | `components/ui/Chip.tsx` | forwardRef, provider color system |
| DataTable | `components/ui/DataTable.tsx` | Generic TanStack Table |
| Dropdown | `components/ui/Dropdown.tsx` | Portal-based with useDropdownPosition |
| FormSection | `components/ui/FormSection.tsx` | Collapsible with Framer Motion |
| InlineEdit | `components/ui/InlineEdit.tsx` | With inline-edit.css |
| SidebarMenuItem | `components/ui/SidebarMenuItem.tsx` | Collapsed state, status dot |
| Toggle | `components/ui/Toggle.tsx` | Simplified toggle switch |

## Not Yet Adapted (candidates)

These exist in JF_DASHBOARD and could be brought over when needed:

### High-value candidates
- **Button** — complex variant system (primary, secondary, success, warning, danger, ghost, outline)
- **Input** — text input with label/helper/error
- **Textarea** — standard and inset variants
- **Select** — dropdown select
- **PageHeader** — title + breadcrumbs + back button
- **EmptyState** — placeholder with action button
- **LoadingState** — spinner with message

### Medium-value candidates
- **NumberInput** — input with +/- step buttons
- **Checkbox** — boolean toggle
- **Switch** — toggle switch (vs Toggle)
- **RadioGroup** — card-style radio options
- **StatusBadge** — success/neutral/warning/error/info
- **ContentChip** — tag with remove button
- **RecessedContainer** — dark inset container (basic, header, framed)
- **DashboardCard** — grid card with icon/title
- **ColorSwatch** — color display with CSS var name
- **FileUploader** / **ImageUploader** — file handling

### Require additional dependencies
- **All chart components** (10) — require `@nivo/*` packages (not in dtgo-wiki's package.json)
- **DatePicker** — requires BaseWeb (`@baseweb/datepicker`)
- **CircularProgress** — animated gradient ring
- **Slider** — requires additional styling
- **FileTree** — hierarchical nav tree
- **MenuSlider** — expandable menu sections
- **ContextMenu** — GSAP animated right-click menu (requires `gsap`)

### Not applicable
- **LookerStudioEmbed** — JF_DASHBOARD-specific
- **FortuneSheetEmbed** — JF_DASHBOARD-specific
- **Portfolio components** — JF_DASHBOARD-specific domain
- **PWVLogo** — brand-specific
- **ThemeToggle** — dtgo-wiki is dark-only

## Common Gotchas

1. **React version**: JF_DASHBOARD uses React 18; dtgo-wiki uses React 19. Usually compatible, but watch for deprecated patterns.
2. **Root scoping**: JF_DASHBOARD has `#react-canvas-root` CSS scoping — remove this in dtgo-wiki.
3. **Token prefixes**: JF_DASHBOARD uses `--jf-` prefixed tokens; dtgo-wiki uses unprefixed versions for surfaces/text.
4. **Color values differ**: Even shared token names like `--jf-lavender` may have slightly different hex values between projects.
5. **Chart dependencies**: `@nivo/*` packages are not installed in dtgo-wiki — add to package.json before adapting chart components.
6. **Headless UI version**: dtgo-wiki uses v2 (different API from v1 used in some JF_DASHBOARD components).
