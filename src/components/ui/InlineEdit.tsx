import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent, type MouseEvent } from 'react';
import { Check, X, Pencil, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import './inline-edit.css';

export interface InlineEditProps {
    value: string;
    /** Async-capable save handler */
    onSave: (newValue: string) => void | Promise<void>;
    /** Callback to notify parent when editing starts or stops */
    onEditingChange?: (isEditing: boolean) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    /** External loading state (e.g., while parent is saving) */
    isLoading?: boolean;
    /** Styling variant: 'default' or 'agenda-heading' (gold EB Garamond) */
    variant?: 'default' | 'agenda-heading';
}

export function InlineEdit({
    value,
    onSave,
    onEditingChange,
    placeholder = 'Click to edit...',
    className = '',
    disabled = false,
    isLoading = false,
    variant = 'default',
}: InlineEditProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const showLoading = isSaving || isLoading;

    // Notify parent of edit state changes
    useEffect(() => {
        onEditingChange?.(isEditing);
    }, [isEditing, onEditingChange]);

    // Handle click outside to save
    useEffect(() => {
        if (!isEditing || showLoading) return;

        const onDocumentClick = async (e: globalThis.MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                const trimmed = editValue.trim();
                if (trimmed && trimmed !== value) {
                    setIsSaving(true);
                    setHasError(false);
                    try {
                        await onSave(trimmed);
                        setIsEditing(false);
                    } catch (error) {
                        console.error('Failed to save:', error);
                        setHasError(true);
                    } finally {
                        setIsSaving(false);
                    }
                } else {
                    setEditValue(value);
                    setIsEditing(false);
                }
            }
        };

        document.addEventListener('mousedown', onDocumentClick, true);
        return () => {
            document.removeEventListener('mousedown', onDocumentClick, true);
        };
    }, [isEditing, editValue, value, onSave, showLoading]);

    // Sync editValue when value prop changes
    useEffect(() => {
        if (!isEditing) {
            setEditValue(value);
            setHasError(false);
        }
    }, [value, isEditing]);

    // Auto-focus and select all when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        const trimmed = editValue.trim();
        if (trimmed === value) {
            setIsEditing(false);
            setHasError(false);
            return;
        }

        setIsSaving(true);
        setHasError(false);
        try {
            await onSave(trimmed);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save:', error);
            setHasError(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
        setHasError(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
        if (hasError) setHasError(false);
    };

    const startEdit = (e: MouseEvent) => {
        if (!disabled && !isLoading) {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(true);
        }
    };

    if (isEditing) {
        return (
            <div
                ref={containerRef}
                className={clsx(
                    'inline-edit inline-edit--editing',
                    variant === 'agenda-heading' && 'inline-edit--agenda-heading',
                    hasError && 'inline-edit--error',
                    className
                )}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={showLoading}
                    className={clsx(
                        'inline-edit__input',
                        hasError && 'inline-edit__input--error'
                    )}
                />
                <button
                    onClick={handleSave}
                    disabled={showLoading}
                    title="Save (Enter)"
                    className="inline-edit__btn inline-edit__btn--save"
                >
                    {showLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Check />
                    )}
                </button>
                <button
                    onClick={handleCancel}
                    disabled={showLoading}
                    title="Cancel (Esc)"
                    className="inline-edit__btn inline-edit__btn--cancel"
                >
                    <X />
                </button>
            </div>
        );
    }

    return (
        <div
            onClick={startEdit}
            className={clsx(
                'inline-edit',
                disabled && 'inline-edit--disabled',
                variant === 'agenda-heading' && 'inline-edit--agenda-heading',
                className
            )}
        >
            <span className="inline-edit__text">
                {value || <span className="inline-edit__placeholder">{placeholder}</span>}
            </span>
            {/* Pencil icon removed — click text directly to edit */}
        </div>
    );
}

export default InlineEdit;
