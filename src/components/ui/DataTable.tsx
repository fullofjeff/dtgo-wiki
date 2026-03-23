import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T, any>[];
    actions?: React.ReactNode;
    hideSearch?: boolean;
    searchPlaceholder?: string;
    externalFilter?: string;
    getRowStyle?: (row: T) => React.CSSProperties | undefined;
}

export function DataTable<T>({ data, columns, actions, hideSearch = true, searchPlaceholder = 'Search...', externalFilter, getRowStyle }: DataTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            globalFilter: externalFilter !== undefined ? externalFilter : globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: externalFilter !== undefined ? undefined : setGlobalFilter,
        globalFilterFn: 'includesString',
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const showSearch = !hideSearch && externalFilter === undefined;

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {(showSearch || actions) && (
                <div className="flex items-center justify-between gap-4" style={{ marginBottom: '12px' }}>
                    {showSearch && (
                        <input
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder={searchPlaceholder}
                            style={{
                                maxWidth: '280px',
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '13px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-input)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                            }}
                        />
                    )}
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} style={{ background: 'var(--bg-surface-inset)' }}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '1.5px',
                                            color: 'var(--jf-lavender)',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            borderBottom: '1px solid var(--border-default)',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {{
                                                asc: <span style={{ opacity: 0.7 }}>↑</span>,
                                                desc: <span style={{ opacity: 0.7 }}>↓</span>,
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-default)',
                                        transition: 'background 0.15s',
                                        ...getRowStyle?.(row.original),
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(216, 131, 10, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = getRowStyle?.(row.original)?.background as string || '';
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            style={{
                                                padding: '14px 16px',
                                                fontSize: '13px',
                                                color: 'var(--text-primary)',
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    style={{
                                        padding: '48px 16px',
                                        textAlign: 'center',
                                        fontSize: '13px',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    No results found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
