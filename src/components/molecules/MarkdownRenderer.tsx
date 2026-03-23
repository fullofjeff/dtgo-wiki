import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { SectionModal } from './SectionModal';
import { PersonModal } from './PersonModal';
import { SourceModal } from './SourceModal';
import { getPersonNames, getPersonRecord } from '@/data/personIndex';
import type { PersonRecord } from '@/data/types';

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
  const [sectionModal, setSectionModal] = useState<{ title: string; body: string } | null>(null);
  const [personModal, setPersonModal] = useState<PersonRecord | null>(null);
  const [sourceModalPrefix, setSourceModalPrefix] = useState<string | null>(null);
  const personNameSet = useMemo(() => new Set(getPersonNames()), []);

  function handleClick(children: unknown, level: number) {
    const text = textContent(children);
    const body = extractSection(content, text, level);
    if (body) {
      setSectionModal({ title: text, body });
    }
  }

  function handlePersonClick(name: string) {
    const record = getPersonRecord(name);
    if (record) {
      setPersonModal(record);
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

    strong: ({ children }) => {
      const text = textContent(children);
      if (personNameSet.has(text)) {
        return (
          <strong
            onClick={(e) => {
              e.stopPropagation();
              handlePersonClick(text);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePersonClick(text); }}
            className="person-link"
            role="button"
            tabIndex={0}
          >
            {children}
          </strong>
        );
      }
      return <strong>{children}</strong>;
    },

    // Hide [intake:xxx] link text but make parent Sources line clickable via p override
    a: ({ href, children }) => {
      if (href?.startsWith('intake-source:')) {
        return null; // Hidden — the p component handles the click
      }
      return <a href={href}>{children}</a>;
    },

    // Make Sources paragraphs with intake tags clickable on hover
    p: ({ children }) => {
      const text = textContent(children);
      const intakeMatch = text.match(/\[intake:([a-f0-9]+)\]/);
      if (intakeMatch) {
        const prefix = intakeMatch[1];
        return (
          <p
            role="button"
            tabIndex={0}
            onClick={() => setSourceModalPrefix(prefix)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSourceModalPrefix(prefix); }}
            style={{ cursor: 'pointer', transition: 'color 0.15s' }}
            className="intake-source-line"
            title="Click to view original source"
          >
            {children}
          </p>
        );
      }
      return <p>{children}</p>;
    },
  };

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content.replace(/\[intake:([a-f0-9]+)\]/g, '[](intake-source:$1)')}
      </ReactMarkdown>

      <SectionModal
        open={sectionModal !== null}
        onClose={() => setSectionModal(null)}
        title={sectionModal?.title ?? ''}
        content={sectionModal?.body ?? ''}
      />

      <PersonModal
        open={personModal !== null}
        onClose={() => setPersonModal(null)}
        person={personModal}
      />

      <SourceModal
        open={sourceModalPrefix !== null}
        onClose={() => setSourceModalPrefix(null)}
        sessionIdPrefix={sourceModalPrefix ?? ''}
      />
    </>
  );
}
