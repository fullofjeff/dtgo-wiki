import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useReactFlow,
  useNodesState,
  useEdgesState,
  reconnectEdge,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeDragHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil, Check, X, ZoomIn, ZoomOut, Maximize2, Plus, Trash2 } from 'lucide-react';

import { initialOrgEntities, type OrgEntity } from '@/data/orgData';
import {
  subscribeToOrgEntities,
  saveOrgEntity,
  updateOrgEntity,
  deleteOrgEntityTree,
  batchUpdateOrgEntities,
  seedOrgEntities,
} from '@/services/orgService';
import { OrgNode, type OrgNodeData } from '../org-chart/OrgNode';
import { getLayoutedElements } from '../org-chart/layoutUtils';
import { Modal } from '../ui/Modal';
import { AgendaHeader, UnifiedOutline, DEFAULT_TABS, INITIAL_ACTIVE_TAB, type ActiveTabMetrics } from '../tab-ui';
import { useTabs } from '@/hooks/useTabs';
import { SearchBar } from '../layout/SearchBar';
import { ToolbarButton } from '../tab-ui/ToolbarButton';
import '../tab-ui/canvas-toolbar.css';

const nodeTypes = { orgNode: OrgNode };

function buildGraph(entities: OrgEntity[]) {
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
        reconnectable: true,
        selectable: true,
        style: {
          stroke: parent?.accentColor ?? 'var(--border-default)',
          strokeWidth: 1.5,
          opacity: 0.4,
        },
      };
    });

  return getLayoutedElements(nodes, edges, 'TB');
}

function getBreadcrumb(entity: OrgEntity, entities: OrgEntity[]): string[] {
  const path: string[] = [];
  let current: OrgEntity | undefined = entity;
  while (current) {
    path.unshift(current.name);
    current = current.parentId
      ? entities.find((e) => e.id === current!.parentId)
      : undefined;
  }
  return path;
}

type ModalMode = 'view' | 'edit' | 'add-child';

interface EditData {
  summary: string;
  leaderName: string;
  leaderTitle: string;
  description: string;
}

const emptyEditData: EditData = { summary: '', leaderName: '', leaderTitle: '', description: '' };

interface AddChildData {
  name: string;
  description: string;
  leaderName: string;
  leaderTitle: string;
}

const emptyAddChild: AddChildData = { name: '', description: '', leaderName: '', leaderTitle: '' };

function OrgChartInner() {
  // ── Entity state with Firestore real-time sync ──
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [firestoreReady, setFirestoreReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOrgEntities(
      (fetched) => {
        if (fetched.length === 0 && !firestoreReady) {
          // First load and Firestore is empty — seed with initial data
          seedOrgEntities(initialOrgEntities).then(() => setFirestoreReady(true));
          return;
        }
        setEntities(fetched);
        setFirestoreReady(true);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        // Fallback to initial data if Firestore fails
        setEntities(initialOrgEntities);
        setFirestoreReady(true);
      },
    );
    return () => unsubscribe();
  }, [firestoreReady]);

  // ReactFlow interactive state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Color change from node picker — cascades to descendants with same color
  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    const descendants = new Set<string>();
    const findDesc = (id: string) => {
      const parent = entities.find(p => p.id === id);
      entities.filter(e => e.parentId === id).forEach(e => {
        if (e.accentColor === parent?.accentColor) {
          descendants.add(e.id);
          findDesc(e.id);
        }
      });
    };
    descendants.add(nodeId);
    findDesc(nodeId);

    // Optimistic local update
    setEntities(prev => prev.map(e => descendants.has(e.id) ? { ...e, accentColor: color } : e));

    // Persist to Firestore
    const updates = Array.from(descendants).map(id => ({ id, fields: { accentColor: color } }));
    batchUpdateOrgEntities(updates).catch(console.error);
  }, [entities]);

  // Rebuild graph whenever entities change
  useEffect(() => {
    const { nodes: layouted, edges: layoutedEdges } = buildGraph(entities);
    // Inject onColorChange into node data
    const nodesWithCallbacks = layouted.map(n => ({
      ...n,
      data: { ...n.data, onColorChange: handleNodeColorChange },
    }));
    setNodes(nodesWithCallbacks);
    setEdges(layoutedEdges);
  }, [entities, setNodes, setEdges, handleNodeColorChange]);

  // ── Edge reconnection — reparent entity when edge is dragged to new node ──
  const handleReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (!newConnection.source) return;
    setEdges(prev => reconnectEdge(oldEdge, newConnection, prev));
    setEntities(prev => prev.map(e =>
      e.id === oldEdge.target
        ? { ...e, parentId: newConnection.source! }
        : e
    ));
    // Persist reparent to Firestore
    updateOrgEntity(oldEdge.target, { parentId: newConnection.source! }).catch(console.error);
  }, [setEdges]);

  // ── New edge connection — drag from source handle to target handle ──
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const sourceEntity = entities.find(e => e.id === connection.source);
    setEdges(prev => addEdge({
      ...connection,
      type: 'smoothstep',
      reconnectable: true,
      selectable: true,
      style: {
        stroke: sourceEntity?.accentColor ?? 'var(--border-default)',
        strokeWidth: 1.5,
        opacity: 0.4,
      },
    }, prev));
    setEntities(prev => prev.map(e =>
      e.id === connection.target ? { ...e, parentId: connection.source! } : e
    ));
    updateOrgEntity(connection.target!, { parentId: connection.source! }).catch(console.error);
  }, [entities, setEdges]);

  // ── Node context menu ──
  const [nodeMenu, setNodeMenu] = useState<{ entity: OrgEntity; x: number; y: number } | null>(null);

  // ── Modal state ──
  const [selected, setSelected] = useState<OrgEntity | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [editData, setEditData] = useState<EditData>(emptyEditData);
  const [addChildData, setAddChildData] = useState<AddChildData>(emptyAddChild);
  const navigate = useNavigate();
  const [pageTitle, setPageTitle] = useState('Corporate Structure');

  // ── Tab system state ──
  const { zoomIn, zoomOut, fitView, screenToFlowPosition } = useReactFlow();
  const contextMenuCloseRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const activeTabPortalRef = useRef<HTMLDivElement>(null);
  const [tabMetrics, setTabMetrics] = useState<ActiveTabMetrics | null>(null);

  const {
    tabs,
    activeTabId,
    setActiveTab,
    addTab,
    removeTab,
    reorderTabs,
    updateTab,
  } = useTabs({
    defaultTabs: DEFAULT_TABS,
    initialActiveTabId: INITIAL_ACTIVE_TAB,
  });

  const handleTabRename = useCallback((tabId: string, newTitle: string) => {
    updateTab(tabId, { title: newTitle });
  }, [updateTab]);

  const handleAddTab = useCallback(() => {
    const id = `org-chart-${Date.now()}`;
    addTab({ id, title: 'New Org Chart', closable: true });
  }, [addTab]);

  // ── Node click → open modal ──
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Shift+click = select only (no modal)
    if (event.shiftKey) return;
    const entity = entities.find((e) => e.id === node.id);
    if (entity) {
      setSelected(entity);
      setModalMode('view');
    }
  }, [entities]);

  const closeModal = useCallback(() => {
    setSelected(null);
    setModalMode('view');
    setAddChildData(emptyAddChild);
  }, []);

  // ── Edit entity ──
  const startEdit = useCallback(() => {
    if (!selected) return;
    setEditData({
      summary: selected.summary || selected.description,
      leaderName: selected.leader?.name || '',
      leaderTitle: selected.leader?.title || '',
      description: selected.description,
    });
    setModalMode('edit');
  }, [selected]);

  const cancelEdit = useCallback(() => setModalMode('view'), []);

  const saveEdit = useCallback(() => {
    if (!selected) return;
    const updatedFields: Partial<OrgEntity> = {
      summary: editData.summary,
      description: editData.description,
      leader: editData.leaderName
        ? { name: editData.leaderName, title: editData.leaderTitle }
        : undefined,
    };
    // Optimistic local update
    setEntities(prev => prev.map(e =>
      e.id === selected.id ? { ...e, ...updatedFields } : e
    ));
    setSelected(prev => prev ? { ...prev, ...updatedFields } : null);
    setModalMode('view');
    // Persist to Firestore
    updateOrgEntity(selected.id, updatedFields).catch(console.error);
  }, [selected, editData]);

  // ── Add child entity ──
  const startAddChild = useCallback(() => {
    setAddChildData(emptyAddChild);
    setModalMode('add-child');
  }, []);

  const saveAddChild = useCallback(() => {
    if (!selected || !addChildData.name.trim()) return;
    const newEntity: OrgEntity = {
      id: `entity-${Date.now()}`,
      name: addChildData.name.trim(),
      description: addChildData.description.trim(),
      parentId: selected.id,
      leader: addChildData.leaderName.trim()
        ? { name: addChildData.leaderName.trim(), title: addChildData.leaderTitle.trim() }
        : undefined,
      accentColor: selected.accentColor,
    };
    // Optimistic local update
    setEntities(prev => [...prev, newEntity]);
    closeModal();
    // Persist to Firestore
    saveOrgEntity(newEntity).catch(console.error);
  }, [selected, addChildData, closeModal]);

  // ── Delete entity (and all descendants) ──
  const handleDeleteEntity = useCallback(() => {
    if (!selected || !selected.parentId) return; // Can't delete root
    const entitiesToDelete = [...entities];
    // Optimistic local update
    setEntities(prev => {
      const descendants = new Set<string>();
      const findDescendants = (id: string) => {
        descendants.add(id);
        prev.filter(e => e.parentId === id).forEach(e => findDescendants(e.id));
      };
      findDescendants(selected.id);
      return prev.filter(e => !descendants.has(e.id));
    });
    closeModal();
    // Persist to Firestore
    deleteOrgEntityTree(selected.id, entitiesToDelete).catch(console.error);
  }, [selected, entities, closeModal]);

  // ── Drag children with parent ──
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleNodeDragStart: NodeDragHandler = useCallback((_event, node) => {
    dragStartPos.current = { x: node.position.x, y: node.position.y };
  }, []);

  const handleNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
    if (!dragStartPos.current) return;
    const dx = node.position.x - dragStartPos.current.x;
    const dy = node.position.y - dragStartPos.current.y;
    dragStartPos.current = null;
    if (dx === 0 && dy === 0) return;

    // Find all descendants
    const descendants = new Set<string>();
    const findDesc = (id: string) => {
      entities.filter(e => e.parentId === id).forEach(e => {
        descendants.add(e.id);
        findDesc(e.id);
      });
    };
    findDesc(node.id);
    if (descendants.size === 0) return;

    setNodes(prev => prev.map(n =>
      descendants.has(n.id)
        ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
        : n
    ));
  }, [entities, setNodes]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const entity = entities.find(e => e.id === node.id);
    if (entity) setNodeMenu({ entity, x: event.clientX, y: event.clientY });
  }, [entities]);

  // ── Pane context menu (right-click canvas to create card) ──
  const [paneMenu, setPaneMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setPaneMenu({
      x: event.clientX,
      y: event.clientY,
      flowX: flowPos.x,
      flowY: flowPos.y,
    });
  }, [screenToFlowPosition]);

  const handlePaneClick = useCallback(() => {
    contextMenuCloseRef.current?.();
    setNodeMenu(null);
    setPaneMenu(null);
  }, []);

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

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    display: 'block',
    marginBottom: 4,
  };

  return (
    <>
      <div
        className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-visible"
        style={{ height: '100vh' }}
      >
        {/* Active Tab Portal Target */}
        <div
          ref={activeTabPortalRef}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 120 }}
        />

        {/* Header Background Layer */}
        <div
          className="absolute top-0 left-0 z-30 pointer-events-none"
          style={{
            height: '160px',
            background: 'rgba(20, 20, 24, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            marginLeft: '6px',
            marginRight: '6px',
            width: 'calc(100% - 12px)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        />

        {/* Header Content */}
        <div className="flex-shrink-0 relative z-50" style={{ marginLeft: '6px', marginRight: '6px' }}>
          <AgendaHeader
            pageTitle={pageTitle}
            titleVariant="editable"
            titlePlaceholder="Name this org chart..."
            onTitleSave={setPageTitle}
            tabs={tabs}
            activeTabId={activeTabId}
            onActiveTabChange={setActiveTab}
            onTabAdd={handleAddTab}
            onTabRename={handleTabRename}
            onTabRemove={removeTab}
            onTabReorder={reorderTabs}
            onActiveTabMetrics={setTabMetrics}
            contextMenuCloseRef={contextMenuCloseRef}
            activeTabPortalRef={activeTabPortalRef}
            height={80}
            style={{
              zIndex: 100,
              background: 'transparent',
              position: 'relative',
              marginLeft: 0,
              paddingLeft: '1.25rem',
              paddingRight: '1.5rem',
              gap: '1rem',
              top: 'auto',
              right: 'auto',
              left: 'auto',
            }}
          />
        </div>

        {/* Unified Outline SVG */}
        <UnifiedOutline
          tabMetrics={tabMetrics}
          canvasRef={canvasRef}
          headerHeight={80}
          tabHeight={60}
          canvasBorderRadius={16}
        />

        {/* Canvas Container */}
        <div
          ref={canvasRef}
          className="flex-1 relative min-h-0 rounded-2xl overflow-visible z-[150]"
          style={{
            marginTop: '-1px',
            marginLeft: '6px',
            marginRight: '6px',
            marginBottom: '2px',
            borderRadius: '16px',
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl overflow-visible bg-[#18181A] transform-gpu flex flex-col"
            style={{ borderRadius: '16px' }}
          >
            <div className="flex-1 relative min-h-0 overflow-hidden rounded-t-2xl">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onNodeClick={handleNodeClick}
                onNodeContextMenu={handleNodeContextMenu}
                onNodeDragStart={handleNodeDragStart}
                onNodeDragStop={handleNodeDragStop}
                onPaneClick={handlePaneClick}
                onContextMenu={handlePaneContextMenu}
                edgesReconnectable={true}
                onReconnect={handleReconnect}
                multiSelectionKeyCode="Shift"
                selectionOnDrag={true}
                selectNodesOnDrag={false}
                fitView
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="rgba(248, 243, 232, 0.03)" gap={24} size={1.5} />
              </ReactFlow>
              <div className="absolute inset-0 pointer-events-none z-0 border-t-[8px] border-l-[8px] border-[#18181A] rounded-tl-[16px]" />
            </div>
            {/* Bottom Toolbar */}
            <div className="canvas-toolbar rounded-b-2xl">
              <SearchBar />
              <div className="canvas-toolbar__right-section">
                <ToolbarButton
                  icon={<ZoomOut style={{ width: 14, height: 14 }} />}
                  onClick={() => zoomOut()}
                  title="Zoom out"
                />
                <ToolbarButton
                  icon={<ZoomIn style={{ width: 14, height: 14 }} />}
                  onClick={() => zoomIn()}
                  title="Zoom in"
                />
                <ToolbarButton
                  icon={<Maximize2 style={{ width: 14, height: 14 }} />}
                  onClick={() => fitView({ padding: 0.1 })}
                  title="Fit view"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Entity Modal */}
      <Modal.Root open={!!selected} onClose={closeModal}>
        <Modal.Overlay />
        <Modal.Content size="lg" className="h-[480px]">
          <Modal.Header>
            <div className="flex-1 min-w-0">
              {selected && getBreadcrumb(selected, entities).length > 1 && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 300, marginBottom: 4 }}>
                  {getBreadcrumb(selected, entities).join(' › ')}
                </div>
              )}
              <Modal.Title>
                {modalMode === 'add-child' ? `Add Child to ${selected?.name}` : (
                  selected?.wikiSlug ? (
                    <span
                      style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}
                      onClick={() => { closeModal(); navigate(`/file/${selected.wikiSlug}`); }}
                      title="View Wiki Page"
                    >
                      {selected?.name}
                    </span>
                  ) : selected?.name
                )}
              </Modal.Title>
            </div>
            {modalMode === 'view' && (
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
            {modalMode === 'edit' ? (
              /* ── Edit Mode ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input
                    style={inputStyle}
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Summary</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 100 }}
                    value={editData.summary}
                    onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Leader Name</label>
                    <input
                      style={inputStyle}
                      value={editData.leaderName}
                      onChange={(e) => setEditData({ ...editData, leaderName: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Leader Title</label>
                    <input
                      style={inputStyle}
                      value={editData.leaderTitle}
                      onChange={(e) => setEditData({ ...editData, leaderTitle: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : modalMode === 'add-child' ? (
              /* ── Add Child Mode ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input
                    style={inputStyle}
                    value={addChildData.name}
                    onChange={(e) => setAddChildData({ ...addChildData, name: e.target.value })}
                    placeholder="Entity name"
                    autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input
                    style={inputStyle}
                    value={addChildData.description}
                    onChange={(e) => setAddChildData({ ...addChildData, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Leader Name</label>
                    <input
                      style={inputStyle}
                      value={addChildData.leaderName}
                      onChange={(e) => setAddChildData({ ...addChildData, leaderName: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Leader Title</label>
                    <input
                      style={inputStyle}
                      value={addChildData.leaderTitle}
                      onChange={(e) => setAddChildData({ ...addChildData, leaderTitle: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 300 }}>
                  Color and parent will be inherited from <strong style={{ color: 'var(--jf-cream)' }}>{selected?.name}</strong>
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
            {modalMode === 'edit' ? (
              <>
                {/* Delete button — only for non-root entities */}
                {selected?.parentId && (
                  <button
                    onClick={handleDeleteEntity}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', marginRight: 'auto' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
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
            ) : modalMode === 'add-child' ? (
              <>
                <button
                  onClick={() => setModalMode('view')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)', background: 'transparent', border: '1px solid #333', cursor: 'pointer' }}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={saveAddChild}
                  disabled={!addChildData.name.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: addChildData.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                    background: addChildData.name.trim() ? 'rgba(34,201,151,0.15)' : 'transparent',
                    border: `1px solid ${addChildData.name.trim() ? 'rgba(34,201,151,0.3)' : '#333'}`,
                    cursor: addChildData.name.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Plus size={14} /> Add Entity
                </button>
              </>
            ) : (
              <div />
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Node right-click context menu */}
      {nodeMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setNodeMenu(null)} />
          <div
            style={{
              position: 'fixed',
              left: nodeMenu.x,
              top: nodeMenu.y,
              zIndex: 9999,
              backgroundColor: 'rgb(32, 32, 36)',
              borderRadius: 8,
              padding: '4px 0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              minWidth: 160,
            }}
          >
            {[
              { id: 'add-child', label: 'Add Child Entity' },
              { id: 'edit', label: 'Edit Entity' },
              ...(nodeMenu.entity.parentId ? [{ id: 'delete', label: 'Delete Entity' }] : []),
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  const entity = nodeMenu.entity;
                  setNodeMenu(null);
                  if (item.id === 'add-child') {
                    setSelected(entity);
                    setAddChildData(emptyAddChild);
                    setModalMode('add-child');
                  } else if (item.id === 'edit') {
                    setSelected(entity);
                    setEditData({
                      summary: entity.summary || entity.description,
                      leaderName: entity.leader?.name || '',
                      leaderTitle: entity.leader?.title || '',
                      description: entity.description,
                    });
                    setModalMode('edit');
                  } else if (item.id === 'delete') {
                    const entitiesToDelete = [...entities];
                    setEntities(prev => {
                      const descendants = new Set<string>();
                      const findDesc = (id: string) => {
                        descendants.add(id);
                        prev.filter(e => e.parentId === id).forEach(e => findDesc(e.id));
                      };
                      findDesc(entity.id);
                      return prev.filter(e => !descendants.has(e.id));
                    });
                    deleteOrgEntityTree(entity.id, entitiesToDelete).catch(console.error);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: item.id === 'delete' ? '#ef4444' : 'rgba(235, 231, 199, 0.8)',
                  fontSize: '0.85rem',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(235, 231, 199, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pane right-click context menu — create new card */}
      {paneMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setPaneMenu(null)} />
          <div
            style={{
              position: 'fixed',
              left: paneMenu.x,
              top: paneMenu.y,
              zIndex: 9999,
              backgroundColor: 'rgb(32, 32, 36)',
              borderRadius: 8,
              padding: '4px 0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              minWidth: 160,
            }}
          >
            <div
              onClick={() => {
                const newEntity: OrgEntity = {
                  id: `entity-${Date.now()}`,
                  name: 'New Entity',
                  description: '',
                  parentId: null,
                  accentColor: 'var(--jf-lavender)',
                };
                // Optimistic local update
                setEntities(prev => [...prev, newEntity]);
                setNodes(prev => [...prev, {
                  id: newEntity.id,
                  type: 'orgNode',
                  position: { x: paneMenu.flowX, y: paneMenu.flowY },
                  data: {
                    label: newEntity.name,
                    description: newEntity.description,
                    accentColor: newEntity.accentColor,
                    onColorChange: handleNodeColorChange,
                  },
                }]);
                setPaneMenu(null);
                // Open modal to set name/details
                setSelected(newEntity);
                setEditData({ summary: '', leaderName: '', leaderTitle: '', description: '' });
                setModalMode('edit');
                // Persist to Firestore
                saveOrgEntity(newEntity).catch(console.error);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                cursor: 'pointer',
                color: 'rgba(235, 231, 199, 0.8)',
                fontSize: '0.85rem',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(235, 231, 199, 0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              New Entity
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function OrgChartPage() {
  return (
    <ReactFlowProvider>
      <OrgChartInner />
    </ReactFlowProvider>
  );
}
