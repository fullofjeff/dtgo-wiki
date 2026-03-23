# RAG / Embeddings — DTGO Wiki

## What's in the RAG

Only validated content from `knowledge-base/` — DTGO companies, people, projects, history, and partnerships. 58 chunks total, each a `##` section with breadcrumb context. Nothing else.

Stored in Firestore: `companies/dtgo/kbChunks`
Embedded by Firebase Vector Search Extension (Gemini, 768 dimensions, COSINE distance)

## What was built

**Chunking** — `scripts/chunk-kb.ts`
Splits `knowledge-base/` markdown files into section-based chunks at `##` boundaries. Each chunk carries file slug, section heading, parent breadcrumbs, entities from frontmatter, and a SHA-256 content hash for change detection. Short sections (<80 chars) are merged with the next sibling.

**Ingestion** — `scripts/ingest-kb.ts`
Writes chunks to Firestore at `companies/dtgo/kbChunks`. Incremental — compares content hashes against what's already in Firestore, only writes new/changed chunks, deletes removed ones. The Firebase Vector Search Extension auto-generates embeddings on each write.

**RAG retriever** — `scripts/rag-retriever.ts`
Server-side module used by the Vite intake plugin. Embeds a query via Gemini API, then runs `findNearest()` against Firestore to get the most relevant KB sections.

**Semantic search service** — `src/services/searchService.ts`
Client-side module that calls the extension's callable Cloud Function for vector search from the browser.

**Hybrid search** — `src/data/search.ts`
Runs Fuse.js (keyword) and semantic search in parallel, merges results via Reciprocal Rank Fusion (k=60). Falls back to keyword-only if semantic search is unavailable.

**Updated UI** — `src/components/pages/SearchPage.tsx`, `src/components/layout/SearchBar.tsx`
Both now async with loading states. SearchBar has 300ms debounce.

## How intake uses RAG

When source text is submitted to `/api/intake`:

1. Source text is embedded via Gemini API
2. `findNearest()` retrieves the top 12 most relevant KB chunks from Firestore
3. Those chunks + `_registry.md` + `_aliases.md` are sent as context to the LLM
4. LLM proposes changes to specific markdown files/sections
5. User reviews and approves each proposed change
6. Approved changes are written to the markdown files
7. `npm run ingest` re-indexes when the user decides the KB is ready

If RAG is unavailable (no Gemini key, Firestore down), falls back to the original full master index approach.

## Commands

```
npm run chunks       # Preview chunking output (no writes)
npm run ingest:dry   # Preview what would change in Firestore
npm run ingest       # Write chunks to Firestore (extension auto-embeds)
```

## Data flow

```
knowledge-base/*.md
        |
   chunk-kb.ts (split at ## boundaries, add breadcrumbs, hash)
        |
   ingest-kb.ts (incremental write to Firestore)
        |
   companies/dtgo/kbChunks (Firestore)
        |
   Vector Search Extension (auto-embeds via Gemini, 768 dims)
        |
   findNearest() queries from intake plugin or search UI
```

## Intake flow

```
Raw source text
        |
   Gemini embed query
        |
   findNearest() → top 12 relevant KB chunks
        |
   chunks + _registry.md + _aliases.md → LLM
        |
   LLM proposes changes
        |
   User approves/rejects each change
        |
   Approved → written to knowledge-base/*.md
        |
   npm run ingest (manual, when ready) → re-index
```

## File paths

| File | Purpose |
|------|---------|
| `scripts/chunk-kb.ts` | Markdown to chunks |
| `scripts/ingest-kb.ts` | Chunks to Firestore |
| `scripts/rag-retriever.ts` | Query embedding + findNearest |
| `src/services/searchService.ts` | Client-side semantic search |
| `src/data/search.ts` | Hybrid search (Fuse.js + semantic + RRF) |
| `src/components/pages/SearchPage.tsx` | Async search UI |
| `src/components/layout/SearchBar.tsx` | Async search bar with debounce |
| `vite.config.ts` | Intake plugin with RAG retrieval |

## Current status

- 58 chunks from knowledge-base embedded in Firestore
- Vector index READY (768 dims, COSINE)
- Extension active (embedOnWrite, queryCallable)
- RAG query working end-to-end
- Hybrid search wired up (Fuse.js + semantic)
- Intake plugin uses RAG with fallback to full master index

## Firestore scope

All RAG data lives under `companies/dtgo/kbChunks`. Does not touch `orgEntities`, `timelineEvents`, or any other collection. The ingest script reads only from `knowledge-base/` on disk.
