import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { DropdownItem } from '@/components/ui/DropdownItem';
import { FormSection } from '@/components/ui/FormSection';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { Cpu, Zap, Eye, X, Trash2, ChevronDown } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { AppFeature, AppFeatureStatus, ExperienceTechnology } from '@/types/tech';
import type { Zone, Location } from '@/types/zones';
import {
  subscribeToAppFeatures,
  saveAppFeature,
  updateAppFeature,
  deleteAppFeature,
  subscribeToExperienceTech,
  saveExperienceTech,
  updateExperienceTech,
  deleteExperienceTech,
} from '@/services/techService';
import { subscribeToZones, subscribeToLocations } from '@/services/zoneService';

// ---- Constants ----

const APP_STATUS_OPTIONS: AppFeatureStatus[] = ['planned', 'in-development', 'live', 'deprecated'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const CATEGORY_OPTIONS = ['Core', 'Social', 'Commerce', 'Analytics', 'Content', 'Integration', 'Other'];

const TECH_STATUS_OPTIONS = ['Active', 'Planned', 'In Development', 'Installed', 'Deprecated'];
const TYPE_OPTIONS = ['Hardware', 'AV', 'Interactive', 'Lighting', 'Software', 'Sensor', 'Display', 'Other'];

const EMPTY_APP_FORM = {
  name: '',
  description: '',
  status: 'planned' as AppFeatureStatus,
  category: '',
  priority: '',
};

const EMPTY_TECH_FORM = {
  name: '',
  description: '',
  type: '',
  vendor: '',
  status: 'Planned',
  costEstimate: '',
  zone: '',
  location: '',
};

// ---- Shared styles ----

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-input)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  marginBottom: '6px',
};

// ---- Badge helpers ----

function appStatusBadge(status: AppFeatureStatus) {
  const colorMap: Record<AppFeatureStatus, string> = {
    planned: 'neutral',
    'in-development': 'warning',
    live: 'success',
    deprecated: 'error',
  };
  const labelMap: Record<AppFeatureStatus, string> = {
    planned: 'Planned',
    'in-development': 'In Development',
    live: 'Live',
    deprecated: 'Deprecated',
  };
  return <Badge color={colorMap[status] as any}>{labelMap[status] || status}</Badge>;
}

function techStatusBadge(status: string) {
  if (status === 'Active' || status === 'Installed') return <Badge color="success">{status}</Badge>;
  if (status === 'In Development') return <Badge color="warning">{status}</Badge>;
  if (status === 'Planned') return <Badge color="info">{status}</Badge>;
  if (status === 'Deprecated') return <Badge color="error">{status}</Badge>;
  return <Badge color="default">{status}</Badge>;
}

function formatStatusLabel(s: AppFeatureStatus) {
  return s === 'in-development' ? 'In Development' : s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Page ----

export function TechDirectoryPage() {
  // --- Data subscriptions ---
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [techItems, setTechItems] = useState<ExperienceTechnology[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => subscribeToAppFeatures((f) => setFeatures(f)), []);
  useEffect(() => subscribeToExperienceTech((i) => setTechItems(i)), []);
  useEffect(() => subscribeToZones((z) => setZones(z)), []);
  useEffect(() => subscribeToLocations((l) => setLocations(l)), []);

  // --- Shared context menu ---
  const [ctxMenu, setCtxMenu] = useState<{ label: string; onRemove: () => void; x: number; y: number } | null>(null);
  const openCtxMenu = (label: string, onRemove: () => void, e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({
      label,
      onRemove,
      x: Math.min(e.clientX, window.innerWidth - 210),
      y: Math.min(e.clientY, window.innerHeight - 70),
    });
  };

  // ===== APP FEATURES state =====
  const [addAppOpen, setAddAppOpen] = useState(false);
  const [appForm, setAppForm] = useState(EMPTY_APP_FORM);
  const [appStatusDdOpen, setAppStatusDdOpen] = useState(false);
  const appStatusDdRef = useRef<HTMLButtonElement>(null);
  const [appCategoryDdOpen, setAppCategoryDdOpen] = useState(false);
  const appCategoryDdRef = useRef<HTMLButtonElement>(null);
  const [appPriorityDdOpen, setAppPriorityDdOpen] = useState(false);
  const appPriorityDdRef = useRef<HTMLButtonElement>(null);

  const [selectedApp, setSelectedApp] = useState<AppFeature | null>(null);
  const [reviewAppForm, setReviewAppForm] = useState(EMPTY_APP_FORM);
  const [reviewAppStatusDdOpen, setReviewAppStatusDdOpen] = useState(false);
  const reviewAppStatusDdRef = useRef<HTMLButtonElement>(null);
  const [reviewAppCategoryDdOpen, setReviewAppCategoryDdOpen] = useState(false);
  const reviewAppCategoryDdRef = useRef<HTMLButtonElement>(null);
  const [reviewAppPriorityDdOpen, setReviewAppPriorityDdOpen] = useState(false);
  const reviewAppPriorityDdRef = useRef<HTMLButtonElement>(null);

  const openAddApp = () => { setAppForm(EMPTY_APP_FORM); setAddAppOpen(true); };

  const submitAddApp = () => {
    if (!appForm.name.trim()) return;
    saveAppFeature({
      id: crypto.randomUUID(),
      name: appForm.name.trim(),
      description: appForm.description.trim(),
      status: appForm.status,
      category: appForm.category,
      priority: appForm.priority,
    });
    setAddAppOpen(false);
  };

  useEffect(() => {
    if (selectedApp) {
      setReviewAppForm({
        name: selectedApp.name,
        description: selectedApp.description,
        status: selectedApp.status,
        category: selectedApp.category,
        priority: selectedApp.priority,
      });
    }
  }, [selectedApp]);

  const closeReviewApp = () => {
    setSelectedApp(null);
    setReviewAppStatusDdOpen(false);
    setReviewAppCategoryDdOpen(false);
    setReviewAppPriorityDdOpen(false);
  };

  const submitEditApp = () => {
    if (!selectedApp) return;
    updateAppFeature(selectedApp.id, {
      name: reviewAppForm.name.trim(),
      description: reviewAppForm.description.trim(),
      status: reviewAppForm.status,
      category: reviewAppForm.category,
      priority: reviewAppForm.priority,
    });
    setSelectedApp(null);
  };

  // ===== EXPERIENCE TECH state =====
  const [addTechOpen, setAddTechOpen] = useState(false);
  const [techForm, setTechForm] = useState(EMPTY_TECH_FORM);
  const [techStatusDdOpen, setTechStatusDdOpen] = useState(false);
  const techStatusDdRef = useRef<HTMLButtonElement>(null);
  const [techTypeDdOpen, setTechTypeDdOpen] = useState(false);
  const techTypeDdRef = useRef<HTMLButtonElement>(null);
  const [techZoneDdOpen, setTechZoneDdOpen] = useState(false);
  const techZoneDdRef = useRef<HTMLButtonElement>(null);
  const [techLocDdOpen, setTechLocDdOpen] = useState(false);
  const techLocDdRef = useRef<HTMLButtonElement>(null);

  const [selectedTech, setSelectedTech] = useState<ExperienceTechnology | null>(null);
  const [reviewTechForm, setReviewTechForm] = useState(EMPTY_TECH_FORM);
  const [reviewTechStatusDdOpen, setReviewTechStatusDdOpen] = useState(false);
  const reviewTechStatusDdRef = useRef<HTMLButtonElement>(null);
  const [reviewTechTypeDdOpen, setReviewTechTypeDdOpen] = useState(false);
  const reviewTechTypeDdRef = useRef<HTMLButtonElement>(null);
  const [reviewTechZoneDdOpen, setReviewTechZoneDdOpen] = useState(false);
  const reviewTechZoneDdRef = useRef<HTMLButtonElement>(null);
  const [reviewTechLocDdOpen, setReviewTechLocDdOpen] = useState(false);
  const reviewTechLocDdRef = useRef<HTMLButtonElement>(null);

  const openAddTech = () => { setTechForm(EMPTY_TECH_FORM); setAddTechOpen(true); };

  const submitAddTech = () => {
    if (!techForm.name.trim()) return;
    saveExperienceTech({
      id: crypto.randomUUID(),
      name: techForm.name.trim(),
      description: techForm.description.trim(),
      type: techForm.type,
      vendor: techForm.vendor.trim(),
      status: techForm.status,
      costEstimate: Number(techForm.costEstimate) || 0,
      zone: techForm.zone,
      location: techForm.location,
    });
    setAddTechOpen(false);
  };

  useEffect(() => {
    if (selectedTech) {
      setReviewTechForm({
        name: selectedTech.name,
        description: selectedTech.description,
        type: selectedTech.type,
        vendor: selectedTech.vendor,
        status: selectedTech.status,
        costEstimate: selectedTech.costEstimate > 0 ? selectedTech.costEstimate.toString() : '',
        zone: selectedTech.zone,
        location: selectedTech.location,
      });
    }
  }, [selectedTech]);

  const closeReviewTech = () => {
    setSelectedTech(null);
    setReviewTechStatusDdOpen(false);
    setReviewTechTypeDdOpen(false);
    setReviewTechZoneDdOpen(false);
    setReviewTechLocDdOpen(false);
  };

  const submitEditTech = () => {
    if (!selectedTech) return;
    updateExperienceTech(selectedTech.id, {
      name: reviewTechForm.name.trim(),
      description: reviewTechForm.description.trim(),
      type: reviewTechForm.type,
      vendor: reviewTechForm.vendor.trim(),
      status: reviewTechForm.status,
      costEstimate: Number(reviewTechForm.costEstimate) || 0,
      zone: reviewTechForm.zone,
      location: reviewTechForm.location,
    });
    setSelectedTech(null);
  };

  // ---- Zone/Location dropdown helper ----
  const renderZoneLocDropdown = (
    label: string,
    value: string,
    anchorRef: React.RefObject<HTMLButtonElement | null>,
    isOpen: boolean,
    setOpen: (v: boolean | ((o: boolean) => boolean)) => void,
    options: { name: string }[],
    onSelect: (name: string) => void,
    emptyLabel: string,
  ) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
          {value || 'None'}
        </span>
        <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      </button>
      <Dropdown anchorRef={anchorRef} isOpen={isOpen} onClose={() => setOpen(false)} width={220} maxHeight={220}>
        <DropdownItem isSelected={!value} onClick={() => { onSelect(''); setOpen(false); }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>None</span>
        </DropdownItem>
        {options.length === 0 ? (
          <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {emptyLabel}
          </div>
        ) : options.map(opt => (
          <DropdownItem key={opt.name} isSelected={value === opt.name} onClick={() => { onSelect(opt.name); setOpen(false); }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{opt.name}</span>
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  );

  // ---- App Features columns ----
  const appColumns: ColumnDef<AppFeature, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { style: { width: '20%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { style: { width: '30%' } },
      cell: ({ row }) => (
        <span style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          display: 'block', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '15%', verticalAlign: 'middle' } },
      cell: ({ row }) => appStatusBadge(row.original.status),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      meta: { style: { width: '13%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.category || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      meta: { style: { width: '10%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.priority || '—'}
        </span>
      ),
    },
    {
      id: 'review',
      header: 'Review',
      meta: { style: { width: '12%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedApp(row.original)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', fontWeight: 500, color: 'var(--jf-lavender)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: '4px',
          }}
        >
          <Eye size={13} />
          Review
        </button>
      ),
    },
  ], []);

  // ---- Experience Tech columns ----
  const techColumns: ColumnDef<ExperienceTechnology, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { style: { width: '16%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      meta: { style: { width: '11%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.type || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      meta: { style: { width: '12%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.vendor || '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '12%', verticalAlign: 'middle' } },
      cell: ({ row }) => techStatusBadge(row.original.status),
    },
    {
      accessorKey: 'costEstimate',
      header: 'Est. Cost',
      meta: { style: { width: '11%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.costEstimate > 0 ? `$${row.original.costEstimate.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'zone',
      header: 'Zone',
      meta: { style: { width: '13%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.zone || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      meta: { style: { width: '13%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.location || '—'}
        </span>
      ),
    },
    {
      id: 'review',
      header: 'Review',
      meta: { style: { width: '12%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedTech(row.original)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', fontWeight: 500, color: 'var(--jf-lavender)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: '4px',
          }}
        >
          <Eye size={13} />
          Review
        </button>
      ),
    },
  ], []);

  return (
    <div>
      {/* ===== APP FEATURES ===== */}
      <FormSection
        title="App Features"
        description="Catalog of application capabilities and feature status"
        icon={Cpu}
        onAdd={openAddApp}
      >
        <DataTable
          data={features}
          columns={appColumns}
          hideSearch
          tableLayout="fixed"
          onRowContextMenu={(item, e) => openCtxMenu(item.name, () => {
            deleteAppFeature(item.id);
            setCtxMenu(null);
          }, e)}
        />
      </FormSection>

      {/* ===== EXPERIENCE TECHNOLOGY ===== */}
      <div style={{ marginTop: '48px' }}>
        <FormSection
          title="Experience Technology"
          description="Hardware, AV, interactive installations, and technology tied to zones and locations"
          icon={Zap}
          onAdd={openAddTech}
        >
          <DataTable
            data={techItems}
            columns={techColumns}
            hideSearch
            tableLayout="fixed"
            onRowContextMenu={(item, e) => openCtxMenu(item.name, () => {
              deleteExperienceTech(item.id);
              setCtxMenu(null);
            }, e)}
          />
        </FormSection>
      </div>

      {/* ===== SHARED CONTEXT MENU ===== */}
      {ctxMenu && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
          />
          <div style={{
            position: 'fixed', top: ctxMenu.y, left: ctxMenu.x,
            zIndex: 10001, width: 200, padding: '8px',
            backgroundColor: 'rgba(20,20,20,0.98)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              padding: '6px 12px 8px',
              fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '1.5px', color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {ctxMenu.label}
            </div>
            <DropdownItem onClick={ctxMenu.onRemove}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={13} style={{ color: 'var(--dtp-pink)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--dtp-pink)' }}>Remove</span>
              </div>
            </DropdownItem>
          </div>
        </>,
        document.body
      )}

      {/* ===== ADD APP FEATURE MODAL ===== */}
      {addAppOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10002,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setAddAppOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '560px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <Cpu size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Add App Feature</span>
              </div>
              <button onClick={() => setAddAppOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  style={inputStyle}
                  placeholder="Feature name"
                  value={appForm.name}
                  onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitAddApp()}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  placeholder="Brief description of this feature"
                  value={appForm.description}
                  onChange={e => setAppForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <button
                    ref={appStatusDdRef}
                    type="button"
                    onClick={() => setAppStatusDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{formatStatusLabel(appForm.status)}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={appStatusDdRef} isOpen={appStatusDdOpen} onClose={() => setAppStatusDdOpen(false)} width={180} maxHeight={220}>
                    {APP_STATUS_OPTIONS.map(s => (
                      <DropdownItem key={s} isSelected={appForm.status === s} onClick={() => { setAppForm(f => ({ ...f, status: s })); setAppStatusDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{formatStatusLabel(s)}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <button
                    ref={appCategoryDdRef}
                    type="button"
                    onClick={() => setAppCategoryDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: appForm.category ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {appForm.category || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={appCategoryDdRef} isOpen={appCategoryDdOpen} onClose={() => setAppCategoryDdOpen(false)} width={180} maxHeight={220}>
                    {CATEGORY_OPTIONS.map(c => (
                      <DropdownItem key={c} isSelected={appForm.category === c} onClick={() => { setAppForm(f => ({ ...f, category: c })); setAppCategoryDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <button
                    ref={appPriorityDdRef}
                    type="button"
                    onClick={() => setAppPriorityDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: appForm.priority ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {appForm.priority || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={appPriorityDdRef} isOpen={appPriorityDdOpen} onClose={() => setAppPriorityDdOpen(false)} width={180} maxHeight={220}>
                    {PRIORITY_OPTIONS.map(p => (
                      <DropdownItem key={p} isSelected={appForm.priority === p} onClick={() => { setAppForm(f => ({ ...f, priority: p })); setAppPriorityDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{p}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={() => setAddAppOpen(false)} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>
                Cancel
              </button>
              <button
                onClick={submitAddApp}
                disabled={!appForm.name.trim()}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  color: appForm.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  background: appForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)' : 'transparent',
                  border: `1px solid ${appForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 40%, transparent)' : 'var(--border-default)'}`,
                  borderRadius: '8px', cursor: appForm.name.trim() ? 'pointer' : 'not-allowed', padding: '8px 16px',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVIEW APP FEATURE MODAL ===== */}
      {selectedApp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeReviewApp} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                <Cpu size={14} style={{ color: 'var(--jf-lavender)', flexShrink: 0 }} />
                <InlineEdit
                  value={reviewAppForm.name}
                  onSave={(v) => setReviewAppForm(f => ({ ...f, name: v }))}
                  placeholder="Feature name"
                />
              </div>
              <button onClick={closeReviewApp} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  placeholder="Brief description"
                  value={reviewAppForm.description}
                  onChange={e => setReviewAppForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <button
                    ref={reviewAppStatusDdRef}
                    type="button"
                    onClick={() => setReviewAppStatusDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{formatStatusLabel(reviewAppForm.status)}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={reviewAppStatusDdRef} isOpen={reviewAppStatusDdOpen} onClose={() => setReviewAppStatusDdOpen(false)} width={180} maxHeight={220}>
                    {APP_STATUS_OPTIONS.map(s => (
                      <DropdownItem key={s} isSelected={reviewAppForm.status === s} onClick={() => { setReviewAppForm(f => ({ ...f, status: s })); setReviewAppStatusDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{formatStatusLabel(s)}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <button
                    ref={reviewAppCategoryDdRef}
                    type="button"
                    onClick={() => setReviewAppCategoryDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: reviewAppForm.category ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {reviewAppForm.category || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={reviewAppCategoryDdRef} isOpen={reviewAppCategoryDdOpen} onClose={() => setReviewAppCategoryDdOpen(false)} width={180} maxHeight={220}>
                    {CATEGORY_OPTIONS.map(c => (
                      <DropdownItem key={c} isSelected={reviewAppForm.category === c} onClick={() => { setReviewAppForm(f => ({ ...f, category: c })); setReviewAppCategoryDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <button
                    ref={reviewAppPriorityDdRef}
                    type="button"
                    onClick={() => setReviewAppPriorityDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: reviewAppForm.priority ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {reviewAppForm.priority || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={reviewAppPriorityDdRef} isOpen={reviewAppPriorityDdOpen} onClose={() => setReviewAppPriorityDdOpen(false)} width={180} maxHeight={220}>
                    {PRIORITY_OPTIONS.map(p => (
                      <DropdownItem key={p} isSelected={reviewAppForm.priority === p} onClick={() => { setReviewAppForm(f => ({ ...f, priority: p })); setReviewAppPriorityDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{p}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={closeReviewApp} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>
                Cancel
              </button>
              <button
                onClick={submitEditApp}
                style={{
                  fontSize: '13px', fontWeight: 500, color: 'var(--jf-cream)',
                  background: 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)',
                  borderRadius: '8px', cursor: 'pointer', padding: '8px 16px',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD EXPERIENCE TECH MODAL ===== */}
      {addTechOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10002,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setAddTechOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '620px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Add Experience Technology</span>
              </div>
              <button onClick={() => setAddTechOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  style={inputStyle}
                  placeholder="Technology name"
                  value={techForm.name}
                  onChange={e => setTechForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitAddTech()}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  placeholder="Brief description"
                  value={techForm.description}
                  onChange={e => setTechForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <button
                    ref={techTypeDdRef}
                    type="button"
                    onClick={() => setTechTypeDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: techForm.type ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {techForm.type || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={techTypeDdRef} isOpen={techTypeDdOpen} onClose={() => setTechTypeDdOpen(false)} width={180} maxHeight={220}>
                    {TYPE_OPTIONS.map(t => (
                      <DropdownItem key={t} isSelected={techForm.type === t} onClick={() => { setTechForm(f => ({ ...f, type: t })); setTechTypeDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Vendor</label>
                  <input
                    style={inputStyle}
                    placeholder="Vendor name"
                    value={techForm.vendor}
                    onChange={e => setTechForm(f => ({ ...f, vendor: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <button
                    ref={techStatusDdRef}
                    type="button"
                    onClick={() => setTechStatusDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{techForm.status}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={techStatusDdRef} isOpen={techStatusDdOpen} onClose={() => setTechStatusDdOpen(false)} width={180} maxHeight={220}>
                    {TECH_STATUS_OPTIONS.map(s => (
                      <DropdownItem key={s} isSelected={techForm.status === s} onClick={() => { setTechForm(f => ({ ...f, status: s })); setTechStatusDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Est. Cost</label>
                  <input
                    style={inputStyle}
                    placeholder="$0"
                    value={techForm.costEstimate}
                    onChange={e => setTechForm(f => ({ ...f, costEstimate: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {renderZoneLocDropdown(
                  'Zone', techForm.zone, techZoneDdRef, techZoneDdOpen, setTechZoneDdOpen,
                  zones, (name) => setTechForm(f => ({ ...f, zone: name })), 'No zones yet',
                )}
                {renderZoneLocDropdown(
                  'Location', techForm.location, techLocDdRef, techLocDdOpen, setTechLocDdOpen,
                  locations, (name) => setTechForm(f => ({ ...f, location: name })), 'No locations yet',
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={() => setAddTechOpen(false)} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>
                Cancel
              </button>
              <button
                onClick={submitAddTech}
                disabled={!techForm.name.trim()}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  color: techForm.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  background: techForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)' : 'transparent',
                  border: `1px solid ${techForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 40%, transparent)' : 'var(--border-default)'}`,
                  borderRadius: '8px', cursor: techForm.name.trim() ? 'pointer' : 'not-allowed', padding: '8px 16px',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVIEW EXPERIENCE TECH MODAL ===== */}
      {selectedTech && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeReviewTech} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                <Zap size={14} style={{ color: 'var(--jf-lavender)', flexShrink: 0 }} />
                <InlineEdit
                  value={reviewTechForm.name}
                  onSave={(v) => setReviewTechForm(f => ({ ...f, name: v }))}
                  placeholder="Technology name"
                />
              </div>
              <button onClick={closeReviewTech} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  placeholder="Brief description"
                  value={reviewTechForm.description}
                  onChange={e => setReviewTechForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <button
                    ref={reviewTechTypeDdRef}
                    type="button"
                    onClick={() => setReviewTechTypeDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: reviewTechForm.type ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {reviewTechForm.type || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={reviewTechTypeDdRef} isOpen={reviewTechTypeDdOpen} onClose={() => setReviewTechTypeDdOpen(false)} width={180} maxHeight={220}>
                    {TYPE_OPTIONS.map(t => (
                      <DropdownItem key={t} isSelected={reviewTechForm.type === t} onClick={() => { setReviewTechForm(f => ({ ...f, type: t })); setReviewTechTypeDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Vendor</label>
                  <input
                    style={inputStyle}
                    placeholder="Vendor name"
                    value={reviewTechForm.vendor}
                    onChange={e => setReviewTechForm(f => ({ ...f, vendor: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <button
                    ref={reviewTechStatusDdRef}
                    type="button"
                    onClick={() => setReviewTechStatusDdOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>{reviewTechForm.status}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={reviewTechStatusDdRef} isOpen={reviewTechStatusDdOpen} onClose={() => setReviewTechStatusDdOpen(false)} width={180} maxHeight={220}>
                    {TECH_STATUS_OPTIONS.map(s => (
                      <DropdownItem key={s} isSelected={reviewTechForm.status === s} onClick={() => { setReviewTechForm(f => ({ ...f, status: s })); setReviewTechStatusDdOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Est. Cost</label>
                  <input
                    style={inputStyle}
                    placeholder="$0"
                    value={reviewTechForm.costEstimate}
                    onChange={e => setReviewTechForm(f => ({ ...f, costEstimate: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {renderZoneLocDropdown(
                  'Zone', reviewTechForm.zone, reviewTechZoneDdRef, reviewTechZoneDdOpen, setReviewTechZoneDdOpen,
                  zones, (name) => setReviewTechForm(f => ({ ...f, zone: name })), 'No zones yet',
                )}
                {renderZoneLocDropdown(
                  'Location', reviewTechForm.location, reviewTechLocDdRef, reviewTechLocDdOpen, setReviewTechLocDdOpen,
                  locations, (name) => setReviewTechForm(f => ({ ...f, location: name })), 'No locations yet',
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={closeReviewTech} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>
                Cancel
              </button>
              <button
                onClick={submitEditTech}
                style={{
                  fontSize: '13px', fontWeight: 500, color: 'var(--jf-cream)',
                  background: 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)',
                  borderRadius: '8px', cursor: 'pointer', padding: '8px 16px',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
