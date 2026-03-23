/**
 * searchService.ts — Semantic search via Firebase Vector Search Extension.
 *
 * Calls the extension's callable Cloud Function to perform vector similarity search
 * on KB chunks stored in Firestore. Falls back gracefully if unavailable.
 */

import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { getApp } from 'firebase/app';
import type { SearchResult } from '@/data/types';

interface VectorSearchRequest {
  query: string;
  limit?: number;
  prefilters?: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
}

interface VectorSearchChunk {
  id: string;
  fileSlug: string;
  fileTitle: string;
  sectionHeading: string;
  headingLevel: number;
  parentHeadings: string[];
  text: string;
  entities: string[];
}

interface VectorSearchResponse {
  ids: string[];
  // The extension may return different shapes — handle both
  [key: string]: unknown;
}

// LRU cache for recent query embeddings to avoid redundant API calls
const queryCache = new Map<string, SearchResult[]>();
const CACHE_MAX = 20;

function cacheSet(key: string, value: SearchResult[]) {
  if (queryCache.size >= CACHE_MAX) {
    // Delete oldest entry
    const firstKey = queryCache.keys().next().value;
    if (firstKey !== undefined) queryCache.delete(firstKey);
  }
  queryCache.set(key, value);
}

let functionsInstance: ReturnType<typeof getFunctions> | null = null;
let initFailed = false;

function getFirebaseFunctions() {
  if (initFailed) return null;
  if (functionsInstance) return functionsInstance;
  try {
    const app = getApp();
    functionsInstance = getFunctions(app);
    return functionsInstance;
  } catch {
    initFailed = true;
    return null;
  }
}

/**
 * Perform semantic search against the KB vector index.
 * Returns results mapped to the standard SearchResult interface.
 * Returns empty array on any failure (graceful degradation).
 */
export async function semanticSearch(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  // Check cache
  const cacheKey = `${query.trim().toLowerCase()}:${limit}`;
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;

  const functions = getFirebaseFunctions();
  if (!functions) return [];

  try {
    const queryCallable = httpsCallable<VectorSearchRequest, VectorSearchResponse>(
      functions,
      'ext-firestore-vector-search-queryCallable',
    );

    const result: HttpsCallableResult<VectorSearchResponse> = await queryCallable({
      query,
      limit,
    });

    // The extension returns matched document IDs — we need to map them to SearchResult
    // The exact response shape depends on the extension version; handle the common patterns
    const data = result.data;
    const results: SearchResult[] = [];

    if (Array.isArray(data)) {
      // Extension returns array of document data directly
      for (const doc of data as VectorSearchChunk[]) {
        results.push({
          file: doc.fileSlug,
          title: doc.fileTitle,
          heading: doc.sectionHeading !== doc.fileTitle ? doc.sectionHeading : undefined,
          headingId: doc.sectionHeading !== doc.fileTitle
            ? slugify(doc.sectionHeading)
            : undefined,
          snippet: stripMarkdown(doc.text).slice(0, 150) + '...',
        });
      }
    } else if (data && typeof data === 'object' && 'ids' in data) {
      // Extension returns just IDs — we'd need to fetch docs separately
      // For now, return empty and log for debugging
      console.warn('Vector search returned IDs only — document fetch not yet implemented');
    }

    cacheSet(cacheKey, results);
    return results;
  } catch (err) {
    // Graceful degradation — log and return empty
    console.warn('Semantic search unavailable:', (err as Error).message);
    return [];
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+/gm, '')         // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\|[^\n]+\|/g, '')        // table rows
    .replace(/^[-*]\s+/gm, '')         // list items
    .replace(/^>\s+/gm, '')            // blockquotes
    .replace(/\n{2,}/g, ' ')           // collapse newlines
    .trim();
}
