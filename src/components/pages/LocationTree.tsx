import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTree } from '@headless-tree/react';
import {
  syncDataLoaderFeature,
  dragAndDropFeature,
  createOnDropHandler,
} from '@headless-tree/core';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { DropdownItem } from '@/components/ui/DropdownItem';
import {
  MapPin, MapPinned, Building2, Layers, Grid3X3, DoorOpen,
  ChevronRight, Plus, Trash2, GripVertical, Pencil,
  Sun, Navigation, Tent, Wind, Tag,
} from 'lucide-react';
import { saveLocationTree } from '@/services/zoneService';

// ---- Types ----

export type NodeType = string; // built-ins: site | building | exterior | coveredExterior | openAir | offsite | floor | zone | room

export interface LocationData {
  id: string;
  parentId: string | null;
  name: string;
  type: NodeType;
  sqft?: number;
  maxCapacity?: number;
  description?: string;
  floorNumber?: string;
  tags?: string[];
}

export interface TreeState {
  nodes: Record<string, LocationData>;
  children: Record<string, string[]>;
  pinnedIds?: string[];
  customTypes?: Record<string, { label: string; color: string }>;
}

// ---- Constants ----

const ROOT_ID = 'root';

const BUILTIN_ICONS: Record<string, React.ElementType> = {
  site: MapPin, building: Building2, exterior: Sun, coveredExterior: Tent,
  openAir: Wind, offsite: Navigation,
  floor: Layers, zone: Grid3X3, room: DoorOpen,
};

const BUILTIN_COLORS: Record<string, string> = {
  site:            'var(--jf-gold)',
  building:        'var(--jf-lavender)',
  exterior:        'var(--dtgo-green)',
  coveredExterior: 'var(--mqdc-blue)',
  openAir:         'var(--dtgo-green)',
  offsite:         'var(--dtp-pink)',
  floor:           'var(--dtgo-green)',
  zone:            'var(--tnb-orange)',
  room:            'var(--text-secondary)',
};

const BUILTIN_LABELS: Record<string, string> = {
  site: 'Site', building: 'Building', exterior: 'Exterior',
  coveredExterior: 'Covered Exterior', openAir: 'Open Air', offsite: 'Offsite',
  floor: 'Floor', zone: 'Zone', room: 'Room',
};

const BUILTIN_ORDER = ['site', 'building', 'exterior', 'coveredExterior', 'openAir', 'offsite', 'floor', 'zone', 'room'];

const TYPE_COLOR_PALETTE = [
  'var(--jf-gold)',
  'var(--jf-lavender)',
  'var(--dtgo-green)',
  'var(--mqdc-blue)',
  'var(--tnb-orange)',
  'var(--dtp-pink)',
  'var(--text-secondary)',
];

// Resolved hex/hsl values for swatch rendering (CSS vars don't render in style backgrounds without a trick)
const PALETTE_SWATCHES = [
  '#C4A96E', // jf-gold
  '#A89EC9', // jf-lavender
  '#4CAF50', // dtgo-green
  '#3B82F6', // mqdc-blue
  '#F97316', // tnb-orange
  '#EC4899', // dtp-pink
  '#888888', // text-secondary
];

const INITIAL_STATE: TreeState = {
  nodes: {
    '1': { id: '1', parentId: null, name: 'Location Name', type: 'site', sqft: 50000, maxCapacity: 500 },
  },
  children: {
    [ROOT_ID]: ['1'],
    '1': [],
  },
};

// ---- Helpers ----

function getTypeLabel(type: string, customTypes?: Record<string, { label: string; color: string }>): string {
  return BUILTIN_LABELS[type] ?? customTypes?.[type]?.label ?? type;
}

function getTypeColor(type: string, customTypes?: Record<string, { label: string; color: string }>): string {
  return BUILTIN_COLORS[type] ?? customTypes?.[type]?.color ?? 'var(--text-secondary)';
}

function getTypeIcon(type: string): React.ElementType {
  return BUILTIN_ICONS[type] ?? Tag;
}

// ---- NodeTypeIcon ----

function NodeTypeIcon({ type, size, customTypes }: {
  type: string; size: number; customTypes?: Record<string, { label: string; color: string }>
}) {
  const Icon = getTypeIcon(type);
  const color = getTypeColor(type, customTypes);
  return <Icon size={size} style={{ color, flexShrink: 0 }} />;
}

// ---- AddForm ----

interface AddForm {
  name: string;
  type: string;
  sqft: string;
  maxCapacity: string;
  description: string;
  floorNumber: string;
  tags: string[];
  tagInput: string;
}

const EMPTY_ADD_FORM: AddForm = {
  name: '', type: 'site', sqft: '', maxCapacity: '', description: '', floorNumber: '', tags: [], tagInput: '',
};

// ---- Component ----

interface LocationTreeProps {
  persist?: boolean;
  initialState?: TreeState;
}

export function LocationTree({ persist, initialState }: LocationTreeProps) {
  const [treeState, rawSetTreeState] = useState<TreeState>(initialState ?? INITIAL_STATE);
  const persistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wrap setter so every mutation also schedules a Firestore save
  const setTreeState = useCallback((updater: TreeState | ((prev: TreeState) => TreeState)) => {
    rawSetTreeState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (persist) {
        if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
        persistDebounceRef.current = setTimeout(() => saveLocationTree(next), 400);
      }
      return next;
    });
  }, [persist]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pin state derived from treeState (persisted to Firestore automatically via setTreeState)
  const pinnedIds = useMemo(() => new Set(treeState.pinnedIds ?? []), [treeState.pinnedIds]);

  const [ctxMenu, setCtxMenu] = useState<{
    nodeId: string; nodeName: string; x: number; y: number;
  } | null>(null);
  const [headerCtxMenu, setHeaderCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [editModal, setEditModal] = useState<{
    open: boolean; nodeId: string; form: AddForm;
  }>({ open: false, nodeId: '', form: EMPTY_ADD_FORM });
  const [addModal, setAddModal] = useState<{
    open: boolean; parentId: string | null; form: AddForm;
  }>({ open: false, parentId: null, form: EMPTY_ADD_FORM });

  // New-type inline form state (shared by add + edit modal)
  const [newTypeForm, setNewTypeForm] = useState({ label: '', swatchIdx: 0 });
  const [showNewTypeInAdd, setShowNewTypeInAdd] = useState(false);
  const [showNewTypeInEdit, setShowNewTypeInEdit] = useState(false);

  // ---- headless-tree instance ----

  const tree = useTree<LocationData>({
    rootItemId: ROOT_ID,
    getItemName: (item) => item.getItemData()?.name ?? '',
    isItemFolder: () => true,
    dataLoader: {
      getItem: (itemId) => {
        if (itemId === ROOT_ID) {
          return { id: ROOT_ID, parentId: null, name: 'root', type: 'site' } as LocationData;
        }
        // Return a safe tombstone for items mid-deletion so the tree doesn't crash
        return treeState.nodes[itemId] ?? { id: itemId, parentId: null, name: '', type: 'room' };
      },
      getChildren: (itemId) => treeState.children[itemId] ?? [],
    },
    features: [syncDataLoaderFeature, dragAndDropFeature],
    indent: 20,
    seperateDragHandle: true,
    canDrop: (items, target) => {
      const targetId = target.item.getId();
      return items.every(i => i.getId() !== targetId);
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
          ...prev,
          nodes: newNodes,
          children: { ...prev.children, [parentId]: newChildIds },
        };
      });
    }),
  });

  // ---- Handlers ----

  const allTypeOptions = useMemo(() => {
    const builtin = BUILTIN_ORDER.map(t => ({ value: t, label: BUILTIN_LABELS[t] }));
    const custom = Object.entries(treeState.customTypes ?? {}).map(([k, v]) => ({ value: k, label: v.label }));
    return [...builtin, ...custom];
  }, [treeState.customTypes]);

  const openAddModal = (parentId: string | null) => {
    setShowNewTypeInAdd(false);
    setNewTypeForm({ label: '', swatchIdx: 0 });
    setAddModal({ open: true, parentId, form: { ...EMPTY_ADD_FORM, type: 'site' } });
  };

  const closeAddModal = () => {
    setAddModal(prev => ({ ...prev, open: false, form: EMPTY_ADD_FORM }));
    setShowNewTypeInAdd(false);
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
    };
    if (addModal.form.sqft) newNode.sqft = Number(addModal.form.sqft);
    if (addModal.form.maxCapacity) newNode.maxCapacity = Number(addModal.form.maxCapacity);
    if (addModal.form.description.trim()) newNode.description = addModal.form.description.trim();
    if (addModal.form.floorNumber.trim()) newNode.floorNumber = addModal.form.floorNumber.trim();
    if (addModal.form.tags.length > 0) newNode.tags = addModal.form.tags;

    setTreeState(prev => ({
      ...prev,
      nodes: { ...prev.nodes, [newId]: newNode },
      children: {
        ...prev.children,
        [parentKey]: [...(prev.children[parentKey] ?? []), newId],
        [newId]: [],
      },
    }));
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
      const newPinned = (prev.pinnedIds ?? []).filter(pid => !toDelete.has(pid));
      return { ...prev, nodes: newNodes, children: newChildren, pinnedIds: newPinned };
    });
    setCtxMenu(null);
  };

  const openEditModal = (nodeId: string) => {
    const node = treeState.nodes[nodeId];
    if (!node) return;
    setShowNewTypeInEdit(false);
    setNewTypeForm({ label: '', swatchIdx: 0 });
    setEditModal({
      open: true,
      nodeId,
      form: {
        name: node.name,
        type: node.type,
        sqft: node.sqft?.toString() ?? '',
        maxCapacity: node.maxCapacity?.toString() ?? '',
        description: node.description ?? '',
        floorNumber: node.floorNumber ?? '',
        tags: node.tags ?? [],
        tagInput: '',
      },
    });
    setCtxMenu(null);
  };

  const saveEdit = () => {
    const { nodeId, form } = editModal;
    if (!form.name.trim()) return;
    setTreeState(prev => {
      const updated: LocationData = {
        ...prev.nodes[nodeId],
        name: form.name.trim(),
        type: form.type,
      };
      if (form.sqft) updated.sqft = Number(form.sqft); else delete updated.sqft;
      if (form.maxCapacity) updated.maxCapacity = Number(form.maxCapacity); else delete updated.maxCapacity;
      if (form.description.trim()) updated.description = form.description.trim(); else delete updated.description;
      if (form.floorNumber.trim()) updated.floorNumber = form.floorNumber.trim(); else delete updated.floorNumber;
      if (form.tags.length > 0) updated.tags = form.tags; else delete updated.tags;
      return { ...prev, nodes: { ...prev.nodes, [nodeId]: updated } };
    });
    setEditModal(prev => ({ ...prev, open: false }));
  };

  const saveNewType = (forForm: 'add' | 'edit') => {
    if (!newTypeForm.label.trim()) return;
    const typeId = newTypeForm.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const color = TYPE_COLOR_PALETTE[newTypeForm.swatchIdx];
    setTreeState(prev => ({
      ...prev,
      customTypes: { ...(prev.customTypes ?? {}), [typeId]: { label: newTypeForm.label.trim(), color } },
    }));
    if (forForm === 'add') {
      setAddModal(prev => ({ ...prev, form: { ...prev.form, type: typeId } }));
      setShowNewTypeInAdd(false);
    } else {
      setEditModal(prev => ({ ...prev, form: { ...prev.form, type: typeId } }));
      setShowNewTypeInEdit(false);
    }
    setNewTypeForm({ label: '', swatchIdx: 0 });
  };

  const updateForm = (patch: Partial<AddForm>) => {
    setAddModal(prev => ({ ...prev, form: { ...prev.form, ...patch } }));
  };

  const updateEditForm = (patch: Partial<AddForm>) => {
    setEditModal(prev => ({ ...prev, form: { ...prev.form, ...patch } }));
  };

  // ---- Pin handlers (stored in treeState.pinnedIds → Firestore) ----

  const togglePin = (id: string) => {
    setTreeState(prev => {
      const current = new Set(prev.pinnedIds ?? []);
      if (current.has(id)) current.delete(id); else current.add(id);
      return { ...prev, pinnedIds: [...current] };
    });
  };

  const pinAllTopLevel = () => {
    const topIds = treeState.children[ROOT_ID] ?? [];
    setTreeState(prev => {
      const current = new Set(prev.pinnedIds ?? []);
      topIds.forEach(id => current.add(id));
      return { ...prev, pinnedIds: [...current] };
    });
    topIds.forEach(id => { try { tree.getItemInstance(id).expand(); } catch {} });
    setHeaderCtxMenu(null);
  };

  const pinOpenAll = () => {
    const allIds = Object.keys(treeState.nodes);
    setTreeState(prev => ({ ...prev, pinnedIds: allIds }));
    allIds.forEach(id => { try { tree.getItemInstance(id).expand(); } catch {} });
    setHeaderCtxMenu(null);
  };

  const unpinAll = () => {
    setTreeState(prev => ({ ...prev, pinnedIds: [] }));
    setHeaderCtxMenu(null);
  };

  // ---- Expansion effect ----

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const pendingExpansionRef = useRef<string[] | null>(null);
  useEffect(() => {
    if (pendingExpansionRef.current) {
      const ids = pendingExpansionRef.current;
      pendingExpansionRef.current = null;
      ids.forEach(id => { try { tree.getItemInstance(id).expand(); } catch {} });
    }
    // Keep pinned items expanded
    pinnedIds.forEach(id => { try { tree.getItemInstance(id).expand(); } catch {} });
  }, [treeState, pinnedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragLineData = tree.getDragLineData();

  // ---- Shared styles ----

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    marginBottom: '6px',
  };

  // ---- Type section (reused in both modals) ----

  const TypeSection = ({ currentType, onChangeType, showNew, setShowNew, forForm }: {
    currentType: string;
    onChangeType: (t: string) => void;
    showNew: boolean;
    setShowNew: (v: boolean) => void;
    forForm: 'add' | 'edit';
  }) => (
    <div>
      <Select
        label="Type"
        options={allTypeOptions}
        value={currentType}
        onChange={v => onChangeType(v as string)}
      />
      {!showNew ? (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          style={{
            marginTop: 6,
            fontSize: '11px',
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus size={10} /> New Type
        </button>
      ) : (
        <div style={{
          marginTop: 8,
          padding: '10px 12px',
          background: 'var(--bg-surface-inset)',
          borderRadius: 'var(--radius-input)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <label style={labelStyle}>New Type Name</label>
          <input
            autoFocus
            type="text"
            value={newTypeForm.label}
            onChange={e => setNewTypeForm(prev => ({ ...prev, label: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') saveNewType(forForm); if (e.key === 'Escape') setShowNew(false); }}
            placeholder="e.g. Rooftop, Lobby…"
            style={{
              width: '100%', padding: '6px 10px', fontSize: '13px',
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-input)', color: 'var(--text-primary)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PALETTE_SWATCHES.map((hex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewTypeForm(prev => ({ ...prev, swatchIdx: i }))}
                  style={{
                    width: 20, height: 20, borderRadius: '50%', background: hex, border: 'none',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    boxShadow: newTypeForm.swatchIdx === i ? `0 0 0 2px var(--bg-surface-inset), 0 0 0 3px ${hex}` : 'none',
                    transform: newTypeForm.swatchIdx === i ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowNew(false)} style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveNewType(forForm)}
              disabled={!newTypeForm.label.trim()}
              style={{
                fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                background: newTypeForm.label.trim() ? 'color-mix(in srgb, var(--jf-lavender) 25%, transparent)' : 'var(--bg-surface-inset)',
                border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)',
                borderRadius: 6, color: 'var(--jf-cream)', cursor: newTypeForm.label.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ---- Render ----

  return (
    <>
      {/* Recessed container */}
      <div style={{
        background: '#141414',
        borderRadius: 16,
        border: '2px solid #1E1E1E',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        marginBottom: 24,
      }}>

        {/* Header */}
        <div
          onContextMenu={e => {
            e.preventDefault();
            setHeaderCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 210), y: Math.min(e.clientY, window.innerHeight - 120) });
          }}
          style={{
            padding: '16px 20px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #1E1E1E',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <MapPinned size={13} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 700 }}>
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
                Add
              </span>
            </button>
          </div>
        </div>

        {/* Tree */}
        <div style={{ padding: '6px 0', position: 'relative' }}>
          <div {...tree.getContainerProps()} style={{ outline: 'none' }}>
            {tree.getItems().length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(248,243,232,0.25)', fontSize: 13 }}>
                No locations — click "Add" to get started
              </div>
            )}

            {tree.getItems().map(item => {
              const data = item.getItemData();
              // Skip root and tombstones (nodes mid-deletion)
              if (!data || data.id === ROOT_ID || !treeState.nodes[item.getId()]) return null;

              const level = item.getItemMeta().level;
              const isExpanded = item.isExpanded();
              const isDragTarget = item.isDragTarget();
              const isHovered = hoveredId === item.getId();
              const isPinned = pinnedIds.has(item.getId());

              return (
                <div
                  key={item.getId()}
                  {...item.getProps()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    paddingLeft: level * 20 + 10, paddingRight: 20,
                    paddingTop: 7, paddingBottom: 7, minHeight: 40,
                    boxSizing: 'border-box',
                    background: isDragTarget ? 'color-mix(in srgb, var(--jf-lavender) 10%, transparent)' : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                    borderLeft: isDragTarget ? '2px solid color-mix(in srgb, var(--jf-lavender) 50%, transparent)' : isHovered ? '2px solid rgba(255,255,255,0.08)' : '2px solid transparent',
                    outline: 'none', cursor: 'default', userSelect: 'none',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                  onMouseEnter={() => setHoveredId(item.getId())}
                  onMouseLeave={() => setHoveredId(null)}
                  onContextMenu={e => {
                    e.preventDefault();
                    setCtxMenu({ nodeId: item.getId(), nodeName: data.name, x: Math.min(e.clientX, window.innerWidth - 210), y: Math.min(e.clientY, window.innerHeight - 70) });
                  }}
                >
                  {/* Drag grip */}
                  <span
                    {...(item.getDragHandleProps() as React.HTMLAttributes<HTMLSpanElement>)}
                    style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.12)', flexShrink: 0, paddingRight: 2, transition: 'color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.12)'; }}
                  >
                    <GripVertical size={12} />
                  </span>

                  {/* Expand/collapse */}
                  <button
                    onClick={e => { e.stopPropagation(); if (isPinned) return; isExpanded ? item.collapse() : item.expand(); }}
                    style={{ background: 'none', border: 'none', padding: '2px', cursor: !isPinned ? 'pointer' : 'default', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    tabIndex={-1}
                  >
                    <ChevronRight
                      size={12}
                      strokeWidth={isPinned ? 3.5 : 2}
                      style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                        color: isPinned ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                      }}
                    />
                  </button>

                  {/* Type icon */}
                  <span style={{ marginLeft: 4 }}>
                    <NodeTypeIcon type={data.type} size={13} customTypes={treeState.customTypes} />
                  </span>

                  {/* Name */}
                  <div style={{ flex: '0 1 300px', minWidth: 0, marginLeft: 6 }}>
                    <InlineEdit
                      value={data.name}
                      onSave={newName => renameNode(item.getId(), newName)}
                      placeholder="Unnamed..."
                    />
                  </div>

                  {/* Floor number chip */}
                  {data.type === 'floor' && data.floorNumber && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, letterSpacing: '0.03em',
                      padding: '3px 14px', marginLeft: 40, borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)',
                      border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      F{data.floorNumber}
                    </span>
                  )}

                  {/* Location tags for zones & interiors */}
                  {['zone', 'exterior', 'coveredExterior', 'openAir', 'room'].includes(data.type) && (data.tags ?? []).length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 20, flexShrink: 0 }}>
                      {data.tags!.map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 9, fontWeight: 500, letterSpacing: '0.03em',
                            padding: '2px 8px', borderRadius: 5,
                            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)',
                            border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }} />

                  {/* Add child button */}
                  <div style={{ width: 120, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    {data.parentId === null ? (
                      <button
                        onClick={e => { e.stopPropagation(); openAddModal(item.getId()); }}
                        className="group flex items-center gap-2 bg-transparent rounded-full border border-[#c8c8c8] hover:bg-[#d4d4d4] hover:border-transparent transition-all duration-200 pl-1 pr-3 py-1"
                      >
                        <span className="w-5 h-5 flex items-center justify-center rounded-full border border-[#c8c8c8] text-[#c8c8c8] group-hover:border-[#4caf50] group-hover:text-[#4caf50] group-hover:shadow-[0_0_0_1px_#4caf50] transition-all duration-200">
                          <Plus size={10} />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#c8c8c8] group-hover:text-[#2a2a2a] transition-colors duration-200">
                          Nest
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); openAddModal(item.getId()); }}
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

          {/* Drop line */}
          {dragLineData && (
            <div style={{
              ...tree.getDragLineStyle(), position: 'absolute', height: 2,
              background: 'var(--jf-lavender)', borderRadius: 2,
              pointerEvents: 'none', zIndex: 100, opacity: 0.75,
            }} />
          )}
        </div>
      </div>

      {/* Node context menu */}
      {ctxMenu && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }} onClick={() => setCtxMenu(null)} onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }} />
          <div style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 10001, width: 200, padding: '8px', backgroundColor: 'rgba(20,20,20,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '6px 12px 8px', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ctxMenu.nodeName}
            </div>
            <DropdownItem onClick={() => {
              togglePin(ctxMenu.nodeId);
              if (!pinnedIds.has(ctxMenu.nodeId)) { try { tree.getItemInstance(ctxMenu.nodeId).expand(); } catch {} }
              setCtxMenu(null);
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={13} strokeWidth={pinnedIds.has(ctxMenu.nodeId) ? 2 : 3.5} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{pinnedIds.has(ctxMenu.nodeId) ? 'Unpin' : 'Pin Open'}</span>
              </div>
            </DropdownItem>
            <DropdownItem onClick={() => { openAddModal(ctxMenu.nodeId); setCtxMenu(null); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Add Child</span>
              </div>
            </DropdownItem>
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

      {/* Header context menu */}
      {headerCtxMenu && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }} onClick={() => setHeaderCtxMenu(null)} onContextMenu={e => { e.preventDefault(); setHeaderCtxMenu(null); }} />
          <div style={{ position: 'fixed', top: headerCtxMenu.y, left: headerCtxMenu.x, zIndex: 10001, width: 200, padding: '8px', backgroundColor: 'rgba(20,20,20,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '6px 12px 8px', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)' }}>
              Location Tree
            </div>
            <DropdownItem onClick={pinAllTopLevel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={13} strokeWidth={3.5} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Pin Open</span>
              </div>
            </DropdownItem>
            <DropdownItem onClick={pinOpenAll}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={13} strokeWidth={3.5} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Pin Open All</span>
              </div>
            </DropdownItem>
            <DropdownItem onClick={() => {
              setTreeState(prev => ({ ...prev, pinnedIds: [] }));
              setTimeout(() => {
                Object.keys(treeState.nodes).forEach(id => {
                  try { tree.getItemInstance(id).collapse(); } catch {}
                });
              }, 0);
              setHeaderCtxMenu(null);
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={13} strokeWidth={2} style={{ color: 'var(--text-secondary)', flexShrink: 0, transform: 'rotate(-90deg)' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Collapse All</span>
              </div>
            </DropdownItem>
            {pinnedIds.size > 0 && (
              <DropdownItem onClick={unpinAll}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={13} strokeWidth={2} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Unpin All</span>
                </div>
              </DropdownItem>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Add-node modal */}
      <Modal.Root open={addModal.open} onClose={closeAddModal}>
        <Modal.Overlay />
        <Modal.Content size="2xl">
          <Modal.Header>
            <InlineEdit
              value={addModal.form.name || ''}
              onSave={(val) => updateForm({ name: val })}
              placeholder="Enter node name..."
              variant="agenda-heading"
              className="flex-1"
            />
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <TypeSection
              currentType={addModal.form.type}
              onChangeType={t => updateForm({ type: t })}
              showNew={showNewTypeInAdd}
              setShowNew={setShowNewTypeInAdd}
              forForm="add"
            />
            {addModal.form.type === 'floor' && (
              <Input label="Floor Number" type="text" inputMode="numeric" value={addModal.form.floorNumber} onChange={e => updateForm({ floorNumber: e.target.value })} placeholder="e.g. 1, LL, G, M" />
            )}
            {['zone', 'exterior', 'coveredExterior', 'openAir', 'room'].includes(addModal.form.type) && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Location Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  {addModal.form.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {tag}
                      <button onClick={() => updateForm({ tags: addModal.form.tags.filter(t => t !== tag) })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      value={addModal.form.tagInput}
                      onChange={e => updateForm({ tagInput: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && addModal.form.tagInput.trim()) {
                          e.preventDefault();
                          const val = addModal.form.tagInput.trim();
                          if (!addModal.form.tags.includes(val)) updateForm({ tags: [...addModal.form.tags, val], tagInput: '' });
                        }
                      }}
                      placeholder="Add tag..."
                      style={{ fontSize: 11, width: 90, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        const val = addModal.form.tagInput.trim();
                        if (val && !addModal.form.tags.includes(val)) updateForm({ tags: [...addModal.form.tags, val], tagInput: '' });
                      }}
                      style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.15)', background: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Square Footage" type="number" value={addModal.form.sqft} onChange={e => updateForm({ sqft: e.target.value })} placeholder="0" min="0" />
              <Input label="Max Capacity" type="number" value={addModal.form.maxCapacity} onChange={e => updateForm({ maxCapacity: e.target.value })} placeholder="0" min="0" />
            </div>
            <Textarea label="Description" value={addModal.form.description} onChange={e => updateForm({ description: e.target.value })} placeholder="Optional notes..." rows={3} />
          </Modal.Body>
          <Modal.Footer className="justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={closeAddModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveNode} disabled={!addModal.form.name.trim()}>
              Add {getTypeLabel(addModal.form.type, treeState.customTypes)}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Edit-node modal */}
      <Modal.Root open={editModal.open} onClose={() => setEditModal(prev => ({ ...prev, open: false }))}>
        <Modal.Overlay />
        <Modal.Content size="2xl">
          <Modal.Header>
            <InlineEdit
              value={editModal.form.name || ''}
              onSave={(val) => updateEditForm({ name: val })}
              placeholder="Enter node name..."
              variant="agenda-heading"
              className="flex-1"
            />
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <TypeSection
              currentType={editModal.form.type}
              onChangeType={t => updateEditForm({ type: t })}
              showNew={showNewTypeInEdit}
              setShowNew={setShowNewTypeInEdit}
              forForm="edit"
            />
            {editModal.form.type === 'floor' && (
              <Input label="Floor Number" type="text" inputMode="numeric" value={editModal.form.floorNumber} onChange={e => updateEditForm({ floorNumber: e.target.value })} placeholder="e.g. 1, LL, G, M" />
            )}
            {['zone', 'exterior', 'coveredExterior', 'openAir', 'room'].includes(editModal.form.type) && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Location Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  {editModal.form.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {tag}
                      <button onClick={() => updateEditForm({ tags: editModal.form.tags.filter(t => t !== tag) })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      value={editModal.form.tagInput}
                      onChange={e => updateEditForm({ tagInput: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && editModal.form.tagInput.trim()) {
                          e.preventDefault();
                          const val = editModal.form.tagInput.trim();
                          if (!editModal.form.tags.includes(val)) updateEditForm({ tags: [...editModal.form.tags, val], tagInput: '' });
                        }
                      }}
                      placeholder="Add tag..."
                      style={{ fontSize: 11, width: 90, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        const val = editModal.form.tagInput.trim();
                        if (val && !editModal.form.tags.includes(val)) updateEditForm({ tags: [...editModal.form.tags, val], tagInput: '' });
                      }}
                      style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.15)', background: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Square Footage" type="number" value={editModal.form.sqft} onChange={e => updateEditForm({ sqft: e.target.value })} placeholder="0" min="0" />
              <Input label="Max Capacity" type="number" value={editModal.form.maxCapacity} onChange={e => updateEditForm({ maxCapacity: e.target.value })} placeholder="0" min="0" />
            </div>
            <Textarea label="Description" value={editModal.form.description} onChange={e => updateEditForm({ description: e.target.value })} placeholder="Optional notes..." rows={3} />
          </Modal.Body>
          <Modal.Footer className="justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setEditModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveEdit} disabled={!editModal.form.name.trim()}>Save Changes</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
