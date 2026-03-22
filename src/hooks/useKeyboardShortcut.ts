import { useEffect, useCallback } from 'react';

export function useKeyboardShortcut({
  key,
  onKeyDown,
  enabled = true,
  preventDefault = true,
  metaKey = false,
}: {
  key: string;
  onKeyDown: (event: KeyboardEvent) => void;
  enabled?: boolean;
  preventDefault?: boolean;
  metaKey?: boolean;
}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === key && (!metaKey || event.metaKey || event.ctrlKey)) {
        if (preventDefault) event.preventDefault();
        onKeyDown(event);
      }
    },
    [key, onKeyDown, preventDefault, metaKey]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
