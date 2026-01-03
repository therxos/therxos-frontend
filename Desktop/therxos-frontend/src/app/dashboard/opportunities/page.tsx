'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi } from '@/lib/api';
import { useUIStore } from '@/store';
import Link from 'next/link';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  DollarSign,
  AlertTriangle,
  Pill,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';

const TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  ndc_optimization: { label: 'NDC Optimization', color: 'bg-blue-100 text-blue-800', icon: Pill },
  brand_to_generic: { label: 'Brand → Generic', color: 'bg-green-100 text-green-800', icon: RefreshCw },
  therapeutic_interchange: { label: 'Therapeutic Interchange', color: 'bg-purple-100 text-purple-800', icon: ArrowUpDown },
  missing_therapy: { label: 'Missing Therapy', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  audit_flag: { label: 'Audit Flag', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const { filters, setFilter, selectedOpportunities, toggleOpportunitySelection, clearSelection } = useUIStore();
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () => opportunitiesApi.getAll(filters).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      opportunitiesApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      opportunitiesApi.bulkUpdate(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      clearSelection();
    },
  });

  const opportunities = data?.opportunities || [];
  const counts = data?.counts || {};

  const handleStatusUpdate = (id: string, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const handleBulkAction = (status: string) => {
    if (selectedOpportunities.length === 0) return;
    bulkUpdateMutation.mutate({ ids: selectedOpportunities, status });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="mt-1 text-gray-500">Review and action pharmacy optimization opportunities</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => refetch()} className="btn-secondary flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['new', 'reviewed', 'actioned', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter('status', status)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filters.status === status
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {counts[status] && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                {counts[status].count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilter('type', e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">All Types</option>
            <option value="ndc_optimization">NDC Optimization</option>
            <option value="brand_to_generic">Brand → Generic</option>
            <option value="therapeutic_interchange">Therapeutic Interchange</option>
            <option value="missing_therapy">Missing Therapy</option>
            <option value="audit_flag">Audit Flag</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilter('priority', e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOpportunities.length > 0 && (
        <div className="card p-4 bg-primary-50 border-primary-200 flex items-center justify-between">
          <span className="text-sm text-primary-700">
            {selectedOpportunities.length} opportunities selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkAction('reviewed')}
              className="btn-secondary text-sm py-1"
              disabled={bulkUpdateMutation.isPending}
            >
              Mark Reviewed
            </button>
            <button
              onClick={() => handleBulkAction('actioned')}
              className="btn-success text-sm py-1"
              disabled={bulkUpdateMutation.isPending}
            >
              Mark Actioned
            </button>
            <button
              onClick={() => handleBulkAction('dismissed')}
              className="btn-secondary text-sm py-1 text-gray-600"
              disabled={bulkUpdateMutation.isPending}
            >
              Dismiss
            </button>
            <button onClick={clearSelection} className="text-sm text-gray-500 hover:text-gray-700 ml-2">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="card p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities found</h3>
            <p className="text-gray-500">
              {filters.status === 'new'
                ? 'Great job! No new opportunities to review.'
                : `No ${filters.status} opportunities match your filters.`}
            </p>
          </div>
        ) : (
          opportunities.map((opp: any) => {
            const typeInfo = TYPE_LABELS[opp.opportunity_type] || {
              label: opp.opportunity_type,
              color: 'bg-gray-100 text-gray-800',
              icon: Pill,
            };
            const priorityInfo = PRIORITY_LABELS[opp.clinical_priority] || PRIORITY_LABELS.medium;
            const Icon = typeInfo.icon;
            const isSelected = selectedOpportunities.includes(opp.opportunity_id);

            return (
              <div
                key={opp.opportunity_id}
                className={`card p-4 hover:shadow-md transition-shadow ${
                  isSelected ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOpportunitySelection(opp.opportunity_id)}
                    className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />

                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${typeInfo.color.replace('text-', 'bg-').split(' ')[0]}`}>
                    <Icon className={`w-5 h-5 ${typeInfo.color.split(' ')[1]}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`badge ${typeInfo.color}`}>{typeInfo.label}</span>
                          <span className={`badge ${priorityInfo.color}`}>{priorityInfo.label}</span>
                        </div>
                        <h3 className="mt-2 font-medium text-gray-900">
                          {opp.current_drug_name || opp.recommended_drug_name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {opp.clinical_rationale}
                        </p>
                        {opp.current_ndc && opp.recommended_ndc && (
                          <p className="mt-2 text-xs text-gray-400 font-mono">
                            NDC: {opp.current_ndc} → {opp.recommended_ndc}
                          </p>
                        )}
                      </div>

                      {/* Margin */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-success-600">
                          +{formatCurrency(opp.potential_margin_gain || 0)}
                        </p>
                        <p className="text-xs text-gray-500">per fill</p>
                        {opp.annual_margin_gain && (
                          <p className="text-sm text-gray-600 mt-1">
                            ~{formatCurrency(opp.annual_margin_gain)}/yr
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {opp.patient_hash && (
                          <Link
                            href={`/dashboard/patients/${opp.patient_id}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            Patient: {opp.patient_hash.slice(0, 8)}...
                          </Link>
                        )}
                        <span>•</span>
                        <span>{new Date(opp.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/opportunities/${opp.opportunity_id}`}
                          className="btn-secondary text-sm py-1 px-3 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                        {opp.status === 'new' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(opp.opportunity_id, 'actioned')}
                              className="btn-success text-sm py-1 px-3 flex items-center"
                              disabled={updateMutation.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Action
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(opp.opportunity_id, 'dismissed')}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              disabled={updateMutation.isPending}
                              title="Dismiss"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination placeholder */}
      {opportunities.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {opportunities.length} opportunities</span>
          {/* Add pagination controls here */}
        </div>
      )}
    </div>
  );
}
