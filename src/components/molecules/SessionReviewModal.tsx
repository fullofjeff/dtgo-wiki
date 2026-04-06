import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { ModelChip } from '@/components/model/ModelChip';
import { Check, X, CheckCheck, FileText, ArrowRight, Pencil, AlertTriangle, Plus, Loader2, FileUp, RotateCcw, Sparkles, Ban } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { IntakeMatch, IntakeResult, IntakeSession } from '@/types/intake';
import { actionLabels, normalizeResult } from '@/lib/intakeConstants';

interface SessionReviewModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
  onApplied?: () => void;
  onSuccess?: (msg: { title: string; subtitle: string }) => void;
}

type TableRow = IntakeMatch & {
  _index: number;
  _isClarification?: boolean;
  _clarificationOptions?: string[];
  _clarificationContext?: string;
};

// Isolated clarification cell to prevent table re-renders
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
    onChange(idx, { selected, note });
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
          onChange={e => setNote(e.target.value)}
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

// Inline edit modal for proposed content (layers above the review modal)
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
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={(e) => { e.stopPropagation(); onClose(); }} onMouseDown={(e) => e.stopPropagation()} />
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

export function SessionReviewModal({ open, onClose, sessionId, onApplied, onSuccess }: SessionReviewModalProps) {
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [approvedItems, setApprovedItems] = useState<Set<number>>(new Set());
  const [rejectedItems, setRejectedItems] = useState<Set<number>>(new Set());
  const [contentEdits, setContentEdits] = useState<Record<number, string>>({});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<number, string>>({});
  const [stagedConflicts, setStagedConflicts] = useState<Set<number>>(new Set());
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, { selected: string | null; note: string }>>({});
  const clarificationAnswersRef = useRef(clarificationAnswers);
  clarificationAnswersRef.current = clarificationAnswers;
  const [applying, setApplying] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [showReasonInput, setShowReasonInput] = useState<number | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<Record<number, { recommendation: string; reason: string; duplicateOf?: string; confidence?: string }>>({});
  const [reevalLoading, setReevalLoading] = useState<Set<number>>(new Set());
  const [matchContextMenu, setMatchContextMenu] = useState<{ x: number; y: number; idx: number } | null>(null);
  const [dismissedItems, setDismissedItems] = useState<Set<number>>(new Set());

  // Per-match applied tracking: each match knows if it's been written to disk
  const isMatchApplied = useCallback((idx: number) => !!result?.matches[idx]?.appliedAt, [result]);
  const allApplied = useMemo(() => result?.matches?.every(m => m.appliedAt || m.isDuplicate) ?? false, [result]);
  // Legacy compat: readOnly = true only when every match is applied (no new matches from reprocess)
  const readOnly = allApplied;
  const hasUndismissedRejections = [...rejectedItems].some(i => !dismissedItems.has(i));

  // Fetch session on open
  useEffect(() => {
    if (!open || !sessionId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSession(null);
    setApprovedItems(new Set());
    setRejectedItems(new Set());
    setContentEdits({});
    setEditingIdx(null);
    setConflictResolutions({});
    setStagedConflicts(new Set());
    setClarificationAnswers({});
    setApplying(false);
    setReprocessing(false);
    setApplyResult(null);
    setSourceText(null);
    setShowSource(false);
    setRejectionReasons({});
    setShowReasonInput(null);
    setAiRecommendations({});
    setReevalLoading(new Set());
    setMatchContextMenu(null);
    setDismissedItems(new Set());

    fetch(`/api/intake/session/${sessionId}`)
      .then(r => r.json())
      .then((s: any) => {
        setSourceText(s.sourceText || s.sourceExcerpt || null);
        setSession(s as IntakeSession);
        if (s.result) {
          setResult(normalizeResult(s.result));
          setApprovedItems(new Set(
            Object.entries(s.approvals || {}).filter(([, v]) => v === 'approved').map(([k]) => Number(k))
          ));
          setRejectedItems(new Set(
            Object.entries(s.approvals || {}).filter(([, v]) => v === 'rejected').map(([k]) => Number(k))
          ));
          setDismissedItems(new Set(
            Object.entries(s.approvals || {}).filter(([, v]) => v === 'dismissed').map(([k]) => Number(k))
          ));
          if (s.rejectionReasons) setRejectionReasons(
            Object.fromEntries(Object.entries(s.rejectionReasons).map(([k, v]) => [Number(k), v as string]))
          );
          if (s.appliedAt) setApplyResult(`Applied on ${new Date(s.appliedAt).toLocaleString()}`);
        } else if (s.error) {
          setError(s.error);
        } else {
          setError('No results available for this session');
        }
      })
      .catch(() => setError('Failed to load session'))
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  const handleApprove = (index: number) => {
    if (isMatchApplied(index)) return; // Already written to disk
    setApprovedItems(prev => { const s = new Set(prev); s.add(index); return s; });
    setRejectedItems(prev => { const s = new Set(prev); s.delete(index); return s; });
  };

  const handleReject = (index: number) => {
    if (isMatchApplied(index)) return;
    setRejectedItems(prev => { const s = new Set(prev); s.add(index); return s; });
    setApprovedItems(prev => { const s = new Set(prev); s.delete(index); return s; });
  };

  const handleApproveAll = () => {
    if (!result) return;
    const all = new Set(result.matches.map((_, i) => i).filter(i =>
      !result.matches[i].isDuplicate && !result.matches[i].appliedAt
    ));
    setApprovedItems(all);
    setRejectedItems(new Set());
  };

  // Re-evaluate a single match with AI
  const handleReeval = async (idx: number) => {
    if (!sessionId) return;
    setReevalLoading(prev => { const s = new Set(prev); s.add(idx); return s; });
    try {
      const res = await fetch('/api/intake/reeval-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, matchIndex: idx }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiRecommendations(prev => ({ ...prev, [idx]: data }));
      }
    } catch { /* ignore */ }
    setReevalLoading(prev => { const s = new Set(prev); s.delete(idx); return s; });
  };

  // Dismiss rejected items via API
  const handleDismiss = async (indices: number[]) => {
    if (!sessionId) return;
    const reasons: Record<string, string> = {};
    for (const idx of indices) {
      if (rejectionReasons[idx]) reasons[String(idx)] = rejectionReasons[idx];
    }
    try {
      const res = await fetch('/api/intake/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, dismissals: indices.map(String), rejectionReasons: reasons }),
      });
      if (res.ok) {
        setDismissedItems(prev => { const s = new Set(prev); indices.forEach(i => s.add(i)); return s; });
        // Re-fetch session to get updated state
        const updated = await fetch(`/api/intake/session/${sessionId}`).then(r => r.json());
        setSession(updated);
        if (updated.result) setResult(normalizeResult(updated.result));
        onApplied?.();
      }
    } catch { /* ignore */ }
  };

  // Close match context menu on click outside
  useEffect(() => {
    if (!matchContextMenu) return;
    const handler = () => setMatchContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [matchContextMenu]);

  const hasStagedAnswers = Object.values(clarificationAnswersRef.current).some(v => v.selected || v.note);
  const hasStagedConflicts = Object.values(conflictResolutions).some(v => v.trim());
  const hasContentEdits = Object.keys(contentEdits).length > 0;
  const hasRefineData = hasStagedAnswers || hasStagedConflicts || hasContentEdits;

  const handleApplyAndRefine = useCallback(async () => {
    if (!sessionId) return;
    const willApply = approvedItems.size > 0;
    const willRefine = hasRefineData;
    if (willApply) setApplying(true);
    if (willRefine && !willApply) setReprocessing(true);
    setApplyResult(null);

    try {
      if (willApply) {
        const approvals: Record<string, 'approved' | 'rejected' | 'dismissed'> = {};
        approvedItems.forEach(i => { approvals[String(i)] = 'approved'; });
        rejectedItems.forEach(i => { approvals[String(i)] = 'rejected'; });
        dismissedItems.forEach(i => { approvals[String(i)] = 'dismissed'; });

        const reasonsPayload: Record<string, string> = {};
        Object.entries(rejectionReasons).forEach(([k, v]) => { if (v) reasonsPayload[k] = v; });

        const res = await fetch('/api/intake/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, approvals, contentEdits, rejectionReasons: reasonsPayload }),
        });
        if (!res.ok) {
          setApplyResult(`Error: ${await res.text()}`);
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
        setApplyResult(`Applied ${data.applied} change(s) and committed to git.${skippedMsg}${issueMsg}`);

        // Re-fetch session to get updated appliedAt
        try {
          const updated = await fetch(`/api/intake/session/${sessionId}`).then(r => r.json());
          setSession(updated);
          if (updated.result) setResult(normalizeResult(updated.result));
        } catch { /* ignore */ }
      }

      if (hasRefineData) {
        // Switch from applying to reprocessing state
        setApplying(false);
        setReprocessing(true);

        // Build success message based on what happened
        const appliedCount = approvedItems.size;
        const successMsg = appliedCount > 0
          ? { title: 'Applied & Reprocessing', subtitle: `${appliedCount} change(s) committed. Refining edits in background.` }
          : { title: 'Reprocessing', subtitle: 'Refining edits in background. Reopen session to see updated results.' };

        // Close modal and show success immediately — reprocess runs in background
        onClose();
        onApplied?.();
        onSuccess?.(successMsg);

        // Fire reprocess in background (modal is already closed)
        fetch('/api/intake/reprocess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            clarificationAnswers: clarificationAnswersRef.current,
            conflictResolutions,
            contentEdits,
          }),
        }).then(() => {
          onApplied?.(); // Refresh parent again when reprocess completes
        }).catch(() => {
          // Reprocess failure — user will see stale results when they reopen
        });

        return;
      }

      // Refresh parent AFTER apply-only operations
      onApplied?.();

      // Close modal after apply-only
      if (approvedItems.size > 0) {
        const appliedCount = approvedItems.size;
        onSuccess?.({ title: 'Changes Applied', subtitle: `${appliedCount} change(s) committed to git.` });
        onClose();
      }
    } catch (err) {
      setApplyResult(`Error: ${err instanceof Error ? err.message : 'Apply failed'}`);
    } finally {
      setApplying(false);
      setReprocessing(false);
    }
  }, [sessionId, approvedItems, rejectedItems, dismissedItems, contentEdits, conflictResolutions, hasRefineData, onApplied, onClose, onSuccess, rejectionReasons]);

  // Table data
  const tableData: TableRow[] = useMemo(() => {
    const rows: TableRow[] = (result?.matches ?? []).map((m, i) => ({ ...m, _index: i }));
    if (result?.clarifications) {
      result.clarifications.forEach((c, i) => {
        rows.push({
          file: '', section: '', content: '',
          action: 'clarification' as any,
          summary: c.question,
          _index: 1000 + i,
          _isClarification: true,
          _clarificationOptions: c.options,
          _clarificationContext: c.context,
        });
      });
    }
    return rows;
  }, [result]);

  // Column definitions
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
          if (isMatchApplied(row.original._index)) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>;
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
        const matchLocked = isMatchApplied(idx);
        const displayContent = contentEdits[idx] ?? row.original.content;
        const isEdited = idx in contentEdits;
        return displayContent ? (
          <div
            onContextMenu={matchLocked ? undefined : (e) => { e.preventDefault(); setEditingIdx(idx); }}
            title={matchLocked ? undefined : 'Right-click to edit'}
            style={{ position: 'relative', cursor: matchLocked ? 'default' : 'context-menu' }}
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
          if (isMatchApplied(idx)) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.4 }}>—</span>;
          const answer = clarificationAnswersRef.current[idx];
          const answered = answer?.selected || answer?.note;
          return answered ? <Badge color="info">Staged</Badge> : <Badge color="default">?</Badge>;
        }

        if (isDupe) return <Badge color="neutral">Skip</Badge>;

        const isDismissed = dismissedItems.has(idx);
        const aiRec = aiRecommendations[idx];
        const isEvaluating = reevalLoading.has(idx);
        const reason = rejectionReasons[idx];
        const matchApplied = isMatchApplied(idx);
        const bounceError = row.original.applyError;

        // AI recommendation badge (shown in all modes)
        const aiRecBadge = isEvaluating ? (
          <div className="flex items-center gap-1" style={{ marginTop: '2px' }}>
            <Loader2 size={10} className="animate-spin" style={{ color: 'var(--jf-lavender)' }} />
            <span style={{ fontSize: '9px', color: 'var(--jf-lavender)' }}>Evaluating…</span>
          </div>
        ) : aiRec ? (
          <div
            className="flex items-center gap-1"
            style={{ marginTop: '2px', cursor: 'default' }}
            title={`${aiRec.reason}${aiRec.duplicateOf ? ` (duplicate of: ${aiRec.duplicateOf})` : ''}`}
          >
            <Sparkles size={9} style={{ color: aiRec.recommendation === 'approve' ? '#50e3c2' : 'var(--dtp-pink)' }} />
            <span style={{ fontSize: '9px', color: aiRec.recommendation === 'approve' ? '#50e3c2' : 'var(--dtp-pink)', fontWeight: 600 }}>
              AI: {aiRec.recommendation === 'approve' ? 'Approve' : 'Reject'}
            </span>
            {aiRec.confidence && aiRec.confidence !== 'high' && (
              <span style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>({aiRec.confidence})</span>
            )}
          </div>
        ) : null;

        // Per-match applied state: this match has been written to disk — locked
        if (matchApplied) {
          return (
            <div>
              <Badge color="info">Applied</Badge>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {new Date(row.original.appliedAt!).toLocaleDateString()}
              </div>
            </div>
          );
        }

        // Bounced: duplicate/conflict detected during apply — show why
        if (bounceError) {
          return (
            <div>
              <Badge color="neutral">Bounced</Badge>
              <div style={{ fontSize: '9px', color: 'var(--dtp-pink)', marginTop: '2px' }} title={bounceError}>
                {bounceError.length > 40 ? bounceError.slice(0, 40) + '…' : bounceError}
              </div>
            </div>
          );
        }

        // Read-only mode (all matches applied)
        if (readOnly) {
          if (isApproved) return <Badge color="info">Approved</Badge>;
          if (isDismissed) return (
            <div>
              <Badge color="default">Dismissed</Badge>
              {reason && <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }} title={reason}>"{reason.slice(0, 30)}{reason.length > 30 ? '…' : ''}"</div>}
            </div>
          );
          if (isRejected) return (
            <div>
              <div className="flex items-center gap-1">
                <Badge color="neutral">Rejected</Badge>
                <button onClick={() => handleDismiss([idx])}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)' }} title="Dismiss — acknowledge and remove from queue">
                  <Ban size={11} />
                </button>
                <button onClick={() => handleReeval(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)' }} title="Re-evaluate with AI">
                  <Sparkles size={11} />
                </button>
              </div>
              {reason && <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }} title={reason}>"{reason.slice(0, 30)}{reason.length > 30 ? '…' : ''}"</div>}
              {aiRecBadge}
            </div>
          );
          return <Badge color="default">—</Badge>;
        }

        if (applying && approvedItems.has(idx)) return (
          <div className="flex items-center gap-1">
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--dtgo-green)' }} />
            <span style={{ fontSize: '10px', color: 'var(--dtgo-green)', fontWeight: 600 }}>Applying…</span>
          </div>
        );
        if (reprocessing && idx in contentEdits) return (
          <div className="flex items-center gap-1">
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--jf-lavender)' }} />
            <span style={{ fontSize: '10px', color: 'var(--jf-lavender)', fontWeight: 600 }}>Reprocessing…</span>
          </div>
        );

        if (isApproved) return (
          <div>
            <div className="flex items-center gap-1">
              <Badge color="info">Approved</Badge>
              <button onClick={() => setApprovedItems(prev => { const s = new Set(prev); s.delete(idx); return s; })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }} title="Undo">
                <X size={12} />
              </button>
            </div>
            {aiRecBadge}
          </div>
        );

        if (isRejected) return (
          <div>
            <div className="flex items-center gap-1">
              <Badge color="neutral">Rejected</Badge>
              <button onClick={() => setRejectedItems(prev => { const s = new Set(prev); s.delete(idx); return s; })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }} title="Undo">
                <X size={12} />
              </button>
            </div>
            {showReasonInput === idx ? (
              <input
                autoFocus
                placeholder="Reason (optional)"
                value={rejectionReasons[idx] || ''}
                onChange={e => setRejectionReasons(prev => ({ ...prev, [idx]: e.target.value }))}
                onBlur={() => setShowReasonInput(null)}
                onKeyDown={e => { if (e.key === 'Enter') setShowReasonInput(null); }}
                style={{
                  width: '100%', marginTop: '4px', padding: '3px 6px', fontSize: '10px',
                  background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                  borderRadius: '4px', color: 'var(--text-primary)', outline: 'none',
                }}
              />
            ) : (
              <button
                onClick={() => setShowReasonInput(idx)}
                style={{ fontSize: '9px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '2px', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                {rejectionReasons[idx] ? `"${rejectionReasons[idx].slice(0, 20)}…"` : '+ reason'}
              </button>
            )}
            {aiRecBadge}
          </div>
        );

        const isEdited = idx in contentEdits;
        return (
          <div
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMatchContextMenu({ x: e.clientX, y: e.clientY, idx }); }}
            style={{ cursor: 'context-menu' }}
            title="Right-click for more options"
          >
            <div className="flex items-center gap-1">
              {isEdited && <Badge color="warning">Edited</Badge>}
              <button onClick={() => handleApprove(idx)} disabled={isEdited} title={isEdited ? 'Refine first to apply edits' : 'Approve'} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                borderRadius: '6px', background: 'rgba(16, 163, 127, 0.1)', border: '1px solid rgba(16, 163, 127, 0.25)',
                color: '#50e3c2', cursor: isEdited ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                opacity: isEdited ? 0.3 : 1,
              }}><Check size={14} /></button>
              <button onClick={() => { handleReject(idx); setShowReasonInput(idx); }} disabled={isEdited} title={isEdited ? 'Refine first to apply edits' : 'Reject'} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px',
                borderRadius: '6px', background: 'rgba(232, 67, 147, 0.1)', border: '1px solid rgba(232, 67, 147, 0.25)',
                color: 'var(--dtp-pink)', cursor: isEdited ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                opacity: isEdited ? 0.3 : 1,
              }}><X size={14} /></button>
            </div>
            {aiRecBadge}
          </div>
        );
      },
    },
  ], [approvedItems, rejectedItems, dismissedItems, contentEdits, clarificationAnswers, applying, reprocessing, readOnly, isMatchApplied, rejectionReasons, showReasonInput, aiRecommendations, reevalLoading]);

  return (
    <>
      <Modal.Root open={open} onClose={() => { if (editingIdx !== null) return; onClose(); }}>
        <Modal.Overlay />
        <Modal.Content size="full">
          <Modal.Header>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Modal.Title>Session Review</Modal.Title>
              {session && (
                <div className="flex items-center gap-3" style={{ marginLeft: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <ModelChip provider={session.provider} model={session.model} />
                  {result && (
                    <Badge color="default">{result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}</Badge>
                  )}
                  {allApplied && !hasUndismissedRejections && (
                    <Badge color="info">Applied</Badge>
                  )}
                  {session?.appliedAt && !allApplied && (
                    <Badge color="warning">Partial</Badge>
                  )}
                  {allApplied && hasUndismissedRejections && (
                    <Badge color="warning">Needs Cleanup</Badge>
                  )}
                  {!session?.appliedAt && rejectedItems.size > 0 && approvedItems.size === 0 && rejectedItems.size + dismissedItems.size >= (result?.matches?.length || 0) && (
                    <Badge color="error">All Rejected</Badge>
                  )}
                </div>
              )}
            </div>
          </Modal.Header>

          <Modal.Body>
            {loading && (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '24px 0' }}>
                <Loader2 size={16} className="animate-spin" /> Loading session...
              </div>
            )}

            {!loading && error && (
              <div style={{ color: 'var(--dtp-pink)', fontSize: '14px', padding: '24px 0' }}>
                {error}
              </div>
            )}

            {!loading && result && (
              <div className="space-y-6">
                {/* Summary */}
                {result.summary && (
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, padding: '0 4px' }}>{result.summary}</p>
                )}

                {/* Source toggle + collapsible content */}
                {sourceText && (
                  <div>
                    <button
                      onClick={() => setShowSource(!showSource)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontSize: '11px', fontWeight: 500, color: 'var(--jf-lavender)',
                        background: showSource ? 'rgba(201,207,233,0.1)' : 'none',
                        border: showSource ? '1px solid rgba(201,207,233,0.2)' : '1px solid transparent',
                        borderRadius: '6px', padding: '5px 12px', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <FileUp size={12} />
                      {showSource ? 'Hide' : 'Show'} Original Input
                    </button>

                    {showSource && (
                      <div style={{ marginTop: '12px' }}>
                        <h4 className="flex items-center gap-2" style={{ margin: '0 0 10px 0', padding: 0 }}>
                          <FileUp size={14} style={{ color: 'var(--jf-lavender)' }} />
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600 }}>
                            Original Input
                          </span>
                        </h4>
                        <pre style={{
                          padding: '16px', background: 'var(--bg-surface-inset)',
                          border: '1px solid var(--border-default)', borderRadius: '8px',
                          fontSize: '13px', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: '300px',
                          overflow: 'auto', margin: 0,
                        }}>
                          {sourceText}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Matches Table */}
                {tableData.length > 0 && (
                  <DataTable
                    data={tableData}
                    columns={matchColumns}
                    actions={!allApplied ? (
                      <div className="flex items-center gap-3">
                        {(() => {
                          const approvable = (result.matches ?? []).filter(m => !m.isDuplicate && !m.appliedAt);
                          const allApprovedCount = approvable.length;
                          return (
                            <button onClick={handleApproveAll}
                              disabled={approvedItems.size >= allApprovedCount}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                                fontSize: '12px', fontWeight: 600, background: 'rgba(16, 163, 127, 0.1)',
                                border: '1px solid rgba(16, 163, 127, 0.25)', color: '#50e3c2', cursor: 'pointer',
                                opacity: approvedItems.size >= allApprovedCount ? 0.4 : 1,
                              }}>
                              <CheckCheck size={14} />
                              Approve All
                            </button>
                          );
                        })()}
                        {(approvedItems.size > 0 || hasRefineData) && (
                          <button onClick={handleApplyAndRefine} disabled={applying || reprocessing} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: 600, background: 'rgba(216, 131, 10, 0.15)',
                            border: '1px solid rgba(216, 131, 10, 0.3)', color: 'var(--jf-cream)',
                            cursor: applying || reprocessing ? 'wait' : 'pointer',
                          }}>
                            {applying || reprocessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            {approvedItems.size > 0 && hasRefineData
                              ? `Apply ${approvedItems.size} & Refine`
                              : approvedItems.size > 0
                                ? `Apply ${approvedItems.size} Change${approvedItems.size !== 1 ? 's' : ''}`
                                : 'Refine Answers'}
                          </button>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6, fontStyle: 'italic' }}>
                          {approvedItems.size > 0 && hasRefineData
                            ? 'Will apply approved changes, then refine with your answers'
                            : approvedItems.size > 0
                              ? `${approvedItems.size} change${approvedItems.size !== 1 ? 's' : ''} ready to commit`
                              : hasRefineData
                                ? 'Will send your answers to refine suggestions'
                                : 'Approve matches to apply, answer questions to refine'}
                        </span>
                      </div>
                    ) : allApplied && hasUndismissedRejections ? (
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleDismiss([...rejectedItems].filter(i => !dismissedItems.has(i)))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: 600, background: 'rgba(232, 67, 147, 0.1)',
                            border: '1px solid rgba(232, 67, 147, 0.25)', color: 'var(--dtp-pink)', cursor: 'pointer',
                          }}>
                          <Ban size={14} />
                          Dismiss {[...rejectedItems].filter(i => !dismissedItems.has(i)).length} Rejected
                        </button>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6, fontStyle: 'italic' }}>
                          Acknowledge rejected items to clear from queue
                        </span>
                      </div>
                    ) : undefined}
                    getRowStyle={(row) => {
                      const idx = row._index;
                      if (row.isDuplicate) return { opacity: 0.4 };
                      if (row.appliedAt) return { borderLeft: '3px solid rgba(16, 163, 127, 0.5)', opacity: 0.5 };
                      if (row.applyError) return { borderLeft: '3px solid var(--dtp-pink)', opacity: 0.6 };
                      if (dismissedItems.has(idx)) return { borderLeft: '3px solid var(--border-subtle)', opacity: 0.3 };
                      if (approvedItems.has(idx)) return { borderLeft: '3px solid rgba(16, 163, 127, 0.5)', opacity: 0.7 };
                      if (rejectedItems.has(idx)) return { borderLeft: '3px solid var(--dtp-pink)', opacity: 0.4 };
                      if (idx in contentEdits) return { borderLeft: '3px solid var(--jf-gold)' };
                      return undefined;
                    }}
                  />
                )}

                {/* New Files */}
                {result.newFiles?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tnb-orange)', fontWeight: 600, marginBottom: '12px' }}>
                      New Files Suggested
                    </div>
                    {result.newFiles.map((f, i) => (
                      <div key={i} className="wiki-card" style={{ padding: '16px 24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Plus size={16} style={{ color: 'var(--tnb-orange)' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{typeof f === 'string' ? f : JSON.stringify(f)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conflicts */}
                {result.conflicts?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--dtp-pink)', fontWeight: 600, marginBottom: '12px' }}>
                      Conflicts Detected
                    </div>
                    {result.conflicts.map((c, i) => (
                      <div key={i} className="wiki-card" style={{ padding: '16px 24px', marginBottom: '8px', borderLeft: '3px solid var(--dtp-pink)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: readOnly ? 0 : '10px' }}>
                          <AlertTriangle size={16} style={{ color: 'var(--dtp-pink)', flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{typeof c === 'string' ? c : JSON.stringify(c)}</span>
                        </div>
                        {!readOnly && (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={conflictResolutions[i] || ''}
                              onChange={e => setConflictResolutions(prev => ({ ...prev, [i]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && conflictResolutions[i]?.trim()) {
                                  setStagedConflicts(prev => { const s = new Set(prev); s.add(i); return s; });
                                }
                              }}
                              onBlur={() => {
                                if (conflictResolutions[i]?.trim()) {
                                  setStagedConflicts(prev => { const s = new Set(prev); s.add(i); return s; });
                                }
                              }}
                              placeholder="How should this conflict be resolved? (included in refine)"
                              style={{
                                flex: 1, padding: '8px 12px', fontSize: '12px',
                                background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                                borderRadius: '6px', color: 'var(--text-primary)', outline: 'none',
                              }}
                              onFocus={e => (e.target.style.borderColor = 'rgba(232,67,147,0.4)')}
                            />
                            {stagedConflicts.has(i) && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                fontSize: '10px', fontWeight: 600, color: '#50e3c2',
                                whiteSpace: 'nowrap',
                              }}>
                                <Check size={12} /> Staged
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Modal.Body>

          {applyResult && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid #333', fontSize: '13px' }}>
              <span style={{ color: applyResult.startsWith('Error') ? 'var(--dtp-pink)' : 'var(--dtgo-green)' }}>
                {applyResult}
              </span>
            </div>
          )}
        </Modal.Content>
      </Modal.Root>

      {/* Edit content modal — rendered outside Modal.Root to avoid focus trap issues */}
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

      {/* Match context menu */}
      {matchContextMenu && (
        <div
          style={{
            position: 'fixed', top: matchContextMenu.y, left: matchContextMenu.x, zIndex: 10003,
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: '180px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { handleReeval(matchContextMenu.idx); setMatchContextMenu(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '10px 14px', fontSize: '12px', fontWeight: 500,
              background: 'none', border: 'none', color: 'var(--text-primary)',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,207,233,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Sparkles size={13} style={{ color: 'var(--jf-lavender)' }} />
            Re-evaluate with AI
          </button>
          <button
            onClick={() => { setEditingIdx(matchContextMenu.idx); setMatchContextMenu(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '10px 14px', fontSize: '12px', fontWeight: 500,
              background: 'none', border: 'none', color: 'var(--text-primary)',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,207,233,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Pencil size={13} style={{ color: 'var(--jf-gold)' }} />
            Edit Content
          </button>
        </div>
      )}
    </>
  );
}
