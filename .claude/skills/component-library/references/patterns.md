# Component Patterns

Patterns used in this project. Follow these when creating or adapting components.

## 1. Compound Component Pattern

Used for complex multi-part components. The canonical example is `Modal` (`components/ui/Modal.tsx`).

**Structure:**
```tsx
// 1. Create context for shared state
const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('Modal components must be used within Modal.Root');
  return context;
}

// 2. Define sub-components
function ModalRoot({ open, onClose, children }: ModalRootProps) {
  return (
    <ModalContext.Provider value={{ onClose }}>
      <Transition show={open} as={Fragment}>
        <Dialog onClose={onClose} className="relative z-[10000]">
          {children}
        </Dialog>
      </Transition>
    </ModalContext.Provider>
  );
}

function ModalHeader({ children, showCloseButton = true }: ModalHeaderProps) {
  const { onClose } = useModalContext(); // Access shared state
  // ...
}

// 3. Export as namespace object
export const Modal = {
  Root: ModalRoot,
  Overlay: ModalOverlay,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Body: ModalBody,
  Footer: ModalFooter,
};
```

**Usage:**
```tsx
<Modal.Root open={open} onClose={onClose}>
  <Modal.Overlay />
  <Modal.Content size="lg">
    <Modal.Header>
      <Modal.Title>Title</Modal.Title>
    </Modal.Header>
    <Modal.Body>Content here</Modal.Body>
    <Modal.Footer>Actions here</Modal.Footer>
  </Modal.Content>
</Modal.Root>
```

## 2. Context + Provider Pattern

Used for shared state across component trees. Canonical example: `SidebarContext` (`components/layout/SidebarContext.tsx`).

**Structure:**
```tsx
// 1. Export constants alongside
export const EXPANDED_WIDTH = 260;
export const COLLAPSED_WIDTH = 72;
export const SIDEBAR_SPRING = { type: "spring" as const, stiffness: 300, damping: 35 };

// 2. Define interface
interface SidebarContextValue {
  isExpanded: boolean;
  isPinned: boolean;
  // ...
}

// 3. Create with null default
const SidebarContext = createContext<SidebarContextValue | null>(null);

// 4. Provider with useMemo for stable value
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinnedState] = useState(false);
  // ...
  const value = useMemo(() => ({
    isExpanded, isPinned, /* ... */
  }), [isExpanded, isPinned, /* ... */]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

// 5. Custom hook with null check
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
  return context;
}
```

## 3. forwardRef Pattern

Used for components that need to expose their DOM element. Canonical example: `Chip` (`components/ui/Chip.tsx`).

```tsx
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { label, icon, colorScheme = 'default', onClick, onRemove, ...props },
  ref
) {
  return (
    <button ref={ref} type="button" onClick={onClick} className={clsx(/* ... */)}>
      {/* ... */}
    </button>
  );
});
```

## 4. Portal + Positioning Pattern

Used for dropdowns that need to escape parent overflow. Canonical example: `Dropdown` (`components/ui/Dropdown.tsx`).

```tsx
import { createPortal } from 'react-dom';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';

export function Dropdown({ anchorRef, isOpen, onClose, children, width = 300, maxHeight = 400 }: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(anchorRef, isOpen, width, maxHeight);
  useClickOutside({ ref: dropdownRef, onClickOutside: onClose, enabled: isOpen });

  if (!isOpen) return null;

  return createPortal(
    <div ref={dropdownRef} role="menu" style={{
      position: 'fixed',
      top: position.top,
      left: position.left,
      maxHeight: position.maxHeight,
      transformOrigin: position.transformOrigin,
      zIndex: 10001,
    }}>
      {children}
    </div>,
    document.body
  );
}
```

**Key hooks used together:**
- `useDropdownPosition(anchorRef, isOpen, width, height, gap)` — returns `{ top, left, maxHeight, transformOrigin }`
- `useClickOutside({ ref, onClickOutside, enabled })` — closes on outside click

## 5. Framer Motion Patterns

Three animation patterns used in this project:

### AnimatePresence for conditional rendering
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isExpanded && (
    <motion.span
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'auto' }}
      exit={{ opacity: 0, width: 0 }}
    >
      {label}
    </motion.span>
  )}
</AnimatePresence>
```

### Spring transitions for layout
```tsx
const SIDEBAR_SPRING = { type: "spring", stiffness: 300, damping: 35 };

<motion.nav
  animate={{ width: visualWidth }}
  transition={SIDEBAR_SPRING}
>
```

### FormSection collapse
```tsx
<motion.div
  initial={false}
  animate={{ height: isOpen ? 'auto' : 0 }}
  transition={{ duration: 0.2 }}
  style={{ overflow: 'hidden' }}
>
```

## 6. Style Application Order

Prefer in this order:

1. **Tailwind utility classes** via `clsx()` — preferred for most styling
   ```tsx
   className={clsx('flex items-center gap-2 text-sm', isActive && 'ring-1 ring-white/30')}
   ```

2. **CSS custom properties** via `style={{}}` — for dynamic values and design tokens
   ```tsx
   style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
   ```

3. **CSS files** — only for complex pseudo-selectors, prose styles, or third-party overrides
   ```tsx
   import './inline-edit.css';
   ```

Use `cn()` from `@/utils/cn` (clsx + tailwind-merge) when merging user-provided `className` with defaults.

## 7. Entity Accent Pattern

Per-entity branding uses the `.accent-top` CSS class with inline `borderColor`:

```tsx
<div className="wiki-card accent-top" style={{ borderColor: entity.color }}>
```

Entity color mapping:
```tsx
const colorMap: Record<string, string> = {
  DTGO: 'var(--dtgo-green)',
  MQDC: 'var(--mqdc-blue)',
  'T&B': 'var(--tnb-orange)',
  DTP: 'var(--dtp-pink)',
};
```

Badge classes: `.badge-dtgo`, `.badge-mqdc`, `.badge-tnb`, `.badge-dtp`, `.badge-default`
