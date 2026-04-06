import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
    variant?: 'default' | 'inset';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', label, error, helperText, variant = 'default', ...props }, ref) => {

        const isInset = variant === 'inset';

        return (
            <div className="w-full relative">
                {label && !isInset && (
                    <label className="block text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-[var(--text-secondary)] mb-1.5">
                        {label}
                    </label>
                )}

                <div className="relative">
                    {label && isInset && (
                        <label className="absolute left-4 top-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] pointer-events-none">
                            {label}
                        </label>
                    )}
                    <textarea
                        ref={ref}
                        className={`w-full px-3 border border-[var(--border-default)] rounded-[var(--radius-input)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--border-default)] focus:border-[var(--border-default)] transition-colors shadow-[var(--input-shadow,none)] min-h-[100px] resize-y
                            ${isInset ? 'pt-6 pb-2' : 'py-2'}
                            ${error
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : ''
                            }
                            ${className}`}
                        {...props}
                    />
                </div>

                {helperText && !error && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{helperText}</p>
                )}
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
