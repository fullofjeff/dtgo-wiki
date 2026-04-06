import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTree } from '@headless-tree/react';
import {
  syncDataLoaderFeature,
  dragAndDropFeature,
  createOnDropHandler,
} from '@headless-tree/core';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { Modal } from '@/components/ui/Modal';
import { DropdownItem } from '@/components/ui/DropdownItem';
import {
  MapPin, MapPinned, Building2, Layers, Grid3X3, DoorOpen,
  ChevronRight, Plus, Trash2, GripVertical, Pencil,
} from 'lucide-react';

// ---- Types ----

type NodeType = 'site' | 'building' | 'floor' | 'zone' | 'room';

interface LocationData {
  id: string;
  parentId: string | null;
  name: string;
  type: NodeType;
  sqft?: number;
  maxCapacity?: number;
  description?: string;
}

interface TreeState {
  nodes: Record<string, LocationData>;
  children: Record<string, string[]>;
}

// ---- Constants ----

const ROOT_ID = 'root';

const CHILD_TYPE_MAP: Record<NodeType, NodeType[]> = {
  site:     ['building'],
  building: ['floor'],
  floor:    ['zone'],
  zone:     ['room'],
  room:     [],
};

const NODE_ICONS: Record<NodeType, React.ElementType> = {
  site: MapPin, building: Building2, floor: Layers, zone: Grid3X3, room: DoorOpen,
};

const NODE_COLORS: Record<NodeType, string> = {
  site:     'var(--jf-gold)',
  building: 'var(--jf-lavender)',
  floor:    'var(--dtgo-green)',
  zone:     'var(--tnb-orange)',
  room:     'var(--text-secondary)',
};

const TYPE_LABELS: Record<NodeType, string> = {
  site: 'Site', building: 'Building', floor: 'Floor', zone: 'Zone', room: 'Room',
};

const INITIAL_STATE: TreeState = {
  nodes: {
    '1': { id: '1', parentId: null, name: 'Location Name', type: 'site', sqft: 50000, maxCapacity: 500 },
  },
  children: {
    [ROOT_ID]: ['1'],
    '1': [],
  },
};

// ---- Shared styles ----

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-input)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  marginBottom: '6px',
};

// ---- NodeTypeIcon helper ----

function NodeTypeIcon({ type, size }: { type: NodeType; size: number }) {
  const Icon = NODE_ICONS[type];
  return <Icon size={size} style={{ color: NODE_COLORS[type], flexShrink: 0 }} />;
}

// ---- Add Modal Form ----

interface AddForm {
  name: string;
  type: NodeType;
  sqft: string;
  maxCapacity: string;
  description: string;
}

const EMPTY_ADD_FORM: AddForm = {
  name: '', type: 'site', sqft: '', maxCapacity: '', description: '',
};

// ---- Page ----

export function LocationTestPage() {
  const [treeState, setTreeState] = useState<TreeState>(INITIAL_STATE);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [ctxMenu, setCtxMenu] = useState<{
    nodeId: string; nodeName: string; x: number; y: number;
  } | null>(null);
  const [editModal, setEditModal] = useState<{
    open: boolean; nodeId: string; form: AddForm;
  }>({ open: false, nodeId: '', form: EMPTY_ADD_FORM });
  const [addModal, setAddModal] = useState<{
    open: boolean; parentId: string | null; allowedTypes: NodeType[]; form: AddForm;
  }>({ open: false, parentId: null, allowedTypes: ['site'], form: EMPTY_ADD_FORM });

  // ---- headless-tree instance ----

  const tree = useTree<LocationData>({
    rootItemId: ROOT_ID,
    getItemName: (item) => item.getItemData()?.name ?? '',
    isItemFolder: (item) => {
      const data = item.getItemData();
      if (!data) return true;
      return CHILD_TYPE_MAP[data.type].length > 0;
    },
    dataLoader: {
      getItem: (itemId) => {
        if (itemId === ROOT_ID) {
          return { id: ROOT_ID, parentId: null, name: 'root', type: 'site' } as LocationData;
        }
        return treeState.nodes[itemId];
      },
      getChildren: (itemId) => treeState.children[itemId] ?? [],
    },
    features: [syncDataLoaderFeature, dragAndDropFeature],
    seperateDragHandle: true,
    canDrop: (items, target) => {
      const targetId = target.item.getId();
      if (targetId === ROOT_ID) {
        return items.every(i => i.getItemData()?.type === 'site');
      }
      const targetNode = treeState.nodes[targetId];
      if (!targetNode) return false;
      const allowed = CHILD_TYPE_MAP[targetNode.type];
      return items.every(i => {
        const t = i.getItemData()?.type;
        return t !== undefined && allowed.includes(t);
      });
    },
    onDrop: createOnDropHandler<LocationData>((parentItem, newChildIds) => {
      const parentId = parentItem.getId();
      setTreeState(prev => {
        const newNodes = { ...prev.nodes };
        newChildIds.forEach(childId => {
          if (newNodes[childId]) {
            newNodes[childId] = {
              ...newNodes[childId],
              parentId: parentId === ROOT_ID ? null : parentId,
            };
          }
        });
        return {
          nodes: newNodes,
          children: { ...prev.children, [parentId]: newChildIds },
        };
      });
    }),
  });

  // ---- Handlers ----

  const openAddModal = (parentId: string | null) => {
    const allowedTypes: NodeType[] = parentId === null
      ? ['site']
      : (CHILD_TYPE_MAP[treeState.nodes[parentId]?.type ?? 'site'] ?? ['site']);
    setAddModal({
      open: true,
      parentId,
      allowedTypes,
      form: { ...EMPTY_ADD_FORM, type: allowedTypes[0] },
    });
  };

  const closeAddModal = () => {
    setAddModal(prev => ({ ...prev, open: false, form: EMPTY_ADD_FORM }));
  };

  const saveNode = () => {
    if (!addModal.form.name.trim()) return;
    const newId = crypto.randomUUID();
    const parentKey = addModal.parentId ?? ROOT_ID;
    const newNode: LocationData = {
      id: newId,
      parentId: addModal.parentId,
      name: addModal.form.name.trim(),
      type: addModal.form.type,
      sqft: addModal.form.sqft ? Number(addModal.form.sqft) : undefined,
      maxCapacity: addModal.form.maxCapacity ? Number(addModal.form.maxCapacity) : undefined,
      description: addModal.form.description.trim() || undefined,
    };
    setTreeState(prev => ({
      nodes: { ...prev.nodes, [newId]: newNode },
      children: {
        ...prev.children,
        [parentKey]: [...(prev.children[parentKey] ?? []), newId],
        [newId]: [],
      },
    }));
    // Queue ancestor expansion — deferred to after React commits new treeState
    if (addModal.parentId) {
      const ancestors: string[] = [];
      let id: string | null = addModal.parentId;
      while (id) {
        ancestors.push(id);
        id = treeState.nodes[id]?.parentId ?? null;
      }
      pendingExpansionRef.current = ancestors;
    }
    closeAddModal();
  };

  const renameNode = (id: string, newName: string) => {
    setTreeState(prev => ({
      ...prev,
      nodes: { ...prev.nodes, [id]: { ...prev.nodes[id], name: newName } },
    }));
  };

  const deleteNodeAndDescendants = (id: string) => {
    const collectIds = (nodeId: string): string[] => {
      const kids = treeState.children[nodeId] ?? [];
      return [nodeId, ...kids.flatMap(collectIds)];
    };
    const toDelete = new Set(collectIds(id));
    const parentId = treeState.nodes[id]?.parentId ?? null;
    const parentKey = parentId ?? ROOT_ID;

    setTreeState(prev => {
      const newNodes = { ...prev.nodes };
      const newChildren = { ...prev.children };
      toDelete.forEach(did => { delete newNodes[did]; delete newChildren[did]; });
      newChildren[parentKey] = (newChildren[parentKey] ?? []).filter(c => !toDelete.has(c));
      return { nodes: newNodes, children: newChildren };
    });
    setCtxMenu(null);
  };

  const openEditModal = (nodeId: string) => {
    const node = treeState.nodes[nodeId];
    if (!node) return;
    setEditModal({
      open: true,
      nodeId,
      form: {
        name: node.name,
        type: node.type,
        sqft: node.sqft?.toString() ?? '',
        maxCapacity: node.maxCapacity?.toString() ?? '',
        description: node.description ?? '',
      },
    });
    setCtxMenu(null);
  };

  const saveEdit = () => {
    const { nodeId, form } = editModal;
    if (!form.name.trim()) return;
    setTreeState(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...prev.nodes[nodeId],
          name: form.name.trim(),
          sqft: form.sqft ? Number(form.sqft) : undefined,
          maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
          description: form.description.trim() || undefined,
        },
      },
    }));
    setEditModal(prev => ({ ...prev, open: false }));
  };

  const updateForm = (patch: Partial<AddForm>) => {
    setAddModal(prev => ({ ...prev, form: { ...prev.form, ...patch } }));
  };

  const updateEditForm = (patch: Partial<AddForm>) => {
    setEditModal(prev => ({ ...prev, form: { ...prev.form, ...patch } }));
  };

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const pendingExpansionRef = useRef<string[] | null>(null);
  // After treeState commits, expand queued ancestors so new child is immediately visible
  useEffect(() => {
    if (pendingExpansionRef.current) {
      const ids = pendingExpansionRef.current;
      pendingExpansionRef.current = null;
      ids.forEach(id => {
        try { tree.getItemInstance(id).expand(); } catch {}
      });
    }
  }, [treeState]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragLineData = tree.getDragLineData();

  // ---- Render ----

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '40px 48px' }}>

      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ maxWidth: 320 }}>
          <InlineEdit
            value={projectName}
            onSave={setProjectName}
            variant="agenda-heading"
            placeholder="Project Name..."
          />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, fontWeight: 300 }}>
          Location hierarchy — drag to reorganize
        </p>
      </div>

      {/* Recessed container — chart-style: rounded-2xl, dark bg, double border */}
      <div style={{
        background: '#141414',
        borderRadius: 16,
        border: '2px solid #1E1E1E',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        marginBottom: 24,
      }}>

        {/* recessed-title style header — matches component library chart section pattern */}
        <div style={{
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1E1E1E',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <MapPinned size={13} style={{ color: 'var(--text-secondary)' }} />
            <span style={{
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--text-secondary)',
              fontWeight: 700,
            }}>
              Location Tree
            </span>
          </div>
          <div style={{ width: 120, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => openAddModal(null)}
              className="group flex items-center gap-2 bg-transparent rounded-full border border-[#c8c8c8] hover:bg-[#d4d4d4] hover:border-transparent transition-all duration-200 pl-1 pr-3 py-1"
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-full border border-[#c8c8c8] text-[#c8c8c8] group-hover:border-[#4caf50] group-hover:text-[#4caf50] group-hover:shadow-[0_0_0_1px_#4caf50] transition-all duration-200">
                <Plus size={10} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#c8c8c8] group-hover:text-[#2a2a2a] transition-colors duration-200">
                Add Site
              </span>
            </button>
          </div>
        </div>

        {/* Tree */}
        <div style={{ padding: '6px 0', position: 'relative' }}>
          <div
            {...tree.getContainerProps()}
            style={{ outline: 'none' }}
          >
            {tree.getItems().length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '48px 0',
                color: 'rgba(248,243,232,0.25)',
                fontSize: 13,
              }}>
                No locations — click "Add Site" to get started
              </div>
            )}

            {tree.getItems().map(item => {
              const data = item.getItemData();
              if (!data || data.id === ROOT_ID) return null;

              const level = item.getItemMeta().level;
              const isFolder = item.isFolder();
              const isExpanded = item.isExpanded();
              const isDragTarget = item.isDragTarget();
              const isHovered = hoveredId === item.getId();

              return (
                <div
                  key={item.getId()}
                  {...item.getProps()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    paddingLeft: level * 20 + 10,
                    paddingRight: 20,
                    paddingTop: 7,
                    paddingBottom: 7,
                    minHeight: 40,
                    boxSizing: 'border-box',
                    background: isDragTarget
                      ? 'color-mix(in srgb, var(--jf-lavender) 10%, transparent)'
                      : isHovered
                      ? 'rgba(255,255,255,0.04)'
                      : 'transparent',
                    borderLeft: isDragTarget
                      ? '2px solid color-mix(in srgb, var(--jf-lavender) 50%, transparent)'
                      : isHovered
                      ? '2px solid rgba(255,255,255,0.08)'
                      : '2px solid transparent',
                    outline: 'none',
                    cursor: 'default',
                    userSelect: 'none',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                  onMouseEnter={() => setHoveredId(item.getId())}
                  onMouseLeave={() => setHoveredId(null)}
                  onContextMenu={e => {
                    e.preventDefault();
                    setCtxMenu({
                      nodeId: item.getId(),
                      nodeName: data.name,
                      x: Math.min(e.clientX, window.innerWidth - 210),
                      y: Math.min(e.clientY, window.innerHeight - 70),
                    });
                  }}
                >
                  {/* Drag grip */}
                  <span
                    {...(item.getDragHandleProps() as React.HTMLAttributes<HTMLSpanElement>)}
                    style={{
                      cursor: 'grab',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'rgba(255,255,255,0.12)',
                      flexShrink: 0,
                      paddingRight: 2,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.12)'; }}
                  >
                    <GripVertical size={12} />
                  </span>

                  {/* Expand/collapse */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      isExpanded ? item.collapse() : item.expand();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      cursor: isFolder ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                    tabIndex={-1}
                  >
                    {isFolder ? (
                      <ChevronRight
                        size={12}
                        style={{
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease',
                          color: 'rgba(255,255,255,0.3)',
                        }}
                      />
                    ) : (
                      <div style={{ width: 12 }} />
                    )}
                  </button>

                  {/* Type icon */}
                  <NodeTypeIcon type={data.type} size={13} />

                  {/* Name */}
                  <div style={{ flex: '0 1 200px', minWidth: 0 }}>
                    <InlineEdit
                      value={data.name}
                      onSave={newName => renameNode(item.getId(), newName)}
                      placeholder="Unnamed..."
                    />
                  </div>

                  {/* Metadata chips */}
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 10 }}>
                    {data.sqft && (
                      <span style={{
                        fontSize: '10px',
                        color: 'rgba(248,243,232,0.3)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 4,
                        padding: '1px 6px',
                        whiteSpace: 'nowrap',
                      }}>
                        {data.sqft.toLocaleString()} sqft
                      </span>
                    )}
                    {data.maxCapacity && (
                      <span style={{
                        fontSize: '10px',
                        color: 'rgba(248,243,232,0.3)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 4,
                        padding: '1px 6px',
                        whiteSpace: 'nowrap',
                      }}>
                        cap {data.maxCapacity.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Add child button — fixed 90px container matches the header "Add Site" button column */}
                  <div style={{ width: 120, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    {isFolder && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openAddModal(item.getId());
                        }}
                        title={`Add ${CHILD_TYPE_MAP[data.type][0]}`}
                        className="w-5 h-5 flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.25)] text-[rgba(255,255,255,0.4)] hover:border-[#4caf50] hover:text-[#4caf50] hover:shadow-[0_0_0_1px_#4caf50] transition-all duration-200 flex-shrink-0"
                        style={{ background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drop line indicator */}
          {dragLineData && (
            <div
              style={{
                ...tree.getDragLineStyle(),
                position: 'absolute',
                height: 2,
                background: 'var(--jf-lavender)',
                borderRadius: 2,
                pointerEvents: 'none',
                zIndex: 100,
                opacity: 0.75,
              }}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {(Object.keys(NODE_ICONS) as NodeType[]).map(type => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <NodeTypeIcon type={type} size={11} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{TYPE_LABELS[type]}</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: 'rgba(248,243,232,0.18)', marginLeft: 4 }}>
          · Drag grip to reorder · Right-click to delete · Click name to rename
        </span>
      </div>

      {/* Context menu portal */}
      {ctxMenu && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
            onClick={() => setCtxMenu(null)}
            onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }}
          />
          <div style={{
            position: 'fixed',
            top: ctxMenu.y,
            left: ctxMenu.x,
            zIndex: 10001,
            width: 200,
            padding: '8px',
            backgroundColor: 'rgba(20,20,20,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              padding: '6px 12px 8px',
              fontSize: '0.6rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {ctxMenu.nodeName}
            </div>
            <DropdownItem onClick={() => openEditModal(ctxMenu.nodeId)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Edit</span>
              </div>
            </DropdownItem>
            <DropdownItem onClick={() => deleteNodeAndDescendants(ctxMenu.nodeId)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={13} style={{ color: 'var(--dtp-pink)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--dtp-pink)' }}>Delete</span>
              </div>
            </DropdownItem>
          </div>
        </>,
        document.body
      )}

      {/* Add-node modal */}
      <Modal.Root open={addModal.open} onClose={closeAddModal}>
        <Modal.Overlay />
        <Modal.Content size="md">
          <Modal.Header showCloseButton>
            <Modal.Title>Add Location Node</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={addModal.form.name}
                  onChange={e => updateForm({ name: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveNode(); }}
                  placeholder="Enter name..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={addModal.form.type}
                  onChange={e => updateForm({ type: e.target.value as NodeType })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {addModal.allowedTypes.map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Square Footage</label>
                  <input
                    type="number"
                    value={addModal.form.sqft}
                    onChange={e => updateForm({ sqft: e.target.value })}
                    placeholder="0"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Max Capacity</label>
                  <input
                    type="number"
                    value={addModal.form.maxCapacity}
                    onChange={e => updateForm({ maxCapacity: e.target.value })}
                    placeholder="0"
                    min="0"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={addModal.form.description}
                  onChange={e => updateForm({ description: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                  style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={closeAddModal}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveNode}
                disabled={!addModal.form.name.trim()}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: addModal.form.name.trim()
                    ? 'color-mix(in srgb, var(--jf-lavender) 25%, transparent)'
                    : 'var(--bg-surface-inset)',
                  border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)',
                  borderRadius: 'var(--radius-input)',
                  color: addModal.form.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  cursor: addModal.form.name.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Add {TYPE_LABELS[addModal.form.type]}
              </button>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Edit-node modal */}
      <Modal.Root open={editModal.open} onClose={() => setEditModal(prev => ({ ...prev, open: false }))}>
        <Modal.Overlay />
        <Modal.Content size="md">
          <Modal.Header showCloseButton>
            <Modal.Title>Edit Location Node</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={editModal.form.name}
                  onChange={e => updateEditForm({ name: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }}
                  placeholder="Enter name..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <input
                  type="text"
                  value={TYPE_LABELS[editModal.form.type]}
                  disabled
                  style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Square Footage</label>
                  <input
                    type="number"
                    value={editModal.form.sqft}
                    onChange={e => updateEditForm({ sqft: e.target.value })}
                    placeholder="0"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Max Capacity</label>
                  <input
                    type="number"
                    value={editModal.form.maxCapacity}
                    onChange={e => updateEditForm({ maxCapacity: e.target.value })}
                    placeholder="0"
                    min="0"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={editModal.form.description}
                  onChange={e => updateEditForm({ description: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                  style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setEditModal(prev => ({ ...prev, open: false }))}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editModal.form.name.trim()}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: editModal.form.name.trim()
                    ? 'color-mix(in srgb, var(--jf-lavender) 25%, transparent)'
                    : 'var(--bg-surface-inset)',
                  border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)',
                  borderRadius: 'var(--radius-input)',
                  color: editModal.form.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  cursor: editModal.form.name.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Save Changes
              </button>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

    </div>
  );
}
