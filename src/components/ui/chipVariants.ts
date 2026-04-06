import type { Provider, ProviderColorScheme } from '@/types/models';
import { PROVIDER_COLORS } from '@/lib/providerColors';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ChipColorIntent = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';
export type EntityColor = 'dtgo' | 'mqdc' | 'tnb' | 'dtp';
export type ChipColor =
    | ChipColorIntent
    | Provider
    | EntityColor
    | { text: string; bg: string; border: string };

export type ChipVariant = 'soft' | 'outline' | 'solid';
export type ChipSize = 'xs' | 'sm' | 'md';
export type ChipStatus = 'idle' | 'processing' | 'success' | 'error';

// ── Color definitions ──────────────────────────────────────────────────────────

/** Semantic colors — pure Tailwind classes, no inline styles */
const SEMANTIC_COLORS: Record<ChipColorIntent, { text: string; bg: string; border: string }> = {
    default: { text: 'text-[var(--jf-cream)]', bg: 'bg-[var(--jf-gold)]/15', border: 'border-[var(--jf-gold)]/30' },
    success: { text: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' },
    warning: { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
    error: { text: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
    info: { text: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
    neutral: { text: 'text-gray-300', bg: 'bg-white/5', border: 'border-white/10' },
    accent: { text: 'text-[var(--jf-lavender)]', bg: 'bg-[var(--jf-lavender)]/15', border: 'border-[var(--jf-lavender)]/30' },
};

/** Entity brand colors — CSS variable bridge */
const ENTITY_COLORS: Record<EntityColor, ProviderColorScheme> = {
    dtgo: { text: '#22c997', bg: 'rgba(34, 201, 151, 0.15)', border: 'rgba(34, 201, 151, 0.3)' },
    mqdc: { text: '#4f8cff', bg: 'rgba(79, 140, 255, 0.15)', border: 'rgba(79, 140, 255, 0.3)' },
    tnb: { text: '#f5a623', bg: 'rgba(245, 166, 35, 0.15)', border: 'rgba(245, 166, 35, 0.3)' },
    dtp: { text: '#e84393', bg: 'rgba(232, 67, 147, 0.15)', border: 'rgba(232, 67, 147, 0.3)' },
};

// ── Variant modifiers (applied on top of color for solid/outline) ──────────────

const SOLID_OVERRIDES: Record<string, string> = {
    default: 'bg-[var(--jf-gold)] text-[#191918] border-[var(--jf-gold)]',
    success: 'bg-green-500 text-white border-green-500',
    warning: 'bg-amber-500 text-[#191918] border-amber-500',
    error: 'bg-red-500 text-white border-red-500',
    info: 'bg-blue-500 text-white border-blue-500',
    neutral: 'bg-gray-600 text-white border-gray-600',
    accent: 'bg-[var(--jf-lavender)] text-[#191918] border-[var(--jf-lavender)]',
};

// ── Size definitions ───────────────────────────────────────────────────────────

interface SizeConfig {
    container: string;
    icon: string;
    avatar: string;
    dot: string;
    close: string;
}

/** Badge sizes — rounded rectangle, compact padding */
export const BADGE_SIZE_MAP: Record<ChipSize, SizeConfig> = {
    xs: {
        container: 'text-[0.65rem] px-2 py-0.5 gap-1 rounded leading-tight',
        icon: 'w-3 h-3',
        avatar: 'w-4 h-4',
        dot: 'w-1.5 h-1.5',
        close: 'w-3 h-3',
    },
    sm: {
        container: 'text-xs px-2.5 py-1 gap-1.5 rounded-md leading-tight',
        icon: 'w-3.5 h-3.5',
        avatar: 'w-5 h-5',
        dot: 'w-1.5 h-1.5',
        close: 'w-3 h-3',
    },
    md: {
        container: 'text-sm px-3 py-1.5 gap-2 rounded-lg',
        icon: 'w-4 h-4',
        avatar: 'w-6 h-6',
        dot: 'w-2 h-2',
        close: 'w-3.5 h-3.5',
    },
};

/** Chip sizes — pill shape, more vertical padding for even hover coverage */
export const CHIP_SIZE_MAP: Record<ChipSize, SizeConfig> = {
    xs: {
        container: 'text-[0.65rem] px-2.5 py-1 gap-1 rounded-full leading-tight',
        icon: 'w-3 h-3',
        avatar: 'w-4 h-4',
        dot: 'w-1.5 h-1.5',
        close: 'w-3 h-3',
    },
    sm: {
        container: 'text-xs px-3 py-1.5 gap-1.5 rounded-full leading-tight',
        icon: 'w-3.5 h-3.5',
        avatar: 'w-5 h-5',
        dot: 'w-1.5 h-1.5',
        close: 'w-3 h-3',
    },
    md: {
        container: 'text-sm px-4 py-2 gap-2 rounded-full',
        icon: 'w-4 h-4',
        avatar: 'w-6 h-6',
        dot: 'w-2 h-2',
        close: 'w-3.5 h-3.5',
    },
};

/** @deprecated Use BADGE_SIZE_MAP or CHIP_SIZE_MAP instead */
export const SIZE_MAP = BADGE_SIZE_MAP;

// ── Resolver ───────────────────────────────────────────────────────────────────

export interface ChipStyle {
    /** Tailwind classes to apply */
    classes: string;
    /** CSS custom properties for dynamic colors (provider/entity/custom) */
    vars?: Record<string, string>;
}

const DYNAMIC_BASE = 'text-[var(--chip-text)] bg-[var(--chip-bg)] border-[var(--chip-border)]';

function toCssVars(colors: ProviderColorScheme): Record<string, string> {
    return { '--chip-text': colors.text, '--chip-bg': colors.bg, '--chip-border': colors.border };
}

/**
 * Resolve chip color + variant into Tailwind classes and optional CSS variables.
 */
export function resolveChipStyle(color: ChipColor = 'default', variant: ChipVariant = 'soft'): ChipStyle {
    // Custom object colors — always use CSS variable bridge
    if (typeof color === 'object') {
        if (variant === 'outline') {
            return {
                classes: 'text-[var(--chip-text)] bg-transparent border-[var(--chip-border)]',
                vars: toCssVars(color),
            };
        }
        // solid not supported for custom colors — fall back to soft
        return { classes: DYNAMIC_BASE, vars: toCssVars(color) };
    }

    // Semantic colors — pure Tailwind classes
    if (color in SEMANTIC_COLORS) {
        const key = color as ChipColorIntent;
        if (variant === 'solid' && key in SOLID_OVERRIDES) {
            return { classes: SOLID_OVERRIDES[key] };
        }
        if (variant === 'outline') {
            const c = SEMANTIC_COLORS[key];
            return { classes: `${c.text} bg-transparent ${c.border}` };
        }
        const c = SEMANTIC_COLORS[key];
        return { classes: `${c.text} ${c.bg} ${c.border}` };
    }

    // Provider colors — CSS variable bridge
    if (color in PROVIDER_COLORS) {
        const colors = PROVIDER_COLORS[color as Provider];
        if (variant === 'outline') {
            return {
                classes: 'text-[var(--chip-text)] bg-transparent border-[var(--chip-border)]',
                vars: toCssVars(colors),
            };
        }
        return { classes: DYNAMIC_BASE, vars: toCssVars(colors) };
    }

    // Entity colors — CSS variable bridge
    if (color in ENTITY_COLORS) {
        const colors = ENTITY_COLORS[color as EntityColor];
        if (variant === 'outline') {
            return {
                classes: 'text-[var(--chip-text)] bg-transparent border-[var(--chip-border)]',
                vars: toCssVars(colors),
            };
        }
        return { classes: DYNAMIC_BASE, vars: toCssVars(colors) };
    }

    // Fallback to default
    const c = SEMANTIC_COLORS.default;
    return { classes: `${c.text} ${c.bg} ${c.border}` };
}

/**
 * Get the dot color for a given ChipColor.
 * Returns a CSS color string for inline style on the dot element.
 */
export function getDotColor(color: ChipColor = 'default'): string {
    if (typeof color === 'object') return color.text;
    if (color in SEMANTIC_COLORS) {
        // Map semantic intents to concrete hex values for the dot
        const DOT_COLORS: Record<ChipColorIntent, string> = {
            default: 'var(--jf-gold)',
            success: '#4ade80',
            warning: '#fbbf24',
            error: '#f87171',
            info: '#60a5fa',
            neutral: '#9ca3af',
            accent: 'var(--jf-lavender)',
        };
        return DOT_COLORS[color as ChipColorIntent];
    }
    if (color in PROVIDER_COLORS) return PROVIDER_COLORS[color as Provider].text;
    if (color in ENTITY_COLORS) return ENTITY_COLORS[color as EntityColor].text;
    return 'var(--jf-gold)';
}
