import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
    defaultOpen?: boolean;
}

export function FormSection({ title, description, children, className = '', defaultOpen = false }: FormSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`space-y-4 ${className}`}>
            <div
                className="border-b border-[var(--border-subtle)] pb-2 mb-4 cursor-pointer flex items-center justify-between group select-none"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            >
                <div className="flex-1 pr-4">
                    <h3 className="text-3xl font-serif italic text-[var(--text-primary)] group-hover:text-[var(--jf-lavender)] transition-colors mb-1.5">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--jf-lavender)] transition-colors">
                            {description}
                        </p>
                    )}
                </div>
                <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} p-1 rounded-full group-hover:bg-[rgba(201,207,233,0.1)]`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" className="text-[var(--text-secondary)] group-hover:text-[var(--jf-lavender)] transition-colors" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="space-y-4 pb-10">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
