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
  Crosshair,
  Shield,
  Plus,
  Pencil,
  Copy,
  ToggleLeft,
  ToggleRight,
  X,
  ScanLine,
  Loader2,
  FileDown,
  Send,
  CreditCard,
  Beaker,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Pharmacy {
  pharmacy_id: string;
  client_id: string;
  pharmacy_name: string;
  client_name: string;
  submitter_email: string;
  state: string;
  status: 'onboarding' | 'active' | 'suspended';
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
  pending_quality_issues?: number;
  blocked_margin?: number;
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
  is_enabled: boolean;
  created_at: string;
  bin_restrictions: string[] | null;
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
  }[];
}

interface BinValue {
  id?: string;
  bin: string;
  group: string | null;
  gpValue: number | null;
  isExcluded: boolean;
  coverageStatus: 'works' | 'excluded' | 'verified' | 'unknown';
  verifiedAt?: string | null;
  verifiedClaimCount?: number;
  avgReimbursement?: number | null;
  avgQty?: number | null;
}

interface DiscoveredBin {
  bin: string;
  claim_count: number;
  patient_count: number;
  pharmacy_count: number;
  avg_reimbursement: number;
}

interface DiscoveredGroup {
  group: string;
  claim_count: number;
  patient_count: number;
  avg_reimbursement: number;
}

interface AuditRule {
  rule_id: string;
  rule_code: string;
  rule_name: string;
  rule_description: string | null;
  rule_type: 'quantity_mismatch' | 'days_supply_mismatch' | 'daw_violation' | 'sig_quantity_mismatch' | 'high_gp_risk';
  drug_keywords: string[] | null;
  ndc_pattern: string | null;
  expected_quantity: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  quantity_tolerance: number;
  min_days_supply: number | null;
  max_days_supply: number | null;
  allowed_daw_codes: string[] | null;
  has_generic_available: boolean | null;
  gp_threshold: number;
  severity: 'critical' | 'warning' | 'info';
  audit_risk_score: number | null;
  is_enabled: boolean;
  created_at: string;
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

  // Trigger Management
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [showTriggers, setShowTriggers] = useState(false);
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [triggerSort, setTriggerSort] = useState<{ field: 'display_name' | 'trigger_type' | 'default_gp_value' | 'is_enabled'; direction: 'asc' | 'desc' }>({ field: 'display_name', direction: 'asc' });
  const [triggerSearch, setTriggerSearch] = useState('');
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [savingTrigger, setSavingTrigger] = useState(false);
  const [scanningTrigger, setScanningTrigger] = useState<string | null>(null);
  const [triggerScanResult, setTriggerScanResult] = useState<any>(null);

  // Scan Modal
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanModalTrigger, setScanModalTrigger] = useState<{ id: string; code: string } | null>(null);
  const [selectedScanPharmacies, setSelectedScanPharmacies] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; results: any[] } | null>(null);

  // Audit Rules
  const [auditRules, setAuditRules] = useState<AuditRule[]>([]);
  const [showAuditRules, setShowAuditRules] = useState(true);
  const [editingAuditRule, setEditingAuditRule] = useState<AuditRule | null>(null);
  const [auditRuleModalOpen, setAuditRuleModalOpen] = useState(false);
  const [savingAuditRule, setSavingAuditRule] = useState(false);

  // Rescan
  const [rescanning, setRescanning] = useState<string | null>(null);
  const [rescanResult, setRescanResult] = useState<any>(null);

  // Bulk Coverage Scan
  const [bulkCoverageScanning, setBulkCoverageScanning] = useState(false);
  const [bulkCoverageResult, setBulkCoverageResult] = useState<{
    summary: { totalTriggers: number; triggersWithMatches: number; triggersWithNoMatches: number; minMarginUsed: number; dmeMinMarginUsed: number };
    results: { triggerId: string; triggerName: string; triggerType: string; verifiedCount: number; topBins: { bin: string; group: string; bestDrug: string; avgMargin: string }[] }[];
    noMatches: { triggerId: string; triggerName: string; reason: string }[];
  } | null>(null);

  // New Client Modal
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientResult, setNewClientResult] = useState<{
    success: boolean;
    pharmacy?: { pharmacyId: string; pharmacyName: string };
    credentials?: { email: string; temporaryPassword: string };
    error?: string;
  } | null>(null);
  const [newClientForm, setNewClientForm] = useState({
    clientName: '',
    pharmacyName: '',
    pharmacyNpi: '',
    pharmacyNcpdp: '',
    pharmacyState: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    pmsSystem: '',
  });

  // Onboarding actions state
  const [sendingWelcomeEmail, setSendingWelcomeEmail] = useState<string | null>(null);
  const [downloadingDocs, setDownloadingDocs] = useState<string | null>(null);
  const [creatingCheckout, setCreatingCheckout] = useState<string | null>(null);
  const [emailingDocs, setEmailingDocs] = useState<string | null>(null);

  // Edit modal state
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [editForm, setEditForm] = useState({
    pharmacyName: '',
    clientName: '',
    email: '',
    state: '',
    address: '',
    city: '',
    zip: '',
    phone: '',
    npi: '',
    status: 'active' as 'onboarding' | 'active' | 'suspended' | 'demo',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Test email modal state
  const [testEmailModal, setTestEmailModal] = useState<{ clientId: string; pharmacyName: string } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

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

      // Fetch triggers and audit rules
      fetchTriggers();
      fetchAuditRules();
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createClient() {
    if (!newClientForm.clientName || !newClientForm.adminEmail) {
      alert('Client name and admin email are required');
      return;
    }

    setCreatingClient(true);
    setNewClientResult(null);

    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClientForm),
      });

      const data = await res.json();

      if (res.ok) {
        setNewClientResult({
          success: true,
          pharmacy: data.pharmacy,
          credentials: data.credentials,
        });
        // Refresh the pharmacies list
        fetchData();
      } else {
        setNewClientResult({
          success: false,
          error: data.error || 'Failed to create client',
        });
      }
    } catch (err) {
      setNewClientResult({
        success: false,
        error: 'Network error - please try again',
      });
    } finally {
      setCreatingClient(false);
    }
  }

  function resetNewClientForm() {
    setNewClientForm({
      clientName: '',
      pharmacyName: '',
      pharmacyNpi: '',
      pharmacyNcpdp: '',
      pharmacyState: '',
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      pmsSystem: '',
    });
    setNewClientResult(null);
    setNewClientModalOpen(false);
  }

  async function fetchDidntWorkQueue() {
    try {
      const token = localStorage.getItem('therxos_token');
      console.log('[DW Queue] Fetching with token:', token ? token.substring(0, 20) + '...' : 'MISSING');
      const res = await fetch(`${API_URL}/api/admin/didnt-work-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[DW Queue] Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('[DW Queue] Got', data.opportunities?.length || 0, 'items');
        setDidntWorkQueue(data.opportunities || []);
      } else {
        const error = await res.json().catch(() => ({}));
        console.error('[DW Queue] Error response:', res.status, error);
      }
    } catch (err) {
      console.error('[DW Queue] Fetch failed:', err);
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

  async function fetchTriggers() {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers || []);
      }
    } catch (err) {
      console.error('Failed to fetch triggers:', err);
    }
  }

  async function toggleTrigger(triggerId: string, enabled: boolean) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_enabled: enabled }),
      });
      if (res.ok) {
        setTriggers(triggers.map(t =>
          t.trigger_id === triggerId ? { ...t, is_enabled: enabled } : t
        ));
      }
    } catch (err) {
      console.error('Failed to toggle trigger:', err);
    }
  }

  async function saveTrigger(trigger: Partial<Trigger>) {
    setSavingTrigger(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const isNew = !trigger.trigger_id;
      const url = isNew
        ? `${API_URL}/api/admin/triggers`
        : `${API_URL}/api/admin/triggers/${trigger.trigger_id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trigger),
      });

      if (res.ok) {
        fetchTriggers();
        setTriggerModalOpen(false);
        setEditingTrigger(null);
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to save trigger:', err);
      alert('Failed to save trigger');
    } finally {
      setSavingTrigger(false);
    }
  }

  async function deleteTrigger(triggerId: string) {
    if (!confirm('Are you sure you want to delete this trigger?')) return;
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${triggerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTriggers(triggers.filter(t => t.trigger_id !== triggerId));
      }
    } catch (err) {
      console.error('Failed to delete trigger:', err);
    }
  }

  async function bulkVerifyAllCoverage() {
    setBulkCoverageScanning(true);
    setBulkCoverageResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/verify-all-coverage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ minClaims: 1, daysBack: 365, minMargin: 10, dmeMinMargin: 3 }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkCoverageResult(data);
        // Refresh triggers to get updated BIN values
        fetchTriggers();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Failed to scan coverage'));
      }
    } catch (err) {
      console.error('Failed to bulk verify coverage:', err);
      alert('Failed to scan coverage');
    } finally {
      setBulkCoverageScanning(false);
    }
  }

  // Open scan modal for a trigger
  function openScanModal(triggerId: string, triggerCode: string) {
    setScanModalTrigger({ id: triggerId, code: triggerCode });
    setSelectedScanPharmacies([]);
    setScanProgress(null);
    setScanModalOpen(true);
  }

  // Filter out demo/Hero pharmacy for scans
  const scanEligiblePharmacies = pharmacies.filter(p =>
    !p.pharmacy_name?.toLowerCase().includes('hero')
  );

  // Run scan for selected pharmacies
  async function runTriggerScan() {
    if (!scanModalTrigger || selectedScanPharmacies.length === 0) return;

    const pharmaciesToScan = selectedScanPharmacies.includes('all')
      ? scanEligiblePharmacies
      : scanEligiblePharmacies.filter(p => selectedScanPharmacies.includes(p.pharmacy_id));

    setScanProgress({ current: 0, total: pharmaciesToScan.length, results: [] });
    setScanningTrigger(scanModalTrigger.id);

    const token = localStorage.getItem('therxos_token');
    const results: any[] = [];

    for (let i = 0; i < pharmaciesToScan.length; i++) {
      const pharmacy = pharmaciesToScan[i];
      try {
        const res = await fetch(`${API_URL}/api/admin/triggers/${scanModalTrigger.id}/scan`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pharmacyId: pharmacy.pharmacy_id }),
        });

        if (res.ok) {
          const data = await res.json();
          results.push({
            pharmacy: pharmacy.pharmacy_name,
            success: true,
            newOpportunities: data.totalNewOpportunities || 0,
            skipped: data.totalSkipped || 0,
          });
        } else {
          const error = await res.json();
          results.push({
            pharmacy: pharmacy.pharmacy_name,
            success: false,
            error: error.error || 'Unknown error',
          });
        }
      } catch (err) {
        results.push({
          pharmacy: pharmacy.pharmacy_name,
          success: false,
          error: 'Network error',
        });
      }

      setScanProgress({ current: i + 1, total: pharmaciesToScan.length, results: [...results] });
    }

    setScanningTrigger(null);
  }

  // Toggle pharmacy selection for scan
  function toggleScanPharmacy(pharmacyId: string) {
    if (pharmacyId === 'all') {
      setSelectedScanPharmacies(prev => prev.includes('all') ? [] : ['all']);
    } else {
      setSelectedScanPharmacies(prev => {
        const filtered = prev.filter(id => id !== 'all');
        return filtered.includes(pharmacyId)
          ? filtered.filter(id => id !== pharmacyId)
          : [...filtered, pharmacyId];
      });
    }
  }

  async function fetchAuditRules() {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditRules(data.rules || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit rules:', err);
    }
  }

  async function toggleAuditRule(ruleId: string, enabled: boolean) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_enabled: enabled }),
      });
      if (res.ok) {
        setAuditRules(auditRules.map(r =>
          r.rule_id === ruleId ? { ...r, is_enabled: enabled } : r
        ));
      }
    } catch (err) {
      console.error('Failed to toggle audit rule:', err);
    }
  }

  async function saveAuditRule(rule: Partial<AuditRule>) {
    setSavingAuditRule(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const isNew = !rule.rule_id;
      const url = isNew
        ? `${API_URL}/api/admin/audit-rules`
        : `${API_URL}/api/admin/audit-rules/${rule.rule_id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rule),
      });

      if (res.ok) {
        fetchAuditRules();
        setAuditRuleModalOpen(false);
        setEditingAuditRule(null);
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to save audit rule:', err);
      alert('Failed to save audit rule');
    } finally {
      setSavingAuditRule(false);
    }
  }

  async function deleteAuditRule(ruleId: string) {
    if (!confirm('Are you sure you want to delete this audit rule?')) return;
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/audit-rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuditRules(auditRules.filter(r => r.rule_id !== ruleId));
      }
    } catch (err) {
      console.error('Failed to delete audit rule:', err);
    }
  }

  const filteredTriggers = triggers
    .filter(t => triggerFilter === 'all' || t.trigger_type === triggerFilter)
    .filter(t => !triggerSearch ||
      t.display_name.toLowerCase().includes(triggerSearch.toLowerCase()) ||
      t.trigger_code.toLowerCase().includes(triggerSearch.toLowerCase()) ||
      (t.detection_keywords || []).some(k => k.toLowerCase().includes(triggerSearch.toLowerCase()))
    )
    .sort((a, b) => {
      const field = triggerSort.field;
      const direction = triggerSort.direction === 'asc' ? 1 : -1;
      if (field === 'display_name' || field === 'trigger_type') {
        return (a[field] || '').localeCompare(b[field] || '') * direction;
      }
      if (field === 'default_gp_value') {
        return ((a.default_gp_value || 0) - (b.default_gp_value || 0)) * direction;
      }
      if (field === 'is_enabled') {
        return ((a.is_enabled ? 1 : 0) - (b.is_enabled ? 1 : 0)) * direction;
      }
      return 0;
    });

  async function rescanPharmacy(pharmacyId: string, scanType: 'all' | 'opportunities' | 'audit' = 'all') {
    setRescanning(pharmacyId);
    setRescanResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies/${pharmacyId}/rescan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scanType }),
      });

      if (res.ok) {
        const data = await res.json();
        setRescanResult(data);
        // Refresh the pharmacy data
        fetchData();
      } else {
        const error = await res.json();
        alert('Rescan failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to rescan pharmacy:', err);
      alert('Failed to rescan pharmacy');
    } finally {
      setRescanning(null);
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

        // Manually persist auth state to avoid race condition with Zustand persist
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

  async function updateClientStatus(clientId: string, newStatus: 'onboarding' | 'active' | 'suspended', pharmacyName: string) {
    if (!confirm(`Are you sure you want to change ${pharmacyName} status to "${newStatus}"?`)) return;

    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients/${clientId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update local state
        setPharmacies(prev => prev.map(p =>
          p.client_id === clientId ? { ...p, status: newStatus } : p
        ));
        alert(`${pharmacyName} has been ${newStatus === 'active' ? 'activated' : 'updated to ' + newStatus}!`);
      } else {
        const error = await res.json();
        alert('Failed to update status: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Failed to update client status');
    }
  }

  async function sendWelcomeEmail(clientId: string, pharmacyName: string, resetPassword = false) {
    if (!confirm(`Send welcome email to ${pharmacyName}?${resetPassword ? ' This will reset their password.' : ''}`)) return;

    setSendingWelcomeEmail(clientId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients/${clientId}/send-welcome-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ includeDocuments: true, resetPassword }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Welcome email sent to ${pharmacyName}!`);
      } else if (data.tempPassword) {
        // Email failed but we have temp password
        alert(`Email failed, but here's the temp password: ${data.tempPassword}\n\nPlease send manually.`);
        navigator.clipboard.writeText(data.tempPassword);
      } else {
        alert('Failed to send email: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Send email failed:', err);
      alert('Failed to send welcome email');
    } finally {
      setSendingWelcomeEmail(null);
    }
  }

  async function sendTestEmail() {
    if (!testEmailModal || !testEmailAddress) return;

    setSendingTestEmail(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients/${testEmailModal.clientId}/send-welcome-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeDocuments: true,
          resetPassword: false,
          testEmail: testEmailAddress,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Test email sent to ${testEmailAddress}!\n\nThis is a preview of what ${testEmailModal.pharmacyName} will receive.`);
        setTestEmailModal(null);
        setTestEmailAddress('');
      } else if (data.isTest && data.preview) {
        // Email transport not configured - show preview info
        const preview = data.preview;
        alert(
          `Email Preview (transport not configured)\n\n` +
          `To: ${preview.to}\n` +
          `Subject: ${preview.subject}\n` +
          `Pharmacy: ${preview.pharmacyName}\n` +
          `Password: ${preview.tempPassword}\n` +
          `Documents: ${preview.hasDocuments ? 'BAA + Service Agreement attached' : 'None'}\n\n` +
          `Note: Configure GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET or SMTP settings in Railway to enable actual email sending.`
        );
        setTestEmailModal(null);
        setTestEmailAddress('');
      } else {
        alert('Failed to send test email: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Send test email failed:', err);
      alert('Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  }

  async function downloadOnboardingDocs(clientId: string, pharmacyName: string) {
    setDownloadingDocs(clientId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients/${clientId}/generate-documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.success && data.documents) {
        // Download BAA
        const baaBlob = new Blob([Uint8Array.from(atob(data.documents.baa.base64), c => c.charCodeAt(0))], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const baaUrl = URL.createObjectURL(baaBlob);
        const baaLink = document.createElement('a');
        baaLink.href = baaUrl;
        baaLink.download = data.documents.baa.filename;
        baaLink.click();
        URL.revokeObjectURL(baaUrl);

        // Download Service Agreement
        setTimeout(() => {
          const saBlob = new Blob([Uint8Array.from(atob(data.documents.serviceAgreement.base64), c => c.charCodeAt(0))], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
          const saUrl = URL.createObjectURL(saBlob);
          const saLink = document.createElement('a');
          saLink.href = saUrl;
          saLink.download = data.documents.serviceAgreement.filename;
          saLink.click();
          URL.revokeObjectURL(saUrl);
        }, 500);

        alert(`Downloaded BAA and Service Agreement for ${pharmacyName}`);
      } else {
        alert('Failed to generate documents: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Download docs failed:', err);
      alert('Failed to download documents');
    } finally {
      setDownloadingDocs(null);
    }
  }

  async function createStripeCheckout(clientId: string, pharmacyName: string) {
    setCreatingCheckout(clientId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients/${clientId}/create-checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.success && data.checkoutUrl) {
        // Copy to clipboard and offer to open
        navigator.clipboard.writeText(data.checkoutUrl);
        if (confirm(`Stripe checkout link copied to clipboard!\n\nOpen in new tab?`)) {
          window.open(data.checkoutUrl, '_blank');
        }
      } else {
        alert('Failed to create checkout: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Create checkout failed:', err);
      alert('Failed to create Stripe checkout');
    } finally {
      setCreatingCheckout(null);
    }
  }

  async function emailDocuments(clientId: string, pharmacyName: string) {
    if (!confirm(`Email BAA and Service Agreement to ${pharmacyName}?`)) return;

    setEmailingDocs(clientId);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients/${clientId}/email-documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.success) {
        alert(`Documents emailed to ${pharmacyName}!`);
      } else if (data.documents) {
        // Email failed but we have docs - offer download
        alert('Email not configured. Downloading documents instead...');
        // Download the docs
        const baaBlob = new Blob([Uint8Array.from(atob(data.documents.baa.base64), c => c.charCodeAt(0))]);
        const baaUrl = URL.createObjectURL(baaBlob);
        const baaLink = document.createElement('a');
        baaLink.href = baaUrl;
        baaLink.download = data.documents.baa.filename;
        baaLink.click();
      } else {
        alert('Failed to email documents: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Email docs failed:', err);
      alert('Failed to email documents');
    } finally {
      setEmailingDocs(null);
    }
  }

  function openEditModal(pharmacy: Pharmacy) {
    setEditForm({
      pharmacyName: pharmacy.pharmacy_name || '',
      clientName: pharmacy.client_name || '',
      email: pharmacy.submitter_email || '',
      state: pharmacy.state || '',
      address: '',
      city: '',
      zip: '',
      phone: '',
      npi: '',
      status: pharmacy.status || 'active',
    });
    setEditingPharmacy(pharmacy);
  }

  async function saveEdit() {
    if (!editingPharmacy) return;

    setSavingEdit(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/clients/${editingPharmacy.client_id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();

      if (data.success) {
        // Update local state
        setPharmacies(prev => prev.map(p =>
          p.client_id === editingPharmacy.client_id
            ? {
                ...p,
                pharmacy_name: editForm.pharmacyName || p.pharmacy_name,
                client_name: editForm.clientName || p.client_name,
                submitter_email: editForm.email || p.submitter_email,
                state: editForm.state || p.state,
                status: editForm.status || p.status,
              }
            : p
        ));
        setEditingPharmacy(null);
        alert('Client updated successfully!');
      } else {
        alert('Failed to update: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Save edit failed:', err);
      alert('Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  const filteredPharmacies = pharmacies.filter(p =>
    p.pharmacy_name.toLowerCase().includes(search.toLowerCase()) ||
    p.client_name.toLowerCase().includes(search.toLowerCase()) ||
    p.submitter_email.toLowerCase().includes(search.toLowerCase())
  );

  // Split into live and demo/test pharmacies
  const livePharmacies = filteredPharmacies.filter(p => p.status !== 'demo');
  const demoPharmacies = filteredPharmacies.filter(p => p.status === 'demo');

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

          <div className="flex items-center gap-3">
            {/* Expand/Collapse All */}
            <button
              onClick={() => {
                setShowDidntWorkQueue(true);
                setShowTriggers(true);
                setShowAuditRules(true);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d2137] border border-[#1e3a5f] hover:bg-[#1e3a5f] transition-colors text-sm text-slate-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
              Expand All
            </button>
            <button
              onClick={() => {
                setShowDidntWorkQueue(false);
                setShowTriggers(false);
                setShowAuditRules(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d2137] border border-[#1e3a5f] hover:bg-[#1e3a5f] transition-colors text-sm text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
              Collapse All
            </button>

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

        {/* Data Quality Issues Card */}
        {(stats?.pending_quality_issues ?? 0) > 0 && (
          <div className="bg-[#0d2137] border border-amber-500/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
              <AlertCircle className="w-4 h-4" />
              Data Quality
            </div>
            <p className="text-2xl font-bold text-amber-400">{(stats?.pending_quality_issues || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-300">{formatCurrency(stats?.blocked_margin || 0)} blocked</p>
          </div>
        )}
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
      {/* Didn't Work Queue - always show */ true && (
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
              {didntWorkQueue.length === 0 && (
                <div className="text-center py-8 text-slate-400">No items in queue. Check console for fetch status.</div>
              )}
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

      {/* Trigger Management Section */}
      <div className="bg-[#0d2137] border border-teal-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Trigger Management</h2>
              <p className="text-sm text-slate-400">
                {triggers.length} triggers ({triggers.filter(t => t.is_enabled).length} enabled)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search triggers..."
                value={triggerSearch}
                onChange={(e) => setTriggerSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-48 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Types</option>
              <option value="therapeutic_interchange">Therapeutic Interchange</option>
              <option value="missing_therapy">Missing Therapy</option>
              <option value="ndc_optimization">NDC Optimization</option>
              <option value="brand_to_generic">Brand to Generic</option>
              <option value="formulation_change">Formulation Change</option>
              <option value="combo_therapy">Combo Therapy</option>
            </select>
            <button
              onClick={bulkVerifyAllCoverage}
              disabled={bulkCoverageScanning}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {bulkCoverageScanning ? (
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
              onClick={() => {
                setEditingTrigger(null);
                setTriggerModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Trigger
            </button>
            <button
              onClick={() => setShowTriggers(!showTriggers)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {showTriggers ? 'Hide' : 'Show'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showTriggers ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bulk Coverage Scan Results */}
        {bulkCoverageResult && (
          <div className="mb-4 p-4 bg-[#0a1628] border border-[#1e3a5f] rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Coverage Scan Results</h3>
              <button
                onClick={() => setBulkCoverageResult(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{bulkCoverageResult.summary.totalTriggers}</p>
                <p className="text-xs text-slate-400">Total Triggers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{bulkCoverageResult.summary.triggersWithMatches}</p>
                <p className="text-xs text-slate-400">With Matches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{bulkCoverageResult.summary.triggersWithNoMatches}</p>
                <p className="text-xs text-slate-400">No Matches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-300">${bulkCoverageResult.summary.minMarginUsed}</p>
                <p className="text-xs text-slate-400">Min Margin (Rx)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-300">${bulkCoverageResult.summary.dmeMinMarginUsed}</p>
                <p className="text-xs text-slate-400">Min Margin (DME)</p>
              </div>
            </div>

            {/* DME/NDC Optimization Results - Show best products found */}
            {bulkCoverageResult.results.filter(r => r.triggerType === 'ndc_optimization').length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
                  DME Best Products Found Per BIN/Group
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {bulkCoverageResult.results.filter(r => r.triggerType === 'ndc_optimization').map((r) => (
                    <div key={r.triggerId} className="p-2 bg-teal-500/10 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{r.triggerName}</span>
                        <span className="text-xs text-teal-400">{r.verifiedCount} BIN/Groups</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {r.topBins.map((b, i) => (
                          <div key={i} className="bg-[#0d2137] p-1.5 rounded">
                            <div className="text-slate-400">{b.bin}/{b.group || 'ALL'}</div>
                            <div className="text-green-400 font-medium">${b.avgMargin}</div>
                            <div className="text-white truncate" title={b.bestDrug}>{b.bestDrug}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkCoverageResult.noMatches.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                  Triggers Without Matches (may need review)
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {bulkCoverageResult.noMatches.map((nm) => (
                    <div key={nm.triggerId} className="flex items-center justify-between text-sm py-1 px-2 bg-red-500/10 rounded">
                      <span className="text-white">{nm.triggerName}</span>
                      <span className="text-xs text-slate-400">{nm.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showTriggers && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e3a5f]">
                  <th
                    className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                    onClick={() => setTriggerSort({ field: 'display_name', direction: triggerSort.field === 'display_name' && triggerSort.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    Name {triggerSort.field === 'display_name' && (triggerSort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                    onClick={() => setTriggerSort({ field: 'trigger_type', direction: triggerSort.field === 'trigger_type' && triggerSort.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    Type {triggerSort.field === 'trigger_type' && (triggerSort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Detection</th>
                  <th
                    className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                    onClick={() => setTriggerSort({ field: 'default_gp_value', direction: triggerSort.field === 'default_gp_value' && triggerSort.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    Default GP {triggerSort.field === 'default_gp_value' && (triggerSort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">BINs</th>
                  <th
                    className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-white"
                    onClick={() => setTriggerSort({ field: 'is_enabled', direction: triggerSort.field === 'is_enabled' && triggerSort.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    Status {triggerSort.field === 'is_enabled' && (triggerSort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTriggers.map((trigger) => (
                  <tr key={trigger.trigger_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
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
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-48 truncate text-xs text-slate-300">
                        {trigger.detection_keywords?.slice(0, 3).join(', ')}
                        {(trigger.detection_keywords?.length || 0) > 3 && '...'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-emerald-400">
                        {trigger.default_gp_value ? `$${trigger.default_gp_value}` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-400">
                        {trigger.bin_values?.length || 0}
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
                          onClick={() => {
                            setEditingTrigger(trigger);
                            setTriggerModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const copy = { ...trigger, trigger_id: '', trigger_code: trigger.trigger_code + '_copy' };
                            setEditingTrigger(copy as Trigger);
                            setTriggerModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openScanModal(trigger.trigger_id, trigger.trigger_code)}
                          disabled={scanningTrigger === trigger.trigger_id}
                          className="p-1.5 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                          title="Scan for this trigger"
                        >
                          {scanningTrigger === trigger.trigger_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ScanLine className="w-4 h-4" />
                          )}
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
                ))}
              </tbody>
            </table>
            {filteredTriggers.length === 0 && (
              <div className="text-center py-8 text-slate-400">No triggers found</div>
            )}
          </div>
        )}
      </div>

      {/* Audit Rules Section */}
      <div className="bg-[#0d2137] border border-amber-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Audit Rules</h2>
              <p className="text-sm text-slate-400">
                {auditRules.length} rules ({auditRules.filter(r => r.is_enabled).length} enabled)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingAuditRule(null);
                setAuditRuleModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
            <button
              onClick={() => setShowAuditRules(!showAuditRules)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              {showAuditRules ? 'Hide' : 'Show'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showAuditRules ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {showAuditRules && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e3a5f]">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Rule</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Drug Target</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Severity</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {auditRules.map((rule) => (
                  <tr key={rule.rule_id} className="border-b border-[#1e3a5f]/50 hover:bg-[#1e3a5f]/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{rule.rule_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{rule.rule_code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.rule_type === 'quantity_mismatch'
                          ? 'bg-blue-500/20 text-blue-400'
                          : rule.rule_type === 'daw_violation'
                          ? 'bg-purple-500/20 text-purple-400'
                          : rule.rule_type === 'high_gp_risk'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {rule.rule_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-40 truncate text-xs text-slate-300">
                        {rule.drug_keywords?.length ? rule.drug_keywords.join(', ') : 'All drugs'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : rule.severity === 'warning'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAuditRule(rule.rule_id, !rule.is_enabled)}
                        className={`p-1 rounded transition-colors ${
                          rule.is_enabled
                            ? 'text-emerald-400 hover:bg-emerald-500/20'
                            : 'text-slate-500 hover:bg-slate-500/20'
                        }`}
                      >
                        {rule.is_enabled ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingAuditRule(rule);
                            setAuditRuleModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-[#1e3a5f] rounded text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAuditRule(rule.rule_id)}
                          className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditRules.length === 0 && (
              <div className="text-center py-8 text-slate-400">No audit rules found. Run the migration to add default rules.</div>
            )}
          </div>
        )}
      </div>

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

      {/* Live Pharmacies Table */}
      <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e3a5f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <h2 className="text-lg font-semibold text-white">Live Pharmacies</h2>
            <span className="text-sm text-slate-400">({livePharmacies.length})</span>
          </div>
          <button
            onClick={() => setNewClientModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Client
          </button>
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
              {livePharmacies.map((pharmacy) => (
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
                        : pharmacy.status === 'onboarding'
                        ? 'bg-amber-500/20 text-amber-400'
                        : pharmacy.status === 'suspended'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {pharmacy.status}
                    </span>
                    {pharmacy.status === 'onboarding' && (
                      <button
                        onClick={() => updateClientStatus(pharmacy.client_id, 'active', pharmacy.pharmacy_name)}
                        className="ml-2 px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-white">{pharmacy.user_count}</td>
                  <td className="px-6 py-4 text-center text-white">{pharmacy.patient_count?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-teal-400">{pharmacy.opportunity_count?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-emerald-400">{formatCurrency(pharmacy.total_value)}</td>
                  <td className="px-6 py-4 text-right text-amber-400">{formatCurrency(pharmacy.captured_value)}</td>
                  <td className="px-6 py-4 text-center text-slate-400 text-sm">{formatDate(pharmacy.last_activity)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(pharmacy)}
                        className="p-2 hover:bg-amber-500/20 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                        title="Edit Details"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
                      <button
                        onClick={() => setTestEmailModal({ clientId: pharmacy.client_id, pharmacyName: pharmacy.pharmacy_name })}
                        className="p-2 hover:bg-amber-500/20 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                        title="Send Test Email (preview without resetting password)"
                      >
                        <Beaker className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => sendWelcomeEmail(pharmacy.client_id, pharmacy.pharmacy_name, true)}
                        disabled={sendingWelcomeEmail === pharmacy.client_id}
                        className="p-2 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                        title="Send Welcome Email + Docs (resets password)"
                      >
                        {sendingWelcomeEmail === pharmacy.client_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => emailDocuments(pharmacy.client_id, pharmacy.pharmacy_name)}
                        disabled={emailingDocs === pharmacy.client_id}
                        className="p-2 hover:bg-indigo-500/20 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                        title="Email Documents Only (no credentials)"
                      >
                        {emailingDocs === pharmacy.client_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadOnboardingDocs(pharmacy.client_id, pharmacy.pharmacy_name)}
                        disabled={downloadingDocs === pharmacy.client_id}
                        className="p-2 hover:bg-purple-500/20 rounded-lg text-slate-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                        title="Download BAA & Agreement"
                      >
                        {downloadingDocs === pharmacy.client_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => createStripeCheckout(pharmacy.client_id, pharmacy.pharmacy_name)}
                        disabled={creatingCheckout === pharmacy.client_id}
                        className="p-2 hover:bg-green-500/20 rounded-lg text-slate-400 hover:text-green-400 transition-colors disabled:opacity-50"
                        title="Create Stripe Checkout Link"
                      >
                        {creatingCheckout === pharmacy.client_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {livePharmacies.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No live pharmacies found
          </div>
        )}
      </div>

      {/* Test/Demo Environments Table */}
      {demoPharmacies.length > 0 && (
        <div className="mt-8 bg-[#0d2137] border border-purple-500/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-500/30 flex items-center justify-between bg-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <h2 className="text-lg font-semibold text-white">Test / Demo Environments</h2>
              <span className="text-sm text-slate-400">({demoPharmacies.length})</span>
            </div>
            <span className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full">For demos, 340B, specialty, compounding tests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Pharmacy</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Type</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Users</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Patients</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Opps</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Value</th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {demoPharmacies.map((pharmacy) => (
                  <tr key={pharmacy.pharmacy_id} className="border-b border-purple-500/10 hover:bg-purple-500/5">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{pharmacy.pharmacy_name}</p>
                        <p className="text-xs text-slate-400">{pharmacy.submitter_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                        Demo
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-white">{pharmacy.user_count}</td>
                    <td className="px-6 py-4 text-center text-white">{pharmacy.patient_count?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-teal-400">{pharmacy.opportunity_count?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-emerald-400">{formatCurrency(pharmacy.total_value)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(pharmacy)}
                          className="p-2 hover:bg-amber-500/20 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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
        </div>
      )}

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

                {/* Rescan Section */}
                <div className="mt-4 pt-4 border-t border-[#1e3a5f]">
                  <p className="text-xs text-slate-400 mb-3">Rescan for new opportunities & audit risks</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => rescanPharmacy(selectedPharmacy.pharmacy_id, 'all')}
                      disabled={rescanning === selectedPharmacy.pharmacy_id}
                      className="py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {rescanning === selectedPharmacy.pharmacy_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ScanLine className="w-4 h-4" />
                      )}
                      Full Scan
                    </button>
                    <button
                      onClick={() => rescanPharmacy(selectedPharmacy.pharmacy_id, 'opportunities')}
                      disabled={rescanning === selectedPharmacy.pharmacy_id}
                      className="py-2 px-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Crosshair className="w-4 h-4" />
                      Opps Only
                    </button>
                    <button
                      onClick={() => rescanPharmacy(selectedPharmacy.pharmacy_id, 'audit')}
                      disabled={rescanning === selectedPharmacy.pharmacy_id}
                      className="py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Shield className="w-4 h-4" />
                      Audit Only
                    </button>
                  </div>

                  {/* Rescan Results */}
                  {rescanResult && rescanResult.pharmacy === selectedPharmacy.pharmacy_name && (
                    <div className="mt-3 p-3 bg-[#0a1628] rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">Scan Results:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Prescriptions:</span>{' '}
                          <span className="text-white">{rescanResult.prescriptionsScanned.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Patients:</span>{' '}
                          <span className="text-white">{rescanResult.patientsScanned.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">New Opps:</span>{' '}
                          <span className="text-emerald-400 font-semibold">{rescanResult.results.newOpportunities}</span>
                          {rescanResult.results.skippedOpportunities > 0 && (
                            <span className="text-slate-500"> ({rescanResult.results.skippedOpportunities} existing)</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-500">Audit Flags:</span>{' '}
                          <span className="text-amber-400 font-semibold">{rescanResult.results.newAuditFlags}</span>
                          {rescanResult.results.skippedAuditFlags > 0 && (
                            <span className="text-slate-500"> ({rescanResult.results.skippedAuditFlags} existing)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Trigger Edit Modal */}
      {triggerModalOpen && (
        <TriggerEditModal
          trigger={editingTrigger}
          onClose={() => {
            setTriggerModalOpen(false);
            setEditingTrigger(null);
          }}
          onSave={saveTrigger}
          saving={savingTrigger}
        />
      )}

      {/* Trigger Scan Modal */}
      {scanModalOpen && scanModalTrigger && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#1e3a5f] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Scan Trigger</h2>
                <p className="text-sm text-slate-400">{scanModalTrigger.code}</p>
              </div>
              <button
                onClick={() => {
                  setScanModalOpen(false);
                  setScanModalTrigger(null);
                  setScanProgress(null);
                }}
                className="p-2 hover:bg-[#1e3a5f] rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!scanProgress ? (
                <>
                  <p className="text-sm text-slate-400 mb-4">Select pharmacies to scan:</p>

                  {/* All Pharmacies Option */}
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1e3a5f]/50 cursor-pointer border border-[#1e3a5f] mb-2">
                    <input
                      type="checkbox"
                      checked={selectedScanPharmacies.includes('all')}
                      onChange={() => toggleScanPharmacy('all')}
                      className="w-4 h-4 rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">All Pharmacies</p>
                      <p className="text-xs text-slate-400">{scanEligiblePharmacies.length} pharmacies</p>
                    </div>
                  </label>

                  <div className="border-t border-[#1e3a5f] my-4" />

                  {/* Individual Pharmacies */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {scanEligiblePharmacies.map(pharmacy => (
                      <label
                        key={pharmacy.pharmacy_id}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-[#1e3a5f]/50 cursor-pointer border ${
                          selectedScanPharmacies.includes(pharmacy.pharmacy_id) ? 'border-teal-500 bg-teal-500/10' : 'border-[#1e3a5f]'
                        } ${selectedScanPharmacies.includes('all') ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedScanPharmacies.includes('all') || selectedScanPharmacies.includes(pharmacy.pharmacy_id)}
                          onChange={() => toggleScanPharmacy(pharmacy.pharmacy_id)}
                          disabled={selectedScanPharmacies.includes('all')}
                          className="w-4 h-4 rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-white">{pharmacy.pharmacy_name}</p>
                          <p className="text-xs text-slate-400">{pharmacy.patient_count?.toLocaleString() || 0} patients</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Scan Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Progress</span>
                      <span className="text-sm text-white">{scanProgress.current} / {scanProgress.total}</span>
                    </div>
                    <div className="h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 transition-all duration-300"
                        style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Results */}
                  <div className="space-y-2">
                    {scanProgress.results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          result.success ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{result.pharmacy}</span>
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        {result.success ? (
                          <p className="text-sm text-slate-400 mt-1">
                            {result.newOpportunities} new, {result.skipped} skipped
                          </p>
                        ) : (
                          <p className="text-sm text-red-400 mt-1">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary when complete */}
                  {scanProgress.current === scanProgress.total && (
                    <div className="mt-4 p-4 bg-[#1e3a5f]/50 rounded-lg">
                      <p className="text-sm text-slate-400">Scan Complete</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {scanProgress.results.reduce((sum, r) => sum + (r.newOpportunities || 0), 0)} new opportunities created
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#1e3a5f] flex justify-end gap-3">
              <button
                onClick={() => {
                  setScanModalOpen(false);
                  setScanModalTrigger(null);
                  setScanProgress(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                {scanProgress ? 'Close' : 'Cancel'}
              </button>
              {!scanProgress && (
                <button
                  onClick={runTriggerScan}
                  disabled={selectedScanPharmacies.length === 0 || scanningTrigger !== null}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {scanningTrigger ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      Start Scan
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Rule Edit Modal */}
      {auditRuleModalOpen && (
        <AuditRuleEditModal
          rule={editingAuditRule}
          onClose={() => {
            setAuditRuleModalOpen(false);
            setEditingAuditRule(null);
          }}
          onSave={saveAuditRule}
          saving={savingAuditRule}
        />
      )}

      {/* Edit Client Modal */}
      {editingPharmacy && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2137] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#1e3a5f]">
            <div className="p-6 border-b border-[#1e3a5f] flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Edit Client</h2>
              <button onClick={() => setEditingPharmacy(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Pharmacy Name</label>
                <input
                  type="text"
                  value={editForm.pharmacyName}
                  onChange={(e) => setEditForm({ ...editForm, pharmacyName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Client/Company Name</label>
                <input
                  type="text"
                  value={editForm.clientName}
                  onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'onboarding' | 'active' | 'suspended' | 'demo' })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="demo">Demo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                    placeholder="XX"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={editForm.zip}
                    onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">NPI</label>
                <input
                  type="text"
                  value={editForm.npi}
                  onChange={(e) => setEditForm({ ...editForm, npi: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingPharmacy(null)}
                  className="flex-1 py-2 border border-[#1e3a5f] text-slate-400 rounded-lg hover:bg-[#1e3a5f] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {testEmailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2137] rounded-xl max-w-md w-full border border-[#1e3a5f]">
            <div className="p-6 border-b border-[#1e3a5f] flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Send Test Email</h2>
              <button onClick={() => { setTestEmailModal(null); setTestEmailAddress(''); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-400">
                  This will send a preview of the welcome email for <strong>{testEmailModal.pharmacyName}</strong> to your test address.
                  No passwords will be reset.
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Send test email to:</label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setTestEmailModal(null); setTestEmailAddress(''); }}
                  className="flex-1 py-2 border border-[#1e3a5f] text-slate-400 rounded-lg hover:bg-[#1e3a5f] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendTestEmail}
                  disabled={sendingTestEmail || !testEmailAddress}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingTestEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {newClientModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2137] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#1e3a5f]">
            <div className="p-6 border-b border-[#1e3a5f] flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Add New Client</h2>
              <button onClick={resetNewClientForm} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!newClientResult?.success ? (
              <div className="p-6 space-y-4">
                {newClientResult?.error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {newClientResult.error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Client/Organization Name *</label>
                    <input
                      type="text"
                      value={newClientForm.clientName}
                      onChange={(e) => setNewClientForm({ ...newClientForm, clientName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="Acme Pharmacy"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Pharmacy Name (if different)</label>
                    <input
                      type="text"
                      value={newClientForm.pharmacyName}
                      onChange={(e) => setNewClientForm({ ...newClientForm, pharmacyName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="Leave blank to use client name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">NPI</label>
                    <input
                      type="text"
                      value={newClientForm.pharmacyNpi}
                      onChange={(e) => setNewClientForm({ ...newClientForm, pharmacyNpi: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">NCPDP</label>
                    <input
                      type="text"
                      value={newClientForm.pharmacyNcpdp}
                      onChange={(e) => setNewClientForm({ ...newClientForm, pharmacyNcpdp: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">State</label>
                    <input
                      type="text"
                      value={newClientForm.pharmacyState}
                      onChange={(e) => setNewClientForm({ ...newClientForm, pharmacyState: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">PMS System</label>
                    <select
                      value={newClientForm.pmsSystem}
                      onChange={(e) => setNewClientForm({ ...newClientForm, pmsSystem: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Select PMS...</option>
                      <option value="PioneerRx">PioneerRx</option>
                      <option value="Rx30">Rx30</option>
                      <option value="PrimeRx">PrimeRx</option>
                      <option value="BestRx">BestRx</option>
                      <option value="ComputerRx">ComputerRx</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <hr className="border-[#1e3a5f] my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Admin Email *</label>
                    <input
                      type="email"
                      value={newClientForm.adminEmail}
                      onChange={(e) => setNewClientForm({ ...newClientForm, adminEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="admin@pharmacy.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Admin First Name</label>
                    <input
                      type="text"
                      value={newClientForm.adminFirstName}
                      onChange={(e) => setNewClientForm({ ...newClientForm, adminFirstName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="John"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Admin Last Name</label>
                    <input
                      type="text"
                      value={newClientForm.adminLastName}
                      onChange={(e) => setNewClientForm({ ...newClientForm, adminLastName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white focus:outline-none focus:border-teal-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetNewClientForm}
                    className="flex-1 py-2 border border-[#1e3a5f] text-slate-400 rounded-lg hover:bg-[#1e3a5f]/50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createClient}
                    disabled={creatingClient}
                    className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingClient ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Client
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2">
                    <CheckCircle className="w-5 h-5" />
                    Client Created Successfully!
                  </div>
                  <p className="text-slate-300 text-sm">
                    {newClientResult.pharmacy?.pharmacyName} has been created and is ready for data upload.
                  </p>
                </div>

                <div className="bg-[#0a1628] rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-white">Login Credentials</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Email:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-teal-400">{newClientResult.credentials?.email}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(newClientResult.credentials?.email || '')}
                          className="text-slate-500 hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Temp Password:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-amber-400">{newClientResult.credentials?.temporaryPassword}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(newClientResult.credentials?.temporaryPassword || '')}
                          className="text-slate-500 hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    User will be required to change password on first login.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetNewClientForm}
                    className="flex-1 py-2 border border-[#1e3a5f] text-slate-400 rounded-lg hover:bg-[#1e3a5f]/50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      if (newClientResult.pharmacy?.pharmacyId) {
                        impersonatePharmacy(newClientResult.pharmacy.pharmacyId);
                      }
                    }}
                    className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Login & Upload Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Trigger Edit Modal Component
function TriggerEditModal({
  trigger,
  onClose,
  onSave,
  saving,
}: {
  trigger: Trigger | null;
  onClose: () => void;
  onSave: (trigger: Partial<Trigger>) => void;
  saving: boolean;
}) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'details' | 'pricing'>('details');
  const [form, setForm] = useState({
    trigger_code: trigger?.trigger_code || '',
    display_name: trigger?.display_name || '',
    trigger_type: trigger?.trigger_type || 'therapeutic_interchange' as const,
    category: trigger?.category || '',
    detection_keywords: trigger?.detection_keywords?.join(', ') || '',
    exclude_keywords: trigger?.exclude_keywords?.join(', ') || '',
    if_has_keywords: trigger?.if_has_keywords?.join(', ') || '',
    if_not_has_keywords: trigger?.if_not_has_keywords?.join(', ') || '',
    recommended_drug: trigger?.recommended_drug || '',
    recommended_ndc: trigger?.recommended_ndc || '',
    action_instructions: trigger?.action_instructions || '',
    clinical_rationale: trigger?.clinical_rationale || '',
    priority: trigger?.priority || 'medium' as const,
    annual_fills: String(trigger?.annual_fills || 12),
    default_gp_value: String(trigger?.default_gp_value || ''),
    is_enabled: trigger?.is_enabled ?? true,
    bin_restrictions: trigger?.bin_restrictions?.join(', ') || '',
  });

  // BIN/Group Pricing state
  const [binValues, setBinValues] = useState<BinValue[]>(
    (trigger?.bin_values || []).map(bv => ({
      bin: bv.bin,
      group: bv.group || null,
      gpValue: bv.gpValue ?? null,
      isExcluded: bv.isExcluded || false,
      coverageStatus: bv.coverageStatus || 'unknown',
      verifiedAt: bv.verifiedAt,
      verifiedClaimCount: bv.verifiedClaimCount,
      avgReimbursement: bv.avgReimbursement,
      avgQty: bv.avgQty,
    }))
  );
  const [discoveredBins, setDiscoveredBins] = useState<DiscoveredBin[]>([]);
  const [discoveredGroups, setDiscoveredGroups] = useState<DiscoveredGroup[]>([]);
  const [loadingBins, setLoadingBins] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verifiedCount: number } | null>(null);
  const [showAddBin, setShowAddBin] = useState(false);
  const [newBinForm, setNewBinForm] = useState<{ bin: string; group: string; gpValue: string; coverageStatus: 'works' | 'excluded' | 'verified' | 'unknown' }>({ bin: '', group: '', gpValue: '', coverageStatus: 'works' });
  const [selectedBinForGroups, setSelectedBinForGroups] = useState<string | null>(null);
  const [savingBinValues, setSavingBinValues] = useState(false);

  // Medicare/CMS Data state
  const [medicareData, setMedicareData] = useState<{
    available: boolean;
    summary?: { totalClaims: number; uniquePlans: number; avgGP: number; avgInsurancePay: number };
    plans?: Array<{ contractId: string; planName: string; bin: string; claimCount: number; avgGP: number; avgInsurancePay: number }>;
  } | null>(null);
  const [loadingMedicare, setLoadingMedicare] = useState(false);

  // Fetch Medicare data when pricing tab opens
  const fetchMedicareData = async () => {
    if (!trigger?.trigger_id) return;
    setLoadingMedicare(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${trigger.trigger_id}/medicare-data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMedicareData(data.medicare);
      }
    } catch (error) {
      console.error('Failed to fetch Medicare data:', error);
    }
    setLoadingMedicare(false);
  };

  // Fetch discovered BINs when pricing tab opens
  useEffect(() => {
    if (activeTab === 'pricing' && discoveredBins.length === 0) {
      fetchDiscoveredBins();
    }
    if (activeTab === 'pricing' && trigger?.trigger_id && medicareData === null) {
      fetchMedicareData();
    }
  }, [activeTab]);

  // Fetch groups when a BIN is selected
  useEffect(() => {
    if (selectedBinForGroups) {
      fetchGroupsForBin(selectedBinForGroups);
    }
  }, [selectedBinForGroups]);

  const fetchDiscoveredBins = async () => {
    setLoadingBins(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/bins?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredBins(data.bins || []);
      }
    } catch (error) {
      console.error('Failed to fetch BINs:', error);
    }
    setLoadingBins(false);
  };

  const fetchGroupsForBin = async (bin: string) => {
    setLoadingGroups(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/bins/${bin}/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
    setLoadingGroups(false);
  };

  const verifyCoverage = async () => {
    if (!trigger?.trigger_id) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${trigger.trigger_id}/verify-coverage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ minClaims: 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerifyResult({ verifiedCount: data.verifiedCount });
        // Refresh bin values
        const binRes = await fetch(`${API_URL}/api/admin/triggers/${trigger.trigger_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (binRes.ok) {
          const binData = await binRes.json();
          setBinValues((binData.binValues || []).map((bv: any) => ({
            bin: bv.bin,
            group: bv.group || null,
            gpValue: bv.gpValue ?? null,
            isExcluded: bv.isExcluded || false,
            coverageStatus: bv.coverageStatus || 'unknown',
            verifiedAt: bv.verifiedAt,
            verifiedClaimCount: bv.verifiedClaimCount,
            avgReimbursement: bv.avgReimbursement,
            avgQty: bv.avgQty,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to verify coverage:', error);
    }
    setVerifying(false);
  };

  const addBinValue = async () => {
    if (!newBinForm.bin) return;
    if (!trigger?.trigger_id) {
      // Just add locally for new triggers
      setBinValues([...binValues, {
        bin: newBinForm.bin,
        group: newBinForm.group || null,
        gpValue: newBinForm.gpValue ? Number(newBinForm.gpValue) : null,
        isExcluded: newBinForm.coverageStatus === 'excluded',
        coverageStatus: newBinForm.coverageStatus,
      }]);
      setNewBinForm({ bin: '', group: '', gpValue: '', coverageStatus: 'works' });
      setShowAddBin(false);
      return;
    }

    setSavingBinValues(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/triggers/${trigger.trigger_id}/bin-values`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bin: newBinForm.bin,
          group: newBinForm.group || null,
          gpValue: newBinForm.gpValue ? Number(newBinForm.gpValue) : null,
          coverageStatus: newBinForm.coverageStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBinValues([...binValues, {
          bin: data.binValue.insurance_bin,
          group: data.binValue.insurance_group || null,
          gpValue: data.binValue.gp_value,
          isExcluded: data.binValue.is_excluded,
          coverageStatus: data.binValue.coverage_status || 'unknown',
        }]);
        setNewBinForm({ bin: '', group: '', gpValue: '', coverageStatus: 'works' });
        setShowAddBin(false);
      }
    } catch (error) {
      console.error('Failed to add BIN value:', error);
    }
    setSavingBinValues(false);
  };

  const deleteBinValue = async (bin: string, group: string | null) => {
    if (!trigger?.trigger_id) {
      // Just remove locally for new triggers
      setBinValues(binValues.filter(bv => !(bv.bin === bin && bv.group === group)));
      return;
    }

    try {
      const token = localStorage.getItem('therxos_token');
      const url = group
        ? `${API_URL}/api/admin/triggers/${trigger.trigger_id}/bin-values/${bin}?group=${encodeURIComponent(group)}`
        : `${API_URL}/api/admin/triggers/${trigger.trigger_id}/bin-values/${bin}?group=`;
      await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBinValues(binValues.filter(bv => !(bv.bin === bin && bv.group === group)));
    } catch (error) {
      console.error('Failed to delete BIN value:', error);
    }
  };

  const updateBinStatus = async (bin: string, group: string | null, newStatus: 'works' | 'excluded' | 'verified' | 'unknown') => {
    if (!trigger?.trigger_id) {
      // Just update locally for new triggers
      setBinValues(binValues.map(bv =>
        bv.bin === bin && bv.group === group
          ? { ...bv, coverageStatus: newStatus, isExcluded: newStatus === 'excluded' }
          : bv
      ));
      return;
    }

    try {
      const token = localStorage.getItem('therxos_token');
      const existingBv = binValues.find(bv => bv.bin === bin && bv.group === group);
      await fetch(`${API_URL}/api/admin/triggers/${trigger.trigger_id}/bin-values`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bin,
          group,
          gpValue: existingBv?.gpValue,
          coverageStatus: newStatus,
          isExcluded: newStatus === 'excluded',
        }),
      });
      setBinValues(binValues.map(bv =>
        bv.bin === bin && bv.group === group
          ? { ...bv, coverageStatus: newStatus, isExcluded: newStatus === 'excluded' }
          : bv
      ));
    } catch (error) {
      console.error('Failed to update BIN status:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(trigger?.trigger_id ? { trigger_id: trigger.trigger_id } : {}),
      trigger_code: form.trigger_code,
      display_name: form.display_name,
      trigger_type: form.trigger_type as any,
      category: form.category || null,
      detection_keywords: form.detection_keywords.split(',').map(s => s.trim()).filter(Boolean),
      exclude_keywords: form.exclude_keywords.split(',').map(s => s.trim()).filter(Boolean),
      if_has_keywords: form.if_has_keywords.split(',').map(s => s.trim()).filter(Boolean),
      if_not_has_keywords: form.if_not_has_keywords.split(',').map(s => s.trim()).filter(Boolean),
      recommended_drug: form.recommended_drug || null,
      recommended_ndc: form.recommended_ndc || null,
      action_instructions: form.action_instructions || null,
      clinical_rationale: form.clinical_rationale || null,
      priority: form.priority as any,
      annual_fills: parseInt(form.annual_fills) || 12,
      default_gp_value: form.default_gp_value ? Number(form.default_gp_value) : null,
      is_enabled: form.is_enabled,
      bin_restrictions: form.bin_restrictions ? form.bin_restrictions.split(',').map(s => s.trim()).filter(Boolean) : null,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'works': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'excluded': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'verified': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[700px] bg-[#0d2137] border-l border-[#1e3a5f] z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {trigger?.trigger_id ? 'Edit Trigger' : 'New Trigger'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[#0a1628] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#1e3a5f]'
              }`}
            >
              Trigger Details
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'pricing'
                  ? 'bg-teal-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#1e3a5f]'
              }`}
            >
              Reimbursement ({binValues.length})
            </button>
          </div>

          {activeTab === 'details' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Code</label>
                  <input
                    type="text"
                    value={form.trigger_code}
                    onChange={(e) => setForm({ ...form, trigger_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <select
                    value={form.trigger_type}
                    onChange={(e) => setForm({ ...form, trigger_type: e.target.value as Trigger['trigger_type'] })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="therapeutic_interchange">Therapeutic Interchange</option>
                    <option value="missing_therapy">Missing Therapy</option>
                    <option value="ndc_optimization">NDC Optimization</option>
                    <option value="brand_to_generic">Brand to Generic</option>
                    <option value="formulation_change">Formulation Change</option>
                    <option value="combo_therapy">Combo Therapy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Detection Keywords (comma-separated)</label>
                <textarea
                  value={form.detection_keywords}
                  onChange={(e) => setForm({ ...form, detection_keywords: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  rows={2}
                  placeholder="OZEMPIC, SEMAGLUTIDE, WEGOVY"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Exclude Keywords (comma-separated)</label>
                <textarea
                  value={form.exclude_keywords}
                  onChange={(e) => setForm({ ...form, exclude_keywords: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  rows={2}
                  placeholder="Keywords that exclude a match"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">IF_HAS (require these)</label>
                  <input
                    type="text"
                    value={form.if_has_keywords}
                    onChange={(e) => setForm({ ...form, if_has_keywords: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="comma-separated"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">IF_NOT_HAS (missing these)</label>
                  <input
                    type="text"
                    value={form.if_not_has_keywords}
                    onChange={(e) => setForm({ ...form, if_not_has_keywords: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="comma-separated"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Recommended Drug</label>
                <input
                  type="text"
                  value={form.recommended_drug}
                  onChange={(e) => setForm({ ...form, recommended_drug: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Default GP ($)</label>
                  <input
                    type="number"
                    value={form.default_gp_value}
                    onChange={(e) => setForm({ ...form, default_gp_value: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Annual Fills</label>
                  <input
                    type="number"
                    value={form.annual_fills}
                    onChange={(e) => setForm({ ...form, annual_fills: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                    className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Action Instructions</label>
                <textarea
                  value={form.action_instructions}
                  onChange={(e) => setForm({ ...form, action_instructions: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="trigger_enabled"
                  checked={form.is_enabled}
                  onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-[#1e3a5f] bg-[#0a1628]"
                />
                <label htmlFor="trigger_enabled" className="text-sm text-white">
                  Enabled
                </label>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  BIN Restrictions (comma-separated, leave empty for all BINs)
                </label>
                <input
                  type="text"
                  value={form.bin_restrictions}
                  onChange={(e) => setForm({ ...form, bin_restrictions: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="015581, 610502, 004336"
                />
                <p className="text-xs text-slate-500 mt-1">
                  If set, this trigger will ONLY apply to patients with these insurance BINs.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 border border-[#1e3a5f] text-slate-400 rounded-lg hover:bg-[#1e3a5f] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Trigger'}
                </button>
              </div>
            </form>
          ) : (
            /* Reimbursement Tab */
            <div className="space-y-4">
              {/* Header with actions */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400 flex items-center gap-2">
                  Default GP: <span className="text-white font-medium">${form.default_gp_value || 'Not set'}</span>
                  {binValues.filter(bv => bv.gpValue && bv.gpValue > 0).length >= 1 && (
                    <button
                      onClick={() => {
                        // Calculate average from top 3 verified BIN values
                        const validBins = binValues
                          .filter(bv => bv.gpValue && bv.gpValue > 0 && bv.coverageStatus !== 'excluded')
                          .sort((a, b) => (b.gpValue || 0) - (a.gpValue || 0))
                          .slice(0, 3);
                        if (validBins.length > 0) {
                          const avg = validBins.reduce((sum, bv) => sum + (bv.gpValue || 0), 0) / validBins.length;
                          setForm({ ...form, default_gp_value: String(Math.round(avg * 100) / 100) });
                        }
                      }}
                      className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/30"
                      title="Set default to average of top 3 BIN values"
                    >
                      Use Top 3 Avg
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {trigger?.trigger_id && (
                    <button
                      onClick={verifyCoverage}
                      disabled={verifying}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      {verifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ScanLine className="w-4 h-4" />
                      )}
                      Scan for Coverage
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddBin(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg text-sm hover:bg-teal-500/30"
                  >
                    <Plus className="w-4 h-4" />
                    Add BIN
                  </button>
                </div>
              </div>

              {/* Verify result message */}
              {verifyResult && (
                <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400">
                  Found {verifyResult.verifiedCount} verified BIN/Group combinations from prescription data.
                </div>
              )}

              {/* Medicare/CMS Data Section */}
              {trigger?.trigger_id && (
                <div className="p-4 bg-[#0a1628] border border-[#1e3a5f] rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Medicare Part D Coverage
                    </h4>
                    {loadingMedicare && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                  {medicareData === null && !loadingMedicare ? (
                    <p className="text-xs text-slate-500">Loading Medicare data...</p>
                  ) : medicareData && !medicareData.available ? (
                    <p className="text-xs text-slate-500">No Medicare Part D claims found for this drug.</p>
                  ) : medicareData?.available ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{medicareData.summary?.totalClaims || 0}</p>
                          <p className="text-xs text-slate-500">Total Claims</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">{medicareData.summary?.uniquePlans || 0}</p>
                          <p className="text-xs text-slate-500">Unique Plans</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-400">${(medicareData.summary?.avgGP || 0).toFixed(2)}</p>
                          <p className="text-xs text-slate-500">Avg GP</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-400">${(medicareData.summary?.avgInsurancePay || 0).toFixed(2)}</p>
                          <p className="text-xs text-slate-500">Avg Ins Pay</p>
                        </div>
                      </div>
                      {medicareData.plans && medicareData.plans.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-400 mb-2">Top Medicare Plans:</p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {medicareData.plans.slice(0, 5).map((plan, idx) => (
                              <div key={idx} className="flex justify-between text-xs py-1 px-2 bg-[#0d2137] rounded">
                                <span className="text-slate-300">{plan.contractId} {plan.planName && `(${plan.planName})`}</span>
                                <span className="text-slate-500">{plan.claimCount} claims • ${plan.avgGP.toFixed(2)} GP</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Add BIN Form */}
              {showAddBin && (
                <div className="p-4 bg-[#0a1628] border border-[#1e3a5f] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">Add BIN/Group Pricing</h4>
                    <button onClick={() => setShowAddBin(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">BIN</label>
                      <select
                        value={newBinForm.bin}
                        onChange={(e) => {
                          setNewBinForm({ ...newBinForm, bin: e.target.value, group: '' });
                          setSelectedBinForGroups(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-white text-sm"
                      >
                        <option value="">Select BIN...</option>
                        {discoveredBins.map(b => (
                          <option key={b.bin} value={b.bin}>
                            {b.bin} ({b.claim_count} claims)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Group (optional)</label>
                      <select
                        value={newBinForm.group}
                        onChange={(e) => setNewBinForm({ ...newBinForm, group: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-white text-sm"
                        disabled={!newBinForm.bin || loadingGroups}
                      >
                        <option value="">(All Groups)</option>
                        {discoveredGroups.map(g => (
                          <option key={g.group} value={g.group}>
                            {g.group} ({g.claim_count} claims)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">GP Value ($)</label>
                      <input
                        type="number"
                        value={newBinForm.gpValue}
                        onChange={(e) => setNewBinForm({ ...newBinForm, gpValue: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-white text-sm"
                        placeholder="Use default if empty"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Status</label>
                      <select
                        value={newBinForm.coverageStatus}
                        onChange={(e) => setNewBinForm({ ...newBinForm, coverageStatus: e.target.value as any })}
                        className="w-full px-3 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-white text-sm"
                      >
                        <option value="works">Works (Covered)</option>
                        <option value="excluded">Excluded (Doesn&apos;t work)</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={addBinValue}
                      disabled={!newBinForm.bin || savingBinValues}
                      className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
                    >
                      {savingBinValues ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* BIN Values Table */}
              <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#1e3a5f]">
                      <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">BIN</th>
                      <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Group</th>
                      <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">GP Value</th>
                      <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Avg Qty</th>
                      <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Verified</th>
                      <th className="text-left text-xs text-slate-400 font-medium px-4 py-3">Synced On</th>
                      <th className="w-12 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {binValues.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                          No BIN/Group pricing configured. Using default GP value.
                        </td>
                      </tr>
                    ) : (
                      binValues.map((bv, idx) => (
                        <tr key={`${bv.bin}-${bv.group || 'all'}-${idx}`} className="border-b border-[#1e3a5f] last:border-b-0">
                          <td className="px-4 py-3 text-white text-sm font-mono">{bv.bin}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            {bv.group || <span className="text-slate-500">(all)</span>}
                          </td>
                          <td className="px-4 py-3 text-white text-sm">
                            {bv.gpValue ? `$${Number(bv.gpValue).toFixed(2)}` : <span className="text-slate-500">default</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            {bv.avgQty ? Number(bv.avgQty).toFixed(1) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={bv.coverageStatus}
                              onChange={(e) => updateBinStatus(bv.bin, bv.group, e.target.value as any)}
                              className={`px-2 py-1 rounded text-xs border ${getStatusBadge(bv.coverageStatus)} bg-transparent`}
                            >
                              <option value="works">Works</option>
                              <option value="excluded">Excluded</option>
                              <option value="verified">Verified</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {bv.verifiedClaimCount ? (
                              <span className="text-blue-400">
                                {bv.verifiedClaimCount} claims
                                {bv.avgReimbursement ? ` • $${Number(bv.avgReimbursement).toFixed(2)}` : ''}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {bv.verifiedAt ? new Date(bv.verifiedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-2 py-3">
                            <button
                              onClick={() => deleteBinValue(bv.bin, bv.group)}
                              className="text-slate-500 hover:text-red-400 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Info box about pricing hierarchy */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
                <strong>Pricing Hierarchy:</strong> Group-specific price → BIN-level price → Default GP
                <br />
                <span className="text-amber-400/70">Group-specific pricing always takes precedence over BIN-level defaults.</span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 border border-[#1e3a5f] text-slate-400 rounded-lg hover:bg-[#1e3a5f] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Audit Rule Edit Modal Component
function AuditRuleEditModal({
  rule,
  onClose,
  onSave,
  saving,
}: {
  rule: AuditRule | null;
  onClose: () => void;
  onSave: (rule: Partial<AuditRule>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    rule_code: rule?.rule_code || '',
    rule_name: rule?.rule_name || '',
    rule_description: rule?.rule_description || '',
    rule_type: rule?.rule_type || 'high_gp_risk' as const,
    drug_keywords: rule?.drug_keywords?.join(', ') || '',
    expected_quantity: String(rule?.expected_quantity ?? ''),
    min_days_supply: String(rule?.min_days_supply ?? ''),
    max_days_supply: String(rule?.max_days_supply ?? ''),
    allowed_daw_codes: rule?.allowed_daw_codes?.join(', ') || '',
    has_generic_available: rule?.has_generic_available ?? false,
    gp_threshold: String(rule?.gp_threshold ?? 50),
    severity: rule?.severity || 'warning' as const,
    audit_risk_score: String(rule?.audit_risk_score ?? 5),
    is_enabled: rule?.is_enabled ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(rule?.rule_id ? { rule_id: rule.rule_id } : {}),
      rule_code: form.rule_code,
      rule_name: form.rule_name,
      rule_description: form.rule_description || null,
      rule_type: form.rule_type as any,
      drug_keywords: form.drug_keywords.split(',').map(s => s.trim()).filter(Boolean),
      expected_quantity: form.expected_quantity ? Number(form.expected_quantity) : null,
      min_days_supply: form.min_days_supply ? Number(form.min_days_supply) : null,
      max_days_supply: form.max_days_supply ? Number(form.max_days_supply) : null,
      allowed_daw_codes: form.allowed_daw_codes.split(',').map(s => s.trim()).filter(Boolean),
      has_generic_available: form.has_generic_available,
      gp_threshold: Number(form.gp_threshold),
      severity: form.severity as any,
      audit_risk_score: form.audit_risk_score ? Number(form.audit_risk_score) : null,
      is_enabled: form.is_enabled,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[600px] bg-[#0d2137] border-l border-[#1e3a5f] z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {rule?.rule_id ? 'Edit Audit Rule' : 'New Audit Rule'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Code</label>
                <input
                  type="text"
                  value={form.rule_code}
                  onChange={(e) => setForm({ ...form, rule_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  value={form.rule_type}
                  onChange={(e) => setForm({ ...form, rule_type: e.target.value as 'quantity_mismatch' | 'days_supply_mismatch' | 'daw_violation' | 'sig_quantity_mismatch' | 'high_gp_risk' })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="quantity_mismatch">Quantity Mismatch</option>
                  <option value="days_supply_mismatch">Days Supply Mismatch</option>
                  <option value="daw_violation">DAW Violation</option>
                  <option value="sig_quantity_mismatch">SIG/Quantity Mismatch</option>
                  <option value="high_gp_risk">High GP Risk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Rule Name</label>
              <input
                type="text"
                value={form.rule_name}
                onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                value={form.rule_description}
                onChange={(e) => setForm({ ...form, rule_description: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Drug Keywords (comma-separated, leave empty for all drugs)</label>
              <input
                type="text"
                value={form.drug_keywords}
                onChange={(e) => setForm({ ...form, drug_keywords: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                placeholder="OZEMPIC, SYNTHROID"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Expected Qty</label>
                <input
                  type="number"
                  value={form.expected_quantity}
                  onChange={(e) => setForm({ ...form, expected_quantity: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Min Days</label>
                <input
                  type="number"
                  value={form.min_days_supply}
                  onChange={(e) => setForm({ ...form, min_days_supply: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Days</label>
                <input
                  type="number"
                  value={form.max_days_supply}
                  onChange={(e) => setForm({ ...form, max_days_supply: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Allowed DAW Codes (comma-separated)</label>
                <input
                  type="text"
                  value={form.allowed_daw_codes}
                  onChange={(e) => setForm({ ...form, allowed_daw_codes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="1, 2, 9"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">GP Threshold ($)</label>
                <input
                  type="number"
                  value={form.gp_threshold}
                  onChange={(e) => setForm({ ...form, gp_threshold: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as 'critical' | 'warning' | 'info' })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Risk Score (1-10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.audit_risk_score}
                  onChange={(e) => setForm({ ...form, audit_risk_score: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a1628] border border-[#1e3a5f] rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="has_generic"
                  checked={form.has_generic_available}
                  onChange={(e) => setForm({ ...form, has_generic_available: e.target.checked })}
                  className="w-4 h-4 rounded border-[#1e3a5f] bg-[#0a1628]"
                />
                <label htmlFor="has_generic" className="text-sm text-white">
                  Has Generic Available
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="rule_enabled"
                  checked={form.is_enabled}
                  onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-[#1e3a5f] bg-[#0a1628]"
                />
                <label htmlFor="rule_enabled" className="text-sm text-white">
                  Enabled
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-[#1e3a5f] text-slate-400 rounded-lg hover:bg-[#1e3a5f] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
