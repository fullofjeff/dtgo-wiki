/**
 * Model variants configuration types
 * Matches the structure from localStorage 'model_variants_config'
 */

export interface ModelVariant {
    id: string;
    name: string;
    description?: string;
}

export interface ProviderConfig {
    display_name: string;
    default_variant: string;
    variants: ModelVariant[];
}

export interface ModelVariantsConfig {
    providers: Record<string, ProviderConfig>;
}

export type Provider = 'gemini' | 'claude' | 'openai' | 'grok' | 'ollama';

export interface ProviderColorScheme {
    text: string;
    bg: string;
    border: string;
}
