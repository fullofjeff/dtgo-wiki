import type { ReactNode } from 'react';

export interface BadgeProps {
    variant: 'default' | 'selected' | 'info';
    children: ReactNode;
    className?: string;
}

/**
 * Badge component for status indicators
 * Used for DEFAULT, SELECTED badges in dropdowns
 */
const variantStyles = {
    default: {
        backgroundColor: 'rgba(216,131,10,0.2)',
        color: '#d8830a',
        border: '1px solid rgba(216,131,10,0.3)',
    },
    selected: {
        backgroundColor: 'rgba(100,140,220,0.2)',
        color: '#7ca0e0',
        border: '1px solid rgba(100,140,220,0.3)',
    },
    info: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
    },
};

export function Badge({ variant, children, className }: BadgeProps) {
    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 8px',
                fontSize: '0.65rem',
                fontWeight: 600,
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                ...variantStyles[variant],
            }}
        >
            {children}
        </span>
    );
}
