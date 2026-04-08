/**
 * MCP Server for the DTGO Wiki Knowledge Base.
 *
 * Wraps the existing RAG retriever (Firestore vector search + Gemini embeddings)
 * as MCP tools so Claude Desktop / Cowork can query the KB semantically.
 *
 * Usage:
 *   GEMINI_API_KEY=<key> npx tsx mcp-server/index.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, readdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

import { findRelevantChunks, formatChunksAsContext } from '../scripts/rag-retriever.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, '..', 'knowledge-base');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ── Helpers ────────────────────────────────────────────────────────────

/** Recursively collect .md files from the KB, skipping metadata & inbox */
function listKBFiles(dir: string, root = dir): { slug: string; title: string; path: string }[] {
  const results: { slug: string; title: string; path: string }[] = [];
  const SKIP = ['_inbox', 'data'];
  const SKIP_FILES = ['CONTRIBUTING.md', 'INTAKE.md'];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP.includes(entry.name)) continue;
      results.push(...listKBFiles(join(dir, entry.name), root));
    } else if (entry.name.endsWith('.md') && !SKIP_FILES.includes(entry.name)) {
      const fullPath = join(dir, entry.name);
      const slug = relative(root, fullPath).replace(/\.md$/, '');
      const raw = readFileSync(fullPath, 'utf-8');
      const { data } = matter(raw);
      results.push({ slug, title: data.title || slug, path: fullPath });
    }
  }
  return results;
}

// ── Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'dtgo-wiki',
  version: '1.0.0',
});

// Tool 1: Semantic search over the knowledge base
server.tool(
  'search_knowledge_base',
  'Search the DTGO Corporation knowledge base using semantic (vector) search. Returns the most relevant sections across all documents.',
  {
    query: z.string().describe('The search query — a question or topic to find relevant KB sections for'),
    limit: z.number().optional().default(12).describe('Number of results to return (default 12)'),
  },
  async ({ query, limit }) => {
    if (!GEMINI_API_KEY) {
      return { content: [{ type: 'text' as const, text: 'Error: GEMINI_API_KEY is not set. Semantic search requires the Gemini API for query embedding.' }] };
    }

    const chunks = await findRelevantChunks(query, GEMINI_API_KEY, limit);

    if (!chunks || chunks.length === 0) {
      return { content: [{ type: 'text' as const, text: 'No relevant results found. The RAG pipeline may be unavailable or the query did not match any chunks.' }] };
    }

    const formatted = formatChunksAsContext(chunks);
    const summary = `Found ${chunks.length} relevant section(s) from: ${[...new Set(chunks.map(c => c.fileTitle))].join(', ')}`;

    return {
      content: [{ type: 'text' as const, text: `${summary}\n\n${formatted}` }],
    };
  },
);

// Tool 2: List all documents in the knowledge base
server.tool(
  'list_documents',
  'List all documents in the DTGO knowledge base with their titles and slugs.',
  {},
  async () => {
    const files = listKBFiles(KB_DIR);
    const listing = files
      .map(f => `- **${f.title}** (${f.slug})`)
      .join('\n');

    return {
      content: [{ type: 'text' as const, text: `${files.length} documents in the DTGO knowledge base:\n\n${listing}` }],
    };
  },
);

// Tool 3: Read a full document by slug
server.tool(
  'read_document',
  'Read the full content of a specific DTGO knowledge base document by its slug (e.g. "forestias", "people/founders", "mqdc").',
  {
    slug: z.string().describe('Document slug — e.g. "forestias", "people/founders", "tnb"'),
  },
  async ({ slug }) => {
    const filePath = join(KB_DIR, `${slug}.md`);

    try {
      const raw = readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);
      const header = data.title ? `# ${data.title}\n\n` : '';
      return {
        content: [{ type: 'text' as const, text: `${header}${content.trim()}` }],
      };
    } catch {
      const files = listKBFiles(KB_DIR);
      const available = files.map(f => f.slug).join(', ');
      return {
        content: [{ type: 'text' as const, text: `Document "${slug}" not found. Available documents: ${available}` }],
      };
    }
  },
);

// ── Start ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[dtgo-wiki MCP] Server running on stdio');
}

main().catch((err) => {
  console.error('[dtgo-wiki MCP] Fatal error:', err);
  process.exit(1);
});
