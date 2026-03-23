import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    icon?: ReactNode;
    className?: string;
}

/**
 * Toggle switch component with optional label and icon
 * Used for settings like conversation memory
 */
export function Toggle({ checked, onChange, label, icon, className }: ToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={clsx(
                'flex items-center justify-between w-full px-3 py-2 rounded-md',
                'hover:bg-white/5 transition-colors cursor-pointer',
                className
            )}
        >
            <div className="flex items-center gap-2">
                {icon && (
                    <span className="text-white/60">{icon}</span>
                )}
                {label && (
                    <span className="text-sm font-medium text-white/90">{label}</span>
                )}
            </div>

            {/* Toggle switch */}
            <div
                className={clsx(
                    'relative w-9 h-5 rounded-full transition-colors',
                    checked ? 'bg-[#d8830a]' : 'bg-white/20'
                )}
            >
                <div
                    className={clsx(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        checked ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                />
            </div>
        </button>
    );
}
