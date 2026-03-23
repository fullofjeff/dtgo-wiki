import { useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';

export interface DropdownProps {
    anchorRef: RefObject<HTMLElement | null>;
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    width?: number;
    maxHeight?: number;
}

/**
 * Portal-based dropdown container with smart positioning
 * Renders to document.body to avoid clipping by parent overflow
 * Handles click-outside and escape key to close
 */
export function Dropdown({
    anchorRef,
    isOpen,
    onClose,
    children,
    className,
    width = 300,
    maxHeight = 400,
}: DropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const position = useDropdownPosition(anchorRef, isOpen, width, maxHeight);

    useClickOutside({ ref: dropdownRef, onClickOutside: onClose, enabled: isOpen });

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            role="menu"
            className={clsx(
                'model-dropdown',
                'fixed overflow-y-auto',
                'animate-dropdown-enter',
                className
            )}
            style={{
                top: position.top,
                left: position.left,
                width,
                maxHeight: position.maxHeight,
                transformOrigin: position.transformOrigin,
                zIndex: 10001,
                padding: '12px',
                backgroundColor: 'rgba(20,20,20,0.98)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
        >
            {children}
        </div>,
        document.body
    );
}

/**
 * Separator for dividing dropdown sections
 */
export function DropdownSeparator() {
    return <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }} />;
}

/**
 * Label for dropdown sections
 */
export function DropdownLabel({ children }: { children: ReactNode }) {
    return (
        <div style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.025em'
        }}>
            {children}
        </div>
    );
}
