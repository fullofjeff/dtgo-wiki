import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Clock, Cpu, FileText } from 'lucide-react';

interface IntakeSession {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  status: string;
  sourceText?: string;
  sourceExcerpt: string;
  result?: { summary: string };
  appliedAt?: string;
}

interface SourceModalProps {
  open: boolean;
  onClose: () => void;
  sessionIdPrefix: string;
}

export function SourceModal({ open, onClose, sessionIdPrefix }: SourceModalProps) {
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sessionIdPrefix) return;
    setLoading(true);
    fetch('/api/intake/sessions')
      .then(r => r.json())
      .then((sessions: IntakeSession[]) => {
        const match = sessions.find(s => s.id.startsWith(sessionIdPrefix));
        if (match && match.id) {
          // Fetch full session with sourceText
          return fetch(`/api/intake/session/${match.id}`).then(r => r.json());
        }
        return null;
      })
      .then(s => { if (s) setSession(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, sessionIdPrefix]);

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content size="2xl">
        <Modal.Header>
          <Modal.Title>Intake Source</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>}
          {!loading && !session && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Session not found.</p>}
          {!loading && session && (
            <div className="space-y-5">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Clock size={14} />
                  {new Date(session.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Cpu size={14} />
                  <span style={{ textTransform: 'capitalize' }}>{session.provider}</span> · {session.model}
                </div>
                {session.appliedAt ? (
                  <Badge variant="selected">Applied {new Date(session.appliedAt).toLocaleDateString()}</Badge>
                ) : (
                  <Badge variant="default">{session.status}</Badge>
                )}
              </div>

              {/* AI Summary */}
              {session.result?.summary && (
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '8px' }}>
                    AI Summary
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                    {session.result.summary}
                  </p>
                </div>
              )}

              {/* Original Source Text */}
              <div>
                <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                  <FileText size={14} style={{ color: 'var(--jf-lavender)' }} />
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600 }}>
                    Original Source Text
                  </span>
                </div>
                <pre style={{
                  padding: '16px',
                  background: 'var(--bg-surface-inset)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  maxHeight: '400px',
                  overflow: 'auto',
                  margin: 0,
                }}>
                  {session.sourceText || session.sourceExcerpt}
                </pre>
              </div>

              {/* Session ID */}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
                Session: {session.id}
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
