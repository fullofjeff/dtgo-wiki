import { useEffect, RefObject } from 'react';

export function useClickOutside({
  ref,
  onClickOutside,
  enabled = true,
}: {
  ref: RefObject<HTMLElement | null>;
  onClickOutside: () => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, onClickOutside, enabled]);
}
