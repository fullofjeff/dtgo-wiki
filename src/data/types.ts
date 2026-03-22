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
