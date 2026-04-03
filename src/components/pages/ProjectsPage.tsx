import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight, Cloud, Briefcase } from 'lucide-react';
import { getFile } from '@/data/loader';
import { MarkdownRenderer } from '../molecules/MarkdownRenderer';
import { FormSection } from '../ui/FormSection';

const cloud11Stats = [
  { label: 'Project Value', value: '฿40B' },
  { label: 'Retail NLA', value: '50K sqm' },
  { label: 'Hotel Rooms', value: '502' },
  { label: 'Retail Outlets', value: '250+' },
];

const dtpStats = [
  { label: 'Business Lines', value: '4' },
  { label: 'REIT Portfolio', value: '฿8.2B' },
  { label: 'UK Hotel Brands', value: '10' },
  { label: 'UK Staff', value: '1,200+' },
];

interface ProjectSummary {
  title: string;
  tagline: string;
  body: string;
}

/** Extract ## sections from the projects.md content */
function parseSmallProjects(content: string): ProjectSummary[] {
  const sections: ProjectSummary[] = [];
  const lines = content.split('\n');
  let current: { title: string; tagline: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (current) sections.push({ title: current.title, tagline: current.tagline, body: current.bodyLines.join('\n').trim() });
      current = { title: h2Match[1], tagline: '', bodyLines: [] };
      continue;
    }
    if (!current) continue;
    // First backtick line is the tagline
    if (!current.tagline && line.trim().startsWith('`')) {
      current.tagline = line.trim().replace(/`/g, '');
      continue;
    }
    current.bodyLines.push(line);
  }
  if (current) sections.push({ title: current.title, tagline: current.tagline, body: current.bodyLines.join('\n').trim() });
  return sections;
}

/** Strip the top-level heading from markdown content */
function stripH1(content: string): string {
  return content.replace(/^#\s+.+\n*/m, '');
}

export function ProjectsPage() {
  const cloud11File = getFile('cloud11');
  const dtpFile = getFile('dtp');
  const projectsFile = getFile('projects');

  const smallProjects = projectsFile ? parseSmallProjects(projectsFile.content) : [];

  const [cloud11Open, setCloud11Open] = useState(false);
  const [dtpOpen, setDtpOpen] = useState(false);
  const cloud11Ref = useRef<HTMLDivElement>(null);
  const dtpRef = useRef<HTMLDivElement>(null);

  const handleCardClick = useCallback((which: 'cloud11' | 'dtp') => {
    const setOpen = which === 'cloud11' ? setCloud11Open : setDtpOpen;
    const ref = which === 'cloud11' ? cloud11Ref : dtpRef;
    setOpen(true);
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  return (
    <div className="flex-1 min-w-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-4">
        <Link to="/" className="text-[var(--jf-lavender)] hover:underline flex items-center gap-1">
          <Home size={12} /> Home
        </Link>
        <ChevronRight size={12} className="opacity-30" />
        <span className="text-[var(--text-primary)]">Projects</span>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '2rem',
        fontWeight: 600,
        color: 'var(--jf-cream)',
        marginBottom: '8px',
      }}>
        Projects
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
        Major developments and investments across the DTGO group.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '40px' }}>
        {/* Cloud 11 Card */}
        <div
          className="wiki-card wiki-card-clickable"
          onClick={() => handleCardClick('cloud11')}
          style={{ padding: '28px 24px' }}
        >
          <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(79, 140, 255, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Cloud size={18} style={{ color: 'var(--mqdc-blue)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--jf-cream)' }}>
                Cloud 11
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                SE Asia's First Creator Hub
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {cloud11Stats.map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--jf-cream)', lineHeight: 1.2 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DTP Card */}
        <div
          className="wiki-card wiki-card-clickable"
          onClick={() => handleCardClick('dtp')}
          style={{ padding: '28px 24px' }}
        >
          <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(232, 67, 147, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Briefcase size={18} style={{ color: 'var(--dtp-pink)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--jf-cream)' }}>
                DTP — DTGO Prosperous
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Global Investment & Asset Management
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dtpStats.map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--jf-cream)', lineHeight: 1.2 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cloud 11 Detail */}
      {cloud11File && (
        <div ref={cloud11Ref}>
          <FormSection title="Cloud 11" description="Creator Hub · ฿40B · Sukhumvit" open={cloud11Open} onToggle={setCloud11Open}>
            <div className="prose">
              <MarkdownRenderer content={stripH1(cloud11File.content)} fileSlug="cloud11" />
            </div>
          </FormSection>
        </div>
      )}

      {/* DTP Detail */}
      {dtpFile && (
        <div ref={dtpRef}>
          <FormSection title="DTP — DTGO Prosperous" description="Global Investment · Acquire, Develop, Monetize" open={dtpOpen} onToggle={setDtpOpen}>
            <div className="prose">
              <MarkdownRenderer content={stripH1(dtpFile.content)} fileSlug="dtp" />
            </div>
          </FormSection>
        </div>
      )}

      {/* Other Projects List */}
      <FormSection title="Other Projects" description={`${smallProjects.length} projects`} defaultOpen={false}>
        <div className="space-y-6">
          {smallProjects.map(project => (
            <div
              key={project.title}
              style={{
                padding: '20px 24px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-card)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--jf-cream)', marginBottom: '4px' }}>
                {project.title}
              </div>
              {project.tagline && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.5px' }}>
                  {project.tagline}
                </div>
              )}
              <div className="prose">
                <MarkdownRenderer content={project.body} fileSlug="projects" />
              </div>
            </div>
          ))}
        </div>
      </FormSection>
    </div>
  );
}
