import { getAllFiles, getFile } from './loader';
import type { EntityRecord } from './types';

// ── Accent colors (matches design system tokens) ──

const accentColors: Record<string, string> = {
  'DTGO': 'var(--dtgo-green)',
  'DTGO Corporation': 'var(--dtgo-green)',
  'MQDC': 'var(--mqdc-blue)',
  'Magnolia Quality Development Corporation': 'var(--mqdc-blue)',
  'T&B Media Global': 'var(--tnb-orange)',
  'DTP': 'var(--dtp-pink)',
  'DTGO Prosperous': 'var(--dtp-pink)',
  'The Forestias': 'var(--dtgo-green)',
  'Cloud 11': 'var(--mqdc-blue)',
  'CP Group': 'var(--dtgo-green)',
  'Charoen Pokphand Group': 'var(--dtgo-green)',
};

// ── Helpers ──

/** Extract the first non-heading, non-empty paragraph from markdown content */
function extractFirstParagraph(md: string): string {
  const lines = md.split('\n');
  const paraLines: string[] = [];
  let foundStart = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headings and empty lines at the start
    if (!foundStart) {
      if (trimmed === '' || /^#{1,6}\s/.test(trimmed)) continue;
      foundStart = true;
    }
    if (foundStart) {
      if (trimmed === '' && paraLines.length > 0) break; // end of paragraph
      if (/^#{1,6}\s/.test(trimmed) && paraLines.length > 0) break;
      paraLines.push(trimmed);
    }
  }

  return paraLines.join(' ').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// ── Known entity files ──

const entityFileMap: Record<string, string[]> = {
  'index': ['DTGO Corporation', 'DTGO'],
  'mqdc': ['MQDC', 'Magnolia Quality Development Corporation'],
  'tnb': ['T&B Media Global', 'T&B'],
  'dtp': ['DTP', 'DTGO Prosperous'],
  'forestias': ['The Forestias', 'Forestias'],
  'cloud11': ['Cloud 11'],
};

// Stub entities (no dedicated KB file)
const stubEntities: { names: string[]; scope: string }[] = [
  { names: ['CP Group', 'Charoen Pokphand Group'], scope: "Dhanin Chearavanont's conglomerate" },
  { names: ['CP Land', 'C.P. Land'], scope: 'CP Group property arm, co-founded 1983' },
  { names: ['DTPRM', 'DTP Global REITs Management'], scope: 'REIT management entity under DTP' },
  { names: ['RISC', 'Research & Innovation for Sustainability Center'], scope: 'MQDC research arm' },
  { names: ['MFC', 'Magnolia Finest Corporation'], scope: 'MQDC subsidiary' },
  { names: ['DYA'], scope: 'T&B Media Global unit — pivoted from Web3 to distribution' },
  { names: ['SenseTime'], scope: 'Chinese AI company; co-founded by Prof. Lin Da Hua' },
  { names: ['The Forestias Production'], scope: 'Production arm for The Forestias content' },
  { names: ['OKD'], scope: 'T&B social media production unit' },
  { names: ['Translucia', 'Translucia Metaverse'], scope: 'DTGO metaverse brand' },
  { names: ['The Aspen Tree'], scope: 'MQDC senior living brand' },
];

// ── Index Builder ──

function buildEntityIndex(): { lookup: Map<string, EntityRecord>; records: EntityRecord[] } {
  const records: EntityRecord[] = [];
  const lookup = new Map<string, EntityRecord>();

  // Pass 1: Entities with dedicated KB files
  for (const [slug, names] of Object.entries(entityFileMap)) {
    const file = getFile(slug);
    if (!file) continue;

    const record: EntityRecord = {
      canonicalName: names[0],
      aliases: [...names],
      slug,
      scope: file.scope,
      description: extractFirstParagraph(file.content),
      accentColor: accentColors[names[0]],
    };

    records.push(record);
    for (const alias of names) {
      lookup.set(alias, record);
    }
  }

  // Pass 2: Stub entities (no dedicated file)
  for (const stub of stubEntities) {
    const record: EntityRecord = {
      canonicalName: stub.names[0],
      aliases: [...stub.names],
      slug: null,
      scope: stub.scope,
      description: stub.scope,
      accentColor: accentColors[stub.names[0]],
    };

    records.push(record);
    for (const alias of stub.names) {
      lookup.set(alias, record);
    }
  }

  return { lookup, records };
}

const { lookup: entityLookup } = buildEntityIndex();

// ── Public API ──

export function getEntityNames(): string[] {
  return [...entityLookup.keys()];
}

export function getEntityRecord(name: string): EntityRecord | undefined {
  return entityLookup.get(name);
}
