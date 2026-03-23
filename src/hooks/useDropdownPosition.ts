import { useState, useEffect, type RefObject } from 'react';

export interface DropdownPosition {
    top: number;
    left: number;
    maxHeight: number;
    transformOrigin: string;
}

export function useDropdownPosition(
    anchorRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    dropdownWidth: number = 300,
    dropdownHeight: number = 400,
    gap: number = 8
): DropdownPosition {
    const [position, setPosition] = useState<DropdownPosition>({
        top: 0,
        left: 0,
        maxHeight: dropdownHeight,
        transformOrigin: 'top left',
    });

    useEffect(() => {
        if (!isOpen || !anchorRef.current) return;

        const calculatePosition = () => {
            const rect = anchorRef.current!.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            const spaceBelow = viewportHeight - rect.bottom - gap;
            const spaceAbove = rect.top - gap;

            let top: number;
            let maxHeight: number;
            let transformOrigin: string;

            if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
                top = rect.bottom + gap;
                maxHeight = Math.min(dropdownHeight, spaceBelow - 10);
                transformOrigin = 'top left';
            } else {
                top = rect.top - Math.min(dropdownHeight, spaceAbove - 10) - gap;
                maxHeight = Math.min(dropdownHeight, spaceAbove - 10);
                transformOrigin = 'bottom left';

                if (top < 10) {
                    top = 10;
                    maxHeight = rect.top - 18;
                }
            }

            let left = rect.left;

            if (left + dropdownWidth > viewportWidth) {
                left = viewportWidth - dropdownWidth - 10;
            }

            if (left < 10) {
                left = 10;
            }

            setPosition({ top, left, maxHeight, transformOrigin });
        };

        calculatePosition();

        window.addEventListener('scroll', calculatePosition, true);
        window.addEventListener('resize', calculatePosition);

        return () => {
            window.removeEventListener('scroll', calculatePosition, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen, anchorRef, dropdownWidth, dropdownHeight, gap]);

    return position;
}
