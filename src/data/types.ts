export interface KBFile {
  slug: string;        // e.g. "mqdc", "forestias", "people"
  title: string;
  scope: string;
  updated: string;
  sources: string;
  content: string;     // raw markdown body (after frontmatter)
  headings: Heading[];
}

export interface Heading {
  level: number;       // 1, 2, 3
  text: string;
  id: string;          // slug for anchor
}

export interface SearchResult {
  file: string;        // slug
  title: string;
  heading?: string;
  headingId?: string;
  snippet: string;
}

export interface PersonMention {
  fileSlug: string;       // e.g. "forestias"
  fileTitle: string;      // e.g. "The Forestias"
  context: string;        // the paragraph containing the mention
}

export interface PersonRecord {
  canonicalName: string;
  aliases: string[];
  bio?: string;           // markdown body from people.md ### section (if exists)
  mentions: PersonMention[];
}

export interface EntityRecord {
  canonicalName: string;
  aliases: string[];
  slug: string | null;     // KB file slug, or null if no dedicated page
  scope: string;
  description: string;     // first paragraph from KB file
  accentColor?: string;    // brand color token
}
