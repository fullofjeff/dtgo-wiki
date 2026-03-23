import { Brain } from 'lucide-react';
import { Toggle } from '@/components/ui';

export interface MemoryToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

/**
 * Toggle for enabling/disabling conversation memory
 * Shows brain icon and label
 */
export function MemoryToggle({ enabled, onChange }: MemoryToggleProps) {
    return (
        <Toggle
            checked={enabled}
            onChange={onChange}
            label="Conversation Memory"
            icon={<Brain className="w-3.5 h-3.5" />}
        />
    );
}
