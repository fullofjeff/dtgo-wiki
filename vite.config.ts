import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { exec } from 'node:child_process'
import { findRelevantChunks, formatChunksAsContext, getAdminDb } from './scripts/rag-retriever.js'
import { chunkKnowledgeBase } from './scripts/chunk-kb.js'
import {
  readMultipartBody,
  processUploadedFiles,
  uploadToStorage,
  saveAttachmentMetadata,
  listAttachments,
  listAllAttachments,
  getSignedUrl,
  type AttachmentDoc,
  type ParsedFile,
} from './server/intake-handler.js'

// Provider configuration for multi-model intake
interface ModelVariant {
  id: string;
  name: string;
  description?: string;
}

interface ProviderConfig {
  name: string;
  defaultModel: string;
  variants: ModelVariant[];
  buildRequest: (key: string, model: string, systemPrompt: string, userText: string) => { url: string; init: RequestInit };
  extractText: (data: unknown) => string;
}

const providerConfigs: Record<string, ProviderConfig> = {
  claude: {
    name: 'Claude',
    defaultModel: 'claude-sonnet-4-6',
    variants: [
      { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6', description: 'Best balance of speed and intelligence' },
      { id: 'claude-opus-4-6', name: 'Opus 4.6', description: 'Most intelligent, 1M context' },
      { id: 'claude-haiku-4-5', name: 'Haiku 4.5', description: 'Fastest, near-frontier intelligence' },
    ],
    buildRequest: (key, model, systemPrompt, userText) => ({
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 16384, system: systemPrompt, messages: [{ role: 'user', content: userText }] }),
      },
    }),
    extractText: (data: any) => data.content?.[0]?.text || '{}',
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-5.4-mini',
    variants: [
      { id: 'gpt-5.4', name: 'GPT-5.4', description: 'Flagship for agentic and professional workflows' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', description: 'Strong capability, lower cost' },
      { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', description: 'Cheapest, simple high-volume tasks' },
      { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Smartest non-reasoning, 1M context' },
      { id: 'o3', name: 'o3', description: 'Reasoning model for complex tasks' },
    ],
    buildRequest: (key, model, systemPrompt, userText) => {
      const isReasoning = model.startsWith('o3') || model.startsWith('o4');
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            ...(isReasoning ? { max_completion_tokens: 16384 } : { max_tokens: 16384 }),
            messages: [
              { role: isReasoning ? 'developer' : 'system', content: systemPrompt },
              { role: 'user', content: userText },
            ],
          }),
        },
      };
    },
    extractText: (data: any) => data.choices?.[0]?.message?.content || '{}',
  },
  gemini: {
    name: 'Gemini',
    defaultModel: 'gemini-2.5-flash',
    variants: [
      { id: 'gemini-2.5-flash', name: '2.5 Flash', description: 'Best price-performance, stable' },
      { id: 'gemini-2.5-pro', name: '2.5 Pro', description: 'Deep reasoning, stable' },
      { id: 'gemini-3-flash-preview', name: '3 Flash (Preview)', description: 'Frontier-class, low cost' },
      { id: 'gemini-3.1-pro-preview', name: '3.1 Pro (Preview)', description: 'Advanced intelligence, agentic' },
    ],
    buildRequest: (key, model, systemPrompt, userText) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userText }] }],
          generationConfig: { maxOutputTokens: 16384 },
        }),
      },
    }),
    extractText: (data: any) => data.candidates?.[0]?.content?.parts?.[0]?.text || '{}',
  },
  grok: {
    name: 'Grok',
    defaultModel: 'grok-4-1-fast-reasoning',
    variants: [
      { id: 'grok-4-1-fast-reasoning', name: 'Grok 4.1 Fast', description: 'Speed-optimized reasoning, low cost' },
      { id: 'grok-4.20-0309-reasoning', name: 'Grok 4.20 Reasoning', description: 'Latest reasoning, 2M context' },
      { id: 'grok-4.20-0309-non-reasoning', name: 'Grok 4.20', description: 'Standard, no reasoning overhead' },
    ],
    buildRequest: (key, model, systemPrompt, userText) => {
      const isReasoning = model.includes('reasoning');
      return {
        url: 'https://api.x.ai/v1/chat/completions',
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            ...(isReasoning
              ? { reasoning_effort: 'high' }
              : { max_tokens: 16384 }),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userText },
            ],
          }),
        },
      };
    },
    extractText: (data: any) => data.choices?.[0]?.message?.content || '{}',
  },
};

// ── Chat archive helpers ──

const KB_DIR = path.resolve(__dirname, 'knowledge-base');
const CHAT_ARCHIVE_PATH = path.resolve(KB_DIR, 'data/chat-archive.json');

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  messages: ChatMessage[];
}

function readChatArchive(): ChatSession[] {
  try { return JSON.parse(fs.readFileSync(CHAT_ARCHIVE_PATH, 'utf-8')); }
  catch { return []; }
}

function writeChatArchive(sessions: ChatSession[]) {
  fs.writeFileSync(CHAT_ARCHIVE_PATH, JSON.stringify(sessions, null, 2));
}

/** Build a streaming request for a given provider */
function buildStreamRequest(
  provider: string, key: string, model: string, systemPrompt: string, messages: ChatMessage[]
): { url: string; init: RequestInit } | null {
  const convMessages = messages.filter(m => m.role !== 'system');

  switch (provider) {
    case 'claude': {
      return {
        url: 'https://api.anthropic.com/v1/messages',
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model, max_tokens: 8192, stream: true,
            system: systemPrompt,
            messages: convMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        },
      };
    }
    case 'openai':
    case 'grok': {
      const isReasoning = model.startsWith('o3') || model.startsWith('o4');
      const baseUrl = provider === 'grok' ? 'https://api.x.ai' : 'https://api.openai.com';
      return {
        url: `${baseUrl}/v1/chat/completions`,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model, stream: true,
            ...(isReasoning ? { reasoning_effort: 'high' } : { max_tokens: 8192 }),
            messages: [
              { role: isReasoning ? 'developer' : 'system', content: systemPrompt },
              ...convMessages.map(m => ({ role: m.role, content: m.content })),
            ],
          }),
        },
      };
    }
    case 'gemini': {
      const contents = convMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens: 8192 },
          }),
        },
      };
    }
    default:
      return null;
  }
}

/** Extract a content token from a provider's SSE data line */
function parseStreamChunk(provider: string, dataStr: string): string | null {
  if (dataStr === '[DONE]') return null;
  try {
    const data = JSON.parse(dataStr);
    switch (provider) {
      case 'claude':
        if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') return data.delta.text;
        return null;
      case 'openai':
      case 'grok':
        return data.choices?.[0]?.delta?.content || null;
      case 'gemini':
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ── Intake archive helpers ──

const ARCHIVE_PATH = path.resolve(KB_DIR, 'data/intake-archive.json');

interface IntakeSession {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  status: 'processing' | 'ready' | 'error';
  sourceExcerpt: string;
  sourceText?: string;
  systemInstructions?: string;
  result?: any;
  error?: string;
  approvals: Record<string, 'approved' | 'rejected'>;
  appliedAt?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    storagePath: string;
    extractedImages?: Array<{ storagePath: string; pageNumber: number }>;
    division?: string;
  }>;
}

// Archive lock to prevent concurrent read-modify-write races
let archiveLock: Promise<void> = Promise.resolve();

function readArchive(): IntakeSession[] {
  try { return JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf-8')); }
  catch { return []; }
}

/** Atomic write: write to temp file, then rename over archive to prevent corruption on crash */
function writeArchive(sessions: IntakeSession[]) {
  const tmpPath = ARCHIVE_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(sessions, null, 2));
  fs.renameSync(tmpPath, ARCHIVE_PATH);
}

/** Serialized update: queues through archiveLock to prevent concurrent read-modify-write races */
function updateSession(id: string, patch: Partial<IntakeSession>) {
  archiveLock = archiveLock.then(() => {
    const sessions = readArchive();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx >= 0) { sessions[idx] = { ...sessions[idx], ...patch }; writeArchive(sessions); }
  }).catch((err) => {
    console.error('[archive] Failed to update session:', err);
  });
}

// ── Master Index builder (mirrors personIndex.ts logic, server-side) ──

function isPersonSection(body: string): boolean {
  const firstLine = body.split('\n').find(l => l.trim().length > 0);
  return firstLine ? /^`[^`]+`/.test(firstLine.trim()) : false;
}

function extractSectionBody(md: string, heading: string, level: number): string {
  const lines = md.split('\n');
  let capturing = false;
  const out: string[] = [];
  for (const line of lines) {
    if (capturing) {
      const m = line.match(/^(#{1,6})\s/);
      if (m && m[1].length <= level) break;
      out.push(line);
    } else {
      const m = line.match(/^(#{1,6})\s+(.+)$/);
      if (m && m[1].length === level && m[2].trim() === heading) capturing = true;
    }
  }
  return out.join('\n').trim();
}

function walkMdFiles(dir: string, base: string = ''): string[] {
  const results: string[] = [];
  const skipFiles = new Set(['CONTRIBUTING.md', 'INTAKE.md', '_registry.md', '_aliases.md']);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'data' || entry.name === '_inbox') continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkMdFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.md') && !skipFiles.has(entry.name)) {
      results.push(rel);
    }
  }
  return results;
}

function buildMasterIndex() {
  const kbDir = KB_DIR;
  const mdFiles = walkMdFiles(kbDir);

  const files: any[] = [];
  const knownPeople: Record<string, { aliases: string[]; file: string; section: string }> = {};

  for (const filename of mdFiles) {
    const raw = fs.readFileSync(path.join(kbDir, filename), 'utf-8');
    // Slug: people/founders.md → people/founders, _index.md → index
    const slug = filename.replace(/\.md$/, '').replace(/(^|\/)_/g, '$1');

    // Parse frontmatter
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const meta: Record<string, string> = {};
    const body = fmMatch ? fmMatch[2] : raw;
    if (fmMatch) {
      for (const line of fmMatch[1].split('\n')) {
        const ci = line.indexOf(':');
        if (ci > 0) {
          const k = line.slice(0, ci).trim();
          let v = line.slice(ci + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          meta[k] = v;
        }
      }
    }

    // Extract ## headings
    const sections: string[] = [];
    const h2Regex = /^##\s+(.+)$/gm;
    let m;
    while ((m = h2Regex.exec(body)) !== null) sections.push(m[1].trim());

    // Extract ### person entries
    const entities: string[] = [];
    const h3Regex = /^###\s+(.+)$/gm;
    while ((m = h3Regex.exec(body)) !== null) {
      const fullHeading = m[1].trim();
      const sectionBody = extractSectionBody(body, fullHeading, 3);
      const nameOnly = fullHeading.replace(/\s*\(.*?\)\s*$/, '').replace(/ — .*$/, '').trim();
      entities.push(nameOnly);

      if (isPersonSection(sectionBody)) {
        const nickname = fullHeading.match(/\("([^"]+)"\)/)?.[1] || null;
        const aliases = [fullHeading, nameOnly];
        if (nickname) aliases.push(nickname);

        // Find parent ## section
        const lines = body.slice(0, m.index).split('\n');
        let parentSection = '';
        for (let i = lines.length - 1; i >= 0; i--) {
          const sm = lines[i].match(/^##\s+(.+)$/);
          if (sm) { parentSection = sm[1].trim(); break; }
        }

        if (!knownPeople[nameOnly]) {
          knownPeople[nameOnly] = { aliases: [...new Set(aliases)], file: slug, section: parentSection ? `## ${parentSection}` : '' };
        }
      }
    }

    // Extract bold entities
    const boldRegex = /\*\*([^*]+)\*\*/g;
    while ((m = boldRegex.exec(body)) !== null) {
      const term = m[1].trim();
      if (term.length > 2 && term.length < 80 && !entities.includes(term)) entities.push(term);
    }

    files.push({ slug, title: meta.title || slug, scope: meta.scope || '', sections, entities: entities.slice(0, 50) });
  }

  // Inject aliases from _aliases.md into knownPeople
  try {
    const aliasesRaw = fs.readFileSync(path.join(kbDir, '_aliases.md'), 'utf-8');
    const tableRowRegex = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/gm;
    let am;
    while ((am = tableRowRegex.exec(aliasesRaw)) !== null) {
      const alias = am[1].trim();
      const canonical = am[2].trim();
      if (alias === 'Alias' || alias.startsWith('---')) continue; // skip header rows
      if (knownPeople[canonical]) {
        if (!knownPeople[canonical].aliases.includes(alias)) {
          knownPeople[canonical].aliases.push(alias);
        }
      }
    }
  } catch { /* _aliases.md not found — skip */ }

  return { files, knownPeople };
}

// ── Registry loader (entity → file/section mapping) ──

interface RegistryEntry {
  entity: string;
  file: string;
  section: string;
}

function loadRegistry(): RegistryEntry[] {
  try {
    const raw = fs.readFileSync(path.join(KB_DIR, '_registry.md'), 'utf-8');
    const entries: RegistryEntry[] = [];
    const rowRegex = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm;
    let m;
    while ((m = rowRegex.exec(raw)) !== null) {
      const entity = m[1].trim();
      const file = m[2].trim();
      const section = m[3].trim();
      if (entity === 'Entity' || entity.startsWith('---')) continue;
      entries.push({ entity, file: file.replace(/\.md$/, '').replace(/(^|\/)_/g, '$1'), section });
    }
    return entries;
  } catch {
    return [];
  }
}

// ── Local KB search (fallback when RAG is unavailable) ──

function localKbSearch(
  query: string,
  masterIdx: ReturnType<typeof buildMasterIndex>,
  registry: RegistryEntry[],
  topK = 6,
): string | null {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  // Score each registry entry by keyword overlap with query
  const scored: { entry: RegistryEntry; score: number }[] = [];
  for (const entry of registry) {
    const entityLower = entry.entity.toLowerCase();
    let score = 0;

    // Exact entity match in query
    if (queryLower.includes(entityLower)) score += 10;
    // Entity contains query
    if (entityLower.includes(queryLower)) score += 8;
    // Section match
    const sectionLower = entry.section.toLowerCase().replace(/^#+\s*/, '');
    if (queryLower.includes(sectionLower)) score += 8;
    // Term overlap
    for (const term of queryTerms) {
      if (entityLower.includes(term)) score += 2;
      if (sectionLower.includes(term)) score += 1;
    }

    if (score > 0) scored.push({ entry, score });
  }

  // Also check masterIndex files for title/scope/entity matches
  for (const file of masterIdx.files) {
    const titleLower = (file.title || '').toLowerCase();
    const scopeLower = (file.scope || '').toLowerCase();
    let fileScore = 0;
    for (const term of queryTerms) {
      if (titleLower.includes(term)) fileScore += 3;
      if (scopeLower.includes(term)) fileScore += 1;
    }
    if (fileScore > 0) {
      // Add file-level entry
      scored.push({ entry: { entity: file.title, file: file.slug, section: '' }, score: fileScore });
    }

    // Check entities within files
    for (const entity of (file.entities || [])) {
      const entLower = entity.toLowerCase();
      if (queryLower.includes(entLower) || entLower.includes(queryLower)) {
        scored.push({ entry: { entity, file: file.slug, section: '' }, score: 6 });
      }
    }
  }

  // Also check aliases (knownPeople)
  for (const [name, info] of Object.entries(masterIdx.knownPeople)) {
    const allNames = [name, ...info.aliases].map(n => n.toLowerCase());
    for (const alias of allNames) {
      if (queryLower.includes(alias) || alias.includes(queryLower)) {
        scored.push({
          entry: { entity: name, file: info.file, section: info.section },
          score: 7,
        });
        break;
      }
    }
  }

  if (scored.length === 0) return null;

  // Deduplicate by file+section, keep highest score
  const deduped = new Map<string, { entry: RegistryEntry; score: number }>();
  for (const item of scored) {
    const key = `${item.entry.file}::${item.entry.section}`;
    const existing = deduped.get(key);
    if (!existing || item.score > existing.score) deduped.set(key, item);
  }

  const topResults = Array.from(deduped.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Read section content from disk
  const contextParts: string[] = [];
  for (const { entry } of topResults) {
    try {
      let filePath = path.join(KB_DIR, `${entry.file}.md`);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(KB_DIR, `_${entry.file}.md`);
      }
      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, 'utf-8');

      if (entry.section) {
        // Extract specific section
        const headingMatch = entry.section.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const heading = headingMatch[2].trim();
          const body = extractSectionBody(raw, heading, level);
          if (body) {
            contextParts.push(`--- ${entry.file} / ${entry.section} ---\n${body.slice(0, 2000)}`);
            continue;
          }
        }
      }

      // Fall back to file-level content (strip frontmatter, take first 2000 chars)
      const bodyMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1] : raw;
      contextParts.push(`--- ${entry.file} ---\n${body.slice(0, 2000)}`);
    } catch {
      continue;
    }
  }

  return contextParts.length > 0 ? contextParts.join('\n\n') : null;
}

// ── Apply changes to .md files ──

function applyFindReplace(filePath: string, searchPattern: string, replacement: string) {
  let raw = fs.readFileSync(filePath, 'utf-8');
  const today = new Date().toISOString().slice(0, 10);
  raw = raw.replace(/^(updated:\s*)"?[^"\n]*"?/m, `$1"${today}"`);
  const regex = new RegExp(searchPattern, 'g');
  raw = raw.replace(regex, replacement);
  fs.writeFileSync(filePath, raw);
}

interface PendingEdit {
  section: string;
  action: string;
  content: string;
}

/**
 * Apply multiple edits to a single file in one read-write cycle.
 * Edits targeting existing sections are applied bottom-to-top (by section position)
 * to prevent earlier insertions from shifting the positions of later targets.
 * New sections and unmatched edits are appended at the end.
 */
function applyEditsToFile(filePath: string, edits: PendingEdit[]) {
  let raw = fs.readFileSync(filePath, 'utf-8');

  // Update frontmatter date once
  const today = new Date().toISOString().slice(0, 10);
  raw = raw.replace(/^(updated:\s*)"?[^"\n]*"?/m, `$1"${today}"`);

  // Deduplicate: skip appends whose ### heading already exists in file
  let dedupedEdits = edits.filter(edit => {
    if (edit.action !== 'append') return true;
    const h3Match = edit.content.match(/^###\s+(.+?)(?:\s*—|$)/m);
    if (!h3Match) return true;
    const personName = h3Match[1].trim();
    const escapedName = personName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`^###\\s+${escapedName}`, 'm').test(raw);
  });

  // Within-batch dedup: multiple updates to same section → keep last
  const seenUpdateSections = new Map<string, number>();
  for (let i = 0; i < dedupedEdits.length; i++) {
    if (dedupedEdits[i].action === 'update' && dedupedEdits[i].section) {
      seenUpdateSections.set(dedupedEdits[i].section.replace(/^##\s*/, '').toLowerCase(), i);
    }
  }
  if (seenUpdateSections.size > 0) {
    const keepIndices = new Set(seenUpdateSections.values());
    dedupedEdits = dedupedEdits.filter((edit, i) => {
      if (edit.action !== 'update' || !edit.section) return true;
      return keepIndices.has(i);
    });
  }

  // Separate edits: new_section / no-section (appends) vs. targeted edits
  const appends: PendingEdit[] = [];
  const targeted: Array<PendingEdit & { matchIndex: number }> = [];

  for (const edit of dedupedEdits) {
    if (edit.action === 'new_section' || !edit.section) {
      appends.push(edit);
    } else {
      const sectionName = edit.section.replace(/^##\s*/, '');
      const sectionRegex = new RegExp(`^(##\\s+${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`, 'm');
      const match = sectionRegex.exec(raw);
      if (match) {
        targeted.push({ ...edit, matchIndex: match.index });
      } else {
        // Section not found — treat as append
        appends.push(edit);
      }
    }
  }

  // Apply targeted edits bottom-to-top so earlier edits don't shift positions
  targeted.sort((a, b) => b.matchIndex - a.matchIndex);

  for (const edit of targeted) {
    const sectionName = edit.section.replace(/^##\s*/, '');
    const sectionRegex = new RegExp(`^(##\\s+${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`, 'm');
    const match = sectionRegex.exec(raw);
    if (!match) continue; // Shouldn't happen but safety check

    const insertPos = match.index + match[0].length;
    const rest = raw.slice(insertPos);
    const nextH2 = rest.search(/\n##\s+/);

    if (edit.action === 'append') {
      const insertAt = nextH2 >= 0 ? insertPos + nextH2 : raw.length;
      raw = raw.slice(0, insertAt).trimEnd() + '\n\n' + edit.content + '\n' + raw.slice(insertAt);
    } else if (edit.action === 'update') {
      const endPos = nextH2 >= 0 ? insertPos + nextH2 : raw.length;
      raw = raw.slice(0, insertPos) + '\n\n' + edit.content + '\n' + raw.slice(endPos);
    } else if (edit.action === 'conflict') {
      const insertAt = nextH2 >= 0 ? insertPos + nextH2 : raw.length;
      raw = raw.slice(0, insertAt).trimEnd() + '\n\n> \u26a0\ufe0f CONFLICT\n> ' + edit.content.replace(/\n/g, '\n> ') + '\n' + raw.slice(insertAt);
    }
  }

  // Apply appends (new sections and unmatched) at end
  for (const edit of appends) {
    if (edit.action === 'new_section') {
      raw = raw.trimEnd() + `\n\n## ${edit.section}\n\n${edit.content}\n`;
    } else {
      raw = raw.trimEnd() + '\n\n' + edit.content + '\n';
    }
  }

  fs.writeFileSync(filePath, raw);
}

/** Legacy single-edit wrapper — delegates to batched version */
function applyMatchToFile(filePath: string, section: string, action: string, content: string) {
  applyEditsToFile(filePath, [{ section, action, content }]);
}

function gitCommit(files: string[], message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const quoted = files.map(f => `"${f}"`).join(' ');
    exec(`cd "${KB_DIR}" && git add ${quoted} && git commit -m "${message.replace(/"/g, '\\"')}"`, (err) => {
      if (err) { console.error('[intake] git commit failed:', err.message); reject(err); }
      else { console.log('[intake] git commit OK:', message); resolve(); }
    });
  });
}

// ── Pre-flight duplicate check ──
// Deterministic check against current file state — runs before every write
function checkForDuplicate(filePath: string, action: string, section: string | undefined, contentToApply: string): string | null {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const basename = path.basename(filePath);

  // 1. H3 heading check — person/entity already exists
  const h3Match = contentToApply.match(/^###\s+(.+?)(?:\s*—|$)/m);
  if (h3Match && action === 'append') {
    const personName = h3Match[1].trim();
    const escapedName = personName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`^###\\s+${escapedName}`, 'm').test(fileContent)) {
      return `"${personName}" already exists in ${basename}`;
    }
  }

  // 2. Content fingerprint — check if majority of content already present
  if (action === 'append' || action === 'new_section' || action === 'update') {
    const contentLines = contentToApply.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 20 && !l.startsWith('**Sources:**') && !l.startsWith('[intake:'));
    if (contentLines.length > 0) {
      const existingCount = contentLines.filter(line => fileContent.includes(line)).length;
      const ratio = existingCount / contentLines.length;
      if (ratio > 0.8) {
        return `Content already present in ${basename} (${Math.round(ratio * 100)}% overlap)`;
      }
    }
  }

  // 3. Section existence check for new_section
  if (action === 'new_section' && section) {
    const sectionName = section.replace(/^##\s*/, '');
    const escapedSection = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`^##\\s+${escapedSection}$`, 'm').test(fileContent)) {
      return `Section "## ${sectionName}" already exists in ${basename}`;
    }
  }

  // 4. Update identity check — skip if proposed content matches existing section exactly
  if (action === 'update' && section) {
    const sectionName = section.replace(/^##\s*/, '');
    const escapedSection = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRegex = new RegExp(`^##\\s+${escapedSection}$`, 'm');
    const sMatch = sectionRegex.exec(fileContent);
    if (sMatch) {
      const rest = fileContent.slice(sMatch.index + sMatch[0].length);
      const nextH2 = rest.search(/\n##\s+/);
      const existingSection = (nextH2 >= 0 ? rest.slice(0, nextH2) : rest).trim();
      const proposedContent = contentToApply.trim();
      const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
      if (normalize(existingSection) === normalize(proposedContent)) {
        return `Update content identical to existing section in ${basename}`;
      }
    }
  }

  return null;
}

// ── Read request body helper ──

async function readBody(req: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString());
}

// ── Parse AI JSON response ──

function parseAiJson(text: string): any {
  let cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  // Extract JSON object if wrapped in other text
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  // Replace smart/curly quotes with straight quotes
  cleaned = cleaned.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // Strip control characters (except \n and \t which we handle below)
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix unescaped newlines/tabs inside JSON string values
    let fixed = '';
    let inString = false;
    let escape = false;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { fixed += ch; escape = false; continue; }
      if (ch === '\\' && inString) { fixed += ch; escape = true; continue; }
      if (ch === '"') { inString = !inString; fixed += ch; continue; }
      if (inString && ch === '\n') { fixed += '\\n'; continue; }
      if (inString && ch === '\t') { fixed += '\\t'; continue; }
      fixed += ch;
    }
    try {
      return JSON.parse(fixed);
    } catch {
      // Last resort: escape unescaped quotes inside string values
      // Heuristic: a quote preceded by a word char and followed by a word char is likely interior
      let aggressive = '';
      let inStr = false;
      let esc = false;
      for (let i = 0; i < fixed.length; i++) {
        const ch = fixed[i];
        if (esc) { aggressive += ch; esc = false; continue; }
        if (ch === '\\' && inStr) { aggressive += ch; esc = true; continue; }
        if (ch === '"') {
          if (!inStr) {
            inStr = true;
            aggressive += ch;
          } else {
            // Check if this quote ends the string (next non-space is : , ] or })
            const rest = fixed.slice(i + 1).trimStart();
            if (rest.length === 0 || /^[,:}\]]/.test(rest)) {
              inStr = false;
              aggressive += ch;
            } else {
              // Interior quote — escape it
              aggressive += '\\"';
            }
          }
          continue;
        }
        aggressive += ch;
      }
      return JSON.parse(aggressive);
    }
  }
}

// ── Vite plugin ──

function intakeApiPlugin(): Plugin {
  let apiKeys: Record<string, string> = {};
  let masterIndex: ReturnType<typeof buildMasterIndex>;
  let registry: RegistryEntry[] = [];

  return {
    name: 'intake-api',
    configResolved(config) {
      const env = loadEnv(config.mode, '/Users/jeffreyfullerton/PHYLA_BACKEND', '');
      apiKeys = {
        claude: env.CLAUDE_API_KEY || '',
        openai: env.OPENAI_API_KEY || '',
        gemini: env.GEMINI_API_KEY || '',
        grok: env.GROK_API_KEY || '',
      };
      masterIndex = buildMasterIndex();
      registry = loadRegistry();
      console.log(`[Chat] Loaded ${registry.length} registry entries, ${masterIndex.files.length} KB files, ${Object.keys(masterIndex.knownPeople).length} people`);
    },
    configureServer(server) {
      // Track ingest subprocess state
      let lastIngestStatus: { status: 'idle' | 'running' | 'success' | 'failed'; startedAt?: string; completedAt?: string; error?: string } = { status: 'idle' };

      // Track active background processing sessions
      const activeProcessing = new Set<string>();

      // On server start, mark any stale processing sessions as errored
      const sessions = readArchive();
      let startupDirty = false;
      for (const s of sessions) {
        if (s.status === 'processing') {
          s.status = 'error';
          s.error = 'Server restarted — processing was interrupted. Try rerunning.';
          startupDirty = true;
        }
      }
      if (startupDirty) writeArchive(sessions);

      // GET /api/intake/providers
      server.middlewares.use('/api/intake/providers', (_req, res) => {
        const available = Object.entries(providerConfigs)
          .filter(([id]) => apiKeys[id])
          .map(([id, cfg]) => ({ id, name: cfg.name, defaultModel: cfg.defaultModel, variants: cfg.variants }));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(available));
      });

      // GET /api/rag/status — RAG health check endpoint
      server.middlewares.use('/api/rag/status', async (_req, res) => {
        try {
          const localChunks = chunkKnowledgeBase();
          const db = getAdminDb();

          if (!db) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              healthy: false,
              error: 'Firebase Admin not initialized — check GCloud ADC credentials',
              localKB: { totalChunks: localChunks.length },
              firestore: { total: 0, text: 0, images: 0, withEmbedding: 0, withoutEmbedding: 0 },
              sync: { missing: localChunks.length, orphaned: 0, coverage: 0 },
              ingest: lastIngestStatus,
            }));
            return;
          }

          const snapshot = await db.collection('companies/dtgo/kbChunks').select('contentHash', 'embedding', 'type').get();

          let withEmbedding = 0;
          let withoutEmbedding = 0;
          let textChunks = 0;
          let imageChunks = 0;

          for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.type === 'image') imageChunks++;
            else textChunks++;
            if (data.embedding && typeof data.embedding === 'object') withEmbedding++;
            else withoutEmbedding++;
          }

          const firestoreIds = new Set(snapshot.docs.map(d => d.id));
          const localIds = new Set(localChunks.map(c => c.id));
          const missing = localChunks.filter(c => !firestoreIds.has(c.id)).length;
          const orphaned = snapshot.docs.filter(d => d.data().type !== 'image' && !localIds.has(d.id)).length;

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            healthy: missing === 0 && withoutEmbedding === 0 && orphaned === 0,
            firestore: { total: snapshot.size, text: textChunks, images: imageChunks, withEmbedding, withoutEmbedding },
            localKB: { totalChunks: localChunks.length },
            sync: { missing, orphaned, coverage: localChunks.length > 0 ? Math.round((1 - missing / localChunks.length) * 100) : 100 },
            ingest: lastIngestStatus,
          }));
        } catch (err) {
          console.error('[rag/status] Error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
        }
      });

      // ── Chat API endpoints ──

      // GET /api/chat/sessions — list all chat sessions (summary, no messages)
      // GET /api/chat/session/:id — full session with messages
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next();

        if (req.url === '/api/chat/sessions') {
          const sessions = readChatArchive();
          const summaries = sessions.map(s => ({
            id: s.id, title: s.title, createdAt: s.createdAt, updatedAt: s.updatedAt,
            provider: s.provider, model: s.model, messageCount: s.messages.length,
          }));
          summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(summaries));
          return;
        }

        const sessionMatch = req.url?.match(/^\/api\/chat\/session\/([a-f0-9-]+)$/);
        if (sessionMatch) {
          const sessions = readChatArchive();
          const session = sessions.find(s => s.id === sessionMatch[1]);
          res.setHeader('Content-Type', 'application/json');
          if (session) { res.end(JSON.stringify(session)); }
          else { res.statusCode = 404; res.end(JSON.stringify({ error: 'Session not found' })); }
          return;
        }

        next();
      });

      // POST /api/chat/session — create new session
      // PUT  /api/chat/session/:id — update session messages
      // DELETE /api/chat/session/:id — delete session
      server.middlewares.use(async (req, res, next) => {
        const sessionMatch = req.url?.match(/^\/api\/chat\/session(?:\/([a-f0-9-]+))?$/);
        if (!sessionMatch) return next();

        if (req.method === 'POST' && !sessionMatch[1]) {
          const body = await readBody(req);
          const session: ChatSession = {
            id: crypto.randomUUID(),
            title: 'New Chat',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            provider: body.provider || 'claude',
            model: body.model || 'claude-sonnet-4-6',
            messages: [],
          };
          const sessions = readChatArchive();
          sessions.unshift(session);
          writeChatArchive(sessions);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ id: session.id }));
          return;
        }

        if (req.method === 'PUT' && sessionMatch[1]) {
          const body = await readBody(req);
          const sessions = readChatArchive();
          const idx = sessions.findIndex(s => s.id === sessionMatch[1]);
          if (idx < 0) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Session not found' }));
            return;
          }
          if (body.messages) sessions[idx].messages = body.messages;
          if (body.title) sessions[idx].title = body.title;
          if (body.provider) sessions[idx].provider = body.provider;
          if (body.model) sessions[idx].model = body.model;
          sessions[idx].updatedAt = new Date().toISOString();
          writeChatArchive(sessions);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (req.method === 'DELETE' && sessionMatch[1]) {
          const sessions = readChatArchive();
          const filtered = sessions.filter(s => s.id !== sessionMatch[1]);
          writeChatArchive(filtered);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        next();
      });

      // POST /api/chat/stream — SSE streaming chat with RAG
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/api/chat/stream') return next();

        let body: any;
        try {
          body = await readBody(req);
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid request body' }));
          return;
        }

        const messages: ChatMessage[] = body.messages || [];
        const provider: string = body.provider || 'claude';
        const model: string = body.model || '';

        if (messages.length === 0 || !messages.some(m => m.role === 'user')) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'At least one user message is required' }));
          return;
        }

        const key = apiKeys[provider];
        if (!key) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: `No API key for provider: ${provider}` })); return; }

        // Extract last user message for KB retrieval
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        let kbContext = '';
        let retrievalMethod = 'none';

        if (lastUserMsg) {
          // Tier 1: Vector search (RAG) via Firestore
          if (apiKeys.gemini) {
            try {
              const chunks = await findRelevantChunks(lastUserMsg.content, apiKeys.gemini, 8);
              if (chunks && chunks.length > 0) {
                kbContext = formatChunksAsContext(chunks);
                retrievalMethod = 'rag';
                console.log(`[Chat] RAG: ${chunks.length} chunks retrieved for "${lastUserMsg.content.slice(0, 60)}"`);
              }
            } catch (err) {
              console.warn('[Chat] RAG failed:', (err as Error).message, '— falling back to local search');
            }
          }

          // Tier 2: Local KB keyword search fallback
          if (!kbContext) {
            const localResult = localKbSearch(lastUserMsg.content, masterIndex, registry);
            if (localResult) {
              kbContext = localResult;
              retrievalMethod = 'local';
              console.log(`[Chat] Local KB: found context for "${lastUserMsg.content.slice(0, 60)}"`);
            } else {
              console.warn(`[Chat] WARNING: No KB context for "${lastUserMsg.content.slice(0, 80)}"`);
            }
          }
        }

        const systemPrompt = kbContext
          ? `You are a knowledgeable assistant for the DTGO Corporation knowledge base.\n\nRULES:\n- ONLY state facts that appear in the KNOWLEDGE BASE CONTEXT below. Do not editorialize, speculate, or add filler commentary.\n- If the context doesn't contain information to answer the question, say so plainly. Do not fabricate details.\n- Never generate generic corporate praise like "meaningful step forward" or "exciting development." If the KB doesn't say it, you don't say it.\n- Quote or closely paraphrase the source material. Cite which file/section the information comes from when possible.\n- Never tell users to "contact DTGO" or suggest they reach out elsewhere — you ARE the DTGO knowledge base.\n- Keep answers direct and factual.\n\nKNOWLEDGE BASE CONTEXT:\n${kbContext}`
          : 'You are a knowledgeable assistant for the DTGO Corporation knowledge base. The knowledge base retrieval is temporarily limited. RULES: Only state what you actually know to be true. Do not fabricate details or add generic corporate commentary. Never tell users to "contact DTGO" or suggest they reach out elsewhere — you ARE the DTGO knowledge base. If you cannot find specific information, say plainly that the knowledge base lookup failed and suggest they rephrase or try again.';

        const streamReq = buildStreamRequest(provider, key, model, systemPrompt, messages);
        if (!streamReq) { res.statusCode = 400; res.end(JSON.stringify({ error: `Unsupported provider: ${provider}` })); return; }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // Send retrieval metadata before streaming begins
        res.write(`data: ${JSON.stringify({ meta: { retrieval: retrievalMethod } })}\n\n`);

        try {
          const apiRes = await fetch(streamReq.url, streamReq.init);
          if (!apiRes.ok) {
            const errText = await apiRes.text();
            res.write(`data: ${JSON.stringify({ error: `Provider error ${apiRes.status}: ${errText.slice(0, 200)}` })}\n\n`);
            res.end();
            return;
          }

          const reader = apiRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop()!;
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') break;
                const token = parseStreamChunk(provider, dataStr);
                if (token) res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
              }
            }
          }

          res.write('data: [DONE]\n\n');
          res.end();
        } catch (err) {
          console.error('[Chat] Streaming error:', err);
          try { res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`); } catch {}
          res.end();
        }
      });

      // GET /api/intake/sessions (list) and GET /api/intake/session/:id (single)
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next();

        // List all sessions
        if (req.url === '/api/intake/sessions') {
          // Auto-expire zombie sessions stuck in 'processing' for over 5 minutes
          // Use processingStartedAt if set (reprocess sets this), otherwise fall back to timestamp
          const STALE_MS = 5 * 60 * 1000;
          const allSessions = readArchive();
          let dirty = false;
          for (const s of allSessions) {
            if (s.status === 'processing') {
              const startedAt = (s as any).processingStartedAt || s.timestamp;
              if (Date.now() - new Date(startedAt).getTime() > STALE_MS) {
                s.status = 'error';
                s.error = 'Processing timed out — server may have restarted. Try rerunning.';
                dirty = true;
              }
            }
          }
          if (dirty) writeArchive(allSessions);

          const sessions = allSessions.map(s => ({
            id: s.id, timestamp: s.timestamp, provider: s.provider, model: s.model,
            status: s.status, sourceExcerpt: s.sourceExcerpt, error: s.error,
            matchCount: s.result?.matches?.length || 0,
            conflictCount: s.result?.conflicts?.length || 0,
            approvals: s.approvals, appliedAt: s.appliedAt, resolvedAt: s.resolvedAt,
            rejectionReasons: s.rejectionReasons,
            attachmentNames: s.attachments?.map(a => a.filename) || [],
          }));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sessions.reverse()));
          return;
        }

        // Single session by ID
        const match = req.url?.match(/^\/api\/intake\/session\/([a-f0-9-]+)/);
        if (!match) return next();
        const session = readArchive().find(s => s.id === match[1]);
        if (!session) { res.statusCode = 404; res.end('Session not found'); return; }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(session));
      });

      // DELETE /api/intake/session/:id
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'DELETE') return next();
        const match = req.url?.match(/^\/api\/intake\/session\/([a-f0-9-]+)/);
        if (!match) return next();
        const sessions = readArchive();
        const filtered = sessions.filter(s => s.id !== match[1]);
        if (filtered.length === sessions.length) { res.statusCode = 404; res.end('Session not found'); return; }
        writeArchive(filtered);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ deleted: true }));
      });

      // POST /api/intake/apply — with pre-apply validation
      // Serialized through applyLock to prevent concurrent writes
      let applyLock: Promise<void> = Promise.resolve();
      server.middlewares.use('/api/intake/apply', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }

        // Read body outside the lock (I/O can overlap)
        const body = await readBody(req);

        // Serialize: only one apply runs at a time
        let resolve!: () => void;
        const ticket = new Promise<void>(r => { resolve = r; });
        const prev = applyLock;
        applyLock = ticket;
        await prev;

        try {
        const { sessionId, approvals, contentEdits = {}, rejectionReasons = {} } = body;
        const sessions = readArchive();
        const session = sessions.find(s => s.id === sessionId);
        if (!session || !session.result) { res.statusCode = 404; res.end('Session not found'); resolve(); return; }

        const validationResults: { index: number; valid: boolean; issues: string[]; applied: boolean }[] = [];
        const affectedFiles: string[] = [];
        const pendingFileEdits = new Map<string, PendingEdit[]>();
        const matchIndexForEdit = new Map<string, number[]>(); // track which match indices map to each file
        const haiku = apiKeys.claude; // Use Haiku for validation

        for (const [indexStr, decision] of Object.entries(approvals)) {
          if (decision !== 'approved') continue;
          const idx = Number(indexStr);
          const match = session.result.matches[idx];
          if (!match) continue;

          // Per-match guard: skip matches already written to disk
          if (match.appliedAt) {
            validationResults.push({ index: idx, valid: true, issues: ['Already applied — skipped'], applied: false });
            continue;
          }

          // Hard block: reject matches flagged as duplicates during AI processing
          if (match.isDuplicate) {
            validationResults.push({ index: idx, valid: false, issues: ['Blocked — flagged as duplicate during processing'], applied: false });
            continue;
          }

          // Normalize: strip .md extension and leading _ (models sometimes include them)
          const fileSlug = (match.file || '').replace(/\.md$/, '').replace(/(^|\/)_/g, '$1');

          let filePath = path.join(KB_DIR, `${fileSlug}.md`);
          if (!fs.existsSync(filePath)) {
            // Try _prefix (e.g., _index.md)
            const alt = path.join(KB_DIR, `_${fileSlug}.md`);
            if (fs.existsSync(alt)) filePath = alt;
            // Try as directory with _index.md (e.g., people → people/_index.md)
            else {
              const dirIndex = path.join(KB_DIR, fileSlug, '_index.md');
              if (fs.existsSync(dirIndex)) filePath = dirIndex;
              else {
                // Auto-create the file with standard frontmatter for append/new_section actions
                const actionLc = (match.action || '').toLowerCase();
                if (actionLc === 'append' || actionLc === 'new_section') {
                  const title = fileSlug.charAt(0).toUpperCase() + fileSlug.slice(1);
                  const today = new Date().toISOString().slice(0, 10);
                  const frontmatter = `---\ntitle: "${title}"\nscope: ""\nupdated: "${today}"\n---\n\n# ${title}\n`;
                  // Ensure parent directory exists
                  const dir = path.dirname(filePath);
                  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                  fs.writeFileSync(filePath, frontmatter);
                  console.log(`[intake] Auto-created KB file: ${filePath}`);
                } else {
                  validationResults.push({ index: idx, valid: false, issues: ['File not found'], applied: false }); continue;
                }
              }
            }
          }

          // Read target file and extract section for validation
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          let sectionContent = '';
          if (match.section) {
            const sectionName = match.section.replace(/^##\s*/, '');
            const sectionRegex = new RegExp(`^##\\s+${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');
            const sMatch = sectionRegex.exec(fileContent);
            if (sMatch) {
              const rest = fileContent.slice(sMatch.index);
              const nextH2 = rest.indexOf('\n## ', 1);
              sectionContent = nextH2 >= 0 ? rest.slice(0, nextH2) : rest;
            }
          }

          // Handle find-replace actions (e.g., rename operations)
          const actionLower = (match.action || '').toLowerCase();
          if (actionLower === 'find_replace' || actionLower === 'find-replace' || actionLower === 'find_and_replace' || actionLower === 'replace') {
            const details = (match as any).details || {};
            const searchPattern = details.searchPattern || details.search || '';
            const replacement = details.replacement || details.replace || '';
            if (searchPattern && replacement) {
              applyFindReplace(filePath, searchPattern, replacement);
              affectedFiles.push(filePath);
              validationResults.push({ index: idx, valid: true, issues: [], applied: true });
            } else {
              validationResults.push({ index: idx, valid: false, issues: ['Missing search/replace pattern'], applied: false });
            }
            continue;
          }

          // Handle alias update actions
          if (actionLower === 'update_alias' || actionLower === 'update-alias') {
            const details = (match as any).details || {};
            // Find the old alias and replace with new in the file
            const oldAliases = details.currentAliases || [];
            const newAliases = details.updatedAliases || [];
            if (oldAliases.length > 0 && newAliases.length > 0) {
              let raw = fs.readFileSync(filePath, 'utf-8');
              for (let ai = 0; ai < oldAliases.length; ai++) {
                if (oldAliases[ai] !== newAliases[ai] && newAliases[ai]) {
                  raw = raw.split(oldAliases[ai]).join(newAliases[ai]);
                }
              }
              const today = new Date().toISOString().slice(0, 10);
              raw = raw.replace(/^(updated:\s*)"?[^"\n]*"?/m, `$1"${today}"`);
              fs.writeFileSync(filePath, raw);
              affectedFiles.push(filePath);
              validationResults.push({ index: idx, valid: true, issues: [], applied: true });
            } else {
              validationResults.push({ index: idx, valid: false, issues: ['Missing alias data'], applied: false });
            }
            continue;
          }

          // Standard actions (append, update, new_section, conflict)
          // Validate with Haiku (cheap + fast)
          let contentToApply = contentEdits[String(idx)] ?? match.content ?? (match as any).description ?? '';
          if (haiku) {
            try {
              const valPrompt = `You are a knowledge base quality checker. Validate and FIX this proposed addition.

EXISTING SECTION CONTENT:
${sectionContent || '(section does not exist yet — will be created)'}

PROPOSED ADDITION:
${contentToApply}

SCHEMA RULES:
- Person entries MUST use: ### Name — Role, Org\\n\\n\`Tag\` · \`Org\`\\n\\nNarrative prose paragraphs\\n\\n**Sources:** citation
- NEVER bullet-point lists for person entries — convert to prose if found
- Check if this person/entity already exists in the EXISTING SECTION CONTENT above (DUPLICATE check)

CONSTRAINTS — DO NOT VIOLATE:
- Do NOT create new ### person entries from names that only appear in **Sources:** lines. Source attributions are citations, not entity data.
- Do NOT add new headings, sections, or entries that are not already in the PROPOSED ADDITION. Your job is to reformat what exists, not expand it.
- The fixedContent MUST have the same number of ### entries as the PROPOSED ADDITION. If the proposed addition has zero ### entries, the fixedContent must also have zero.
- If the proposed addition is a duplicate of content already in the EXISTING SECTION, set valid to false and do not provide fixedContent.

Return ONLY valid JSON:
{ "valid": true/false, "issues": ["list of warnings"], "fixedContent": "corrected content or null if duplicate" }`;

              const valRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': haiku, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 2048, messages: [{ role: 'user', content: valPrompt }] }),
              });

              if (valRes.ok) {
                const valData = await valRes.json();
                const valText = valData.content?.[0]?.text || '';
                const valJson = parseAiJson(valText);

                if (!valJson.valid) {
                  if (valJson.fixedContent) {
                    contentToApply = valJson.fixedContent;
                    validationResults.push({ index: idx, valid: true, issues: valJson.issues || [], applied: true });
                  } else {
                    // Invalid with no fix — SKIP this match
                    validationResults.push({
                      index: idx, valid: false,
                      issues: [...(valJson.issues || []), 'Validation failed with no fixedContent — skipped'],
                      applied: false
                    });
                    continue;
                  }
                } else {
                  // Valid — use fixedContent if provided (may have minor formatting fixes)
                  if (valJson.fixedContent) contentToApply = valJson.fixedContent;
                  validationResults.push({ index: idx, valid: true, issues: [], applied: true });
                }
              } else {
                // Validation API failed — proceed but flag prominently
                validationResults.push({ index: idx, valid: true, issues: ['WARNING: Haiku validation unavailable — content applied without AI review'], applied: true });
              }
            } catch (valErr) {
              // Validation threw — proceed but flag prominently
              console.error('[intake] Haiku validation error for match', idx, ':', valErr);
              validationResults.push({ index: idx, valid: true, issues: ['WARNING: Haiku validation error — content applied without AI review'], applied: true });
            }
          } else {
            validationResults.push({ index: idx, valid: true, issues: ['No validation key'], applied: true });
          }

          // Deterministic pre-flight duplicate check against current file state
          const dupReason = checkForDuplicate(filePath, match.action, match.section, contentToApply);
          if (dupReason) {
            match.applyError = dupReason;
            // Override the optimistic validation result with a skip
            const existingVr = validationResults.find(v => v.index === idx);
            if (existingVr) { existingVr.valid = false; existingVr.issues = [`BOUNCED: ${dupReason}`]; existingVr.applied = false; }
            else { validationResults.push({ index: idx, valid: false, issues: [`BOUNCED: ${dupReason}`], applied: false }); }
            continue;
          }

          // Append intake source reference to content
          const sessionTag = `[intake:${session.id.slice(0, 8)}]`;
          if (contentToApply.includes('**Sources:**') && !contentToApply.includes(sessionTag)) {
            contentToApply = contentToApply.replace(/(\*\*Sources:\*\*.*)$/, `$1 ${sessionTag}`);
          } else if (!contentToApply.includes('**Sources:**')) {
            contentToApply = contentToApply.trimEnd() + `\n\n**Sources:** intake ${sessionTag}`;
          }

          // Collect standard edits for batched per-file application
          if (!pendingFileEdits.has(filePath)) { pendingFileEdits.set(filePath, []); matchIndexForEdit.set(filePath, []); }
          pendingFileEdits.get(filePath)!.push({ section: match.section, action: match.action, content: contentToApply });
          matchIndexForEdit.get(filePath)!.push(idx);
          affectedFiles.push(filePath);
        }

        // Apply batched edits: one read-write cycle per file, bottom-to-top ordering
        for (const [filePath, edits] of pendingFileEdits) {
          applyEditsToFile(filePath, edits);
        }

        // Stamp appliedAt on each successfully written match
        const now = new Date().toISOString();
        for (const vr of validationResults) {
          if (vr.applied && session.result?.matches[vr.index]) {
            session.result.matches[vr.index].appliedAt = now;
          }
        }

        // Update session approvals and rejection reasons
        session.approvals = { ...(session.approvals || {}), ...approvals };
        if (Object.keys(rejectionReasons).length > 0) {
          session.rejectionReasons = { ...(session.rejectionReasons || {}), ...rejectionReasons };
        }

        // Session-level appliedAt: informational timestamp of first apply
        const hasApplied = validationResults.some(v => v.applied);
        if (hasApplied && !session.appliedAt) {
          session.appliedAt = now;
        }

        // Check if fully resolved (every match decided, applied, or duplicate)
        const matchCount = session.result?.matches?.length || 0;
        const mergedApprovals = session.approvals;
        const allResolved = matchCount > 0 && Array.from({ length: matchCount }, (_, i) => {
          const idx = String(i);
          const match = session.result?.matches[i];
          return mergedApprovals[idx] === 'approved' || mergedApprovals[idx] === 'dismissed'
            || match?.appliedAt || match?.isDuplicate;
        }).every(Boolean);
        if (allResolved) {
          session.resolvedAt = new Date().toISOString();
        }

        writeArchive(sessions);

        // Git commit
        const uniqueAffected = [...new Set(affectedFiles)];
        if (uniqueAffected.length > 0) {
          try {
            await gitCommit(uniqueAffected, `intake: ${session.result.summary || 'applied approved changes'}`);
          } catch (gitErr) {
            console.error('[intake] git commit failed — changes applied but NOT committed:', gitErr);
            validationResults.push({
              index: -1, valid: true,
              issues: ['WARNING: Changes applied but git commit failed — no audit trail for this write'],
              applied: true
            });
          }
        }

        // Rebuild master index
        masterIndex = buildMasterIndex();

        // Auto-ingest: update vector store in background (tracked)
        lastIngestStatus = { status: 'running', startedAt: new Date().toISOString() };
        exec('npm run ingest', { cwd: __dirname }, (err) => {
          if (err) {
            console.warn('[intake] Auto-ingest failed:', err.message);
            lastIngestStatus = { status: 'failed', startedAt: lastIngestStatus.startedAt, completedAt: new Date().toISOString(), error: err.message };
          } else {
            console.log('[intake] Auto-ingest complete — vector store updated');
            lastIngestStatus = { status: 'success', startedAt: lastIngestStatus.startedAt, completedAt: new Date().toISOString() };
          }
        });

        const applied = validationResults.filter(v => v.applied).length;
        const skipped = validationResults.filter(v => !v.applied).length;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ applied, skipped, validationResults }));
        } catch (err: unknown) {
          console.error('[intake/apply] Unhandled error:', err);
          if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ applied: 0, skipped: 0, validationResults: [], error: err instanceof Error ? err.message : 'Unknown error' })); }
        } finally {
          resolve();
        }
      });

      // POST /api/intake/dismiss — dismiss rejected items
      server.middlewares.use('/api/intake/dismiss', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = await readBody(req);
          const { sessionId, dismissals = [], rejectionReasons = {} } = body;
          const sessions = readArchive();
          const session = sessions.find(s => s.id === sessionId);
          if (!session) { res.statusCode = 404; res.end('Session not found'); return; }

          // Mark specified indices as dismissed
          for (const idx of dismissals) {
            const key = String(idx);
            if (session.approvals[key] === 'rejected') {
              session.approvals[key] = 'dismissed';
            }
          }

          // Store rejection reasons if provided
          if (Object.keys(rejectionReasons).length > 0) {
            session.rejectionReasons = { ...(session.rejectionReasons || {}), ...rejectionReasons };
          }

          // Check if fully resolved (every match decided, applied, or duplicate)
          const matchCount = session.result?.matches?.length || 0;
          const allResolved = matchCount > 0 && Array.from({ length: matchCount }, (_, i) => {
            const idx = String(i);
            const match = session.result?.matches[i];
            return session.approvals[idx] === 'approved' || session.approvals[idx] === 'dismissed'
              || match?.appliedAt || match?.isDuplicate;
          }).every(Boolean);
          if (allResolved) {
            session.resolvedAt = new Date().toISOString();
          }

          writeArchive(sessions);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ dismissed: dismissals.length, resolvedAt: session.resolvedAt || null }));
        } catch (err: unknown) {
          console.error('[intake/dismiss] Error:', err);
          if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' })); }
        }
      });

      // POST /api/intake/reeval-match — AI re-evaluation of a single match against current KB
      server.middlewares.use('/api/intake/reeval-match', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = await readBody(req);
          const { sessionId, matchIndex } = body;
          const sessions = readArchive();
          const session = sessions.find(s => s.id === sessionId);
          if (!session?.result) { res.statusCode = 404; res.end('Session not found'); return; }

          const match = session.result.matches[matchIndex];
          if (!match) { res.statusCode = 400; res.end('Invalid match index'); return; }

          const haiku = apiKeys.claude;
          if (!haiku) { res.statusCode = 500; res.end('Claude API key not set'); return; }

          // Read target file + section from KB
          const fileSlug = (match.file || '').replace(/\.md$/, '').replace(/(^|\/)_/g, '$1');
          let filePath = path.join(KB_DIR, `${fileSlug}.md`);
          let fileContent = '';
          if (fs.existsSync(filePath)) {
            fileContent = fs.readFileSync(filePath, 'utf-8');
          } else {
            const alt = path.join(KB_DIR, `_${fileSlug}.md`);
            if (fs.existsSync(alt)) fileContent = fs.readFileSync(alt, 'utf-8');
            else {
              const dirIndex = path.join(KB_DIR, fileSlug, '_index.md');
              if (fs.existsSync(dirIndex)) fileContent = fs.readFileSync(dirIndex, 'utf-8');
            }
          }

          let sectionContent = '';
          if (match.section && fileContent) {
            const sectionName = match.section.replace(/^##\s*/, '');
            const sectionRegex = new RegExp(`^##\\s+${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm');
            const sMatch = sectionRegex.exec(fileContent);
            if (sMatch) {
              const rest = fileContent.slice(sMatch.index);
              const nextH2 = rest.indexOf('\n## ', 1);
              sectionContent = nextH2 >= 0 ? rest.slice(0, nextH2) : rest;
            }
          }

          const reevalPrompt = `You are evaluating whether a proposed content change should be applied to a knowledge base file.

TARGET FILE: ${match.file}
TARGET SECTION: ${match.section || '(top-level)'}
PROPOSED ACTION: ${match.action}

PROPOSED CONTENT TO ADD/UPDATE:
${match.content}

CURRENT FILE CONTENT:
${fileContent || '(file not found)'}

${sectionContent ? `CURRENT SECTION CONTENT:\n${sectionContent}` : ''}

Evaluate this proposed change:
1. Is this content already present in the file (duplicate)?
2. Is this content relevant to this file/section?
3. Is the content accurate and well-written?
4. Would applying this improve the knowledge base?

Respond with ONLY valid JSON (no markdown fences):
{
  "recommendation": "approve" or "reject",
  "reason": "one-sentence explanation",
  "duplicateOf": "section name if duplicate, otherwise null",
  "confidence": "high" or "medium" or "low"
}`;

          const { url, init } = providerConfigs.claude.buildRequest(haiku, 'claude-haiku-4-5', reevalPrompt, 'Evaluate this proposed KB change.');
          const apiRes = await fetch(url, init);
          if (!apiRes.ok) { res.statusCode = apiRes.status; res.end(`AI eval failed: ${await apiRes.text()}`); return; }

          const apiData = await apiRes.json();
          const text = providerConfigs.claude.extractText(apiData);
          let result;
          try { result = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()); } catch { result = { recommendation: 'approve', reason: 'Could not parse AI response', confidence: 'low' }; }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: unknown) {
          console.error('[intake/reeval-match] Error:', err);
          if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' })); }
        }
      });

      // POST /api/intake/reprocess — refine results with clarification answers
      server.middlewares.use('/api/intake/reprocess', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
        const body = await readBody(req);
        const { sessionId, clarificationAnswers, conflictResolutions = {}, contentEdits = {} } = body;
        const sessions = readArchive();
        const session = sessions.find(s => s.id === sessionId);
        if (!session?.result || !session.sourceText) { res.statusCode = 404; res.end('Session not found'); return; }

        const haiku = apiKeys.claude;
        if (!haiku) { res.statusCode = 500; res.end('Claude API key not set'); return; }

        // Snapshot ALL matches and their approval states before AI call
        const oldMatches = session.result?.matches || [];
        const oldApprovals = { ...session.approvals };

        // Separate: matches that were edited (need AI refinement) vs untouched (preserve as-is)
        const editedIndices = new Set(Object.keys(contentEdits).map(Number));
        const clarificationIndices = new Set(Object.keys(clarificationAnswers || {}).map(Number));
        const conflictIndices = new Set(Object.keys(conflictResolutions).filter(k => conflictResolutions[k]?.trim()).map(Number));
        const touchedIndices = new Set([...editedIndices, ...clarificationIndices, ...conflictIndices]);

        // Only send touched matches to AI for refinement; preserve everything else
        const matchesToRefine = oldMatches.filter((_, i) => touchedIndices.has(i));
        const preservedMatches: { match: any; index: number; status?: string }[] = [];
        for (let i = 0; i < oldMatches.length; i++) {
          if (!touchedIndices.has(i)) {
            preservedMatches.push({ match: oldMatches[i], index: i, status: oldApprovals[String(i)] });
          }
        }

        // Mark session as reprocessing so UI shows spinner
        session.status = 'processing';
        (session as any).processingStartedAt = new Date().toISOString();
        writeArchive(sessions);

        try {
          // Only call AI if there are actually matches to refine
          let refinedMatches: any[] = [];
          let parsedConflicts: string[] | null = null;
          if (matchesToRefine.length > 0) {
            const reprocessPrompt = `You previously analyzed source text and returned intake suggestions. The user has edited some matches or answered clarification questions. Refine ONLY the items below based on their input.

ORIGINAL SOURCE TEXT:
${session.sourceText}

MATCHES TO REFINE (only these — do NOT add new matches beyond what's here):
${JSON.stringify(matchesToRefine, null, 2)}

USER'S CLARIFICATION ANSWERS:
${JSON.stringify(clarificationAnswers, null, 2)}

USER'S CONTENT EDITS (the user manually modified these match contents — preserve their changes):
${Object.keys(contentEdits).length > 0 ? JSON.stringify(contentEdits, null, 2) : 'None'}

USER'S CONFLICT RESOLUTIONS (the user provided guidance on how to resolve conflicts — follow their instructions):
${Object.keys(conflictResolutions).length > 0 ? JSON.stringify(conflictResolutions, null, 2) : 'None'}

MASTER INDEX:
${JSON.stringify(masterIndex, null, 2)}

Return ONLY the refined versions of the matches above. Do NOT regenerate untouched matches — those are preserved separately. Do NOT add new matches. Resolve conflicts using the user's guidance. If a match was edited, use the user's edited content as the base.

Return ONLY valid JSON with this structure, no markdown fences:
{ "matches": [...], "conflicts": [], "newFiles": [], "summary": "" }`;

            const { url, init } = providerConfigs.claude.buildRequest(haiku, 'claude-haiku-4-5', reprocessPrompt, 'Refine the intake based on user edits.');
            const apiRes = await fetch(url, init);

            if (!apiRes.ok) {
              const errText = await apiRes.text();
              // Restore session state on failure
              session.status = 'ready';
              writeArchive(sessions);
              res.statusCode = apiRes.status;
              res.end(`Reprocess error: ${errText}`);
              return;
            }

            const apiData = await apiRes.json();
            const content = providerConfigs.claude.extractText(apiData);
            const parsed = parseAiJson(content);
            refinedMatches = Array.isArray(parsed.matches) ? parsed.matches : [];
            parsedConflicts = Array.isArray(parsed.conflicts) ? parsed.conflicts : [];
          }

          // Append clarification answers to the source document
          const answerText = Object.entries(clarificationAnswers || {})
            .filter(([, v]: [string, any]) => v.selected || v.note)
            .map(([, v]: [string, any]) => {
              const parts: string[] = [];
              if (v.selected) parts.push(`Selected: ${v.selected}`);
              if (v.note) parts.push(`Note: ${v.note}`);
              return parts.join(' — ');
            })
            .join('\n');

          if (answerText) {
            session.sourceText = `${session.sourceText}\n\n--- User Clarifications (${new Date().toISOString()}) ---\n${answerText}`;
          }

          // Rebuild matches: preserved (untouched) in original order, refined appended at end
          const finalMatches: any[] = [];
          const newApprovals: Record<string, 'approved' | 'rejected' | 'dismissed'> = {};

          // First: all preserved matches in their original positions
          for (const p of preservedMatches) {
            const newIdx = finalMatches.length;
            finalMatches.push(p.match);
            if (p.status) newApprovals[String(newIdx)] = p.status as any;
          }

          // Then: refined matches (these are new/updated — no approval set)
          for (const m of refinedMatches) {
            finalMatches.push(m);
          }

          const finalResult = {
            matches: finalMatches,
            conflicts: parsedConflicts !== null ? parsedConflicts : (session.result?.conflicts || []),
            newFiles: session.result?.newFiles || [],
            summary: session.result?.summary || '',
          };

          session.result = finalResult;
          session.matchCount = finalMatches.length;
          session.approvals = newApprovals;
          // Keep appliedAt — those items were already applied to KB
          delete session.resolvedAt; // session has new items to review
          session.status = 'ready';
          writeArchive(sessions);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(parsed));
        } catch (err: unknown) {
          session.status = 'ready';
          writeArchive(sessions);
          res.statusCode = 500;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          res.end(`Reprocess error: ${msg}`);
        }
        } catch (outerErr: unknown) {
          console.error('[intake/reprocess] Unhandled error:', outerErr);
          try {
            const sessions2 = readArchive();
            const s2 = sessions2.find((s: any) => s.id === sessionId);
            if (s2 && s2.status === 'processing') { s2.status = 'ready'; writeArchive(sessions2); }
          } catch { /* ignore */ }
          if (!res.headersSent) { res.statusCode = 500; res.end(`Reprocess error: ${outerErr instanceof Error ? outerErr.message : 'Unknown'}`); }
        }
      });

      // POST /api/kb/reprocess-section — AI-assisted section correction
      server.middlewares.use('/api/kb/reprocess-section', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = await readBody(req);
          const { fileSlug, sectionHeading, correctionNote } = body;

          if (!fileSlug || !sectionHeading || !correctionNote) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'fileSlug, sectionHeading, and correctionNote are required' }));
            return;
          }

          // Read current section content
          const filePath = path.join(KB_DIR, `${fileSlug}.md`);
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `File not found: ${fileSlug}.md` }));
            return;
          }

          const raw = fs.readFileSync(filePath, 'utf-8');
          const level = sectionHeading.startsWith('###') ? 3 : 2;
          const cleanHeading = sectionHeading.replace(/^#+\s*/, '');
          const sectionContent = extractSectionBody(raw, cleanHeading, level);

          if (!sectionContent) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Section "${cleanHeading}" not found in ${fileSlug}.md` }));
            return;
          }

          // Gather RAG context
          const query = `${cleanHeading} ${correctionNote}`;
          const chunks = await findRelevantChunks(query, apiKeys.gemini, 8);
          const ragContext = chunks ? formatChunksAsContext(chunks) : '';

          // Build prompt and call Claude
          const systemPrompt = `You are a knowledge base editor. The user has flagged an inaccuracy in a section.
Rewrite the section incorporating their correction, using related context from
the knowledge base to ensure accuracy. Preserve the existing formatting schema.
Return ONLY the corrected section markdown (no JSON wrapping).

EXISTING SECTION:
${sectionContent}

USER'S CORRECTION:
${correctionNote}

RELATED KB CONTEXT (from RAG):
${ragContext}

FORMATTING: Match the existing style exactly. Person entries use ### Name — Role, Organization format.`;

          const key = apiKeys.claude;
          if (!key) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Claude API key not configured' }));
            return;
          }

          const { url, init } = providerConfigs.claude.buildRequest(
            key, 'claude-sonnet-4-6', systemPrompt, `Please rewrite this section with the correction applied.`
          );
          const apiRes = await fetch(url, init);
          if (!apiRes.ok) {
            const errText = await apiRes.text();
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Claude API error: ${errText}` }));
            return;
          }

          const data = await apiRes.json();
          const redrafted = providerConfigs.claude.extractText(data);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ original: sectionContent, redrafted, fileSlug, sectionHeading: cleanHeading }));
        } catch (err: unknown) {
          console.error('[kb/reprocess-section] Error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
          }
        }
      });

      // POST /api/kb/apply-section — apply an approved section rewrite
      server.middlewares.use('/api/kb/apply-section', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = await readBody(req);
          const { fileSlug, sectionHeading, newContent } = body;

          if (!fileSlug || !sectionHeading || !newContent) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'fileSlug, sectionHeading, and newContent are required' }));
            return;
          }

          const filePath = path.join(KB_DIR, `${fileSlug}.md`);
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `File not found: ${fileSlug}.md` }));
            return;
          }

          // Apply the section update
          applyMatchToFile(filePath, sectionHeading, 'update', newContent);

          // Git commit
          try {
            await gitCommit([filePath], `edit: corrected ${sectionHeading} in ${fileSlug}`);
          } catch { /* git commit failure is non-fatal */ }

          // Rebuild master index
          masterIndex = buildMasterIndex();

          // Auto-ingest: update vector store in background
          exec('npm run ingest', { cwd: __dirname }, (err) => {
            if (err) console.warn('[intake] Auto-ingest failed:', err.message);
            else console.log('[intake] Auto-ingest complete — vector store updated');
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, fileSlug, sectionHeading }));
        } catch (err: unknown) {
          console.error('[kb/apply-section] Error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
          }
        }
      });

      // POST /api/kb/person-email — add or update email for a person
      server.middlewares.use('/api/kb/person-email', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
          const body = await readBody(req);
          const { fileSlug, personName, email } = body;
          if (!fileSlug || !personName || !email) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'fileSlug, personName, and email are required' }));
            return;
          }

          const filePath = path.join(KB_DIR, `${fileSlug}.md`);
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `File not found: ${fileSlug}.md` }));
            return;
          }

          let content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          let found = false;

          // Find the ### heading for this person
          for (let i = 0; i < lines.length; i++) {
            const headingMatch = lines[i].match(/^###\s+(.+)$/);
            if (headingMatch && headingMatch[1].trim() === personName) {
              // Find the role backtick line (next non-empty line after heading)
              let roleLineIdx = -1;
              for (let j = i + 1; j < lines.length; j++) {
                const trimmed = lines[j].trim();
                if (trimmed === '') continue;
                if (trimmed.startsWith('`')) { roleLineIdx = j; break; }
                break; // Non-empty, non-backtick line — no role line
              }

              // Check if email line already exists
              const emailLineRegex = /^📧\s*\S+@\S+/;
              const checkStart = roleLineIdx >= 0 ? roleLineIdx + 1 : i + 1;
              let emailLineIdx = -1;
              for (let j = checkStart; j < Math.min(checkStart + 3, lines.length); j++) {
                if (emailLineRegex.test(lines[j].trim())) { emailLineIdx = j; break; }
                if (lines[j].trim() !== '' && !emailLineRegex.test(lines[j].trim())) break;
              }

              if (emailLineIdx >= 0) {
                // Update existing email line
                lines[emailLineIdx] = `📧 ${email}`;
              } else {
                // Insert email after role line (or after heading if no role line)
                const insertIdx = roleLineIdx >= 0 ? roleLineIdx + 1 : i + 1;
                lines.splice(insertIdx, 0, '', `📧 ${email}`);
              }
              found = true;
              break;
            }
          }

          if (!found) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Person not found: ${personName}` }));
            return;
          }

          fs.writeFileSync(filePath, lines.join('\n'));

          try {
            await gitCommit([filePath], `people: add email for ${personName}`);
          } catch { /* non-fatal */ }

          masterIndex = buildMasterIndex();

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (err: unknown) {
          console.error('[kb/person-email] Error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
          }
        }
      });

      // GET /api/attachments — list ALL attachments across divisions
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.url !== '/api/attachments') return next();

        (async () => {
          try {
            const adminDb = getAdminDb();
            if (!adminDb) { res.statusCode = 503; res.end('Firebase Admin not initialized'); return; }
            const docs = await listAllAttachments(adminDb);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(docs));
          } catch (err) {
            res.statusCode = 500;
            res.end(`Error: ${(err as Error).message}`);
          }
        })();
      });

      // GET /api/attachments/:division — list attachments for a division
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        const match = req.url?.match(/^\/api\/attachments\/([^/]+)$/);
        if (!match) return next();
        const division = decodeURIComponent(match[1]);

        (async () => {
          try {
            const adminDb = getAdminDb();
            if (!adminDb) { res.statusCode = 503; res.end('Firebase Admin not initialized'); return; }
            const docs = await listAttachments(adminDb, division);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(docs));
          } catch (err) {
            res.statusCode = 500;
            res.end(`Error: ${(err as Error).message}`);
          }
        })();
      });

      // GET /api/attachments/:id/url — generate signed download URL
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        const match = req.url?.match(/^\/api\/attachments\/([^/]+)\/url$/);
        if (!match) return next();

        (async () => {
          try {
            const adminDb = getAdminDb();
            if (!adminDb) { res.statusCode = 503; res.end('Firebase Admin not initialized'); return; }
            const { getApps: getAdminApps } = await import('firebase-admin/app');
            const { getStorage: getAdminStorage } = await import('firebase-admin/storage');
            const adminApp = getAdminApps()[0];
            const doc = await adminDb.collection('companies/dtgo/attachments').doc(match[1]).get();
            if (!doc.exists) { res.statusCode = 404; res.end('Attachment not found'); return; }
            const data = doc.data()!;
            const bucket = getAdminStorage(adminApp).bucket();
            const url = await getSignedUrl(bucket, data.storagePath);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url }));
          } catch (err) {
            res.statusCode = 500;
            res.end(`Error: ${(err as Error).message}`);
          }
        })();
      });

      // POST /api/upload-attachment — save files to local DTGO_ATTATCHMENTS folder
      const ATTACHMENTS_DIR = '/Users/jeffreyfullerton/PHYLA_BACKEND/lbe_data/DTGO_ATTATCHMENTS';
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/api/upload-attachment') return next();

        (async () => {
          try {
            // Ensure directory exists
            if (!fs.existsSync(ATTACHMENTS_DIR)) {
              fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
            }

            const { files } = await readMultipartBody(req);
            const saved: { filename: string; mimeType: string; fileSize: number; uploadedAt: string }[] = [];

            for (const file of files) {
              const filePath = path.join(ATTACHMENTS_DIR, file.filename);
              fs.writeFileSync(filePath, file.buffer);
              saved.push({
                filename: file.filename,
                mimeType: file.mimeType,
                fileSize: file.buffer.length,
                uploadedAt: new Date().toISOString(),
              });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(saved));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        })();
      });

      // GET /api/local-attachments — list files in local DTGO_ATTATCHMENTS folder
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || req.url !== '/api/local-attachments') return next();

        try {
          if (!fs.existsSync(ATTACHMENTS_DIR)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
          }

          const mimeMap: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.csv': 'text/csv',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };

          const entries = fs.readdirSync(ATTACHMENTS_DIR);
          const files = entries
            .filter(name => !name.startsWith('.'))
            .map(name => {
              const filePath = path.join(ATTACHMENTS_DIR, name);
              const stat = fs.statSync(filePath);
              if (!stat.isFile()) return null;
              const ext = path.extname(name).toLowerCase();
              return {
                id: `local-${name}`,
                filename: name,
                mimeType: mimeMap[ext] || 'application/octet-stream',
                division: '',
                storagePath: filePath,
                uploadedAt: stat.mtime.toISOString(),
                fileSize: stat.size,
                source: 'local' as const,
              };
            })
            .filter(Boolean);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(files));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });

      // GET /api/local-attachments/:filename — serve a local file for viewing
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        const match = req.url?.match(/^\/api\/local-attachments\/(.+)$/);
        if (!match) return next();
        const filename = decodeURIComponent(match[1]);
        const filePath = path.join(ATTACHMENTS_DIR, filename);

        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end('File not found');
          return;
        }

        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.pdf': 'application/pdf', '.csv': 'text/csv', '.png': 'image/png',
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
          '.webp': 'image/webp', '.svg': 'image/svg+xml',
        };
        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      });

      // POST /api/rename-attachment — rename a local file
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/api/rename-attachment') return next();

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { oldName, newName } = JSON.parse(body);
            if (!oldName || !newName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'oldName and newName required' }));
              return;
            }
            const oldPath = path.join(ATTACHMENTS_DIR, oldName);
            const newPath = path.join(ATTACHMENTS_DIR, newName);
            if (!fs.existsSync(oldPath)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'File not found' }));
              return;
            }
            fs.renameSync(oldPath, newPath);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        });
      });

      // POST /api/intake — background processing with master index
      server.middlewares.use('/api/intake', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }

        // Determine if this is a multipart (file upload) or JSON request
        const contentType = req.headers['content-type'] || '';
        let text: string;
        let provider: string;
        let requestModel: string | undefined;
        let systemInstructions: string | undefined;
        let uploadedFiles: ParsedFile[] = [];

        if (contentType.includes('multipart/form-data')) {
          const { fields, files } = await readMultipartBody(req);
          text = fields.text || '';
          provider = fields.provider || 'claude';
          requestModel = fields.model;
          systemInstructions = fields.systemInstructions;
          uploadedFiles = files;
        } else {
          const body = await readBody(req);
          text = body.text;
          provider = body.provider || 'claude';
          requestModel = body.model;
          systemInstructions = body.systemInstructions;
        }

        const cfg = providerConfigs[provider];
        const key = apiKeys[provider];

        if (!cfg) { res.statusCode = 400; res.end(`Unknown provider: ${provider}`); return; }
        if (!key) { res.statusCode = 500; res.end(`${cfg.name} API key not set`); return; }

        // Check for existing sessions with same source text
        const existingSessions = readArchive();
        const sourceFingerprint = text.trim().slice(0, 500);
        const existingMatch = existingSessions.find(s =>
          s.sourceText?.trim().slice(0, 500) === sourceFingerprint &&
          (s.status === 'ready' || s.status === 'processing')
        );
        if (existingMatch) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 409;
          res.end(JSON.stringify({
            error: 'duplicate_source',
            message: `Already processed in session ${existingMatch.id.slice(0, 8)} (${existingMatch.status}).`,
            existingSessionId: existingMatch.id,
          }));
          return;
        }

        // Create session and return ID immediately
        const sessionId = crypto.randomUUID();
        const now = new Date().toISOString();
        const session: IntakeSession = {
          id: sessionId, timestamp: now,
          provider, model: requestModel || cfg.defaultModel,
          status: 'processing', sourceExcerpt: text.slice(0, 200), sourceText: text,
          systemInstructions, approvals: {}, processingStartedAt: now,
        } as any;
        const sessions = readArchive();
        sessions.push(session);
        writeArchive(sessions);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ sessionId }));

        // Process in background
        (async () => {
          try {
            const intakeMdPath = path.resolve(KB_DIR, 'INTAKE.md');
            let intakeRules = '';
            try { intakeRules = fs.readFileSync(intakeMdPath, 'utf-8'); } catch { intakeRules = ''; }

            let aliasesContent = '';
            try { aliasesContent = fs.readFileSync(path.resolve(KB_DIR, '_aliases.md'), 'utf-8'); } catch { aliasesContent = ''; }

            let registryContent = '';
            try { registryContent = fs.readFileSync(path.resolve(KB_DIR, '_registry.md'), 'utf-8'); } catch { registryContent = ''; }

            // Extract text/images from uploaded files (PDF, CSV)
            if (uploadedFiles.length > 0 && apiKeys.gemini) {
              try {
                const { extractedText, extractedImages } = await processUploadedFiles(uploadedFiles, apiKeys.gemini);
                if (extractedText) {
                  text = text ? `${text}\n\n${extractedText}` : extractedText;
                  // Update session — prefix sourceExcerpt with filenames for identification
                  const fileLabel = uploadedFiles.map(f => f.filename).join(', ');
                  const excerpt = fileLabel + (text ? ` — ${text.slice(0, 150)}` : '');
                  updateSession(sessionId, { sourceText: text, sourceExcerpt: excerpt.slice(0, 200) });
                }

                // Upload original files + extracted images to Firebase Storage in background
                try {
                  const { getApps: getAdminApps } = await import('firebase-admin/app');
                  const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore');
                  const { getStorage: getAdminStorage } = await import('firebase-admin/storage');
                  const adminApp = getAdminApps()[0];
                  if (adminApp) {
                    const adminDb = getAdminFirestore(adminApp);
                    const bucket = getAdminStorage(adminApp).bucket();
                    const attachments: IntakeSession['attachments'] = [];

                    for (const file of uploadedFiles) {
                      const storagePath = `wiki-attachments/${sessionId}/${file.filename}`;
                      await uploadToStorage(bucket, storagePath, file.buffer, file.mimeType);

                      const attachmentId = crypto.randomUUID();
                      const extractedImagePaths: Array<{ storagePath: string; pageNumber: number }> = [];

                      // Upload extracted images for this PDF
                      if (file.mimeType === 'application/pdf') {
                        for (let imgIdx = 0; imgIdx < extractedImages.length; imgIdx++) {
                          const img = extractedImages[imgIdx];
                          const imgStoragePath = `wiki-attachments/${sessionId}/images/${img.filename}`;
                          await uploadToStorage(bucket, imgStoragePath, img.buffer, 'image/png');
                          extractedImagePaths.push({ storagePath: imgStoragePath, pageNumber: img.pageNumber });
                        }
                      }

                      attachments!.push({
                        filename: file.filename,
                        mimeType: file.mimeType,
                        storagePath,
                        extractedImages: extractedImagePaths.length > 0 ? extractedImagePaths : undefined,
                      });

                      // Save attachment metadata to Firestore
                      await saveAttachmentMetadata(adminDb, {
                        id: attachmentId,
                        filename: file.filename,
                        mimeType: file.mimeType,
                        division: '', // set after apply
                        storagePath,
                        uploadedAt: new Date().toISOString(),
                        sessionId,
                        fileSize: file.buffer.length,
                        extractedImages: extractedImagePaths.length > 0 ? extractedImagePaths : undefined,
                      });
                    }

                    updateSession(sessionId, { attachments });
                    console.log(`[intake] Uploaded ${uploadedFiles.length} files to Storage`);
                  }
                } catch (storageErr) {
                  console.warn('[intake] Storage upload failed (non-fatal):', (storageErr as Error).message);
                }
              } catch (fileErr) {
                console.warn('[intake] File processing failed:', (fileErr as Error).message);
              }
            }

            // RAG: retrieve relevant KB chunks via vector search (if available)
            let ragContext = '';
            let usingRag = false;
            const geminiKey = apiKeys.gemini;
            if (geminiKey) {
              try {
                const chunks = await findRelevantChunks(text, geminiKey, 12);
                if (chunks && chunks.length > 0) {
                  ragContext = formatChunksAsContext(chunks);
                  usingRag = true;
                  console.log(`[intake] RAG: retrieved ${chunks.length} relevant chunks`);
                }
              } catch (ragErr) {
                console.warn('[intake] RAG retrieval failed, falling back to master index:', (ragErr as Error).message);
              }
            }

            // Build KB context: prefer RAG chunks + registry, fall back to full master index
            const kbContextSection = usingRag
              ? `RELEVANT KNOWLEDGE BASE SECTIONS (retrieved by semantic similarity):
${ragContext}

FULL ENTITY REGISTRY — use to identify target files and sections for matches:
${registryContent}`
              : `MASTER INDEX — files, sections, and known entities in the knowledge base:
${JSON.stringify(masterIndex, null, 2)}`;

            const systemPrompt = `You are a knowledge base intake processor. Analyze incoming text and determine how it merges into an existing knowledge base.

INTAKE RULES:
${intakeRules}

${kbContextSection}

ALIASES TABLE — resolve informal names, abbreviations, and shorthand:
${aliasesContent}

IMPORTANT — Name & Entity Correction:
The "knownPeople" section and the ALIASES TABLE contain canonical names with aliases. If the source text mentions someone by nickname, partial name, abbreviation, or misspelled name that matches a known person or entity, CORRECT it to the canonical name and note the correction.

CRITICAL — Content Formatting Schema:
All content MUST follow the exact formatting conventions already used in the knowledge base. Do NOT invent your own formatting. Here are the schemas:

**Person entry in people/ folder** (e.g., people/mqdc-team.md, people/founders.md — under a ## section like "## MQDC Leadership"):
\`\`\`
### Full Name — Role, Organization

\`Role Tag\` · \`Organization\`

Narrative paragraph describing the person's role, achievements, and relevance. Written in third person, past/present tense as appropriate. Include key facts, figures, and quotes where available.

**Sources:** Source citation (date)
\`\`\`

Example:
\`\`\`
### Paul Sirisant — CEO, Cloud 11

\`Appointed May 2025\` · \`Cloud 11\`

New-generation leader with experience spanning entertainment, marketing, and real estate. Career includes an executive role at **Universal Music Group** and the founding of **Def Jam Thailand**.

Officially assumed CEO role on May 20, 2025. Works alongside Project Director Onza Janyaprasert to drive development and engage content creators, media companies, and global partners.

**Sources:** Bangkok Post / MQDC release (May 2025)
\`\`\`

**Entity/project entry in topic files** (mqdc.md, dtp.md, etc.):
\`\`\`
## Section Name

Narrative paragraph(s) describing the entity, project, or initiative. Include key metrics, dates, partnerships, and strategic significance.

**Sources:** Source citation (date)
\`\`\`

NEVER use bullet-point lists for person entries. Always use narrative prose with backtick role tags on the second line. Match the exact heading format: ### Name — Role, Organization

BOLD FORMATTING RULE:
**text** is ONLY for person names and entity/project names. These render as clickable links in the wiki UI. NEVER bold descriptive labels, field names, emphasis phrases, or section headers. Use ## or ### headings for section structure. The only non-name bold allowed is **Sources:** as a structural label.

SOURCE TAGGING:
Every **Sources:** line you generate MUST end with [intake:${sessionId.slice(0, 8)}] — this links the content back to this intake session for traceability.

CLARIFICATION REQUESTS:
If the source text is ambiguous, unclear, or you're unsure where to place something, add a "clarifications" array to your response. Each item should describe what's unclear and what options exist. The user will review these before applying.

PERSONAL NOTES DETECTION:
The source text may contain personal observations, opinions, musings,
strategic analysis, recommendations, or questions from the user intermixed
with factual information. Identify these and route them separately:

- Factual information → matches targeting existing KB files (as normal)
- Personal notes/musings → matches targeting file "analysis" with action "append"
  and appropriate ## section headings. Prefix content with
  \`> **[Personal Note]**\` blockquote so it's visually distinct.
  Use narrative prose, not bullet lists.

Signs of personal notes: first-person language ("I think", "my impression",
"we should consider"), opinions, strategic suggestions, questions, speculation,
editorial commentary.

A single source text may produce BOTH factual matches and note matches.
Notes still get the [intake:sessionId] source tag for traceability.

Return a JSON object:
{
  "summary": "Brief overview of what the text contains",
  "matches": [
    {
      "file": "slug (e.g. 'people', 'mqdc')",
      "section": "The ## section heading (or empty string for file-level)",
      "action": "update | append | conflict | new_section | duplicate",
      "summary": "What change to make and why",
      "content": "The actual markdown content to add or update",
      "corrections": [
        { "original": "text from source", "corrected": "canonical form", "reason": "why" }
      ],
      "isDuplicate": false
    }
  ],
  "conflicts": ["Description of contradictions with existing content"],
  "newFiles": ["filename.md suggestions only if truly doesn't fit anywhere"],
  "clarifications": [
    { "question": "What needs clarification?", "context": "Why it's ambiguous", "options": ["Option A", "Option B"] }
  ]
}

Rules:
- Use knownPeople aliases to correct names from transcriptions
- If information already exists (duplicate), set action to "duplicate" and isDuplicate to true
- Prefer updating existing files over creating new ones
- Flag contradictions as conflicts — never silently override
- Mark uncertain info with (Unverified) prefix
- Return ONLY valid JSON, no markdown fences`;

            const finalPrompt = systemInstructions
              ? `${systemPrompt}\n\nAdditional user instructions:\n${systemInstructions}`
              : systemPrompt;

            const modelToUse = requestModel || cfg.defaultModel;
            const { url, init } = cfg.buildRequest(key, modelToUse, finalPrompt, text);
            const apiRes = await fetch(url, init);

            if (!apiRes.ok) {
              const errText = await apiRes.text();
              updateSession(sessionId, { status: 'error', error: `${cfg.name} API error: ${errText}` });
              return;
            }

            const apiData = await apiRes.json();

            // Detect truncated responses before attempting JSON parse
            const truncated = apiData.stop_reason === 'max_tokens'
              || apiData.choices?.[0]?.finish_reason === 'length'
              || apiData.candidates?.[0]?.finishReason === 'MAX_TOKENS';
            if (truncated) {
              updateSession(sessionId, { status: 'error', error: 'Response truncated — input text may be too long. Try a shorter excerpt.' });
              return;
            }

            const content = cfg.extractText(apiData);
            const parsed = parseAiJson(content);

            updateSession(sessionId, {
              status: 'ready',
              result: parsed,
              matchCount: parsed.matches?.length || 0,
              conflictCount: parsed.conflicts?.length || 0,
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            updateSession(sessionId, { status: 'error', error: msg });
          }
        })();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '/Users/jeffreyfullerton/PHYLA_BACKEND', '');
  return {
    plugins: [react(), tailwindcss(), intakeApiPlugin()],
    define: {
      __FIREBASE_API_KEY__: JSON.stringify(env.CUSTOM_FIREBASE_BACKEND_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    assetsInclude: ['**/*.md'],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/dtgo-wiki.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/dtgo-wiki.[ext]',
        },
      },
    },
  };
})
