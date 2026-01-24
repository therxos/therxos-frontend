'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Eye,
  Pencil,
  Mail,
  FileDown,
  ExternalLink,
  RefreshCw,
  Users,
  Activity,
  DollarSign,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Pharmacy {
  pharmacy_id: string;
  client_id?: string;
  pharmacy_name?: string;
  client_name?: string;
  submitter_email?: string;
  state?: string;
  status?: 'onboarding' | 'active' | 'suspended' | 'demo' | null;
  created_at?: string;
  patient_count?: number;
  opportunity_count?: number;
  total_value?: number;
  captured_value?: number;
  user_count?: number;
  last_activity?: string;
}

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '$0';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchPharmacies();
  }, []);

  async function fetchPharmacies() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPharmacies(data.pharmacies || []);
      }
    } catch (err) {
      console.error('Failed to fetch pharmacies:', err);
    } finally {
      setLoading(false);
    }
  }

  async function impersonatePharmacy(pharmacyId: string) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pharmacy_id: pharmacyId }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('therxos_token', data.token);
        localStorage.setItem('therxos_impersonating', 'true');
        localStorage.setItem('therxos_original_token', token || '');
        window.location.href = '/dashboard';
      } else {
        const error = await res.json();
        alert('Failed to view as pharmacy: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to impersonate:', err);
      alert('Failed to view as pharmacy');
    }
  }

  const filteredPharmacies = (pharmacies || []).filter(p => {
    if (!p) return false;
    const matchesSearch =
      (p.pharmacy_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.state || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pharmacies</h1>
            <p className="text-sm text-slate-400">
              {(pharmacies || []).length} pharmacies ({(pharmacies || []).filter(p => p?.status === 'active').length} active)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPharmacies}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search pharmacies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="demo">Demo</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Pharmacies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPharmacies.map((pharmacy) => (
          <div
            key={pharmacy.pharmacy_id}
            className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-5 hover:border-teal-500/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{pharmacy.pharmacy_name || 'Unnamed Pharmacy'}</h3>
                <p className="text-sm text-slate-400">{pharmacy.client_name || 'No client'}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                pharmacy.status === 'active' ? 'bg-emerald-500/20 text-emerald-400'
                  : pharmacy.status === 'onboarding' ? 'bg-amber-500/20 text-amber-400'
                  : pharmacy.status === 'demo' ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {pharmacy.status || 'unknown'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                  <Users className="w-3 h-3" />
                </div>
                <p className="text-lg font-bold text-white">{pharmacy.patient_count || 0}</p>
                <p className="text-xs text-slate-500">Patients</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                  <Activity className="w-3 h-3" />
                </div>
                <p className="text-lg font-bold text-teal-400">{pharmacy.opportunity_count || 0}</p>
                <p className="text-xs text-slate-500">Opps</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                  <DollarSign className="w-3 h-3" />
                </div>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(pharmacy.total_value || 0)}</p>
                <p className="text-xs text-slate-500">Value</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                  <DollarSign className="w-3 h-3" />
                </div>
                <p className="text-lg font-bold text-amber-400">{formatCurrency(pharmacy.captured_value || 0)}</p>
                <p className="text-xs text-slate-500">Captured</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#1e3a5f]">
              <div className="text-xs text-slate-500">
                <p>{pharmacy.state || 'N/A'} · {pharmacy.user_count || 0} users</p>
                <p>Created {formatDate(pharmacy.created_at || '')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => impersonatePharmacy(pharmacy.pharmacy_id)}
                  className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-teal-400 transition-colors"
                  title="View as this pharmacy"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                  title="Edit pharmacy"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                  title="Send email"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPharmacies.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No pharmacies found matching your criteria
        </div>
      )}
    </div>
  );
}
