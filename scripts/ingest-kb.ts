/**
 * ingest-kb.ts — Writes KB chunks to Firestore for vector search.
 *
 * Uses Firebase Admin SDK to write to companies/dtgo/kbChunks.
 * Incremental: only writes new/changed chunks, deletes removed ones.
 * The Firebase Vector Search Extension auto-generates embeddings on write.
 *
 * Usage:
 *   npx tsx scripts/ingest-kb.ts           # incremental update
 *   npx tsx scripts/ingest-kb.ts --force   # re-write all chunks
 *   npx tsx scripts/ingest-kb.ts --dry-run # preview changes only
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var or
 * a service account JSON at scripts/service-account.json
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { chunkKnowledgeBase, type KBChunk } from './chunk-kb.js';

const COMPANY_ID = 'dtgo';
const COLLECTION_PATH = `companies/${COMPANY_ID}/kbChunks`;
const BATCH_SIZE = 500;

// Parse CLI flags
const args = process.argv.slice(2);
const forceRewrite = args.includes('--force');
const dryRun = args.includes('--dry-run');

// Initialize Firebase Admin — follows ENV_AND_API_KEYS.md protocol
// Priority: 1) GOOGLE_APPLICATION_CREDENTIALS env var, 2) ADC (gcloud auth application-default login)
function initFirebase() {
  // If GOOGLE_APPLICATION_CREDENTIALS points to a file, firebase-admin picks it up automatically.
  // Otherwise, Application Default Credentials (ADC) from gcloud CLI are used.
  // No key files stored in the project directory.
  return initializeApp({ projectId: 'phyla-digital-platform' });
}

const app = initFirebase();
const db = getFirestore(app);

async function getExistingChunks(): Promise<Map<string, string>> {
  const snapshot = await db.collection(COLLECTION_PATH).select('contentHash').get();
  const existing = new Map<string, string>();
  for (const doc of snapshot.docs) {
    existing.set(doc.id, doc.data().contentHash as string);
  }
  return existing;
}

async function ingest() {
  console.log('Chunking knowledge base...');
  const chunks = chunkKnowledgeBase();
  console.log(`  ${chunks.length} chunks generated\n`);

  console.log('Reading existing Firestore chunks...');
  const existing = await getExistingChunks();
  console.log(`  ${existing.size} chunks in Firestore\n`);

  // Determine what needs updating
  const toWrite: KBChunk[] = [];
  const toDelete: string[] = [];
  const unchanged: string[] = [];
  const newChunkIds = new Set(chunks.map(c => c.id));

  for (const chunk of chunks) {
    const existingHash = existing.get(chunk.id);
    if (!existingHash || existingHash !== chunk.contentHash || forceRewrite) {
      toWrite.push(chunk);
    } else {
      unchanged.push(chunk.id);
    }
  }

  for (const [id] of existing) {
    if (!newChunkIds.has(id)) {
      toDelete.push(id);
    }
  }

  // Report
  console.log('Changes:');
  console.log(`  ${toWrite.length} chunks to write (${toWrite.filter(c => !existing.has(c.id)).length} new, ${toWrite.filter(c => existing.has(c.id)).length} updated)`);
  console.log(`  ${toDelete.length} chunks to delete`);
  console.log(`  ${unchanged.length} unchanged\n`);

  if (dryRun) {
    if (toWrite.length > 0) {
      console.log('Would write:');
      for (const chunk of toWrite) {
        const status = existing.has(chunk.id) ? 'UPDATE' : 'NEW';
        console.log(`  [${status}] ${chunk.id} (${chunk.text.length} chars)`);
      }
    }
    if (toDelete.length > 0) {
      console.log('Would delete:');
      for (const id of toDelete) {
        console.log(`  [DELETE] ${id}`);
      }
    }
    console.log('\nDry run complete. No changes made.');
    return;
  }

  // Write in batches
  if (toWrite.length > 0) {
    console.log('Writing chunks...');
    for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchChunks = toWrite.slice(i, i + BATCH_SIZE);

      for (const chunk of batchChunks) {
        const ref = db.collection(COLLECTION_PATH).doc(chunk.id);
        batch.set(ref, {
          fileSlug: chunk.fileSlug,
          fileTitle: chunk.fileTitle,
          sectionHeading: chunk.sectionHeading,
          headingLevel: chunk.headingLevel,
          parentHeadings: chunk.parentHeadings,
          text: chunk.text,
          contentHash: chunk.contentHash,
          entities: chunk.entities,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: wrote ${batchChunks.length} chunks`);
    }
  }

  // Delete removed chunks
  if (toDelete.length > 0) {
    console.log('Deleting removed chunks...');
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchIds = toDelete.slice(i, i + BATCH_SIZE);

      for (const id of batchIds) {
        batch.delete(db.collection(COLLECTION_PATH).doc(id));
      }

      await batch.commit();
      console.log(`  Deleted ${batchIds.length} chunks`);
    }
  }

  console.log('\nIngestion complete!');
  console.log(`The Firebase Vector Search Extension will auto-generate embeddings for the ${toWrite.length} written chunks.`);
}

ingest().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
