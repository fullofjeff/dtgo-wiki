# Component Quick Reference

> **Source:** Copied from JF_DASHBOARD (`/Users/jeffreyfullerton/JF_DASHBOARD/.claude/skills/component-library/references/component-quick-ref.md`). Keep in sync when JF_DASHBOARD components change.
>
> These components live in JF_DASHBOARD — to use in dtgo-wiki, copy and adapt (see SKILL.md Step 3).

Quick lookup: what component to use for common UI needs.

## Forms & Input

| Need | Component | Location |
|------|-----------|----------|
| Text input | `Input` | `ui/Input.tsx` (barrel) |
| Number input with +/- | `NumberInput` | `ui/NumberInput.tsx` |
| Multi-line text | `Textarea` | `ui/Textarea.tsx` (barrel) |
| Dropdown select | `Select` | `ui/Select.tsx` (barrel) |
| Checkbox | `Checkbox` | `ui/Checkbox.tsx` |
| Toggle switch | `Switch` | `ui/Switch.tsx` |
| Toggle (alt) | `Toggle` | `ui/Toggle.tsx` (barrel) |
| Radio options | `RadioGroup` | `ui/RadioGroup.tsx` |
| Date selection | `DatePicker` | `ui/DatePicker.tsx` |
| Range slider | `Slider` | `ui/Slider.tsx` |
| Click-to-edit text | `InlineEdit` | `ui/InlineEdit.tsx` |
| File upload | `FileUploader` | `shared/FileUploader.tsx` |
| Image upload | `ImageUploader` | `shared/ImageUploader.tsx` |
| Form group with title | `FormSection` | `shared/FormSection.tsx` |

## Buttons & Actions

| Need | Component | Location |
|------|-----------|----------|
| Button (all variants) | `Button` | `ui/Button.tsx` (barrel) |
| Copy to clipboard | `InlineCopy` | `ui/InlineCopy.tsx` |

## Layout & Containers

| Need | Component | Location |
|------|-----------|----------|
| Page title + breadcrumbs | `PageHeader` | `shared/PageHeader.tsx` |
| Dark inset section | `RecessedContainer` | `shared/RecessedContainer.tsx` |
| Grid card with icon | `DashboardCard` | `shared/DashboardCard.tsx` |
| App shell with sidebar | `DashboardLayout` | `layout/DashboardLayout.tsx` |
| Sidebar navigation | `SidebarNav` | `layout/SidebarNav.tsx` |

## Feedback & Status

| Need | Component | Location |
|------|-----------|----------|
| Status indicator | `StatusBadge` | `shared/StatusBadge.tsx` |
| Label badge | `Badge` | `ui/Badge.tsx` (barrel) |
| Tag/chip (removable) | `ContentChip` | `shared/ContentChip.tsx` |
| Small chip | `Chip` | `ui/Chip.tsx` (barrel) |
| Empty data state | `EmptyState` | `shared/EmptyState.tsx` |
| Loading spinner | `LoadingState` | `shared/LoadingState.tsx` |
| Progress ring | `CircularProgress` | `ui/CircularProgress.tsx` |

## Modals & Dialogs

| Need | Component | Location |
|------|-----------|----------|
| Generic modal | `Modal` | `ui/Modal.tsx` |
| Styled modal (brand) | `LegacyModal` | `shared/LegacyModal.tsx` |
| Confirm/delete dialog | `ConfirmModal` | `shared/ConfirmModal.tsx` |

## Navigation & Menus

| Need | Component | Location |
|------|-----------|----------|
| Sidebar menu item | `SidebarMenuItem` | `ui/SidebarMenuItem.tsx` |
| Expandable menu | `MenuSlider` | `ui/MenuSlider.tsx` |
| File/folder tree | `FileTree` | `ui/FileTree.tsx` |
| Right-click menu | `ContextMenu` | `ui/ContextMenu.tsx` |
| Dropdown menu | `Dropdown` + `DropdownItem` | `ui/Dropdown.tsx` (barrel) |

## Data Display

| Need | Component | Location |
|------|-----------|----------|
| Data table (sort/search/page) | `DataTable` | `shared/DataTable.tsx` |
| Bar chart | `BarChart` | `charts/BarChart.tsx` |
| Line/area chart | `LineChart` | `charts/LineChart.tsx` |
| Pie/donut chart | `PieChart` | `charts/PieChart.tsx` |
| Heat map | `HeatMapChart` | `charts/HeatMap.tsx` |
| Scatter plot | `ScatterPlotChart` | `charts/ScatterPlot.tsx` |
| Bubble chart | `BubbleChart` | `charts/BubbleChart.tsx` |
| Mekko chart | `MekkoChart` | `charts/MekkoChart.tsx` |
| Range bar chart | `RangeBarChart` | `charts/RangeBarChart.tsx` |
| Competitive matrix | `CompetitiveMatrix` | `charts/CompetitiveMatrix.tsx` |
| Chart wrapper | `ChartContainer` | `charts/ChartContainer.tsx` |

## Embeds

| Need | Component | Location |
|------|-----------|----------|
| Generic iframe | `EmbedWrapper` | `embeds/EmbedWrapper.tsx` |
| Looker dashboard | `LookerStudioEmbed` | `embeds/LookerStudioEmbed.tsx` |
| Spreadsheet editor | `FortuneSheetEmbed` | `embeds/FortuneSheetEmbed.tsx` |

## Misc

| Need | Component | Location |
|------|-----------|----------|
| Theme toggle | `ThemeToggle` | `ui/ThemeToggle.tsx` |
| Brand logo | `PWVLogo` | `ui/PWVLogo.tsx` |
| Color swatch display | `ColorSwatch` | `shared/ColorSwatch.tsx` |
| Auth-protected route | `PrivateRoute` | `shared/PrivateRoute.tsx` |

---

**All paths relative to `react-canvas/src/components/` in JF_DASHBOARD**
**(barrel) = available via `import { X } from '../../components/ui'` in JF_DASHBOARD**
