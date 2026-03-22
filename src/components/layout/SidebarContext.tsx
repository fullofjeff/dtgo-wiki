import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const EXPANDED_WIDTH = 260;
export const COLLAPSED_WIDTH = 72;
export const SIDEBAR_SPRING = { type: "spring" as const, stiffness: 300, damping: 35 };

interface SidebarContextValue {
    isExpanded: boolean;
    isPinned: boolean;
    isPinnedClosed: boolean;
    isHovering: boolean;
    visualWidth: number;
    layoutWidth: number;
    setHovering: (hovering: boolean) => void;
    togglePin: () => void;
    togglePinClosed: () => void;
    setPinnedClosed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isPinned, setIsPinnedState] = useState(false);
    const [isPinnedClosed, setIsPinnedClosedState] = useState(false);
    const [isHovering, setHovering] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-pinned');
        if (saved !== null) setIsPinnedState(saved === 'true');
        const savedClosed = localStorage.getItem('sidebar-pinned-closed');
        if (savedClosed !== null) setIsPinnedClosedState(savedClosed === 'true');
    }, []);

    const togglePin = useCallback(() => {
        setIsPinnedState(current => {
            const next = !current;
            localStorage.setItem('sidebar-pinned', String(next));
            // Unpin closed when pinning open
            if (next) {
                setIsPinnedClosedState(false);
                localStorage.setItem('sidebar-pinned-closed', 'false');
            }
            return next;
        });
    }, []);

    const setPinnedClosed = useCallback((value: boolean) => {
        setIsPinnedClosedState(value);
        localStorage.setItem('sidebar-pinned-closed', String(value));
        // Unpin open when pinning closed
        if (value) {
            setIsPinnedState(false);
            localStorage.setItem('sidebar-pinned', 'false');
        }
    }, []);

    const togglePinClosed = useCallback(() => {
        setIsPinnedClosedState(current => {
            const next = !current;
            localStorage.setItem('sidebar-pinned-closed', String(next));
            if (next) {
                setIsPinnedState(false);
                localStorage.setItem('sidebar-pinned', 'false');
            }
            return next;
        });
    }, []);

    const isExpanded = isPinned || (isHovering && !isPinnedClosed);
    const visualWidth = isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
    const layoutWidth = isPinned ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

    const value = useMemo(() => ({
        isExpanded,
        isPinned,
        isPinnedClosed,
        isHovering,
        visualWidth,
        layoutWidth,
        setHovering,
        togglePin,
        togglePinClosed,
        setPinnedClosed,
    }), [isExpanded, isPinned, isPinnedClosed, isHovering, visualWidth, layoutWidth, togglePin, togglePinClosed, setPinnedClosed]);

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
    return context;
}
