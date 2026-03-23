import { memo, useState, useRef, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface OrgNodeData {
  label: string;
  description: string;
  leaderName?: string;
  leaderTitle?: string;
  accentColor: string;
  wikiSlug?: string;
  onColorChange?: (nodeId: string, color: string) => void;
  [key: string]: unknown;
}

function OrgNodeComponent({ id, data }: NodeProps) {
  const d = data as OrgNodeData;
  const [tabExtended, setTabExtended] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleTabClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setTimeout(() => colorInputRef.current?.click(), 0);
  }, []);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    d.onColorChange?.(id, e.target.value);
  }, [d, id]);

  return (
    <>
      <Handle type="target" position={Position.Top} className="org-handle" />
      <div className="org-node" style={{ cursor: 'pointer' }}>
        {/* Color slide-out tab */}
        <div
          className="absolute top-0 bottom-0 z-[1] cursor-pointer"
          style={{ left: '-28px', width: '32px' }}
          onMouseEnter={() => setTabExtended(true)}
          onMouseLeave={() => setTabExtended(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleTabClick}
        >
          <div
            className="absolute top-[3px] bottom-[3px] right-0 rounded-l-[8px]"
            style={{
              width: tabExtended ? '28px' : '8px',
              backgroundColor: d.accentColor,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)',
              transition: 'width 200ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease',
            }}
          />
        </div>

        {/* Hidden color picker */}
        <input
          ref={colorInputRef}
          type="color"
          value={d.accentColor}
          onChange={handleColorChange}
          className="sr-only"
          tabIndex={-1}
          aria-label="Pick accent color"
        />

        <div className="org-node__name">{d.label}</div>
        <div className="org-node__desc">{d.description}</div>
        {d.leaderName && (
          <div className="org-node__leader">
            <span className="org-node__leader-name">{d.leaderName}</span>
            {d.leaderTitle && (
              <span className="org-node__leader-title"> — {d.leaderTitle}</span>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="org-handle" />
    </>
  );
}

export const OrgNode = memo(OrgNodeComponent);
