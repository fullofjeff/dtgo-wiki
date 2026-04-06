import React, { Fragment } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
    label: string;
    value: string | number;
}

export interface SelectProps {
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
    value?: string | number;
    onChange?: (value: string | number) => void;
    className?: string;
    disabled?: boolean;
    name?: string;
    onBlur?: () => void;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
    ({ label, error, options, placeholder, value, onChange, className = '', disabled, name, onBlur }, ref) => {
        const selectedOption = options.find(opt => opt.value === value);

        return (
            <div className={cn('w-full', className)}>
                {label && (
                    <label className="block text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-[var(--text-secondary)] mb-1.5">
                        {label}
                    </label>
                )}
                <Listbox
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    name={name}
                >
                    <div className="relative">
                        <ListboxButton
                            ref={ref}
                            onBlur={onBlur}
                            className={cn(
                                'relative w-full text-left px-3 py-2 pr-8 border border-[var(--border-default)] rounded-[var(--radius-input)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-default)] transition-colors shadow-[var(--input-shadow,none)]',
                                error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                                !value && 'text-[var(--text-placeholder)]',
                                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                            )}
                        >
                            <span className="block truncate">
                                {selectedOption ? selectedOption.label : placeholder || 'Select...'}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronDown className="h-[13px] w-[13px] text-[var(--text-secondary)]" aria-hidden="true" />
                            </span>
                        </ListboxButton>
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <ListboxOptions
                                className="absolute z-[10001] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-[rgba(20,20,20,0.98)] py-1.5 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.4)] ring-0 focus:outline-none border border-white/20 backdrop-blur-[10px]"
                            >
                                {options.map((option) => (
                                    <ListboxOption
                                        key={option.value}
                                        className={({ active }) =>
                                            cn(
                                                'relative cursor-pointer select-none py-2 pl-9 pr-4 transition-colors text-sm',
                                                active ? 'bg-white/10 text-[var(--jf-cream)]' : 'text-[var(--text-primary)]',
                                            )
                                        }
                                        value={option.value}
                                    >
                                        {({ selected, active }) => (
                                            <>
                                                <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                                                    {option.label}
                                                </span>
                                                {selected && (
                                                    <span className={cn(
                                                        'absolute inset-y-0 left-0 flex items-center pl-3',
                                                        active ? 'text-[var(--jf-cream)]' : 'text-[var(--jf-lavender)]',
                                                    )}>
                                                        <Check className="h-4 w-4" aria-hidden="true" />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </ListboxOption>
                                ))}
                            </ListboxOptions>
                        </Transition>
                    </div>
                </Listbox>
                {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
