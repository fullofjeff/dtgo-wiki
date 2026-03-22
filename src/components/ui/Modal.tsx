import React, { Fragment, createContext, useContext } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('Modal components must be used within Modal.Root');
  return context;
}

interface ModalRootProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalRoot({ open, onClose, children }: ModalRootProps) {
  return (
    <ModalContext.Provider value={{ onClose }}>
      <Transition show={open} as={Fragment}>
        <Dialog onClose={onClose} className="relative z-50">
          {children}
        </Dialog>
      </Transition>
    </ModalContext.Provider>
  );
}

function ModalOverlay() {
  return (
    <TransitionChild
      as={Fragment}
      enter="ease-out duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
    </TransitionChild>
  );
}

type ContentSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ModalContentProps {
  children: React.ReactNode;
  size?: ContentSize;
  className?: string;
}

const sizeClasses: Record<ContentSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

function ModalContent({ children, size = 'md', className = '' }: ModalContentProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <TransitionChild
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <DialogPanel
          className={twMerge(`relative w-full ${sizeClasses[size]} bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`, className)}
        >
          {children}
        </DialogPanel>
      </TransitionChild>
    </div>
  );
}

interface ModalHeaderProps {
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

function ModalHeader({ children, showCloseButton = true, className = '' }: ModalHeaderProps) {
  const { onClose } = useModalContext();
  return (
    <div className={twMerge('flex items-center justify-between px-6 py-4 border-b border-[#333] shrink-0', className)}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {children}
      </div>
      {showCloseButton && (
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#ffffff10] text-[#ebe7c7]/50 hover:text-[#ebe7c7] transition-colors ml-2 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function ModalTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogTitle className={twMerge('text-lg font-semibold text-[#ebe7c7]', className)}>
      {children}
    </DialogTitle>
  );
}

function ModalBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={twMerge('flex-1 overflow-y-auto p-6 space-y-6', className)}>
      {children}
    </div>
  );
}

function ModalFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={twMerge('flex items-center justify-between px-6 py-4 border-t border-[#333] shrink-0 bg-[#0d0d0d]', className)}>
      {children}
    </div>
  );
}

export const Modal = {
  Root: ModalRoot,
  Overlay: ModalOverlay,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Body: ModalBody,
  Footer: ModalFooter,
};
