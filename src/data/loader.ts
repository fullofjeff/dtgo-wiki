import type { KBFile, Heading } from './types';

// Import all .md files from knowledge-base (including subdirectories like people/)
const mdModules = import.meta.glob('/knowledge-base/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of fmMatch[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      meta[key] = value;
    }
  }

  return { meta, body: fmMatch[2] };
}

function extractHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  const regex = /^(#{1,3})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const text = match[2].trim();
    headings.push({
      level: match[1].length,
      text,
      id: slugify(text),
    });
  }
  return headings;
}

function loadFiles(): KBFile[] {
  const files: KBFile[] = [];

  for (const [path, raw] of Object.entries(mdModules)) {
    // path: /knowledge-base/mqdc.md -> slug: mqdc
    // path: /knowledge-base/people/founders.md -> slug: people/founders
    const filename = path.split('/').pop()!;
    if (filename === 'CONTRIBUTING.md' || filename === 'INTAKE.md' ||
        filename === '_registry.md' || filename === '_aliases.md') continue;

    const slug = path
      .replace(/^\/knowledge-base\//, '')
      .replace(/\.md$/, '')
      .replace(/(^|\/)_/g, '$1');
    const { meta, body } = parseFrontmatter(raw);
    const headings = extractHeadings(body);

    files.push({
      slug,
      title: meta.title || slug,
      scope: meta.scope || '',
      updated: meta.updated || '',
      sources: meta.sources || '',
      content: body,
      headings,
    });
  }

  // Sort: _index first, then alphabetical
  files.sort((a, b) => {
    if (a.slug === 'index') return -1;
    if (b.slug === 'index') return 1;
    return a.title.localeCompare(b.title);
  });

  return files;
}

export const kbFiles = loadFiles();

export function getFile(slug: string): KBFile | undefined {
  return kbFiles.find(f => f.slug === slug);
}

export function getAllFiles(): KBFile[] {
  return kbFiles;
}
