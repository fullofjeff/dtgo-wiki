import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { search } from '@/data/search';
import { Search, Loader2 } from 'lucide-react';
import type { SearchResult } from '@/data/types';

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    search(query, 30).then((r) => {
      if (!cancelled) {
        setResults(r);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [query]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--jf-cream)] mb-6">
        Search results for "{query}"
        {loading && (
          <Loader2 size={16} className="inline-block ml-2 animate-spin text-[var(--jf-lavender)]" />
        )}
      </h1>

      {!loading && results.length === 0 ? (
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
