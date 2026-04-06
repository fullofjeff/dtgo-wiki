import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { LocationTree } from '@/components/pages/LocationTree';
import type { TreeState, LocationData } from '@/components/pages/LocationTree';
import { createPortal } from 'react-dom';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { DropdownItem } from '@/components/ui/DropdownItem';
import { Dropdown } from '@/components/ui/Dropdown';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormSection } from '@/components/ui/FormSection';
import { MapPin, Eye, X, Plus, Trash2, Building2, ChevronDown, Pencil, CalendarDays, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Select, Chip } from '@/components/ui';
import type { ChipColor } from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';
import type { Zone, Location, ZoneStatusOption, ZoneStatus, MerchItem, FnBItem, ProgramItem } from '@/types/zones';
import {
  subscribeToZones,
  subscribeToLocations,
  subscribeToZoneStatuses,
  saveZone,
  updateZone as updateZoneDoc,
  deleteZone as deleteZoneDoc,
  saveLocation as saveLocationDoc,
  updateLocation as updateLocationDoc,
  deleteLocation as deleteLocationDoc,
  saveZoneStatus,
  deleteZoneStatus,
  seedLocations,
  seedZoneStatuses,
  subscribeToMerchItems,
  saveMerchItem,
  updateMerchItem as updateMerchDoc,
  deleteMerchItem as deleteMerchDoc,
  subscribeToFnBItems,
  saveFnBItem,
  updateFnBItem as updateFnBDoc,
  deleteFnBItem as deleteFnBDoc,
  subscribeToProgramItems,
  saveProgramItem,
  updateProgramItem as updateProgramDoc,
  deleteProgramItem as deleteProgramDoc,
  subscribeToLocationTree,
  saveLocationTree,
} from '@/services/zoneService';

// ---- Defaults (used for seeding) ----

const DEFAULT_STATUSES: ZoneStatusOption[] = [
  { id: 'status-active', name: 'Active' },
  { id: 'status-inactive', name: 'Inactive' },
  { id: 'status-under-review', name: 'Under Review' },
  { id: 'status-pending', name: 'Pending' },
];

const DEFAULT_LOCATIONS: Location[] = [
  { id: 'loc-1', name: 'Habitat Retail', rsqFootage: 0, startRentPerMonth: 0, tiPerSqft: 0, lossFactor: 0 },
  { id: 'loc-2', name: 'Habitat Village', rsqFootage: 0, startRentPerMonth: 0, tiPerSqft: 0, lossFactor: 0 },
  { id: 'loc-3', name: 'Forest', rsqFootage: 0, startRentPerMonth: 0, tiPerSqft: 0, lossFactor: 0 },
  { id: 'loc-4', name: 'Pavilion', rsqFootage: 0, startRentPerMonth: 0, tiPerSqft: 0, lossFactor: 0 },
];

// ---- Shared styles ----

const EMPTY_ZONE_FORM = {
  name: '',
  location: '',
  description: '',
  status: 'CONCEPT' as ZoneStatus,
  phase: '',
  sqft: '',
  buildCostPerSqft: '',
  personalization: false,
  appIntegration: false,
  configurableProgram: false,
  potentialLocations: [] as string[],
};

const EMPTY_MERCH_FORM = {
  name: '',
  type: '',
  location: '',
  description: '',
  status: 'CONCEPT' as ZoneStatus,
};

const EMPTY_FNB_FORM = {
  name: '',
  type: '',
  location: '',
  description: '',
  status: 'CONCEPT' as ZoneStatus,
};

const EMPTY_PROGRAM_FORM = {
  name: '',
  location: '',
  phase: '',
  description: '',
  status: 'CONCEPT' as ZoneStatus,
  content: false,
  performers: false,
  services: false,
  personalization: false,
  appIntegration: false,
  configurableProgram: false,
};

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

// ---- Reusable section header ----

function SectionHeader({
  icon: Icon, title, subtitle, onAdd, addLabel,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Icon size={20} style={{ color: 'var(--jf-lavender)' }} />
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: 'var(--jf-cream)',
            margin: 0,
          }}>
            {title}
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 300, margin: 0 }}>
          {subtitle}
        </p>
      </div>
      <button
        onClick={onAdd}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: 500, color: 'var(--jf-cream)',
          background: 'color-mix(in srgb, var(--jf-lavender) 15%, transparent)',
          border: '1px solid color-mix(in srgb, var(--jf-lavender) 30%, transparent)',
          borderRadius: '8px', cursor: 'pointer', padding: '7px 12px', marginTop: '4px',
        }}
      >
        <Plus size={13} />
        {addLabel}
      </button>
    </div>
  );
}

// ---- Page ----

export function ZonesPage() {
  // --- Locations (Firestore) ---
  const [locations, setLocations] = useState<Location[]>([]);
  const locationsSeeded = useRef(false);
  useEffect(() => {
    return subscribeToLocations((locs) => {
      if (locs.length === 0 && !locationsSeeded.current) {
        locationsSeeded.current = true;
        seedLocations(DEFAULT_LOCATIONS);
        return;
      }
      setLocations(locs);
    });
  }, []);

  // --- Location tree: load from Firestore, seed from locations if empty ---
  // undefined = still loading, null = Firestore returned no doc, TreeState = loaded
  const [locationTreeState, setLocationTreeState] = useState<TreeState | null | undefined>(undefined);
  const locationTreeSeeded = useRef(false);

  useEffect(() => {
    return subscribeToLocationTree((state) => {
      setLocationTreeState(state);
    });
  }, []);

  // Seed from old locations table when Firestore has no tree yet
  useEffect(() => {
    if (locationTreeState !== null) return; // already has data or still loading
    if (locations.length === 0) return;
    if (locationTreeSeeded.current) return;
    locationTreeSeeded.current = true;

    const siteId = 'seed-site-dtgo';
    const nodes: Record<string, LocationData> = {
      [siteId]: { id: siteId, parentId: null, name: 'DTGO Project', type: 'site' },
    };
    const buildingIds: string[] = [];
    for (const loc of locations) {
      const bId = `seed-${loc.id}`;
      const node: LocationData = { id: bId, parentId: siteId, name: loc.name, type: 'building' };
      if (loc.rsqFootage > 0) node.sqft = loc.rsqFootage;
      if (loc.description) node.description = loc.description;
      nodes[bId] = node;
      buildingIds.push(bId);
    }
    const seed: TreeState = {
      nodes,
      children: {
        root: [siteId],
        [siteId]: buildingIds,
        ...Object.fromEntries(buildingIds.map(id => [id, []])),
      },
    };
    saveLocationTree(seed);
  }, [locationTreeState, locations]);

  // --- Zones (Firestore) ---
  const [zones, setZones] = useState<Zone[]>([]);
  useEffect(() => {
    return subscribeToZones((z) => setZones(z));
  }, []);

  // --- Merch Items (Firestore) ---
  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);
  useEffect(() => {
    return subscribeToMerchItems((items) => setMerchItems(items));
  }, []);

  // --- F&B Items (Firestore) ---
  const [fnbItems, setFnbItems] = useState<FnBItem[]>([]);
  useEffect(() => {
    return subscribeToFnBItems((items) => setFnbItems(items));
  }, []);

  // --- UI state ---
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [addLocName, setAddLocName] = useState('');
  const [addLocIndoor, setAddLocIndoor] = useState(false);
  const [addLocOutdoor, setAddLocOutdoor] = useState(false);
  const [addLocFloor, setAddLocFloor] = useState('');
  const [addLocDescription, setAddLocDescription] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [editLocForm, setEditLocForm] = useState<Partial<Location>>({});
  const [zoneForm, setZoneForm] = useState(EMPTY_ZONE_FORM);
  const [manageStatusOpen, setManageStatusOpen] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');

  // --- Review modal edit state ---
  const [reviewForm, setReviewForm] = useState(EMPTY_ZONE_FORM);
  const [reviewLocDropdownOpen, setReviewLocDropdownOpen] = useState(false);
  const reviewLocDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [reviewStatusDropdownOpen, setReviewStatusDropdownOpen] = useState(false);
  const reviewStatusDropdownAnchorRef = useRef<HTMLButtonElement>(null);

  // --- Merch UI state ---
  const [addMerchOpen, setAddMerchOpen] = useState(false);
  const [merchForm, setMerchForm] = useState(EMPTY_MERCH_FORM);
  const [merchLocDropdownOpen, setMerchLocDropdownOpen] = useState(false);
  const merchLocDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [merchStatusDropdownOpen, setMerchStatusDropdownOpen] = useState(false);
  const merchStatusDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [selectedMerch, setSelectedMerch] = useState<MerchItem | null>(null);
  const [reviewMerchForm, setReviewMerchForm] = useState(EMPTY_MERCH_FORM);
  const [reviewMerchLocDropdownOpen, setReviewMerchLocDropdownOpen] = useState(false);
  const reviewMerchLocDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [reviewMerchStatusDropdownOpen, setReviewMerchStatusDropdownOpen] = useState(false);
  const reviewMerchStatusDropdownAnchorRef = useRef<HTMLButtonElement>(null);

  // --- Program Items (Firestore) ---
  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  useEffect(() => {
    return subscribeToProgramItems((items) => setProgramItems(items));
  }, []);

  // --- Program UI state ---
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [programForm, setProgramForm] = useState(EMPTY_PROGRAM_FORM);
  const [programLocDropdownOpen, setProgramLocDropdownOpen] = useState(false);
  const programLocDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [programStatusDropdownOpen, setProgramStatusDropdownOpen] = useState(false);
  const programStatusDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [reviewProgramForm, setReviewProgramForm] = useState(EMPTY_PROGRAM_FORM);
  const [reviewProgramLocDropdownOpen, setReviewProgramLocDropdownOpen] = useState(false);
  const reviewProgramLocDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [reviewProgramStatusDropdownOpen, setReviewProgramStatusDropdownOpen] = useState(false);
  const reviewProgramStatusDropdownAnchorRef = useRef<HTMLButtonElement>(null);

  // --- F&B UI state ---
  const [addFnbOpen, setAddFnbOpen] = useState(false);
  const [fnbForm, setFnbForm] = useState(EMPTY_FNB_FORM);
  const [fnbLocDropdownOpen, setFnbLocDropdownOpen] = useState(false);
  const fnbLocDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [fnbStatusDropdownOpen, setFnbStatusDropdownOpen] = useState(false);
  const fnbStatusDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [selectedFnb, setSelectedFnb] = useState<FnBItem | null>(null);
  const [reviewFnbForm, setReviewFnbForm] = useState(EMPTY_FNB_FORM);
  const [reviewFnbLocDropdownOpen, setReviewFnbLocDropdownOpen] = useState(false);
  const reviewFnbLocDropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [reviewFnbStatusDropdownOpen, setReviewFnbStatusDropdownOpen] = useState(false);
  const reviewFnbStatusDropdownAnchorRef = useRef<HTMLButtonElement>(null);

  // --- Status options (Firestore) ---
  const [statusDocs, setStatusDocs] = useState<ZoneStatusOption[]>([]);
  const statusesSeeded = useRef(false);
  useEffect(() => {
    return subscribeToZoneStatuses((docs) => {
      if (docs.length === 0 && !statusesSeeded.current) {
        statusesSeeded.current = true;
        seedZoneStatuses(DEFAULT_STATUSES);
        return;
      }
      setStatusDocs(docs);
    });
  }, []);
  const statusOptions = useMemo(() => statusDocs.map((d) => d.name), [statusDocs]);

  const statusChipColor = (name: string): ChipColor => {
    const n = name.toLowerCase();
    if (n.includes('active') && !n.includes('inactive')) return 'success';
    if (n.includes('inactive')) return 'neutral';
    if (n.includes('review')) return 'warning';
    if (n.includes('pending')) return 'info';
    if (n.includes('concept')) return 'default';
    return 'neutral';
  };

  // Shared right-click context menu
  const [ctxMenu, setCtxMenu] = useState<{
    label: string;
    onRemove: () => void;
    x: number;
    y: number;
  } | null>(null);

  const openCtxMenu = (label: string, onRemove: () => void, e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({
      label,
      onRemove,
      x: Math.min(e.clientX, window.innerWidth - 210),
      y: Math.min(e.clientY, window.innerHeight - 70),
    });
  };

  // --- Location handlers ---
  const updateLocation = useCallback((
    id: string,
    field: keyof Omit<Location, 'id' | 'name'>,
    value: number,
  ) => {
    updateLocationDoc(id, { [field]: value });
  }, []);

  const updateLocationName = useCallback((id: string, name: string) => {
    updateLocationDoc(id, { name });
  }, []);

  const addLocation = () => {
    if (!addLocName.trim()) return;
    saveLocationDoc({
      id: crypto.randomUUID(),
      name: addLocName.trim(),
      rsqFootage: 0, startRentPerMonth: 0, tiPerSqft: 0, lossFactor: 0,
      ...(addLocIndoor && { indoor: true }),
      ...(addLocOutdoor && { outdoor: true }),
      ...(addLocFloor.trim() && { floor: addLocFloor.trim() }),
      ...(addLocDescription.trim() && { description: addLocDescription.trim() }),
    });
    setAddLocName('');
    setAddLocIndoor(false);
    setAddLocOutdoor(false);
    setAddLocFloor('');
    setAddLocDescription('');
    setAddLocOpen(false);
  };

  const openEditLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setEditLocForm({ ...loc });
  };

  const closeEditLocation = () => {
    setSelectedLocation(null);
    setEditLocForm({});
  };

  const submitEditLocation = () => {
    if (!selectedLocation || !editLocForm.name?.trim()) return;
    const { id, ...fields } = editLocForm as Location;
    updateLocationDoc(selectedLocation.id, {
      name: fields.name?.trim() ?? selectedLocation.name,
      rsqFootage: fields.rsqFootage ?? selectedLocation.rsqFootage,
      startRentPerMonth: fields.startRentPerMonth ?? selectedLocation.startRentPerMonth,
      tiPerSqft: fields.tiPerSqft ?? selectedLocation.tiPerSqft,
      lossFactor: fields.lossFactor ?? selectedLocation.lossFactor,
      indoor: fields.indoor ?? false,
      outdoor: fields.outdoor ?? false,
      floor: fields.floor ?? '',
      description: fields.description ?? '',
    });
    closeEditLocation();
  };

  // --- Zone handlers ---
  const submitAddZone = () => {
    if (!zoneForm.name.trim()) return;
    saveZone({
      id: crypto.randomUUID(),
      name: zoneForm.name.trim(),
      location: zoneForm.location,
      description: zoneForm.description.trim(),
      status: zoneForm.status,
      phase: zoneForm.phase.trim(),
      sqft: Number(zoneForm.sqft) || 0,
      buildCostPerSqft: Number(zoneForm.buildCostPerSqft) || 0,
      personalization: zoneForm.personalization,
      appIntegration: zoneForm.appIntegration,
      configurableProgram: zoneForm.configurableProgram,
      potentialLocations: zoneForm.potentialLocations.length > 0 ? zoneForm.potentialLocations : undefined,
    });
    setAddZoneOpen(false);
  };

  const openAddZone = () => { setZoneForm(EMPTY_ZONE_FORM); setAddZoneOpen(true); };

  // --- Review modal helpers ---
  useEffect(() => {
    if (selectedZone) {
      setReviewForm({
        ...EMPTY_ZONE_FORM,
        name: selectedZone.name,
        location: selectedZone.location,
        description: selectedZone.description,
        status: selectedZone.status,
        phase: selectedZone.phase,
        sqft: selectedZone.sqft > 0 ? selectedZone.sqft.toString() : '',
        buildCostPerSqft: selectedZone.buildCostPerSqft > 0 ? selectedZone.buildCostPerSqft.toString() : '',
      });
    }
  }, [selectedZone]);

  const closeReviewModal = () => {
    setSelectedZone(null);
    setReviewLocDropdownOpen(false);
    setReviewStatusDropdownOpen(false);
  };

  const submitEditZone = () => {
    if (!selectedZone) return;
    updateZoneDoc(selectedZone.id, {
      name: reviewForm.name.trim(),
      location: reviewForm.location,
      description: reviewForm.description.trim(),
      status: reviewForm.status,
      phase: reviewForm.phase.trim(),
      sqft: Number(reviewForm.sqft) || 0,
      buildCostPerSqft: Number(reviewForm.buildCostPerSqft) || 0,
    });
    setSelectedZone(null);
  };

  // --- Merch handlers ---
  const openAddMerch = () => { setMerchForm(EMPTY_MERCH_FORM); setAddMerchOpen(true); };

  const submitAddMerch = () => {
    if (!merchForm.name.trim()) return;
    saveMerchItem({
      id: crypto.randomUUID(),
      name: merchForm.name.trim(),
      type: merchForm.type.trim(),
      location: merchForm.location,
      description: merchForm.description.trim(),
      status: merchForm.status,
    });
    setAddMerchOpen(false);
  };

  useEffect(() => {
    if (selectedMerch) {
      setReviewMerchForm({
        name: selectedMerch.name,
        type: selectedMerch.type,
        location: selectedMerch.location,
        description: selectedMerch.description,
        status: selectedMerch.status,
      });
    }
  }, [selectedMerch]);

  const closeReviewMerch = () => {
    setSelectedMerch(null);
    setReviewMerchLocDropdownOpen(false);
    setReviewMerchStatusDropdownOpen(false);
  };

  const submitEditMerch = () => {
    if (!selectedMerch) return;
    updateMerchDoc(selectedMerch.id, {
      name: reviewMerchForm.name.trim(),
      type: reviewMerchForm.type.trim(),
      location: reviewMerchForm.location,
      description: reviewMerchForm.description.trim(),
      status: reviewMerchForm.status,
    });
    setSelectedMerch(null);
  };

  // --- F&B handlers ---
  const openAddFnb = () => { setFnbForm(EMPTY_FNB_FORM); setAddFnbOpen(true); };

  const submitAddFnb = () => {
    if (!fnbForm.name.trim()) return;
    saveFnBItem({
      id: crypto.randomUUID(),
      name: fnbForm.name.trim(),
      type: fnbForm.type.trim(),
      location: fnbForm.location,
      description: fnbForm.description.trim(),
      status: fnbForm.status,
    });
    setAddFnbOpen(false);
  };

  useEffect(() => {
    if (selectedFnb) {
      setReviewFnbForm({
        name: selectedFnb.name,
        type: selectedFnb.type,
        location: selectedFnb.location,
        description: selectedFnb.description,
        status: selectedFnb.status,
      });
    }
  }, [selectedFnb]);

  const closeReviewFnb = () => {
    setSelectedFnb(null);
    setReviewFnbLocDropdownOpen(false);
    setReviewFnbStatusDropdownOpen(false);
  };

  const submitEditFnb = () => {
    if (!selectedFnb) return;
    updateFnBDoc(selectedFnb.id, {
      name: reviewFnbForm.name.trim(),
      type: reviewFnbForm.type.trim(),
      location: reviewFnbForm.location,
      description: reviewFnbForm.description.trim(),
      status: reviewFnbForm.status,
    });
    setSelectedFnb(null);
  };

  // --- Program handlers ---
  const openAddProgram = () => { setProgramForm(EMPTY_PROGRAM_FORM); setAddProgramOpen(true); };

  const submitAddProgram = () => {
    if (!programForm.name.trim()) return;
    saveProgramItem({
      id: crypto.randomUUID(),
      name: programForm.name.trim(),
      location: programForm.location,
      phase: programForm.phase.trim(),
      description: programForm.description.trim(),
      status: programForm.status,
      content: programForm.content,
      performers: programForm.performers,
      services: programForm.services,
      personalization: programForm.personalization,
      appIntegration: programForm.appIntegration,
      configurableProgram: programForm.configurableProgram,
    });
    setAddProgramOpen(false);
  };

  useEffect(() => {
    if (selectedProgram) {
      setReviewProgramForm({
        name: selectedProgram.name,
        location: selectedProgram.location,
        phase: selectedProgram.phase,
        description: selectedProgram.description,
        status: selectedProgram.status,
        content: selectedProgram.content ?? false,
        performers: selectedProgram.performers ?? false,
        services: selectedProgram.services ?? false,
        personalization: selectedProgram.personalization ?? false,
        appIntegration: selectedProgram.appIntegration ?? false,
        configurableProgram: selectedProgram.configurableProgram ?? false,
      });
    }
  }, [selectedProgram]);

  const closeReviewProgram = () => {
    setSelectedProgram(null);
    setReviewProgramLocDropdownOpen(false);
    setReviewProgramStatusDropdownOpen(false);
  };

  const submitEditProgram = () => {
    if (!selectedProgram) return;
    updateProgramDoc(selectedProgram.id, {
      name: reviewProgramForm.name.trim(),
      location: reviewProgramForm.location,
      phase: reviewProgramForm.phase.trim(),
      description: reviewProgramForm.description.trim(),
      status: reviewProgramForm.status,
      content: reviewProgramForm.content,
      performers: reviewProgramForm.performers,
      services: reviewProgramForm.services,
      personalization: reviewProgramForm.personalization,
      appIntegration: reviewProgramForm.appIntegration,
      configurableProgram: reviewProgramForm.configurableProgram,
    });
    setSelectedProgram(null);
  };

  // --- Status badge ---
  const statusCell = (item: { status: string }) => {
    if (item.status === 'Active') return <Badge color="info">Active</Badge>;
    if (item.status === 'Inactive') return <Badge color="default">Inactive</Badge>;
    if (item.status === 'Under Review') return <Badge color="dtp">Under Review</Badge>;
    return <Badge color="default">{item.status}</Badge>;
  };

  // --- Location/Zone options for assignment ---
  const locationZoneOptions = useMemo(() => {
    const locNames = locations.map((l) => l.name);
    const zoneNames = zones.map((z) => z.name);
    return [...locNames, ...zoneNames];
  }, [locations, zones]);

  // --- Locations columns ---
  const locColumns: ColumnDef<Location, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { style: { width: '22%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.name}
          onSave={(v) => updateLocationName(row.original.id, v)}
          placeholder="Location name"
        />
      ),
    },
    {
      accessorKey: 'rsqFootage',
      header: 'RSQ Footage',
      meta: { style: { width: '19.5%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.rsqFootage > 0 ? row.original.rsqFootage.toLocaleString() : ''}
          onSave={(v) => updateLocation(row.original.id, 'rsqFootage', parseFloat(v.replace(/,/g, '')) || 0)}
          placeholder="—"
        />
      ),
    },
    {
      accessorKey: 'startRentPerMonth',
      header: 'Start Rent / Mo',
      meta: { style: { width: '19.5%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.startRentPerMonth > 0 ? row.original.startRentPerMonth.toLocaleString() : ''}
          onSave={(v) => updateLocation(row.original.id, 'startRentPerMonth', parseFloat(v.replace(/[$,]/g, '')) || 0)}
          placeholder="—"
        />
      ),
    },
    {
      accessorKey: 'tiPerSqft',
      header: 'TI / SQft',
      meta: { style: { width: '19.5%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.tiPerSqft > 0 ? row.original.tiPerSqft.toString() : ''}
          onSave={(v) => updateLocation(row.original.id, 'tiPerSqft', parseFloat(v.replace(/[$,]/g, '')) || 0)}
          placeholder="—"
        />
      ),
    },
    {
      accessorKey: 'lossFactor',
      header: 'Loss Factor',
      meta: { style: { width: '19.5%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <InlineEdit
          value={row.original.lossFactor > 0 ? row.original.lossFactor.toString() : ''}
          onSave={(v) => updateLocation(row.original.id, 'lossFactor', parseFloat(v.replace(/[%,]/g, '')) || 0)}
          placeholder="—"
        />
      ),
    },
    {
      id: 'edit',
      header: '',
      meta: { style: { width: '60px', textAlign: 'center', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => openEditLocation(row.original)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', fontWeight: 500, color: 'var(--jf-lavender)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: '4px',
          }}
        >
          <Pencil size={13} />
        </button>
      ),
    },
  ], [updateLocation, updateLocationName]);

  // --- Zones columns ---
  const zoneColumns: ColumnDef<Zone, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { style: { width: '18%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      meta: { style: { width: '16%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.location || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { style: { width: '34%' } },
      cell: ({ row }) => (
        <span style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          display: 'block', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>
          {row.original.description}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '16%', verticalAlign: 'middle' } },
      cell: ({ row }) => statusCell(row.original),
    },
    {
      id: 'review',
      header: 'Review',
      meta: { style: { width: '16%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedZone(row.original)}
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

  // --- Merch columns ---
  const merchColumns: ColumnDef<MerchItem, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { style: { width: '18%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.type || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location / Zone',
      meta: { style: { width: '16%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.location || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { style: { width: '26%' } },
      cell: ({ row }) => (
        <span style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          display: 'block', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>
          {row.original.description}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => statusCell(row.original),
    },
    {
      id: 'review',
      header: 'Review',
      meta: { style: { width: '12%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedMerch(row.original)}
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

  // --- F&B columns ---
  const fnbColumns: ColumnDef<FnBItem, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { style: { width: '18%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.type || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location / Zone',
      meta: { style: { width: '16%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.location || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { style: { width: '26%' } },
      cell: ({ row }) => (
        <span style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          display: 'block', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>
          {row.original.description}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '14%', verticalAlign: 'middle' } },
      cell: ({ row }) => statusCell(row.original),
    },
    {
      id: 'review',
      header: 'Review',
      meta: { style: { width: '12%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedFnb(row.original)}
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

  const programColumns: ColumnDef<ProgramItem, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { style: { width: '18%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      meta: { style: { width: '16%', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {row.original.location || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { style: { width: '34%' } },
      cell: ({ row }) => (
        <span style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          display: 'block', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>
          {row.original.description}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { style: { width: '16%', verticalAlign: 'middle' } },
      cell: ({ row }) => statusCell(row.original),
    },
    {
      id: 'review',
      header: 'Review',
      meta: { style: { width: '16%', textAlign: 'center', paddingRight: '12px', verticalAlign: 'middle' } },
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedProgram(row.original)}
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
      {/* ===== LOCATIONS ===== */}
      <FormSection
        title="Locations"
        description="Primary areas and spaces within the project"
        icon={Building2}
      >
        {locationTreeState !== undefined && (
          <LocationTree
            key={locationTreeState ? 'loaded' : 'empty'}
            persist
            initialState={locationTreeState ?? undefined}
          />
        )}
      </FormSection>

      {/* ===== ZONES ===== */}
      <div style={{ marginTop: '48px' }}>
        <FormSection
          title="Installations"
          description="Distinct experiences and attractions within each location"
          icon={MapPin}
          onAdd={openAddZone}
        >
          <DataTable
            data={zones}
            columns={zoneColumns}
            hideSearch
            tableLayout="fixed"
            onRowContextMenu={(zone, e) => openCtxMenu(zone.name, () => {
              deleteZoneDoc(zone.id);
              setCtxMenu(null);
            }, e)}
          />
        </FormSection>
      </div>

      {/* ===== PROGRAMMING ===== */}
      <div style={{ marginTop: '48px' }}>
        <FormSection
          title="Programming"
          description="Scheduled events, activities, and seasonal offerings"
          icon={CalendarDays}
          onAdd={openAddProgram}
        >
          <DataTable
            data={programItems}
            columns={programColumns}
            hideSearch
            tableLayout="fixed"
            onRowContextMenu={(item, e) => openCtxMenu(item.name, () => {
              deleteProgramDoc(item.id);
              setCtxMenu(null);
            }, e)}
          />
        </FormSection>
      </div>

      {/* ===== MERCHANDISING AND PRODUCT ===== */}
      <div style={{ marginTop: '48px' }}>
        <FormSection
          title="Merchandising and Product"
          description="Retail offerings, branded merchandise, and product strategy"
          icon={ShoppingBag}
          onAdd={openAddMerch}
        >
          <DataTable
            data={merchItems}
            columns={merchColumns}
            hideSearch
            tableLayout="fixed"
            onRowContextMenu={(item, e) => openCtxMenu(item.name, () => {
              deleteMerchDoc(item.id);
              setCtxMenu(null);
            }, e)}
          />
        </FormSection>
      </div>

      {/* ===== FOOD AND BEVERAGE ===== */}
      <div style={{ marginTop: '48px' }}>
        <FormSection
          title="Food and Beverage"
          description="Dining concepts, menus, and beverage offerings"
          icon={UtensilsCrossed}
          onAdd={openAddFnb}
        >
          <DataTable
            data={fnbItems}
            columns={fnbColumns}
            hideSearch
            tableLayout="fixed"
            onRowContextMenu={(item, e) => openCtxMenu(item.name, () => {
              deleteFnBDoc(item.id);
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

      {/* ===== ADD LOCATION MODAL ===== */}
      {addLocOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10002,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setAddLocOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '560px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <Building2 size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Add Location</span>
              </div>
              <button onClick={() => setAddLocOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  style={inputStyle}
                  placeholder="Location name"
                  value={addLocName}
                  onChange={e => setAddLocName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLocation()}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  placeholder="Brief description of this location"
                  value={addLocDescription}
                  onChange={e => setAddLocDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Environment</label>
                  <div style={{ display: 'flex', gap: '16px', paddingTop: '4px' }}>
                    <Checkbox label="Indoor" checked={addLocIndoor} onChange={setAddLocIndoor} />
                    <Checkbox label="Outdoor" checked={addLocOutdoor} onChange={setAddLocOutdoor} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Floor</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. 1, G, B1"
                    value={addLocFloor}
                    onChange={e => setAddLocFloor(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={() => setAddLocOpen(false)} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>
                Cancel
              </button>
              <button
                onClick={addLocation}
                disabled={!addLocName.trim()}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  color: addLocName.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  background: addLocName.trim() ? 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)' : 'transparent',
                  border: `1px solid ${addLocName.trim() ? 'color-mix(in srgb, var(--jf-lavender) 40%, transparent)' : 'var(--border-default)'}`,
                  borderRadius: '8px', cursor: addLocName.trim() ? 'pointer' : 'not-allowed', padding: '8px 16px',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT LOCATION MODAL ===== */}
      {selectedLocation && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeEditLocation} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                <Building2 size={14} style={{ color: 'var(--jf-lavender)', flexShrink: 0 }} />
                <InlineEdit
                  value={editLocForm.name ?? ''}
                  onSave={(v) => setEditLocForm(f => ({ ...f, name: v }))}
                  placeholder="Location name"
                />
              </div>
              <button onClick={closeEditLocation} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                  placeholder="Brief description of this location"
                  value={editLocForm.description ?? ''}
                  onChange={e => setEditLocForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              {/* Environment + Floor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Environment</label>
                  <div style={{ display: 'flex', gap: '16px', paddingTop: '4px' }}>
                    <Checkbox label="Indoor" checked={editLocForm.indoor ?? false} onChange={v => setEditLocForm(f => ({ ...f, indoor: v }))} />
                    <Checkbox label="Outdoor" checked={editLocForm.outdoor ?? false} onChange={v => setEditLocForm(f => ({ ...f, outdoor: v }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Floor</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. 1, G, B1"
                    value={editLocForm.floor ?? ''}
                    onChange={e => setEditLocForm(f => ({ ...f, floor: e.target.value }))}
                  />
                </div>
              </div>

              {/* RSQ Footage + Start Rent */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>RSQ Footage</label>
                  <input
                    style={inputStyle}
                    placeholder="—"
                    value={editLocForm.rsqFootage ? editLocForm.rsqFootage.toLocaleString() : ''}
                    onChange={e => setEditLocForm(f => ({ ...f, rsqFootage: parseFloat(e.target.value.replace(/,/g, '')) || 0 }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Start Rent / Mo</label>
                  <input
                    style={inputStyle}
                    placeholder="—"
                    value={editLocForm.startRentPerMonth ? editLocForm.startRentPerMonth.toLocaleString() : ''}
                    onChange={e => setEditLocForm(f => ({ ...f, startRentPerMonth: parseFloat(e.target.value.replace(/[$,]/g, '')) || 0 }))}
                  />
                </div>
              </div>

              {/* TI / SQft + Loss Factor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>TI / SQft</label>
                  <input
                    style={inputStyle}
                    placeholder="—"
                    value={editLocForm.tiPerSqft ? editLocForm.tiPerSqft.toString() : ''}
                    onChange={e => setEditLocForm(f => ({ ...f, tiPerSqft: parseFloat(e.target.value.replace(/[$,]/g, '')) || 0 }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Loss Factor</label>
                  <input
                    style={inputStyle}
                    placeholder="—"
                    value={editLocForm.lossFactor ? editLocForm.lossFactor.toString() : ''}
                    onChange={e => setEditLocForm(f => ({ ...f, lossFactor: parseFloat(e.target.value.replace(/[%,]/g, '')) || 0 }))}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button
                onClick={closeEditLocation}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={submitEditLocation}
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

      {/* ===== REVIEW ZONE MODAL ===== */}
      {/* z-index 9999 so the Dropdown portals (10001) render above it */}
      {selectedZone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeReviewModal} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                <MapPin size={14} style={{ color: 'var(--jf-lavender)', flexShrink: 0 }} />
                <InlineEdit
                  value={reviewForm.name}
                  onSave={(v) => setReviewForm(f => ({ ...f, name: v }))}
                  placeholder="Zone name"
                />
              </div>
              <button onClick={closeReviewModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Location + Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Location</label>
                  <button
                    ref={reviewLocDropdownAnchorRef}
                    type="button"
                    onClick={() => setReviewLocDropdownOpen(o => !o)}
                    style={{
                      ...inputStyle,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ color: reviewForm.location ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {reviewForm.location || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown
                    anchorRef={reviewLocDropdownAnchorRef}
                    isOpen={reviewLocDropdownOpen}
                    onClose={() => setReviewLocDropdownOpen(false)}
                    width={220}
                    maxHeight={220}
                  >
                    {locations.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        No locations yet
                      </div>
                    ) : locations.map(loc => (
                      <DropdownItem
                        key={loc.id}
                        isSelected={reviewForm.location === loc.name}
                        onClick={() => {
                          setReviewForm(f => ({ ...f, location: loc.name }));
                          setReviewLocDropdownOpen(false);
                        }}
                      >
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{loc.name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Status</label>
                    <button
                      type="button"
                      onClick={() => setManageStatusOpen(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                      title="Manage statuses"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                  <button
                    ref={reviewStatusDropdownAnchorRef}
                    type="button"
                    onClick={() => setReviewStatusDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: reviewForm.status ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {reviewForm.status || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown
                    anchorRef={reviewStatusDropdownAnchorRef}
                    isOpen={reviewStatusDropdownOpen}
                    onClose={() => setReviewStatusDropdownOpen(false)}
                    width={220}
                    maxHeight={220}
                  >
                    {statusOptions.map(s => (
                      <DropdownItem
                        key={s}
                        isSelected={reviewForm.status === s}
                        onClick={() => { setReviewForm(f => ({ ...f, status: s })); setReviewStatusDropdownOpen(false); }}
                      >
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>

              {/* Phase + Square Footage */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Phase</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Phase 1"
                    value={reviewForm.phase}
                    onChange={e => setReviewForm(f => ({ ...f, phase: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Square Footage</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="sqft"
                    value={reviewForm.sqft}
                    onChange={e => setReviewForm(f => ({ ...f, sqft: e.target.value }))}
                  />
                </div>
              </div>

              {/* Build Cost + Est. Total */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Build Cost / sqft ($)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="0.00"
                    value={reviewForm.buildCostPerSqft}
                    onChange={e => setReviewForm(f => ({ ...f, buildCostPerSqft: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Est. Total Build Cost</label>
                  <p style={{ fontSize: '13px', color: 'var(--jf-gold)', margin: 0, fontWeight: 600, padding: '8px 0' }}>
                    {(Number(reviewForm.sqft) || 0) > 0 && (Number(reviewForm.buildCostPerSqft) || 0) > 0
                      ? '$' + ((Number(reviewForm.sqft) || 0) * (Number(reviewForm.buildCostPerSqft) || 0)).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }}
                  placeholder="Brief description of the zone"
                  value={reviewForm.description}
                  onChange={e => setReviewForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button
                onClick={closeReviewModal}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={submitEditZone}
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

      {/* ===== ADD ZONE MODAL ===== */}
      {/* z-index 9999 so the location Dropdown (10001) renders above it */}
      {addZoneOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setAddZoneOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '560px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <Plus size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Add Installation</span>
              </div>
              <button onClick={() => setAddZoneOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  style={inputStyle}
                  placeholder="Zone name"
                  value={zoneForm.name}
                  onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Location + Phase */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Select
                  label="Location"
                  placeholder="Select..."
                  value={zoneForm.location || ''}
                  onChange={(val) => setZoneForm(f => ({
                    ...f,
                    location: val as string,
                    potentialLocations: val !== 'TBD' ? [] : f.potentialLocations,
                  }))}
                  options={[
                    { value: 'TBD', label: 'TBD — Location Unknown' },
                    ...locations.map(l => ({ value: l.name, label: l.name })),
                  ]}
                />
                <div>
                  <label style={labelStyle}>Phase</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Phase 1"
                    value={zoneForm.phase}
                    onChange={e => setZoneForm(f => ({ ...f, phase: e.target.value }))}
                  />
                </div>
              </div>

              {/* Potential locations — visible when TBD is selected */}
              {zoneForm.location === 'TBD' && locations.length > 0 && (
                <div>
                  <label style={labelStyle}>Potential Locations</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                    {locations.map(loc => (
                      <Chip
                        key={loc.id}
                        label={loc.name}
                        color="accent"
                        variant={zoneForm.potentialLocations.includes(loc.name) ? 'soft' : 'outline'}
                        size="sm"
                        selected={zoneForm.potentialLocations.includes(loc.name)}
                        onClick={() => setZoneForm(f => ({
                          ...f,
                          potentialLocations: f.potentialLocations.includes(loc.name)
                            ? f.potentialLocations.filter(n => n !== loc.name)
                            : [...f.potentialLocations, loc.name],
                        }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sqft + Build cost */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Square Footage</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="sqft"
                    value={zoneForm.sqft}
                    onChange={e => setZoneForm(f => ({ ...f, sqft: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Build Cost / sqft ($)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="0.00"
                    value={zoneForm.buildCostPerSqft}
                    onChange={e => setZoneForm(f => ({ ...f, buildCostPerSqft: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                  {statusOptions.map(s => (
                    <Chip
                      key={s}
                      label={s}
                      color={statusChipColor(s)}
                      variant={zoneForm.status === s ? 'soft' : 'outline'}
                      size="sm"
                      selected={zoneForm.status === s}
                      onClick={() => setZoneForm(f => ({ ...f, status: s }))}
                    />
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <label style={labelStyle}>Features</label>
                <div style={{ display: 'flex', gap: '16px', paddingTop: '4px' }}>
                  <Checkbox label="Personalization" checked={zoneForm.personalization} onChange={v => setZoneForm(f => ({ ...f, personalization: v }))} />
                  <Checkbox label="App Integration" checked={zoneForm.appIntegration} onChange={v => setZoneForm(f => ({ ...f, appIntegration: v }))} />
                  <Checkbox label="Configurable Program" checked={zoneForm.configurableProgram} onChange={v => setZoneForm(f => ({ ...f, configurableProgram: v }))} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }}
                  placeholder="Brief description of the zone"
                  value={zoneForm.description}
                  onChange={e => setZoneForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button
                onClick={() => setAddZoneOpen(false)}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={submitAddZone}
                disabled={!zoneForm.name.trim()}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  color: zoneForm.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  background: zoneForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)' : 'transparent',
                  border: `1px solid ${zoneForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 40%, transparent)' : 'var(--border-default)'}`,
                  borderRadius: '8px', cursor: zoneForm.name.trim() ? 'pointer' : 'not-allowed', padding: '8px 16px',
                }}
              >
                Add Installation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD PROGRAM MODAL ===== */}
      {addProgramOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setAddProgramOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '560px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <Plus size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Add Program</span>
              </div>
              <button onClick={() => setAddProgramOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  style={inputStyle}
                  placeholder="Program name"
                  value={programForm.name}
                  onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Location + Phase */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Location</label>
                  <button
                    ref={programLocDropdownAnchorRef}
                    type="button"
                    onClick={() => setProgramLocDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: programForm.location ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {programForm.location || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown
                    anchorRef={programLocDropdownAnchorRef}
                    isOpen={programLocDropdownOpen}
                    onClose={() => setProgramLocDropdownOpen(false)}
                    width={220}
                    maxHeight={220}
                  >
                    {locations.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>No locations yet</div>
                    ) : locations.map(loc => (
                      <DropdownItem
                        key={loc.id}
                        isSelected={programForm.location === loc.name}
                        onClick={() => { setProgramForm(f => ({ ...f, location: loc.name })); setProgramLocDropdownOpen(false); }}
                      >
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{loc.name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Phase</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Phase 1"
                    value={programForm.phase}
                    onChange={e => setProgramForm(f => ({ ...f, phase: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <button
                  ref={programStatusDropdownAnchorRef}
                  type="button"
                  onClick={() => setProgramStatusDropdownOpen(o => !o)}
                  style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ color: programForm.status ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                    {programForm.status || 'Select...'}
                  </span>
                  <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                </button>
                <Dropdown
                  anchorRef={programStatusDropdownAnchorRef}
                  isOpen={programStatusDropdownOpen}
                  onClose={() => setProgramStatusDropdownOpen(false)}
                  width={220}
                  maxHeight={220}
                >
                  {statusOptions.map(s => (
                    <DropdownItem
                      key={s}
                      isSelected={programForm.status === s}
                      onClick={() => { setProgramForm(f => ({ ...f, status: s })); setProgramStatusDropdownOpen(false); }}
                    >
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>

              {/* Features */}
              <div>
                <label style={labelStyle}>Features</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', paddingTop: '4px' }}>
                  <Checkbox label="Content" checked={programForm.content} onChange={v => setProgramForm(f => ({ ...f, content: v }))} />
                  <Checkbox label="Performers" checked={programForm.performers} onChange={v => setProgramForm(f => ({ ...f, performers: v }))} />
                  <Checkbox label="Services" checked={programForm.services} onChange={v => setProgramForm(f => ({ ...f, services: v }))} />
                  <Checkbox label="Personalization" checked={programForm.personalization} onChange={v => setProgramForm(f => ({ ...f, personalization: v }))} />
                  <Checkbox label="App Integration" checked={programForm.appIntegration} onChange={v => setProgramForm(f => ({ ...f, appIntegration: v }))} />
                  <Checkbox label="Configurable Program" checked={programForm.configurableProgram} onChange={v => setProgramForm(f => ({ ...f, configurableProgram: v }))} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }}
                  placeholder="Brief description"
                  value={programForm.description}
                  onChange={e => setProgramForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button
                onClick={() => setAddProgramOpen(false)}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={submitAddProgram}
                disabled={!programForm.name.trim()}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  color: programForm.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  background: programForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)' : 'transparent',
                  border: `1px solid ${programForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 40%, transparent)' : 'var(--border-default)'}`,
                  borderRadius: '8px', cursor: programForm.name.trim() ? 'pointer' : 'not-allowed', padding: '8px 16px',
                }}
              >
                Add Program
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVIEW PROGRAM MODAL ===== */}
      {selectedProgram && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeReviewProgram} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                <CalendarDays size={14} style={{ color: 'var(--jf-lavender)', flexShrink: 0 }} />
                <InlineEdit
                  value={reviewProgramForm.name}
                  onSave={(v) => setReviewProgramForm(f => ({ ...f, name: v }))}
                  placeholder="Program name"
                />
              </div>
              <button onClick={closeReviewProgram} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Location + Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Location</label>
                  <button
                    ref={reviewProgramLocDropdownAnchorRef}
                    type="button"
                    onClick={() => setReviewProgramLocDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: reviewProgramForm.location ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {reviewProgramForm.location || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown
                    anchorRef={reviewProgramLocDropdownAnchorRef}
                    isOpen={reviewProgramLocDropdownOpen}
                    onClose={() => setReviewProgramLocDropdownOpen(false)}
                    width={220}
                    maxHeight={220}
                  >
                    {locations.map(loc => (
                      <DropdownItem
                        key={loc.id}
                        isSelected={reviewProgramForm.location === loc.name}
                        onClick={() => { setReviewProgramForm(f => ({ ...f, location: loc.name })); setReviewProgramLocDropdownOpen(false); }}
                      >
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{loc.name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <button
                    ref={reviewProgramStatusDropdownAnchorRef}
                    type="button"
                    onClick={() => setReviewProgramStatusDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ color: reviewProgramForm.status ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {reviewProgramForm.status || 'Select...'}
                    </span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown
                    anchorRef={reviewProgramStatusDropdownAnchorRef}
                    isOpen={reviewProgramStatusDropdownOpen}
                    onClose={() => setReviewProgramStatusDropdownOpen(false)}
                    width={220}
                    maxHeight={220}
                  >
                    {statusOptions.map(s => (
                      <DropdownItem
                        key={s}
                        isSelected={reviewProgramForm.status === s}
                        onClick={() => { setReviewProgramForm(f => ({ ...f, status: s })); setReviewProgramStatusDropdownOpen(false); }}
                      >
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>

              {/* Phase */}
              <div>
                <label style={labelStyle}>Phase</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Phase 1"
                  value={reviewProgramForm.phase}
                  onChange={e => setReviewProgramForm(f => ({ ...f, phase: e.target.value }))}
                />
              </div>

              {/* Features */}
              <div>
                <label style={labelStyle}>Features</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', paddingTop: '4px' }}>
                  <Checkbox label="Content" checked={reviewProgramForm.content} onChange={v => setReviewProgramForm(f => ({ ...f, content: v }))} />
                  <Checkbox label="Performers" checked={reviewProgramForm.performers} onChange={v => setReviewProgramForm(f => ({ ...f, performers: v }))} />
                  <Checkbox label="Services" checked={reviewProgramForm.services} onChange={v => setReviewProgramForm(f => ({ ...f, services: v }))} />
                  <Checkbox label="Personalization" checked={reviewProgramForm.personalization} onChange={v => setReviewProgramForm(f => ({ ...f, personalization: v }))} />
                  <Checkbox label="App Integration" checked={reviewProgramForm.appIntegration} onChange={v => setReviewProgramForm(f => ({ ...f, appIntegration: v }))} />
                  <Checkbox label="Configurable Program" checked={reviewProgramForm.configurableProgram} onChange={v => setReviewProgramForm(f => ({ ...f, configurableProgram: v }))} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }}
                  placeholder="Brief description"
                  value={reviewProgramForm.description}
                  onChange={e => setReviewProgramForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button
                onClick={closeReviewProgram}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={submitEditProgram}
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

      {/* ===== ADD MERCH MODAL ===== */}
      {addMerchOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setAddMerchOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '560px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <ShoppingBag size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Add Merchandise</span>
              </div>
              <button onClick={() => setAddMerchOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} placeholder="Item name" value={merchForm.name} onChange={e => setMerchForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <input style={inputStyle} placeholder="e.g. Plushie, Apparel" value={merchForm.type} onChange={e => setMerchForm(f => ({ ...f, type: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Location / Zone</label>
                  <button ref={merchLocDropdownAnchorRef} type="button" onClick={() => setMerchLocDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ color: merchForm.location ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{merchForm.location || 'Select...'}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={merchLocDropdownAnchorRef} isOpen={merchLocDropdownOpen} onClose={() => setMerchLocDropdownOpen(false)} width={220} maxHeight={220}>
                    {locationZoneOptions.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>No locations yet</div>
                    ) : locationZoneOptions.map(name => (
                      <DropdownItem key={name} isSelected={merchForm.location === name} onClick={() => { setMerchForm(f => ({ ...f, location: name })); setMerchLocDropdownOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <button ref={merchStatusDropdownAnchorRef} type="button" onClick={() => setMerchStatusDropdownOpen(o => !o)}
                  style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ color: merchForm.status ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{merchForm.status || 'Select...'}</span>
                  <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                </button>
                <Dropdown anchorRef={merchStatusDropdownAnchorRef} isOpen={merchStatusDropdownOpen} onClose={() => setMerchStatusDropdownOpen(false)} width={220} maxHeight={220}>
                  {statusOptions.map(s => (
                    <DropdownItem key={s} isSelected={merchForm.status === s} onClick={() => { setMerchForm(f => ({ ...f, status: s })); setMerchStatusDropdownOpen(false); }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} placeholder="Brief description" value={merchForm.description} onChange={e => setMerchForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={() => setAddMerchOpen(false)} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>Cancel</button>
              <button onClick={submitAddMerch} disabled={!merchForm.name.trim()}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  color: merchForm.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  background: merchForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)' : 'transparent',
                  border: `1px solid ${merchForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 40%, transparent)' : 'var(--border-default)'}`,
                  borderRadius: '8px', cursor: merchForm.name.trim() ? 'pointer' : 'not-allowed', padding: '8px 16px',
                }}>
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVIEW MERCH MODAL ===== */}
      {selectedMerch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeReviewMerch} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                <ShoppingBag size={14} style={{ color: 'var(--jf-lavender)', flexShrink: 0 }} />
                <InlineEdit value={reviewMerchForm.name} onSave={(v) => setReviewMerchForm(f => ({ ...f, name: v }))} placeholder="Item name" />
              </div>
              <button onClick={closeReviewMerch} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <input style={inputStyle} placeholder="e.g. Plushie, Apparel" value={reviewMerchForm.type} onChange={e => setReviewMerchForm(f => ({ ...f, type: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Location / Zone</label>
                  <button ref={reviewMerchLocDropdownAnchorRef} type="button" onClick={() => setReviewMerchLocDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ color: reviewMerchForm.location ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{reviewMerchForm.location || 'Select...'}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={reviewMerchLocDropdownAnchorRef} isOpen={reviewMerchLocDropdownOpen} onClose={() => setReviewMerchLocDropdownOpen(false)} width={220} maxHeight={220}>
                    {locationZoneOptions.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>No locations yet</div>
                    ) : locationZoneOptions.map(name => (
                      <DropdownItem key={name} isSelected={reviewMerchForm.location === name} onClick={() => { setReviewMerchForm(f => ({ ...f, location: name })); setReviewMerchLocDropdownOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <button ref={reviewMerchStatusDropdownAnchorRef} type="button" onClick={() => setReviewMerchStatusDropdownOpen(o => !o)}
                  style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ color: reviewMerchForm.status ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{reviewMerchForm.status || 'Select...'}</span>
                  <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                </button>
                <Dropdown anchorRef={reviewMerchStatusDropdownAnchorRef} isOpen={reviewMerchStatusDropdownOpen} onClose={() => setReviewMerchStatusDropdownOpen(false)} width={220} maxHeight={220}>
                  {statusOptions.map(s => (
                    <DropdownItem key={s} isSelected={reviewMerchForm.status === s} onClick={() => { setReviewMerchForm(f => ({ ...f, status: s })); setReviewMerchStatusDropdownOpen(false); }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} placeholder="Brief description" value={reviewMerchForm.description} onChange={e => setReviewMerchForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={closeReviewMerch} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>Cancel</button>
              <button onClick={submitEditMerch}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--jf-cream)', background: 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD F&B MODAL ===== */}
      {addFnbOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setAddFnbOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '560px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={14} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Add Food & Beverage</span>
              </div>
              <button onClick={() => setAddFnbOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} placeholder="Item name" value={fnbForm.name} onChange={e => setFnbForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <input style={inputStyle} placeholder="e.g. Appetizer, Beverage" value={fnbForm.type} onChange={e => setFnbForm(f => ({ ...f, type: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Location / Zone</label>
                  <button ref={fnbLocDropdownAnchorRef} type="button" onClick={() => setFnbLocDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ color: fnbForm.location ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{fnbForm.location || 'Select...'}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={fnbLocDropdownAnchorRef} isOpen={fnbLocDropdownOpen} onClose={() => setFnbLocDropdownOpen(false)} width={220} maxHeight={220}>
                    {locationZoneOptions.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>No locations yet</div>
                    ) : locationZoneOptions.map(name => (
                      <DropdownItem key={name} isSelected={fnbForm.location === name} onClick={() => { setFnbForm(f => ({ ...f, location: name })); setFnbLocDropdownOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <button ref={fnbStatusDropdownAnchorRef} type="button" onClick={() => setFnbStatusDropdownOpen(o => !o)}
                  style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ color: fnbForm.status ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{fnbForm.status || 'Select...'}</span>
                  <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                </button>
                <Dropdown anchorRef={fnbStatusDropdownAnchorRef} isOpen={fnbStatusDropdownOpen} onClose={() => setFnbStatusDropdownOpen(false)} width={220} maxHeight={220}>
                  {statusOptions.map(s => (
                    <DropdownItem key={s} isSelected={fnbForm.status === s} onClick={() => { setFnbForm(f => ({ ...f, status: s })); setFnbStatusDropdownOpen(false); }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} placeholder="Brief description" value={fnbForm.description} onChange={e => setFnbForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={() => setAddFnbOpen(false)} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>Cancel</button>
              <button onClick={submitAddFnb} disabled={!fnbForm.name.trim()}
                style={{
                  fontSize: '13px', fontWeight: 500,
                  color: fnbForm.name.trim() ? 'var(--jf-cream)' : 'var(--text-secondary)',
                  background: fnbForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)' : 'transparent',
                  border: `1px solid ${fnbForm.name.trim() ? 'color-mix(in srgb, var(--jf-lavender) 40%, transparent)' : 'var(--border-default)'}`,
                  borderRadius: '8px', cursor: fnbForm.name.trim() ? 'pointer' : 'not-allowed', padding: '8px 16px',
                }}>
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVIEW F&B MODAL ===== */}
      {selectedFnb && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeReviewFnb} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
                <UtensilsCrossed size={14} style={{ color: 'var(--jf-lavender)', flexShrink: 0 }} />
                <InlineEdit value={reviewFnbForm.name} onSave={(v) => setReviewFnbForm(f => ({ ...f, name: v }))} placeholder="Item name" />
              </div>
              <button onClick={closeReviewFnb} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <input style={inputStyle} placeholder="e.g. Appetizer, Beverage" value={reviewFnbForm.type} onChange={e => setReviewFnbForm(f => ({ ...f, type: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Location / Zone</label>
                  <button ref={reviewFnbLocDropdownAnchorRef} type="button" onClick={() => setReviewFnbLocDropdownOpen(o => !o)}
                    style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ color: reviewFnbForm.location ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{reviewFnbForm.location || 'Select...'}</span>
                    <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  </button>
                  <Dropdown anchorRef={reviewFnbLocDropdownAnchorRef} isOpen={reviewFnbLocDropdownOpen} onClose={() => setReviewFnbLocDropdownOpen(false)} width={220} maxHeight={220}>
                    {locationZoneOptions.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>No locations yet</div>
                    ) : locationZoneOptions.map(name => (
                      <DropdownItem key={name} isSelected={reviewFnbForm.location === name} onClick={() => { setReviewFnbForm(f => ({ ...f, location: name })); setReviewFnbLocDropdownOpen(false); }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{name}</span>
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <button ref={reviewFnbStatusDropdownAnchorRef} type="button" onClick={() => setReviewFnbStatusDropdownOpen(o => !o)}
                  style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ color: reviewFnbForm.status ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{reviewFnbForm.status || 'Select...'}</span>
                  <ChevronDown size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                </button>
                <Dropdown anchorRef={reviewFnbStatusDropdownAnchorRef} isOpen={reviewFnbStatusDropdownOpen} onClose={() => setReviewFnbStatusDropdownOpen(false)} width={220} maxHeight={220}>
                  {statusOptions.map(s => (
                    <DropdownItem key={s} isSelected={reviewFnbForm.status === s} onClick={() => { setReviewFnbForm(f => ({ ...f, status: s })); setReviewFnbStatusDropdownOpen(false); }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s}</span>
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} placeholder="Brief description" value={reviewFnbForm.description} onChange={e => setReviewFnbForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid #333' }}>
              <button onClick={closeReviewFnb} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>Cancel</button>
              <button onClick={submitEditFnb}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--jf-cream)', background: 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MANAGE STATUSES MODAL ===== */}
      {manageStatusOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10003,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setManageStatusOpen(false)} />
          <div style={{
            position: 'relative', width: '90%', maxWidth: '360px',
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }}>
              <div className="flex items-center gap-2">
                <Pencil size={13} style={{ color: 'var(--jf-lavender)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jf-cream)' }}>Manage Statuses</span>
              </div>
              <button onClick={() => setManageStatusOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {statusDocs.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '6px',
                  background: 'var(--bg-surface-inset)', border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s.name}</span>
                  <button
                    onClick={() => deleteZoneStatus(s.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              {statusOptions.length === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0', margin: 0 }}>
                  No statuses defined
                </p>
              )}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #333', display: 'flex', gap: '8px' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="New status name"
                value={newStatusInput}
                onChange={e => setNewStatusInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newStatusInput.trim() && !statusOptions.includes(newStatusInput.trim())) {
                    saveZoneStatus({ id: crypto.randomUUID(), name: newStatusInput.trim() });
                    setNewStatusInput('');
                  }
                }}
              />
              <button
                onClick={() => {
                  const val = newStatusInput.trim();
                  if (val && !statusOptions.includes(val)) {
                    saveZoneStatus({ id: crypto.randomUUID(), name: val });
                    setNewStatusInput('');
                  }
                }}
                disabled={!newStatusInput.trim() || statusOptions.includes(newStatusInput.trim())}
                style={{
                  fontSize: '13px', fontWeight: 500, padding: '8px 14px',
                  borderRadius: '8px', cursor: 'pointer',
                  color: 'var(--jf-cream)',
                  background: 'color-mix(in srgb, var(--jf-lavender) 20%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--jf-lavender) 40%, transparent)',
                  opacity: (!newStatusInput.trim() || statusOptions.includes(newStatusInput.trim())) ? 0.4 : 1,
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
