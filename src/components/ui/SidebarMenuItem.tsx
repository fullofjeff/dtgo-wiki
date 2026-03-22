import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export type StatusDotState = 'none' | 'loading' | 'error';

export interface SidebarMenuItemProps {
    icon: LucideIcon;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    statusDot?: StatusDotState;
    className?: string;
    collapsed?: boolean;
}

export function SidebarMenuItem({
    icon: Icon,
    label,
    isActive = false,
    onClick,
    statusDot = 'none',
    className = '',
    collapsed = false,
}: SidebarMenuItemProps) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={clsx(
                'w-full text-sm text-left flex items-center rounded-none font-semibold relative overflow-hidden group transition-all duration-300',
                isActive
                    ? 'bg-[#0f1214] text-[#f8f3e8] font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_-2px_4px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)]'
                    : 'text-[rgba(248,243,232,0.5)] hover:bg-[#0f1214] hover:text-[#f8f3e8] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_-2px_4px_rgba(0,0,0,0.3)]',
                collapsed ? 'justify-center gap-0' : 'gap-4',
                className
            )}
            style={{
                paddingTop: '12px',
                paddingBottom: '12px',
                paddingLeft: collapsed ? 0 : '24px',
                paddingRight: collapsed ? 0 : '24px',
                ...(isActive ? { textShadow: '0 0 8px rgba(248,243,232,0.5)' } : {})
            }}
        >
            {/* Active state left accent bar */}
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ccccff] shadow-[0_0_8px_#ccccff]" />
            )}

            {/* Icon */}
            <Icon className="w-5 h-5 shrink-0" />

            {/* Label with slide animation */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                        className="whitespace-nowrap"
                    >
                        <span className={clsx(
                            'block transition-transform duration-300',
                            isActive ? 'translate-x-2' : 'group-hover:translate-x-2'
                        )}>
                            {label}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status dot */}
            {statusDot !== 'none' && !collapsed && (
                <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className={clsx(
                        'w-1.5 h-1.5 rounded-full ml-auto shrink-0 mr-4',
                        statusDot === 'loading' && 'bg-[#ffa726] animate-pulse',
                        statusDot === 'error' && 'bg-[#e53935] shadow-[0_0_4px_rgba(229,57,53,0.6)]'
                    )}
                />
            )}
        </button>
    );
}
