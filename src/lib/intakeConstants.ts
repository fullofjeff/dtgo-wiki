import type { IntakeResult, IntakeSession } from '@/types/intake';

export const actionLabels: Record<string, { label: string; color: string }> = {
  update: { label: 'Update', color: 'var(--mqdc-blue)' },
  append: { label: 'Append', color: 'var(--dtgo-green)' },
  conflict: { label: 'Conflict', color: 'var(--dtp-pink)' },
  new_section: { label: 'New Section', color: 'var(--tnb-orange)' },
  duplicate: { label: 'Duplicate', color: 'var(--text-secondary)' },
  clarification: { label: 'Needs Input', color: 'var(--jf-gold)' },
};

export type SessionState = 'processing' | 'ready' | 'error' | 'applied' | 'partially_applied' | 'all_rejected' | 'resolved';

/** Derive the display state of an intake session */
export function getSessionState(session: Pick<IntakeSession, 'status' | 'approvals' | 'appliedAt' | 'resolvedAt'>): SessionState {
  if (session.status === 'processing') return 'processing';
  if (session.status === 'error') return 'error';
  if (session.resolvedAt) return 'resolved';

  const approvalValues = Object.values(session.approvals || {});
  const hasRejected = approvalValues.some(v => v === 'rejected');

  if (session.appliedAt) {
    return hasRejected ? 'partially_applied' : 'applied';
  }

  if (approvalValues.length > 0 && approvalValues.every(v => v === 'rejected' || v === 'dismissed')) {
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
