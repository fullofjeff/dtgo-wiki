import { useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { SearchBar } from './SearchBar';
import { SidebarProvider, useSidebar, SIDEBAR_SPRING } from './SidebarContext';
import { PinClosedButton } from '../ui/PinClosedButton';
import { useSidebarKeyboard } from '../../hooks/useSidebarKeyboard';

function ShellInner() {
  const {
    visualWidth,
    layoutWidth,
    isExpanded,
    isPinned,
    isPinnedClosed,
    isHovering,
    setHovering,
    togglePin,
  } = useSidebar();

  useSidebarKeyboard();

  const location = useLocation();
  const isFullBleed = location.pathname === '/org-chart';

  const collapsed = !isExpanded;

  const handleMouseEnter = useCallback(() => {
    if (!isPinnedClosed) {
      setHovering(true);
    }
  }, [isPinnedClosed, setHovering]);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
  }, [setHovering]);

  return (
    <>
      {/* Fixed sidebar */}
      <motion.nav
        initial={false}
        animate={{ width: visualWidth }}
        transition={SIDEBAR_SPRING}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="fixed top-0 left-0 h-screen z-[9999] rounded-r-[14px] border-y border-r border-[#151515] border-l-0 bg-[#191918] shadow-[0_6px_12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_2px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <Sidebar collapsed={collapsed} />
        </div>
        <PinClosedButton
          isPinned={isPinned}
          onToggle={togglePin}
        />
        {/* Noise overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10000,
            opacity: 0.25,
            backgroundImage: 'url("/noise.svg")',
            backgroundRepeat: 'repeat',
            backgroundSize: '161px 161px',
            mixBlendMode: 'soft-light' as const,
            filter: 'blur(0.3px)',
            borderRadius: 'inherit',
            overflow: 'hidden',
          }}
        />
      </motion.nav>

      {/* Main content */}
      <motion.div
        className="flex flex-col min-h-screen"
        initial={false}
        animate={{ marginLeft: layoutWidth }}
        transition={SIDEBAR_SPRING}
      >
        {/* Header — hidden for full-bleed routes (search moves to bottom toolbar) */}
        {!isFullBleed && (
          <header className="sticky top-0 z-10 flex items-center gap-3 pl-10 pr-6 py-3.5 border-b border-[#151515] bg-[#191918]">
            <SearchBar />
          </header>
        )}

        {/* Content */}
        <main className={`flex-1 ${isFullBleed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {isFullBleed ? (
            <Outlet />
          ) : (
            <div className="px-10 py-6">
              <Outlet />
            </div>
          )}
        </main>
      </motion.div>
    </>
  );
}

export function Shell() {
  return (
    <SidebarProvider>
      <ShellInner />
    </SidebarProvider>
  );
}
