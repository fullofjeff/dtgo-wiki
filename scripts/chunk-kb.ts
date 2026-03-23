/**
 * chunk-kb.ts — Parses knowledge-base markdown files into chunks for vector embedding.
 *
 * Each ## section becomes one chunk. File preamble (before first ##) is also a chunk.
 * Very short chunks (< 50 chars of content) are merged with the next sibling.
 * Each chunk carries metadata: fileSlug, fileTitle, sectionHeading, parentHeadings, contentHash.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';

const KB_ROOT = path.resolve(import.meta.dirname, '../../knowledge-base');

// Files to skip — they're metadata, not content
const SKIP_FILES = new Set([
  'CONTRIBUTING.md',
  'INTAKE.md',
  '_registry.md',
  '_aliases.md',
]);

export interface KBChunk {
  id: string;
  fileSlug: string;
  fileTitle: string;
  sectionHeading: string;
  headingLevel: number;
  parentHeadings: string[];
  text: string;
  contentHash: string;
  entities: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** Recursively find all .md files under a directory */
function findMarkdownFiles(dir: string, prefix = ''): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // Skip _inbox and data directories
      if (entry.name === '_inbox' || entry.name === 'data') continue;
      results.push(...findMarkdownFiles(path.join(dir, entry.name), relPath));
    } else if (entry.name.endsWith('.md') && !SKIP_FILES.has(entry.name)) {
      results.push(relPath);
    }
  }
  return results;
}

/** Parse frontmatter entities field (YAML array or comma-separated string) */
function parseEntities(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    // Handle YAML inline array: ["A", "B"] or comma-separated
    const cleaned = raw.replace(/^\[|\]$/g, '');
    return cleaned.split(',').map(s => s.replace(/^["'\s]+|["'\s]+$/g, '').trim()).filter(Boolean);
  }
  return [];
}

/**
 * Split markdown body into sections at ## boundaries.
 * Returns array of { heading, headingLevel, text, parentHeadings }.
 */
function splitIntoSections(body: string, fileTitle: string) {
  const lines = body.split('\n');
  const sections: Array<{
    heading: string;
    headingLevel: number;
    text: string;
    parentHeadings: string[];
  }> = [];

  let currentHeading = fileTitle;
  let currentLevel = 1;
  let currentLines: string[] = [];
  const headingStack: string[] = []; // tracks ## ancestors for breadcrumb

  function flushSection() {
    const text = currentLines.join('\n').trim();
    if (text.length > 0) {
      sections.push({
        heading: currentHeading,
        headingLevel: currentLevel,
        text,
        parentHeadings: [...headingStack],
      });
    }
    currentLines = [];
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();

      if (level <= 2) {
        // ## heading — start a new chunk
        flushSection();

        // Update heading stack for breadcrumb
        while (headingStack.length > 0 && headingStack.length >= level - 1) {
          headingStack.pop();
        }
        if (level === 2) {
          // Don't add current heading to its own parent list
        }

        currentHeading = headingText;
        currentLevel = level;
        currentLines = [line];
      } else {
        // ### heading — include in current chunk
        currentLines.push(line);
      }
    } else {
      currentLines.push(line);
    }
  }

  // Flush remaining content
  flushSection();

  return sections;
}

/** Chunk all knowledge-base files */
export function chunkKnowledgeBase(): KBChunk[] {
  const files = findMarkdownFiles(KB_ROOT);
  const chunks: KBChunk[] = [];

  for (const relPath of files) {
    const fullPath = path.join(KB_ROOT, relPath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data: frontmatter, content: body } = matter(raw);

    // Derive file slug (e.g., "forestias", "people/founders")
    const fileSlug = relPath.replace(/\.md$/, '').replace(/(^|\/)_/g, '$1');
    const fileTitle = (frontmatter.title as string) || fileSlug;
    const entities = parseEntities(frontmatter.entities);

    const sections = splitIntoSections(body, fileTitle);

    // Track IDs to avoid duplicates (e.g., files with multiple # headings)
    const usedIds = new Set<string>();

    for (const section of sections) {
      let chunkId = section.headingLevel === 1
        ? fileSlug.replace(/\//g, '__')
        : `${fileSlug.replace(/\//g, '__')}__${slugify(section.heading)}`;

      // Deduplicate IDs
      if (usedIds.has(chunkId)) {
        let suffix = 2;
        while (usedIds.has(`${chunkId}-${suffix}`)) suffix++;
        chunkId = `${chunkId}-${suffix}`;
      }
      usedIds.add(chunkId);

      // Prefix chunk text with breadcrumb context for better embedding
      const contextPrefix = section.parentHeadings.length > 0
        ? `${section.parentHeadings.join(' > ')} > ${section.heading}\n\n`
        : section.headingLevel > 1
          ? `${fileTitle} > ${section.heading}\n\n`
          : '';

      const fullText = contextPrefix + section.text;

      chunks.push({
        id: chunkId,
        fileSlug,
        fileTitle,
        sectionHeading: section.heading,
        headingLevel: section.headingLevel,
        parentHeadings: section.headingLevel > 1
          ? [fileTitle, ...section.parentHeadings]
          : section.parentHeadings,
        text: fullText,
        contentHash: sha256(fullText),
        entities,
      });
    }
  }

  // Merge very short chunks (< 80 chars of actual content) with next sibling
  const merged: KBChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const contentLength = chunk.text.replace(/^[#\s>|`*\-]+/gm, '').trim().length;

    if (contentLength < 80 && i + 1 < chunks.length && chunks[i + 1].fileSlug === chunk.fileSlug) {
      // Merge into next chunk
      chunks[i + 1].text = chunk.text + '\n\n' + chunks[i + 1].text;
      chunks[i + 1].contentHash = sha256(chunks[i + 1].text);
    } else {
      merged.push(chunk);
    }
  }

  return merged;
}

// CLI entry point
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*\//, ''))) {
  const chunks = chunkKnowledgeBase();
  console.log(`Chunked ${chunks.length} sections from knowledge base\n`);
  for (const chunk of chunks) {
    const preview = chunk.text.slice(0, 60).replace(/\n/g, ' ');
    console.log(`  ${chunk.id} (${chunk.text.length} chars) — ${preview}...`);
  }
}
