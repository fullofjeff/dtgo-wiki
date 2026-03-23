import { useState, useEffect, useCallback } from 'react';
import type { ModelVariantsConfig } from '@/types/models';

const STORAGE_KEY = 'model_variants_config';

export interface UseModelVariantsConfigReturn {
    config: ModelVariantsConfig | null;
    isLoading: boolean;
    error: Error | null;
    refresh: () => void;
}

/**
 * Hook to load model variants configuration from localStorage
 * The config is cached in localStorage by the main dashboard
 */
export function useModelVariantsConfig(): UseModelVariantsConfigReturn {
    const [config, setConfig] = useState<ModelVariantsConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadConfig = useCallback(() => {
        setIsLoading(true);
        setError(null);

        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached) as ModelVariantsConfig;
                setConfig(parsed);
            } else {
                setConfig(null);
            }
        } catch (e) {
            console.error('[useModelVariantsConfig] Failed to load config:', e);
            setError(e instanceof Error ? e : new Error('Failed to parse config'));
            setConfig(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load on mount
    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // Listen for storage changes (in case config is updated elsewhere)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                loadConfig();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadConfig]);

    return {
        config,
        isLoading,
        error,
        refresh: loadConfig,
    };
}

/**
 * Get provider config by name
 */
export function getProviderConfig(config: ModelVariantsConfig | null, provider: string) {
    if (!config?.providers) return null;
    const normalized = provider.replace('@', '').toLowerCase();
    return config.providers[normalized] || null;
}
