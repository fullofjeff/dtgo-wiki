import { useState, useEffect, useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../ui/DataTable';
import { Badge } from '../ui/Badge';
import { FormSection } from '../ui/FormSection';
import { DashboardCard } from '@/components/ui/DashboardCard';
import {
  Database, Activity, AlertTriangle, RefreshCw, CheckCircle2,
  XCircle, Clock, Loader2,
} from 'lucide-react';

// ── Types ──

interface RAGStatus {
  healthy: boolean;
  firestore: {
    total: number;
    text: number;
    images: number;
    withEmbedding: number;
    withoutEmbedding: number;
  };
  localKB: { totalChunks: number };
  sync: { missing: number; orphaned: number; coverage: number };
  ingest: {
    status: 'idle' | 'running' | 'success' | 'failed';
    startedAt?: string;
    completedAt?: string;
    error?: string;
  };
}

interface SessionRow {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  status: string;
  sourceExcerpt: string;
  error?: string;
  matchCount: number;
  appliedAt?: string;
}

// ── Component ──

export function SettingsPage() {
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragLoading, setRagLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // ── Fetch RAG status ──
  const fetchRAGStatus = useCallback(async () => {
    setRagLoading(true);
    setRagError(null);
    try {
      const res = await fetch('/api/rag/status');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setRagStatus(await res.json());
    } catch (err) {
      setRagError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setRagLoading(false);
    }
  }, []);

  // ── Fetch sessions ──
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/intake/sessions');
      if (res.ok) setSessions(await res.json());
    } catch { /* silent */ } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRAGStatus();
    fetchSessions();
  }, [fetchRAGStatus, fetchSessions]);

  // ── Derived data ──
  const failedSessions = useMemo(
    () => sessions.filter(s => s.status === 'error'),
    [sessions],
  );

  const recentSessions = useMemo(
    () => sessions.slice(0, 50),
    [sessions],
  );

  // ── Table columns: failed sessions ──
  const failureColumns: ColumnDef<SessionRow, any>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: 'Time',
      size: 160,
      cell: ({ getValue }) => {
        const ts = getValue() as string;
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      size: 110,
      cell: ({ getValue }) => (
        <Badge color={(getValue() as string) === 'claude' ? 'claude' : (getValue() as string) === 'gemini' ? 'gemini' : (getValue() as string) === 'openai' ? 'openai' : (getValue() as string) === 'grok' ? 'grok' : 'neutral'} size="xs">
          {(getValue() as string)}
        </Badge>
      ),
    },
    {
      accessorKey: 'sourceExcerpt',
      header: 'Input',
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {(getValue() as string) || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'error',
      header: 'Error',
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: 'var(--dtp-pink)', fontFamily: 'var(--font-mono)' }}>
          {(getValue() as string) || '—'}
        </span>
      ),
    },
  ], []);

  // ── Table columns: all sessions ──
  const sessionColumns: ColumnDef<SessionRow, any>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: 'Time',
      size: 150,
      cell: ({ getValue }) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {new Date(getValue() as string).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      size: 100,
      cell: ({ getValue }) => (
        <Badge color={(getValue() as string) === 'claude' ? 'claude' : (getValue() as string) === 'gemini' ? 'gemini' : (getValue() as string) === 'openai' ? 'openai' : (getValue() as string) === 'grok' ? 'grok' : 'neutral'} size="xs">
          {(getValue() as string)}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ getValue, row }) => {
        const status = getValue() as string;
        const applied = row.original.appliedAt;
        if (applied) return <Badge color="success" size="xs" dot>Applied</Badge>;
        if (status === 'error') return <Badge color="error" size="xs" dot>Error</Badge>;
        if (status === 'processing') return <Badge color="warning" size="xs" dot>Processing</Badge>;
        return <Badge color="info" size="xs" dot>Ready</Badge>;
      },
    },
    {
      accessorKey: 'matchCount',
      header: 'Matches',
      size: 80,
      meta: { style: { textAlign: 'center' } },
      cell: ({ getValue }) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'sourceExcerpt',
      header: 'Input',
      cell: ({ getValue }) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {(getValue() as string) || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'error',
      header: 'Error',
      size: 200,
      cell: ({ getValue }) => {
        const err = getValue() as string | undefined;
        if (!err) return <span style={{ color: 'var(--text-placeholder)' }}>—</span>;
        return (
          <span style={{ fontSize: '11px', color: 'var(--dtp-pink)', fontFamily: 'var(--font-mono)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {err}
          </span>
        );
      },
    },
  ], []);

  // ── Accent colors for session rows ──
  const getSessionAccent = useCallback((row: SessionRow) => {
    if (row.appliedAt) return 'var(--dtgo-green)';
    if (row.status === 'error') return 'var(--dtp-pink)';
    if (row.status === 'processing') return 'var(--tnb-orange)';
    return undefined;
  }, []);

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* ── Page header ── */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>
          System Health
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6 }}>
          RAG pipeline status, vector store integrity, and intake session logs.
        </p>
      </div>

      {/* ── RAG Health Overview ── */}
      <FormSection
        title="Vector Store"
        description="Firestore embedding coverage and sync status"
        icon={Database}
        defaultOpen
      >
        {ragLoading ? (
          <div className="flex items-center gap-3 py-8 justify-center" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={18} className="animate-spin" /> Querying Firestore...
          </div>
        ) : ragError ? (
          <div className="wiki-card" style={{ padding: '24px', borderLeft: '3px solid var(--dtp-pink)' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--dtp-pink)', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              <XCircle size={16} /> Failed to load RAG status
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{ragError}</p>
          </div>
        ) : ragStatus ? (
          <>
            {/* Status banner */}
            <div
              className="wiki-card"
              style={{
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderLeft: `3px solid ${ragStatus.healthy ? 'var(--dtgo-green)' : 'var(--tnb-orange)'}`,
              }}
            >
              {ragStatus.healthy
                ? <><CheckCircle2 size={18} style={{ color: 'var(--dtgo-green)' }} /> <span style={{ fontSize: '14px', color: 'var(--dtgo-green)', fontWeight: 600 }}>Healthy</span><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>— all chunks synced with embeddings</span></>
                : <><AlertTriangle size={18} style={{ color: 'var(--tnb-orange)' }} /> <span style={{ fontSize: '14px', color: 'var(--tnb-orange)', fontWeight: 600 }}>Issues Detected</span><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>— see details below</span></>
              }
              <div className="flex-1" />
              <button
                onClick={fetchRAGStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                style={{ fontSize: '12px', color: 'var(--jf-lavender)', background: 'rgba(201,207,233,0.08)', border: '1px solid rgba(201,207,233,0.12)' }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <StatCard label="Total Chunks" value={ragStatus.firestore.total} />
              <StatCard label="With Embeddings" value={ragStatus.firestore.withEmbedding} good={ragStatus.firestore.withoutEmbedding === 0} />
              <StatCard label="Ghost Chunks" value={ragStatus.firestore.withoutEmbedding} bad={ragStatus.firestore.withoutEmbedding > 0} />
              <StatCard label="Local KB Chunks" value={ragStatus.localKB.totalChunks} />
              <StatCard label="Missing from Store" value={ragStatus.sync.missing} bad={ragStatus.sync.missing > 0} />
              <StatCard label="Orphaned" value={ragStatus.sync.orphaned} bad={ragStatus.sync.orphaned > 0} />
              <StatCard label="Coverage" value={`${ragStatus.sync.coverage}%`} good={ragStatus.sync.coverage === 100} bad={ragStatus.sync.coverage < 80} />
              <StatCard label="Image Chunks" value={ragStatus.firestore.images} />
            </div>

            {/* Ingest status */}
            {ragStatus.ingest && (
              <div className="wiki-card" style={{ padding: '16px 24px', marginTop: '16px' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--jf-lavender)', fontWeight: 600 }}>
                    Last Ingest
                  </span>
                  <IngestStatusBadge status={ragStatus.ingest.status} />
                  {ragStatus.ingest.completedAt && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(ragStatus.ingest.completedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {ragStatus.ingest.error && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--dtp-pink)' }}>
                      {ragStatus.ingest.error}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </FormSection>

      {/* ── Failed Sessions ── */}
      <div style={{ marginTop: '32px' }}>
        <FormSection
          title="Failures"
          description={`${failedSessions.length} intake session${failedSessions.length === 1 ? '' : 's'} failed`}
          icon={AlertTriangle}
          defaultOpen={failedSessions.length > 0}
        >
          {sessionsLoading ? (
            <div className="flex items-center gap-3 py-8 justify-center" style={{ color: 'var(--text-secondary)' }}>
              <Loader2 size={18} className="animate-spin" /> Loading sessions...
            </div>
          ) : failedSessions.length === 0 ? (
            <div className="wiki-card flex items-center gap-3" style={{ padding: '24px', borderLeft: '3px solid var(--dtgo-green)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--dtgo-green)' }} />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No failed sessions</span>
            </div>
          ) : (
            <DataTable
              data={failedSessions}
              columns={failureColumns}
              hideSearch={false}
              searchPlaceholder="Search errors..."
              getRowAccentColor={() => 'var(--dtp-pink)'}
            />
          )}
        </FormSection>
      </div>

      {/* ── All Sessions Log ── */}
      <div style={{ marginTop: '32px' }}>
        <FormSection
          title="Session Log"
          description={`${sessions.length} total intake sessions`}
          icon={Activity}
        >
          {sessionsLoading ? (
            <div className="flex items-center gap-3 py-8 justify-center" style={{ color: 'var(--text-secondary)' }}>
              <Loader2 size={18} className="animate-spin" /> Loading sessions...
            </div>
          ) : (
            <DataTable
              data={recentSessions}
              columns={sessionColumns}
              hideSearch={false}
              searchPlaceholder="Search sessions..."
              getRowAccentColor={getSessionAccent}
            />
          )}
        </FormSection>
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatCard({ label, value, good, bad }: { label: string; value: string | number; good?: boolean; bad?: boolean }) {
  let valueColor = 'var(--text-primary)';
  if (bad) valueColor = 'var(--dtp-pink)';
  else if (good) valueColor = 'var(--dtgo-green)';

  return (
    <div className="wiki-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: valueColor, lineHeight: 1.1, marginBottom: '6px' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function IngestStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Badge color="warning" size="xs" icon={<Loader2 size={11} className="animate-spin" />}>Running</Badge>;
    case 'success':
      return <Badge color="success" size="xs" dot>Complete</Badge>;
    case 'failed':
      return <Badge color="error" size="xs" dot>Failed</Badge>;
    default:
      return <Badge color="neutral" size="xs" icon={<Clock size={11} />}>Idle</Badge>;
  }
}
