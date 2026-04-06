import { useState, useRef, useMemo } from 'react';
import type { Provider } from '@/types/models';
import { Chip, Dropdown, DropdownSeparator, DropdownLabel } from '@/components/ui';
import { ModelVariantList } from './ModelVariantList';
import { ProviderSwitcher } from './ProviderSwitcher';
import { MemoryToggle } from './MemoryToggle';
import { useModelVariantsConfig, getProviderConfig } from '@/lib/useModelVariantsConfig';
import { extractProvider } from '@/lib/providerColors';

export interface ModelChipProps {
    /** Provider name (e.g., 'gemini', 'claude', 'ollama') - takes precedence over model extraction */
    provider?: string;
    /** Current model (e.g., 'gemini-2.0-flash-exp', 'llama3.1') */
    model: string;
    /** Currently selected variant (e.g., 'gemini-2.0-flash-exp') */
    variant?: string | null;
    /** Callback when variant is selected */
    onVariantChange?: (variantId: string) => void;
    /** Callback when provider is switched */
    onProviderChange?: (provider: string) => void;
    /** Whether to show provider switch section */
    enableProviderSwitch?: boolean;
    /** Whether memory is enabled */
    memoryEnabled?: boolean;
    /** Callback when memory is toggled */
    onMemoryToggle?: (enabled: boolean) => void;
    /** Optional class name */
    className?: string;
}

/**
 * Model selection chip with dropdown for variant selection, provider switching, and memory toggle
 * Composes UI primitives for a complete model selection experience
 */
export function ModelChip({
    provider: providerProp,
    model,
    variant,
    onVariantChange,
    onProviderChange,
    enableProviderSwitch = false,
    memoryEnabled = true,
    onMemoryToggle,
    className,
}: ModelChipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const chipRef = useRef<HTMLButtonElement>(null);
    const { config } = useModelVariantsConfig();

    // Use explicit provider if provided, otherwise extract from model string
    const provider = useMemo(
        () => providerProp || extractProvider(model),
        [providerProp, model]
    );

    // Get provider config
    const providerConfig = useMemo(
        () => getProviderConfig(config, provider),
        [config, provider]
    );

    // Available providers for switching
    const availableProviders = useMemo(
        () => (config?.providers ? Object.keys(config.providers) : []),
        [config]
    );

    // Determine if dropdown should be shown
    const hasDropdown = !!(
        (providerConfig?.variants?.length) ||
        (enableProviderSwitch && availableProviders.length > 1) ||
        onMemoryToggle
    );

    // Current selected variant
    const selectedVariant = variant || providerConfig?.default_variant || null;

    // Display label
    const displayLabel = `@${provider}`;

    const handleVariantSelect = (variantId: string) => {
        onVariantChange?.(variantId);
        setIsOpen(false);
    };

    const handleProviderSwitch = (newProvider: string) => {
        onProviderChange?.(newProvider);
        setIsOpen(false);
    };

    return (
        <>
            <Chip
                ref={chipRef}
                label={displayLabel}
                color={provider as Provider}
                onClick={hasDropdown ? () => setIsOpen(!isOpen) : undefined}
                showDropdownIcon={hasDropdown}
                isActive={isOpen}
                className={className}
            />

            <Dropdown
                anchorRef={chipRef}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                width={320}
                maxHeight={400}
            >
                {/* Variant Selection */}
                {providerConfig?.variants && providerConfig.variants.length > 0 && (
                    <ModelVariantList
                        variants={providerConfig.variants}
                        selectedVariant={selectedVariant}
                        defaultVariant={providerConfig.default_variant}
                        onSelect={handleVariantSelect}
                    />
                )}

                {/* Provider Switch Section */}
                {enableProviderSwitch && availableProviders.length > 1 && (
                    <>
                        <DropdownSeparator />
                        <DropdownLabel>Switch Model Family</DropdownLabel>
                        <ProviderSwitcher
                            currentProvider={provider}
                            availableProviders={availableProviders}
                            onSwitch={handleProviderSwitch}
                        />
                    </>
                )}

                {/* Memory Toggle Section */}
                {onMemoryToggle && (
                    <>
                        <DropdownSeparator />
                        <MemoryToggle
                            enabled={memoryEnabled}
                            onChange={onMemoryToggle}
                        />
                    </>
                )}
            </Dropdown>
        </>
    );
}
