'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import {
  Flag,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  User,
  Pill,
  DollarSign,
  Clock,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Opportunity {
  opportunity_id: string;
  patient_id: string;
  opportunity_type: string;
  current_drug_name: string;
  recommended_drug_name: string;
  potential_margin_gain: number;
  annual_margin_gain: number;
  clinical_rationale: string;
  status: string;
  staff_notes?: string;
  created_at: string;
  flagged_at?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  insurance_bin?: string;
  insurance_group?: string;
  plan_name?: string;
  prescriber_name?: string;
}

function formatCurrency(value: number) {
  if (isNaN(value) || value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getAnnualValue(opp: Opportunity): number {
  const annual = Number(opp.annual_margin_gain);
  const potential = Number(opp.potential_margin_gain);
  if (!isNaN(annual) && annual > 0) return annual;
  if (!isNaN(potential) && potential > 0) return potential * 12;
  return 0;
}

export default function FlaggedQueuePage() {
  const { user } = useAuthStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<string | null>(null);

  const isDemo = user?.pharmacyName?.toLowerCase().includes('hero');

  useEffect(() => {
    fetchFlaggedOpportunities();
  }, []);

  async function fetchFlaggedOpportunities() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunities?status=Flagged`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (e) {
      console.error('Failed to fetch flagged opportunities:', e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setProcessing(id);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Failed to update status: ${error.error || 'Unknown error'}`);
        return;
      }

      // Remove from list since it's no longer flagged
      setOpportunities(prev => prev.filter(o => o.opportunity_id !== id));
    } catch (e) {
      console.error('Failed to update status:', e);
      alert('Failed to update status. Please try again.');
    } finally {
      setProcessing(null);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatPatientName(opp: Opportunity) {
    if (opp.patient_first_name && opp.patient_last_name) {
      if (isDemo) {
        return `${opp.patient_first_name} ${opp.patient_last_name}`;
      }
      return `${opp.patient_last_name.slice(0, 3).toUpperCase()},${opp.patient_first_name.slice(0, 3).toUpperCase()}`;
    }
    return 'Unknown Patient';
  }

  const totalValue = opportunities.reduce((sum, o) => sum + getAnnualValue(o), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/opportunities"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Opportunities
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Flag className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Flagged for Review</h1>
              <p className="text-sm text-slate-400">
                {opportunities.length} opportunities need pharmacist review
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-400">Total Value</p>
            <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {opportunities.length === 0 && (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-12 text-center">
          <Flag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Flagged Opportunities</h2>
          <p className="text-slate-400 mb-4">
            When staff members flag opportunities for review, they'll appear here.
          </p>
          <Link
            href="/dashboard/opportunities"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            View All Opportunities
          </Link>
        </div>
      )}

      {/* Opportunity List */}
      <div className="space-y-3">
        {opportunities.map(opp => (
          <div
            key={opp.opportunity_id}
            className="bg-[#0d2137] border border-purple-500/30 rounded-xl overflow-hidden"
          >
            {/* Main Row */}
            <div
              className="p-4 cursor-pointer hover:bg-[#1e3a5f]/30 transition-colors"
              onClick={() => toggleExpand(opp.opportunity_id)}
            >
              <div className="flex items-center gap-4">
                {/* Patient */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{formatPatientName(opp)}</p>
                    <p className="text-xs text-slate-400">{opp.opportunity_type.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                {/* Drug Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-white truncate">
                      {opp.current_drug_name || 'N/A'} → {opp.recommended_drug_name}
                    </span>
                  </div>
                  {opp.staff_notes && (
                    <div className="flex items-center gap-2 mt-1">
                      <MessageSquare className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="text-xs text-amber-400 truncate">{opp.staff_notes}</span>
                    </div>
                  )}
                </div>

                {/* Value */}
                <div className="text-right min-w-[100px]">
                  <p className="text-lg font-semibold text-purple-400">{formatCurrency(getAnnualValue(opp))}</p>
                  <p className="text-xs text-slate-400">annual</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); updateStatus(opp.opportunity_id, 'Not Submitted'); }}
                    disabled={processing === opp.opportunity_id}
                    className="p-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Return to queue"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateStatus(opp.opportunity_id, 'Denied'); }}
                    disabled={processing === opp.opportunity_id}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Deny opportunity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {expanded.has(opp.opportunity_id) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expanded.has(opp.opportunity_id) && (
              <div className="px-4 pb-4 border-t border-[#1e3a5f]">
                <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Insurance</p>
                    <p className="text-sm text-white">
                      {opp.insurance_bin || 'N/A'} / {opp.insurance_group || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Plan</p>
                    <p className="text-sm text-white">{opp.plan_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Prescriber</p>
                    <p className="text-sm text-white">{opp.prescriber_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Flagged</p>
                    <p className="text-sm text-white">{formatDate(opp.flagged_at || opp.created_at)}</p>
                  </div>
                </div>

                {opp.clinical_rationale && (
                  <div className="mt-4 p-3 bg-[#0a1628] rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Clinical Rationale</p>
                    <p className="text-sm text-slate-300">{opp.clinical_rationale}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => updateStatus(opp.opportunity_id, 'Submitted')}
                    disabled={processing === opp.opportunity_id}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Mark as Submitted
                  </button>
                  <button
                    onClick={() => updateStatus(opp.opportunity_id, "Didn't Work")}
                    disabled={processing === opp.opportunity_id}
                    className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Didn't Work
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
