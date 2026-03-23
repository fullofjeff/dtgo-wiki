import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getAllFiles } from '@/data/loader';
import { Inbox, Loader2, FileText, AlertTriangle, Plus, RefreshCw, Settings, Check, X, CheckCheck, ChevronDown, Clock, ArrowRight, Pencil } from 'lucide-react';
import { ModelChip } from '@/components/model/ModelChip';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import type { ColumnDef } from '@tanstack/react-table';
import type { ModelVariantsConfig } from '@/types/models';

// ── Types ──

interface IntakeCorrection {
  original: string;
  corrected: string;
  reason: string;
}

interface IntakeMatch {
  file: string;
  section: string;
  action: 'update' | 'append' | 'conflict' | 'new_section' | 'duplicate';
  summary: string;
  content: string;
  corrections?: IntakeCorrection[];
  isDuplicate?: boolean;
}

interface IntakeClarification {
  question: string;
  context: string;
  options: string[];
}

interface IntakeResult {
  matches: IntakeMatch[];
  conflicts: string[];
  newFiles: string[];
  summary: string;
  clarifications?: IntakeClarification[];
}

interface IntakeSession {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  status: 'processing' | 'ready' | 'error';
  sourceExcerpt: string;
  result?: IntakeResult;
  error?: string;
  approvals: Record<string, 'approved' | 'rejected'>;
  appliedAt?: string;
  matchCount?: number;
}

interface ProviderVariant { id: string; name: string; description?: string; }
interface ProviderInfo { id: string; name: string; defaultModel: string; variants: ProviderVariant[]; }

const actionLabels: Record<string, { label: string; color: string }> = {
  update: { label: 'Update', color: 'var(--mqdc-blue)' },
  append: { label: 'Append', color: 'var(--dtgo-green)' },
  conflict: { label: 'Conflict', color: 'var(--dtp-pink)' },
  new_section: { label: 'New Section', color: 'var(--tnb-orange)' },
  duplicate: { label: 'Duplicate', color: 'var(--text-secondary)' },
  clarification: { label: 'Needs Input', color: 'var(--jf-gold)' },
};

// Edit modal for modifying proposed content via right-click
function EditContentModal({ open, onClose, content, onSave }: {
  open: boolean;
  onClose: () => void;
  content: string;
  onSave: (newContent: string) => void;
}) {
  const [editValue, setEditValue] = useState(content);
  useEffect(() => { if (open) setEditValue(content); }, [open, content]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '90%', maxWidth: '700px',
        background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #333',
        }}>
          <div className="flex items-center gap-2">
            <Pencil size={14} style={{ color: 'var(--jf-lavender)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Edit Proposed Content</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            style={{
              width: '100%', minHeight: '300px', padding: '16px',
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: '8px', color: 'var(--text-primary)',
              fontSize: '13px', fontFamily: 'var(--font-mono)',
              lineHeight: 1.6, resize: 'vertical', outline: 'none',
            }}
          />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
          padding: '16px 20px', borderTop: '1px solid #333', background: '#0d0d0d',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', fontSize: '13px', borderRadius: '8px',
            background: 'none', border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => { onSave(editValue); onClose(); }} style={{
            padding: '8px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '8px',
            background: 'rgba(216, 131, 10, 0.15)', border: '1px solid rgba(216, 131, 10, 0.3)',
            color: 'var(--jf-cream)', cursor: 'pointer',
          }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// Isolated component to prevent table re-renders on every keystroke
function ClarificationCell({ idx, options, initial, onChange }: {
  idx: number;
  options: string[];
  initial: { selected: string | null; note: string };
  onChange: (idx: number, value: { selected: string | null; note: string }) => void;
}) {
  const [selected, setSelected] = useState(initial.selected);
  const [note, setNote] = useState(initial.note);
  const [submitted, setSubmitted] = useState(!!initial.selected || !!initial.note);
  const [flash, setFlash] = useState(false);

  const showConfirmation = () => {
    setSubmitted(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  };

  const handleSelect = (opt: string) => {
    const next = selected === opt ? null : opt;
    setSelected(next);
    onChange(idx, { selected: next, note });
    if (next) showConfirmation();
  };

  const handleNoteSubmit = () => {
    if (note.trim()) showConfirmation();
  };

  return (
    <div style={{ maxWidth: '300px' }}>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5" style={{ marginBottom: '8px' }}>
          {options.map((opt, j) => {
            const isSelected = selected === opt;
            return (
              <button key={j} onClick={() => handleSelect(opt)} style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                background: isSelected ? 'rgba(216, 131, 10, 0.15)' : 'var(--bg-surface-inset)',
                border: isSelected ? '1px solid var(--jf-gold)' : '1px solid var(--border-default)',
                color: isSelected ? 'var(--jf-gold)' : 'var(--text-primary)',
                fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
              }}>
                {isSelected && <Check size={10} style={{ marginRight: '4px', display: 'inline' }} />}
                {opt}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={note}
          onChange={e => { setNote(e.target.value); onChange(idx, { selected, note: e.target.value }); }}
          onKeyDown={e => { if (e.key === 'Enter') handleNoteSubmit(); }}
          onBlur={handleNoteSubmit}
          placeholder="Add context or notes..."
          style={{
            flex: 1, padding: '6px 10px', fontSize: '12px',
            background: 'var(--bg-input)', border: '1px solid var(--border-default)',
            borderRadius: '6px', color: 'var(--text-primary)', outline: 'none',
          }}
        />
        {submitted && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontSize: '10px', fontWeight: 600, color: '#50e3c2',
            opacity: flash ? 1 : 0.6, transition: 'opacity 0.3s',
            whiteSpace: 'nowrap',
          }}>
            <Check size={12} /> Staged
          </span>
        )}
      </div>
    </div>
  );
}

export function IntakePage() {
  const [text, setText] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('claude');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [approvedItems, setApprovedItems] = useState<Set<number>>(new Set());
  const [rejectedItems, setRejectedItems] = useState<Set<number>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [contentEdits, setContentEdits] = useState<Record<number, string>>({});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, { selected: string | null; note: string }>>({});
  const clarificationAnswersRef = useRef(clarificationAnswers);
  clarificationAnswersRef.current = clarificationAnswers;
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [pastSessions, setPastSessions] = useState<IntakeSession[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch providers and seed localStorage
  useEffect(() => {
    fetch('/api/intake/providers')
      .then(r => r.json())
      .then((list: ProviderInfo[]) => {
        if (list.length === 0) return;
        const config: ModelVariantsConfig = {
          providers: Object.fromEntries(
            list.map(p => [p.id, { display_name: p.name, default_variant: p.defaultModel, variants: p.variants }])
          ),
        };
        localStorage.setItem('model_variants_config', JSON.stringify(config));
        window.dispatchEvent(new StorageEvent('storage', { key: 'model_variants_config' }));
        if (!list.find(p => p.id === 'claude')) {
          setSelectedProvider(list[0].id);
          setSelectedModel(list[0].defaultModel);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch past sessions
  const loadPastSessions = useCallback(() => {
    fetch('/api/intake/sessions').then(r => r.json()).then(setPastSessions).catch(() => {});
  }, []);

  useEffect(() => { loadPastSessions(); }, [loadPastSessions]);

  // Polling for background processing
  useEffect(() => {
    if (!sessionId || !processing) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/intake/session/${sessionId}`);
        const session = await res.json();
        if (session.status === 'ready') {
          setResult(session.result);
          setProcessing(false);
          clearInterval(pollRef.current!);
          loadPastSessions();
        } else if (session.status === 'error') {
          setError(session.error || 'Processing failed');
          setProcessing(false);
          clearInterval(pollRef.current!);
          loadPastSessions();
        }
      } catch { /* retry */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, processing, loadPastSessions]);

  const handleProcess = async () => {
    if (!text.trim()) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setApprovedItems(new Set());
    setRejectedItems(new Set());
    setApplyResult(null);

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          provider: selectedProvider,
          model: selectedModel,
          systemInstructions: systemInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
      } else {
        setError('Failed to start processing');
        setProcessing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start processing');
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setText('');
    setSystemInstructions('');
    setResult(null);
    setError(null);
    setApprovedItems(new Set());
    setRejectedItems(new Set());
    setSessionId(null);
    setApplyResult(null);
    setContentEdits({});
    setEditingIdx(null);
  };

  const handleApprove = (index: number) => {
    setApprovedItems(prev => { const s = new Set(prev); s.add(index); return s; });
    setRejectedItems(prev => { const s = new Set(prev); s.delete(index); return s; });
  };

  const handleReject = (index: number) => {
    setRejectedItems(prev => { const s = new Set(prev); s.add(index); return s; });
    setApprovedItems(prev => { const s = new Set(prev); s.delete(index); return s; });
  };

  const handleApproveAll = () => {
    if (!result) return;
    const all = new Set(result.matches.map((_, i) => i).filter(i => !result.matches[i].isDuplicate));
    setApprovedItems(all);
    setRejectedItems(new Set());
  };

  const handleApply = async () => {
    if (!sessionId || approvedItems.size === 0) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const approvals: Record<string, 'approved' | 'rejected'> = {};
      approvedItems.forEach(i => { approvals[String(i)] = 'approved'; });
      rejectedItems.forEach(i => { approvals[String(i)] = 'rejected'; });

      const res = await fetch('/api/intake/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, approvals, contentEdits }),
      });
      if (!res.ok) {
        const errText = await res.text();
        setApplyResult(`Error: ${errText}`);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setApplyResult(`Error: ${data.error}`);
        return;
      }
      const skippedMsg = data.skipped > 0 ? ` (${data.skipped} skipped by validation)` : '';
      const issues = (data.validationResults || []).filter((v: any) => !v.applied && v.issues?.length);
      const issueMsg = issues.length > 0 ? '\n' + issues.map((v: any) => `Match ${v.index}: ${v.issues.join(', ')}`).join('\n') : '';
      setApplyResult(`Applied ${data.applied} change(s) and committed to git.${skippedMsg}${issueMsg} Reloading...`);
      if (data.applied > 0) setTimeout(() => window.location.reload(), 2000);
      loadPastSessions();
    } catch (err) {
      setApplyResult(`Error: ${err instanceof Error ? err.message : 'Apply failed'}`);
    } finally {
      setApplying(false);
    }
  };

  const handleReprocess = async () => {
    if (!sessionId) return;
    setReprocessing(true);
    try {
      const res = await fetch('/api/intake/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, clarificationAnswers: clarificationAnswersRef.current, contentEdits }),
      });
      if (!res.ok) {
        const errText = await res.text();
        setError(`Reprocess failed: ${errText}`);
      } else {
        const newResult: IntakeResult = await res.json();
        setResult(newResult);
        setApprovedItems(new Set());
        setRejectedItems(new Set());
        setClarificationAnswers({});
        setApplyResult(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reprocess failed');
    } finally {
      setReprocessing(false);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/intake/session/${id}`);
      const session: IntakeSession = await res.json();
      if (session.result) {
        setResult(session.result);
        setSessionId(session.id);
        setApprovedItems(new Set(Object.entries(session.approvals || {}).filter(([,v]) => v === 'approved').map(([k]) => Number(k))));
        setRejectedItems(new Set(Object.entries(session.approvals || {}).filter(([,v]) => v === 'rejected').map(([k]) => Number(k))));
        setError(null);
        setApplyResult(session.appliedAt ? `Applied on ${new Date(session.appliedAt).toLocaleString()}` : null);
      }
    } catch { /* ignore */ }
  };

  // ── Table columns ──

  type TableRow = IntakeMatch & {
    _index: number;
    _isClarification?: boolean;
    _clarificationOptions?: string[];
    _clarificationContext?: string;
  };

  const tableData: TableRow[] = useMemo(() => {
    const rows: TableRow[] = (result?.matches ?? []).map((m, i) => ({ ...m, _index: i }));
    // Append clarifications as synthetic rows
    if (result?.clarifications) {
      result.clarifications.forEach((c, i) => {
        rows.push({
          file: '', section: '', content: '',
          action: 'clarification' as any,
          summary: c.question,
          _index: 1000 + i, // high index so they don't collide with match indices
          _isClarification: true,
          _clarificationOptions: c.options,
          _clarificationContext: c.context,
        });
      });
    }
    return rows;
  }, [result]);

  const matchColumns: ColumnDef<TableRow, any>[] = useMemo(() => [
    {
      accessorKey: 'file',
      header: 'File',
      size: 140,
      cell: ({ row }) => {
        if (row.original._isClarification) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>;
        return (
          <div>
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: actionLabels[row.original.action]?.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{row.original.file}</span>
            </div>
            {row.original.section && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', paddingLeft: '22px' }}>
                {row.original.section}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      size: 90,
      cell: ({ row }) => {
        const a = actionLabels[row.original.action] || actionLabels.update;
        return (
          <span style={{
            fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px',
            color: a.color, fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
            background: `color-mix(in srgb, ${a.color} 10%, transparent)`, whiteSpace: 'nowrap',
          }}>
            {a.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'summary',
      header: 'Summary',
      cell: ({ row }) => (
        <div style={{ maxWidth: '280px' }}>
          <div style={{ fontSize: '12px', color: row.original._isClarification ? 'var(--jf-cream)' : 'var(--text-secondary)', lineHeight: 1.6, fontWeight: row.original._isClarification ? 600 : 400 }}>
            {row.original.summary}
          </div>
          {row.original._clarificationContext && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>
              {row.original._clarificationContext}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'corrections',
      header: 'Corrections',
      cell: ({ row }) => {
        const corr = row.original.corrections;
        if (!corr || corr.length === 0) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>;
        return (
          <div className="flex flex-col gap-1">
            {corr.map((c, i) => (
              <div key={i} style={{ fontSize: '11px', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--dtp-pink)', textDecoration: 'line-through' }}>{c.original}</span>
                <ArrowRight size={10} style={{ display: 'inline', margin: '0 4px', color: 'var(--text-secondary)' }} />
                <span style={{ color: 'var(--dtgo-green)', fontWeight: 600 }}>{c.corrected}</span>
                <div style={{ color: 'var(--text-secondary)', fontSize: '10px', opacity: 0.7 }}>{c.reason}</div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'content',
      header: 'Content',
      cell: ({ row }) => {
        if (row.original._isClarification) {
          const idx = row.original._index;
          return (
            <ClarificationCell
              idx={idx}
              options={row.original._clarificationOptions || []}
              initial={clarificationAnswersRef.current[idx] || { selected: null, note: '' }}
              onChange={(i, val) => setClarificationAnswers(prev => ({ ...prev, [i]: val }))}
            />
          );
        }
        const idx = row.original._index;
        const displayContent = contentEdits[idx] ?? row.original.content;
        const isEdited = idx in contentEdits;
        return displayContent ? (
          <div
            onContextMenu={(e) => { e.preventDefault(); setEditingIdx(idx); }}
            title="Right-click to edit"
            style={{ position: 'relative', cursor: 'context-menu' }}
          >
            {isEdited && (
              <div className="flex items-center gap-1" style={{ marginBottom: '4px' }}>
                <Pencil size={10} style={{ color: 'var(--jf-gold)' }} />
                <span style={{ fontSize: '10px', color: 'var(--jf-gold)', fontWeight: 600 }}>Edited</span>
              </div>
            )}
            <pre style={{
              fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap', lineHeight: 1.5, maxWidth: '300px', maxHeight: '100px',
              overflow: 'auto', margin: 0, padding: '8px', background: 'var(--bg-surface-inset)',
              borderRadius: '6px', border: `1px solid ${isEdited ? 'var(--jf-gold)' : 'var(--border-subtle)'}`,
            }}>
              {displayContent}
            </pre>
          </div>
        ) : <span style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>;
      },
    },
    {
      id: 'status',
      header: '',
      size: 80,
      cell: ({ row }) => {
        const idx = row.original._index;
        const isApproved = approvedItems.has(idx);
        const isRejected = rejectedItems.has(idx);
        const isDupe = row.original.isDuplicate;
        const isClarification = row.original._isClarification;

        if (isClarification) {
          const answer = clarificationAnswersRef.current[idx];
          const answered = answer?.selected || answer?.note;
          return answered ? <Badge variant="selected">Staged</Badge> : <Badge variant="default">?</Badge>;
        }

        if (isDupe) return <Badge variant="info">Skip</Badge>;

        if (isApproved) return (
          <div className="flex items-center gap-1">
            <Badge variant="selected">Approved</Badge>
            <button onClick={() => setApprovedItems(prev => { const s = new Set(prev); s.delete(idx); return s; })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }} title="Undo">
              <X size={12} />
            </button>
          </div>
        );

        if (isRejected) return (
          <div className="flex items-center gap-1">
            <Badge variant="info">Rejected</Badge>
            <button onClick={() => setRejectedItems(prev => { const s = new Set(prev); s.delete(idx); return s; })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }} title="Undo">
              <X size={12} />
            </button>
          </div>
        );

        return (
          <div className="flex items-center gap-1">
            <button onClick={() => handleApprove(idx)} title="Approve" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
              borderRadius: '6px', background: 'rgba(16, 163, 127, 0.1)', border: '1px solid rgba(16, 163, 127, 0.25)',
              color: '#50e3c2', cursor: 'pointer', transition: 'all 0.15s',
            }}><Check size={14} /></button>
            <button onClick={() => handleReject(idx)} title="Reject" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
              borderRadius: '6px', background: 'rgba(232, 67, 147, 0.1)', border: '1px solid rgba(232, 67, 147, 0.25)',
              color: 'var(--dtp-pink)', cursor: 'pointer', transition: 'all 0.15s',
            }}><X size={14} /></button>
          </div>
        );
      },
    },
  ], [approvedItems, rejectedItems]);

  // ── Past sessions columns ──

  const sessionColumns: ColumnDef<IntakeSession, any>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: 'Date',
      cell: ({ row }) => (
        <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
          {new Date(row.original.timestamp).toLocaleDateString()} {new Date(row.original.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    { accessorKey: 'provider', header: 'Provider', cell: ({ row }) => <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{row.original.provider}</span> },
    { accessorKey: 'sourceExcerpt', header: 'Source', cell: ({ row }) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.original.sourceExcerpt}</span> },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original as any;
        if (s.appliedAt) return <Badge variant="selected">Applied</Badge>;
        if (s.status === 'ready' && s.conflictCount > 0) return <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--dtp-pink)', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'color-mix(in srgb, var(--dtp-pink) 10%, transparent)' }}>Conflict</span>;
        if (s.status === 'ready') return <Badge variant="default">Ready</Badge>;
        if (s.status === 'error') return <Badge variant="info">Error</Badge>;
        return <Badge variant="info">Processing</Badge>;
      },
    },
    {
      id: 'load',
      header: '',
      cell: ({ row }) => row.original.status === 'ready' || row.original.appliedAt ? (
        <button onClick={() => loadSession(row.original.id)} style={{
          fontSize: '11px', color: 'var(--jf-lavender)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
        }}>Load</button>
      ) : null,
    },
  ], []);

  return (
    <div>
      {/* Header + Source Material */}
      <div className="wiki-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--jf-cream)' }}>
            Intake
          </h1>
          <ModelChip
            provider={selectedProvider}
            model={selectedModel}
            variant={selectedModel}
            enableProviderSwitch
            onProviderChange={(provider) => {
              setSelectedProvider(provider);
              const configStr = localStorage.getItem('model_variants_config');
              if (configStr) {
                const config: ModelVariantsConfig = JSON.parse(configStr);
                const pc = config.providers[provider];
                if (pc) setSelectedModel(pc.default_variant);
              }
            }}
            onVariantChange={(variantId) => setSelectedModel(variantId)}
          />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 300, marginBottom: '16px' }}>
          Paste text from any source — meeting notes, articles, transcripts — and AI will identify which knowledge base files to update.
        </p>
        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '10px' }}>
          Source Material
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste meeting notes, article text, transcripts, or any information to process into the knowledge base..."
          disabled={processing}
          style={{
            width: '100%', minHeight: '300px', padding: '16px', background: 'var(--bg-input)',
            border: '1px solid var(--border-default)', borderRadius: 'var(--radius-input)',
            color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)',
            lineHeight: 1.7, resize: 'vertical', outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,207,233,0.3)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
        />

        {/* Action bar */}
        <div className="flex items-center justify-between" style={{ marginTop: '12px' }}>
          <div className="flex items-center gap-2">
            {(result || text) && (
              <button onClick={handleReset} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'none',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-input)',
                fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer',
              }}><RefreshCw size={13} /> Clear</button>
            )}
            <button type="button" onClick={() => setShowSettings(!showSettings)} title="Intake prompt settings" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px',
              background: showSettings ? 'rgba(201,207,233,0.1)' : 'none',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-input)',
              color: showSettings ? 'var(--jf-lavender)' : 'var(--text-secondary)', cursor: 'pointer',
            }}><Settings size={15} /></button>
          </div>
          <button onClick={handleProcess} disabled={processing || !text.trim()} style={{
            padding: '10px 24px', cursor: processing || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: processing || !text.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)',
            background: 'rgba(216, 131, 10, 0.15)', border: '1px solid rgba(216, 131, 10, 0.3)',
            borderRadius: 'var(--radius-input)', transition: 'all 0.2s',
          }}>
            {processing ? <Loader2 size={16} className="animate-spin" /> : <Inbox size={16} />}
            {processing ? 'Processing...' : 'Process'}
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="wiki-card" style={{ padding: '24px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px' }}>
            System Prompt
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
            Customize instructions for filtering and organizing intake data. Based on knowledge-base/INTAKE.md.
          </p>
          <textarea value={systemInstructions} onChange={e => setSystemInstructions(e.target.value)}
            placeholder="e.g., 'Focus on financial data only' or 'Tag all people mentions with their titles'"
            disabled={processing} style={{
              width: '100%', minHeight: '120px', padding: '16px', background: 'var(--bg-input)',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-input)',
              color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-mono)',
              lineHeight: 1.7, resize: 'vertical', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(201,207,233,0.3)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
          />
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div className="wiki-card" style={{ padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--jf-gold)' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Processing in background...</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              You can continue working. Results will appear when ready.
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="wiki-card" style={{ padding: '20px 24px', marginBottom: '16px', borderTop: '2px solid var(--dtp-pink)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <AlertTriangle size={18} style={{ color: 'var(--dtp-pink)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dtp-pink)', marginBottom: '4px' }}>Processing Failed</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary */}
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px' }}>
            Analysis
          </div>
          <div className="wiki-card" style={{ padding: '20px 24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7 }}>{result.summary}</p>
          </div>

          {/* Matches Table */}
          {tableData.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <DataTable
                data={tableData}
                columns={matchColumns}
                actions={
                  <div className="flex items-center gap-3">
                    <button onClick={handleApproveAll}
                      disabled={approvedItems.size >= result.matches.filter(m => !m.isDuplicate).length}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 600, background: 'rgba(16, 163, 127, 0.1)',
                        border: '1px solid rgba(16, 163, 127, 0.25)', color: '#50e3c2', cursor: 'pointer',
                        opacity: approvedItems.size >= result.matches.filter(m => !m.isDuplicate).length ? 0.4 : 1,
                      }}>
                      <CheckCheck size={14} />
                      Approve All
                    </button>
                    <button onClick={handleReprocess} disabled={reprocessing} style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                      fontSize: '12px', fontWeight: 600, background: 'rgba(201, 207, 233, 0.1)',
                      border: '1px solid rgba(201, 207, 233, 0.25)', color: 'var(--jf-lavender)',
                      cursor: reprocessing ? 'wait' : 'pointer',
                    }}>
                      {reprocessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Reprocess
                    </button>
                    {approvedItems.size > 0 && !applyResult && (
                      <button onClick={handleApply} disabled={applying} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 600, background: 'rgba(216, 131, 10, 0.15)',
                        border: '1px solid rgba(216, 131, 10, 0.3)', color: 'var(--jf-cream)', cursor: applying ? 'wait' : 'pointer',
                      }}>
                        {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Apply {approvedItems.size} Change{approvedItems.size !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                }
                getRowStyle={(row) => {
                  const idx = row._index;
                  if (row.isDuplicate) return { opacity: 0.4 };
                  if (approvedItems.has(idx)) return { borderLeft: '3px solid rgba(16, 163, 127, 0.5)', opacity: 0.7 };
                  if (rejectedItems.has(idx)) return { borderLeft: '3px solid var(--dtp-pink)', opacity: 0.4 };
                  return undefined;
                }}
              />
            </div>
          )}

          {/* Apply result */}
          {applyResult && (
            <div className="wiki-card" style={{ padding: '16px 24px', marginTop: '12px', borderLeft: '3px solid var(--dtgo-green)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Check size={16} style={{ color: 'var(--dtgo-green)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{applyResult}</span>
            </div>
          )}

          {/* New Files */}
          {result.newFiles.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tnb-orange)', fontWeight: 600, marginBottom: '12px', marginTop: '24px' }}>
                New Files Suggested
              </div>
              {result.newFiles.map((f, i) => (
                <div key={i} className="wiki-card" style={{ padding: '16px 24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Plus size={16} style={{ color: 'var(--tnb-orange)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{f}</span>
                </div>
              ))}
            </>
          )}

          {/* Conflicts */}
          {result.conflicts.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--dtp-pink)', fontWeight: 600, marginBottom: '12px', marginTop: '24px' }}>
                Conflicts Detected
              </div>
              {result.conflicts.map((c, i) => (
                <div key={i} className="wiki-card" style={{ padding: '16px 24px', marginBottom: '8px', borderLeft: '3px solid var(--dtp-pink)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <AlertTriangle size={16} style={{ color: 'var(--dtp-pink)', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c}</span>
                </div>
              ))}
            </>
          )}

        </div>
      )}

      {/* Past Sessions */}
      <div style={{ marginTop: '32px' }}>
        <button type="button" onClick={() => setShowPastSessions(!showPastSessions)} style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: '12px',
        }}>
          <Clock size={14} style={{ color: 'var(--jf-lavender)', opacity: 0.7 }} />
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600 }}>
            Past Sessions ({pastSessions.length})
          </span>
          <ChevronDown size={14} style={{ color: 'var(--jf-lavender)', transform: showPastSessions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {showPastSessions && pastSessions.length > 0 && (
          <DataTable data={pastSessions} columns={sessionColumns} />
        )}
      </div>

      {/* Edit content modal */}
      <EditContentModal
        open={editingIdx !== null}
        onClose={() => setEditingIdx(null)}
        content={editingIdx !== null ? (contentEdits[editingIdx] ?? result?.matches[editingIdx]?.content ?? '') : ''}
        onSave={(newContent) => {
          if (editingIdx !== null) {
            setContentEdits(prev => ({ ...prev, [editingIdx]: newContent }));
          }
        }}
      />
    </div>
  );
}
