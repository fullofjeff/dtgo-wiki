import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface OrgNodeData {
  label: string;
  description: string;
  leaderName?: string;
  leaderTitle?: string;
  accentColor: string;
  wikiSlug?: string;
  [key: string]: unknown;
}

function OrgNodeComponent({ data }: NodeProps) {
  const d = data as OrgNodeData;

  return (
    <>
      <Handle type="target" position={Position.Top} className="org-handle" />
      <div
        className="org-node"
        style={{ borderLeftColor: d.accentColor, cursor: 'pointer' }}
      >
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
