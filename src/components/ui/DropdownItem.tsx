import type { ReactNode } from 'react';

export interface DropdownItemProps {
    children: ReactNode;
    onClick?: () => void;
    isSelected?: boolean;
    isDisabled?: boolean;
    className?: string;
}

export function DropdownItem({
    children,
    onClick,
    isSelected = false,
    isDisabled = false,
    className,
}: DropdownItemProps) {
    return (
        <div
            role="menuitem"
            tabIndex={isDisabled ? -1 : 0}
            onClick={isDisabled ? undefined : onClick}
            onKeyDown={(e) => {
                if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            className={className}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '4px',
                transition: 'background 0.2s',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                backgroundColor: isSelected ? 'rgba(100,140,220,0.15)' : 'transparent',
                border: isSelected ? '1px solid rgba(100,140,220,0.3)' : '1px solid transparent',
            }}
            onMouseEnter={(e) => {
                if (!isSelected && !isDisabled) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected && !isDisabled) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }}
        >
            {children}
        </div>
    );
}
