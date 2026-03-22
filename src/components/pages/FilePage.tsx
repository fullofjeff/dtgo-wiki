import { useParams, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { getFile } from '@/data/loader';
import { MarkdownRenderer } from '../molecules/MarkdownRenderer';
import { TableOfContents } from '../molecules/TableOfContents';
import { FileText, ChevronRight, Home } from 'lucide-react';

const highlightStats: Record<string, Array<{ label: string; value: string }>> = {
  mqdc: [
    { label: 'Forestias Investment', value: '฿125B' },
    { label: 'Cloud 11 Value', value: '฿40B' },
    { label: 'Residential Sales', value: '฿22B+' },
    { label: 'Research Arms', value: '4' },
  ],
  tnb: [
    { label: 'Staff', value: '100+' },
    { label: 'Shelldon Reach', value: '180+ Countries' },
    { label: 'Monthly OpEx', value: '฿16M' },
    { label: 'Film Markets', value: '30+' },
  ],
  dtp: [
    { label: 'Business Lines', value: '4' },
    { label: 'REIT Portfolio', value: '฿8.2B' },
    { label: 'UK Hotel Brands', value: '10' },
    { label: 'UK Staff', value: '1,200+' },
  ],
  forestias: [
    { label: 'Investment', value: '฿125B' },
    { label: 'Total Area', value: '398 Rai' },
    { label: 'Green Space', value: '56%' },
    { label: 'Awards', value: '42+' },
  ],
  cloud11: [
    { label: 'Project Value', value: '฿40B' },
    { label: 'Retail NLA', value: '50K sqm' },
    { label: 'Hotel Rooms', value: '502' },
    { label: 'Retail Outlets', value: '250+' },
  ],
};


export function FilePage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const file = slug ? getFile(slug) : undefined;

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-secondary)]">
        <FileText size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-serif">File not found</p>
      </div>
    );
  }

  return (
    <div className="flex gap-14">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-4">
          <Link to="/" className="text-[var(--jf-lavender)] hover:underline flex items-center gap-1">
            <Home size={12} /> Home
          </Link>
          <ChevronRight size={12} className="opacity-30" />
          <span className="text-[var(--text-primary)]">{file.title}</span>
        </div>

        {/* Updated date */}
        <div className="text-[11px] text-[var(--text-secondary)] mb-5">
          Updated {file.updated}
        </div>

        {/* Highlight stat cards */}
        {slug && highlightStats[slug] && (
          <div className="mb-8">
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 600, color: 'var(--jf-cream)', marginBottom: '16px' }}>
              {file.title}
            </h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {highlightStats[slug].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prose">
          <MarkdownRenderer content={slug && highlightStats[slug] ? file.content.replace(/^#\s+.+\n*/m, '') : file.content} />
        </div>
      </div>

      {/* TOC */}
      {file.headings.length > 3 && (
        <aside className="hidden xl:block w-52 shrink-0">
          <div className="sticky top-6">
            <TableOfContents headings={file.headings} fileSlug={file.slug} />
          </div>
        </aside>
      )}
    </div>
  );
}
