import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import type { Provider } from '@/types/models';
import { ClipboardCheck, ExternalLink, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { IntakeSession } from '@/types/intake';

const PAGE_SIZE = 20;

export function ApprovalsPage() {
  const navigate = useNavigate();
  const [allSessions, setAllSessions] = useState<IntakeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivePage, setArchivePage] = useState(0);

  useEffect(() => {
    fetch('/api/intake/sessions')
      .then(r => r.json())
      .then((data: IntakeSession[]) => {
        setAllSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const pending = useMemo(
    () => allSessions.filter(s => s.status === 'ready' && !s.appliedAt),
    [allSessions],
  );

  const archive = useMemo(
    () => allSessions
      .filter(s => s.appliedAt)
      .sort((a, b) => new Date(b.appliedAt!).getTime() - new Date(a.appliedAt!).getTime()),
    [allSessions],
  );

  const archivePageCount = Math.max(1, Math.ceil(archive.length / PAGE_SIZE));
  const archiveSlice = archive.slice(archivePage * PAGE_SIZE, (archivePage + 1) * PAGE_SIZE);

  const statusCell = (s: IntakeSession) => {
    if (s.appliedAt) return <Badge variant="selected">Applied</Badge>;
    if (s.conflictCount && s.conflictCount > 0) {
      return (
        <span style={{
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--dtp-pink)',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: '4px',
          background: 'color-mix(in srgb, var(--dtp-pink) 10%, transparent)',
        }}>
          Conflict
        </span>
      );
    }
    return <Badge variant="default">Ready</Badge>;
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
        <Chip label={row.original.provider} colorScheme={row.original.provider as Provider} style={{ padding: '4px 10px', fontSize: '0.7rem' }} />
      ),
    },
    {
      accessorKey: 'sourceExcerpt',
      header: 'Source',
      meta: { style: { width: '30%' } },
      cell: ({ row }) => (
        <span style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {row.original.sourceExcerpt}
        </span>
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
      cell: () => (
        <button
          onClick={() => navigate('/intake')}
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
          <ExternalLink size={13} />
          Open
        </button>
      ),
    },
  ], [navigate]);

  const archiveColumns: ColumnDef<IntakeSession, any>[] = useMemo(() => [
    {
      accessorKey: 'appliedAt',
      header: 'Applied',
      meta: { style: { width: '18%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {new Date(row.original.appliedAt!).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      meta: { style: { width: '18%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <Chip label={row.original.provider} colorScheme={row.original.provider as Provider} style={{ padding: '4px 10px', fontSize: '0.7rem' }} />
      ),
    },
    {
      accessorKey: 'sourceExcerpt',
      header: 'Source',
      meta: { style: { width: '40%' } },
      cell: ({ row }) => (
        <span style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {row.original.sourceExcerpt}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '14%', textAlign: 'center', paddingLeft: '80px', verticalAlign: 'middle' } },
      cell: ({ row }) => statusCell(row.original),
    },
  ], []);

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

      {/* Pending approvals */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>
      ) : pending.length === 0 ? (
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
