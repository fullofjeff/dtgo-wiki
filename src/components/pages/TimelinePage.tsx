import { useState, useEffect, useCallback, useMemo } from 'react';
import { Chrono } from 'react-chrono';
import root from 'react-shadow';
import chronoStyles from 'react-chrono/dist/style.css?raw';
import { Link } from 'react-router-dom';
import { Home, ChevronRight, Pencil, X, Check, ExternalLink, Trash2, Plus } from 'lucide-react';
import { ToolbarButton } from '../tab-ui/ToolbarButton';
import { Modal } from '../ui/Modal';
import type { TimelineEvent } from '@/data/timelineData';
import { initialTimelineEvents } from '@/data/timelineData';
import {
  subscribeToTimelineEvents,
  seedTimelineEvents,
  updateTimelineEvent,
  saveTimelineEvent,
  deleteTimelineEvent,
} from '@/services/timelineService';

type ModalMode = 'view' | 'edit' | 'add';

interface EditData {
  year: string;
  title: string;
  description: string;
  source: string;
  entityTag: string;
}

const emptyEditData: EditData = {
  year: '',
  title: '',
  description: '',
  source: '',
  entityTag: '',
};

const entityTagColors: Record<string, { bg: string; color: string; label: string }> = {
  dtgo: { bg: 'rgba(34,201,151,0.12)', color: 'var(--dtgo-green)', label: 'DTGO' },
  mqdc: { bg: 'rgba(79,140,255,0.12)', color: 'var(--mqdc-blue)', label: 'MQDC' },
  dtp: { bg: 'rgba(232,67,147,0.12)', color: 'var(--dtp-pink)', label: 'DTP' },
  tnb: { bg: 'rgba(245,166,35,0.12)', color: 'var(--tnb-orange)', label: 'T&B Media' },
};

const chronoTheme = {
  primary: '#d8830a',
  secondary: '#191918',
  cardBgColor: '#1a1a1a',
  cardDetailsBackGround: '#1a1a1a',
  cardDetailsColor: 'rgba(248, 243, 232, 0.7)',
  titleColor: '#ebe7c7',
  titleColorActive: '#d8830a',
  cardTitleColor: '#f8f3e8',
  cardSubtitleColor: 'rgba(248, 243, 232, 0.5)',
  textColor: '#f8f3e8',
  timelineBgColor: 'transparent',
  toolbarBtnBgColor: '#1a1a1a',
  toolbarTextColor: '#ebe7c7',
  iconBackgroundColor: '#d8830a',
};

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

export function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [editData, setEditData] = useState<EditData>(emptyEditData);
  const [seeded, setSeeded] = useState(false);

  // Subscribe to Firestore
  useEffect(() => {
    const unsub = subscribeToTimelineEvents(
      (firestoreEvents) => {
        if (firestoreEvents.length === 0 && !seeded) {
          setSeeded(true);
          seedTimelineEvents(initialTimelineEvents).catch(console.error);
          return;
        }
        setEvents(firestoreEvents);
      },
      (err) => console.error('Timeline subscription error:', err),
    );
    return unsub;
  }, [seeded]);

  // Sort events by sortOrder
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.sortOrder - b.sortOrder),
    [events],
  );

  const openModal = useCallback(
    (evt: TimelineEvent) => {
      setSelected(evt);
      setModalMode('view');
    },
    [],
  );

  // Map to react-chrono items
  const chronoItems = useMemo(
    () =>
      sortedEvents.map((evt) => ({
        title: evt.year,
        cardTitle: evt.title,
        cardDetailedText: evt.description,
      })),
    [sortedEvents],
  );

  const closeModal = useCallback(() => {
    setSelected(null);
    setModalMode('view');
    setEditData(emptyEditData);
  }, []);

  const startEdit = useCallback(() => {
    if (!selected) return;
    setEditData({
      year: selected.year,
      title: selected.title,
      description: selected.description,
      source: selected.source,
      entityTag: selected.entityTag || '',
    });
    setModalMode('edit');
  }, [selected]);

  const cancelEdit = useCallback(() => setModalMode('view'), []);

  const saveEdit = useCallback(() => {
    if (!selected) return;
    const updatedFields: Partial<TimelineEvent> = {
      year: editData.year,
      title: editData.title,
      description: editData.description,
      source: editData.source,
      entityTag: editData.entityTag || undefined,
    };
    // Optimistic local update
    setEvents((prev) =>
      prev.map((e) => (e.id === selected.id ? { ...e, ...updatedFields } : e)),
    );
    setSelected((prev) => (prev ? { ...prev, ...updatedFields } : null));
    setModalMode('view');
    updateTimelineEvent(selected.id, updatedFields).catch(console.error);
  }, [selected, editData]);

  // Add new event
  const startAdd = useCallback(() => {
    const maxOrder = sortedEvents.length > 0
      ? Math.max(...sortedEvents.map((e) => e.sortOrder))
      : 0;
    setEditData({
      year: '',
      title: '',
      description: '',
      source: '',
      entityTag: '',
    });
    setSelected({
      id: `evt-${Date.now()}`,
      year: '',
      title: '',
      description: '',
      source: '',
      sortOrder: maxOrder + 1,
    });
    setModalMode('add');
  }, [sortedEvents]);

  const saveAdd = useCallback(() => {
    if (!selected || !editData.title.trim()) return;
    const newEvent: TimelineEvent = {
      id: selected.id,
      year: editData.year,
      title: editData.title,
      description: editData.description,
      source: editData.source,
      sortOrder: selected.sortOrder,
      entityTag: editData.entityTag || undefined,
    };
    setEvents((prev) => [...prev, newEvent]);
    closeModal();
    saveTimelineEvent(newEvent).catch(console.error);
  }, [selected, editData, closeModal]);

  const handleDelete = useCallback(() => {
    if (!selected) return;
    setEvents((prev) => prev.filter((e) => e.id !== selected.id));
    closeModal();
    deleteTimelineEvent(selected.id).catch(console.error);
  }, [selected, closeModal]);

  const tagInfo = selected?.entityTag ? entityTagColors[selected.entityTag] : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <Link to="/" className="text-[var(--jf-lavender)] hover:underline flex items-center gap-1">
            <Home size={12} /> Home
          </Link>
          <ChevronRight size={12} className="opacity-30" />
          <span className="text-[var(--text-primary)]">Timeline</span>
        </div>
        <ToolbarButton
          label="Add Event"
          icon={<Plus size={14} />}
          onClick={startAdd}
        />
      </div>

      {/* Page title */}
      <h1
        className="mb-6"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '2rem',
          fontWeight: 600,
          color: 'var(--jf-cream)',
        }}
      >
        DTGO Group Timeline
      </h1>

      {/* Timeline */}
      <root.div style={{ width: '100%' }}>
        <style>{chronoStyles}</style>
        <style>{`
          /* Dark theme overrides inside Shadow DOM */
          :host { display: block; background: transparent; }
          .chrono-container, .chrono-container div, .chrono-container section, .chrono-container article {
            background-color: transparent !important;
            color: #f8f3e8 !important;
          }
          [class*="TimelineCard"] {
            background: #1a1a1a !important;
            color: #f8f3e8 !important;
            border-radius: 14px !important;
            border: 1px solid rgba(255,255,255,0.06) !important;
          }
          [class*="CardTitle"], [class*="card-title"], h3 {
            color: #ebe7c7 !important;
            font-weight: 600 !important;
          }
          [class*="CardDescription"], [class*="card-description"], p {
            color: rgba(248, 243, 232, 0.5) !important;
            font-weight: 300 !important;
            font-size: 13px !important;
            line-height: 1.6 !important;
          }
          [class*="TimelinePoint"], [class*="Point"] {
            background: #d8830a !important;
            border-color: #d8830a !important;
          }
          [class*="TimelineTitle"], [class*="Title"] {
            color: #ebe7c7 !important;
            font-weight: 600 !important;
          }
          [class*="active"] [class*="TimelineTitle"] {
            color: #d8830a !important;
          }
          [class*="Track"] {
            background: rgba(216, 131, 10, 0.25) !important;
          }
          [class*="ShowMore"], .show-more, [class*="Toolbar"] {
            display: none !important;
          }
        `}</style>
        <div className="chrono-container">
        {chronoItems.length > 0 && (
          <Chrono
            items={chronoItems}
            mode="VERTICAL_ALTERNATING"
            theme={chronoTheme}
            cardHeight={150}
            cardWidth={400}
            lineWidth={3}
            timelinePointDimension={16}
            timelineHeight="fit-content"
            disableToolbar
            useReadMore={false}
            scrollable={false}
            darkMode
            highlightCardsOnHover
            fontSizes={{
              cardSubtitle: '0.8rem',
              cardText: '0.85rem',
              cardTitle: '1rem',
              title: '0.9rem',
            }}
          >
            {sortedEvents.map((evt) => {
              const tag = evt.entityTag ? entityTagColors[evt.entityTag] : null;
              return (
                <div
                  key={evt.id}
                  onClick={() => openModal(evt)}
                  style={{ cursor: 'pointer', padding: '12px 16px' }}
                >
                  {tag && (
                    <span
                      style={{
                        background: tag.bg,
                        color: tag.color,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                        display: 'inline-block',
                        marginBottom: 8,
                      }}
                    >
                      {tag.label}
                    </span>
                  )}
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 300,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {evt.description.length > 150
                      ? evt.description.slice(0, 150) + '...'
                      : evt.description}
                  </p>
                  {evt.source && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 8,
                        color: 'var(--jf-gold)',
                        fontSize: '11px',
                        fontWeight: 400,
                      }}
                    >
                      <ExternalLink size={11} /> {evt.source}
                    </div>
                  )}
                </div>
              );
            })}
          </Chrono>
        )}
        </div>
      </root.div>

      {/* Event Modal */}
      <Modal.Root open={!!selected} onClose={closeModal}>
        <Modal.Overlay />
        <Modal.Content size="lg">
          <Modal.Header>
            <Modal.Title>
              {modalMode === 'add'
                ? 'Add Timeline Event'
                : `${selected?.year} — ${selected?.title}`}
            </Modal.Title>
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

          <Modal.Body>
            {modalMode === 'view' ? (
              <>
                {/* Entity tag badge */}
                {tagInfo && (
                  <div className="mb-3">
                    <span
                      style={{
                        background: tagInfo.bg,
                        color: tagInfo.color,
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {tagInfo.label}
                    </span>
                  </div>
                )}

                {/* Description */}
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: 300,
                    lineHeight: 1.7,
                  }}
                >
                  {selected?.description}
                </p>

                {/* Source / Reference */}
                {selected?.source && (
                  <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 12 }}>
                    <div
                      style={{
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Source / Reference
                    </div>
                    <div className="flex items-center gap-2">
                      <ExternalLink size={13} style={{ color: 'var(--jf-gold)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--jf-cream)', fontWeight: 400 }}>
                        {selected.source}
                      </span>
                    </div>
                  </div>
                )}

                {!selected?.source && (
                  <div
                    style={{
                      borderTop: '1px solid #333',
                      paddingTop: 12,
                      marginTop: 12,
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                    }}
                  >
                    No source/reference added yet. Click edit to add one.
                  </div>
                )}
              </>
            ) : (
              /* Edit / Add mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 120 }}>
                    <label style={labelStyle}>Year</label>
                    <input
                      style={inputStyle}
                      value={editData.year}
                      onChange={(e) => setEditData({ ...editData, year: e.target.value })}
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="Event title"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 100 }}
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Event description"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Source / Reference</label>
                  <input
                    style={inputStyle}
                    value={editData.source}
                    onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                    placeholder="e.g. Bangkok Post, 2024-01-15"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Entity</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={editData.entityTag}
                    onChange={(e) => setEditData({ ...editData, entityTag: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="dtgo">DTGO</option>
                    <option value="mqdc">MQDC</option>
                    <option value="dtp">DTP</option>
                    <option value="tnb">T&B Media</option>
                  </select>
                </div>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            {modalMode === 'edit' ? (
              <>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    color: '#ef4444',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    cursor: 'pointer',
                    marginRight: 'auto',
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: '1px solid #333',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: 'var(--jf-cream)',
                    background: 'rgba(34,201,151,0.15)',
                    border: '1px solid rgba(34,201,151,0.3)',
                    cursor: 'pointer',
                  }}
                >
                  <Check size={14} /> Save
                </button>
              </>
            ) : modalMode === 'add' ? (
              <>
                <div />
                <div className="flex gap-2">
                  <button
                    onClick={closeModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'transparent',
                      border: '1px solid #333',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={saveAdd}
                    disabled={!editData.title.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      color: editData.title.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                      background: editData.title.trim() ? 'rgba(34,201,151,0.15)' : 'transparent',
                      border: `1px solid ${editData.title.trim() ? 'rgba(34,201,151,0.3)' : '#333'}`,
                      cursor: editData.title.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Check size={14} /> Add Event
                  </button>
                </div>
              </>
            ) : (
              <div />
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
