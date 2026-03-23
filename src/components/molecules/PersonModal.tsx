import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

export function PersonModal({ open, onClose, person }: PersonModalProps) {
  if (!person) return null;

  const role = person.bio ? parseRole(person.bio) : null;

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content size="xl">
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
          {/* Bio from people.md */}
          {person.bio && (
            <div className="prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {person.bio}
              </ReactMarkdown>
            </div>
          )}

          {/* Cross-file mentions */}
          {person.mentions.length > 0 && (
            <div className="space-y-4">
              <div
                className="text-[10px] uppercase tracking-[1.5px] font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                Mentioned in
              </div>
              {person.mentions.map((mention) => (
                <div
                  key={mention.fileSlug}
                  className="border-l-2 pl-4"
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <Link
                    to={`/file/${mention.fileSlug}`}
                    onClick={onClose}
                    className="text-xs font-medium mb-2 block"
                    style={{ color: 'var(--jf-lavender)' }}
                  >
                    {mention.fileTitle}
                  </Link>
                  <div className="prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {mention.context}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
