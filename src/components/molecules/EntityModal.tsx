import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { ArrowRight } from 'lucide-react';
import type { EntityRecord } from '@/data/types';

interface EntityModalProps {
  open: boolean;
  onClose: () => void;
  entity: EntityRecord | null;
}

export function EntityModal({ open, onClose, entity }: EntityModalProps) {
  if (!entity) return null;

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content size="lg">
        <Modal.Header>
          <div className="flex flex-col gap-1">
            <Modal.Title>{entity.canonicalName}</Modal.Title>
            {entity.scope && (
              <span className="text-xs text-[var(--text-secondary)] font-normal">
                {entity.scope}
              </span>
            )}
          </div>
        </Modal.Header>
        <Modal.Body>
          {entity.accentColor && (
            <div
              style={{
                height: 3,
                background: entity.accentColor,
                borderRadius: 2,
                marginBottom: 16,
              }}
            />
          )}

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            {entity.description}
          </p>

          {entity.slug && (
            <Link
              to={`/file/${entity.slug}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium"
              style={{ color: entity.accentColor || 'var(--jf-lavender)' }}
            >
              View full page <ArrowRight size={14} />
            </Link>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
