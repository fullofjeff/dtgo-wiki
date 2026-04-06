import { memo, forwardRef, type ReactNode, type CSSProperties } from 'react';
import { ChevronDown, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
    resolveChipStyle,
    getDotColor,
    CHIP_SIZE_MAP,
    type ChipColor,
    type ChipVariant,
    type ChipSize,
    type ChipStatus,
} from './chipVariants';

export interface ChipProps {
    label: string;
    color?: ChipColor;
    variant?: ChipVariant;
    size?: ChipSize;

    // ── Content slots ──
    /** Leading icon (shorthand). Overridden by `startContent` or `avatar`. */
    icon?: ReactNode;
    /** Leading avatar. String = img src, ReactNode = custom. */
    avatar?: string | ReactNode;
    /** Colored dot indicator. `true` = match color, string = custom hex. */
    dot?: boolean | string;
    /** Full control over leading slot — overrides icon/avatar/dot. */
    startContent?: ReactNode;
    /** Content after label, before close/dropdown icons. */
    endContent?: ReactNode;

    // ── States ──
    /** Visual selected state for filter/toggle chips. */
    selected?: boolean;
    disabled?: boolean;
    /**
     * Animated status indicator. Controls the leading icon animation.
     * - `'processing'` — spinner replaces leading content
     * - `'success'` — check icon with green flash
     * - `'error'` — alert icon with red flash + shake
     *
     * Status is controlled — parent owns the state machine.
     * For React Flow nodes, wrap `onClick`/`onClose` in `useCallback` to preserve React.memo benefit.
     */
    status?: ChipStatus;

    // ── Interactions ──
    onClick?: () => void;
    /** Renders dismiss (X) button. Uses stopPropagation to avoid triggering parent click. */
    onClose?: () => void;
    showDropdownIcon?: boolean;
    isActive?: boolean;

    className?: string;
    style?: CSSProperties;
}

/**
 * Interactive chip component for tags, filters, model selection, and dismissible items.
 * Supports status animations, dismiss, dropdown trigger, and content slots.
 */
export const Chip = memo(forwardRef<HTMLButtonElement, ChipProps>(function Chip(
    {
        label,
        color = 'default',
        variant = 'soft',
        size = 'md',
        icon,
        avatar,
        dot,
        startContent,
        endContent,
        selected = false,
        disabled = false,
        status,
        onClick,
        onClose,
        showDropdownIcon = false,
        isActive = false,
        className,
        style,
    },
    ref,
) {
    const { classes, vars } = resolveChipStyle(color, variant);
    const sizeConfig = CHIP_SIZE_MAP[size];
    const isClickable = !!onClick && !disabled;

    // ── Resolve leading content ──
    // Priority: status icon > startContent > avatar > icon > dot
    let leading: ReactNode = null;

    if (status && status !== 'idle') {
        // Status overrides all other leading content with animated icon
        const statusIcons: Record<Exclude<ChipStatus, 'idle'>, ReactNode> = {
            processing: <Loader2 className={clsx(sizeConfig.icon, 'animate-spin')} />,
            success: <Check className={sizeConfig.icon} />,
            error: <AlertCircle className={sizeConfig.icon} />,
        };
        leading = (
            <AnimatePresence mode="wait">
                <motion.span
                    key={status}
                    className="shrink-0 flex items-center"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.15 }}
                >
                    {statusIcons[status]}
                </motion.span>
            </AnimatePresence>
        );
    } else if (startContent) {
        leading = <span className="shrink-0 flex items-center">{startContent}</span>;
    } else if (avatar) {
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

    // ── Status flash classes ──
    const statusClasses =
        status === 'success' ? 'ring-1 ring-green-400/50' :
        status === 'error' ? 'ring-1 ring-red-400/50 animate-[shake_0.3s_ease-in-out]' :
        '';

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                'inline-flex items-center justify-center font-medium border transition-all select-none',
                sizeConfig.container,
                classes,
                isClickable && 'cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.03]',
                !isClickable && 'cursor-default',
                selected && 'ring-1 ring-white/30',
                isActive && !selected && 'ring-1 ring-white/20',
                disabled && 'opacity-50 pointer-events-none',
                statusClasses,
                className,
            )}
            style={{ ...vars, ...style } as CSSProperties}
        >
            {leading}

            <span className="truncate">{label}</span>

            {endContent && (
                <span className="shrink-0 flex items-center">{endContent}</span>
            )}

            {showDropdownIcon && (
                <ChevronDown
                    className={clsx(
                        sizeConfig.close,
                        'opacity-60 transition-transform shrink-0',
                        isActive && 'rotate-180',
                    )}
                />
            )}

            {onClose && (
                <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Backspace' || e.key === 'Delete') {
                            e.stopPropagation();
                            e.preventDefault();
                            onClose();
                        }
                    }}
                    className="ml-0.5 hover:bg-white/10 rounded p-0.5 transition-colors shrink-0"
                >
                    <X className={sizeConfig.close} />
                </span>
            )}
        </button>
    );
}));
