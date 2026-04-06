import { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { SectionModal } from './SectionModal';
import { PersonModal } from './PersonModal';
import { EntityModal } from './EntityModal';
import { SourceModal } from './SourceModal';
import { FormSection } from '@/components/ui/FormSection';
import { getPersonNames, getPersonRecord } from '@/data/personIndex';
import { getEntityNames, getEntityRecord } from '@/data/entityIndex';
import remarkEntityLinks from '@/data/remarkEntityLinks';
import type { PersonRecord, EntityRecord } from '@/data/types';

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

/** H1 sections whose h2 children should render as collapsible FormSections */
const FORM_SECTION_PARENTS = new Set([
  'IP Portfolio',
  'Subsidiaries & Internal Units',
  'Residential Brands',
  'The Forestias',
]);

/** H2 FormSections whose h3 children should render as nested collapsible FormSections */
const NESTED_FORM_SECTIONS = new Set([
  'Residential Brands',
  'Hapitat',
]);

type ContentSegment =
  | { type: 'markdown'; content: string }
  | { type: 'formSection'; title: string; description: string; body: string };

/** Split a FormSection body into sub-segments, extracting H3s as nested FormSections */
function splitH3Segments(body: string): ContentSegment[] {
  const lines = body.split('\n');
  const segments: ContentSegment[] = [];
  let currentLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const h3Match = lines[i].match(/^###\s+(.+)$/);
    if (h3Match) {
      if (currentLines.length > 0) {
        const content = currentLines.join('\n').trim();
        if (content) segments.push({ type: 'markdown', content });
        currentLines = [];
      }

      const title = h3Match[1].trim();
      const sectionBody = extractSection(body, title, 3);

      const bodyLines = sectionBody.split('\n');
      let description = '';
      let bodyContent = sectionBody;
      if (bodyLines[0] && /^`[^`]+`/.test(bodyLines[0])) {
        description = bodyLines[0].replace(/`/g, '').trim();
        bodyContent = bodyLines.slice(2).join('\n').trim();
      }

      segments.push({ type: 'formSection', title, description, body: bodyContent });

      i++;
      while (i < lines.length) {
        const nextH = lines[i].match(/^(#{1,3})\s/);
        if (nextH && nextH[1].length <= 3) break;
        i++;
      }
    } else {
      currentLines.push(lines[i]);
      i++;
    }
  }

  if (currentLines.length > 0) {
    const content = currentLines.join('\n').trim();
    if (content) segments.push({ type: 'markdown', content });
  }

  return segments;
}

/** Split markdown into renderable segments, extracting FormSection blocks */
function splitIntoSegments(md: string, initialH1 = ''): ContentSegment[] {
  const lines = md.split('\n');
  const segments: ContentSegment[] = [];
  let currentLines: string[] = [];
  let currentH1 = initialH1;

  let i = 0;
  while (i < lines.length) {
    const h1Match = lines[i].match(/^#\s+(.+)$/);
    if (h1Match) {
      currentH1 = h1Match[1].trim();
      currentLines.push(lines[i]);
      i++;
      continue;
    }

    const h2Match = lines[i].match(/^##\s+(.+)$/);
    if (h2Match && FORM_SECTION_PARENTS.has(currentH1)) {
      // Flush accumulated markdown
      if (currentLines.length > 0) {
        const content = currentLines.join('\n').trim();
        if (content) segments.push({ type: 'markdown', content });
        currentLines = [];
      }

      const title = h2Match[1].trim();
      const sectionBody = extractSection(md, title, 2);

      // Extract inline badge description from first line (e.g. `180+ Countries` · `35+ Languages`)
      const bodyLines = sectionBody.split('\n');
      let description = '';
      let bodyContent = sectionBody;
      if (bodyLines[0] && /^`[^`]+`/.test(bodyLines[0])) {
        description = bodyLines[0].replace(/`/g, '').trim();
        bodyContent = bodyLines.slice(2).join('\n').trim(); // skip badge line + blank line
      }

      segments.push({ type: 'formSection', title, description, body: bodyContent });

      // Skip past this h2 section in the source lines
      i++;
      while (i < lines.length) {
        const nextH = lines[i].match(/^(#{1,2})\s/);
        if (nextH && nextH[1].length <= 2) break;
        i++;
      }
    } else {
      currentLines.push(lines[i]);
      i++;
    }
  }

  // Flush remaining
  if (currentLines.length > 0) {
    const content = currentLines.join('\n').trim();
    if (content) segments.push({ type: 'markdown', content });
  }

  return segments;
}


export function MarkdownRenderer({ content, fileSlug, parentH1 }: { content: string; fileSlug?: string; parentH1?: string }) {
  const [sectionModal, setSectionModal] = useState<{ title: string; body: string } | null>(null);
  const [personModal, setPersonModal] = useState<PersonRecord | null>(null);
  const [entityModal, setEntityModal] = useState<EntityRecord | null>(null);
  const [sourceModalPrefix, setSourceModalPrefix] = useState<string | null>(null);
  const [openNested, setOpenBrands] = useState<Set<string>>(new Set());
  const personNameSet = useMemo(() => new Set(getPersonNames()), []);
  const entityNameSet = useMemo(() => new Set(getEntityNames()), []);

  // Unified name→type map for the remark AST scanner
  const nameTypeMap = useMemo(() => {
    const map = new Map<string, 'person' | 'entity'>();
    for (const name of getPersonNames()) map.set(name, 'person');
    for (const name of getEntityNames()) map.set(name, 'entity');
    return map;
  }, []);

  const segments = useMemo(() => splitIntoSegments(content, parentH1), [content, parentH1]);

  // Single delegated click handler — no onClick on individual elements
  const handleProseClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't interfere with text selection
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;

    const target = e.target as HTMLElement;

    // Check if clicked a person link
    const personLink = target.closest('.person-link') as HTMLElement | null;
    if (personLink) {
      const name = personLink.textContent || '';
      const record = getPersonRecord(name);
      if (record) setPersonModal(record);
      return;
    }

    // Check if clicked an entity link
    const entityLink = target.closest('.entity-link') as HTMLElement | null;
    if (entityLink) {
      const name = entityLink.textContent || '';
      const record = getEntityRecord(name);
      if (record) setEntityModal(record);
      return;
    }

    // Check if clicked an intake source line
    const sourceLine = target.closest('.intake-source-line') as HTMLElement | null;
    if (sourceLine) {
      const prefix = sourceLine.dataset.intakePrefix;
      if (prefix) setSourceModalPrefix(prefix);
      return;
    }

    // Check if clicked a heading (h2 or h3)
    const heading = target.closest('h2, h3') as HTMLElement | null;
    if (heading) {
      const level = heading.tagName === 'H2' ? 2 : 3;
      const text = heading.textContent || '';
      const body = extractSection(content, text, level);
      if (body && body.length > 0) setSectionModal({ title: text, body });
      return;
    }
  }, [content]);

  const components: Components = {
    h1: ({ children }) => <h1 id={slugify(textContent(children))}>{children}</h1>,

    h2: ({ children }) => (
      <h2
        id={slugify(textContent(children))}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3
        id={slugify(textContent(children))}
        style={{ cursor: 'pointer', fontWeight: 700 }}
      >
        {children}
      </h3>
    ),

    strong: ({ children, className, ...rest }) => {
      // Plugin-injected nodes arrive with className already set via hProperties
      if (className === 'person-link' || className === 'entity-link') {
        return <strong className={className}>{children}</strong>;
      }
      // Legacy: manually bolded names still get detected
      const text = textContent(children);
      if (personNameSet.has(text)) {
        return <strong className="person-link">{children}</strong>;
      }
      if (entityNameSet.has(text)) {
        return <strong className="entity-link">{children}</strong>;
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
            data-intake-prefix={prefix}
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

  const processedContent = (md: string) =>
    md.replace(/\[intake:([a-f0-9]+)\]/g, '[](intake-source:$1)');

  return (
    <>
      {/* Single delegated click handler on wrapper — no onClick on child elements */}
      <div onClick={handleProseClick}>
        {segments.map((seg, i) => {
          if (seg.type === 'formSection') {
            const nested = NESTED_FORM_SECTIONS.has(seg.title) ? splitH3Segments(seg.body) : null;

            if (nested) {
              const brandTitles = nested.filter(s => s.type === 'formSection').map(s => (s as { title: string }).title);
              const brandComponents: Components = {
                ...components,
                td: ({ children }) => {
                  const text = textContent(children);
                  const match = brandTitles.find(t => text.startsWith(t));
                  if (match) {
                    const slug = slugify(match);
                    return (
                      <td
                        style={{ cursor: 'pointer', color: 'var(--jf-lavender)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenBrands(prev => new Set(prev).add(slug));
                          setTimeout(() => {
                            document.getElementById(`nested-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        }}
                      >
                        {children}
                      </td>
                    );
                  }
                  return <td>{children}</td>;
                },
              };

              return (
                <FormSection key={i} title={seg.title} description={seg.description} onEdit={fileSlug ? () => setSectionModal({ title: seg.title, body: seg.body }) : undefined}>
                  {nested.map((sub, j) => {
                    if (sub.type === 'formSection') {
                      const slug = slugify(sub.title);
                      return (
                        <div key={j} id={`nested-${slug}`}>
                          <FormSection
                            title={sub.title}
                            description={sub.description}
                            open={openNested.has(slug)}
                            onToggle={(isOpen) => {
                              setOpenBrands(prev => {
                                const next = new Set(prev);
                                if (isOpen) next.add(slug); else next.delete(slug);
                                return next;
                              });
                            }}
                            onEdit={fileSlug ? () => setSectionModal({ title: sub.title, body: sub.body }) : undefined}
                          >
                            <div className="prose">
                              <ReactMarkdown remarkPlugins={[remarkGfm, [remarkEntityLinks, { names: nameTypeMap }]]} components={components}>
                                {processedContent(sub.body)}
                              </ReactMarkdown>
                            </div>
                          </FormSection>
                        </div>
                      );
                    }
                    return (
                      <div key={j} className="prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm, [remarkEntityLinks, { names: nameTypeMap }]]} components={components}>
                          {processedContent(sub.content)}
                        </ReactMarkdown>
                      </div>
                    );
                  })}
                </FormSection>
              );
            }

            return (
              <FormSection key={i} title={seg.title} description={seg.description} onEdit={fileSlug ? () => setSectionModal({ title: seg.title, body: seg.body }) : undefined}>
                <div className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm, [remarkEntityLinks, { names: nameTypeMap }]]} components={components}>
                    {processedContent(seg.body)}
                  </ReactMarkdown>
                </div>
              </FormSection>
            );
          }
          return (
            <ReactMarkdown key={i} remarkPlugins={[remarkGfm, [remarkEntityLinks, { names: nameTypeMap }]]} components={components}>
              {processedContent(seg.content)}
            </ReactMarkdown>
          );
        })}
      </div>

      <SectionModal
        open={sectionModal !== null}
        onClose={() => setSectionModal(null)}
        title={sectionModal?.title ?? ''}
        content={sectionModal?.body ?? ''}
        fileSlug={fileSlug}
      />

      <PersonModal
        open={personModal !== null}
        onClose={() => setPersonModal(null)}
        person={personModal}
      />

      <EntityModal
        open={entityModal !== null}
        onClose={() => setEntityModal(null)}
        entity={entityModal}
      />

      <SourceModal
        open={sourceModalPrefix !== null}
        onClose={() => setSourceModalPrefix(null)}
        sessionIdPrefix={sourceModalPrefix ?? ''}
      />
    </>
  );
}
