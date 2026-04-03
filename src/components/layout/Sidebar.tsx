import { useNavigate, useLocation } from 'react-router-dom';
import { getAllFiles } from '@/data/loader';
import { SidebarMenuItem } from '../ui/SidebarMenuItem';
import {
  Building2, Users, FolderOpen, Clock, Handshake,
  TreePine, Cloud, Briefcase, FileText, Network, Inbox, Lightbulb, Paperclip, ClipboardCheck
} from 'lucide-react';

const businessUnitSlugs = new Set(['mqdc', 'tnb', 'dtp', 'forestias', 'cloud11', 'projects']);
const hiddenFromBusinessUnits = new Set(['cloud11', 'dtp', 'projects']);

const iconMap: Record<string, typeof Building2> = {
  index: Building2,
  mqdc: Building2,
  tnb: FileText,
  dtp: Briefcase,
  forestias: TreePine,
  cloud11: Cloud,
  projects: FolderOpen,
  'people/index': Users,
  history: Clock,
  partnerships: Handshake,
  analysis: Lightbulb,
};

// Short labels for sidebar (full titles are too long)
const shortLabels: Record<string, string> = {
  index: 'Group Overview',
  mqdc: 'MQDC',
  tnb: 'T&B Media',
  dtp: 'DTP',
  forestias: 'The Forestias',
  cloud11: 'Cloud 11',
  projects: 'Other Projects',
  'people/index': 'Key People',
  history: 'Timeline',
  partnerships: 'Partnerships',
  analysis: 'My Analysis',
};

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const files = getAllFiles();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="flex flex-col h-full">
      {/* Brand header */}
      <div
        className="flex items-center gap-3 cursor-pointer border-b border-[#151515]"
        style={{
          padding: collapsed ? '20px 0' : '20px 24px',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
        onClick={() => navigate('/')}
      >
        <Building2 size={20} style={{ color: '#ccccff', flexShrink: 0 }} />
        {!collapsed && (
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            color: '#f8f3e8',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            DTGO Wiki
          </span>
        )}
      </div>

      {/* Org Chart link */}
      {!collapsed && (
        <div style={{
          padding: '16px 24px 8px',
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'rgba(248,243,232,0.3)',
          fontWeight: 600,
        }}>
          Views
        </div>
      )}
      <SidebarMenuItem
        icon={Network}
        label="Org Chart"
        isActive={location.pathname === '/org-chart'}
        collapsed={collapsed}
        onClick={() => navigate('/org-chart')}
      />
      <SidebarMenuItem
        icon={Clock}
        label="Timeline"
        isActive={location.pathname === '/timeline'}
        collapsed={collapsed}
        onClick={() => navigate('/timeline')}
      />
      <SidebarMenuItem
        icon={Inbox}
        label="Intake"
        isActive={location.pathname === '/intake'}
        collapsed={collapsed}
        onClick={() => navigate('/intake')}
      />
      <SidebarMenuItem
        icon={Paperclip}
        label="Files"
        isActive={location.pathname === '/attachments'}
        collapsed={collapsed}
        onClick={() => navigate('/attachments')}
      />
      <SidebarMenuItem
        icon={ClipboardCheck}
        label="Approvals"
        isActive={location.pathname === '/approvals'}
        collapsed={collapsed}
        onClick={() => navigate('/approvals')}
      />
      <SidebarMenuItem
        icon={Users}
        label="Directory"
        isActive={location.pathname === '/directory'}
        collapsed={collapsed}
        onClick={() => navigate('/directory')}
      />

      {/* Business Units */}
      {!collapsed && (
        <div style={{
          padding: '16px 24px 8px',
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'rgba(248,243,232,0.3)',
          fontWeight: 600,
        }}>
          Business Units
        </div>
      )}
      {files.filter(f => businessUnitSlugs.has(f.slug) && !hiddenFromBusinessUnits.has(f.slug)).map(file => {
        const Icon = iconMap[file.slug] || FileText;
        const isActive = location.pathname === `/file/${file.slug}`;
        return (
          <SidebarMenuItem
            key={file.slug}
            icon={Icon}
            label={shortLabels[file.slug] || file.title}
            isActive={isActive}
            collapsed={collapsed}
            onClick={() => navigate(`/file/${file.slug}`)}
          />
        );
      })}
      <SidebarMenuItem
        icon={FolderOpen}
        label="Projects"
        isActive={location.pathname === '/projects'}
        collapsed={collapsed}
        onClick={() => navigate('/projects')}
      />

      {/* Knowledge Base */}
      {!collapsed && (
        <div style={{
          padding: '16px 24px 8px',
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'rgba(248,243,232,0.3)',
          fontWeight: 600,
        }}>
          Knowledge Base
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {files.filter(f => !businessUnitSlugs.has(f.slug) && f.slug !== 'history' && f.slug !== 'people/index' && f.slug !== 'partnerships' && (!f.slug.includes('/') || f.slug.endsWith('/index'))).map(file => {
          const Icon = iconMap[file.slug] || FileText;
          const isActive = location.pathname === `/file/${file.slug}`;
          return (
            <SidebarMenuItem
              key={file.slug}
              icon={Icon}
              label={shortLabels[file.slug] || file.title}
              isActive={isActive}
              collapsed={collapsed}
              onClick={() => navigate(`/file/${file.slug}`)}
            />
          );
        })}
      </div>
    </nav>
  );
}
