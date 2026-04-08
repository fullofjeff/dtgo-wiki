import { useState, useEffect, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { SessionReviewModal } from '@/components/molecules/SessionReviewModal';
import type { Provider } from '@/types/models';
import { ClipboardCheck, Eye, ChevronDown, ChevronLeft, ChevronRight, FileText, X, Loader2, Check, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import type { IntakeSession } from '@/types/intake';
import { getSessionState } from '@/lib/intakeConstants';

const PAGE_SIZE = 20;

export function ApprovalsPage() {
  const [allSessions, setAllSessions] = useState<IntakeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivePage, setArchivePage] = useState(0);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [sourceModalText, setSourceModalText] = useState<string | null>(null);
  const [sourceModalLoading, setSourceModalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ title: string; subtitle: string } | null>(null);
  const [exporting, setExporting] = useState<'original' | 'applied' | null>(null);

  const fetchFullSessions = useCallback(async (sessions: IntakeSession[]) => {
    const results = await Promise.all(
      sessions.map(s => fetch(`/api/intake/session/${s.id}`).then(r => r.ok ? r.json() : [])),
    );
    return results as (IntakeSession & { sourceText?: string })[];
  }, []);

  const downloadText = useCallback((text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const showSourceForSession = useCallback(async (id: string) => {
    setSourceModalLoading(true);
    try {
      const res = await fetch(`/api/intake/session/${id}`);
      const session = await res.json();
      setSourceModalText(session.sourceText || session.sourceExcerpt || 'No source text available');
    } catch {
      setSourceModalText('Failed to load source text');
    } finally {
      setSourceModalLoading(false);
    }
  }, []);

  const refreshSessions = useCallback(() => {
    fetch('/api/intake/sessions')
      .then(r => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setAllSessions(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/intake/sessions')
      .then(r => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setAllSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // Sessions currently being processed by AI (initial processing or reprocessing)
  const processing = useMemo(
    () => allSessions.filter(s => {
      const state = getSessionState(s);
      return state === 'processing' || state === 'reprocessing';
    }),
    [allSessions],
  );

  // Auto-refresh while any session is processing or reprocessing
  const hasProcessing = processing.length > 0;

  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(refreshSessions, 5000);
    return () => clearInterval(interval);
  }, [hasProcessing, refreshSessions]);

  const pending = useMemo(
    () => allSessions.filter(s => {
      const state = getSessionState(s);
      return state === 'ready' || state === 'partially_applied' || state === 'all_rejected';
    }),
    [allSessions],
  );

  const archive = useMemo(
    () => allSessions
      .filter(s => {
        const state = getSessionState(s);
        return state === 'applied' || state === 'resolved';
      })
      .sort((a, b) => new Date(b.appliedAt || b.resolvedAt || b.timestamp).getTime() - new Date(a.appliedAt || a.resolvedAt || a.timestamp).getTime()),
    [allSessions],
  );

  const archivePageCount = Math.max(1, Math.ceil(archive.length / PAGE_SIZE));
  const archiveSlice = archive.slice(archivePage * PAGE_SIZE, (archivePage + 1) * PAGE_SIZE);

  const exportOriginalData = useCallback(async () => {
    setExporting('original');
    try {
      const full = await fetchFullSessions(archive);
      const parts = full.map(s => {
        const date = new Date(s.appliedAt || s.timestamp).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        return `=== Session: ${date} | ${s.provider} ===\n${s.sourceText || s.sourceExcerpt || 'No source text available'}`;
      });
      downloadText(parts.join('\n\n'), 'intake-original-data.txt');
    } catch { /* ignore */ }
    setExporting(null);
  }, [archive, fetchFullSessions, downloadText]);

  const exportCleanData = useCallback(async () => {
    setExporting('applied');
    try {
      const full = await fetchFullSessions(archive);
      const parts = full.map(s => {
        const date = new Date(s.appliedAt || s.timestamp).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
        });
        const header = `=== Session: ${date} | ${s.provider} ===`;
        const matches = (s.result?.matches || [])
          .filter((_, i) => s.approvals[String(i)] === 'approved')
          .map(m => `--- File: ${m.file} | Section: ${m.section} | Action: ${m.action} ---\n${m.content}`);
        return matches.length ? `${header}\n${matches.join('\n\n')}` : `${header}\nNo applied content`;
      });
      downloadText(parts.join('\n\n'), 'intake-applied-data.txt');
    } catch { /* ignore */ }
    setExporting(null);
  }, [archive, fetchFullSessions, downloadText]);

  const statusCell = (s: IntakeSession) => {
    const state = getSessionState(s);
    switch (state) {
      case 'processing': return <Badge color="default" icon={<Loader2 size={11} className="animate-spin" />}>Processing</Badge>;
      case 'reprocessing': return <Badge color="info" icon={<Loader2 size={11} className="animate-spin" />}>Reprocessing</Badge>;
      case 'applied': return <Badge color="info">Applied</Badge>;
      case 'partially_applied': return <Badge color="warning">Partial</Badge>;
      case 'all_rejected': return <Badge color="error">Rejected</Badge>;
      case 'resolved': return <Badge color="neutral">Resolved</Badge>;
      default:
        if (s.conflictCount && s.conflictCount > 0) return <Badge color="dtp">Conflict</Badge>;
        return <Badge color="default">Ready</Badge>;
    }
  };

  const pendingColumns: ColumnDef<IntakeSession, any>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: 'Date',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {new Date(row.original.timestamp).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <Chip label={row.original.provider} color={row.original.provider as Provider} size="xs" />
      ),
    },
    {
      accessorKey: 'sourceExcerpt',
      header: 'Source',
      meta: { style: { width: '30%' } },
      cell: ({ row }) => (
        <button
          onClick={() => showSourceForSession(row.original.id)}
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            maxWidth: '100%',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
            textDecoration: 'underline',
            textDecorationColor: 'var(--border-default)',
            textUnderlineOffset: '3px',
          }}
          title="Click to view full source text"
        >
          {(row.original as any).attachmentNames?.length
            ? (row.original as any).attachmentNames.join(', ')
            : row.original.sourceExcerpt}
        </button>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '14%', textAlign: 'center', paddingLeft: '80px', verticalAlign: 'middle' } },
      cell: ({ row }) => statusCell(row.original),
    },
    {
      id: 'open',
      header: 'Action',
      meta: { style: { width: '14%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => {
        const isReprocessing = getSessionState(row.original) === 'reprocessing';
        return (
          <button
            disabled={isReprocessing}
            onClick={() => !isReprocessing && setReviewSessionId(row.original.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--jf-lavender)',
              background: 'none',
              border: 'none',
              cursor: isReprocessing ? 'default' : 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              opacity: isReprocessing ? 0.4 : 1,
            }}
          >
            <Eye size={13} />
            Review
          </button>
        );
      },
    },
  ], [showSourceForSession]);

  const archiveColumns: ColumnDef<IntakeSession, any>[] = useMemo(() => [
    {
      accessorKey: 'appliedAt',
      header: 'Applied',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {new Date(row.original.appliedAt || row.original.resolvedAt || row.original.timestamp).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <Chip label={row.original.provider} color={row.original.provider as Provider} size="xs" />
      ),
    },
    {
      accessorKey: 'sourceExcerpt',
      header: 'Source',
      meta: { style: { width: '30%' } },
      cell: ({ row }) => (
        <button
          onClick={() => showSourceForSession(row.original.id)}
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            maxWidth: '100%',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
            textDecoration: 'underline',
            textDecorationColor: 'var(--border-default)',
            textUnderlineOffset: '3px',
          }}
          title="Click to view full source text"
        >
          {(row.original as any).attachmentNames?.length
            ? (row.original as any).attachmentNames.join(', ')
            : row.original.sourceExcerpt}
        </button>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '14%', textAlign: 'center', paddingLeft: '80px', verticalAlign: 'middle' } },
      cell: ({ row }) => statusCell(row.original),
    },
    {
      id: 'open',
      header: 'Action',
      meta: { style: { width: '14%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => setReviewSessionId(row.original.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--jf-lavender)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          <Eye size={13} />
          View
        </button>
      ),
    },
  ], [showSourceForSession]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardCheck size={22} style={{ color: 'var(--jf-lavender)' }} />
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2rem',
            fontWeight: 600,
            color: 'var(--jf-cream)',
          }}>
            Approvals
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 300 }}>
          Intake sessions ready for review and approval
        </p>
      </div>

      {/* Processing — sessions being analyzed by AI */}
      {!loading && processing.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: 'var(--text-secondary)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--jf-lavender)' }} />
            Processing ({processing.length})
          </div>
          <DataTable data={processing} columns={pendingColumns} hideSearch tableLayout="fixed" />
        </div>
      )}

      {/* Pending approvals */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>
      ) : pending.length === 0 && processing.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--text-secondary)',
          fontSize: '14px',
        }}>
          No sessions pending approval
        </div>
      ) : (
        <DataTable data={pending} columns={pendingColumns} hideSearch tableLayout="fixed" />
      )}

      {/* Archive */}
      {!loading && archive.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <button
            onClick={() => { setArchiveOpen(!archiveOpen); setArchivePage(0); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <ChevronDown
              size={14}
              style={{
                transition: 'transform 0.2s',
                transform: archiveOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            />
            Recent Approvals
            <span style={{
              fontSize: '0.6rem',
              color: 'var(--text-secondary)',
              fontWeight: 400,
              letterSpacing: '0',
              textTransform: 'none',
            }}>
              ({archive.length})
            </span>
          </button>

          {archiveOpen && (
            <div style={{ marginTop: '12px' }}>
              <DataTable data={archiveSlice} columns={archiveColumns} hideSearch tableLayout="fixed" />

              {archivePageCount > 1 && (
                <div className="flex items-center justify-end gap-3" style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {archivePage * PAGE_SIZE + 1}–{Math.min((archivePage + 1) * PAGE_SIZE, archive.length)} of {archive.length}
                  </span>
                  <button
                    disabled={archivePage === 0}
                    onClick={() => setArchivePage(p => p - 1)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-default)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: archivePage === 0 ? 'default' : 'pointer',
                      opacity: archivePage === 0 ? 0.3 : 1,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={archivePage >= archivePageCount - 1}
                    onClick={() => setArchivePage(p => p + 1)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-default)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: archivePage >= archivePageCount - 1 ? 'default' : 'pointer',
                      opacity: archivePage >= archivePageCount - 1 ? 0.3 : 1,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3" style={{ marginTop: '16px' }}>
                <button
                  disabled={exporting !== null}
                  onClick={exportOriginalData}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--jf-lavender)',
                    background: 'none',
                    border: '1px solid var(--jf-lavender)',
                    borderRadius: 'var(--radius-input)',
                    padding: '6px 14px',
                    cursor: exporting ? 'default' : 'pointer',
                    opacity: exporting ? 0.5 : 1,
                  }}
                >
                  {exporting === 'original' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Export Original
                </button>
                <button
                  disabled={exporting !== null}
                  onClick={exportCleanData}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--jf-lavender)',
                    background: 'none',
                    border: '1px solid var(--jf-lavender)',
                    borderRadius: 'var(--radius-input)',
                    padding: '6px 14px',
                    cursor: exporting ? 'default' : 'pointer',
                    opacity: exporting ? 0.5 : 1,
                  }}
                >
                  {exporting === 'applied' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Export Applied
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(sourceModalText !== null || sourceModalLoading) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10002,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSourceModalText(null)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #333',
            }}>
              <div className="flex items-center gap-2">
                <FileText size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Source Text</span>
              </div>
              <button onClick={() => setSourceModalText(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
              {sourceModalLoading ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : (
                <pre style={{
                  fontSize: '13px', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0,
                }}>{sourceModalText}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      <SessionReviewModal
        open={reviewSessionId !== null}
        onClose={() => setReviewSessionId(null)}
        sessionId={reviewSessionId}
        onApplied={refreshSessions}
        onSuccess={setSuccessMessage}
      />

      {/* Success modal */}
      <Modal.Root open={successMessage !== null} onClose={() => setSuccessMessage(null)}>
        <Modal.Overlay />
        <Modal.Content size="sm">
          <Modal.Body>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <Check size={40} style={{ color: 'var(--dtgo-green, #4ade80)' }} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {successMessage?.title}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {successMessage?.subtitle}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setSuccessMessage(null)}
                style={{
                  padding: '8px 32px',
                  background: 'var(--jf-lavender)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 'var(--radius-input)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Continue
              </button>
            </div>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
