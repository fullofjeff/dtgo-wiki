import type { ModelVariant } from '@/types/models';
import { DropdownItem, Badge } from '@/components/ui';

export interface ModelVariantListProps {
    variants: ModelVariant[];
    selectedVariant: string | null;
    defaultVariant: string;
    onSelect: (variantId: string) => void;
}

/**
 * List of model variants for selection
 * Shows name, id, description with DEFAULT/SELECTED badges
 */
export function ModelVariantList({
    variants,
    selectedVariant,
    defaultVariant,
    onSelect,
}: ModelVariantListProps) {
    return (
        <>
            {variants.map((variant) => {
                const isSelected = variant.id === selectedVariant;
                const isDefault = variant.id === defaultVariant;

                return (
                    <DropdownItem
                        key={variant.id}
                        isSelected={isSelected}
                        onClick={() => onSelect(variant.id)}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white/90 mb-0.5">
                                {variant.name}
                            </div>
                            <div className="text-[0.7rem] text-white/50 font-mono truncate">
                                {variant.id}
                            </div>
                            {variant.description && (
                                <div className="text-xs text-white/60 mt-1 leading-snug">
                                    {variant.description}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {isDefault && <Badge variant="default">DEFAULT</Badge>}
                            {isSelected && <Badge variant="selected">✓</Badge>}
                        </div>
                    </DropdownItem>
                );
            })}
        </>
    );
}
