'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import {
  CheckSquare,
  Clock,
  Check,
  X,
  User,
  FileText,
  RefreshCw,
  Search,
  AlertCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PendingFax {
  id: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  prescriber_name: string;
  patient_count: number;
  opportunity_count: number;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ApprovalQueuePage() {
  const user = useAuthStore((state) => state.user);
  const { canManageSettings } = usePermissions();

  const [pendingFaxes, setPendingFaxes] = useState<PendingFax[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPendingFaxes();
  }, [user?.pharmacyId]);

  async function fetchPendingFaxes() {
    // For now, show placeholder data since the fax queue system isn't fully built yet
    setLoading(false);
    setPendingFaxes([]);
  }

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="px-8 pt-6">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Approval Queue</h1>
                <p className="text-sm text-slate-400">Review and approve fax requests from staff</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchPendingFaxes}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-8 py-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-400">How the Approval Queue Works</h3>
            <p className="text-sm text-slate-400 mt-1">
              When staff members without fax permissions generate a fax, it will appear here for admin approval.
              Once approved, the fax will be sent to the prescriber. You can also reject faxes with a reason.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-2 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by staff name or prescriber..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#14b8a6]"
          />
        </div>
        <div className="text-sm text-slate-400">
          {pendingFaxes.length} pending approvals
        </div>
      </div>

      {/* Queue Content */}
      <div className="px-8 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[#14b8a6] animate-spin" />
          </div>
        ) : pendingFaxes.length === 0 ? (
          <div className="text-center py-16 bg-[#0d2137] rounded-xl border border-[#1e3a5f]">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No pending approvals</h3>
            <p className="text-slate-400">
              When staff members submit faxes for review, they will appear here.
            </p>
            <p className="text-slate-500 text-sm mt-4">
              Staff without the "Send Fax" permission will have their faxes routed here for admin approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingFaxes.map(fax => (
              <div key={fax.id} className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Fax to {fax.prescriber_name}</div>
                      <div className="text-sm text-slate-400">
                        {fax.patient_count} patients, {fax.opportunity_count} opportunities
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Submitted by {fax.created_by_name} on {new Date(fax.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Approve & Send
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
