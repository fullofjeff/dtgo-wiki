import { useState } from 'react';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface NewPersonModalProps {
  open: boolean;
  onClose: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px',
  color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-input)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-input)',
  padding: '10px 12px', color: 'var(--text-primary)',
  fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none',
};

export function NewPersonModal({ open, onClose }: NewPersonModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [org, setOrg] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName(''); setRole(''); setOrg(''); setEmail(''); setNotes('');
    setLoading(false); setSuccess(false); setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !role.trim() || !org.trim()) return;
    setLoading(true);
    setError(null);

    const parts = [`New person to add to the knowledge base:`,
      `Name: ${name.trim()}`,
      `Role: ${role.trim()}`,
      `Organization: ${org.trim()}`,
    ];
    if (email.trim()) parts.push(`Email: ${email.trim()}`);
    if (notes.trim()) parts.push(`Additional context: ${notes.trim()}`);
    parts.push('', 'Please create an entry for this person in the appropriate people sub-file, following the existing format with role backticks and narrative bio.');

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: parts.join('\n'),
          provider: 'claude',
          model: 'claude-sonnet-4-6',
          systemInstructions: 'Focus on creating a new person entry. Place them in the appropriate people sub-file based on their organization.',
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSuccess(true);
        setTimeout(handleClose, 2000);
      } else {
        throw new Error(data.error || 'Failed to submit');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim() && role.trim() && org.trim() && !loading;

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Overlay />
      <Modal.Content size="md">
        <Modal.Header>
          <div className="flex items-center gap-2">
            <UserPlus size={18} style={{ color: 'var(--jf-lavender)' }} />
            <Modal.Title>Add Person</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body>
          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Check size={40} style={{ color: 'var(--dtgo-green)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Submitted to Intake
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Check the Intake page to review and approve the new entry.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                    style={inputStyle} disabled={loading} />
                </div>
              </div>
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Role *</label>
                  <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. CEO"
                    style={inputStyle} disabled={loading} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Organization *</label>
                  <input value={org} onChange={e => setOrg(e.target.value)} placeholder="e.g. MQDC"
                    style={inputStyle} disabled={loading} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"
                  type="email" style={inputStyle} disabled={loading} />
              </div>
              <div>
                <label style={labelStyle}>Bio / Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any background info, context, or notes about this person..."
                  disabled={loading}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
              </div>

              {error && (
                <div style={{
                  padding: '8px 12px', background: 'rgba(220, 50, 50, 0.15)',
                  borderRadius: '8px', fontSize: '13px', color: '#f87171',
                }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        {!success && (
          <Modal.Footer>
            <button onClick={handleClose} style={{
              padding: '8px 16px', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-input)',
              color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit} style={{
              padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '6px',
              background: canSubmit ? 'var(--jf-lavender)' : 'rgba(204,204,255,0.1)',
              color: canSubmit ? '#000' : 'var(--text-secondary)',
              border: 'none', borderRadius: 'var(--radius-input)',
              fontWeight: 600, fontSize: '13px',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.5,
            }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {loading ? 'Submitting...' : 'Submit to Intake'}
            </button>
          </Modal.Footer>
        )}
      </Modal.Content>
    </Modal.Root>
  );
}
