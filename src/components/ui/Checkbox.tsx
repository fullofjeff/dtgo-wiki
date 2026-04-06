import clsx from 'clsx';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <label
      className={clsx(
        'inline-flex items-center gap-2.5 cursor-pointer select-none group',
        className,
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-[18px] h-[18px] rounded-[5px] border transition-all duration-150 flex items-center justify-center shrink-0',
          checked
            ? 'bg-[color-mix(in_srgb,var(--jf-lavender)_25%,transparent)] border-[color-mix(in_srgb,var(--jf-lavender)_50%,transparent)]'
            : 'bg-[var(--bg-input)] border-[#333] group-hover:border-[#555]',
        )}
      >
        {checked && (
          <Check
            size={12}
            strokeWidth={3}
            className="text-[var(--jf-lavender)]"
          />
        )}
      </button>
      {label && (
        <span className="text-[13px] text-[var(--text-primary)]">{label}</span>
      )}
    </label>
  );
}
