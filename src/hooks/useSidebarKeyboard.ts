import { useEffect } from 'react';
import { useSidebar } from '../components/layout/SidebarContext';

export function useSidebarKeyboard() {
    const { setPinnedClosed } = useSidebar();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key === '[') {
                setPinnedClosed(true);
            } else if (e.key === ']') {
                setPinnedClosed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setPinnedClosed]);
}
