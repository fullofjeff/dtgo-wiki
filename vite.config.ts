import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { exec } from 'node:child_process'
import { findRelevantChunks, formatChunksAsContext } from './scripts/rag-retriever.js'

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
        body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: userText }] }),
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
            ...(isReasoning ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
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
          generationConfig: { maxOutputTokens: 4096 },
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
              : { max_tokens: 4096 }),
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

// ── Archive helpers ──

const KB_DIR = path.resolve(__dirname, 'knowledge-base');
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
}

function readArchive(): IntakeSession[] {
  try { return JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf-8')); }
  catch { return []; }
}

function writeArchive(sessions: IntakeSession[]) {
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(sessions, null, 2));
}

function updateSession(id: string, patch: Partial<IntakeSession>) {
  const sessions = readArchive();
  const idx = sessions.findIndex(s => s.id === id);
  if (idx >= 0) { sessions[idx] = { ...sessions[idx], ...patch }; writeArchive(sessions); }
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

// ── Apply changes to .md files ──

function applyFindReplace(filePath: string, searchPattern: string, replacement: string) {
  let raw = fs.readFileSync(filePath, 'utf-8');
  const today = new Date().toISOString().slice(0, 10);
  raw = raw.replace(/^(updated:\s*)"?[^"\n]*"?/m, `$1"${today}"`);
  const regex = new RegExp(searchPattern, 'g');
  raw = raw.replace(regex, replacement);
  fs.writeFileSync(filePath, raw);
}

function applyMatchToFile(filePath: string, section: string, action: string, content: string) {
  let raw = fs.readFileSync(filePath, 'utf-8');

  // Update frontmatter date
  const today = new Date().toISOString().slice(0, 10);
  raw = raw.replace(/^(updated:\s*)"?[^"\n]*"?/m, `$1"${today}"`);

  if (action === 'new_section') {
    raw = raw.trimEnd() + `\n\n## ${section}\n\n${content}\n`;
  } else if (section) {
    // Find the ## section
    const sectionRegex = new RegExp(`^(##\\s+${section.replace(/^##\\s*/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})$`, 'm');
    const match = sectionRegex.exec(raw);
    if (match) {
      const insertPos = match.index + match[0].length;
      // Find next ## heading
      const rest = raw.slice(insertPos);
      const nextH2 = rest.search(/\n##\s+/);
      if (action === 'append') {
        const insertAt = nextH2 >= 0 ? insertPos + nextH2 : raw.length;
        raw = raw.slice(0, insertAt).trimEnd() + '\n\n' + content + '\n' + raw.slice(insertAt);
      } else if (action === 'update') {
        const endPos = nextH2 >= 0 ? insertPos + nextH2 : raw.length;
        raw = raw.slice(0, insertPos) + '\n\n' + content + '\n' + raw.slice(endPos);
      } else if (action === 'conflict') {
        const insertAt = nextH2 >= 0 ? insertPos + nextH2 : raw.length;
        raw = raw.slice(0, insertAt).trimEnd() + '\n\n> ⚠️ CONFLICT\n> ' + content.replace(/\n/g, '\n> ') + '\n' + raw.slice(insertAt);
      }
    } else {
      // Section not found — append at end
      raw = raw.trimEnd() + '\n\n' + content + '\n';
    }
  } else {
    // No section — append at end of file
    raw = raw.trimEnd() + '\n\n' + content + '\n';
  }

  fs.writeFileSync(filePath, raw);
}

function gitCommit(files: string[], message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const quoted = files.map(f => `"${f}"`).join(' ');
    exec(`cd "${KB_DIR}/.." && git add ${quoted} && git commit -m "${message.replace(/"/g, '\\"')}"`, (err) => {
      if (err) { console.error('[intake] git commit failed:', err.message); reject(err); }
      else resolve();
    });
  });
}

// ── Read request body helper ──

async function readBody(req: any): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString());
}

// ── Parse AI JSON response ──

function parseAiJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

// ── Vite plugin ──

function intakeApiPlugin(): Plugin {
  let apiKeys: Record<string, string> = {};
  let masterIndex: ReturnType<typeof buildMasterIndex>;

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
    },
    configureServer(server) {
      // GET /api/intake/providers
      server.middlewares.use('/api/intake/providers', (_req, res) => {
        const available = Object.entries(providerConfigs)
          .filter(([id]) => apiKeys[id])
          .map(([id, cfg]) => ({ id, name: cfg.name, defaultModel: cfg.defaultModel, variants: cfg.variants }));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(available));
      });

      // GET /api/intake/sessions (list) and GET /api/intake/session/:id (single)
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET') return next();

        // List all sessions
        if (req.url === '/api/intake/sessions') {
          const sessions = readArchive().map(s => ({
            id: s.id, timestamp: s.timestamp, provider: s.provider, model: s.model,
            status: s.status, sourceExcerpt: s.sourceExcerpt,
            matchCount: s.result?.matches?.length || 0,
            conflictCount: s.result?.conflicts?.length || 0,
            approvals: s.approvals, appliedAt: s.appliedAt,
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

      // POST /api/intake/apply — with pre-apply validation
      server.middlewares.use('/api/intake/apply', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
        const body = await readBody(req);
        const { sessionId, approvals, contentEdits = {} } = body;
        const sessions = readArchive();
        const session = sessions.find(s => s.id === sessionId);
        if (!session || !session.result) { res.statusCode = 404; res.end('Session not found'); return; }
        if (session.appliedAt) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ applied: 0, skipped: 0, validationResults: [], error: 'Already applied' })); return; }

        const validationResults: { index: number; valid: boolean; issues: string[]; applied: boolean }[] = [];
        const affectedFiles: string[] = [];
        const haiku = apiKeys.claude; // Use Haiku for validation

        for (const [indexStr, decision] of Object.entries(approvals)) {
          if (decision !== 'approved') continue;
          const idx = Number(indexStr);
          const match = session.result.matches[idx];
          if (!match) continue;

          let filePath = path.join(KB_DIR, `${match.file}.md`);
          if (!fs.existsSync(filePath)) {
            // Try _prefix (e.g., _index.md)
            const alt = path.join(KB_DIR, `_${match.file}.md`);
            if (fs.existsSync(alt)) filePath = alt;
            // Try as directory with _index.md (e.g., people → people/_index.md)
            else {
              const dirIndex = path.join(KB_DIR, match.file, '_index.md');
              if (fs.existsSync(dirIndex)) filePath = dirIndex;
              else { validationResults.push({ index: idx, valid: false, issues: ['File not found'], applied: false }); continue; }
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
            const details = match.details || {};
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
            const details = match.details || {};
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
          let contentToApply = contentEdits[String(idx)] ?? match.content ?? match.description ?? '';
          if (haiku) {
            try {
              const valPrompt = `You are a knowledge base quality checker. Validate this proposed addition.

EXISTING SECTION CONTENT:
${sectionContent || '(section does not exist yet — will be created)'}

PROPOSED ADDITION:
${match.content}

SCHEMA RULES:
- Person entries MUST use: ### Name — Role, Org\\n\\n\`Tag\` · \`Org\`\\n\\nNarrative prose paragraphs\\n\\n**Sources:** citation
- NEVER bullet-point lists for person entries
- Check if this person/entity already exists in the section (DUPLICATE check)

Return ONLY valid JSON:
{ "valid": true/false, "issues": ["list of problems found"], "fixedContent": "corrected content if format issues — or null if no fix needed" }`;

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
                    validationResults.push({ index: idx, valid: false, issues: valJson.issues || ['Validation failed'], applied: false });
                    continue; // Skip this match
                  }
                } else {
                  validationResults.push({ index: idx, valid: true, issues: [], applied: true });
                }
              } else {
                // Validation API failed — proceed without validation
                validationResults.push({ index: idx, valid: true, issues: ['Validation skipped — API error'], applied: true });
              }
            } catch {
              // Validation failed — proceed anyway
              validationResults.push({ index: idx, valid: true, issues: ['Validation skipped'], applied: true });
            }
          } else {
            validationResults.push({ index: idx, valid: true, issues: ['No validation key'], applied: true });
          }

          // Append intake source reference to content
          const sessionTag = `[intake:${session.id.slice(0, 8)}]`;
          if (contentToApply.includes('**Sources:**') && !contentToApply.includes(sessionTag)) {
            contentToApply = contentToApply.replace(/(\*\*Sources:\*\*.*)$/, `$1 ${sessionTag}`);
          } else if (!contentToApply.includes('**Sources:**')) {
            contentToApply = contentToApply.trimEnd() + `\n\n**Sources:** intake ${sessionTag}`;
          }

          applyMatchToFile(filePath, match.section, match.action, contentToApply);
          affectedFiles.push(filePath);
        }

        // Update session — only mark as applied if files were actually written
        session.approvals = approvals;
        if (affectedFiles.length > 0) {
          session.appliedAt = new Date().toISOString();
        }
        writeArchive(sessions);

        // Git commit
        if (affectedFiles.length > 0) {
          try {
            await gitCommit(affectedFiles, `intake: ${session.result.summary || 'applied approved changes'}`);
          } catch { /* git commit failure is non-fatal */ }
        }

        // Rebuild master index
        masterIndex = buildMasterIndex();

        const applied = validationResults.filter(v => v.applied).length;
        const skipped = validationResults.filter(v => !v.applied).length;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ applied, skipped, validationResults }));
        } catch (err: unknown) {
          console.error('[intake/apply] Unhandled error:', err);
          if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ applied: 0, skipped: 0, validationResults: [], error: err instanceof Error ? err.message : 'Unknown error' })); }
        }
      });

      // POST /api/intake/reprocess — refine results with clarification answers
      server.middlewares.use('/api/intake/reprocess', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        try {
        const body = await readBody(req);
        const { sessionId, clarificationAnswers, contentEdits = {} } = body;
        const sessions = readArchive();
        const session = sessions.find(s => s.id === sessionId);
        if (!session?.result || !session.sourceText) { res.statusCode = 404; res.end('Session not found'); return; }

        const haiku = apiKeys.claude;
        if (!haiku) { res.statusCode = 500; res.end('Claude API key not set'); return; }

        try {
          const reprocessPrompt = `You previously analyzed source text and returned intake suggestions. The user has answered your clarification questions. Refine your matches based on their answers.

ORIGINAL SOURCE TEXT:
${session.sourceText}

YOUR PREVIOUS RESULT:
${JSON.stringify(session.result, null, 2)}

USER'S CLARIFICATION ANSWERS:
${JSON.stringify(clarificationAnswers, null, 2)}

USER'S CONTENT EDITS (the user manually modified these match contents — preserve their changes):
${Object.keys(contentEdits).length > 0 ? JSON.stringify(contentEdits, null, 2) : 'None'}

MASTER INDEX:
${JSON.stringify(masterIndex, null, 2)}

Now return a refined JSON result with the SAME structure. Replace any clarification items with concrete matches based on the user's answers. Do NOT include a "clarifications" array — all ambiguities should now be resolved.

Return ONLY valid JSON, no markdown fences.`;

          const { url, init } = providerConfigs.claude.buildRequest(haiku, 'claude-haiku-4-5', reprocessPrompt, 'Refine the intake based on clarification answers.');
          const apiRes = await fetch(url, init);

          if (!apiRes.ok) {
            const errText = await apiRes.text();
            res.statusCode = apiRes.status;
            res.end(`Reprocess error: ${errText}`);
            return;
          }

          const apiData = await apiRes.json();
          const content = providerConfigs.claude.extractText(apiData);
          const parsed = parseAiJson(content);

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

          // Update session with refined result
          session.result = parsed;
          writeArchive(sessions);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(parsed));
        } catch (err: unknown) {
          res.statusCode = 500;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          res.end(`Reprocess error: ${msg}`);
        }
        } catch (outerErr: unknown) {
          console.error('[intake/reprocess] Unhandled error:', outerErr);
          if (!res.headersSent) { res.statusCode = 500; res.end(`Reprocess error: ${outerErr instanceof Error ? outerErr.message : 'Unknown'}`); }
        }
      });

      // POST /api/intake — background processing with master index
      server.middlewares.use('/api/intake', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return; }
        const body = await readBody(req);
        const { text, provider = 'claude', model: requestModel, systemInstructions } = body;
        const cfg = providerConfigs[provider];
        const key = apiKeys[provider];

        if (!cfg) { res.statusCode = 400; res.end(`Unknown provider: ${provider}`); return; }
        if (!key) { res.statusCode = 500; res.end(`${cfg.name} API key not set`); return; }

        // Create session and return ID immediately
        const sessionId = crypto.randomUUID();
        const session: IntakeSession = {
          id: sessionId, timestamp: new Date().toISOString(),
          provider, model: requestModel || cfg.defaultModel,
          status: 'processing', sourceExcerpt: text.slice(0, 200), sourceText: text,
          systemInstructions, approvals: {},
        };
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

New-generation leader with experience spanning entertainment, marketing, and real estate. Career includes an **executive role at Universal Music Group** and the **founding of Def Jam Thailand**.

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

SOURCE TAGGING:
Every **Sources:** line you generate MUST end with [intake:${sessionId.slice(0, 8)}] — this links the content back to this intake session for traceability.

CLARIFICATION REQUESTS:
If the source text is ambiguous, unclear, or you're unsure where to place something, add a "clarifications" array to your response. Each item should describe what's unclear and what options exist. The user will review these before applying.

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
            const content = cfg.extractText(apiData);
            const parsed = parseAiJson(content);

            updateSession(sessionId, { status: 'ready', result: parsed });
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
