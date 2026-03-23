import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal } from '../ui/Modal';

interface SectionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  fileSlug?: string;
}

export function SectionModal({ open, onClose, title, content, fileSlug }: SectionModalProps) {
  const [correctionNote, setCorrectionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [redrafted, setRedrafted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setCorrectionNote('');
    setRedrafted(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleReprocess = async () => {
    if (!correctionNote.trim() || !fileSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kb/reprocess-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSlug, sectionHeading: title, correctionNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reprocess failed');
      setRedrafted(data.redrafted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reprocess failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!redrafted || !fileSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kb/apply-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSlug, sectionHeading: title, newContent: redrafted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Apply failed');
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Apply failed');
      setLoading(false);
    }
  };

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Overlay />
      <Modal.Content size="xl">
        <Modal.Header>
          <Modal.Title>{redrafted ? `Correction: ${title}` : title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {String(redrafted ?? content ?? '')}
            </ReactMarkdown>
          </div>

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: 'rgba(220, 50, 50, 0.15)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#f87171',
            }}>
              {error}
            </div>
          )}

          {/* Correction input — only shown when fileSlug is available and no redraft yet */}
          {fileSlug && !redrafted && (
            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <textarea
                value={correctionNote}
                onChange={e => setCorrectionNote(e.target.value)}
                placeholder="Describe what needs correcting..."
                disabled={loading}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  onClick={handleReprocess}
                  disabled={loading || !correctionNote.trim()}
                  style={{
                    padding: '8px 20px',
                    background: loading ? 'rgba(204,204,255,0.1)' : 'var(--jf-lavender)',
                    color: loading ? 'var(--text-secondary)' : '#000',
                    border: 'none',
                    borderRadius: 'var(--radius-input)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: loading || !correctionNote.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !correctionNote.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Reprocessing...' : 'Reprocess'}
                </button>
              </div>
            </div>
          )}

          {/* Approve / Cancel — shown when redraft is ready */}
          {redrafted && (
            <div style={{
              marginTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}>
              <button
                onClick={() => { setRedrafted(null); setError(null); }}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-input)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  background: loading ? 'rgba(204,204,255,0.1)' : 'var(--dtgo-green, #4ade80)',
                  color: loading ? 'var(--text-secondary)' : '#000',
                  border: 'none',
                  borderRadius: 'var(--radius-input)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Applying...' : 'Approve'}
              </button>
            </div>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
