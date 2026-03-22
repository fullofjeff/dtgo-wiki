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
        <div className="grid grid-cols-3 gap-4">
          {entities.map(entity => (
            <Link
              key={entity.slug}
              to={`/file/${entity.slug}`}
              className="wiki-card wiki-card-clickable accent-top"
              style={{ borderTopColor: entity.color, padding: '28px 24px' }}
            >
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: entity.color, fontWeight: 700, marginBottom: '4px' }}>
                {entity.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 300, marginBottom: '16px' }}>
                {entity.desc}
              </div>
              <ArrowRight size={14} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
            </Link>
          ))}
        </div>
      </div>

      {/* All Files */}
      <div>
        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '12px' }}>
          All Files
        </div>
        <div className="grid grid-cols-2 gap-4">
          {files.map(file => {
            const Icon = iconMap[file.slug] || FileText;
            const color = colorMap[file.slug] || 'var(--text-secondary)';
            return (
              <Link
                key={file.slug}
                to={`/file/${file.slug}`}
                className="wiki-card wiki-card-clickable"
                style={{ padding: '20px 24px' }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{
                      width: 36, height: 36,
                      background: 'var(--bg-surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    <Icon size={16} style={{ color, opacity: 0.8 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {file.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 300, lineHeight: 1.5 }} className="line-clamp-2">
                      {file.scope}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
