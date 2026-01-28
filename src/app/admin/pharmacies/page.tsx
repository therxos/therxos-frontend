'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Eye,
  Pencil,
  Mail,
  X,
  RefreshCw,
  Users,
  Activity,
  DollarSign,
  FileText,
  Shield,
  Key,
  CreditCard,
  Check,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Pharmacy {
  pharmacy_id: string;
  client_id?: string;
  pharmacy_name?: string;
  client_name?: string;
  submitter_email?: string;
  state?: string;
  address?: string;
  city?: string;
  zip?: string;
  phone?: string;
  fax?: string;
  pharmacy_npi?: string;
  ncpdp?: string;
  pms_system?: string;
  status?: 'onboarding' | 'active' | 'suspended' | 'demo' | null;
  created_at?: string;
  patient_count?: number;
  opportunity_count?: number;
  total_value?: number;
  captured_value?: number;
  user_count?: number;
  last_activity?: string;
  // Document tracking
  baa_signed_at?: string;
  service_agreement_signed_at?: string;
  stripe_customer_id?: string;
  // Polling
  last_poll?: {
    run_type: string;
    completed_at: string;
    status: string;
    summary: any;
  } | null;
  last_data_received?: string;
}

interface TempCredentials {
  email: string;
  tempPassword: string;
  firstName: string;
  isNewUser: boolean;
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

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function getPollSourceLabel(pmsSystem: string | undefined): string {
  if (pmsSystem === 'rx30') return 'Microsoft / Outcomes';
  return 'Gmail / SPP';
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedPharmacy, setExpandedPharmacy] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tempCredentials, setTempCredentials] = useState<TempCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [pollingPharmacy, setPollingPharmacy] = useState<string | null>(null);

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

        localStorage.setItem('therxos-auth', JSON.stringify({
          state: {
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            permissionOverrides: {},
          },
          version: 0,
        }));

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

  async function savePharmacy() {
    if (!editingPharmacy) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies/${editingPharmacy.pharmacy_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacyName: editingPharmacy.pharmacy_name,
          pharmacyNpi: editingPharmacy.pharmacy_npi,
          ncpdp: editingPharmacy.ncpdp,
          state: editingPharmacy.state,
          address: editingPharmacy.address,
          city: editingPharmacy.city,
          zip: editingPharmacy.zip,
          phone: editingPharmacy.phone,
          fax: editingPharmacy.fax,
          pmsSystem: editingPharmacy.pms_system,
          status: editingPharmacy.status,
          submitterEmail: editingPharmacy.submitter_email,
        }),
      });

      if (res.ok) {
        setEditingPharmacy(null);
        fetchPharmacies();
      } else {
        const error = await res.json();
        alert('Failed to save: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to save pharmacy:', err);
      alert('Failed to save pharmacy');
    } finally {
      setSaving(false);
    }
  }

  async function createTempLogin(pharmacyId: string) {
    setActionLoading(`temp-${pharmacyId}`);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies/${pharmacyId}/create-temp-login`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTempCredentials(data.credentials);
      } else {
        alert('Failed to create temp login: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Create temp login error:', err);
      alert('Failed to create temp login');
    } finally {
      setActionLoading(null);
    }
  }

  async function downloadDocument(pharmacyId: string, docType: 'baa' | 'service-agreement' | 'onboarding-guide') {
    setActionLoading(`${docType}-${pharmacyId}`);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies/${pharmacyId}/download-${docType}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = res.headers.get('content-disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename="')[1]?.replace('"', '') || `${docType}.docx`
          : `${docType}.docx`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        alert('Failed to download: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    } finally {
      setActionLoading(null);
    }
  }

  async function createStripeCheckout(pharmacyId: string, clientId: string) {
    setActionLoading(`stripe-${pharmacyId}`);
    try {
      const token = localStorage.getItem('therxos_token');

      // First create Stripe customer if needed
      await fetch(`${API_URL}/api/admin/clients/${clientId}/create-stripe-customer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Then create checkout session
      const res = await fetch(`${API_URL}/api/admin/clients/${clientId}/create-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.checkoutUrl) {
        // Copy to clipboard
        await navigator.clipboard.writeText(data.checkoutUrl);
        alert('Stripe checkout link copied to clipboard!\n\n' + data.checkoutUrl);
      } else {
        alert('Failed to create checkout: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      alert('Failed to create Stripe checkout');
    } finally {
      setActionLoading(null);
    }
  }

  async function markDocumentSigned(pharmacyId: string, docType: 'baa' | 'service_agreement') {
    setActionLoading(`sign-${docType}-${pharmacyId}`);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies/${pharmacyId}/mark-document-signed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentType: docType }),
      });

      if (res.ok) {
        fetchPharmacies();
      } else {
        const data = await res.json();
        alert('Failed to mark as signed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Mark signed error:', err);
      alert('Failed to mark document as signed');
    } finally {
      setActionLoading(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function triggerPoll(pharmacyId: string, pmsSystem: string | undefined) {
    setPollingPharmacy(pharmacyId);
    try {
      const token = localStorage.getItem('therxos_token');
      const endpoint = pmsSystem === 'rx30'
        ? `${API_URL}/api/automation/poll-outcomes`
        : `${API_URL}/api/automation/poll-spp`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pharmacyId, daysBack: 1 }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Poll completed: ${data.message || 'Success'}`);
        fetchPharmacies();
      } else {
        alert('Poll failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Poll trigger error:', err);
      alert('Failed to trigger poll');
    } finally {
      setPollingPharmacy(null);
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
                  onClick={() => setEditingPharmacy(pharmacy)}
                  className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                  title="Edit pharmacy"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setExpandedPharmacy(expandedPharmacy === pharmacy.pharmacy_id ? null : pharmacy.pharmacy_id)}
                  className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                  title={expandedPharmacy === pharmacy.pharmacy_id ? 'Collapse actions' : 'Expand actions'}
                >
                  {expandedPharmacy === pharmacy.pharmacy_id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Actions Panel */}
            {expandedPharmacy === pharmacy.pharmacy_id && (
              <div className="mt-4 pt-4 border-t border-[#1e3a5f] space-y-4">
                {/* Document Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0a1628] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">BAA</span>
                      {pharmacy.baa_signed_at ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <Check className="w-3 h-3" />
                          Signed
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400">Not signed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadDocument(pharmacy.pharmacy_id, 'baa')}
                        disabled={actionLoading === `baa-${pharmacy.pharmacy_id}`}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#1e3a5f] hover:bg-[#2a4a6f] rounded text-xs text-white transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        {actionLoading === `baa-${pharmacy.pharmacy_id}` ? 'Loading...' : 'Download'}
                      </button>
                      {!pharmacy.baa_signed_at && (
                        <button
                          onClick={() => markDocumentSigned(pharmacy.pharmacy_id, 'baa')}
                          disabled={actionLoading === `sign-baa-${pharmacy.pharmacy_id}`}
                          className="px-2 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded text-xs text-emerald-400 transition-colors disabled:opacity-50"
                        >
                          Mark Signed
                        </button>
                      )}
                    </div>
                    {pharmacy.baa_signed_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(pharmacy.baa_signed_at)}
                      </p>
                    )}
                  </div>

                  <div className="bg-[#0a1628] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">Service Agreement</span>
                      {pharmacy.service_agreement_signed_at ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <Check className="w-3 h-3" />
                          Signed
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400">Not signed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadDocument(pharmacy.pharmacy_id, 'service-agreement')}
                        disabled={actionLoading === `service-agreement-${pharmacy.pharmacy_id}`}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#1e3a5f] hover:bg-[#2a4a6f] rounded text-xs text-white transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        {actionLoading === `service-agreement-${pharmacy.pharmacy_id}` ? 'Loading...' : 'Download'}
                      </button>
                      {!pharmacy.service_agreement_signed_at && (
                        <button
                          onClick={() => markDocumentSigned(pharmacy.pharmacy_id, 'service_agreement')}
                          disabled={actionLoading === `sign-service_agreement-${pharmacy.pharmacy_id}`}
                          className="px-2 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded text-xs text-emerald-400 transition-colors disabled:opacity-50"
                        >
                          Mark Signed
                        </button>
                      )}
                    </div>
                    {pharmacy.service_agreement_signed_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(pharmacy.service_agreement_signed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Data Pipeline / Polling */}
                <div className="bg-[#0a1628] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-300">Data Pipeline</span>
                    <span className="text-xs text-slate-500">
                      {getPollSourceLabel(pharmacy.pms_system)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Last Poll</p>
                      <p className="text-sm text-white">
                        {pharmacy.last_poll?.completed_at
                          ? formatRelativeTime(pharmacy.last_poll.completed_at)
                          : 'Never'}
                      </p>
                      {pharmacy.last_poll?.run_type && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {pharmacy.last_poll.run_type.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Data Received</p>
                      <p className="text-sm text-white">
                        {pharmacy.last_data_received
                          ? formatRelativeTime(pharmacy.last_data_received)
                          : 'No data'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => triggerPoll(pharmacy.pharmacy_id, pharmacy.pms_system)}
                    disabled={pollingPharmacy === pharmacy.pharmacy_id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${pollingPharmacy === pharmacy.pharmacy_id ? 'animate-spin' : ''}`} />
                    {pollingPharmacy === pharmacy.pharmacy_id ? 'Polling...' : 'Poll Now'}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => createTempLogin(pharmacy.pharmacy_id)}
                    disabled={actionLoading === `temp-${pharmacy.pharmacy_id}`}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    {actionLoading === `temp-${pharmacy.pharmacy_id}` ? 'Creating...' : 'Create Temp Login'}
                  </button>

                  <button
                    onClick={() => createStripeCheckout(pharmacy.pharmacy_id, pharmacy.client_id || '')}
                    disabled={actionLoading === `stripe-${pharmacy.pharmacy_id}` || !pharmacy.client_id}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {actionLoading === `stripe-${pharmacy.pharmacy_id}` ? 'Creating...' : 'Stripe Checkout Link'}
                  </button>

                  <button
                    onClick={() => downloadDocument(pharmacy.pharmacy_id, 'onboarding-guide')}
                    disabled={actionLoading === `onboarding-guide-${pharmacy.pharmacy_id}`}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    {actionLoading === `onboarding-guide-${pharmacy.pharmacy_id}` ? 'Generating...' : 'Onboarding Guide'}
                  </button>

                  {pharmacy.submitter_email && (
                    <a
                      href={`mailto:${pharmacy.submitter_email}`}
                      className="flex items-center gap-2 px-3 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email Client
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredPharmacies.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No pharmacies found matching your criteria
        </div>
      )}

      {/* Temp Credentials Modal */}
      {tempCredentials && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setTempCredentials(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-[#1e3a5f]">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  {tempCredentials.isNewUser ? 'New Login Created' : 'Password Reset'}
                </h2>
                <button onClick={() => setTempCredentials(null)} className="p-1 hover:bg-[#1e3a5f] rounded">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-[#0a1628] rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-teal-400 bg-[#1e3a5f] px-3 py-2 rounded">
                        {tempCredentials.email}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tempCredentials.email)}
                        className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Temporary Password</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-amber-400 bg-[#1e3a5f] px-3 py-2 rounded font-mono">
                        {tempCredentials.tempPassword}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tempCredentials.tempPassword)}
                        className="p-2 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    copyToClipboard(`Email: ${tempCredentials.email}\nPassword: ${tempCredentials.tempPassword}`);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Both
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-400 text-center">
                  User will be prompted to change password on first login
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingPharmacy && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setEditingPharmacy(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-[#1e3a5f]">
                <h2 className="text-lg font-semibold text-white">Edit Pharmacy</h2>
                <button onClick={() => setEditingPharmacy(null)} className="p-1 hover:bg-[#1e3a5f] rounded">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Pharmacy Name</label>
                    <input
                      type="text"
                      value={editingPharmacy.pharmacy_name || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, pharmacy_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                    <select
                      value={editingPharmacy.status || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="active">Active</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="demo">Demo</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">NPI</label>
                    <input
                      type="text"
                      value={editingPharmacy.pharmacy_npi || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, pharmacy_npi: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">NCPDP</label>
                    <input
                      type="text"
                      value={editingPharmacy.ncpdp || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, ncpdp: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
                  <input
                    type="text"
                    value={editingPharmacy.address || ''}
                    onChange={(e) => setEditingPharmacy({ ...editingPharmacy, address: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      value={editingPharmacy.city || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, city: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">State</label>
                    <input
                      type="text"
                      value={editingPharmacy.state || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, state: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">ZIP</label>
                    <input
                      type="text"
                      value={editingPharmacy.zip || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, zip: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingPharmacy.phone || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Fax</label>
                    <input
                      type="text"
                      value={editingPharmacy.fax || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, fax: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">PMS System</label>
                    <select
                      value={editingPharmacy.pms_system || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, pms_system: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Select PMS</option>
                      <option value="pioneer">Pioneer Rx</option>
                      <option value="rx30">Rx30</option>
                      <option value="liberty">Liberty</option>
                      <option value="pharmsoft">PharmSoft</option>
                      <option value="outcomes">Outcomes</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={editingPharmacy.submitter_email || ''}
                      onChange={(e) => setEditingPharmacy({ ...editingPharmacy, submitter_email: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-[#1e3a5f]">
                <button
                  onClick={() => setEditingPharmacy(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePharmacy}
                  disabled={saving}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
