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
    getRowAccentColor?: (row: T) => string | undefined;
    tableLayout?: 'auto' | 'fixed';
    onRowContextMenu?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
}

export function DataTable<T>({ data, columns, actions, hideSearch = true, searchPlaceholder = 'Search...', externalFilter, getRowStyle, getRowAccentColor, tableLayout = 'auto', onRowContextMenu }: DataTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

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
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout }}>
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
                                            ...(header.column.columnDef.meta as any)?.style,
                                        }}
                                    >
                                        <div className="flex items-center gap-1" style={{
                                            justifyContent: (header.column.columnDef.meta as any)?.style?.textAlign === 'center' ? 'center'
                                                : (header.column.columnDef.meta as any)?.style?.textAlign === 'right' ? 'flex-end'
                                                : undefined,
                                        }}>
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
                            table.getRowModel().rows.map((row) => {
                                const accentColor = getRowAccentColor?.(row.original);
                                const isHovered = hoveredRowId === row.id;
                                const { background: customBg, ...restCustomStyle } = getRowStyle?.(row.original) || {};
                                return (
                                <tr
                                    key={row.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-default)',
                                        transition: 'background 0.15s, box-shadow 200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
                                        background: isHovered ? 'rgba(216, 131, 10, 0.04)' : (customBg as string || ''),
                                        boxShadow: accentColor
                                            ? `inset ${isHovered ? '8px' : '3px'} 0 0 ${accentColor}`
                                            : undefined,
                                        ...restCustomStyle,
                                    }}
                                    onMouseEnter={() => setHoveredRowId(row.id)}
                                    onMouseLeave={() => setHoveredRowId(null)}
                                    onContextMenu={onRowContextMenu ? (e) => { e.preventDefault(); onRowContextMenu(row.original, e); } : undefined}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            style={{
                                                padding: '14px 16px',
                                                fontSize: '13px',
                                                color: 'var(--text-primary)',
                                                verticalAlign: 'top',
                                                ...(cell.column.columnDef.meta as any)?.style,
                                            }}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                                );
                            })
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
