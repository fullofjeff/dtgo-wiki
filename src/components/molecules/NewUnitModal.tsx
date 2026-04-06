import { useState, useEffect } from 'react';
import { Building2, Check, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { saveOrgEntity } from '@/services/orgService';
import { initialOrgEntities, type OrgEntity } from '@/data/orgData';

interface NewUnitModalProps {
  open: boolean;
  onClose: () => void;
}

const ACCENT_COLORS: { label: string; value: string; hex: string }[] = [
  { label: 'DTGO Green', value: 'var(--dtgo-green)', hex: '#22c997' },
  { label: 'MQDC Blue',  value: 'var(--mqdc-blue)',  hex: '#4f8cff' },
  { label: 'T&B Orange', value: 'var(--tnb-orange)', hex: '#f5a623' },
  { label: 'DTP Pink',   value: 'var(--dtp-pink)',   hex: '#e84393' },
];

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

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function NewUnitModal({ open, onClose }: NewUnitModalProps) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderTitle, setLeaderTitle] = useState('');
  const [wikiSlug, setWikiSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate ID from name unless user has manually edited it
  useEffect(() => {
    if (!idManuallyEdited) setId(slugify(name));
  }, [name, idManuallyEdited]);

  const handleClose = () => {
    setName(''); setId(''); setIdManuallyEdited(false);
    setDescription(''); setParentId(''); setAccentColor('');
    setLeaderName(''); setLeaderTitle(''); setWikiSlug('');
    setLoading(false); setSuccess(false); setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !id.trim() || !description.trim() || !accentColor) return;
    setLoading(true);
    setError(null);

    const entity: OrgEntity = {
      id: id.trim(),
      name: name.trim(),
      description: description.trim(),
      parentId: parentId || null,
      accentColor,
      ...(wikiSlug.trim() && { wikiSlug: wikiSlug.trim() }),
      ...(leaderName.trim() && { leader: { name: leaderName.trim(), title: leaderTitle.trim() } }),
    };

    try {
      await saveOrgEntity(entity);
      setSuccess(true);
      setTimeout(handleClose, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = name.trim() && id.trim() && description.trim() && accentColor && !loading;

  const parentOptions = [
    { id: '', name: '— None (top-level) —' },
    ...initialOrgEntities.map(e => ({ id: e.id, name: e.name })),
  ];

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Overlay />
      <Modal.Content size="md">
        <Modal.Header>
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: 'var(--jf-lavender)' }} />
            <Modal.Title>Add Unit</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body>
          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Check size={40} style={{ color: 'var(--dtgo-green)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Unit Added
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {name} has been saved to the database.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Name + ID */}
              <div className="flex gap-3">
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. MQDC Retail" style={inputStyle} disabled={loading} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>ID *</label>
                  <input
                    value={id}
                    onChange={e => { setId(e.target.value); setIdManuallyEdited(true); }}
                    placeholder="e.g. mqdc-retail"
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of this unit's role and focus..."
                  disabled={loading}
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} />
              </div>

              {/* Parent + Accent Color */}
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Parent Entity</label>
                  <select
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                    disabled={loading}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {parentOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Accent Color *</label>
                  <div className="flex gap-2 items-center" style={{ paddingTop: '6px' }}>
                    {ACCENT_COLORS.map(color => (
                      <button
                        key={color.value}
                        title={color.label}
                        onClick={() => setAccentColor(color.value)}
                        disabled={loading}
                        style={{
                          width: 28, height: 28,
                          borderRadius: '50%',
                          background: color.hex,
                          border: accentColor === color.value
                            ? '2px solid var(--jf-cream)'
                            : '2px solid transparent',
                          boxShadow: accentColor === color.value
                            ? `0 0 0 2px ${color.hex}`
                            : 'none',
                          cursor: 'pointer',
                          transition: 'box-shadow 0.15s, border 0.15s',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Leader (optional) */}
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Leader Name</label>
                  <input value={leaderName} onChange={e => setLeaderName(e.target.value)}
                    placeholder="e.g. Jane Smith" style={inputStyle} disabled={loading} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Leader Title</label>
                  <input value={leaderTitle} onChange={e => setLeaderTitle(e.target.value)}
                    placeholder="e.g. CEO" style={inputStyle} disabled={loading} />
                </div>
              </div>

              {/* Wiki Slug (optional) */}
              <div>
                <label style={labelStyle}>Wiki Slug</label>
                <input value={wikiSlug} onChange={e => setWikiSlug(e.target.value)}
                  placeholder="e.g. mqdc/retail (links row to a knowledge base page)"
                  style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  disabled={loading} />
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
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
              {loading ? 'Saving...' : 'Add Unit'}
            </button>
          </Modal.Footer>
        )}
      </Modal.Content>
    </Modal.Root>
  );
}
