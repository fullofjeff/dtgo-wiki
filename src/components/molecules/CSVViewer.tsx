import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { DataTable } from '@/components/ui/DataTable';
import { Loader2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface CSVViewerProps {
  csvUrl: string;
}

export function CSVViewer({ csvUrl }: CSVViewerProps) {
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
        const text = await res.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        setHeaders(parsed.meta.fields || []);
        setData(parsed.data as Record<string, string>[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CSV');
      } finally {
        setLoading(false);
      }
    })();
  }, [csvUrl]);

  const columns: ColumnDef<Record<string, string>, any>[] = useMemo(
    () =>
      headers.map((h) => ({
        accessorKey: h,
        header: h,
        cell: (info: any) => info.getValue() ?? '',
      })),
    [headers],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: '48px' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
      <DataTable data={data} columns={columns} hideSearch={false} searchPlaceholder="Search CSV data..." />
    </div>
  );
}
