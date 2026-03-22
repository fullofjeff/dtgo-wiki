import { useState } from 'react';
import { getAllFiles } from '@/data/loader';
import { Inbox, Loader2, FileText, AlertTriangle, Plus, RefreshCw } from 'lucide-react';

interface IntakeMatch {
  file: string;
  section: string;
  action: 'update' | 'append' | 'conflict' | 'new_section';
  summary: string;
  content: string;
}

interface IntakeResult {
  matches: IntakeMatch[];
  conflicts: string[];
  newFiles: string[];
  summary: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  update: { label: 'Update', color: 'var(--mqdc-blue)' },
  append: { label: 'Append', color: 'var(--dtgo-green)' },
  conflict: { label: 'Conflict', color: 'var(--dtp-pink)' },
  new_section: { label: 'New Section', color: 'var(--tnb-orange)' },
};

export function IntakePage() {
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!text.trim()) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    const files = getAllFiles();
    const inventory = files.map(f => ({
      slug: f.slug,
      title: f.title,
      scope: f.scope,
      headings: f.headings.filter(h => h.level <= 2).map(h => h.text),
    }));

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), inventory }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Server error ${res.status}`);
      }

      const data: IntakeResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--jf-cream)', marginBottom: '8px' }}>
          Intake
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 300 }}>
          Paste text from any source — meeting notes, articles, transcripts — and AI will identify which knowledge base files to update.
        </p>
      </div>

      {/* Text input area */}
      <div className="wiki-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px' }}>
          Source Material
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste meeting notes, article text, transcripts, or any information to process into the knowledge base..."
          disabled={processing}
          style={{
            width: '100%',
            minHeight: '400px',
            padding: '16px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-input)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.7,
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,207,233,0.3)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-10">
        <button
          onClick={handleProcess}
          disabled={processing || !text.trim()}
          className="wiki-card"
          style={{
            padding: '12px 28px',
            cursor: processing || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: processing || !text.trim() ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--jf-cream)',
            border: '1px solid var(--border-default)',
            transition: 'all 0.2s',
          }}
        >
          {processing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Inbox size={16} />
          )}
          {processing ? 'Processing...' : 'Process'}
        </button>

        {(result || text) && (
          <button
            onClick={handleReset}
            className="wiki-card"
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="wiki-card"
          style={{
            padding: '20px 24px',
            marginBottom: '16px',
            borderTop: '2px solid var(--dtp-pink)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <AlertTriangle size={18} style={{ color: 'var(--dtp-pink)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dtp-pink)', marginBottom: '4px' }}>
              Processing Failed
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary */}
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px' }}>
            Analysis
          </div>
          <div className="wiki-card" style={{ padding: '20px 24px', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7 }}>
              {result.summary}
            </p>
          </div>

          {/* Matches */}
          {result.matches.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px', marginTop: '24px' }}>
                Suggested Changes ({result.matches.length})
              </div>
              <div className="flex flex-col gap-3">
                {result.matches.map((m, i) => {
                  const a = actionLabels[m.action] || actionLabels.update;
                  return (
                    <div
                      key={i}
                      className="wiki-card accent-top"
                      style={{ padding: '20px 24px', borderTopColor: a.color }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FileText size={16} style={{ color: a.color }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {m.file}
                        </span>
                        <span style={{
                          fontSize: '0.6rem',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: a.color,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `color-mix(in srgb, ${a.color} 10%, transparent)`,
                        }}>
                          {a.label}
                        </span>
                      </div>
                      {m.section && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Section: {m.section}
                        </div>
                      )}
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {m.summary}
                      </div>
                      {m.content && (
                        <pre style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: 'var(--bg-surface-inset)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                          overflowX: 'auto',
                        }}>
                          {m.content}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* New Files */}
          {result.newFiles.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--tnb-orange)', fontWeight: 600, marginBottom: '12px', marginTop: '24px' }}>
                New Files Suggested
              </div>
              {result.newFiles.map((f, i) => (
                <div key={i} className="wiki-card" style={{ padding: '16px 24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Plus size={16} style={{ color: 'var(--tnb-orange)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{f}</span>
                </div>
              ))}
            </>
          )}

          {/* Conflicts */}
          {result.conflicts.length > 0 && (
            <>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--dtp-pink)', fontWeight: 600, marginBottom: '12px', marginTop: '24px' }}>
                Conflicts Detected
              </div>
              {result.conflicts.map((c, i) => (
                <div
                  key={i}
                  className="wiki-card"
                  style={{ padding: '16px 24px', marginBottom: '8px', borderLeft: '3px solid var(--dtp-pink)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}
                >
                  <AlertTriangle size={16} style={{ color: 'var(--dtp-pink)', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
