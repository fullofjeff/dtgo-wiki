/**
 * ingest-kb.ts — Writes KB chunks to Firestore with manual Gemini embeddings.
 *
 * Uses Firebase Admin SDK to write to companies/dtgo/kbChunks.
 * Generates embeddings manually via Gemini Embedding API for both text
 * and image chunks. Supports multimodal RAG — images from PDFs are
 * embedded alongside text in the same vector space.
 *
 * Usage:
 *   npx tsx scripts/ingest-kb.ts           # incremental update
 *   npx tsx scripts/ingest-kb.ts --force   # re-write all chunks
 *   npx tsx scripts/ingest-kb.ts --dry-run # preview changes only
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var or ADC (gcloud auth application-default login)
 *   - GEMINI_API_KEY env var (for embedding generation)
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { chunkKnowledgeBase, type KBChunk } from './chunk-kb.js';

const COMPANY_ID = 'dtgo';
const COLLECTION_PATH = `companies/${COMPANY_ID}/kbChunks`;
const BATCH_SIZE = 500;
const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
const EMBEDDING_DIMS = 768;
const EMBEDDING_BATCH_DELAY_MS = 200; // Rate limit: delay between embedding batches

// Parse CLI flags
const args = process.argv.slice(2);
const forceRewrite = args.includes('--force');
const dryRun = args.includes('--dry-run');

// Load Gemini API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Initialize Firebase Admin — follows ENV_AND_API_KEYS.md protocol
function initFirebase() {
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

const EMBEDDING_MAX_RETRIES = 3;
const EMBEDDING_RETRY_BASE_MS = 1000;

/** Embed text using Gemini Embedding API with retry + exponential backoff */
async function embedText(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) {
    console.warn('[ingest] No GEMINI_API_KEY — skipping embedding');
    return null;
  }

  for (let attempt = 0; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIMS,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        return data.embedding?.values || null;
      }

      const errText = await res.text();
      const isRetryable = res.status === 429 || res.status >= 500;

      if (isRetryable && attempt < EMBEDDING_MAX_RETRIES) {
        const retryAfter = res.headers.get('retry-after');
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : EMBEDDING_RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`[ingest] Embedding failed (${res.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${EMBEDDING_MAX_RETRIES})`);
        await sleep(delayMs);
        continue;
      }

      console.warn(`[ingest] Embedding failed (${res.status}):`, errText);
      return null;
    } catch (err) {
      if (attempt < EMBEDDING_MAX_RETRIES) {
        const delayMs = EMBEDDING_RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`[ingest] Embedding error: ${(err as Error).message}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${EMBEDDING_MAX_RETRIES})`);
        await sleep(delayMs);
        continue;
      }
      console.warn('[ingest] Embedding error (all retries exhausted):', (err as Error).message);
      return null;
    }
  }
  return null;
}

/** Embed an image using Gemini Embedding API with retry + exponential backoff */
async function embedImage(base64Data: string, mimeType: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) return null;

  for (let attempt = 0; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ inlineData: { mimeType, data: base64Data } }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIMS,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        return data.embedding?.values || null;
      }

      const errText = await res.text();
      const isRetryable = res.status === 429 || res.status >= 500;

      if (isRetryable && attempt < EMBEDDING_MAX_RETRIES) {
        const delayMs = res.headers.get('retry-after')
          ? parseInt(res.headers.get('retry-after')!, 10) * 1000
          : EMBEDDING_RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`[ingest] Image embedding failed (${res.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${EMBEDDING_MAX_RETRIES})`);
        await sleep(delayMs);
        continue;
      }

      console.warn(`[ingest] Image embedding failed (${res.status}):`, errText);
      return null;
    } catch (err) {
      if (attempt < EMBEDDING_MAX_RETRIES) {
        const delayMs = EMBEDDING_RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`[ingest] Image embedding error: ${(err as Error).message}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${EMBEDDING_MAX_RETRIES})`);
        await sleep(delayMs);
        continue;
      }
      console.warn('[ingest] Image embedding error (all retries exhausted):', (err as Error).message);
      return null;
    }
  }
  return null;
}

/** Summarize an image using Gemini 2.5 Flash */
async function summarizeImage(base64Data: string, mimeType: string): Promise<string> {
  if (!GEMINI_API_KEY) return '';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Describe what this image shows in detail. Include all visible data, labels, and relationships. Be factual and comprehensive.' },
              { inlineData: { mimeType, data: base64Data } },
            ],
          }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      },
    );

    if (!res.ok) return '';
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch {
    return '';
  }
}

/** Sleep helper for rate limiting */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  // Track embedding failures for final report
  const failedEmbeddings: string[] = [];

  // Write in batches — now with manual embedding generation
  if (toWrite.length > 0) {
    console.log(`Writing chunks${GEMINI_API_KEY ? ' with manual embeddings' : ' (no API key — embeddings skipped)'}...`);

    for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchChunks = toWrite.slice(i, i + BATCH_SIZE);

      for (const chunk of batchChunks) {
        // Generate embedding for this text chunk
        let embedding: number[] | null = null;
        if (GEMINI_API_KEY) {
          embedding = await embedText(chunk.text);
          // Rate limit
          await sleep(EMBEDDING_BATCH_DELAY_MS);
        }

        // Guard: do NOT write chunks without embeddings — they become ghost chunks
        // invisible to vector search, silently degrading RAG quality
        if (GEMINI_API_KEY && !embedding) {
          failedEmbeddings.push(chunk.id);
          console.warn(`  SKIPPED ${chunk.id} — embedding failed after retries`);
          continue;
        }

        const ref = db.collection(COLLECTION_PATH).doc(chunk.id);
        const docData: Record<string, any> = {
          type: 'text',
          fileSlug: chunk.fileSlug,
          fileTitle: chunk.fileTitle,
          sectionHeading: chunk.sectionHeading,
          headingLevel: chunk.headingLevel,
          parentHeadings: chunk.parentHeadings,
          text: chunk.text,
          contentHash: chunk.contentHash,
          entities: chunk.entities,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (embedding) {
          docData.embedding = FieldValue.vector(embedding);
        }

        batch.set(ref, docData);
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

  // Process image chunks from Firebase Storage (wiki-attachments)
  if (GEMINI_API_KEY) {
    try {
      const attachmentsSnapshot = await db.collection('companies/dtgo/attachments').get();
      const imageChunksToWrite: Array<{
        id: string;
        fileSlug: string;
        fileTitle: string;
        sectionHeading: string;
        parentHeadings: string[];
        imageUrl: string;
        text: string;
        embedding: number[];
      }> = [];

      for (const doc of attachmentsSnapshot.docs) {
        const data = doc.data();
        if (!data.extractedImages || data.extractedImages.length === 0) continue;
        const division = data.division || 'unknown';

        for (let imgIdx = 0; imgIdx < data.extractedImages.length; imgIdx++) {
          const imgInfo = data.extractedImages[imgIdx];
          const chunkId = `${division}__img_${doc.id.slice(0, 8)}_${imgIdx}`;

          // Skip if chunk already exists and hasn't changed
          if (existing.has(chunkId) && !forceRewrite) continue;

          try {
            const bucket = getStorage(app).bucket();
            const file = bucket.file(imgInfo.storagePath);
            const [imgBuffer] = await file.download();
            const base64 = imgBuffer.toString('base64');

            // Summarize the image
            console.log(`  Summarizing image: ${imgInfo.storagePath}`);
            const summary = await summarizeImage(base64, 'image/png');
            await sleep(EMBEDDING_BATCH_DELAY_MS);

            // Embed the image
            console.log(`  Embedding image: ${imgInfo.storagePath}`);
            const embedding = await embedImage(base64, 'image/png');
            await sleep(EMBEDDING_BATCH_DELAY_MS);

            if (embedding) {
              imageChunksToWrite.push({
                id: chunkId,
                fileSlug: division,
                fileTitle: data.filename || division,
                sectionHeading: `Image from page ${imgInfo.pageNumber}`,
                parentHeadings: [data.filename || division],
                imageUrl: `gs://phyla-digital-platform.firebasestorage.app/${imgInfo.storagePath}`,
                text: summary || `Image extracted from ${data.filename}`,
                embedding,
              });
            }
          } catch (imgErr) {
            console.warn(`  Failed to process image ${imgInfo.storagePath}:`, (imgErr as Error).message);
          }
        }
      }

      // Write image chunks
      if (imageChunksToWrite.length > 0) {
        console.log(`\nWriting ${imageChunksToWrite.length} image chunks...`);
        for (let i = 0; i < imageChunksToWrite.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const batchImgs = imageChunksToWrite.slice(i, i + BATCH_SIZE);

          for (const img of batchImgs) {
            const ref = db.collection(COLLECTION_PATH).doc(img.id);
            batch.set(ref, {
              type: 'image',
              fileSlug: img.fileSlug,
              fileTitle: img.fileTitle,
              sectionHeading: img.sectionHeading,
              parentHeadings: img.parentHeadings,
              imageUrl: img.imageUrl,
              text: img.text,
              contentHash: img.text.slice(0, 64), // Use summary prefix as hash
              entities: [],
              embedding: FieldValue.vector(img.embedding),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          await batch.commit();
          console.log(`  Wrote ${batchImgs.length} image chunks`);
        }
      }
    } catch (err) {
      console.warn('[ingest] Image chunk processing failed (non-fatal):', (err as Error).message);
    }
  }

  console.log('\nIngestion complete!');
  if (GEMINI_API_KEY) {
    const written = toWrite.length - failedEmbeddings.length;
    console.log(`Embeddings generated manually via Gemini API: ${written} succeeded, ${failedEmbeddings.length} failed.`);
    if (failedEmbeddings.length > 0) {
      console.warn(`\n⚠ ${failedEmbeddings.length} chunk(s) SKIPPED due to embedding failures (not written to Firestore):`);
      for (const id of failedEmbeddings) {
        console.warn(`  - ${id}`);
      }
      console.warn('Re-run with --force to retry these chunks.');
    }
  } else {
    console.log('No GEMINI_API_KEY set — embeddings were not generated. Set GEMINI_API_KEY to enable manual embedding.');
  }
}

ingest().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
