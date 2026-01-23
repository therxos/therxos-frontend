'use client';

import { useState, useEffect } from 'react';
import {
  XCircle,
  RefreshCw,
  Trash2,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  Flag,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface DidntWorkOpp {
  opportunity_id: string;
  opportunity_type: string;
  trigger_group: string;
  current_drug_name: string;
  recommended_drug_name: string;
  potential_margin_gain: number;
  annual_margin_gain: number;
  staff_notes: string;
  updated_at: string;
  pharmacy_name: string;
  pharmacy_id: string;
  insurance_bin: string;
  insurance_group: string;
  plan_name: string;
  patient_first_name: string;
  patient_last_name: string;
  affected_count: number;
  affected_value: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DidntWorkQueuePage() {
  const [queue, setQueue] = useState<DidntWorkOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOpp, setExpandedOpp] = useState<string | null>(null);
  const [processingOpp, setProcessingOpp] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunities/didnt-work`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.opportunities || []);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  }

  async function excludeBinGroup(oppId: string, bin: string, group: string, triggerGroup: string) {
    setProcessingOpp(oppId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/exclude-bin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bin,
          group,
          trigger_group: triggerGroup,
        }),
      });
      if (res.ok) {
        // Remove from queue or mark as processed
        setQueue(prev => prev.filter(o => o.opportunity_id !== oppId));
      } else {
        const error = await res.json();
        alert('Failed to exclude: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to exclude:', err);
      alert('Failed to exclude BIN/GROUP');
    } finally {
      setProcessingOpp(null);
    }
  }

  async function deleteOpportunity(oppId: string) {
    if (!confirm('Delete this opportunity and remove from queue?')) return;
    setProcessingOpp(oppId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunities/${oppId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setQueue(prev => prev.filter(o => o.opportunity_id !== oppId));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete opportunity');
    } finally {
      setProcessingOpp(null);
    }
  }

  async function resetStatus(oppId: string) {
    setProcessingOpp(oppId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/opportunities/${oppId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Not Submitted', notes: 'Reset from admin queue' }),
      });
      if (res.ok) {
        setQueue(prev => prev.filter(o => o.opportunity_id !== oppId));
      }
    } catch (err) {
      console.error('Failed to reset:', err);
      alert('Failed to reset status');
    } finally {
      setProcessingOpp(null);
    }
  }

  const totalValue = queue.reduce((sum, o) => sum + (o.affected_value || o.annual_margin_gain || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Didn&apos;t Work Queue</h1>
            <p className="text-sm text-slate-400">
              {queue.length} opportunities need attention · {formatCurrency(totalValue)} affected
            </p>
          </div>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-12 text-center">
          <XCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Queue is empty</h3>
          <p className="text-slate-400">No opportunities marked as &quot;Didn&apos;t Work&quot; at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((opp) => (
            <div
              key={opp.opportunity_id}
              className="bg-[#0d2137] border border-red-500/30 rounded-xl overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {opp.patient_first_name} {opp.patient_last_name}
                      </h3>
                      <span className="px-2 py-0.5 bg-slate-500/20 text-slate-300 rounded text-xs">
                        {opp.pharmacy_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Current Drug</p>
                        <p className="text-sm text-white">{opp.current_drug_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Recommended</p>
                        <p className="text-sm text-teal-400">{opp.recommended_drug_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">BIN / Group</p>
                        <p className="text-sm text-white font-mono">{opp.insurance_bin} / {opp.insurance_group || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Affected Value</p>
                        <p className="text-sm text-red-400 font-semibold">
                          {formatCurrency(opp.affected_value || opp.annual_margin_gain)} ({opp.affected_count || 1} opps)
                        </p>
                      </div>
                    </div>

                    {opp.staff_notes && (
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-red-400 uppercase mb-1">Staff Notes</p>
                        <p className="text-sm text-slate-300">{opp.staff_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedOpp(expandedOpp === opp.opportunity_id ? null : opp.opportunity_id)}
                      className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                    >
                      {expandedOpp === opp.opportunity_id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Actions */}
              {expandedOpp === opp.opportunity_id && (
                <div className="px-5 pb-5 pt-0">
                  <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]">
                    <p className="text-xs text-slate-500">
                      Trigger: {opp.trigger_group} · Updated: {formatDate(opp.updated_at)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => excludeBinGroup(opp.opportunity_id, opp.insurance_bin, opp.insurance_group, opp.trigger_group)}
                        disabled={processingOpp === opp.opportunity_id}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Flag className="w-4 h-4" />
                        Exclude BIN/Group from Trigger
                      </button>
                      <button
                        onClick={() => resetStatus(opp.opportunity_id)}
                        disabled={processingOpp === opp.opportunity_id}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Not Submitted
                      </button>
                      <button
                        onClick={() => deleteOpportunity(opp.opportunity_id)}
                        disabled={processingOpp === opp.opportunity_id}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
