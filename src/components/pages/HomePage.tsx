import { Link } from 'react-router-dom';
import { getAllFiles } from '@/data/loader';
import {
  Building2, Users, TreePine, Cloud, Briefcase,
  FileText, Clock, Handshake, FolderOpen, ArrowRight
} from 'lucide-react';

const iconMap: Record<string, typeof Building2> = {
  index: Building2,
  mqdc: Building2,
  tnb: FileText,
  dtp: Briefcase,
  forestias: TreePine,
  cloud11: Cloud,
  projects: FolderOpen,
  people: Users,
  history: Clock,
  partnerships: Handshake,
};

const colorMap: Record<string, string> = {
  index: 'var(--dtgo-green)',
  mqdc: 'var(--mqdc-blue)',
  tnb: 'var(--tnb-orange)',
  dtp: 'var(--dtp-pink)',
  forestias: 'var(--dtgo-green)',
  cloud11: 'var(--mqdc-blue)',
};

const stats = [
  { label: 'Founded', value: '1993' },
  { label: 'Project Portfolio', value: '฿165B+' },
  { label: 'Subsidiaries', value: '3 Major' },
  { label: 'Social Commitment', value: '2% Revenue' },
];

const entities = [
  { slug: 'mqdc', name: 'MQDC', desc: 'Property Development', color: 'var(--mqdc-blue)', badge: 'badge-mqdc' },
  { slug: 'tnb', name: 'T&B Media Global', desc: 'Entertainment & Media', color: 'var(--tnb-orange)', badge: 'badge-tnb' },
  { slug: 'dtp', name: 'DTP', desc: 'Global Investment', color: 'var(--dtp-pink)', badge: 'badge-dtp' },
];

export function HomePage() {
  const files = getAllFiles();

  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--jf-cream)', marginBottom: '8px' }}>
          DTGO Corporation
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 300 }}>
          Comprehensive knowledge base — organization structure, projects, people, and partnerships
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-12">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Group Structure */}
      <div className="mb-12">
        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px' }}>
          Group Structure
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {entities.map(entity => {
            const Icon = iconMap[entity.slug] || Building2;
            return (
              <Link
                key={entity.slug}
                to={`/file/${entity.slug}`}
                className="wiki-card wiki-card-clickable"
              >
                <div className="flex flex-col items-center text-center" style={{ padding: '32px', gap: '4px', minHeight: '280px', maxHeight: '320px', justifyContent: 'flex-start' }}>
                  <div
                    className="flex items-center justify-center h-20 w-20 rounded-full flex-shrink-0"
                    style={{
                      background: 'var(--bg-surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                      marginBottom: '4px',
                    }}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Icon size={40} style={{ color: entity.color, opacity: 0.8 }} />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ marginTop: '12px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '19px', fontWeight: 'bold', color: entity.color, fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
                      {entity.name}
                    </h3>
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '80%', margin: '0 auto' }}>
                    {entity.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* All Files */}
      <div>
        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px' }}>
          All Files
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {files.map(file => {
            const Icon = iconMap[file.slug] || FileText;
            const color = colorMap[file.slug] || 'var(--text-secondary)';
            return (
              <Link
                key={file.slug}
                to={`/file/${file.slug}`}
                className="wiki-card wiki-card-clickable"
              >
                <div className="flex flex-col items-center text-center" style={{ padding: '32px', gap: '4px', minHeight: '280px', maxHeight: '320px', justifyContent: 'flex-start' }}>
                  <div
                    className="flex items-center justify-center h-20 w-20 rounded-full flex-shrink-0"
                    style={{
                      background: 'var(--bg-surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                      marginBottom: '4px',
                    }}
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Icon size={40} style={{ color, opacity: 0.8 }} />
                    </div>
                  </div>
                  <div className="flex items-center" style={{ marginTop: '12px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '19px', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
                      {file.title}
                    </h3>
                  </div>
                  {file.scope && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '80%', margin: '0 auto' }} className="line-clamp-3">
                      {file.scope}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
