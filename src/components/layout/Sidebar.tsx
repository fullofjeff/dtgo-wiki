import { useNavigate, useLocation } from 'react-router-dom';
import { getAllFiles } from '@/data/loader';
import { SidebarMenuItem } from '../ui/SidebarMenuItem';
import {
  Building2, Users, FolderOpen, Clock, Handshake,
  TreePine, Cloud, Briefcase, FileText, Network, Inbox
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

// Short labels for sidebar (full titles are too long)
const shortLabels: Record<string, string> = {
  index: 'Group Overview',
  mqdc: 'MQDC',
  tnb: 'T&B Media',
  dtp: 'DTP',
  forestias: 'The Forestias',
  cloud11: 'Cloud 11',
  projects: 'Other Projects',
  people: 'Key People',
  history: 'Timeline',
  partnerships: 'Partnerships',
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
        icon={Inbox}
        label="Intake"
        isActive={location.pathname === '/intake'}
        collapsed={collapsed}
        onClick={() => navigate('/intake')}
      />

      {/* Section label */}
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

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto">
        {files.map(file => {
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
