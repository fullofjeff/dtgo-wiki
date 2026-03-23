import { type ReactNode, useState, type CSSProperties } from 'react';

export interface ToolbarButtonProps {
    label?: string;
    icon?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    className?: string;
}

export function ToolbarButton({
    label,
    icon,
    onClick,
    disabled = false,
    title,
}: ToolbarButtonProps) {
    const [isHovered, setIsHovered] = useState(false);

    const buttonStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 10px',
        height: '32px',
        backgroundColor: isHovered && !disabled ? 'rgba(235, 231, 199, 0.1)' : 'rgba(235, 231, 199, 0.05)',
        border: '1px solid rgba(235, 231, 199, 0.1)',
        color: isHovered && !disabled ? '#ebe7c7' : 'rgba(235, 231, 199, 0.6)',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '6px',
        transition: 'all 0.2s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
    };

    const iconStyle: CSSProperties = {
        flexShrink: 0,
        width: '14px',
        height: '14px',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={buttonStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {icon && <span style={iconStyle}>{icon}</span>}
            {label && <span>{label}</span>}
        </button>
    );
}
