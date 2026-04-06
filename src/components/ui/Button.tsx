import React from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-[var(--jf-lavender)] text-[#0f0f0f] uppercase tracking-[0.1em] text-[11px] rounded-full border border-[var(--jf-lavender)] hover:brightness-90",
    secondary: "bg-transparent text-[var(--jf-lavender)] uppercase tracking-[0.1em] text-[11px] rounded-full border border-[var(--jf-lavender)]/30 hover:bg-[var(--jf-lavender)] hover:text-[#0f0f0f] hover:border-transparent hover:shadow-[0_4px_12px_rgba(201,207,233,0.4)]",
    ghost: "bg-[var(--jf-lavender)]/10 text-[var(--jf-lavender)] uppercase tracking-[0.15em] text-[11px] rounded-full border border-[var(--jf-lavender)]/20 hover:bg-[var(--jf-lavender)]/20",
    danger: "bg-[var(--dtp-pink)] text-white uppercase tracking-[0.1em] text-[11px] rounded-full border border-[var(--dtp-pink)] hover:brightness-90",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "py-2 px-6",
    md: "py-2.5 px-10",
    lg: "py-5 px-12 text-[12px]",
    icon: "p-2 aspect-square"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, ...props }, ref) => {

        const baseStyles = "group transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
        const variantStyle = variantStyles[variant] || variantStyles.primary;
        const sizeStyle = sizeStyles[size];

        const classes = cn(
            baseStyles,
            variantStyle,
            sizeStyle,
            className
        );

        return (
            <button
                ref={ref}
                className={classes}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {!isLoading && leftIcon}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
