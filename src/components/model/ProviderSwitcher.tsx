import type { Provider } from '@/types/models';
import { DropdownItem } from '@/components/ui';
import { getProviderColors } from '@/lib/providerColors';

export interface ProviderSwitcherProps {
    currentProvider: string;
    availableProviders: string[];
    onSwitch: (provider: string) => void;
}

/**
 * Section for switching between AI providers
 * Displays other available providers with color coding
 */
export function ProviderSwitcher({
    currentProvider,
    availableProviders,
    onSwitch,
}: ProviderSwitcherProps) {
    // Filter out current provider
    const otherProviders = availableProviders.filter(
        (p) => p.toLowerCase() !== currentProvider.toLowerCase()
    );

    if (otherProviders.length === 0) return null;

    return (
        <>
            {otherProviders.map((provider) => {
                const colors = getProviderColors(provider as Provider);
                const displayName = provider.charAt(0).toUpperCase() + provider.slice(1);

                return (
                    <DropdownItem
                        key={provider}
                        onClick={() => onSwitch(provider)}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colors.text }}
                            />
                            <span className="text-sm font-medium text-white/90">
                                {displayName}
                            </span>
                        </div>
                    </DropdownItem>
                );
            })}
        </>
    );
}
