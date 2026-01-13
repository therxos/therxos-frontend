'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Send,
  Clock,
  RefreshCw,
  DollarSign,
  AlertCircle,
  Filter,
  StickyNote,
  Download,
  FileDown,
} from 'lucide-react';

// Types
interface Opportunity {
  opportunity_id: string;
  patient_id: string;
  prescription_id: string;
  opportunity_type: string;
  current_ndc: string;
  current_drug_name: string;
  recommended_drug_name: string;
  potential_margin_gain: number;
  annual_margin_gain: number;
  avg_dispensed_qty?: number | null;
  clinical_rationale: string;
  clinical_priority: string;
  status: string;
  staff_notes?: string;
  created_at: string;
  actioned_at?: string;
  patient_hash?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  insurance_bin?: string;
  insurance_group?: string;
  insurance_pcn?: string;
  contract_id?: string;
  plan_name?: string;
  prescriber_name?: string;
}

interface GroupedItem {
  id: string;
  label: string;
  sublabel?: string;
  opportunities: Opportunity[];
  total_value: number;
  // For patient grouping
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  insurance_bin?: string;
  insurance_group?: string;
}

interface Stats {
  total: number;
  not_submitted: number;
  submitted: number;
  approved: number;
  completed: number;
  didnt_work: number;
  flagged: number;
  denied: number;
  total_annual: number;
  not_submitted_annual: number;
  submitted_annual: number;
  approved_annual: number;
  completed_annual: number;
}

// Helpers
function formatCurrency(value: number) {
  if (isNaN(value) || value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortCurrency(value: number) {
  if (isNaN(value) || value === null || value === undefined) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(str: string) {
  if (!str) return 'PT';
  return str.slice(0, 2).toUpperCase();
}

function formatPatientName(firstName?: string, lastName?: string, hash?: string, isDemo?: boolean) {
  if (firstName && lastName) {
    // Show full name for demo account (Marvel heroes)
    if (isDemo) {
      return `${firstName} ${lastName}`;
    }
    // Masked format for real accounts (HIPAA)
    const last3 = lastName.slice(0, 3).toUpperCase();
    const first3 = firstName.slice(0, 3).toUpperCase();
    return `${last3},${first3}`;
  }
  if (lastName) {
    return isDemo ? lastName : lastName.slice(0, 6).toUpperCase();
  }
  return hash?.slice(0, 8) || 'Unknown';
}

function getAnnualValue(opp: Opportunity): number {
  const annual = Number(opp.annual_margin_gain);
  const potential = Number(opp.potential_margin_gain);
  if (!isNaN(annual) && annual > 0) return annual;
  if (!isNaN(potential) && potential > 0) return potential * 12;
  return 0;
}

// Format Contract ID + PBP as X####-### (e.g., H2226-001)
function formatContractPBP(contractId?: string, planName?: string): string | null {
  if (!contractId) return null;
  const contract = contractId.trim();
  const pbp = planName ? planName.trim().padStart(3, '0') : '001';
  return `${contract}-${pbp}`;
}

// Insurance Tags Component - displays in order: Contract-PBP, BIN, PCN, GROUP
function InsuranceTags({ opp, size = 'sm' }: { opp: Opportunity; size?: 'sm' | 'xs' }) {
  const contractPbp = formatContractPBP(opp.contract_id, opp.plan_name);
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  
  return (
    <div className="flex flex-wrap gap-1">
      {contractPbp && (
        <span className={`${sizeClass} bg-purple-500/20 text-purple-400 rounded font-medium`}>
          {contractPbp}
        </span>
      )}
      {opp.insurance_bin && (
        <span className={`${sizeClass} bg-[#14b8a6]/20 text-[#14b8a6] rounded font-medium`}>
          {opp.insurance_bin}
        </span>
      )}
      {opp.insurance_pcn && (
        <span className={`${sizeClass} bg-amber-500/20 text-amber-400 rounded font-medium`}>
          {opp.insurance_pcn}
        </span>
      )}
      {opp.insurance_group && (
        <span className={`${sizeClass} bg-blue-500/20 text-blue-400 rounded font-medium`}>
          {opp.insurance_group}
        </span>
      )}
    </div>
  );
}

// Status Dropdown with portal positioning
function StatusDropdown({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, flipUp: false });
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const statuses = [
    { value: 'Not Submitted', label: 'Not Submitted', color: 'bg-amber-500' },
    { value: 'Submitted', label: 'Submitted', color: 'bg-blue-500' },
    { value: 'Approved', label: 'Approved', color: 'bg-emerald-500' },
    { value: 'Completed', label: 'Completed', color: 'bg-green-500' },
    { value: 'Denied', label: 'Denied', color: 'bg-slate-500' },
    { value: "Didn't Work", label: "Didn't Work", color: 'bg-red-500' },
    { value: 'Flagged', label: 'Flag for Review', color: 'bg-purple-500' },
  ];

  const current = statuses.find(s => s.value === status) || statuses[0];

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = statuses.length * 36 + 8; // Approximate height
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setPosition({
        top: flipUp ? rect.top - dropdownHeight : rect.bottom + 4,
        left: rect.right - 144, // 144 = w-36 = 9rem
        flipUp
      });
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`${current.color} text-white px-3 py-1 rounded text-xs font-medium flex items-center gap-1`}
      >
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open && position.flipUp ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            className="fixed w-36 bg-[#0d2137] rounded-lg shadow-xl border border-[#1e3a5f] z-[101] overflow-hidden"
            style={{ top: position.top, left: position.left }}
          >
            {statuses.map(s => (
              <button
                key={s.value}
                onClick={(e) => { e.stopPropagation(); onChange(s.value); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#1e3a5f] ${
                  s.value === status ? 'text-[#14b8a6]' : 'text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Notes Modal
function NotesModal({
  opportunity,
  onClose,
  onSave
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onSave: (id: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(opportunity.staff_notes || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[#0d2137] rounded-xl border border-[#1e3a5f] w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Staff Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this opportunity..."
          className="w-full h-32 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#14b8a6] resize-none"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
            Cancel
          </button>
          <button
            onClick={() => { onSave(opportunity.opportunity_id, notes); onClose(); }}
            className="px-4 py-2 bg-[#14b8a6] hover:bg-[#0d9488] text-[#0a1628] rounded-lg text-sm font-medium"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}

// Prescriber Warning Modal
interface PrescriberWarningData {
  prescriberName: string;
  uniquePatientsActioned: number;
  totalOppsActioned: number;
  warnThreshold: number;
  blockThreshold: number | null;
  shouldBlock: boolean;
}

function PrescriberWarningModal({
  warningData,
  onClose,
  onProceed,
}: {
  warningData: PrescriberWarningData;
  onClose: () => void;
  onProceed: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[#0d2137] rounded-xl border border-amber-500/50 w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-400 mb-2">
              {warningData.shouldBlock ? 'Action Blocked' : 'High Volume Warning'}
            </h3>
            <p className="text-slate-300 mb-4">
              You have actioned <span className="font-bold text-white">{warningData.uniquePatientsActioned}</span> unique patients
              to <span className="font-bold text-[#14b8a6]">{warningData.prescriberName}</span>.
            </p>
            <div className="bg-[#1e3a5f] rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Unique Patients</div>
                  <div className="text-2xl font-bold text-amber-400">{warningData.uniquePatientsActioned}</div>
                </div>
                <div>
                  <div className="text-slate-500">Total Opportunities</div>
                  <div className="text-2xl font-bold text-white">{warningData.totalOppsActioned}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#2d4a6f]">
                <div className="text-xs text-slate-400">
                  Warning threshold: {warningData.warnThreshold} patients
                  {warningData.blockThreshold && ` | Block threshold: ${warningData.blockThreshold} patients`}
                </div>
              </div>
            </div>
            {warningData.shouldBlock ? (
              <p className="text-red-400 text-sm mb-4">
                This prescriber has reached the block threshold. Please contact your administrator to proceed.
              </p>
            ) : (
              <p className="text-amber-400 text-sm mb-4">
                Consider spacing out submissions to this prescriber to avoid overwhelming their office.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
            Cancel
          </button>
          {!warningData.shouldBlock && (
            <button
              onClick={onProceed}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-[#0a1628] rounded-lg text-sm font-medium"
            >
              Proceed Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Side Panel
function SidePanel({
  opportunity,
  groupItem,
  onClose,
  onStatusChange,
  isDemo,
  showFinancials = true,
}: {
  opportunity: Opportunity | null;
  groupItem: GroupedItem | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  isDemo?: boolean;
  showFinancials?: boolean;
}) {
  if (!opportunity || !groupItem) return null;
  
  const [rationale, action] = (opportunity.clinical_rationale || '').split('\n\nAction: ');
  
  return (
    <aside className="fixed inset-y-0 right-0 w-[420px] bg-[#0d2137] border-l border-[#1e3a5f] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3a5f]">
        <span className="font-semibold text-white">Opportunity Details</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Patient */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Patient</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center text-[#0a1628] font-semibold">
              {getInitials(groupItem.last_name || groupItem.label)}
            </div>
            <div>
              <div className="font-semibold text-white">
                {formatPatientName(groupItem.first_name, groupItem.last_name, groupItem.label, isDemo)}
              </div>
              <div className="text-sm text-slate-400">DOB: {formatDate(groupItem.date_of_birth || '')}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-[#14b8a6]/20 text-[#14b8a6] text-xs rounded font-medium">
              BIN: {groupItem.insurance_bin || opportunity.insurance_bin || 'N/A'}
            </span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
              Group: {groupItem.insurance_group || opportunity.insurance_group || 'N/A'}
            </span>
            {opportunity.contract_id && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded font-medium">
                Contract: {opportunity.contract_id}
              </span>
            )}
            {opportunity.plan_name && (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded font-medium">
                Plan: {opportunity.plan_name}
              </span>
            )}
          </div>
        </div>
        
        {/* Opportunity */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Opportunity</div>
          <div className="bg-[#1e3a5f] rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-white">{rationale}</div>
                <div className="text-xs text-slate-400 mt-1">{opportunity.opportunity_type?.replace(/_/g, ' ')}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs">Current</div>
                <div className="text-white">{opportunity.current_drug_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Recommended</div>
                <div className="text-[#14b8a6]">{opportunity.recommended_drug_name}</div>
              </div>
            </div>
            {action && (
              <div className="mt-4 pt-4 border-t border-[#2d4a6f]">
                <div className="text-xs text-slate-500 mb-1">Action</div>
                <div className="text-sm text-[#14b8a6]">{action}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Value */}
        {showFinancials && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Value & Impact</div>
            <div className="bg-[#1e3a5f] rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Per Fill GP</div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(Number(opportunity.potential_margin_gain) || 0)}</div>
                <div className="text-xs text-slate-400 mt-1">First fill value</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Monthly Value</div>
                <div className="text-2xl font-bold text-[#14b8a6]">{formatCurrency(getAnnualValue(opportunity) / 12)}</div>
                <div className="text-xs text-slate-400 mt-1">{formatCurrency(getAnnualValue(opportunity))}/year</div>
              </div>
              <div className="col-span-2 pt-2 border-t border-[#2d4a6f]">
                <div className="text-xs text-slate-500 mb-1">Priority Score</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#0d2137] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, (Number(opportunity.potential_margin_gain) || 0) / 2)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {Number(opportunity.potential_margin_gain) >= 100 ? 'High' : Number(opportunity.potential_margin_gain) >= 50 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Prescriber */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Prescriber</div>
          <div className="bg-[#1e3a5f] rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Name</div>
                <div className="text-white">{opportunity.prescriber_name || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Fax</div>
                <div className="text-white">N/A</div>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Notes */}
        {opportunity.staff_notes && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Staff Notes</div>
            <div className="bg-[#1e3a5f] rounded-lg p-4">
              <p className="text-sm text-slate-300">{opportunity.staff_notes}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-[#1e3a5f] space-y-2">
        <button className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Fax
        </button>
        <button className="w-full py-2.5 bg-[#14b8a6] hover:bg-[#0d9488] text-[#0a1628] rounded-lg font-medium flex items-center justify-center gap-2">
          <Send className="w-4 h-4" />
          Send Now
        </button>
        <button
          onClick={() => onStatusChange(opportunity.opportunity_id, 'Submitted')}
          className="w-full py-2.5 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg font-medium flex items-center justify-center gap-2 border border-[#2d4a6f]"
        >
          <Clock className="w-4 h-4" />
          Send to Approval Queue
        </button>
        <button onClick={onClose} className="w-full py-2 text-slate-400 hover:text-white text-sm">
          Close
        </button>
      </div>
    </aside>
  );
}

// Main Component
export default function OpportunitiesPage() {
  const user = useAuthStore((state) => state.user);
  const { canViewFinancialData } = usePermissions();
  const isDemo = user?.email === 'demo@therxos.com';
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, not_submitted: 0, submitted: 0, approved: 0, completed: 0, didnt_work: 0, flagged: 0, denied: 0,
    total_annual: 0, not_submitted_annual: 0, submitted_annual: 0, approved_annual: 0, completed_annual: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showDenied, setShowDenied] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState('patient');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedItem | null>(null);
  const [notesModal, setNotesModal] = useState<Opportunity | null>(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [prescriberWarning, setPrescriberWarning] = useState<{ data: PrescriberWarningData; pendingUpdate: { id: string; status: string } } | null>(null);

  // Check URL for type/filter params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      const filterParam = params.get('filter');
      if (type) {
        setTypeFilter(type);
        setGroupBy('category');
      }
      if (filterParam === 'flagged') {
        setFilter('flagged');
      }
    }
  }, []);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { groupData(); }, [opportunities, groupBy]);

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('therxos_token');
      // Fetch with higher limit to get all opportunities
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/opportunities?limit=5000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const opps: Opportunity[] = data.opportunities || [];
      setOpportunities(opps);

      // Use counts from API (which queries ALL records) for accurate stats
      const apiCounts = data.counts || {};
      const getCount = (status: string) => apiCounts[status]?.count || 0;
      const getMargin = (status: string) => apiCounts[status]?.totalMargin || 0;

      // Calculate active total (exclude Denied, Flagged, Completed, Didn't Work)
      const activeTotal = getCount('Not Submitted') + getCount('Submitted') + getCount('Approved');
      const activeMargin = getMargin('Not Submitted') + getMargin('Submitted') + getMargin('Approved');

      const calcStats: Stats = {
        total: activeTotal,
        not_submitted: getCount('Not Submitted'),
        submitted: getCount('Submitted'),
        approved: getCount('Approved'),
        completed: getCount('Completed'),
        didnt_work: getCount("Didn't Work"),
        flagged: getCount('Flagged'),
        denied: getCount('Denied'),
        total_annual: activeMargin * 12,
        not_submitted_annual: getMargin('Not Submitted') * 12,
        submitted_annual: getMargin('Submitted') * 12,
        approved_annual: getMargin('Approved') * 12,
        completed_annual: getMargin('Completed') * 12,
      };
      setStats(calcStats);
      setLastSync(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function groupData() {
    const map = new Map<string, GroupedItem>();
    
    opportunities.forEach(opp => {
      let key: string;
      let label: string;
      let sublabel: string | undefined;
      
      switch (groupBy) {
        case 'bin':
          key = opp.insurance_bin || 'unknown';
          label = opp.insurance_bin || 'Unknown BIN';
          break;
        case 'group':
          key = `${opp.insurance_bin}-${opp.insurance_group}` || 'unknown';
          label = opp.insurance_group || 'Unknown Group';
          sublabel = opp.insurance_bin;
          break;
        case 'category':
          key = opp.opportunity_type || 'unknown';
          label = (opp.opportunity_type || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          break;
        case 'contract':
          key = opp.contract_id || 'unknown';
          label = opp.plan_name || opp.contract_id || 'Unknown Contract';
          sublabel = opp.contract_id;
          break;
        case 'prescriber':
          key = opp.prescriber_name || 'unknown';
          label = opp.prescriber_name || 'Unknown Prescriber';
          break;
        default: // patient
          key = opp.patient_id;
          label = opp.patient_hash || opp.patient_id.slice(0, 8);
          break;
      }
      
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          label,
          sublabel,
          opportunities: [],
          total_value: 0,
          first_name: opp.patient_first_name,
          last_name: opp.patient_last_name,
          date_of_birth: opp.patient_dob,
          insurance_bin: opp.insurance_bin,
          insurance_group: opp.insurance_group,
        });
      }
      
      const item = map.get(key)!;
      item.opportunities.push(opp);
      item.total_value += getAnnualValue(opp);
    });
    
    const sorted = Array.from(map.values()).sort((a, b) => b.total_value - a.total_value);
    setGroupedItems(sorted);
    if (sorted.length && expanded.size === 0) {
      setExpanded(new Set([sorted[0].id]));
    }
  }

  // Check prescriber warning before updating
  async function checkPrescriberAndUpdate(id: string, status: string) {
    // Only check for statuses that count as "actioned" to prescriber
    const actionedStatuses = ['Submitted', 'Approved', 'Completed'];
    if (!actionedStatuses.includes(status)) {
      // No check needed, proceed directly
      await performStatusUpdate(id, status);
      return;
    }

    // Find the opportunity to get prescriber name
    const opp = opportunities.find(o => o.opportunity_id === id);
    if (!opp || !opp.prescriber_name) {
      await performStatusUpdate(id, status);
      return;
    }

    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/opportunities/prescriber-stats/${encodeURIComponent(opp.prescriber_name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.shouldWarn || data.shouldBlock) {
          // Show warning modal
          setPrescriberWarning({
            data: data as PrescriberWarningData,
            pendingUpdate: { id, status }
          });
          return;
        }
      }
    } catch (e) {
      console.error('Failed to check prescriber stats:', e);
    }

    // No warning needed, proceed
    await performStatusUpdate(id, status);
  }

  // Perform the actual status update
  async function performStatusUpdate(id: string, status: string) {
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Failed to update status: ${error.error || 'Unknown error'}`);
        return;
      }

      setOpportunities(prev => prev.map(o => o.opportunity_id === id ? { ...o, status } : o));
      // Recalculate stats
      const opps = opportunities.map(o => o.opportunity_id === id ? { ...o, status } : o);
      const activeOpps = opps.filter(o => o.status !== 'Denied' && o.status !== 'Flagged' && o.status !== "Didn't Work" && o.status !== 'Completed');
      setStats({
        total: activeOpps.length,
        not_submitted: opps.filter(o => o.status === 'Not Submitted').length,
        submitted: opps.filter(o => o.status === 'Submitted').length,
        approved: opps.filter(o => o.status === 'Approved').length,
        completed: opps.filter(o => o.status === 'Completed').length,
        didnt_work: opps.filter(o => o.status === "Didn't Work").length,
        flagged: opps.filter(o => o.status === 'Flagged').length,
        denied: opps.filter(o => o.status === 'Denied').length,
        total_annual: activeOpps.reduce((s, o) => s + getAnnualValue(o), 0),
        not_submitted_annual: opps.filter(o => o.status === 'Not Submitted').reduce((s, o) => s + getAnnualValue(o), 0),
        submitted_annual: opps.filter(o => o.status === 'Submitted').reduce((s, o) => s + getAnnualValue(o), 0),
        approved_annual: opps.filter(o => o.status === 'Approved').reduce((s, o) => s + getAnnualValue(o), 0),
        completed_annual: opps.filter(o => o.status === 'Completed').reduce((s, o) => s + getAnnualValue(o), 0),
      });
    } catch (e) {
      console.error(e);
      alert('Failed to update status. Please try again.');
    }
  }

  // Keep this for backward compatibility with components that use it directly
  async function updateStatus(id: string, status: string) {
    await checkPrescriberAndUpdate(id, status);
  }

  async function updateNotes(id: string, notes: string) {
    try {
      const token = localStorage.getItem('therxos_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staffNotes: notes }),
      });
      setOpportunities(prev => prev.map(o => o.opportunity_id === id ? { ...o, staff_notes: notes } : o));
    } catch (e) { console.error(e); }
  }

  // Export to CSV
  function exportToCSV() {
    const allOpps = filtered.flatMap(g => g.opportunities);
    const headers = ['Patient', 'Current Drug', 'Recommended Drug', 'Per Fill Value', 'Annual Value', 'Prescriber', 'Status', 'Insurance BIN', 'Insurance Group', 'Notes', 'Last Actioned'];
    const rows = allOpps.map(opp => [
      formatPatientName(opp.patient_first_name, opp.patient_last_name, opp.patient_hash, isDemo),
      opp.current_drug_name || 'N/A',
      opp.recommended_drug_name || 'N/A',
      Number(opp.potential_margin_gain) || 0,
      getAnnualValue(opp),
      opp.prescriber_name || 'Unknown',
      opp.status,
      opp.insurance_bin || '',
      opp.insurance_group || '',
      (opp.staff_notes || '').replace(/"/g, '""'),
      opp.actioned_at ? new Date(opp.actioned_at).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `opportunities_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Export to PDF (simple printable version)
  function exportToPDF() {
    const allOpps = filtered.flatMap(g => g.opportunities);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Opportunities Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
          .summary { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary span { margin-right: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #0d9488; color: white; padding: 10px 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .value { color: #059669; font-weight: bold; }
          .status { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .status-submitted { background: #dbeafe; color: #1e40af; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>TheRxOS Opportunities Report</h1>
        <div class="summary">
          <strong>Generated:</strong> ${new Date().toLocaleString()} &nbsp;|&nbsp;
          <strong>Total Opportunities:</strong> ${allOpps.length} &nbsp;|&nbsp;
          <strong>Total Annual Value:</strong> ${formatCurrency(allOpps.reduce((s, o) => s + getAnnualValue(o), 0))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Current Drug</th>
              <th>Recommended</th>
              <th>Per Fill</th>
              <th>Annual</th>
              <th>Prescriber</th>
              <th>Status</th>
              <th>BIN</th>
            </tr>
          </thead>
          <tbody>
            ${allOpps.map(opp => `
              <tr>
                <td>${formatPatientName(opp.patient_first_name, opp.patient_last_name, opp.patient_hash, isDemo)}</td>
                <td>${opp.current_drug_name || 'N/A'}</td>
                <td>${opp.recommended_drug_name || 'N/A'}</td>
                <td class="value">${formatCurrency(Number(opp.potential_margin_gain) || 0)}</td>
                <td class="value">${formatCurrency(getAnnualValue(opp))}</td>
                <td>${opp.prescriber_name || 'Unknown'}</td>
                <td><span class="status status-${opp.status.toLowerCase().replace(/\s+/g, '-')}">${opp.status}</span></td>
                <td>${opp.insurance_bin || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #0d9488; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print / Save as PDF
          </button>
        </p>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  // Filter opportunities
  const filtered = groupedItems.map(g => ({
    ...g,
    opportunities: g.opportunities.filter(o => {
      // Hide Denied by default unless showDenied is true or specifically filtering for them
      if (o.status === 'Denied' && !showDenied && statusFilter !== 'Denied') return false;
      // Hide Completed by default unless showCompleted is true or specifically filtering for them
      if (o.status === 'Completed' && !showCompleted && filter !== 'completed' && statusFilter !== 'Completed') return false;
      // Hide Flagged from main view - they show in the Flagged queue
      if (o.status === 'Flagged' && filter !== 'flagged' && statusFilter !== 'Flagged') return false;
      // Hide "Didn't Work" from main view - they go to super admin queue
      if (o.status === "Didn't Work" && filter !== 'didnt_work' && statusFilter !== "Didn't Work") return false;
      // Status filter
      if (filter === 'not_submitted' && o.status !== 'Not Submitted') return false;
      if (filter === 'submitted' && o.status !== 'Submitted') return false;
      if (filter === 'approved' && o.status !== 'Approved') return false;
      if (filter === 'completed' && o.status !== 'Completed') return false;
      if (filter === 'flagged' && o.status !== 'Flagged') return false;
      if (filter === 'didnt_work' && o.status !== "Didn't Work") return false;
      // Specific status filter
      if (statusFilter && o.status !== statusFilter) return false;
      // Type filter from URL
      if (typeFilter && o.opportunity_type !== typeFilter) return false;
      // Search filter
      if (search) {
        const s = search.toLowerCase().trim();
        
        // Build searchable patient name variations
        const firstName = (o.patient_first_name || '').toLowerCase();
        const lastName = (o.patient_last_name || '').toLowerCase();
        const firstThree = firstName.slice(0, 3);
        const lastThree = lastName.slice(0, 3);
        
        // Match against multiple formats:
        // - "don,san" or "don, san" (formatted display)
        // - "donald" or "sanchez" (full names)
        // - "don san" or "san don" (either order, space separated)
        // - "donald sanchez" (full name space separated)
        const formattedName = `${lastThree},${firstThree}`.toLowerCase(); // "san,don"
        const formattedNameSpace = `${lastThree}, ${firstThree}`.toLowerCase(); // "san, don"
        const fullName = `${firstName} ${lastName}`.toLowerCase(); // "donald sanchez"
        const fullNameReverse = `${lastName} ${firstName}`.toLowerCase(); // "sanchez donald"
        const fullNameComma = `${lastName},${firstName}`.toLowerCase(); // "sanchez,donald"
        
        const matchesPatient = (
          firstName.includes(s) ||
          lastName.includes(s) ||
          formattedName.includes(s.replace(/\s+/g, '')) || // remove spaces from search
          formattedNameSpace.includes(s) ||
          fullName.includes(s) ||
          fullNameReverse.includes(s) ||
          fullNameComma.includes(s.replace(/\s+/g, ',')) ||
          o.patient_hash?.toLowerCase().includes(s)
        );
        
        const matchesDrug = (o.current_drug_name?.toLowerCase().includes(s) ||
                            o.recommended_drug_name?.toLowerCase().includes(s));
        const matchesPrescriber = o.prescriber_name?.toLowerCase().includes(s);
        const matchesInsurance = (
          o.insurance_bin?.toLowerCase().includes(s) ||
          o.insurance_group?.toLowerCase().includes(s) ||
          o.contract_id?.toLowerCase().includes(s)
        );
        
        if (!matchesPatient && !matchesDrug && !matchesPrescriber && !matchesInsurance) return false;
      }
      return true;
    }),
  })).filter(g => g.opportunities.length > 0);

  const filteredCount = filtered.reduce((s, g) => s + g.opportunities.length, 0);
  const filteredValue = filtered.reduce((s, g) => s + g.opportunities.reduce((ss, o) => ss + getAnnualValue(o), 0), 0);

  // Stats card click handler
  function handleStatClick(filterKey: string) {
    setFilter(filterKey);
  }

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Top Bar - Rounded Card */}
      <div className="px-8 pt-6">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">Opportunity Dashboard</h1>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-300">{stats.total} opportunities</span>
                {canViewFinancialData && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(stats.total_annual)} annual</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-[#14b8a6] font-medium">{formatCurrency(stats.total_annual / 12)}/mo</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-medium">Approved: {formatCurrency(stats.approved_annual)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-green-400 font-medium">Completed: {formatCurrency(stats.completed_annual)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Last synced: {lastSync.toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg text-sm" title="Export to CSV">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={exportToPDF} className="flex items-center gap-2 px-3 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg text-sm" title="Export to PDF">
                  <FileDown className="w-4 h-4" /> PDF
                </button>
                <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg text-sm">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Clickable - Now in a rounded card */}
      <div className="px-8 py-6">
        <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl p-6">
          <div className="grid grid-cols-5 gap-4">
            {[
              { key: 'all', label: 'TOTAL ACTIVE', value: stats.total, annual: stats.total_annual, color: 'teal', borderColor: 'border-t-[#14b8a6]' },
              { key: 'not_submitted', label: 'NOT SUBMITTED', value: stats.not_submitted, annual: stats.not_submitted_annual, color: 'amber', borderColor: 'border-t-amber-500' },
              { key: 'submitted', label: 'SUBMITTED', value: stats.submitted, annual: stats.submitted_annual, color: 'blue', borderColor: 'border-t-blue-500' },
              { key: 'approved', label: 'APPROVED', value: stats.approved, annual: stats.approved_annual, color: 'emerald', borderColor: 'border-t-emerald-500' },
              { key: 'completed', label: 'COMPLETED', value: stats.completed, annual: stats.completed_annual, color: 'green', borderColor: 'border-t-green-500' },
            ].map(card => (
              <div 
                key={card.key} 
                onClick={() => handleStatClick(card.key)}
                className={`bg-[#0a1628] border border-[#1e3a5f] ${card.borderColor} border-t-[3px] rounded-xl p-6 cursor-pointer hover:bg-[#1e3a5f]/30 transition-colors ${filter === card.key ? 'ring-2 ring-[#14b8a6]' : ''}`}
              >
              <div className="text-xs text-slate-400 uppercase tracking-wider">{card.label}</div>
              <div className={`text-3xl font-bold mt-2 ${
                card.color === 'teal' ? 'text-[#14b8a6]' :
                card.color === 'amber' ? 'text-amber-400' :
                card.color === 'blue' ? 'text-blue-400' :
                card.color === 'emerald' ? 'text-emerald-400' : 'text-green-400'
              }`}>{card.value}</div>
              {canViewFinancialData && (
                <div className="flex gap-2 mt-3">
                  <span className="text-xs px-2 py-1 bg-[#1e3a5f] text-slate-300 rounded">
                    {formatShortCurrency(card.annual)}/yr
                  </span>
                  <span className="text-xs px-2 py-1 bg-[#1e3a5f] text-slate-300 rounded">
                    {formatShortCurrency(card.annual / 12)}/mo
                  </span>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex bg-[#0d2137] border border-[#1e3a5f] rounded-lg p-1">
            {[
              { key: 'all', label: `All (${stats.total})` },
              { key: 'not_submitted', label: 'Not Submitted' },
              { key: 'submitted', label: 'Submitted' },
              { key: 'approved', label: 'Approved' },
              { key: 'flagged', label: `Flagged (${stats.flagged})`, color: 'purple' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setStatusFilter(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === f.key
                    ? f.color === 'purple' ? 'bg-purple-500 text-white' : 'bg-[#14b8a6] text-[#0a1628]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Status dropdown filter */}
          <select
            value={statusFilter || ''}
            onChange={(e) => { setStatusFilter(e.target.value || null); setFilter('all'); }}
            className="bg-[#0d2137] border border-[#1e3a5f] rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Statuses</option>
            <option value="Not Submitted">Not Submitted ({stats.not_submitted})</option>
            <option value="Submitted">Submitted ({stats.submitted})</option>
            <option value="Approved">Approved ({stats.approved})</option>
            <option value="Completed">Completed ({stats.completed})</option>
            <option value="Didn't Work">Didn't Work ({stats.didnt_work})</option>
            <option value="Flagged">Flagged ({stats.flagged})</option>
            <option value="Denied">Denied ({stats.denied})</option>
          </select>
          {/* Show Completed toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 rounded accent-[#14b8a6]"
            />
            Show Completed
          </label>
          {/* Show Denied toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showDenied}
              onChange={(e) => setShowDenied(e.target.checked)}
              className="w-4 h-4 rounded accent-[#14b8a6]"
            />
            Show Denied
          </label>
          {typeFilter && (
            <div className="flex items-center gap-2 ml-2">
              <span className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
                Type: {typeFilter.replace(/_/g, ' ')}
              </span>
              <button 
                onClick={() => { setTypeFilter(null); window.history.replaceState({}, '', '/dashboard/opportunities'); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Clear
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-slate-400">Group by:</span>
            <select 
              value={groupBy}
              onChange={(e) => { setGroupBy(e.target.value); setExpanded(new Set()); }}
              className="bg-[#0d2137] border border-[#1e3a5f] rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="patient">Patient</option>
              <option value="bin">BIN</option>
              <option value="group">Group</option>
              <option value="category">Category</option>
              <option value="contract">Contract</option>
              <option value="prescriber">Prescriber</option>
            </select>
          </div>
          <button onClick={() => setExpanded(new Set(groupedItems.map(g => g.id)))} className="text-sm text-slate-400 hover:text-white ml-4">
            Expand All
          </button>
          <button onClick={() => setExpanded(new Set())} className="text-sm text-slate-400 hover:text-white">
            Collapse All
          </button>
        </div>
        <div className="text-sm text-slate-400">
          {filteredCount} opportunities{canViewFinancialData && <> • <span className="text-[#14b8a6] font-medium">{formatCurrency(filteredValue)}</span> annual value</>}
        </div>
      </div>

      {/* Grouped List */}
      <div className="px-8 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[#14b8a6] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-[#0d2137] rounded-xl border border-[#1e3a5f]">
            <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No opportunities found</h3>
            <p className="text-slate-400">Try adjusting your filters or run the scanner.</p>
          </div>
        ) : (
          filtered.map(group => {
            const isExpanded = expanded.has(group.id);
            const approvedCount = group.opportunities.filter(o => o.status === 'Approved').length;
            const completedCount = group.opportunities.filter(o => o.status === 'Completed').length;
            const groupTotal = group.opportunities.reduce((s, o) => s + getAnnualValue(o), 0);
            
            return (
              <div key={group.id} className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl overflow-hidden">
                {/* Group Header */}
                <div
                  onClick={() => {
                    const next = new Set(expanded);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    setExpanded(next);
                  }}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#1e3a5f]/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
                      {groupBy === 'patient' ? getInitials(group.last_name || group.label) : group.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {groupBy === 'patient' 
                            ? formatPatientName(group.first_name, group.last_name, group.label, isDemo)
                            : group.label}
                        </span>
                        {groupBy === 'patient' && group.opportunities[0] && (
                          <InsuranceTags opp={group.opportunities[0]} size="sm" />
                        )}
                        {group.sublabel && (
                          <span className="text-xs text-slate-400">({group.sublabel})</span>
                        )}
                      </div>
                      {groupBy === 'patient' && (
                        <div className="text-sm text-slate-400">DOB: {formatDate(group.date_of_birth || '')}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      {canViewFinancialData && (
                        <div className="text-[#14b8a6] font-semibold">{formatCurrency(groupTotal)}</div>
                      )}
                      <div className="text-xs text-slate-400">{group.opportunities.length} opps{approvedCount > 0 && ` • ${approvedCount} approved`}{completedCount > 0 && ` • ${completedCount} completed`}</div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Opportunities Table */}
                {isExpanded && (
                  <div className="border-t border-[#1e3a5f]">
                    <table className="w-full">
                      <thead className="bg-[#1e3a5f]/50">
                        <tr>
                          {groupBy !== 'patient' && (
                            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Patient</th>
                          )}
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Opportunity</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Action</th>
                          {canViewFinancialData && (
                            <>
                              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Per Fill / Annual</th>
                              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Avg Qty</th>
                            </>
                          )}
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Prescriber</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Last Actioned</th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Notes</th>
                          <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.opportunities.map(opp => {
                          const [rationale, action] = (opp.clinical_rationale || '').split('\n\nAction: ');
                          return (
                            <tr key={opp.opportunity_id} className="border-t border-[#1e3a5f] hover:bg-[#1e3a5f]/30">
                              {groupBy !== 'patient' && (
                                <td className="px-5 py-3">
                                  <div className="font-medium text-white">
                                    {formatPatientName(opp.patient_first_name, opp.patient_last_name, opp.patient_hash, isDemo)}
                                  </div>
                                  <InsuranceTags opp={opp} size="xs" />
                                </td>
                              )}
                              <td className="px-5 py-3">
                                <div className="text-white font-medium">
                                  {opp.current_drug_name || 'N/A'} → <span className="text-[#14b8a6]">{opp.recommended_drug_name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="text-sm text-slate-400 max-w-xs truncate">{action || rationale}</div>
                              </td>
                              {canViewFinancialData && (
                                <>
                                  <td className="px-5 py-3">
                                    <div>
                                      <div className="text-emerald-400 font-semibold">{formatCurrency(Number(opp.potential_margin_gain) || 0)}</div>
                                      <div className="text-xs text-slate-500">{formatCurrency(getAnnualValue(opp))}/yr</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="text-sm text-slate-400">
                                      {opp.avg_dispensed_qty ? Number(opp.avg_dispensed_qty).toFixed(1) : '-'}
                                    </div>
                                  </td>
                                </>
                              )}
                              <td className="px-5 py-3">
                                <div className="text-sm text-slate-300">{opp.prescriber_name || 'Unknown'}</div>
                              </td>
                              <td className="px-5 py-3">
                                <StatusDropdown status={opp.status} onChange={s => updateStatus(opp.opportunity_id, s)} />
                              </td>
                              <td className="px-5 py-3">
                                <div className="text-sm text-slate-400">
                                  {opp.actioned_at ? new Date(opp.actioned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNotesModal(opp); }}
                                  className={`p-1.5 rounded hover:bg-[#2d4a6f] ${opp.staff_notes ? 'text-[#14b8a6]' : 'text-slate-500'}`}
                                  title={opp.staff_notes || 'Add notes'}
                                >
                                  <StickyNote className="w-4 h-4" />
                                </button>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <button
                                  onClick={() => { setSelectedOpp(opp); setSelectedGroup(group); }}
                                  className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded text-sm"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Side Panel */}
      {selectedOpp && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setSelectedOpp(null); setSelectedGroup(null); }} />
          <SidePanel
            opportunity={selectedOpp}
            groupItem={selectedGroup}
            onClose={() => { setSelectedOpp(null); setSelectedGroup(null); }}
            onStatusChange={updateStatus}
            isDemo={isDemo}
            showFinancials={canViewFinancialData}
          />
        </>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <NotesModal
          opportunity={notesModal}
          onClose={() => setNotesModal(null)}
          onSave={updateNotes}
        />
      )}

      {/* Prescriber Warning Modal */}
      {prescriberWarning && (
        <PrescriberWarningModal
          warningData={prescriberWarning.data}
          onClose={() => setPrescriberWarning(null)}
          onProceed={async () => {
            const { id, status } = prescriberWarning.pendingUpdate;
            setPrescriberWarning(null);
            await performStatusUpdate(id, status);
          }}
        />
      )}
    </div>
  );
}
