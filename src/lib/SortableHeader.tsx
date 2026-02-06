'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { SortDirection } from './useSort';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
  align = 'left',
  className = '',
}: SortableHeaderProps) {
  const isActive = currentKey === sortKey;

  const alignClass =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th
      className={`cursor-pointer select-none hover:text-white transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${alignClass}`}>
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-teal-400" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-teal-400" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
        )}
      </div>
    </th>
  );
}
