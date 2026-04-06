/**
 * diagnose-rag.ts — Audits Firestore kbChunks collection for vector store health.
 *
 * Checks:
 *   1. Total chunks in Firestore
 *   2. Chunks WITH embedding vectors vs WITHOUT (ghost chunks)
 *   3. Cross-reference against local KB chunks (coverage gaps)
 *   4. Orphan chunks in Firestore not matching any local KB file
 *   5. Content hash mismatches (stale chunks)
 *
 * Usage:
 *   npx tsx scripts/diagnose-rag.ts
 *   npx tsx scripts/diagnose-rag.ts --output /path/to/report.md
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { chunkKnowledgeBase, type KBChunk } from './chunk-kb.js';
import fs from 'fs';
import path from 'path';

const COMPANY_ID = 'dtgo';
const COLLECTION_PATH = `companies/${COMPANY_ID}/kbChunks`;

// Parse CLI flags
const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : null;

// Initialize Firebase Admin
const app = initializeApp({ projectId: 'phyla-digital-platform' });
const db = getFirestore(app);

interface FirestoreChunkInfo {
  id: string;
  type: string;
  fileSlug: string;
  fileTitle: string;
  sectionHeading: string;
  contentHash: string;
  hasEmbedding: boolean;
  embeddingDims: number | null;
  updatedAt: string | null;
}

async function diagnose() {
  const lines: string[] = [];
  const log = (line: string = '') => {
    console.log(line);
    lines.push(line);
  };

  log('# RAG Vector Store Diagnostic Report');
  log(`**Date:** ${new Date().toISOString()}`);
  log(`**Collection:** \`${COLLECTION_PATH}\``);
  log();

  // ── Step 1: Read all Firestore chunks ──
  log('## 1. Firestore Collection Audit');
  log();

  const snapshot = await db.collection(COLLECTION_PATH).get();
  const firestoreChunks: FirestoreChunkInfo[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const embedding = data.embedding;
    const hasEmbedding = !!(embedding && typeof embedding === 'object' && 'toArray' in embedding);

    let embeddingDims: number | null = null;
    if (hasEmbedding) {
      try {
        const arr = embedding.toArray();
        embeddingDims = arr.length;
      } catch {
        embeddingDims = null;
      }
    }

    firestoreChunks.push({
      id: doc.id,
      type: data.type || 'text',
      fileSlug: data.fileSlug || '',
      fileTitle: data.fileTitle || '',
      sectionHeading: data.sectionHeading || '',
      contentHash: data.contentHash || '',
      hasEmbedding,
      embeddingDims,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    });
  }

  const textChunks = firestoreChunks.filter(c => c.type === 'text');
  const imageChunks = firestoreChunks.filter(c => c.type === 'image');
  const withEmbedding = firestoreChunks.filter(c => c.hasEmbedding);
  const withoutEmbedding = firestoreChunks.filter(c => !c.hasEmbedding);

  log(`| Metric | Count |`);
  log(`|--------|-------|`);
  log(`| Total chunks in Firestore | ${firestoreChunks.length} |`);
  log(`| Text chunks | ${textChunks.length} |`);
  log(`| Image chunks | ${imageChunks.length} |`);
  log(`| **Chunks WITH embedding** | **${withEmbedding.length}** |`);
  log(`| **Chunks WITHOUT embedding (ghost chunks)** | **${withoutEmbedding.length}** |`);
  log(`| Embedding coverage | ${firestoreChunks.length > 0 ? ((withEmbedding.length / firestoreChunks.length) * 100).toFixed(1) : 0}% |`);
  log();

  // Check embedding dimensions consistency
  const dimCounts = new Map<number, number>();
  for (const c of withEmbedding) {
    if (c.embeddingDims !== null) {
      dimCounts.set(c.embeddingDims, (dimCounts.get(c.embeddingDims) || 0) + 1);
    }
  }
  if (dimCounts.size > 1) {
    log('**WARNING: Inconsistent embedding dimensions detected:**');
    for (const [dim, count] of dimCounts) {
      log(`  - ${dim} dimensions: ${count} chunks`);
    }
    log();
  } else if (dimCounts.size === 1) {
    const [dim, count] = [...dimCounts.entries()][0];
    log(`Embedding dimensions: ${dim} (consistent across ${count} chunks)`);
    log();
  }

  // List ghost chunks
  if (withoutEmbedding.length > 0) {
    log('### Ghost Chunks (Missing Embeddings)');
    log();
    log('These chunks exist in Firestore but have NO embedding vector. They are **invisible to vector search** and represent gaps in RAG retrieval.');
    log();
    log('| Chunk ID | Type | File Slug | Section |');
    log('|----------|------|-----------|---------|');
    for (const c of withoutEmbedding) {
      log(`| \`${c.id}\` | ${c.type} | ${c.fileSlug} | ${c.sectionHeading} |`);
    }
    log();
  }

  // ── Step 2: Cross-reference against local KB ──
  log('## 2. Local KB Cross-Reference');
  log();

  let localChunks: KBChunk[];
  try {
    localChunks = chunkKnowledgeBase();
  } catch (err) {
    log(`**ERROR:** Failed to chunk local KB: ${(err as Error).message}`);
    localChunks = [];
  }

  const localChunkIds = new Set(localChunks.map(c => c.id));
  const firestoreChunkIds = new Set(firestoreChunks.map(c => c.id));
  const firestoreTextIds = new Set(textChunks.map(c => c.id));

  // Chunks in local KB but NOT in Firestore
  const missingFromFirestore = localChunks.filter(c => !firestoreChunkIds.has(c.id));

  // Chunks in Firestore but NOT in local KB (orphans — text only, images are separate)
  const orphanedInFirestore = textChunks.filter(c => !localChunkIds.has(c.id));

  // Hash mismatches (stale chunks)
  const firestoreHashMap = new Map(firestoreChunks.map(c => [c.id, c.contentHash]));
  const staleChunks = localChunks.filter(c => {
    const fsHash = firestoreHashMap.get(c.id);
    return fsHash && fsHash !== c.contentHash;
  });

  log(`| Metric | Count |`);
  log(`|--------|-------|`);
  log(`| Local KB chunks (expected) | ${localChunks.length} |`);
  log(`| Firestore text chunks (actual) | ${textChunks.length} |`);
  log(`| **Missing from Firestore** | **${missingFromFirestore.length}** |`);
  log(`| **Orphaned in Firestore** (no local match) | **${orphanedInFirestore.length}** |`);
  log(`| **Stale** (hash mismatch) | **${staleChunks.length}** |`);
  log(`| In sync | ${localChunks.length - missingFromFirestore.length - staleChunks.length} |`);
  log();

  if (missingFromFirestore.length > 0) {
    log('### Missing from Firestore');
    log();
    log('These local KB chunks have NO corresponding Firestore document. Their content is **not searchable** via RAG.');
    log();
    log('| Chunk ID | File | Section |');
    log('|----------|------|---------|');
    for (const c of missingFromFirestore) {
      log(`| \`${c.id}\` | ${c.fileSlug} | ${c.sectionHeading} |`);
    }
    log();
  }

  if (orphanedInFirestore.length > 0) {
    log('### Orphaned in Firestore');
    log();
    log('These Firestore text chunks have no matching local KB section. They may reference deleted or renamed content and should be cleaned up.');
    log();
    log('| Chunk ID | File Slug | Section |');
    log('|----------|-----------|---------|');
    for (const c of orphanedInFirestore) {
      log(`| \`${c.id}\` | ${c.fileSlug} | ${c.sectionHeading} |`);
    }
    log();
  }

  if (staleChunks.length > 0) {
    log('### Stale Chunks (Content Changed)');
    log();
    log('These chunks exist in both Firestore and local KB, but their content hashes differ. The Firestore version is outdated.');
    log();
    log('| Chunk ID | File | Section |');
    log('|----------|------|---------|');
    for (const c of staleChunks) {
      log(`| \`${c.id}\` | ${c.fileSlug} | ${c.sectionHeading} |`);
    }
    log();
  }

  // ── Step 3: File-level coverage ──
  log('## 3. File-Level Coverage');
  log();

  const localFileChunks = new Map<string, { total: number; inFirestore: number; withEmbedding: number }>();
  for (const chunk of localChunks) {
    if (!localFileChunks.has(chunk.fileSlug)) {
      localFileChunks.set(chunk.fileSlug, { total: 0, inFirestore: 0, withEmbedding: 0 });
    }
    const entry = localFileChunks.get(chunk.fileSlug)!;
    entry.total++;
    if (firestoreTextIds.has(chunk.id)) {
      entry.inFirestore++;
      const fsChunk = firestoreChunks.find(c => c.id === chunk.id);
      if (fsChunk?.hasEmbedding) {
        entry.withEmbedding++;
      }
    }
  }

  log('| File | Local Chunks | In Firestore | With Embedding | Coverage |');
  log('|------|-------------|--------------|----------------|----------|');
  for (const [file, stats] of [...localFileChunks.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const coverage = stats.total > 0 ? ((stats.withEmbedding / stats.total) * 100).toFixed(0) : '0';
    const flag = Number(coverage) < 100 ? ' **INCOMPLETE**' : '';
    log(`| ${file} | ${stats.total} | ${stats.inFirestore} | ${stats.withEmbedding} | ${coverage}%${flag} |`);
  }
  log();

  // ── Step 4: Timestamps ──
  log('## 4. Ingestion Timestamps');
  log();

  const timestamps = firestoreChunks
    .filter(c => c.updatedAt)
    .map(c => new Date(c.updatedAt!).getTime());

  if (timestamps.length > 0) {
    const oldest = new Date(Math.min(...timestamps));
    const newest = new Date(Math.max(...timestamps));
    log(`| Metric | Value |`);
    log(`|--------|-------|`);
    log(`| Oldest chunk update | ${oldest.toISOString()} |`);
    log(`| Newest chunk update | ${newest.toISOString()} |`);
    log(`| Time span | ${Math.round((newest.getTime() - oldest.getTime()) / (1000 * 60))} minutes |`);
  } else {
    log('No timestamp data available.');
  }
  log();

  // ── Summary ──
  log('## 5. Summary & Recommendations');
  log();

  const issues: string[] = [];
  if (withoutEmbedding.length > 0) {
    issues.push(`**${withoutEmbedding.length} ghost chunks** without embeddings — invisible to RAG search. Run \`npx tsx scripts/ingest-kb.ts --force\` after fixing embedding pipeline to re-embed.`);
  }
  if (missingFromFirestore.length > 0) {
    issues.push(`**${missingFromFirestore.length} local chunks missing** from Firestore — content not searchable. Run \`npm run ingest\` to sync.`);
  }
  if (orphanedInFirestore.length > 0) {
    issues.push(`**${orphanedInFirestore.length} orphaned chunks** in Firestore — stale data from deleted/renamed content. Run \`npm run ingest\` to clean up.`);
  }
  if (staleChunks.length > 0) {
    issues.push(`**${staleChunks.length} stale chunks** with outdated content — embeddings don't match current KB. Run \`npm run ingest\` to update.`);
  }

  if (issues.length === 0) {
    log('**All clear.** Vector store is healthy — all local KB chunks are in Firestore with embeddings.');
  } else {
    log(`**${issues.length} issue(s) found:**`);
    log();
    for (const issue of issues) {
      log(`- ${issue}`);
    }
  }

  // Write output file
  if (outputPath) {
    fs.writeFileSync(outputPath, lines.join('\n'));
    console.log(`\nReport written to: ${outputPath}`);
  }
}

diagnose().catch((err) => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
