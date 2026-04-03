export interface IntakeCorrection {
  original: string;
  corrected: string;
  reason: string;
}

export interface IntakeMatch {
  file: string;
  section: string;
  action: 'update' | 'append' | 'conflict' | 'new_section' | 'duplicate';
  summary: string;
  content: string;
  corrections?: IntakeCorrection[];
  isDuplicate?: boolean;
}

export interface IntakeClarification {
  question: string;
  context: string;
  options: string[];
}

export interface IntakeResult {
  matches: IntakeMatch[];
  conflicts: string[];
  newFiles: string[];
  summary: string;
  clarifications?: IntakeClarification[];
}

export interface IntakeSession {
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
  conflictCount?: number;
  attachmentNames?: string[];
}
