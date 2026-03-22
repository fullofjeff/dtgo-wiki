import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { SectionModal } from './SectionModal';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

/** Get plain text from any React children tree */
function textContent(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (typeof node === 'object' && node !== null && 'props' in node) {
    return textContent((node as { props: { children?: unknown } }).props.children);
  }
  return '';
}

/** Extract everything under a heading until the next heading of same/higher level */
function extractSection(md: string, heading: string, level: number): string {
  const lines = md.split('\n');
  let capturing = false;
  const out: string[] = [];

  for (const line of lines) {
    if (capturing) {
      const m = line.match(/^(#{1,6})\s/);
      if (m && m[1].length <= level) break;
      out.push(line);
    } else {
      const m = line.match(/^(#{1,6})\s+(.+)$/);
      if (m && m[1].length === level && m[2].trim() === heading) {
        capturing = true;
      }
    }
  }

  return out.join('\n').trim();
}

export function MarkdownRenderer({ content }: { content: string }) {
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);

  function handleClick(children: unknown, level: number) {
    const text = textContent(children);
    const body = extractSection(content, text, level);
    if (body) {
      setModal({ title: text, body });
    }
  }

  const components: Components = {
    h1: ({ children }) => <h1 id={slugify(textContent(children))}>{children}</h1>,

    h2: ({ children }) => (
      <h2
        id={slugify(textContent(children))}
        onClick={() => handleClick(children, 2)}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3
        id={slugify(textContent(children))}
        onClick={() => handleClick(children, 3)}
        style={{ cursor: 'pointer', fontWeight: 700 }}
      >
        {children}
      </h3>
    ),
  };

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>

      <SectionModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.title ?? ''}
        content={modal?.body ?? ''}
      />
    </>
  );
}
