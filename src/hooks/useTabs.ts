import { useState, useCallback, useEffect } from 'react';
import type { TabData } from '../components/tab-ui/types';

export interface UseTabsOptions {
  defaultTabs?: TabData[];
  initialActiveTabId?: string;
  syncWithVanillaJS?: boolean;
}

export function useTabs(options: UseTabsOptions = {}) {
  const [tabs, setTabs] = useState<TabData[]>(options.defaultTabs || []);
  const [activeTabId, setActiveTabId] = useState<string>(options.initialActiveTabId || '');

  // Sync with vanilla JS via custom events (for migration period)
  useEffect(() => {
    if (!options.syncWithVanillaJS) return;

    const handleExternalTabChange = (e: CustomEvent<{ tabId: string }>) => {
      setActiveTabId(e.detail.tabId);
    };

    window.addEventListener('dashboard-tab-change', handleExternalTabChange as EventListener);
    return () => {
      window.removeEventListener('dashboard-tab-change', handleExternalTabChange as EventListener);
    };
  }, [options.syncWithVanillaJS]);

  const addTab = useCallback((tab: TabData, addOptions?: { background?: boolean }) => {
    setTabs(prev => [...prev, tab]);
    if (!addOptions?.background) {
      setActiveTabId(tab.id);
    }
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const index = prev.findIndex(t => t.id === tabId);
      if (index === -1) return prev;

      const newTabs = prev.filter(t => t.id !== tabId);

      // If removing active tab, switch to adjacent
      if (tabId === activeTabId && newTabs.length > 0) {
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }

      return newTabs;
    });
  }, [activeTabId]);

  const reorderTabs = useCallback((originIndex: number, destinationIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev];
      const [movedTab] = newTabs.splice(originIndex, 1);
      newTabs.splice(destinationIndex, 0, movedTab);
      return newTabs;
    });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);

    // Emit for vanilla JS consumers during migration, only if sync is enabled
    if (options.syncWithVanillaJS) {
      window.dispatchEvent(new CustomEvent('dashboard-tab-change', {
        detail: { tabId }
      }));
    }
  }, [options.syncWithVanillaJS]);

  const updateTab = useCallback((tabId: string, updates: Partial<TabData>) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  }, []);

  return {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    reorderTabs,
    setActiveTab,
    updateTab,
    setTabs,
  };
}
