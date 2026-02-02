'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Crosshair,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Pencil,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ScanLine,
  Loader2,
  Zap,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PharmacyStat {
  pharmacy_id: string;
  pharmacy_name: string;
  opportunity_count: number;
  patient_count: number;
  total_margin: number;
}

interface Trigger {
  trigger_id: string;
  trigger_code: string;
  display_name: string;
  trigger_type: 'therapeutic_interchange' | 'missing_therapy' | 'ndc_optimization' | 'brand_to_generic' | 'formulation_change' | 'combo_therapy';
  category: string | null;
  detection_keywords: string[];
  exclude_keywords: string[];
  if_has_keywords: string[];
  if_not_has_keywords: string[];
  recommended_drug: string | null;
  recommended_ndc: string | null;
  action_instructions: string | null;
  clinical_rationale: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  annual_fills: number;
  default_gp_value: number | null;
  keyword_match_mode: 'any' | 'all';
  is_enabled: boolean;
  created_at: string;
  bin_inclusions: string[] | null;
  bin_exclusions: string[] | null;
  group_inclusions: string[] | null;
  group_exclusions: string[] | null;
  contract_prefix_exclusions: string[] | null;
  pharmacy_inclusions: string[] | null;
  expected_qty: number | null;
  expected_days_supply: number | null;
  synced_at?: string | null;
  cms_coverage?: {
    average_tier: number | null;
    prior_auth_rate: number;
    step_therapy_rate: number;
    quantity_limit_rate: number;
  } | null;
  bin_values: {
    bin: string;
    group?: string | null;
    gpValue?: number | null;
    isExcluded?: boolean;
    coverageStatus?: 'works' | 'excluded' | 'verified' | 'unknown';
    verifiedAt?: string | null;
    verifiedClaimCount?: number;
    avgReimbursement?: number | null;
    avgQty?: number | null;
    bestDrugName?: string | null;
    bestNdc?: string | null;
  }[];
  pharmacy_stats?: PharmacyStat[];
  total_opportunities?: number;
  total_patients?: number;
  total_margin?: number;
  confidence_distribution?: {
    verified: number;
    likely: number;
    unknown: number;
    excluded: number;
  };
}

type SortField = 'display_name' | 'trigger_type' | 'default_gp_value' | 'is_enabled';

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sort, setSort] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: 'display_name',
    direction: 'asc'
  });
  const [expandedTrigger, setExpandedTrigger] = useState<string | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const [scanningOpps, setScanningOpps] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [saving, setSaving] = useState(false);
  const [rawKeywords, setRawKeywords] = useState<Record<string, string>>({});
  const [scanningTrigger, setScanningTrigger] = useState<string | null>(null);
  const [scanningPharmacy, setScanningPharmacy] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<{ pharmacy_id: string; pharmacy_name: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isNewTrigger, setIsNewTrigger] = useState(false);

  useEffect(() => {
    fetchTriggers();
    fetchPharmacies();
  }, []);

  // Initialize raw text for comma-separated fields when editing a trigger
  useEffect(() => {
    if (editingTrigger) {
      setRawKeywords({
        detection_keywords: editingTrigger.detection_keywords?.join(', ') || '',
        exclude_keywords: editingTrigger.exclude_keywords?.join(', ') || '',
        if_has_keywords: editingTrigger.if_has_keywords?.join(', ') || '',
        if_not_has_keywords: editingTrigger.if_not_has_keywords?.join(', ') || '',
        bin_inclusions: editingTrigger.bin_inclusions?.join(', ') || '',
        bin_exclusions: editingTrigger.bin_exclusions?.join(', ') || '',
        group_inclusions: editingTrigger.group_inclusions?.join(', ') || '',
        group_exclusions: editingTrigger.group_exclusions?.join(', ') || '',
        contract_prefix_exclusions: editingTrigger.contract_prefix_exclusions?.join(', ') || '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTrigger?.trigger_id]);

  async function fetchPharmacies() {
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
    }
  }

  async function fetchTriggers() {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers || []);
      } else {
        console.error('Failed to fetch triggers:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch triggers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function toggleTrigger(triggerId: string, enabled: boolean) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_enabled: enabled }),
      });
      if (res.ok) {
        setTriggers(prev => prev.map(t =>
          t.trigger_id === triggerId ? { ...t, is_enabled: enabled } : t
        ));
      }
    } catch (err) {
      console.error('Failed to toggle trigger:', err);
    }
  }

  async function deleteTrigger(triggerId: string) {
    if (!confirm('Are you sure you want to delete this trigger? This will also delete all unactioned opportunities for this trigger.')) return;
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTriggers(prev => prev.filter(t => t.trigger_id !== triggerId));
        alert(`Deleted "${data.triggerName}" and ${data.opportunitiesRemoved || 0} unactioned opportunities.`);
      } else {
        alert(data.error || 'Failed to delete trigger');
      }
    } catch (err) {
      console.error('Failed to delete trigger:', err);
      alert('Failed to delete trigger - network error');
    }
  }

  function createNewTrigger() {
    setIsNewTrigger(true);
    setEditingTrigger({
      trigger_id: '',
      trigger_code: '',
      display_name: '',
      trigger_type: 'therapeutic_interchange',
      category: null,
      detection_keywords: [],
      exclude_keywords: [],
      if_has_keywords: [],
      if_not_has_keywords: [],
      recommended_drug: null,
      recommended_ndc: null,
      action_instructions: null,
      clinical_rationale: null,
      priority: 'medium',
      annual_fills: 12,
      default_gp_value: null,
      keyword_match_mode: 'any',
      is_enabled: true,
      created_at: new Date().toISOString(),
      bin_inclusions: [],
      bin_exclusions: [],
      group_inclusions: [],
      group_exclusions: [],
      contract_prefix_exclusions: [],
      pharmacy_inclusions: [],
      expected_qty: null,
      expected_days_supply: null,
      bin_values: [],
    });
  }

  async function saveTrigger() {
    if (!editingTrigger) return;
    setSaving(true);
    // Parse comma-separated raw text into arrays
    const parseCSV = (key: string) => (rawKeywords[key] || '').split(',').map(k => k.trim()).filter(Boolean);
    const payload = {
      displayName: editingTrigger.display_name,
      triggerCode: editingTrigger.trigger_code,
      triggerType: editingTrigger.trigger_type,
      category: editingTrigger.category,
      detectionKeywords: parseCSV('detection_keywords'),
      excludeKeywords: parseCSV('exclude_keywords'),
      ifHasKeywords: parseCSV('if_has_keywords'),
      ifNotHasKeywords: parseCSV('if_not_has_keywords'),
      recommendedDrug: editingTrigger.recommended_drug,
      recommendedNdc: editingTrigger.recommended_ndc,
      clinicalRationale: editingTrigger.clinical_rationale,
      actionInstructions: editingTrigger.action_instructions,
      priority: editingTrigger.priority,
      annualFills: editingTrigger.annual_fills,
      defaultGpValue: editingTrigger.default_gp_value,
      keywordMatchMode: editingTrigger.keyword_match_mode || 'any',
      isEnabled: editingTrigger.is_enabled,
      binInclusions: parseCSV('bin_inclusions'),
      binExclusions: parseCSV('bin_exclusions'),
      groupInclusions: parseCSV('group_inclusions'),
      groupExclusions: parseCSV('group_exclusions'),
      contractPrefixExclusions: parseCSV('contract_prefix_exclusions'),
      pharmacyInclusions: editingTrigger.pharmacy_inclusions || [],
      expectedQty: editingTrigger.expected_qty,
      expectedDaysSupply: editingTrigger.expected_days_supply,
    };
    try {
      const token = localStorage.getItem('therxos_token');
      const url = isNewTrigger
        ? `${API_URL}/api/admin/triggers`
        : `${API_URL}/api/admin/triggers/${editingTrigger.trigger_id}`;
      const res = await fetch(url, {
        method: isNewTrigger ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingTrigger(null);
        setIsNewTrigger(false);
        fetchTriggers();
      } else {
        const error = await res.json();
        alert('Failed to save: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to save trigger:', err);
      alert('Failed to save trigger');
    } finally {
      setSaving(false);
    }
  }

  async function scanAllCoverage() {
    setScanningAll(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/verify-all-coverage`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Scan complete!\n\nTriggers scanned: ${data.summary?.totalTriggers || 0}\nWith matches: ${data.summary?.triggersWithMatches || 0}`);
        fetchTriggers(); // Refresh to get updated data
      }
    } catch (err) {
      console.error('Failed to scan coverage:', err);
      alert('Failed to scan coverage');
    } finally {
      setScanningAll(false);
    }
  }

  async function scanAllOpportunities() {
    setScanningOpps(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/scan-all-opportunities`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Opportunity scan complete!\n\nTriggers scanned: ${data.triggersScanned || 0}\nPharmacies scanned: ${data.pharmaciesScanned || 0}\nOpportunities created: ${data.totalCreated || 0}\nDuplicates skipped: ${data.totalSkipped || 0}\nPatients matched: ${data.totalPatientsMatched || 0}`);
        fetchTriggers();
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scan all opportunities:', err);
      alert('Failed to scan all opportunities');
    } finally {
      setScanningOpps(false);
    }
  }

  async function scanTriggerCoverage(triggerId: string) {
    setScanningTrigger(triggerId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}/scan-coverage`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Coverage scan complete!\n\nBIN/Groups found: ${data.binCount || 0}\nMatching prescriptions: ${data.prescriptionCount || 0}`);
        fetchTriggers();
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scan trigger coverage:', err);
      alert('Failed to scan coverage');
    } finally {
      setScanningTrigger(null);
    }
  }

  async function scanAllPharmaciesForTrigger(triggerId: string, triggerName: string) {
    setScanningTrigger(triggerId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Scan complete for "${triggerName}"!\n\nPharmacies scanned: ${data.pharmaciesScanned || 0}\nOpportunities created: ${data.opportunitiesCreated || 0}\nPatients matched: ${data.patientsMatched || 0}`);
        fetchTriggers();
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scan all pharmacies:', err);
      alert('Failed to scan all pharmacies');
    } finally {
      setScanningTrigger(null);
    }
  }

  async function scanPharmacyForTrigger(triggerId: string, pharmacyId: string, pharmacyName: string) {
    setScanningPharmacy(pharmacyId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}/scan-pharmacy/${pharmacyId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Scan complete for ${pharmacyName}!\n\nOpportunities created: ${data.opportunitiesCreated || 0}\nPatients matched: ${data.patientsMatched || 0}`);
        fetchTriggers();
      } else {
        const error = await res.json();
        alert('Scan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scan pharmacy:', err);
      alert('Failed to scan pharmacy');
    } finally {
      setScanningPharmacy(null);
    }
  }

  const filteredTriggers = useMemo(() => {
    let result = [...triggers];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t =>
        t.display_name.toLowerCase().includes(searchLower) ||
        t.trigger_code.toLowerCase().includes(searchLower) ||
        t.detection_keywords?.some(k => k.toLowerCase().includes(searchLower))
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter(t => t.trigger_type === typeFilter);
    }

    // Sort
    const direction = sort.direction === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (sort.field) {
        case 'display_name':
          return (a.display_name || '').localeCompare(b.display_name || '') * direction;
        case 'trigger_type':
          return (a.trigger_type || '').localeCompare(b.trigger_type || '') * direction;
        case 'default_gp_value':
          return ((a.default_gp_value || 0) - (b.default_gp_value || 0)) * direction;
        case 'is_enabled':
          return ((a.is_enabled ? 1 : 0) - (b.is_enabled ? 1 : 0)) * direction;
        default:
          return 0;
      }
    });

    return result;
  }, [triggers, search, typeFilter, sort]);

  const triggerTypes = ['all', 'therapeutic_interchange', 'missing_therapy', 'ndc_optimization', 'brand_to_generic', 'formulation_change', 'combo_therapy'];

  function handleSort(field: SortField) {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Triggers</h1>
            <p className="text-sm text-slate-400">
              {triggers.length} triggers ({triggers.filter(t => t.is_enabled).length} enabled)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={scanAllCoverage}
            disabled={scanningAll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {scanningAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4" />
                Scan All Coverage
              </>
            )}
          </button>
          <button
            onClick={scanAllOpportunities}
            disabled={scanningOpps}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {scanningOpps ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Scan All Opps
              </>
            )}
          </button>
          <button
            onClick={fetchTriggers}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {refreshing ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={createNewTrigger}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Trigger
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search triggers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {triggerTypes.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Triggers Table */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1e3a5f]">
              <th className="w-8 px-4 py-3"></th>
              <th
                className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('display_name')}
              >
                Name {sort.field === 'display_name' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('trigger_type')}
              >
                Type {sort.field === 'trigger_type' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Detection Keywords
              </th>
              <th
                className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('default_gp_value')}
              >
                Default GP {sort.field === 'default_gp_value' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Synced
              </th>
              <th
                className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('is_enabled')}
              >
                Status {sort.field === 'is_enabled' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTriggers.map((trigger) => (
              <>
                <tr key={trigger.trigger_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedTrigger(expandedTrigger === trigger.trigger_id ? null : trigger.trigger_id)}
                      className="p-1 hover:bg-[#1e3a5f] rounded text-slate-400"
                    >
                      {expandedTrigger === trigger.trigger_id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{trigger.display_name}</p>
                    <p className="text-xs text-slate-500 font-mono">{trigger.trigger_code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trigger.trigger_type === 'therapeutic_interchange' ? 'bg-blue-500/20 text-blue-400'
                        : trigger.trigger_type === 'missing_therapy' ? 'bg-purple-500/20 text-purple-400'
                        : trigger.trigger_type === 'ndc_optimization' ? 'bg-amber-500/20 text-amber-400'
                        : trigger.trigger_type === 'brand_to_generic' ? 'bg-green-500/20 text-green-400'
                        : trigger.trigger_type === 'formulation_change' ? 'bg-cyan-500/20 text-cyan-400'
                        : trigger.trigger_type === 'combo_therapy' ? 'bg-pink-500/20 text-pink-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {trigger.trigger_type.replace(/_/g, ' ')}
                    </span>
                    {trigger.pharmacy_inclusions && trigger.pharmacy_inclusions.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded">
                        {trigger.pharmacy_inclusions.length === 1
                          ? pharmacies.find(p => p.pharmacy_id === trigger.pharmacy_inclusions![0])?.pharmacy_name || '1 pharmacy'
                          : `${trigger.pharmacy_inclusions.length} pharmacies`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-48 truncate text-xs text-slate-300">
                      {trigger.detection_keywords?.slice(0, 3).join(', ')}
                      {(trigger.detection_keywords?.length || 0) > 3 && '...'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-emerald-400">
                      {trigger.default_gp_value ? `$${Number(trigger.default_gp_value).toFixed(2)}` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-slate-400">
                      {formatDate(trigger.synced_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleTrigger(trigger.trigger_id, !trigger.is_enabled)}
                      className={`p-1 rounded transition-colors ${
                        trigger.is_enabled
                          ? 'text-emerald-400 hover:bg-emerald-500/20'
                          : 'text-slate-500 hover:bg-slate-500/20'
                      }`}
                    >
                      {trigger.is_enabled ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => scanTriggerCoverage(trigger.trigger_id)}
                        disabled={scanningTrigger === trigger.trigger_id}
                        className="p-1.5 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                        title="Scan Coverage"
                      >
                        {scanningTrigger === trigger.trigger_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ScanLine className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingTrigger(trigger)}
                        className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTrigger(trigger.trigger_id)}
                        className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Expanded Row with Details */}
                {expandedTrigger === trigger.trigger_id && (
                  <tr className="bg-[#0a1628]">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Left Column - Details */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Recommended Drug</h4>
                            <p className="text-sm text-white">{trigger.recommended_drug || 'Not specified'}</p>
                            {trigger.recommended_ndc && (
                              <p className="text-xs text-slate-500 font-mono mt-1">NDC: {trigger.recommended_ndc}</p>
                            )}
                          </div>
                          {trigger.clinical_rationale && (
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Clinical Rationale</h4>
                              <p className="text-sm text-slate-300">{trigger.clinical_rationale}</p>
                            </div>
                          )}
                          {trigger.cms_coverage && (
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">CMS Medicare Coverage</h4>
                              <div className="grid grid-cols-4 gap-2">
                                <div className="bg-[#0d2137] rounded p-2 text-center">
                                  <p className="text-lg font-bold text-blue-400">
                                    {trigger.cms_coverage.average_tier ? `T${trigger.cms_coverage.average_tier}` : '-'}
                                  </p>
                                  <p className="text-xs text-slate-400">Avg Tier</p>
                                </div>
                                <div className="bg-[#0d2137] rounded p-2 text-center">
                                  <p className="text-lg font-bold text-amber-400">{trigger.cms_coverage.prior_auth_rate}%</p>
                                  <p className="text-xs text-slate-400">PA Rate</p>
                                </div>
                                <div className="bg-[#0d2137] rounded p-2 text-center">
                                  <p className="text-lg font-bold text-purple-400">{trigger.cms_coverage.step_therapy_rate}%</p>
                                  <p className="text-xs text-slate-400">ST Rate</p>
                                </div>
                                <div className="bg-[#0d2137] rounded p-2 text-center">
                                  <p className="text-lg font-bold text-cyan-400">{trigger.cms_coverage.quantity_limit_rate}%</p>
                                  <p className="text-xs text-slate-400">QL Rate</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column - BIN Values */}
                        <div>
                          {(() => {
                            const allValid = (trigger.bin_values || [])
                              .filter(bv => !bv.isExcluded && (bv.gpValue || 0) > 0 && !bv.bin?.startsWith('MEDICARE:'));
                            const filtered = allValid
                              .filter(bv => (bv.gpValue || 0) >= 15)
                              .sort((a, b) => (b.gpValue || 0) - (a.gpValue || 0));
                            const hiddenCount = allValid.length - filtered.length;
                            return (
                              <>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                            BIN/Group Coverage ({filtered.length} entries{filtered.length !== (trigger.bin_values?.length || 0) ? ` of ${trigger.bin_values?.length || 0}` : ''})
                          </h4>
                          <div className="max-h-96 overflow-y-auto space-y-1">
                            {filtered.map((bv, idx) => (
                              <div key={idx} className="flex flex-col text-xs bg-[#0d2137] rounded px-3 py-2 gap-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-white">
                                    {bv.bin}{bv.group ? `/${bv.group}` : ''}
                                  </span>
                                  <div className="flex items-center gap-4">
                                    {bv.avgQty && (
                                      <span className="text-slate-400">Qty: {Math.round(bv.avgQty)}</span>
                                    )}
                                    <span className={`${bv.isExcluded ? 'text-red-400' : 'text-emerald-400'}`}>
                                      {bv.isExcluded ? 'Excluded' : bv.gpValue ? `$${Number(bv.gpValue).toFixed(2)}` : 'Works'}
                                    </span>
                                    {bv.coverageStatus === 'verified' && (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    )}
                                  </div>
                                </div>
                                {(bv.bestDrugName || bv.bestNdc) && (
                                  <p className="text-[10px] text-blue-400" title={bv.bestDrugName || ''}>
                                    {bv.bestDrugName}{bv.bestDrugName && bv.bestNdc ? ' ' : ''}{bv.bestNdc && <span className="text-slate-500 font-mono">NDC: {bv.bestNdc}</span>}
                                  </p>
                                )}
                              </div>
                            ))}
                            {hiddenCount > 0 && (
                              <p className="text-[10px] text-slate-500 mt-2 px-1">
                                {hiddenCount} entries hidden (GP below $15.00)
                              </p>
                            )}
                          </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Coverage Confidence Distribution */}
                      {trigger.confidence_distribution && (trigger.confidence_distribution.verified > 0 || trigger.confidence_distribution.likely > 0 || trigger.confidence_distribution.excluded > 0) && (() => {
                        const cd = trigger.confidence_distribution!;
                        const total = cd.verified + cd.likely + cd.unknown + cd.excluded;
                        if (total === 0) return null;
                        return (
                          <div className="mt-4 pt-4 border-t border-[#1e3a5f]">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Coverage Confidence</h4>
                            <div className="flex h-3 rounded-full overflow-hidden bg-slate-700/50 mb-2">
                              {cd.verified > 0 && (
                                <div className="bg-emerald-500" style={{ width: `${(cd.verified / total) * 100}%` }} title={`Verified: ${cd.verified}`} />
                              )}
                              {cd.likely > 0 && (
                                <div className="bg-yellow-500" style={{ width: `${(cd.likely / total) * 100}%` }} title={`Likely: ${cd.likely}`} />
                              )}
                              {cd.unknown > 0 && (
                                <div className="bg-slate-500" style={{ width: `${(cd.unknown / total) * 100}%` }} title={`Unknown: ${cd.unknown}`} />
                              )}
                              {cd.excluded > 0 && (
                                <div className="bg-red-500" style={{ width: `${(cd.excluded / total) * 100}%` }} title={`Excluded: ${cd.excluded}`} />
                              )}
                            </div>
                            <div className="flex gap-4 text-[10px]">
                              <span className="text-emerald-400">Verified: {cd.verified}</span>
                              <span className="text-yellow-400">Likely: {cd.likely}</span>
                              <span className="text-slate-400">Unknown: {cd.unknown}</span>
                              <span className="text-red-400">Excluded: {cd.excluded}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Per-Pharmacy Opportunity Stats */}
                      <div className="mt-4 pt-4 border-t border-[#1e3a5f]">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase">
                            Pharmacy Opportunities ({trigger.total_opportunities || 0} total, {trigger.total_patients || 0} patients, ${((trigger.total_margin || 0) / 1000).toFixed(1)}k margin)
                          </h4>
                          <button
                            onClick={() => scanAllPharmaciesForTrigger(trigger.trigger_id, trigger.display_name)}
                            disabled={scanningTrigger === trigger.trigger_id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {scanningTrigger === trigger.trigger_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Zap className="w-3 h-3" />
                            )}
                            {scanningTrigger === trigger.trigger_id ? 'Scanning...' : 'Scan All Pharmacies'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                          {pharmacies.map((pharmacy) => {
                            const stats = trigger.pharmacy_stats?.find(p => p.pharmacy_id === pharmacy.pharmacy_id);
                            return (
                              <div
                                key={pharmacy.pharmacy_id}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                                  stats && stats.opportunity_count > 0
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : 'bg-[#0d2137] border-[#1e3a5f]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-white truncate">{pharmacy.pharmacy_name}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {stats && stats.opportunity_count > 0 ? (
                                    <>
                                      <span className="text-slate-400">{stats.opportunity_count} opps</span>
                                      <span className="text-slate-500">{stats.patient_count} pts</span>
                                      <span className="text-emerald-400">${(stats.total_margin / 1000).toFixed(1)}k</span>
                                    </>
                                  ) : (
                                    <span className="text-slate-500">0 opps</span>
                                  )}
                                  <button
                                    onClick={() => scanPharmacyForTrigger(trigger.trigger_id, pharmacy.pharmacy_id, pharmacy.pharmacy_name)}
                                    disabled={scanningPharmacy === pharmacy.pharmacy_id}
                                    className="p-1 hover:bg-amber-500/20 rounded text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-50"
                                    title="Scan this pharmacy"
                                  >
                                    {scanningPharmacy === pharmacy.pharmacy_id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Zap className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {pharmacies.length === 0 && (
                            <p className="text-xs text-slate-500 col-span-3">No pharmacies available</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filteredTriggers.length === 0 && (
          <div className="text-center py-8 text-slate-400">No triggers found</div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTrigger && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setEditingTrigger(null); setIsNewTrigger(false); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-[#1e3a5f]">
                <h2 className="text-lg font-semibold text-white">{isNewTrigger ? 'New Trigger' : 'Edit Trigger'}</h2>
                <button onClick={() => { setEditingTrigger(null); setIsNewTrigger(false); }} className="p-1 hover:bg-[#1e3a5f] rounded">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editingTrigger.display_name || ''}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, display_name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Code</label>
                    <input
                      type="text"
                      value={editingTrigger.trigger_code || ''}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, trigger_code: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                    <select
                      value={editingTrigger.trigger_type || ''}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, trigger_type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="therapeutic_interchange">Therapeutic Interchange</option>
                      <option value="missing_therapy">Missing Therapy</option>
                      <option value="ndc_optimization">NDC Optimization</option>
                      <option value="brand_to_generic">Brand to Generic</option>
                      <option value="formulation_change">Formulation Change</option>
                      <option value="combo_therapy">Combo Therapy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                    <select
                      value={editingTrigger.priority || 'medium'}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Default GP / Fill ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingTrigger.default_gp_value || ''}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, default_gp_value: parseFloat(e.target.value) || null })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Annual Fills</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={editingTrigger.annual_fills}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, annual_fills: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="12"
                    />
                  </div>
                </div>

                {/* === FILL NORMALIZATION === */}
                <div className="border border-[#1e3a5f]/50 rounded-lg p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Fill Normalization</p>
                  <p className="text-[10px] text-slate-600">Set these when the standard 30-day normalization is inaccurate (e.g. test strips, cream tubes, pen needles). The scanner uses these to calculate a more accurate GP per 30 days.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Expected quantity per fill (e.g. 100 for test strips, 112 for diclofenac cream tube)">
                        Expected Qty / Fill
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={editingTrigger.expected_qty ?? ''}
                        onChange={(e) => setEditingTrigger({ ...editingTrigger, expected_qty: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Expected days supply per fill (e.g. 25 for test strips, 30 for cream tubes)">
                        Expected Days Supply
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={editingTrigger.expected_days_supply ?? ''}
                        onChange={(e) => setEditingTrigger({ ...editingTrigger, expected_days_supply: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 30"
                      />
                    </div>
                  </div>
                </div>

                {/* === DRUG NAME MATCHING === */}
                <div className="border border-[#1e3a5f]/50 rounded-lg p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Drug Name Matching</p>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-400" title="Keywords matched against the drug name on the prescription. Use ANY to match if the drug contains at least one keyword, or ALL to require every keyword is present.">
                        Detection Keywords
                        <span className="ml-1 text-[10px] text-slate-600">(matched against drug name on Rx)</span>
                      </label>
                      <div className="flex items-center gap-1 bg-[#0a1628] border border-[#1e3a5f] rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setEditingTrigger({ ...editingTrigger, keyword_match_mode: 'any' })}
                          className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            (editingTrigger.keyword_match_mode || 'any') === 'any'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Drug matches if it contains ANY one of these keywords"
                        >
                          ANY
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTrigger({ ...editingTrigger, keyword_match_mode: 'all' })}
                          className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            editingTrigger.keyword_match_mode === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Drug matches only if it contains ALL of these keywords"
                        >
                          ALL
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={rawKeywords.detection_keywords || ''}
                      onChange={(e) => setRawKeywords({ ...rawKeywords, detection_keywords: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder={editingTrigger.keyword_match_mode === 'all' ? 'e.g. losartan, hctz - drug must contain BOTH' : 'e.g. abilify, aripiprazole - drug can match EITHER'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1" title="If the drug name contains any of these keywords, skip it even if detection keywords matched.">
                      Exclude Keywords
                      <span className="ml-1 text-[10px] text-slate-600">(skip drug if name contains these)</span>
                    </label>
                    <input
                      type="text"
                      value={rawKeywords.exclude_keywords || ''}
                      onChange={(e) => setRawKeywords({ ...rawKeywords, exclude_keywords: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. ODT, cream - ignore these formulations"
                    />
                  </div>
                </div>

                {/* === PATIENT PROFILE CONDITIONS === */}
                <div className="border border-[#1e3a5f]/50 rounded-lg p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Patient Profile Conditions</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Check the patient's OTHER medications. Only create opportunity if the patient is also taking one of these drugs.">
                        Patient Must Also Take
                        <span className="ml-1 text-[10px] text-slate-600">(checks other Rx)</span>
                      </label>
                      <input
                        type="text"
                        value={rawKeywords.if_has_keywords || ''}
                        onChange={(e) => setRawKeywords({ ...rawKeywords, if_has_keywords: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. metformin, insulin"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Check the patient's OTHER medications. Skip this patient if they are already taking one of these drugs.">
                        Skip If Patient Takes
                        <span className="ml-1 text-[10px] text-slate-600">(checks other Rx)</span>
                      </label>
                      <input
                        type="text"
                        value={rawKeywords.if_not_has_keywords || ''}
                        onChange={(e) => setRawKeywords({ ...rawKeywords, if_not_has_keywords: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. rosuvastatin - already on therapy"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Recommended Drug</label>
                    <input
                      type="text"
                      value={editingTrigger.recommended_drug || ''}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, recommended_drug: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Recommended NDC</label>
                    <input
                      type="text"
                      value={editingTrigger.recommended_ndc || ''}
                      onChange={(e) => setEditingTrigger({ ...editingTrigger, recommended_ndc: e.target.value })}
                      placeholder="Auto-set by best coverage scan"
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Clinical Rationale</label>
                  <textarea
                    value={editingTrigger.clinical_rationale || ''}
                    onChange={(e) => setEditingTrigger({ ...editingTrigger, clinical_rationale: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* === INSURANCE FILTERS === */}
                <div className="border border-[#1e3a5f]/50 rounded-lg p-3 space-y-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Insurance Filters</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Only create opportunities for patients on these BINs. Leave empty to include all BINs.">
                        BIN Inclusions
                        <span className="ml-1 text-[10px] text-slate-600">(only these)</span>
                      </label>
                      <input
                        type="text"
                        value={rawKeywords.bin_inclusions || ''}
                        onChange={(e) => setRawKeywords({ ...rawKeywords, bin_inclusions: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 610502 - only this BIN"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Never create opportunities for patients on these BINs.">
                        BIN Exclusions
                        <span className="ml-1 text-[10px] text-slate-600">(never these)</span>
                      </label>
                      <input
                        type="text"
                        value={rawKeywords.bin_exclusions || ''}
                        onChange={(e) => setRawKeywords({ ...rawKeywords, bin_exclusions: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 014798 - skip this BIN"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Only create opportunities for patients in these insurance groups. Leave empty to include all groups.">
                        Group Inclusions
                        <span className="ml-1 text-[10px] text-slate-600">(only these)</span>
                      </label>
                      <input
                        type="text"
                        value={rawKeywords.group_inclusions || ''}
                        onChange={(e) => setRawKeywords({ ...rawKeywords, group_inclusions: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. MPDCSP - only this group"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1" title="Never create opportunities for patients in these insurance groups.">
                        Group Exclusions
                        <span className="ml-1 text-[10px] text-slate-600">(never these)</span>
                      </label>
                      <input
                        type="text"
                        value={rawKeywords.group_exclusions || ''}
                        onChange={(e) => setRawKeywords({ ...rawKeywords, group_exclusions: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. RX1234 - skip this group"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Contract Prefix Exclusions (comma-separated)</label>
                  <input
                    type="text"
                    value={rawKeywords.contract_prefix_exclusions || ''}
                    onChange={(e) => setRawKeywords({ ...rawKeywords, contract_prefix_exclusions: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., S, H, R"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Pharmacy Scope {(!editingTrigger.pharmacy_inclusions || editingTrigger.pharmacy_inclusions.length === 0) ? '(All pharmacies)' : `(${editingTrigger.pharmacy_inclusions.length} selected)`}
                  </label>
                  <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-2 max-h-32 overflow-y-auto">
                    <label className="flex items-center gap-2 px-2 py-1 hover:bg-[#1e3a5f]/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!editingTrigger.pharmacy_inclusions || editingTrigger.pharmacy_inclusions.length === 0}
                        onChange={() => setEditingTrigger({ ...editingTrigger, pharmacy_inclusions: [] })}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-slate-300">All pharmacies</span>
                    </label>
                    {pharmacies.map(p => (
                      <label key={p.pharmacy_id} className="flex items-center gap-2 px-2 py-1 hover:bg-[#1e3a5f]/50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(editingTrigger.pharmacy_inclusions || []).includes(p.pharmacy_id)}
                          onChange={(e) => {
                            const current = editingTrigger.pharmacy_inclusions || [];
                            const updated = e.target.checked
                              ? [...current, p.pharmacy_id]
                              : current.filter(id => id !== p.pharmacy_id);
                            setEditingTrigger({ ...editingTrigger, pharmacy_inclusions: updated });
                          }}
                          className="accent-blue-500"
                        />
                        <span className="text-sm text-white">{p.pharmacy_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-400">Enabled</label>
                  <button
                    type="button"
                    onClick={() => setEditingTrigger({ ...editingTrigger, is_enabled: !editingTrigger.is_enabled })}
                    className={`p-1 rounded transition-colors ${
                      editingTrigger.is_enabled
                        ? 'text-emerald-400 hover:bg-emerald-500/20'
                        : 'text-slate-500 hover:bg-slate-500/20'
                    }`}
                  >
                    {editingTrigger.is_enabled ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-[#1e3a5f]">
                <button
                  onClick={() => { setEditingTrigger(null); setIsNewTrigger(false); }}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTrigger}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : isNewTrigger ? 'Create Trigger' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
