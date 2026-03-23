# JF_DASHBOARD Component Quick Reference

> **Source:** JF_DASHBOARD component catalog (`/Users/jeffreyfullerton/JF_DASHBOARD/react-canvas/src/components/`).
> Components marked `[x]` are already adapted into dtgo-wiki. See `cross-project-adaptation.md` for the workflow.

## Forms & Input

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Text input | `Input` | `ui/Input.tsx` (barrel) | [ ] |
| Number input with +/- | `NumberInput` | `ui/NumberInput.tsx` | [ ] |
| Multi-line text | `Textarea` | `ui/Textarea.tsx` (barrel) | [ ] |
| Dropdown select | `Select` | `ui/Select.tsx` (barrel) | [ ] |
| Checkbox | `Checkbox` | `ui/Checkbox.tsx` | [ ] |
| Toggle switch | `Switch` | `ui/Switch.tsx` | [ ] |
| Toggle (alt) | `Toggle` | `ui/Toggle.tsx` (barrel) | [x] |
| Radio options | `RadioGroup` | `ui/RadioGroup.tsx` | [ ] |
| Date selection | `DatePicker` | `ui/DatePicker.tsx` | [ ] |
| Range slider | `Slider` | `ui/Slider.tsx` | [ ] |
| Click-to-edit text | `InlineEdit` | `ui/InlineEdit.tsx` | [x] |
| File upload | `FileUploader` | `shared/FileUploader.tsx` | [ ] |
| Image upload | `ImageUploader` | `shared/ImageUploader.tsx` | [ ] |
| Form group with title | `FormSection` | `shared/FormSection.tsx` | [x] |

## Buttons & Actions

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Button (all variants) | `Button` | `ui/Button.tsx` (barrel) | [ ] |
| Copy to clipboard | `InlineCopy` | `ui/InlineCopy.tsx` | [ ] |

## Layout & Containers

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Page title + breadcrumbs | `PageHeader` | `shared/PageHeader.tsx` | [ ] |
| Dark inset section | `RecessedContainer` | `shared/RecessedContainer.tsx` | [ ] |
| Grid card with icon | `DashboardCard` | `shared/DashboardCard.tsx` | [ ] |
| App shell with sidebar | `DashboardLayout` | `layout/DashboardLayout.tsx` | [ ] |
| Sidebar navigation | `SidebarNav` | `layout/SidebarNav.tsx` | [ ] |

## Feedback & Status

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Status indicator | `StatusBadge` | `shared/StatusBadge.tsx` | [ ] |
| Label badge | `Badge` | `ui/Badge.tsx` (barrel) | [x] |
| Tag/chip (removable) | `ContentChip` | `shared/ContentChip.tsx` | [ ] |
| Small chip | `Chip` | `ui/Chip.tsx` (barrel) | [x] |
| Empty data state | `EmptyState` | `shared/EmptyState.tsx` | [ ] |
| Loading spinner | `LoadingState` | `shared/LoadingState.tsx` | [ ] |
| Progress ring | `CircularProgress` | `ui/CircularProgress.tsx` | [ ] |

## Modals & Dialogs

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Generic modal | `Modal` | `ui/Modal.tsx` | [x] |
| Styled modal (brand) | `LegacyModal` | `shared/LegacyModal.tsx` | [ ] |
| Confirm/delete dialog | `ConfirmModal` | `shared/ConfirmModal.tsx` | [ ] |

## Navigation & Menus

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Sidebar menu item | `SidebarMenuItem` | `ui/SidebarMenuItem.tsx` | [x] |
| Expandable menu | `MenuSlider` | `ui/MenuSlider.tsx` | [ ] |
| File/folder tree | `FileTree` | `ui/FileTree.tsx` | [ ] |
| Right-click menu | `ContextMenu` | `ui/ContextMenu.tsx` | [ ] |
| Dropdown menu | `Dropdown` + `DropdownItem` | `ui/Dropdown.tsx` (barrel) | [x] |

## Data Display

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Data table (sort/search/page) | `DataTable` | `shared/DataTable.tsx` | [x] |
| Bar chart | `BarChart` | `charts/BarChart.tsx` | [ ] |
| Line/area chart | `LineChart` | `charts/LineChart.tsx` | [ ] |
| Pie/donut chart | `PieChart` | `charts/PieChart.tsx` | [ ] |
| Heat map | `HeatMapChart` | `charts/HeatMap.tsx` | [ ] |
| Scatter plot | `ScatterPlotChart` | `charts/ScatterPlot.tsx` | [ ] |
| Bubble chart | `BubbleChart` | `charts/BubbleChart.tsx` | [ ] |
| Mekko chart | `MekkoChart` | `charts/MekkoChart.tsx` | [ ] |
| Range bar chart | `RangeBarChart` | `charts/RangeBarChart.tsx` | [ ] |
| Competitive matrix | `CompetitiveMatrix` | `charts/CompetitiveMatrix.tsx` | [ ] |
| Chart wrapper | `ChartContainer` | `charts/ChartContainer.tsx` | [ ] |

## Embeds

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Generic iframe | `EmbedWrapper` | `embeds/EmbedWrapper.tsx` | [ ] |
| Looker dashboard | `LookerStudioEmbed` | `embeds/LookerStudioEmbed.tsx` | [ ] |
| Spreadsheet editor | `FortuneSheetEmbed` | `embeds/FortuneSheetEmbed.tsx` | [ ] |

## Misc

| Need | Component | JF_DASHBOARD Location | In dtgo-wiki |
|------|-----------|----------------------|--------------|
| Theme toggle | `ThemeToggle` | `ui/ThemeToggle.tsx` | [ ] |
| Brand logo | `PWVLogo` | `ui/PWVLogo.tsx` | [ ] |
| Color swatch display | `ColorSwatch` | `shared/ColorSwatch.tsx` | [ ] |
| Auth-protected route | `PrivateRoute` | `shared/PrivateRoute.tsx` | [ ] |

---

**JF_DASHBOARD paths relative to:** `react-canvas/src/components/`
**(barrel) = available via `import { X } from '../../components/ui'` in JF_DASHBOARD**
