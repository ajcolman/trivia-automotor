// Author: Angel Colman
'use client'

import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const sorted = React.useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [options]
  )

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? sorted
        : sorted.filter(o => o.label.toLowerCase().includes(search.toLowerCase())),
    [sorted, search]
  )

  const selected = options.find(o => o.value === value)

  return (
    <Popover.Root open={open} onOpenChange={v => { setOpen(v); if (!v) setSearch('') }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm',
            'hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
        >
          <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-xl border border-slate-200 bg-white shadow-lg p-0 overflow-hidden"
          sideOffset={4}
          align="start"
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400 text-center">{emptyText}</div>
            ) : (
              filtered.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); setSearch('') }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-sm text-left',
                    'hover:bg-slate-50 transition-colors',
                    value === option.value && 'bg-blue-50 text-blue-700 font-medium'
                  )}
                >
                  {option.label}
                  {value === option.value && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
