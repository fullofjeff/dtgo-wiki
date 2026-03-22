import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil, Check, X } from 'lucide-react';

import { orgEntities, type OrgEntity } from '@/data/orgData';
import { OrgNode, type OrgNodeData } from '../org-chart/OrgNode';
import { getLayoutedElements } from '../org-chart/layoutUtils';
import { Modal } from '../ui/Modal';

const nodeTypes = { orgNode: OrgNode };

function buildGraph(entities: typeof orgEntities) {
  const nodes: Node[] = entities.map((e) => ({
    id: e.id,
    type: 'orgNode',
    position: { x: 0, y: 0 },
    data: {
      label: e.name,
      description: e.description,
      leaderName: e.leader?.name,
      leaderTitle: e.leader?.title,
      accentColor: e.accentColor,
      wikiSlug: e.wikiSlug,
    } satisfies OrgNodeData,
  }));

  const edges: Edge[] = entities
    .filter((e) => e.parentId)
    .map((e) => {
      const parent = entities.find((p) => p.id === e.parentId);
      return {
        id: `${e.parentId}-${e.id}`,
        source: e.parentId!,
        target: e.id,
        type: 'smoothstep',
        style: {
          stroke: parent?.accentColor ?? 'var(--border-default)',
          strokeWidth: 1.5,
          opacity: 0.4,
        },
      };
    });

  return getLayoutedElements(nodes, edges, 'TB');
}

function getBreadcrumb(entity: OrgEntity): string[] {
  const path: string[] = [];
  let current: OrgEntity | undefined = entity;
  while (current) {
    path.unshift(current.name);
    current = current.parentId
      ? orgEntities.find((e) => e.id === current!.parentId)
      : undefined;
  }
  return path;
}

interface EditData {
  summary: string;
  leaderName: string;
  leaderTitle: string;
  description: string;
}

function OrgChartInner() {
  const { nodes, edges } = useMemo(() => buildGraph(orgEntities), []);
  const [selected, setSelected] = useState<OrgEntity | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<EditData>({ summary: '', leaderName: '', leaderTitle: '', description: '' });
  const navigate = useNavigate();

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const entity = orgEntities.find((e) => e.id === node.id);
    if (entity) {
      setSelected(entity);
      setEditing(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setSelected(null);
    setEditing(false);
  }, []);

  const startEdit = useCallback(() => {
    if (!selected) return;
    setEditData({
      summary: selected.summary || selected.description,
      leaderName: selected.leader?.name || '',
      leaderTitle: selected.leader?.title || '',
      description: selected.description,
    });
    setEditing(true);
  }, [selected]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  const saveEdit = useCallback(() => {
    if (!selected) return;
    const idx = orgEntities.findIndex((e) => e.id === selected.id);
    if (idx === -1) return;
    orgEntities[idx] = {
      ...orgEntities[idx],
      summary: editData.summary,
      description: editData.description,
      leader: editData.leaderName
        ? { name: editData.leaderName, title: editData.leaderTitle }
        : undefined,
    };
    setSelected({ ...orgEntities[idx] });
    setEditing(false);
  }, [selected, editData]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-surface-inset)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    resize: 'vertical' as const,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--jf-lavender)',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Interactive View
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: 'var(--jf-cream)',
          }}
        >
          Corporate Structure
        </h1>
      </div>

      {/* Canvas */}
      <div
        style={{
          height: 'calc(100vh - 200px)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-surface-inset)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(248, 243, 232, 0.03)" gap={24} size={1.5} />
          <Controls showInteractive={false} className="org-controls" />
        </ReactFlow>
      </div>

      {/* Entity Modal — fixed size */}
      <Modal.Root open={!!selected} onClose={closeModal}>
        <Modal.Overlay />
        <Modal.Content size="lg" className="h-[480px]">
          <Modal.Header>
            <div className="flex-1 min-w-0">
              {selected && getBreadcrumb(selected).length > 1 && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 300, marginBottom: 4 }}>
                  {getBreadcrumb(selected).join(' › ')}
                </div>
              )}
              <Modal.Title>{selected?.name}</Modal.Title>
            </div>
            {!editing && (
              <button
                onClick={startEdit}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: 'var(--text-secondary)', marginLeft: 8 }}
                title="Edit"
              >
                <Pencil size={15} />
              </button>
            )}
          </Modal.Header>

          <Modal.Body className="flex-1">
            {editing ? (
              /* ── Edit Mode ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Description
                  </label>
                  <input
                    style={inputStyle}
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Summary
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 100 }}
                    value={editData.summary}
                    onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Leader Name
                    </label>
                    <input
                      style={inputStyle}
                      value={editData.leaderName}
                      onChange={(e) => setEditData({ ...editData, leaderName: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      Leader Title
                    </label>
                    <input
                      style={inputStyle}
                      value={editData.leaderTitle}
                      onChange={(e) => setEditData({ ...editData, leaderTitle: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* ── View Mode ── */
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 300, lineHeight: 1.7 }}>
                  {selected?.summary || selected?.description}
                </p>

                {selected?.keyMetrics && selected.keyMetrics.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selected.keyMetrics.map((m) => (
                      <div
                        key={m.label}
                        style={{
                          background: 'var(--bg-surface-inset)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 8,
                          padding: '8px 14px',
                          textAlign: 'center',
                          minWidth: 80,
                        }}
                      >
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jf-cream)', fontFamily: 'var(--font-serif)' }}>
                          {m.value}
                        </div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 2 }}>
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selected?.leader && (
                  <div style={{ borderTop: '1px solid #333', paddingTop: 12 }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                      Leadership
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      <span style={{ color: 'var(--jf-cream)', fontWeight: 500 }}>
                        {selected.leader.name}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
                        {' '} — {selected.leader.title}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)', background: 'transparent', border: '1px solid #333', cursor: 'pointer' }}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: 'var(--jf-cream)', background: 'rgba(34,201,151,0.15)', border: '1px solid rgba(34,201,151,0.3)', cursor: 'pointer' }}
                >
                  <Check size={14} /> Save
                </button>
              </>
            ) : (
              <>
                <div />
                {selected?.wikiSlug && (
                  <button
                    onClick={() => {
                      closeModal();
                      navigate(`/file/${selected.wikiSlug}`);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      color: 'var(--jf-lavender)',
                      border: '1px solid #333',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    View Wiki Page <ArrowRight size={14} />
                  </button>
                )}
              </>
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}

export function OrgChartPage() {
  return (
    <ReactFlowProvider>
      <OrgChartInner />
    </ReactFlowProvider>
  );
}
