import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal } from '../ui/Modal';

interface SectionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export function SectionModal({ open, onClose, title, content }: SectionModalProps) {
  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content size="xl">
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
