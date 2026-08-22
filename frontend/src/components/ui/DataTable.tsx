import React, { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Icon } from '@iconify/react'
import { Button, Select } from '@/components/ui/Primitives'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  totalCount?: number
  pageSize?: number
  onRowClick?: (row: TData) => void
  selectedRowsBanner?: React.ReactNode
  emptyMessage?: string
  onRowSelectionChangeCallback?: (selectedRows: TData[]) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  totalCount,
  pageSize = 10,
  selectedRowsBanner,
  emptyMessage = 'No matching records found.',
  onRowSelectionChangeCallback,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (onRowSelectionChangeCallback) {
          const selectedIndices = Object.keys(next).filter((k) => next[k])
          const selectedRows = selectedIndices.map((idx) => data[Number(idx)]).filter(Boolean)
          onRowSelectionChangeCallback(selectedRows)
        }
        return next
      })
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length

  return (
    <div className="space-y-3">
      {/* Selected Rows Banner (if any) */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-flow-50 px-4 py-2.5 text-xs text-flow-800 border border-flow-200">
          <div className="flex items-center gap-2">
            <span className="font-bold">{selectedCount}</span>
            <span>of {data.length} row(s) selected</span>
          </div>
          {selectedRowsBanner && <div>{selectedRowsBanner}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-ink-600"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sortDirection = header.column.getIsSorted()

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={`px-4 py-3.5 whitespace-nowrap ${
                          canSort ? 'cursor-pointer select-none hover:bg-slate-100/70 transition-colors' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-slate-400">
                              {sortDirection === 'asc' ? (
                                <Icon icon="mdi:arrow-up" className="h-3.5 w-3.5 text-flow-600" />
                              ) : sortDirection === 'desc' ? (
                                <Icon icon="mdi:arrow-down" className="h-3.5 w-3.5 text-flow-600" />
                              ) : (
                                <Icon icon="mdi:swap-vertical" className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-150 text-sm">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      row.getIsSelected() ? 'bg-flow-50/40' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-32 text-center text-xs text-away">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Status Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-away">
            <span>
              Showing{' '}
              <strong className="text-ink">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-ink">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  totalCount ?? data.length,
                )}
              </strong>{' '}
              of <strong className="text-ink">{totalCount ?? data.length}</strong> entries
            </span>

            {/* Rows Per Page Selector */}
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span>Rows:</span>
              <Select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-7 py-0.5 px-2 text-xs w-16"
              >
                {[10, 20, 30, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex items-center gap-1 text-xs"
            >
              <Icon icon="mdi:chevron-left" className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-xs font-semibold px-2 text-ink">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex items-center gap-1 text-xs"
            >
              Next
              <Icon icon="mdi:chevron-right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
