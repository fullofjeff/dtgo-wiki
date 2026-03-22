import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, PinOff } from 'lucide-react';

interface PinButtonProps {
    isPinned: boolean;
    onToggle: () => void;
}

export function PinClosedButton({ isPinned, onToggle }: PinButtonProps) {
    const [isNear, setIsNear] = useState(false);

    return (
        <div
            className="absolute bottom-0 left-0 w-full z-[10001]"
            style={{ height: 64 }}
            onMouseEnter={() => setIsNear(true)}
            onMouseLeave={() => setIsNear(false)}
        >
            <AnimatePresence>
                {(isNear || isPinned) && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="absolute flex items-center justify-center rounded-full bg-[#1e1e20] border border-[#2a2a2e] shadow-lg cursor-pointer hover:bg-[#2a2a2e] hover:border-[#3a3a3e]"
                        style={{
                            width: 28,
                            height: 28,
                            bottom: 18,
                            left: 22,
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
                    >
                        {isPinned ? (
                            <PinOff className="w-3.5 h-3.5 text-[#d8830a]" />
                        ) : (
                            <Pin className="w-3.5 h-3.5 text-[rgba(248,243,232,0.6)]" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
