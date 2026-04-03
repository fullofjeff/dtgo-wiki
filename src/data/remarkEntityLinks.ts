import { visit } from 'unist-util-visit';
import type { Root, Text, Strong, Parent } from 'mdast';

interface PluginOptions {
  names: Map<string, 'person' | 'entity'>;
}

const SKIP_PARENT_TYPES = new Set(['heading', 'strong', 'inlineCode', 'code']);

/** Cache compiled regex per Map identity to avoid recompilation on every render */
let cachedMap: Map<string, 'person' | 'entity'> | null = null;
let cachedRegex: RegExp | null = null;
let cachedSorted: string[] | null = null;

function getRegex(names: Map<string, 'person' | 'entity'>): { regex: RegExp; sorted: string[] } | null {
  if (names === cachedMap && cachedRegex && cachedSorted) {
    return { regex: cachedRegex, sorted: cachedSorted };
  }

  const sorted = [...names.keys()].sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return null;

  const escaped = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');

  cachedMap = names;
  cachedRegex = regex;
  cachedSorted = sorted;
  return { regex, sorted };
}

export default function remarkEntityLinks(options: PluginOptions) {
  return (tree: Root) => {
    if (!options?.names || options.names.size === 0) return;

    const compiled = getRegex(options.names);
    if (!compiled) return;
    const { regex } = compiled;

    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;

      // Skip text inside headings, strong, code blocks
      if (SKIP_PARENT_TYPES.has(parent.type)) return;

      const text = node.value;

      // Reset regex lastIndex for each node
      regex.lastIndex = 0;

      const matches = [...text.matchAll(regex)];
      if (matches.length === 0) return;

      const newNodes: (Text | Strong)[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const matchIndex = match.index!;
        const matchText = match[0];
        const entityType = options.names.get(matchText) || 'person';
        const className = entityType === 'person' ? 'person-link' : 'entity-link';

        // Preceding plain text
        if (matchIndex > lastIndex) {
          newNodes.push({ type: 'text', value: text.slice(lastIndex, matchIndex) });
        }

        // Wrapped strong node with hProperties
        newNodes.push({
          type: 'strong',
          data: {
            hProperties: {
              className,
              'data-entity-type': entityType,
              'data-entity-name': matchText,
            },
          },
          children: [{ type: 'text', value: matchText }],
        } as Strong);

        lastIndex = matchIndex + matchText.length;
      }

      // Trailing text
      if (lastIndex < text.length) {
        newNodes.push({ type: 'text', value: text.slice(lastIndex) });
      }

      // Replace original text node with split nodes
      parent.children.splice(index, 1, ...newNodes as any[]);

      // Return adjusted visit index to skip newly inserted nodes
      return (index + newNodes.length) as any;
    });
  };
}
