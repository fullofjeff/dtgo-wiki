import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Home, ChevronRight, UserPlus } from 'lucide-react';
import { getFile } from '@/data/loader';
import { getPersonRecord } from '@/data/personIndex';
import { FormSection } from '../ui/FormSection';
import { DataTable } from '../ui/DataTable';
import { PersonModal } from '../molecules/PersonModal';
import { NewPersonModal } from '../molecules/NewPersonModal';
import type { PersonRecord } from '@/data/types';

interface PersonRow {
  name: string;
  role: string;
  org: string;
}

interface PartnershipRow {
  partner: string;
  relationship: string;
  entity: string;
}

/** Parse a markdown table into rows of string arrays, skipping header + separator */
function parseMarkdownTable(content: string): string[][] {
  const lines = content.split('\n');
  const tableLines = lines.filter(l => l.trim().startsWith('|') && !l.trim().match(/^\|[\s-:|]+\|$/));
  // Skip the header row (first table line)
  return tableLines.slice(1).map(line =>
    line.split('|').slice(1, -1).map(cell => cell.trim().replace(/\*\*/g, ''))
  );
}

function parsePeople(content: string): PersonRow[] {
  return parseMarkdownTable(content)
    .filter(cells => cells.length >= 3)
    .map(cells => ({
      name: cells[0],
      role: cells[1],
      org: cells[2],
    }));
}

function parsePartnerships(content: string): PartnershipRow[] {
  return parseMarkdownTable(content)
    .filter(cells => cells.length >= 3)
    .map(cells => ({
      partner: cells[0],
      relationship: cells[1],
      entity: cells[2],
    }));
}

export function DirectoryPage() {
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [showNewPerson, setShowNewPerson] = useState(false);

  const peopleFile = getFile('people/index');
  const partnershipsFile = getFile('partnerships');

  const people = useMemo(() => peopleFile ? parsePeople(peopleFile.content) : [], [peopleFile]);
  const partnerships = useMemo(() => partnershipsFile ? parsePartnerships(partnershipsFile.content) : [], [partnershipsFile]);

  const handlePersonClick = (name: string) => {
    const record = getPersonRecord(name);
    if (record) {
      setSelectedPerson(record);
      setPersonModalOpen(true);
    }
  };

  const peopleColumns: ColumnDef<PersonRow, any>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => {
        const name = getValue() as string;
        return (
          <button
            onClick={() => handlePersonClick(name)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--jf-cream)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--jf-gold)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--jf-cream)'; }}
          >
            {name}
          </button>
        );
      },
      meta: { style: { width: '30%' } },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      meta: { style: { width: '35%' } },
    },
    {
      accessorKey: 'org',
      header: 'Organization',
      meta: { style: { width: '35%' } },
    },
  ], []);

  const partnershipColumns: ColumnDef<PartnershipRow, any>[] = useMemo(() => [
    {
      accessorKey: 'partner',
      header: 'Partner',
      meta: { style: { width: '25%', fontWeight: 600 } },
    },
    {
      accessorKey: 'relationship',
      header: 'Relationship',
      meta: { style: { width: '50%' } },
    },
    {
      accessorKey: 'entity',
      header: 'Entity',
      meta: { style: { width: '25%' } },
    },
  ], []);

  return (
    <div className="flex-1 min-w-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-4">
        <Link to="/" className="text-[var(--jf-lavender)] hover:underline flex items-center gap-1">
          <Home size={12} /> Home
        </Link>
        <ChevronRight size={12} className="opacity-30" />
        <span className="text-[var(--text-primary)]">Directory</span>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '2rem',
        fontWeight: 600,
        color: 'var(--jf-cream)',
        marginBottom: '8px',
      }}>
        Directory
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
        Key people and strategic partnerships across the DTGO group.
      </p>

      {/* Key People */}
      <FormSection
        title="Key People"
        description={`${people.length} people`}
        defaultOpen
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={() => setShowNewPerson(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: 'var(--radius-input)',
              background: 'rgba(201,207,233,0.08)', border: '1px solid rgba(201,207,233,0.15)',
              color: 'var(--jf-lavender)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <UserPlus size={14} /> Add Person
          </button>
        </div>
        <DataTable data={people} columns={peopleColumns} hideSearch={false} searchPlaceholder="Search people..." />
      </FormSection>

      {/* Partnerships */}
      <FormSection
        title="Strategic Partnerships"
        description={`${partnerships.length} partnerships`}
        defaultOpen
      >
        <DataTable data={partnerships} columns={partnershipColumns} hideSearch={false} searchPlaceholder="Search partnerships..." />
      </FormSection>

      <PersonModal
        open={personModalOpen}
        onClose={() => { setPersonModalOpen(false); setSelectedPerson(null); }}
        person={selectedPerson}
      />
      <NewPersonModal open={showNewPerson} onClose={() => setShowNewPerson(false)} />
    </div>
  );
}
