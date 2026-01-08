'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Eye,
  LogIn,
  Settings,
  ChevronRight,
  ChevronDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Mail,
  RefreshCw,
  Zap,
  ExternalLink,
  XCircle,
  Flag,
  Trash2,
  RotateCcw,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Pharmacy {
  pharmacy_id: string;
  pharmacy_name: string;
  client_name: string;
  submitter_email: string;
  state: string;
  status: string;
  created_at: string;
  patient_count: number;
  opportunity_count: number;
  total_value: number;
  captured_value: number;
  user_count: number;
  last_activity: string;
}

interface PlatformStats {
  total_pharmacies: number;
  active_pharmacies: number;
  total_users: number;
  total_opportunities: number;
  total_value: number;
  captured_value: number;
  mrr: number;
  arr: number;
}

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

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, _hasHydrated, setAuth } = useAuthStore();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacySwitcherOpen, setPharmacySwitcherOpen] = useState(false);
  const [switchingPharmacy, setSwitchingPharmacy] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; lastUpdated: string | null } | null>(null);
  const [pollingPharmacy, setPollingPharmacy] = useState<string | null>(null);
  const [pollResult, setPollResult] = useState<any>(null);
  const [didntWorkQueue, setDidntWorkQueue] = useState<DidntWorkOpp[]>([]);
  const [processingOpp, setProcessingOpp] = useState<string | null>(null);
  const [showDidntWorkQueue, setShowDidntWorkQueue] = useState(true);

  useEffect(() => {
    // Wait for hydration before checking role
    if (!_hasHydrated) return;
    
    // If no user but we have a token, fetch user data
    const token = localStorage.getItem('therxos_token');
    if (!user && token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setAuth(data.user, token);
          } else {
            router.push('/login');
          }
        })
        .catch(() => router.push('/login'));
      return;
    }
    
    // Check if user is super admin
    if (user?.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, _hasHydrated]);

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');

      // Fetch all pharmacies
      const pharmaciesRes = await fetch(`${API_URL}/api/admin/pharmacies`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch platform stats
      const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (pharmaciesRes.ok) {
        const data = await pharmaciesRes.json();
        setPharmacies(data.pharmacies || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Fetch Gmail status
      fetchGmailStatus();

      // Fetch didn't work queue
      fetchDidntWorkQueue();
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDidntWorkQueue() {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/didnt-work-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDidntWorkQueue(data.opportunities || []);
      }
    } catch (err) {
      console.error('Failed to fetch didnt-work queue:', err);
    }
  }

  async function handleExcludeGroup(opp: DidntWorkOpp) {
    if (!confirm(`This will deny ALL ${opp.affected_count} opportunities for "${opp.opportunity_type}" on insurance group "${opp.insurance_group}". Continue?`)) {
      return;
    }
    setProcessingOpp(opp.opportunity_id);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/exclude-group`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityType: opp.opportunity_type,
          insuranceGroup: opp.insurance_group,
          insuranceBin: opp.insurance_bin,
          reason: `Excluded: ${opp.opportunity_type} doesn't work on ${opp.insurance_group}`,
          opportunityId: opp.opportunity_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.excluded} opportunities excluded for ${opp.opportunity_type} on ${opp.insurance_group}`);
        fetchDidntWorkQueue();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Exclude failed:', err);
      alert('Failed to exclude group');
    } finally {
      setProcessingOpp(null);
    }
  }

  async function handleFlagGroup(opp: DidntWorkOpp) {
    if (!confirm(`This will flag ALL ${opp.affected_count} opportunities for "${opp.opportunity_type}" on insurance group "${opp.insurance_group}" until you fix them. Continue?`)) {
      return;
    }
    setProcessingOpp(opp.opportunity_id);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/flag-group`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityType: opp.opportunity_type,
          insuranceGroup: opp.insurance_group,
          opportunityId: opp.opportunity_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.flagged} opportunities flagged for ${opp.opportunity_type} on ${opp.insurance_group}`);
        fetchDidntWorkQueue();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Flag failed:', err);
      alert('Failed to flag group');
    } finally {
      setProcessingOpp(null);
    }
  }

  async function handleResolveOpp(opp: DidntWorkOpp, action: 'deny' | 'reopen') {
    setProcessingOpp(opp.opportunity_id);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/resolve-didnt-work`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId: opp.opportunity_id,
          action,
          reason: action === 'deny' ? 'Resolved by super admin' : null,
        }),
      });
      if (res.ok) {
        fetchDidntWorkQueue();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Resolve failed:', err);
      alert('Failed to resolve opportunity');
    } finally {
      setProcessingOpp(null);
    }
  }

  async function fetchGmailStatus() {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/automation/gmail/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGmailStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Gmail status:', err);
    }
  }

  async function connectGmail() {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/automation/gmail/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.authUrl;
      } else {
        const error = await res.json();
        alert('Failed to get auth URL: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to connect Gmail:', err);
      alert('Failed to connect Gmail');
    }
  }

  async function triggerPoll(pharmacyId: string) {
    setPollingPharmacy(pharmacyId);
    setPollResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/automation/poll-spp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pharmacyId, daysBack: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setPollResult({ success: true, ...data });
      } else {
        setPollResult({ success: false, error: data.error });
      }
    } catch (err) {
      console.error('Poll failed:', err);
      setPollResult({ success: false, error: 'Request failed' });
    } finally {
      setPollingPharmacy(null);
    }
  }

  async function impersonatePharmacy(pharmacyId: string, fromDropdown = false) {
    if (switchingPharmacy) return;
    if (fromDropdown) {
      setSwitchingPharmacy(true);
      setPharmacySwitcherOpen(false);
    }

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
        // Store the impersonation token and redirect
        localStorage.setItem('therxos_token', data.token);
        localStorage.setItem('therxos_impersonating', 'true');
        localStorage.setItem('therxos_original_token', token || '');

        // Update auth store
        setAuth(data.user, data.token);

        window.location.href = '/dashboard';
      } else {
        const error = await res.json();
        console.error('Impersonate error:', error);
        alert('Failed to switch: ' + (error.error || 'Unknown error'));
        setSwitchingPharmacy(false);
      }
    } catch (err) {
      console.error('Impersonation failed:', err);
      alert('Failed to switch pharmacy');
      setSwitchingPharmacy(false);
    }
  }

  const filteredPharmacies = pharmacies.filter(p => 
    p.pharmacy_name.toLowerCase().includes(search.toLowerCase()) ||
    p.client_name.toLowerCase().includes(search.toLowerCase()) ||
    p.submitter_email.toLowerCase().includes(search.toLowerCase())
  );

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function formatDate(date: string) {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Wait for hydration
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Super Admin Panel</h1>
              <p className="text-sm text-slate-400">Platform-wide management and analytics</p>
            </div>
          </div>

          {/* Pharmacy Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPharmacySwitcherOpen(!pharmacySwitcherOpen)}
              disabled={switchingPharmacy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d2137] border border-[#1e3a5f] hover:bg-[#1e3a5f] transition-colors"
            >
              <Building2 className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-medium text-white">
                {switchingPharmacy ? 'Switching...' : 'Switch to Pharmacy'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${pharmacySwitcherOpen ? 'rotate-180' : ''}`} />
            </button>

            {pharmacySwitcherOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPharmacySwitcherOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-xl z-50 overflow-hidden bg-[#0d2137] border border-[#1e3a5f]">
                  <div className="p-3 border-b border-[#1e3a5f]">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Switch to Pharmacy Dashboard
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {pharmacies.map((pharmacy) => (
                      <button
                        key={pharmacy.pharmacy_id}
                        onClick={() => impersonatePharmacy(pharmacy.pharmacy_id, true)}
                        className="w-full text-left px-4 py-3 hover:bg-[#1e3a5f] transition-colors border-b border-[#1e3a5f]/50"
                      >
                        <p className="text-sm font-medium text-white">{pharmacy.pharmacy_name}</p>
                        <p className="text-xs text-slate-400">{pharmacy.client_name}</p>
                      </button>
                    ))}
                    {pharmacies.length === 0 && (
                      <div className="p-4 text-center text-sm text-slate-400">
                        No pharmacies available
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Building2 className="w-4 h-4" />
            Pharmacies
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total_pharmacies || 0}</p>
          <p className="text-xs text-emerald-400">{stats?.active_pharmacies || 0} active</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Users className="w-4 h-4" />
            Users
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Activity className="w-4 h-4" />
            Opportunities
          </div>
          <p className="text-2xl font-bold text-teal-400">{(stats?.total_opportunities || 0).toLocaleString()}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <DollarSign className="w-4 h-4" />
            Total Value
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats?.total_value || 0)}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <CheckCircle className="w-4 h-4" />
            Captured
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats?.captured_value || 0)}</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <TrendingUp className="w-4 h-4" />
            MRR / ARR
          </div>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats?.mrr || 0)}</p>
          <p className="text-xs text-purple-300">{formatCurrency(stats?.arr || 0)}/yr</p>
        </div>
        
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BarChart3 className="w-4 h-4" />
            Capture Rate
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {stats?.total_value ? ((stats.captured_value / stats.total_value) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Gmail Automation Section */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Gmail Automation</h2>
              <p className="text-sm text-slate-400">Auto-process SPP reports from Pioneer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {gmailStatus?.connected ? (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                Connected
              </span>
            ) : (
              <button
                onClick={connectGmail}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Connect Gmail
              </button>
            )}
          </div>
        </div>

        {gmailStatus?.connected && (
          <div className="mt-4 pt-4 border-t border-[#1e3a5f]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">
                Last synced: {gmailStatus.lastUpdated ? formatDate(gmailStatus.lastUpdated) : 'Never'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pharmacies.slice(0, 6).map((pharmacy) => (
                <div
                  key={pharmacy.pharmacy_id}
                  className="flex items-center justify-between p-3 bg-[#0a1628] rounded-lg"
                >
                  <span className="text-sm text-white truncate">{pharmacy.pharmacy_name}</span>
                  <button
                    onClick={() => triggerPoll(pharmacy.pharmacy_id)}
                    disabled={pollingPharmacy !== null}
                    className="flex items-center gap-1 px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {pollingPharmacy === pharmacy.pharmacy_id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Polling...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        Poll
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {pollResult && (
              <div className={`mt-4 p-3 rounded-lg ${pollResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {pollResult.success ? (
                  <div className="text-sm">
                    <p className="font-medium">Poll completed successfully!</p>
                    <p>Emails processed: {pollResult.emailsProcessed || 0}</p>
                    <p>Attachments processed: {pollResult.attachmentsProcessed || 0}</p>
                    <p>Records ingested: {pollResult.totalRecordsIngested || 0}</p>
                    <p>Opportunities completed: {pollResult.totalOpportunitiesCompleted || 0}</p>
                    <p>New opportunities: {pollResult.totalNewOpportunities || 0}</p>
                    {pollResult.debug && pollResult.debug.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-500/20 rounded text-blue-400">
                        <p className="font-medium">Debug Info:</p>
                        {pollResult.debug.map((d: any, i: number) => (
                          <div key={i} className="text-xs mt-1">
                            <p>File: {d.filename}</p>
                            <p>Total rows: {d.totalRecords}, Inserted: {d.inserted}, Duplicates: {d.duplicates}, Errors: {d.validationErrors}</p>
                            {d.sampleErrors && d.sampleErrors.length > 0 && (
                              <div className="text-red-400 mt-1">
                                {d.sampleErrors.map((e: any, j: number) => (
                                  <p key={j}>Row {e.row}: {e.errors}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {pollResult.errors && pollResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-500/20 rounded text-red-400">
                        <p className="font-medium">Errors:</p>
                        {pollResult.errors.map((err: any, i: number) => (
                          <p key={i} className="text-xs">{err.filename || 'Unknown'}: {err.error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm">Error: {pollResult.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {!gmailStatus?.connected && (
          <div className="mt-4 p-4 bg-[#0a1628] rounded-lg">
            <p className="text-sm text-slate-400 mb-2">
              Connect your TheRxOS Gmail account to automatically:
            </p>
            <ul className="text-sm text-slate-300 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                Fetch nightly SPP reports from Pioneer
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                Ingest prescription data automatically
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                Auto-complete opportunities when patients fill recommended drugs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                Scan for new opportunities from incoming data
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Didn't Work Queue */}
      {didntWorkQueue.length > 0 && (
        <div className="bg-[#0d2137] border border-red-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Didn&apos;t Work Queue</h2>
                <p className="text-sm text-slate-400">
                  {didntWorkQueue.length} opportunities need attention
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDidntWorkQueue(!showDidntWorkQueue)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {showDidntWorkQueue ? 'Hide' : 'Show'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showDidntWorkQueue ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showDidntWorkQueue && (
            <div className="space-y-3">
              {didntWorkQueue.map((opp) => (
                <div
                  key={opp.opportunity_id}
                  className="bg-[#0a1628] rounded-lg p-4 border border-[#1e3a5f]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-medium">
                          {opp.opportunity_type}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">{opp.pharmacy_name}</span>
                      </div>
                      <p className="text-sm text-white mb-1">
                        {opp.current_drug_name} → {opp.recommended_drug_name}
                      </p>
                      <p className="text-xs text-slate-400 mb-2">
                        Patient: {opp.patient_first_name} {opp.patient_last_name}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">BIN:</span>{' '}
                          <span className="text-amber-400 font-mono">{opp.insurance_bin || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">GROUP:</span>{' '}
                          <span className="text-amber-400 font-mono">{opp.insurance_group || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Plan:</span>{' '}
                          <span className="text-slate-300">{opp.plan_name || 'Unknown'}</span>
                        </div>
                      </div>
                      {opp.staff_notes && (
                        <p className="text-xs text-slate-500 mt-2 italic">
                          Note: {opp.staff_notes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1e3a5f]">
                        <div className="text-xs">
                          <span className="text-slate-500">Same trigger+group:</span>{' '}
                          <span className="text-teal-400 font-semibold">{opp.affected_count}</span>
                          <span className="text-slate-500"> opps worth </span>
                          <span className="text-emerald-400 font-semibold">${Math.round(opp.affected_value).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleExcludeGroup(opp)}
                        disabled={processingOpp === opp.opportunity_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded transition-colors disabled:opacity-50"
                        title="Deny ALL opportunities for this trigger on this insurance group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Exclude Group
                      </button>
                      <button
                        onClick={() => handleFlagGroup(opp)}
                        disabled={processingOpp === opp.opportunity_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-medium rounded transition-colors disabled:opacity-50"
                        title="Flag all for this trigger+group until fixed"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Flag Group
                      </button>
                      <button
                        onClick={() => handleResolveOpp(opp, 'deny')}
                        disabled={processingOpp === opp.opportunity_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 text-xs font-medium rounded transition-colors disabled:opacity-50"
                        title="Just deny this one opportunity"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Deny This One
                      </button>
                      <button
                        onClick={() => handleResolveOpp(opp, 'reopen')}
                        disabled={processingOpp === opp.opportunity_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-xs font-medium rounded transition-colors disabled:opacity-50"
                        title="Reopen this opportunity"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reopen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search pharmacies, clients, emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#0d2137] border border-[#1e3a5f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Pharmacies Table */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e3a5f]">
          <h2 className="text-lg font-semibold text-white">All Pharmacies</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e3a5f]">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Pharmacy</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Users</th>
                <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Patients</th>
                <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Opps</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Value</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Captured</th>
                <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Last Activity</th>
                <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPharmacies.map((pharmacy) => (
                <tr key={pharmacy.pharmacy_id} className="border-b border-[#1e3a5f] hover:bg-[#1e3a5f]/30">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{pharmacy.pharmacy_name}</p>
                      <p className="text-xs text-slate-400">{pharmacy.submitter_email}</p>
                      <p className="text-xs text-slate-500">{pharmacy.state}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pharmacy.status === 'active' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {pharmacy.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-white">{pharmacy.user_count}</td>
                  <td className="px-6 py-4 text-center text-white">{pharmacy.patient_count?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-teal-400">{pharmacy.opportunity_count?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-emerald-400">{formatCurrency(pharmacy.total_value)}</td>
                  <td className="px-6 py-4 text-right text-amber-400">{formatCurrency(pharmacy.captured_value)}</td>
                  <td className="px-6 py-4 text-center text-slate-400 text-sm">{formatDate(pharmacy.last_activity)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedPharmacy(pharmacy)}
                        className="p-2 hover:bg-[#1e3a5f] rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => impersonatePharmacy(pharmacy.pharmacy_id)}
                        className="p-2 hover:bg-teal-500/20 rounded-lg text-slate-400 hover:text-teal-400 transition-colors"
                        title="Login as Admin"
                      >
                        <LogIn className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredPharmacies.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No pharmacies found
          </div>
        )}
      </div>

      {/* Pharmacy Detail Modal */}
      {selectedPharmacy && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedPharmacy(null)} />
          <div className="fixed inset-y-0 right-0 w-[500px] bg-[#0d2137] border-l border-[#1e3a5f] z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedPharmacy.pharmacy_name}</h2>
                <button 
                  onClick={() => setSelectedPharmacy(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-slate-400 mb-2">Contact</h3>
                  <p className="text-white">{selectedPharmacy.submitter_email}</p>
                  <p className="text-slate-400">{selectedPharmacy.state}</p>
                </div>
                
                <div>
                  <h3 className="text-sm text-slate-400 mb-2">Account Created</h3>
                  <p className="text-white">{formatDate(selectedPharmacy.created_at)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a1628] rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Patients</p>
                    <p className="text-2xl font-bold text-white">{selectedPharmacy.patient_count?.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#0a1628] rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Opportunities</p>
                    <p className="text-2xl font-bold text-teal-400">{selectedPharmacy.opportunity_count?.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#0a1628] rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Total Value</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedPharmacy.total_value)}</p>
                  </div>
                  <div className="bg-[#0a1628] rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-1">Captured</p>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(selectedPharmacy.captured_value)}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => impersonatePharmacy(selectedPharmacy.pharmacy_id)}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Login as Pharmacy Admin
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
