'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import {
  Send,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  Calendar,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface GeneratedFax {
  id: string;
  generated_at: string;
  prescriber_name: string;
  patient_name: string;
  patient_id: string;
  opportunity_ids: string[];
  opportunity_count: number;
  status: 'pending' | 'submitted' | 'completed';
  days_since_generated: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDaysSince(dateStr: string): number {
  const generated = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - generated.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export default function FaxQueuePage() {
  const user = useAuthStore((state) => state.user);
  const [faxes, setFaxes] = useState<GeneratedFax[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  useEffect(() => {
    loadFaxHistory();
  }, []);

  function loadFaxHistory() {
    setLoading(true);
    try {
      // Load from localStorage for now (until backend endpoint is built)
      const stored = localStorage.getItem('therxos_fax_history');
      if (stored) {
        const parsed = JSON.parse(stored) as GeneratedFax[];
        // Update days_since_generated
        const updated = parsed.map(fax => ({
          ...fax,
          days_since_generated: getDaysSince(fax.generated_at),
        }));
        setFaxes(updated);
      }
    } catch (e) {
      console.error('Failed to load fax history:', e);
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    if (confirm('Are you sure you want to clear all fax history?')) {
      localStorage.removeItem('therxos_fax_history');
      setFaxes([]);
    }
  }

  function markAsSubmitted(faxId: string) {
    const updated = faxes.map(f =>
      f.id === faxId ? { ...f, status: 'submitted' as const } : f
    );
    setFaxes(updated);
    localStorage.setItem('therxos_fax_history', JSON.stringify(updated));
  }

  function removeFax(faxId: string) {
    const updated = faxes.filter(f => f.id !== faxId);
    setFaxes(updated);
    localStorage.setItem('therxos_fax_history', JSON.stringify(updated));
  }

  // Filter faxes
  const filteredFaxes = faxes.filter(fax => {
    if (filter === 'pending' && fax.status !== 'pending') return false;
    if (filter === 'submitted' && fax.status !== 'submitted') return false;
    if (search) {
      const s = search.toLowerCase();
      if (!fax.prescriber_name?.toLowerCase().includes(s) &&
          !fax.patient_name?.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  // Count warnings (pending faxes 3+ days old)
  const warningCount = faxes.filter(f => f.status === 'pending' && f.days_since_generated >= 3).length;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="px-8 pt-6">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#14b8a6]/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-[#14b8a6]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Fax Queue</h1>
                <p className="text-sm text-slate-400">Track generated faxes and their status</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {faxes.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              )}
              <button
                onClick={loadFaxHistory}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {warningCount > 0 && (
        <div className="px-8 py-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-400">Action Required</h3>
              <p className="text-sm text-slate-400 mt-1">
                {warningCount} fax{warningCount > 1 ? 'es were' : ' was'} generated over 3 days ago but the opportunity status hasn&apos;t been updated to &quot;Submitted&quot;.
                Please update the status or follow up with the prescriber.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-8 py-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by prescriber or patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#14b8a6]"
          />
        </div>
        <div className="flex bg-[#0d2137] border border-[#1e3a5f] rounded-lg p-1">
          {[
            { key: 'all', label: `All (${faxes.length})` },
            { key: 'pending', label: `Pending (${faxes.filter(f => f.status === 'pending').length})` },
            { key: 'submitted', label: `Submitted (${faxes.filter(f => f.status === 'submitted').length})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[#14b8a6] text-[#0a1628]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fax List */}
      <div className="px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[#14b8a6] animate-spin" />
          </div>
        ) : filteredFaxes.length === 0 ? (
          <div className="text-center py-16 bg-[#0d2137] rounded-xl border border-[#1e3a5f]">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No faxes generated yet</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              When you generate a fax PDF from the Opportunities page, it will appear here so you can track its status.
            </p>
            <p className="text-slate-500 text-sm mt-4">
              Go to <span className="text-[#14b8a6]">Opportunities</span> → Click on an opportunity → <span className="text-[#14b8a6]">Generate Fax PDF</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaxes.map(fax => {
              const isOverdue = fax.status === 'pending' && fax.days_since_generated >= 3;

              return (
                <div
                  key={fax.id}
                  className={`bg-[#0d2137] border rounded-xl p-5 ${
                    isOverdue ? 'border-amber-500/50' : 'border-[#1e3a5f]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        fax.status === 'submitted'
                          ? 'bg-emerald-500/20'
                          : isOverdue
                          ? 'bg-amber-500/20'
                          : 'bg-blue-500/20'
                      }`}>
                        {fax.status === 'submitted' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : isOverdue ? (
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">{fax.patient_name}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-[#14b8a6]">{fax.prescriber_name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(fax.generated_at)}
                          </span>
                          <span>•</span>
                          <span>{fax.opportunity_count} opportunit{fax.opportunity_count > 1 ? 'ies' : 'y'}</span>
                          {isOverdue && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-medium">
                                {fax.days_since_generated} days ago - needs follow up
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {fax.status === 'pending' && (
                        <button
                          onClick={() => markAsSubmitted(fax.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Submitted
                        </button>
                      )}
                      {fax.status === 'submitted' && (
                        <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
                          Submitted
                        </span>
                      )}
                      <button
                        onClick={() => removeFax(fax.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
