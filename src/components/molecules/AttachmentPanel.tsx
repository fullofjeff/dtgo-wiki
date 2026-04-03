import { useState, useEffect } from 'react';
import { FileText, File, Loader2, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PdfAttachmentViewer } from './PDFViewer';
import { CSVViewer } from './CSVViewer';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  division: string;
  storagePath: string;
  uploadedAt: string;
  fileSize: number;
}

interface AttachmentPanelProps {
  division: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return <FileText size={16} style={{ color: 'var(--jf-gold)' }} />;
  if (mimeType === 'text/csv' || mimeType.includes('csv')) return <File size={16} style={{ color: 'var(--dtgo-green)' }} />;
  return <File size={16} style={{ color: 'var(--text-secondary)' }} />;
}

export function AttachmentPanel({ division }: AttachmentPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/attachments/${encodeURIComponent(division)}`);
        if (!res.ok) return;
        const data = await res.json();
        setAttachments(data);
      } catch {
        // silently fail — attachments are optional
      } finally {
        setLoading(false);
      }
    })();
  }, [division]);

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

  // Don't render if no attachments
  if (loading) return null;
  if (attachments.length === 0) return null;

  return (
    <>
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-card)',
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '12px',
        }}>
          Attachments ({attachments.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.map((att) => (
            <button
              key={att.id}
              onClick={() => openAttachment(att)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'var(--bg-surface-inset)',
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
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {formatFileSize(att.fileSize)} · {new Date(att.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <Download size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

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
            {!urlLoading && !viewerUrl && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Unable to load attachment
              </div>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
