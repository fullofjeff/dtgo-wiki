import { memo, type ReactNode } from 'react';
import clsx from 'clsx';
import {
    resolveChipStyle,
    getDotColor,
    BADGE_SIZE_MAP,
    type ChipColor,
    type ChipVariant,
    type ChipSize,
} from './chipVariants';

export interface BadgeProps {
    children: ReactNode;
    color?: ChipColor;
    variant?: ChipVariant;
    size?: ChipSize;
    /** Colored dot indicator. `true` = match color, string = custom hex. */
    dot?: boolean | string;
    /** Leading icon (ReactNode). Overridden by `avatar` if both provided. */
    icon?: ReactNode;
    /** Leading avatar. String = img src, ReactNode = custom element. */
    avatar?: string | ReactNode;
    /** Uppercase text transform. @default true */
    uppercase?: boolean;
    className?: string;
}

/**
 * Static display badge for status indicators, labels, and tags.
 * Used in tables, node headers, dropdowns, and modals.
 */
export const Badge = memo(function Badge({
    children,
    color = 'default',
    variant = 'soft',
    size = 'sm',
    dot,
    icon,
    avatar,
    uppercase = true,
    className,
}: BadgeProps) {
    const { classes, vars } = resolveChipStyle(color, variant);
    const sizeConfig = BADGE_SIZE_MAP[size];

    // Leading content priority: avatar > icon > dot
    let leading: ReactNode = null;
    if (avatar) {
        leading = typeof avatar === 'string' ? (
            <img
                src={avatar}
                alt=""
                className={clsx('rounded-full object-cover shrink-0', sizeConfig.avatar)}
            />
        ) : (
            <span className={clsx('shrink-0', sizeConfig.avatar)}>{avatar}</span>
        );
    } else if (icon) {
        leading = <span className={clsx('shrink-0 flex items-center', sizeConfig.icon)}>{icon}</span>;
    } else if (dot) {
        const dotColor = typeof dot === 'string' ? dot : getDotColor(color);
        leading = (
            <span
                className={clsx('rounded-full shrink-0', sizeConfig.dot)}
                style={{ backgroundColor: dotColor }}
            />
        );
    }

    return (
        <span
            className={clsx(
                'inline-flex items-center font-semibold border whitespace-nowrap shrink-0 select-none',
                sizeConfig.container,
                classes,
                uppercase && 'uppercase tracking-wide',
                className,
            )}
            style={vars as React.CSSProperties | undefined}
        >
            {leading}
            {children}
        </span>
    );
});
