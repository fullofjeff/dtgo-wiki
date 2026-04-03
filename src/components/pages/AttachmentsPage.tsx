import { useState, useEffect } from 'react';
import { FileText, File, Image, Loader2, Download, Paperclip } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PdfAttachmentViewer } from '../molecules/PDFViewer';
import { CSVViewer } from '../molecules/CSVViewer';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  division: string;
  storagePath: string;
  uploadedAt: string;
  fileSize: number;
}

type FilterType = 'all' | 'pdf' | 'csv' | 'image';

const filters: { key: FilterType; label: string }[] = [
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

export function AttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/attachments');
        if (!res.ok) return;
        const data = await res.json();
        setAttachments(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openAttachment = async (att: Attachment) => {
    setViewerAttachment(att);
    setViewerOpen(true);
    setUrlLoading(true);

    try {
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

  const filtered = attachments.filter(att => matchesFilter(att, filter));

  const filterCounts = {
    all: attachments.length,
    pdf: attachments.filter(a => matchesFilter(a, 'pdf')).length,
    csv: attachments.filter(a => matchesFilter(a, 'csv')).length,
    image: attachments.filter(a => matchesFilter(a, 'image')).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '2rem',
          fontWeight: 600,
          color: 'var(--jf-cream)',
          marginBottom: '6px',
        }}>
          Attachments
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 300 }}>
          Files uploaded through the intake workflow
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '999px',
              border: '1px solid',
              borderColor: filter === f.key ? 'var(--jf-lavender)' : 'var(--border-default)',
              background: filter === f.key ? 'rgba(201,207,233,0.1)' : 'transparent',
              color: filter === f.key ? 'var(--jf-lavender)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label} ({filterCounts[f.key]})
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center" style={{ padding: '64px' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          padding: '64px 24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          border: '1px dashed var(--border-default)',
          borderRadius: 'var(--radius-card)',
        }}>
          <Paperclip size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div style={{ fontSize: '14px' }}>
            {filter === 'all' ? 'No attachments yet' : `No ${filter.toUpperCase()} files found`}
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.6 }}>
            Files uploaded through intake will appear here
          </div>
        </div>
      )}

      {/* Attachment list */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(att => (
            <button
              key={att.id}
              onClick={() => openAttachment(att)}
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
              <Download size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* Viewer modal */}
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
