'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ndcReferenceApi } from '@/lib/api';
import {
  Search,
  Filter,
  Package,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';

interface NDCItem {
  rank: number;
  supplyType: string;
  bin: string;
  group: string;
  ndc: string;
  drugName: string;
  gp100: number;
}

export default function NDCReferencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplyType, setSelectedSupplyType] = useState<string>('');
  const [selectedBin, setSelectedBin] = useState<string>('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['Pen Needles', 'Test Strips', 'Lancets']));
  const [copiedNDC, setCopiedNDC] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ndc-reference', searchQuery, selectedSupplyType, selectedBin],
    queryFn: () => ndcReferenceApi.getDiabeticSupplies({
      search: searchQuery || undefined,
      supplyType: selectedSupplyType || undefined,
      bin: selectedBin || undefined,
    }).then(r => r.data),
  });

  const toggleSupplyType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const copyNDC = (ndc: string) => {
    if (!ndc) return;
    navigator.clipboard.writeText(ndc);
    setCopiedNDC(ndc);
    setTimeout(() => setCopiedNDC(null), 2000);
  };

  // Group data by supply type
  const groupedData = data?.data?.reduce((acc: Record<string, NDCItem[]>, item: NDCItem) => {
    if (!acc[item.supplyType]) {
      acc[item.supplyType] = [];
    }
    acc[item.supplyType].push(item);
    return acc;
  }, {} as Record<string, NDCItem[]>) || {};

  const supplyTypeOrder = ['Test Strips', 'Pen Needles', 'Lancets', 'Insulin Syringes', 'Glucometers', 'Swabs'];
  const sortedSupplyTypes = Object.keys(groupedData).sort((a, b) => {
    const aIndex = supplyTypeOrder.indexOf(a);
    const bIndex = supplyTypeOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">NDC Reference</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--slate-400)' }}>
            Best NDC recommendations for diabetic supplies by insurance BIN/GROUP
          </p>
        </div>
        {data?.lastUpdated && (
          <div className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--navy-700)', color: 'var(--slate-400)' }}>
            Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: 'var(--navy-700)', border: '1px solid var(--navy-600)' }}
            >
              <Search className="w-4 h-4" style={{ color: 'var(--slate-500)' }} />
              <input
                type="text"
                placeholder="Search by drug name, NDC, BIN, or GROUP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm w-full outline-none placeholder:text-[var(--slate-500)]"
              />
            </div>
          </div>

          {/* Supply Type Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedSupplyType}
              onChange={(e) => setSelectedSupplyType(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--navy-700)', border: '1px solid var(--navy-600)', color: 'var(--slate-200)' }}
            >
              <option value="">All Supply Types</option>
              {data?.supplyTypes?.map((type: string) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* BIN Filter */}
          <div className="w-full md:w-40">
            <select
              value={selectedBin}
              onChange={(e) => setSelectedBin(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--navy-700)', border: '1px solid var(--navy-600)', color: 'var(--slate-200)' }}
            >
              <option value="">All BINs</option>
              {data?.bins?.map((bin: string) => (
                <option key={bin} value={bin}>{bin}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]" />
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p style={{ color: 'var(--red-400)' }}>Failed to load NDC reference data</p>
        </div>
      ) : data?.total === 0 ? (
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--slate-500)' }} />
          <p style={{ color: 'var(--slate-400)' }}>No results found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSupplyTypes.map((supplyType) => {
            const items = groupedData[supplyType];
            const isExpanded = expandedTypes.has(supplyType);

            return (
              <div key={supplyType} className="card overflow-hidden">
                {/* Supply Type Header */}
                <button
                  onClick={() => toggleSupplyType(supplyType)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[var(--navy-700)] transition-colors"
                  style={{ borderBottom: isExpanded ? '1px solid var(--navy-600)' : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5" style={{ color: 'var(--teal-500)' }} />
                    <span className="font-semibold">{supplyType}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--navy-600)', color: 'var(--slate-400)' }}
                    >
                      {items.length} entries
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" style={{ color: 'var(--slate-400)' }} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{ color: 'var(--slate-400)' }} />
                  )}
                </button>

                {/* Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'var(--navy-700)' }}>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--slate-400)' }}>
                            BIN
                          </th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--slate-400)' }}>
                            GROUP
                          </th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--slate-400)' }}>
                            NDC
                          </th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--slate-400)' }}>
                            Drug Name
                          </th>
                          <th className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--slate-400)' }}>
                            GP/100
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: NDCItem, idx: number) => (
                          <tr
                            key={`${item.bin}-${item.group}-${idx}`}
                            className="hover:bg-[var(--navy-700)] transition-colors"
                            style={{ borderBottom: '1px solid var(--navy-600)' }}
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.bin}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.group}</span>
                            </td>
                            <td className="px-4 py-3">
                              {item.ndc ? (
                                <button
                                  onClick={() => copyNDC(item.ndc)}
                                  className="flex items-center gap-2 font-mono text-sm hover:text-[var(--teal-400)] transition-colors"
                                  title="Click to copy"
                                >
                                  {item.ndc}
                                  {copiedNDC === item.ndc ? (
                                    <Check className="w-3 h-3" style={{ color: 'var(--green-500)' }} />
                                  ) : (
                                    <Copy className="w-3 h-3" style={{ color: 'var(--slate-500)' }} />
                                  )}
                                </button>
                              ) : (
                                <span className="text-sm" style={{ color: 'var(--slate-500)' }}>-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{item.drugName}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-semibold ${item.gp100 >= 50 ? 'text-[var(--green-500)]' : item.gp100 >= 20 ? 'text-[var(--teal-400)]' : item.gp100 > 0 ? 'text-[var(--slate-300)]' : 'text-[var(--red-400)]'}`}
                              >
                                ${item.gp100.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="card p-4" style={{ background: 'var(--navy-700)', borderColor: 'var(--teal-500)' }}>
        <div className="flex items-start gap-3">
          <DollarSign className="w-5 h-5 mt-0.5" style={{ color: 'var(--teal-500)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--teal-400)' }}>How to use this reference</p>
            <p className="text-sm mt-1" style={{ color: 'var(--slate-300)' }}>
              Look up the patient&apos;s insurance BIN and GROUP, then find the recommended NDC for their diabetic supply type.
              The GP/100 column shows the estimated gross profit per 100 units. Higher values (shown in green) indicate better reimbursement.
              Click any NDC to copy it to your clipboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
