import { getAllFiles } from './loader';
import type { PersonRecord, PersonMention } from './types';

// ── Helpers ──

/** Extract everything under a heading until the next heading of same/higher level */
function extractSection(md: string, heading: string, level: number): string {
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
      if (m && m[1].length === level && m[2].trim() === heading) {
        capturing = true;
      }
    }
  }

  return out.join('\n').trim();
}

/** Strip parenthetical nicknames: 'Name ("Nickname")' → 'Name' */
function stripNickname(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/, '').trim();
}

/** Extract nickname from parenthetical: 'Name ("Khun Bee")' → 'Khun Bee' or null */
function extractNickname(name: string): string | null {
  const m = name.match(/\("([^"]+)"\)/);
  return m ? m[1] : null;
}

/** Strip em-dash role suffix: 'Paul Sirisant — CEO, Cloud 11' → 'Paul Sirisant' */
function stripRoleSuffix(name: string): string {
  const idx = name.indexOf(' — ');
  return idx > 0 ? name.slice(0, idx).trim() : name;
}

/** Heuristic: does this ### section body look like a person entry? */
function isPersonSection(body: string): boolean {
  // Person sections in this knowledge base start with backtick role tags
  // e.g. `CEO` · `MQDC`  or  `Director, RISC` · `MQDC`
  const firstContentLine = body.split('\n').find(l => l.trim().length > 0);
  return firstContentLine ? /^`[^`]+`/.test(firstContentLine.trim()) : false;
}

/** Extract the paragraph surrounding a position in text */
function extractParagraph(content: string, matchIndex: number): string {
  const lines = content.split('\n');
  let charCount = 0;
  let lineIdx = 0;

  // Find which line the match is on
  for (let i = 0; i < lines.length; i++) {
    charCount += lines[i].length + 1; // +1 for newline
    if (charCount > matchIndex) {
      lineIdx = i;
      break;
    }
  }

  // Walk backward to paragraph start (blank line or heading)
  let start = lineIdx;
  while (start > 0 && lines[start - 1].trim() !== '' && !lines[start - 1].match(/^#{1,6}\s/)) {
    start--;
  }

  // Walk forward to paragraph end
  let end = lineIdx;
  while (end < lines.length - 1 && lines[end + 1].trim() !== '' && !lines[end + 1].match(/^#{1,6}\s/)) {
    end++;
  }

  return lines.slice(start, end + 1).join('\n').trim();
}

// ── Index Builder ──

function buildPersonIndex(): { lookup: Map<string, PersonRecord>; records: PersonRecord[] } {
  const files = getAllFiles();
  const records: PersonRecord[] = [];
  const lookup = new Map<string, PersonRecord>();

  // Track which file+heading combos are "owned" by a person (to avoid duplicate mentions)
  const ownedSections = new Set<string>(); // "slug:heading"

  // Pass 1: Discover persons from ### headings across ALL files
  // Process people.md first so its bios are canonical
  const sorted = [...files].sort((a, b) => {
    if (a.slug === 'people') return -1;
    if (b.slug === 'people') return 1;
    return 0;
  });

  for (const file of sorted) {
    const headingRegex = /^###\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(file.content)) !== null) {
      const fullHeading = match[1].trim();
      const body = extractSection(file.content, fullHeading, 3);
      if (!body || !isPersonSection(body)) continue;

      const bareName = stripNickname(fullHeading);
      const nameOnly = stripRoleSuffix(bareName);
      const nickname = extractNickname(fullHeading);

      // Check if this person already exists (from people.md or earlier file)
      const existingRecord = lookup.get(nameOnly) || lookup.get(bareName);

      if (existingRecord) {
        // Person already known — add this as a mention if from a different file
        if (file.slug !== 'people') {
          existingRecord.mentions.push({
            fileSlug: file.slug,
            fileTitle: file.title,
            context: body,
          });
        }
      } else {
        // New person
        const record: PersonRecord = {
          canonicalName: nameOnly,
          aliases: [],
          bio: body,
          mentions: [],
        };

        // Build alias list
        const aliasSet = new Set<string>();
        aliasSet.add(fullHeading);
        aliasSet.add(bareName);
        aliasSet.add(nameOnly);
        if (nickname) aliasSet.add(nickname);
        record.aliases = [...aliasSet];

        records.push(record);

        // Register all aliases in the lookup
        for (const alias of record.aliases) {
          lookup.set(alias, record);
        }
      }

      ownedSections.add(`${file.slug}:${nameOnly}`);
    }
  }

  // Pass 2: Scan bold mentions across all files
  for (const file of files) {
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    while ((match = boldRegex.exec(file.content)) !== null) {
      const boldText = match[1].trim();
      const record = lookup.get(boldText);
      if (!record) continue;

      // Skip if this is the file where the person's own ### section lives
      if (ownedSections.has(`${file.slug}:${record.canonicalName}`)) continue;

      // Skip if we already have a mention from this file
      if (record.mentions.some(m => m.fileSlug === file.slug)) continue;

      const context = extractParagraph(file.content, match.index);
      record.mentions.push({
        fileSlug: file.slug,
        fileTitle: file.title,
        context,
      });
    }
  }

  return { lookup, records };
}

const { lookup: personLookup } = buildPersonIndex();

// ── Public API ──

export function getPersonNames(): string[] {
  return [...personLookup.keys()];
}

export function getPersonSection(name: string): string | undefined {
  return personLookup.get(name)?.bio;
}

export function getPersonRecord(name: string): PersonRecord | undefined {
  return personLookup.get(name);
}
