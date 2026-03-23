import { forwardRef, type ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';
import type { Provider } from '@/types/models';
import { getProviderColors } from '@/lib/providerColors';

export interface ChipProps {
    label: string;
    icon?: ReactNode;
    colorScheme?: Provider | 'default';
    onClick?: () => void;
    onRemove?: () => void;
    showDropdownIcon?: boolean;
    isActive?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Base chip component with customizable colors and optional dropdown/remove buttons
 * Used as the foundation for model chips and other tag-like elements
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
    {
        label,
        icon,
        colorScheme = 'default',
        onClick,
        onRemove,
        showDropdownIcon = false,
        isActive = false,
        className,
        style,
    },
    ref
) {
    const colors = colorScheme === 'default'
        ? { text: '#ebe7c7', bg: 'rgba(216, 131, 10, 0.15)', border: 'rgba(216, 131, 10, 0.3)' }
        : getProviderColors(colorScheme);

    const isClickable = !!onClick;

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            className={clsx(
                'inline-flex items-center justify-center text-xs font-medium',
                'border transition-all select-none',
                isClickable && 'cursor-pointer hover:brightness-110',
                !isClickable && 'cursor-default',
                isActive && 'ring-1 ring-white/30',
                className
            )}
            style={{
                color: colors.text,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                padding: '6px 10px 6px 12px',
                borderRadius: '20px',
                gap: '6px',
                ...style,
            }}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}

            <span className="truncate">{label}</span>

            {showDropdownIcon && (
                <ChevronDown
                    className={clsx(
                        'w-3 h-3 opacity-60 transition-transform flex-shrink-0',
                        isActive && 'rotate-180'
                    )}
                />
            )}

            {onRemove && (
                <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            e.preventDefault();
                            onRemove();
                        }
                    }}
                    className="ml-0.5 hover:bg-white/10 rounded p-0.5 transition-colors"
                >
                    <X className="w-3 h-3" />
                </span>
            )}
        </button>
    );
});
