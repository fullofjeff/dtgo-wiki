import { useSearchParams, Link } from 'react-router-dom';
import { search } from '@/data/search';
import { Search } from 'lucide-react';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const results = search(query, 30);

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--jf-cream)] mb-6">
        Search results for "{query}"
      </h1>

      {results.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[var(--text-secondary)]">
          <Search size={48} className="mb-4 opacity-15" />
          <p>No results found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => (
            <Link
              key={`${r.file}-${r.headingId}-${i}`}
              to={`/file/${r.file}${r.headingId ? `#${r.headingId}` : ''}`}
              className="wiki-card wiki-card-clickable block p-4"
            >
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {r.heading || r.title}
              </div>
              {r.heading && (
                <div className="text-[11px] text-[var(--jf-lavender)] mt-0.5">
                  in {r.title}
                </div>
              )}
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2">
                {r.snippet}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
