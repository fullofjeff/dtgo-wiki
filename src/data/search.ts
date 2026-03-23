import Fuse from 'fuse.js';
import { kbFiles } from './loader';
import { semanticSearch } from '@/services/searchService';
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

/** Keyword-based search via Fuse.js (synchronous) */
export function fuseSearch(query: string, limit = 20): SearchResult[] {
  if (!query.trim()) return [];

  return fuse.search(query, { limit }).map(r => ({
    file: r.item.file,
    title: r.item.title,
    heading: r.item.heading || undefined,
    headingId: r.item.headingId || undefined,
    snippet: r.item.text.slice(0, 150) + '...',
  }));
}

/**
 * Merge two ranked result lists using Reciprocal Rank Fusion (RRF).
 * score = sum of 1/(k + rank) across lists where result appears.
 * k = 60 (industry standard smoothing constant).
 */
function mergeRRF(
  fuseResults: SearchResult[],
  semanticResults: SearchResult[],
  limit: number,
): SearchResult[] {
  const K = 60;
  const scoreMap = new Map<string, { score: number; result: SearchResult }>();

  function resultKey(r: SearchResult): string {
    return `${r.file}::${r.headingId || ''}`;
  }

  for (let i = 0; i < fuseResults.length; i++) {
    const key = resultKey(fuseResults[i]);
    const entry = scoreMap.get(key) || { score: 0, result: fuseResults[i] };
    entry.score += 1 / (K + i);
    scoreMap.set(key, entry);
  }

  for (let i = 0; i < semanticResults.length; i++) {
    const key = resultKey(semanticResults[i]);
    const entry = scoreMap.get(key) || { score: 0, result: semanticResults[i] };
    entry.score += 1 / (K + i);
    // Prefer the semantic result's snippet if it exists (richer context)
    if (semanticResults[i].snippet.length > entry.result.snippet.length) {
      entry.result = { ...entry.result, snippet: semanticResults[i].snippet };
    }
    scoreMap.set(key, entry);
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(e => e.result);
}

/**
 * Hybrid search: runs Fuse.js (keyword) and semantic search (vector) in parallel,
 * then merges via Reciprocal Rank Fusion. Falls back to Fuse.js-only if semantic
 * search is unavailable.
 */
export async function search(query: string, limit = 20): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const [fuseResults, semanticResults] = await Promise.all([
    Promise.resolve(fuseSearch(query, limit)),
    semanticSearch(query, limit).catch(() => [] as SearchResult[]),
  ]);

  // If no semantic results, just return Fuse results
  if (semanticResults.length === 0) return fuseResults;

  return mergeRRF(fuseResults, semanticResults, limit);
}
