/**
 * intake-handler.ts — Server-side file processing for multimodal intake.
 *
 * Handles PDF text extraction (Gemini 2.5 Flash), PDF image extraction
 * (pdf-export-images), CSV narrativization (papaparse), and multipart
 * form-data parsing (busboy). Also manages Firebase Storage uploads
 * and attachment metadata in Firestore.
 *
 * Imported by the Vite plugin in vite.config.ts — keeps heavy processing
 * out of the plugin itself.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { Writable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Busboy from 'busboy';
import { GoogleGenAI } from '@google/genai';
import Papa from 'papaparse';

// ── Types ──

export interface ParsedFile {
  fieldname: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface MultipartResult {
  fields: Record<string, string>;
  files: ParsedFile[];
}

export interface ExtractedImage {
  buffer: Buffer;
  pageNumber: number;
  filename: string;
}

export interface AttachmentDoc {
  id: string;
  filename: string;
  mimeType: string;
  division: string;
  storagePath: string;
  uploadedAt: string;
  sessionId?: string;
  fileSize: number;
  extractedImages?: Array<{ storagePath: string; pageNumber: number }>;
}

// ── Multipart parsing ──

export function readMultipartBody(req: IncomingMessage): Promise<MultipartResult> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: ParsedFile[] = [];

    const busboy = Busboy({ headers: req.headers });

    busboy.on('field', (name: string, value: string) => {
      fields[name] = value;
    });

    busboy.on('file', (fieldname: string, stream: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        files.push({
          fieldname,
          filename: info.filename,
          mimeType: info.mimeType,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    busboy.on('finish', () => resolve({ fields, files }));
    busboy.on('error', reject);

    req.pipe(busboy);
  });
}

// ── PDF text extraction via Gemini ──

export async function extractTextFromPDF(buffer: Buffer, geminiApiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Extract all text content from this PDF. Preserve structure with markdown headings. Include all tables, lists, and data points. Do not summarize — extract verbatim.' },
          { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } },
        ],
      },
    ],
  });

  return response.text ?? '';
}

// ── PDF image extraction via pdf-export-images ──

export async function extractImagesFromPDF(buffer: Buffer): Promise<ExtractedImage[]> {
  // pdf-export-images requires a file path, so write to temp
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dtgo-pdf-'));
  const tmpPdf = path.join(tmpDir, 'input.pdf');
  const tmpOutDir = path.join(tmpDir, 'images');
  fs.writeFileSync(tmpPdf, buffer);
  fs.mkdirSync(tmpOutDir, { recursive: true });

  try {
    const { exportImages } = await import('pdf-export-images');
    const results = await exportImages(tmpPdf, tmpOutDir);

    const images: ExtractedImage[] = [];
    for (const result of results) {
      const imgPath = typeof result === 'string' ? result : result.path || result.filePath;
      if (imgPath && fs.existsSync(imgPath)) {
        const imgBuffer = fs.readFileSync(imgPath);
        const basename = path.basename(imgPath);
        // Try to extract page number from filename
        const pageMatch = basename.match(/page[_-]?(\d+)/i) || basename.match(/(\d+)/);
        const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : 0;
        images.push({ buffer: imgBuffer, pageNumber, filename: basename });
      }
    }

    return images;
  } finally {
    // Cleanup temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── CSV narrativization ──

export function narrativizeCSV(buffer: Buffer): string {
  const csvText = buffer.toString('utf-8');
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  if (!parsed.data || parsed.data.length === 0) {
    return csvText; // Fallback to raw text
  }

  const headers = parsed.meta.fields || [];
  const rows = parsed.data as Record<string, string>[];

  // Generate a natural language sentence for each row
  const sentences = rows.map((row, i) => {
    const parts = headers
      .filter(h => row[h] && row[h].trim())
      .map(h => `${h}: ${row[h].trim()}`);

    if (parts.length === 0) return '';

    // Try to build a more natural sentence if we have identifiable columns
    const nameCol = headers.find(h => /^(name|company|entity|title|organization|org)$/i.test(h));
    if (nameCol && row[nameCol]) {
      const otherParts = headers
        .filter(h => h !== nameCol && row[h] && row[h].trim())
        .map(h => `${h} is ${row[h].trim()}`);
      return `${row[nameCol].trim()} — ${otherParts.join('; ')}.`;
    }

    return parts.join(', ') + '.';
  }).filter(Boolean);

  return `CSV data (${rows.length} rows, columns: ${headers.join(', ')}):\n\n${sentences.join('\n')}`;
}

// ── Firebase Storage upload helpers ──

export async function uploadToStorage(
  adminBucket: any,
  storagePath: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  const file = adminBucket.file(storagePath);
  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });
}

export async function getSignedUrl(adminBucket: any, storagePath: string, expiresInMs = 3600000): Promise<string> {
  const file = adminBucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMs,
  });
  return url;
}

// ── Image summarization via Gemini ──

export async function summarizeImage(buffer: Buffer, mimeType: string, geminiApiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Describe what this image shows in detail. Include all visible data, labels, and relationships. Be factual and comprehensive.' },
          { inlineData: { mimeType: mimeType as any, data: buffer.toString('base64') } },
        ],
      },
    ],
  });

  return response.text ?? '';
}

// ── Embedding via Gemini ──

export async function embedContent(
  content: { text?: string; imageBuffer?: Buffer; imageMimeType?: string },
  geminiApiKey: string,
  dimensionality = 768,
): Promise<number[] | null> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const parts: any[] = [];
  if (content.text) {
    parts.push({ text: content.text });
  }
  if (content.imageBuffer && content.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: content.imageMimeType,
        data: content.imageBuffer.toString('base64'),
      },
    });
  }

  if (parts.length === 0) return null;

  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: [{ role: 'user', parts }],
      config: { outputDimensionality: dimensionality },
    });

    return response.embeddings?.[0]?.values ?? null;
  } catch (err) {
    console.warn('[intake-handler] Embedding failed:', (err as Error).message);
    return null;
  }
}

// ── Process uploaded files and extract text ──

export async function processUploadedFiles(
  files: ParsedFile[],
  geminiApiKey: string,
): Promise<{ extractedText: string; extractedImages: ExtractedImage[] }> {
  let extractedText = '';
  const allImages: ExtractedImage[] = [];

  for (const file of files) {
    if (file.mimeType === 'application/pdf') {
      console.log(`[intake] Extracting text from PDF: ${file.filename}`);
      const pdfText = await extractTextFromPDF(file.buffer, geminiApiKey);
      extractedText += `\n\n--- Content from ${file.filename} ---\n\n${pdfText}`;

      console.log(`[intake] Extracting images from PDF: ${file.filename}`);
      try {
        const images = await extractImagesFromPDF(file.buffer);
        console.log(`[intake] Found ${images.length} images in ${file.filename}`);
        allImages.push(...images);
      } catch (err) {
        console.warn(`[intake] Image extraction failed for ${file.filename}:`, (err as Error).message);
      }
    } else if (file.mimeType === 'text/csv' || file.filename.endsWith('.csv')) {
      console.log(`[intake] Narrativizing CSV: ${file.filename}`);
      const csvText = narrativizeCSV(file.buffer);
      extractedText += `\n\n--- Content from ${file.filename} ---\n\n${csvText}`;
    } else {
      // Unknown file type — try to read as text
      console.log(`[intake] Reading as text: ${file.filename}`);
      extractedText += `\n\n--- Content from ${file.filename} ---\n\n${file.buffer.toString('utf-8')}`;
    }
  }

  return { extractedText, extractedImages: allImages };
}

// ── Attachment Firestore CRUD (used by API routes) ──

export async function listAttachments(db: any, division: string): Promise<AttachmentDoc[]> {
  const snapshot = await db
    .collection('companies/dtgo/attachments')
    .where('division', '==', division)
    .orderBy('uploadedAt', 'desc')
    .get();

  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function listAllAttachments(db: any): Promise<AttachmentDoc[]> {
  const snapshot = await db
    .collection('companies/dtgo/attachments')
    .orderBy('uploadedAt', 'desc')
    .get();

  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export async function saveAttachmentMetadata(db: any, doc: AttachmentDoc): Promise<void> {
  await db.collection('companies/dtgo/attachments').doc(doc.id).set(doc);
}
