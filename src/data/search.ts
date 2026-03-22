import Fuse from 'fuse.js';
import { kbFiles } from './loader';
import type { SearchResult } from './types';

interface SearchEntry {
  file: string;
  title: string;
  heading: string;
  headingId: string;
  text: string;
}

// Build search index from all headings + file content
function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const file of kbFiles) {
    // File-level entry
    entries.push({
      file: file.slug,
      title: file.title,
      heading: '',
      headingId: '',
      text: file.scope + ' ' + file.content.slice(0, 500),
    });

    // Per-heading entries
    for (const h of file.headings) {
      // Get the text under this heading (up to next heading of same or higher level)
      const headingRegex = new RegExp(
        `^#{${h.level}}\\s+${h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([\\s\\S]*?)(?=^#{1,${h.level}}\\s|$)`,
        'm'
      );
      const match = file.content.match(headingRegex);
      const sectionText = match ? match[1].slice(0, 300) : '';

      entries.push({
        file: file.slug,
        title: file.title,
        heading: h.text,
        headingId: h.id,
        text: h.text + ' ' + sectionText,
      });
    }
  }

  return entries;
}

const searchEntries = buildIndex();

const fuse = new Fuse(searchEntries, {
  keys: [
    { name: 'heading', weight: 3 },
    { name: 'text', weight: 1 },
    { name: 'title', weight: 2 },
  ],
  threshold: 0.35,
  includeScore: true,
  minMatchCharLength: 2,
});

export function search(query: string, limit = 20): SearchResult[] {
  if (!query.trim()) return [];

  return fuse.search(query, { limit }).map(r => ({
    file: r.item.file,
    title: r.item.title,
    heading: r.item.heading || undefined,
    headingId: r.item.headingId || undefined,
    snippet: r.item.text.slice(0, 150) + '...',
  }));
}
