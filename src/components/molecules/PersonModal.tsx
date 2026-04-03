import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil, Mail, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { InlineEdit } from '../ui/InlineEdit';
import type { PersonRecord } from '@/data/types';

interface PersonModalProps {
  open: boolean;
  onClose: () => void;
  person: PersonRecord | null;
}

/** Extract role from first backtick line, e.g. "`CEO` · `MQDC`" → "CEO · MQDC" */
function parseRole(bio: string): string | null {
  const firstLine = bio.split('\n').find(l => l.trim().length > 0);
  if (!firstLine || !firstLine.trim().startsWith('`')) return null;
  return firstLine.trim().replace(/`/g, '');
}

/** Extract first paragraph after the role line as a plain-text summary */
function extractSummary(bio: string): string | null {
  const lines = bio.split('\n');
  let pastRole = false;
  const paraLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastRole) {
      if (trimmed.startsWith('`') || trimmed === '') {
        if (trimmed.startsWith('`')) pastRole = true;
        continue;
      }
      pastRole = true;
    }
    if (pastRole) {
      if (trimmed === '' && paraLines.length > 0) break;
      if (trimmed.startsWith('**Sources:**')) break;
      if (trimmed === '') continue;
      paraLines.push(trimmed);
    }
  }

  if (paraLines.length === 0) return null;
  return paraLines.join(' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

export function PersonModal({ open, onClose, person }: PersonModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [correctionNote, setCorrectionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [redrafted, setRedrafted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  const handleClose = () => {
    setMode('view');
    setCorrectionNote('');
    setRedrafted(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!person) return null;

  const role = person.bio ? parseRole(person.bio) : null;
  const summary = person.bio ? extractSummary(person.bio) : null;
  const canEdit = !!person.bioFileSlug && !!person.bioHeading;

  const handleReprocess = async () => {
    if (!correctionNote.trim() || !person.bioFileSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kb/reprocess-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileSlug: person.bioFileSlug,
          sectionHeading: person.bioHeading,
          correctionNote,
        }),
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
    if (!redrafted || !person.bioFileSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kb/apply-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileSlug: person.bioFileSlug,
          sectionHeading: person.bioHeading,
          newContent: redrafted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Apply failed');
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Apply failed');
      setLoading(false);
    }
  };

  const handleEmailSave = async (newEmail: string) => {
    if (!person.bioFileSlug) return;
    setEmailSaving(true);
    try {
      const res = await fetch('/api/kb/person-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileSlug: person.bioFileSlug,
          personName: person.bioHeading,
          email: newEmail,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save email');
      }
    } finally {
      setEmailSaving(false);
    }
  };

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Overlay />
      <Modal.Content size="lg">
        <Modal.Header>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Modal.Title>{redrafted ? `Edit: ${person.canonicalName}` : person.canonicalName}</Modal.Title>
              {canEdit && mode === 'view' && !redrafted && (
                <button
                  onClick={() => setMode('edit')}
                  title="Edit bio"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: 'rgba(201,207,233,0.08)', border: 'none',
                    color: 'var(--jf-lavender)', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            {role && (
              <span className="text-xs text-[var(--text-secondary)] font-normal">
                {role}
              </span>
            )}
          </div>
        </Modal.Header>
        <Modal.Body>
          {/* Email field */}
          {canEdit && (
            <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
              <Mail size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <InlineEdit
                value={person.email || ''}
                placeholder="Add email..."
                onSave={handleEmailSave}
                isLoading={emailSaving}
              />
            </div>
          )}

          {/* View mode */}
          {mode === 'view' && !redrafted && (
            <>
              {summary && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, fontWeight: 300 }}>
                  {summary}
                </p>
              )}

              {person.mentions.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-[1.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Mentioned in
                  </div>
                  {person.mentions.map((mention) => (
                    <Link
                      key={mention.fileSlug}
                      to={`/file/${mention.fileSlug}`}
                      onClick={handleClose}
                      className="block text-xs font-medium border-l-2 pl-3 py-1"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--jf-lavender)' }}
                    >
                      {mention.fileTitle}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Edit mode — correction input */}
          {mode === 'edit' && !redrafted && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <div style={{
                fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px',
                color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '10px',
              }}>
                Edit Bio
              </div>
              <textarea
                value={correctionNote}
                onChange={e => setCorrectionNote(e.target.value)}
                placeholder="Describe what needs changing — e.g. 'Update role to COO', 'Add info about recent project...' "
                disabled={loading}
                style={{
                  width: '100%', minHeight: '100px', padding: '12px',
                  background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-input)', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)', fontSize: '14px', resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => { setMode('view'); setCorrectionNote(''); setError(null); }}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-input)',
                    color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReprocess}
                  disabled={loading || !correctionNote.trim()}
                  style={{
                    padding: '8px 20px',
                    background: loading ? 'rgba(204,204,255,0.1)' : 'var(--jf-lavender)',
                    color: loading ? 'var(--text-secondary)' : '#000',
                    border: 'none', borderRadius: 'var(--radius-input)',
                    fontWeight: 600, fontSize: '13px',
                    cursor: loading || !correctionNote.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !correctionNote.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Reprocessing...' : 'Reprocess'}
                </button>
              </div>
            </div>
          )}

          {/* Redrafted preview */}
          {redrafted && (
            <div>
              <div style={{
                fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px',
                color: 'var(--dtgo-green)', fontWeight: 600, marginBottom: '10px',
              }}>
                Proposed Changes
              </div>
              <div className="prose" style={{
                padding: '16px', background: 'var(--bg-surface-inset)',
                borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {String(redrafted)}
                </ReactMarkdown>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px',
              }}>
                <button
                  onClick={() => { setRedrafted(null); setError(null); }}
                  disabled={loading}
                  style={{
                    padding: '8px 20px', background: 'transparent',
                    color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 'var(--radius-input)', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
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
                    border: 'none', borderRadius: 'var(--radius-input)',
                    fontWeight: 600, fontSize: '13px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Applying...' : 'Approve'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '12px', padding: '8px 12px',
              background: 'rgba(220, 50, 50, 0.15)', borderRadius: '8px',
              fontSize: '13px', color: '#f87171',
            }}>
              {error}
            </div>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
