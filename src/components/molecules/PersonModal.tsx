import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import type { PersonRecord } from '@/data/types';

interface PersonModalProps {
  open: boolean;
  onClose: () => void;
  person: PersonRecord | null;
}

/** Extract role from first backtick line, e.g. "`CEO` · `MQDC`" → "CEO · MQDC" */
function parseRole(bio: string): string | null {
  const firstLine = bio.split('\n').find(l => l.trim().length > 0);
  if (!firstLine || !firstLine.trim().startsWith('`')) return null;
  return firstLine.trim().replace(/`/g, '');
}

/** Extract first paragraph after the role line as a plain-text summary */
function extractSummary(bio: string): string | null {
  const lines = bio.split('\n');
  let pastRole = false;
  const paraLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastRole) {
      // Skip role line and blank lines before first paragraph
      if (trimmed.startsWith('`') || trimmed === '') {
        if (trimmed.startsWith('`')) pastRole = true;
        continue;
      }
      pastRole = true;
    }
    if (pastRole) {
      if (trimmed === '' && paraLines.length > 0) break;
      if (trimmed.startsWith('**Sources:**')) break;
      if (trimmed === '') continue;
      paraLines.push(trimmed);
    }
  }

  if (paraLines.length === 0) return null;
  // Strip markdown bold/links to plain text
  return paraLines.join(' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

export function PersonModal({ open, onClose, person }: PersonModalProps) {
  if (!person) return null;

  const role = person.bio ? parseRole(person.bio) : null;
  const summary = person.bio ? extractSummary(person.bio) : null;

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content size="lg">
        <Modal.Header>
          <div className="flex flex-col gap-1">
            <Modal.Title>{person.canonicalName}</Modal.Title>
            {role && (
              <span className="text-xs text-[var(--text-secondary)] font-normal">
                {role}
              </span>
            )}
          </div>
        </Modal.Header>
        <Modal.Body>
          {summary && (
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 14,
                lineHeight: 1.7,
                fontWeight: 300,
              }}
            >
              {summary}
            </p>
          )}

          {/* Cross-file mentions */}
          {person.mentions.length > 0 && (
            <div className="space-y-3">
              <div
                className="text-[10px] uppercase tracking-[1.5px] font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                Mentioned in
              </div>
              {person.mentions.map((mention) => (
                <Link
                  key={mention.fileSlug}
                  to={`/file/${mention.fileSlug}`}
                  onClick={onClose}
                  className="block text-xs font-medium border-l-2 pl-3 py-1"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--jf-lavender)' }}
                >
                  {mention.fileTitle}
                </Link>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
