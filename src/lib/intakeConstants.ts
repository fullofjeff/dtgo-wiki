import type { IntakeResult, IntakeSession } from '@/types/intake';

export const actionLabels: Record<string, { label: string; color: string }> = {
  update: { label: 'Update', color: 'var(--mqdc-blue)' },
  append: { label: 'Append', color: 'var(--dtgo-green)' },
  conflict: { label: 'Conflict', color: 'var(--dtp-pink)' },
  new_section: { label: 'New Section', color: 'var(--tnb-orange)' },
  duplicate: { label: 'Duplicate', color: 'var(--text-secondary)' },
  clarification: { label: 'Needs Input', color: 'var(--jf-gold)' },
};

export type SessionState = 'processing' | 'reprocessing' | 'ready' | 'error' | 'applied' | 'partially_applied' | 'all_rejected' | 'resolved';

/** Derive the display state of an intake session */
export function getSessionState(session: Pick<IntakeSession, 'status' | 'approvals' | 'appliedAt' | 'resolvedAt' | 'matchCount'> & { result?: { matches?: unknown[] } }): SessionState {
  if (session.status === 'processing') {
    return session.appliedAt ? 'reprocessing' : 'processing';
  }
  if (session.status === 'error') return session.resolvedAt ? 'resolved' : 'error';

  const approvals = session.approvals || {};
  const approvalValues = Object.values(approvals);
  // Use actual match count (result may have grown after reprocessing)
  const totalMatches = session.result?.matches?.length || session.matchCount || 0;
  const hasRejected = approvalValues.some(v => v === 'rejected');

  // Count decisions: explicit approvals + matches already applied or flagged as duplicate without an approval entry
  let decisionCount = approvalValues.length;
  const matches = session.result?.matches as Array<{ appliedAt?: string; isDuplicate?: boolean }> | undefined;
  if (matches) {
    for (let i = 0; i < matches.length; i++) {
      if (!(String(i) in approvals) && (matches[i]?.appliedAt || matches[i]?.isDuplicate)) {
        decisionCount++;
      }
    }
  }
  const allDecided = totalMatches > 0 && decisionCount >= totalMatches;

  // If explicitly resolved, honour that regardless of partial approval state
  if (session.resolvedAt && session.appliedAt) return 'applied';
  if (session.resolvedAt && !session.appliedAt) return 'resolved';

  // Applied but not yet resolved — check if all matches were decided
  if (session.appliedAt) {
    return allDecided ? 'applied' : 'partially_applied';
  }

  if (allDecided && approvalValues.every(v => v === 'rejected' || v === 'dismissed')) {
    return hasRejected ? 'all_rejected' : 'resolved';
  }

  return 'ready';
}

/** Ensure an IntakeResult has all required fields with safe defaults */
export function normalizeResult(r: any): IntakeResult {
  if (!r || typeof r !== 'object') return { summary: '', matches: [], newFiles: [], conflicts: [] };
  return {
    summary: r.summary || '',
    matches: Array.isArray(r.matches) ? r.matches : [],
    newFiles: Array.isArray(r.newFiles) ? r.newFiles.map((f: any) => typeof f === 'string' ? f : (f.path || f.name || JSON.stringify(f))) : [],
    conflicts: Array.isArray(r.conflicts) ? r.conflicts.map((c: any) => typeof c === 'string' ? c : (c.original || c.description || JSON.stringify(c))) : [],
    clarifications: Array.isArray(r.clarifications) ? r.clarifications : undefined,
  };
}
