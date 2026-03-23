import type { Provider, ProviderColorScheme } from '@/types/models';

/**
 * Color schemes for each AI provider
 * Matches the original CSS from CODE/styles.css lines 1779-1802
 */
export const PROVIDER_COLORS: Record<Provider, ProviderColorScheme> = {
    gemini: {
        text: '#8ab4f8',
        bg: 'rgba(66, 133, 244, 0.15)',
        border: 'rgba(66, 133, 244, 0.3)',
    },
    claude: {
        text: '#ffab91',
        bg: 'rgba(217, 119, 87, 0.15)',
        border: 'rgba(217, 119, 87, 0.3)',
    },
    openai: {
        text: '#50e3c2',
        bg: 'rgba(16, 163, 127, 0.15)',
        border: 'rgba(16, 163, 127, 0.3)',
    },
    grok: {
        text: '#e0e0e0',
        bg: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
    },
    ollama: {
        text: '#7ca0e0',
        bg: 'rgba(124, 160, 224, 0.15)',
        border: 'rgba(124, 160, 224, 0.3)',
    },
};

/**
 * Get color scheme for a provider, with fallback to ollama colors
 */
export function getProviderColors(provider: string): ProviderColorScheme {
    const normalized = provider.replace('@', '').toLowerCase() as Provider;
    return PROVIDER_COLORS[normalized] || PROVIDER_COLORS.ollama;
}

/**
 * Extract provider name from model string
 * e.g., '@gemini' -> 'gemini', 'llama3.1' -> 'ollama'
 */
export function extractProvider(model: string): Provider {
    if (model.startsWith('@')) {
        return model.slice(1).toLowerCase() as Provider;
    }
    // Default to ollama for local models like llama3.1, gemma:2b, etc.
    return 'ollama';
}
