import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Home, ChevronRight, UserPlus, FileText, File, Image, Loader2, Download, Upload, X, HardDrive, Cloud } from 'lucide-react';
import { getFile } from '@/data/loader';
import { getPersonRecord } from '@/data/personIndex';
import { initialOrgEntities } from '@/data/orgData';
import { FormSection } from '../ui/FormSection';
import { DataTable } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { PersonModal } from '../molecules/PersonModal';
import { NewPersonModal } from '../molecules/NewPersonModal';
import { NewUnitModal } from '../molecules/NewUnitModal';
import { PdfAttachmentViewer } from '../molecules/PDFViewer';
import { CSVViewer } from '../molecules/CSVViewer';
import type { PersonRecord } from '@/data/types';

interface PersonRow {
  name: string;
  role: string;
  org: string;
}

interface PartnershipRow {
  partner: string;
  relationship: string;
  entity: string;
}

interface UnitRow {
  name: string;
  description: string;
  parent: string;
  type: string;
  accentColor: string;
  wikiSlug?: string;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  division: string;
  storagePath: string;
  uploadedAt: string;
  fileSize: number;
  source: 'firebase' | 'local';
}

type FilterType = 'all' | 'pdf' | 'csv' | 'image';

const attachmentFilters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'PDF' },
  { key: 'csv', label: 'CSV' },
  { key: 'image', label: 'Images' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText size={18} style={{ color: 'var(--jf-gold)' }} />;
  if (mimeType === 'text/csv' || mimeType.includes('csv')) return <File size={18} style={{ color: 'var(--dtgo-green)' }} />;
  if (mimeType.startsWith('image/')) return <Image size={18} style={{ color: 'var(--mqdc-blue)' }} />;
  return <File size={18} style={{ color: 'var(--text-secondary)' }} />;
}

function matchesFilter(att: Attachment, filter: FilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'pdf') return att.mimeType === 'application/pdf';
  if (filter === 'csv') return att.mimeType === 'text/csv' || att.mimeType.includes('csv') || att.filename.endsWith('.csv');
  if (filter === 'image') return att.mimeType.startsWith('image/');
  return true;
}

function getDivisionColor(division: string): string {
  const map: Record<string, string> = {
    mqdc: 'var(--mqdc-blue)',
    tnb: 'var(--tnb-orange)',
    dtp: 'var(--dtp-pink)',
    forestias: 'var(--dtgo-green)',
    cloud11: 'var(--mqdc-blue)',
    dtgo: 'var(--dtgo-green)',
  };
  return map[division?.toLowerCase()] || 'var(--jf-lavender)';
}

/** Parse a markdown table into rows of string arrays, skipping header + separator */
function parseMarkdownTable(content: string): string[][] {
  const lines = content.split('\n');
  const tableLines = lines.filter(l => l.trim().startsWith('|') && !l.trim().match(/^\|[\s-:|]+\|$/));
  return tableLines.slice(1).map(line =>
    line.split('|').slice(1, -1).map(cell => cell.trim().replace(/\*\*/g, ''))
  );
}

function parsePeople(content: string): PersonRow[] {
  return parseMarkdownTable(content)
    .filter(cells => cells.length >= 3)
    .map(cells => ({ name: cells[0], role: cells[1], org: cells[2] }));
}

function parsePartnerships(content: string): PartnershipRow[] {
  return parseMarkdownTable(content)
    .filter(cells => cells.length >= 3)
    .map(cells => ({ partner: cells[0], relationship: cells[1], entity: cells[2] }));
}

/** Build unit directory rows from org data */
function buildUnitRows(): UnitRow[] {
  const nameMap = new Map(initialOrgEntities.map(e => [e.id, e.name]));
  return initialOrgEntities.map(entity => ({
    name: entity.name,
    description: entity.description,
    parent: entity.parentId ? (nameMap.get(entity.parentId) || '—') : '—',
    type: entity.parentId === null ? 'Holding' : entity.parentId === 'dtgo' ? 'Pillar' : 'Subsidiary',
    accentColor: entity.accentColor,
    wikiSlug: entity.wikiSlug,
  }));
}

export function DirectoryPage() {
  const navigate = useNavigate();
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [showNewUnit, setShowNewUnit] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [attachmentFilter, setAttachmentFilter] = useState<FilterType>('all');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sectionDragging, setSectionDragging] = useState(false);
  const dragCounter = useRef(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; att: Attachment } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fetchAttachments = async () => {
    setAttachmentsLoading(true);
    try {
      const [firebaseRes, localRes] = await Promise.allSettled([
        fetch('/api/attachments'),
        fetch('/api/local-attachments'),
      ]);

      const firebaseData: Attachment[] = firebaseRes.status === 'fulfilled' && firebaseRes.value.ok
        ? (await firebaseRes.value.json()).map((a: Attachment) => ({ ...a, source: 'firebase' as const }))
        : [];

      const localData: Attachment[] = localRes.status === 'fulfilled' && localRes.value.ok
        ? await localRes.value.json()
        : [];

      setAttachments([...localData, ...firebaseData]);
    } catch {
      // silently fail
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => { fetchAttachments(); }, []);

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of pendingFiles) {
        formData.append('files', file);
      }
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: formData });
      if (res.ok) {
        setPendingFiles([]);
        await fetchAttachments();
      }
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (att: Attachment, newName: string) => {
    if (!newName || newName === att.filename) { setRenaming(null); return; }
    try {
      const res = await fetch('/api/rename-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: att.filename, newName, source: att.source }),
      });
      if (res.ok) await fetchAttachments();
    } catch {
      // silently fail
    } finally {
      setRenaming(null);
    }
  };

  const openAttachment = async (att: Attachment) => {
    setViewerAttachment(att);
    setViewerOpen(true);
    setUrlLoading(true);
    try {
      if (att.source === 'local') {
        setViewerUrl(`/api/local-attachments/${encodeURIComponent(att.filename)}`);
        setUrlLoading(false);
        return;
      }
      const res = await fetch(`/api/attachments/${att.id}/url`);
      if (!res.ok) throw new Error('Failed to get URL');
      const { url } = await res.json();
      setViewerUrl(url);
    } catch {
      setViewerUrl(null);
    } finally {
      setUrlLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerAttachment(null);
    setViewerUrl(null);
  };

  const filteredAttachments = attachments.filter(att => matchesFilter(att, attachmentFilter));
  const filterCounts = {
    all: attachments.length,
    pdf: attachments.filter(a => matchesFilter(a, 'pdf')).length,
    csv: attachments.filter(a => matchesFilter(a, 'csv')).length,
    image: attachments.filter(a => matchesFilter(a, 'image')).length,
  };

  const peopleFile = getFile('people/index');
  const partnershipsFile = getFile('partnerships');

  const people = useMemo(() => peopleFile ? parsePeople(peopleFile.content) : [], [peopleFile]);
  const partnerships = useMemo(() => partnershipsFile ? parsePartnerships(partnershipsFile.content) : [], [partnershipsFile]);
  const units = useMemo(() => buildUnitRows(), []);

  const handlePersonClick = (name: string) => {
    const record = getPersonRecord(name);
    if (record) {
      setSelectedPerson(record);
      setPersonModalOpen(true);
    }
  };

  const peopleColumns: ColumnDef<PersonRow, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => {
        const name = getValue() as string;
        return (
          <button
            onClick={() => handlePersonClick(name)}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: 'var(--jf-cream)', fontWeight: 600, cursor: 'pointer',
              fontSize: '13px', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--jf-gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--jf-cream)'; }}
          >
            {name}
          </button>
        );
      },
      meta: { style: { width: '30%' } },
    },
    { accessorKey: 'role', header: 'Role', meta: { style: { width: '35%' } } },
    { accessorKey: 'org', header: 'Organization', meta: { style: { width: '35%' } } },
  ], []);

  const unitColumns: ColumnDef<UnitRow, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Entity',
      cell: ({ row }) => {
        const unit = row.original;
        return (
          <div className="flex items-center gap-2">
            {unit.wikiSlug ? (
              <button
                onClick={() => navigate(`/file/${unit.wikiSlug}`)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'var(--jf-cream)', fontWeight: 600, cursor: 'pointer',
                  fontSize: '13px', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--jf-gold)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--jf-cream)'; }}
              >
                {unit.name}
              </button>
            ) : (
              <span style={{ fontWeight: 600 }}>{unit.name}</span>
            )}
          </div>
        );
      },
      meta: { style: { width: '25%' } },
    },
    { accessorKey: 'description', header: 'Description', meta: { style: { width: '30%' } } },
    { accessorKey: 'parent', header: 'Parent', meta: { style: { width: '25%' } } },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as string;
        const colors: Record<string, string> = {
          Holding: 'var(--dtgo-green)',
          Pillar: 'var(--jf-lavender)',
          Subsidiary: 'var(--text-secondary)',
        };
        return (
          <span style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '1px', color: colors[type] || 'var(--text-secondary)',
          }}>
            {type}
          </span>
        );
      },
      meta: { style: { width: '20%' } },
    },
  ], [navigate]);

  const partnershipColumns: ColumnDef<PartnershipRow, any>[] = useMemo(() => [
    { accessorKey: 'partner', header: 'Partner', meta: { style: { width: '25%', fontWeight: 600 } } },
    { accessorKey: 'relationship', header: 'Relationship', meta: { style: { width: '50%' } } },
    { accessorKey: 'entity', header: 'Entity', meta: { style: { width: '25%' } } },
  ], []);

  return (
    <div className="flex-1 min-w-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-4">
        <Link to="/" className="text-[var(--jf-lavender)] hover:underline flex items-center gap-1">
          <Home size={12} /> Home
        </Link>
        <ChevronRight size={12} className="opacity-30" />
        <span className="text-[var(--text-primary)]">Directory</span>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600,
        color: 'var(--jf-cream)', marginBottom: '8px',
      }}>
        Directory
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
        Key people, corporate entities, and strategic partnerships across the DTGO group.
      </p>

      {/* Unit Directory */}
      <FormSection
        title="Unit Directory"
        description={`${units.length} entities`}
        defaultOpen={false}
        onAdd={() => setShowNewUnit(true)}
      >
        <DataTable data={units} columns={unitColumns} hideSearch={false} searchPlaceholder="Search entities..." getRowAccentColor={(unit) => unit.accentColor} />
      </FormSection>

      {/* Key People */}
      <FormSection
        title="Key People"
        description={`${people.length} people`}
        defaultOpen={false}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={() => setShowNewPerson(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: 'var(--radius-input)',
              background: 'rgba(201,207,233,0.08)', border: '1px solid rgba(201,207,233,0.15)',
              color: 'var(--jf-lavender)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <UserPlus size={14} /> Add Person
          </button>
        </div>
        <DataTable data={people} columns={peopleColumns} hideSearch={false} searchPlaceholder="Search people..." />
      </FormSection>

      {/* Partnerships */}
      <FormSection
        title="Strategic Partnerships"
        description={`${partnerships.length} partnerships`}
        defaultOpen={false}
      >
        <DataTable data={partnerships} columns={partnershipColumns} hideSearch={false} searchPlaceholder="Search partnerships..." />
      </FormSection>

      {/* Attachments */}
      <FormSection
        title="Attachments"
        description={`${attachments.length} files`}
        defaultOpen={false}
      >
        {/* Section-wide drop target */}
        <div
          onDragEnter={e => { e.preventDefault(); dragCounter.current++; setSectionDragging(true); }}
          onDragOver={e => { e.preventDefault(); }}
          onDragLeave={e => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setSectionDragging(false); }}
          onDrop={e => {
            e.preventDefault();
            dragCounter.current = 0;
            setSectionDragging(false);
            const droppedFiles = Array.from(e.dataTransfer.files);
            if (droppedFiles.length > 0) setPendingFiles(prev => [...prev, ...droppedFiles]);
          }}
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-card)',
            border: sectionDragging ? '2px dashed var(--jf-gold)' : '2px dashed transparent',
            padding: sectionDragging ? '0' : '0',
            transition: 'border-color 0.2s',
          }}
        >
          {/* Drag overlay */}
          {sectionDragging && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(216,131,10,0.06)',
              borderRadius: 'var(--radius-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ color: 'var(--jf-gold)', fontSize: '14px', fontWeight: 600 }}>
                Drop files anywhere here
              </div>
            </div>
          )}

          {/* Drop zone indicator */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginBottom: '12px',
              padding: '14px',
              border: '2px dashed var(--border-default)',
              borderRadius: 'var(--radius-input)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'border-color 0.2s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) setPendingFiles(prev => [...prev, ...files]);
                e.target.value = '';
              }}
            />
            <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              <Upload size={14} />
              <span>Drop files here, or click to browse</span>
            </div>
          </div>

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {pendingFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', background: 'var(--bg-surface-inset)',
                      border: '1px solid var(--border-default)', borderRadius: '6px',
                      fontSize: '12px', color: 'var(--text-primary)',
                    }}
                  >
                    {getFileIcon(file.type)}
                    <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>({(file.size / 1024).toFixed(0)} KB)</span>
                    <button
                      onClick={e => { e.stopPropagation(); setPendingFiles(prev => prev.filter((_, i) => i !== idx)); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '6px',
                  background: 'var(--jf-gold)', border: 'none',
                  color: '#191918', fontSize: '12px', fontWeight: 600,
                  cursor: uploading ? 'wait' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          )}

          {/* Filter chips */}
        <div className="flex gap-2 mb-4">
          {attachmentFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setAttachmentFilter(f.key)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '999px',
                border: '1px solid',
                borderColor: attachmentFilter === f.key ? 'var(--jf-lavender)' : 'var(--border-default)',
                background: attachmentFilter === f.key ? 'rgba(201,207,233,0.1)' : 'transparent',
                color: attachmentFilter === f.key ? 'var(--jf-lavender)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label} ({filterCounts[f.key]})
            </button>
          ))}
        </div>

        {/* Loading state */}
        {attachmentsLoading && (
          <div className="flex items-center justify-center" style={{ padding: '64px' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}

        {/* Empty state */}
        {!attachmentsLoading && filteredAttachments.length === 0 && (
          <div style={{
            padding: '64px 24px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-card)',
          }}>
            <div style={{ fontSize: '14px' }}>
              {attachmentFilter === 'all' ? 'No attachments yet' : `No ${attachmentFilter.toUpperCase()} files found`}
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.6 }}>
              Drop files above or upload through intake
            </div>
          </div>
        )}

        {/* Attachment list */}
        {!attachmentsLoading && filteredAttachments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredAttachments.map(att => (
              <button
                key={att.id}
                onClick={() => { if (renaming !== att.id) openAttachment(att); }}
                onContextMenu={e => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, att });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-input)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,207,233,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              >
                {getFileIcon(att.mimeType)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renaming === att.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(att, renameValue);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      onBlur={() => handleRename(att, renameValue)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--jf-gold)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {att.filename}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {formatFileSize(att.fileSize)} · {new Date(att.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                {att.division && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: `color-mix(in srgb, ${getDivisionColor(att.division)} 15%, transparent)`,
                    color: getDivisionColor(att.division),
                    flexShrink: 0,
                  }}>
                    {att.division}
                  </span>
                )}
                {att.source === 'local'
                  ? <span title="Local file" style={{ display: 'flex', flexShrink: 0 }}><HardDrive size={13} style={{ color: 'var(--jf-gold)', opacity: 0.6 }} /></span>
                  : <span title="Firebase" style={{ display: 'flex', flexShrink: 0 }}><Cloud size={13} style={{ color: 'var(--jf-lavender)', opacity: 0.6 }} /></span>
                }
                <Download size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}

        {/* Context menu */}
        {contextMenu && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            onClick={() => setContextMenu(null)}
            onContextMenu={e => { e.preventDefault(); setContextMenu(null); }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: contextMenu.x,
                top: contextMenu.y,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 51,
                minWidth: '140px',
              }}
            >
              <button
                onClick={() => {
                  setRenaming(contextMenu.att.id);
                  setRenameValue(contextMenu.att.filename);
                  setContextMenu(null);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '8px 12px',
                  background: 'none', border: 'none', borderRadius: '6px',
                  color: 'var(--text-primary)', fontSize: '13px',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,207,233,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Rename
              </button>
            </div>
          </div>
        )}

        </div>{/* end section-wide drop target */}
      </FormSection>

      <PersonModal
        open={personModalOpen}
        onClose={() => { setPersonModalOpen(false); setSelectedPerson(null); }}
        person={selectedPerson}
      />
      <NewPersonModal open={showNewPerson} onClose={() => setShowNewPerson(false)} />
      <NewUnitModal open={showNewUnit} onClose={() => setShowNewUnit(false)} />

      {/* Attachment viewer modal */}
      <Modal.Root open={viewerOpen} onClose={closeViewer}>
        <Modal.Overlay />
        <Modal.Content size="xl">
          <Modal.Header>
            <Modal.Title>{viewerAttachment?.filename ?? 'Attachment'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {urlLoading && (
              <div className="flex items-center justify-center" style={{ padding: '48px' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
            {!urlLoading && viewerUrl && viewerAttachment?.mimeType === 'application/pdf' && (
              <PdfAttachmentViewer pdfUrl={viewerUrl} />
            )}
            {!urlLoading && viewerUrl && (viewerAttachment?.mimeType === 'text/csv' || viewerAttachment?.filename.endsWith('.csv')) && (
              <CSVViewer csvUrl={viewerUrl} />
            )}
            {!urlLoading && viewerUrl && viewerAttachment?.mimeType.startsWith('image/') && (
              <div className="flex items-center justify-center" style={{ padding: '16px' }}>
                <img
                  src={viewerUrl}
                  alt={viewerAttachment.filename}
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-input)' }}
                />
              </div>
            )}
            {!urlLoading && !viewerUrl && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Unable to load attachment
              </div>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
