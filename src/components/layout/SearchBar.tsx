import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { search } from '@/data/search';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useClickOutside } from '@/hooks/useClickOutside';
import type { SearchResult } from '@/data/types';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useKeyboardShortcut({
    key: 'k',
    metaKey: true,
    onKeyDown: () => {
      inputRef.current?.focus();
      setOpen(true);
    },
  });

  useClickOutside({
    ref: dropdownRef,
    onClickOutside: () => setOpen(false),
    enabled: open,
  });

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setResults(search(value, 8));
      setOpen(true);
      setSelected(0);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  const goToResult = useCallback((r: SearchResult) => {
    navigate(`/file/${r.file}${r.headingId ? `#${r.headingId}` : ''}`);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[selected]) { goToResult(results[selected]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div ref={dropdownRef} className="relative flex-1 max-w-[400px]">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search... (⌘K)"
          className="search-input"
        />
      </div>

      {open && results.length > 0 && (
        <div className="search-dropdown absolute bottom-full left-0 right-0 mb-2 z-[100]">
          {results.map((r, i) => (
            <div
              key={`${r.file}-${r.headingId}-${i}`}
              onClick={() => goToResult(r)}
              className={`search-result cursor-pointer ${i === selected ? 'search-result-active' : ''}`}
            >
              <div className="text-[13px] font-medium text-[var(--text-primary)]">
                {r.heading || r.title}
              </div>
              {r.heading && (
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  in {r.title}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
