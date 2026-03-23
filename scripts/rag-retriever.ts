/**
 * rag-retriever.ts — Server-side RAG retrieval for intake processing.
 *
 * Uses Firebase Admin SDK to query Firestore vector search on kbChunks.
 * Embeds query text via Gemini API, then uses findNearest() to retrieve
 * the most relevant KB sections.
 *
 * Imported by the Vite dev server plugin (vite.config.ts).
 */

import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';

const COMPANY_ID = 'dtgo';
const COLLECTION_PATH = `companies/${COMPANY_ID}/kbChunks`;
const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
const EMBEDDING_DIMS = 768;

export interface RetrievedChunk {
  id: string;
  fileSlug: string;
  fileTitle: string;
  sectionHeading: string;
  parentHeadings: string[];
  text: string;
  entities: string[];
}

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/** Initialize Firebase Admin (lazy, idempotent) — uses ADC or GOOGLE_APPLICATION_CREDENTIALS */
function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb;

  try {
    if (getApps().length > 0) {
      adminApp = getApps()[0];
    } else {
      // Uses Application Default Credentials (gcloud auth application-default login)
      // or GOOGLE_APPLICATION_CREDENTIALS env var. No key files in the project.
      adminApp = initializeApp({ projectId: 'phyla-digital-platform' }, 'rag-retriever');
    }
    adminDb = getFirestore(adminApp);
    return adminDb;
  } catch (err) {
    console.warn('[RAG] Firebase Admin init failed:', (err as Error).message);
    return null;
  }
}

/** Embed text using Gemini Embedding API */
async function embedText(text: string, geminiApiKey: string, taskType = 'RETRIEVAL_QUERY'): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMS,
        }),
      },
    );

    if (!res.ok) {
      console.warn('[RAG] Gemini embedding failed:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.warn('[RAG] Gemini embedding error:', (err as Error).message);
    return null;
  }
}

/**
 * Retrieve the most relevant KB chunks for a given source text.
 *
 * @param sourceText - The intake source text to find relevant KB context for
 * @param geminiApiKey - Gemini API key for embedding the query
 * @param topK - Number of chunks to retrieve (default: 12)
 * @returns Array of matching chunks, or null if RAG is unavailable
 */
export async function findRelevantChunks(
  sourceText: string,
  geminiApiKey: string,
  topK = 12,
): Promise<RetrievedChunk[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  // Truncate source text for embedding (max ~7000 tokens ≈ ~28000 chars)
  const truncated = sourceText.slice(0, 28000);

  // Embed the source text
  const queryVector = await embedText(truncated, geminiApiKey);
  if (!queryVector) return null;

  try {
    // Use Firestore findNearest for vector search
    const collectionRef = db.collection(COLLECTION_PATH);
    const vectorQuery = collectionRef.findNearest('embedding', FieldValue.vector(queryVector), {
      limit: topK,
      distanceMeasure: 'COSINE',
    });

    const snapshot = await vectorQuery.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        fileSlug: data.fileSlug,
        fileTitle: data.fileTitle,
        sectionHeading: data.sectionHeading,
        parentHeadings: data.parentHeadings || [],
        text: data.text,
        entities: data.entities || [],
      };
    });
  } catch (err) {
    console.warn('[RAG] Firestore vector search failed:', (err as Error).message);
    return null;
  }
}

/**
 * Format retrieved chunks as context for an LLM prompt.
 * Returns a string suitable for injection into the system prompt.
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c) => {
      const breadcrumb = c.parentHeadings.length > 0
        ? `${c.parentHeadings.join(' > ')} > ${c.sectionHeading}`
        : `${c.fileTitle} > ${c.sectionHeading}`;
      return `--- ${c.fileSlug} / ${breadcrumb} ---\n${c.text}`;
    })
    .join('\n\n');
}
