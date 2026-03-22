import type { Heading } from '@/data/types';

export function TableOfContents({
  headings,
}: {
  headings: Heading[];
  fileSlug: string;
}) {
  const items = headings.filter(h => h.level >= 2 && h.level <= 3);
  if (items.length === 0) return null;

  return (
    <div>
      <div style={{
        fontSize: '0.6rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        color: 'var(--text-secondary)',
        marginBottom: '12px',
      }}>
        On this page
      </div>
      <nav className="space-y-0.5">
        {items.map((h, i) => (
          <a
            key={`${h.id}-${i}`}
            href={`#${h.id}`}
            className="block truncate transition-colors"
            style={{
              fontSize: '11px',
              padding: '3px 0',
              paddingLeft: h.level === 3 ? '12px' : '0',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            {h.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
