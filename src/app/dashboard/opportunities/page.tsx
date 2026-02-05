'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function formatNdc(ndc: string | null | undefined): string {
  if (!ndc) return '';
  const clean = ndc.replace(/\D/g, '');
  if (clean.length === 11) return `${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
  if (clean.length === 10) return `0${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
  return ndc;
}

interface Pharmacy {
  pharmacy_name: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  npi?: string;
}

// Types
interface Opportunity {
  opportunity_id: string;
  patient_id: string;
  prescription_id: string;
  opportunity_type: string;
  current_ndc: string;
  current_drug_name: string;
  recommended_drug_name: string;
  recommended_ndc?: string;
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
  prescriber_npi?: string;
  coverage_confidence?: 'verified' | 'likely' | 'unknown' | 'excluded';
  verified_claim_count?: number;
  avg_reimbursement?: number;
  alternatives?: Array<{
    opportunity_id: string;
    recommended_drug_name: string;
    potential_margin_gain: number;
    annual_margin_gain: number;
    coverage_confidence?: string;
    avg_dispensed_qty?: number | null;
  }>;
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
  unknown_coverage_count: number;
  unknown_coverage_annual: number;
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
  // Handle YYYY-MM-DD format - parse as local date to avoid timezone shift
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

// Parse date string as local date (avoids UTC timezone shift)
function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return new Date(dateStr);
}

function getInitials(str: string) {
  if (!str) return 'PT';
  return str.slice(0, 2).toUpperCase();
}

function formatPatientName(firstName?: string, lastName?: string, hash?: string, isDemo?: boolean) {
  // HIPAA: Only show 3 letters of each name for real clients, full names for demo only
  const properCase = (str?: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  if (firstName && lastName) {
    if (isDemo) {
      // Demo account shows full names
      return `${properCase(firstName)} ${properCase(lastName)}`;
    } else {
      // HIPAA compliant: 3-letter truncation
      const f = lastName.slice(0, 3).toUpperCase();
      const l = firstName.slice(0, 3).toUpperCase();
      return `${f},${l}`;
    }
  }
  if (lastName) return isDemo ? properCase(lastName) : lastName.slice(0, 3).toUpperCase();
  if (firstName) return isDemo ? properCase(firstName) : firstName.slice(0, 3).toUpperCase();
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

// Coverage Confidence Badge - shows how confident we are this opportunity will be paid
function CoverageConfidenceBadge({ confidence, size = 'sm' }: { confidence?: string; size?: 'sm' | 'xs' }) {
  const config: Record<string, { bg: string; text: string; label: string; tooltip: string }> = {
    verified: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      label: 'Verified',
      tooltip: 'Paid claims found for this BIN+Group'
    },
    likely: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      label: 'Likely',
      tooltip: 'Paid claims on this BIN, but Group unverified. Test first.'
    },
    unknown: {
      bg: 'bg-slate-500/20',
      text: 'text-slate-400',
      label: 'Unknown',
      tooltip: 'No coverage data available for this insurance'
    },
    excluded: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      label: 'Excluded',
      tooltip: 'Known not to work for this BIN+Group'
    }
  };

  const level = confidence && config[confidence] ? confidence : 'unknown';
  const { bg, text, label, tooltip } = config[level];
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className={`${sizeClass} ${bg} ${text} rounded font-medium cursor-default`} title={tooltip}>
      {level === 'verified' && <span className="mr-0.5">&#10003;</span>}
      {level === 'excluded' && <span className="mr-0.5">&#10007;</span>}
      {label}
    </span>
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
  allOpportunitiesData = [],
  onClose,
  onStatusChange,
  isDemo,
  showFullFinancials = true,
  showLimitedFinancials = false,
  pharmacy,
  groupBy = 'patient',
}: {
  opportunity: Opportunity | null;
  groupItem: GroupedItem | null;
  allOpportunitiesData?: Opportunity[];
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  isDemo?: boolean;
  showFullFinancials?: boolean;
  showLimitedFinancials?: boolean;
  pharmacy?: Pharmacy | null;
  groupBy?: string;
}) {
  const showAnyFinancials = showFullFinancials || showLimitedFinancials;
  const [generating, setGenerating] = useState(false);
  const [selectedForFax, setSelectedForFax] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [equivalency, setEquivalency] = useState<{ table: { className: string; columns: string[]; rows: { drug: string; values: string[] }[]; note: string } | null; matchedRow: number | null } | null>(null);
  const [eqOpen, setEqOpen] = useState(true);

  // Fax send state
  const [faxModalOpen, setFaxModalOpen] = useState(false);
  const [faxNumber, setFaxNumber] = useState('');
  const [faxPreflight, setFaxPreflight] = useState<{
    canSend: boolean;
    warnings: string[];
    savedFaxNumber?: string;
    dailyCount?: number;
    dailyLimit?: number;
  } | null>(null);
  const [faxLoading, setFaxLoading] = useState(false);
  const [faxSending, setFaxSending] = useState(false);
  const [npiConfirmed, setNpiConfirmed] = useState(false);

  // Run preflight check when opening fax modal
  async function runPreflightCheck() {
    if (!opportunity) return;
    setFaxLoading(true);
    setFaxPreflight(null);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/fax/preflight`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId: opportunity.opportunity_id,
          prescriberNpi: opportunity.prescriber_npi,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFaxPreflight({ canSend: false, warnings: [data.error || 'Preflight check failed'] });
      } else {
        setFaxPreflight(data);
        if (data.savedFaxNumber) {
          setFaxNumber(data.savedFaxNumber);
        }
      }
    } catch (e) {
      setFaxPreflight({ canSend: false, warnings: ['Network error during preflight check'] });
    } finally {
      setFaxLoading(false);
    }
  }

  // Send fax via Notifyre
  async function sendFaxNow() {
    if (!opportunity || !faxNumber || !npiConfirmed) return;
    setFaxSending(true);
    try {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/fax/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId: opportunity.opportunity_id,
          prescriberFaxNumber: faxNumber,
          prescriberNpi: opportunity.prescriber_npi,
          npiConfirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to send fax');
      } else {
        alert('Fax queued for delivery! The opportunity has been marked as Submitted.');
        setFaxModalOpen(false);
        setFaxNumber('');
        setNpiConfirmed(false);
        setFaxPreflight(null);
        // Update the status in the UI
        onStatusChange(opportunity.opportunity_id, 'Submitted');
      }
    } catch (e) {
      alert('Network error while sending fax');
    } finally {
      setFaxSending(false);
    }
  }

  // Open fax modal and run preflight
  function openFaxModal() {
    setFaxModalOpen(true);
    setNpiConfirmed(false);
    runPreflightCheck();
  }

  useEffect(() => {
    if (!opportunity?.recommended_drug_name) { setEquivalency(null); return; }
    const token = localStorage.getItem('therxos_token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/opportunities/equivalency?drug=${encodeURIComponent(opportunity.recommended_drug_name)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setEquivalency(data?.table ? data : null))
      .catch(() => setEquivalency(null));
  }, [opportunity?.recommended_drug_name]);

  if (!opportunity || !groupItem) return null;

  const [rationale, action] = (opportunity.clinical_rationale || '').split('\n\nAction: ');

  // ALWAYS show all opportunities for the selected patient (better UX when searching)
  // This ensures clicking any opp expands to show the full patient context
  const patientOpportunities = allOpportunitiesData.filter(o => o.patient_id === opportunity.patient_id);
  const allOpportunities = patientOpportunities.length > 0 ? patientOpportunities : [opportunity];

  // Batch fax is ONLY allowed when grouped by patient (HIPAA requirement: 1 patient per fax)
  const isPatientGrouped = groupBy === 'patient';
  const canUseBatchMode = isPatientGrouped && allOpportunities.length > 1;

  const byPrescriber = allOpportunities.reduce((acc, opp) => {
    const prescriber = opp.prescriber_name || 'Unknown Prescriber';
    if (!acc[prescriber]) acc[prescriber] = [];
    acc[prescriber].push(opp);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  // Toggle opportunity selection for batch fax
  const toggleSelection = (oppId: string, prescriber: string) => {
    const newSelected = new Set(selectedForFax);
    if (newSelected.has(oppId)) {
      newSelected.delete(oppId);
    } else {
      // Only allow selecting from same prescriber
      const currentPrescriber = allOpportunities.find(o => selectedForFax.has(o.opportunity_id))?.prescriber_name;
      if (currentPrescriber && currentPrescriber !== prescriber) {
        alert('You can only batch opportunities for the same prescriber. Clear selection to choose a different prescriber.');
        return;
      }
      newSelected.add(oppId);
    }
    setSelectedForFax(newSelected);
  };

  // Select all for a prescriber
  const selectAllForPrescriber = (prescriber: string) => {
    const opps = byPrescriber[prescriber] || [];
    const allSelected = opps.every(o => selectedForFax.has(o.opportunity_id));
    const newSelected = new Set<string>();
    if (!allSelected) {
      opps.forEach(o => newSelected.add(o.opportunity_id));
    }
    setSelectedForFax(newSelected);
  };

  // Get selected opportunities
  const getSelectedOpportunities = () => allOpportunities.filter(o => selectedForFax.has(o.opportunity_id));

  // Generate fax PDF for this opportunity - matches TIF.pdf format
  async function generateFaxPDF() {
    if (!opportunity || !groupItem) return;
    setGenerating(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const form = pdfDoc.getForm();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const { width, height } = page.getSize();
      const margin = 36;
      const contentWidth = width - (margin * 2);
      const navyBlue = rgb(30/255, 58/255, 95/255);
      const sz = 8; // standard text size
      const szBold = 8; // standard bold text size
      const fieldHeight = 15;

      let y = height - 36;
      let fieldCounter = 0;

      // Helper to draw section header
      const drawHeader = (text: string) => {
        page.drawRectangle({ x: margin, y: y - 13, width: contentWidth, height: 15, color: navyBlue });
        page.drawText(text, { x: margin + 4, y: y - 10, size: szBold, font: fontBold, color: rgb(1, 1, 1) });
        y -= 17;
      };

      // Helper to add text field
      const addTextField = (name: string, x: number, yPos: number, w: number, h: number, defaultValue: string = '') => {
        const fieldName = `${name}_${fieldCounter++}`;
        const textField = form.createTextField(fieldName);
        textField.addToPage(page, { x, y: yPos - h + 2, width: w, height: h, borderWidth: 1 });
        if (defaultValue) textField.setText(defaultValue);
        return textField;
      };

      // Helper to add checkbox
      const addCheckbox = (name: string, x: number, yPos: number, checked: boolean = false) => {
        const fieldName = `${name}_${fieldCounter++}`;
        const checkbox = form.createCheckBox(fieldName);
        checkbox.addToPage(page, { x, y: yPos - 10, width: 10, height: 10 });
        if (checked) checkbox.check();
        return checkbox;
      };

      // Title
      page.drawText('Prescription Request Form', { x: width / 2 - 80, y: y, size: 12, font: fontBold });
      y -= 14;
      page.drawText('Therapeutic Interchange / New Prescription Request', { x: width / 2 - 120, y: y, size: sz, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 16;

      // Important notice box
      page.drawRectangle({ x: margin, y: y - 28, width: contentWidth, height: 30, color: rgb(255/255, 248/255, 230/255), borderColor: rgb(200/255, 170/255, 80/255), borderWidth: 0.5 });
      page.drawText('IMPORTANT: This is a REQUEST for a new prescription.', { x: margin + 5, y: y - 8, size: szBold, font: fontBold });
      page.drawText('We are requesting your consideration to prescribe the recommended medication below based on the', { x: margin + 5, y: y - 18, size: 7, font });
      page.drawText("patient's clinical needs and/or insurance formulary preferences. This is NOT a report of an existing prescription.", { x: margin + 5, y: y - 27, size: 7, font });
      y -= 34;

      // Date received field
      page.drawText('Date request received:', { x: width - margin - 160, y: y, size: sz, font });
      addTextField('date_received', width - margin - 65, y + 3, 65, fieldHeight, '');
      y -= 18;

      // PHARMACY SECTION
      drawHeader('Requesting Pharmacy Information');

      // Row 1
      page.drawText('Date Submitted:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('date_submitted', margin + 78, y - 2, 90, fieldHeight, new Date().toLocaleDateString('en-US'));
      page.drawText('Contact Person:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_contact', margin + contentWidth/2 + 78, y - 2, 145, fieldHeight, '');
      y -= 18;

      // Row 2
      page.drawText('Pharmacy Name:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_name', margin + 82, y - 2, 145, fieldHeight, pharmacy?.pharmacy_name || '');
      page.drawText('NPI:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_npi', margin + contentWidth/2 + 28, y - 2, 100, fieldHeight, pharmacy?.npi || '');
      y -= 18;

      // Row 3
      page.drawText('Phone:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_phone', margin + 40, y - 2, 100, fieldHeight, pharmacy?.phone || '');
      page.drawText('Fax:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_fax', margin + contentWidth/2 + 26, y - 2, 100, fieldHeight, pharmacy?.fax || '');
      y -= 22;

      // PRESCRIBER SECTION
      drawHeader('Prescriber Information');

      page.drawText('Prescriber Name:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('prescriber_name', margin + 88, y - 2, 148, fieldHeight, opportunity.prescriber_name || '');
      page.drawText('NPI:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('prescriber_npi', margin + contentWidth/2 + 28, y - 2, 100, fieldHeight, '');
      y -= 18;

      page.drawText('Practice Name:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('practice_name', margin + 76, y - 2, 160, fieldHeight, '');
      page.drawText('Fax:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('prescriber_fax', margin + contentWidth/2 + 26, y - 2, 100, fieldHeight, '');
      y -= 22;

      // PATIENT SECTION
      drawHeader('Patient Information');

      const patientName = groupItem.first_name && groupItem.last_name
        ? `${groupItem.first_name} ${groupItem.last_name}`
        : '';
      const dob = groupItem.date_of_birth
        ? (parseLocalDate(groupItem.date_of_birth)?.toLocaleDateString('en-US') || '')
        : '';

      page.drawText('Patient Name:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('patient_name', margin + 72, y - 2, 165, fieldHeight, patientName);
      page.drawText('Date of Birth:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('patient_dob', margin + contentWidth/2 + 68, y - 2, 90, fieldHeight, dob);
      y -= 18;

      page.drawText('Member/Rx ID:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('member_id', margin + 74, y - 2, 100, fieldHeight, '');
      page.drawText('Insurance:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('insurance', margin + contentWidth/2 + 52, y - 2, 120, fieldHeight, opportunity.plan_name || '');
      y -= 22;

      // CURRENT MEDICATION
      drawHeader("Patient's Current Medication");

      page.drawText('Drug Name/Strength:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('current_drug', margin + 100, y - 2, 200, fieldHeight, opportunity.current_drug_name || '');
      y -= 18;
      page.drawText('NDC:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('current_ndc', margin + 30, y - 2, 120, fieldHeight, opportunity.current_ndc || '');
      page.drawText('Days Supply:', { x: margin + 190, y: y - 10, size: sz, font: fontBold });
      addTextField('current_days', margin + 250, y - 2, 50, fieldHeight, '');
      page.drawText('Refills:', { x: margin + 320, y: y - 10, size: sz, font: fontBold });
      addTextField('current_refills', margin + 356, y - 2, 50, fieldHeight, '');
      y -= 22;

      // REQUESTED NEW PRESCRIPTION
      drawHeader('Requested New Prescription (Therapeutic Alternative)');

      page.drawText('Drug Name/Strength:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('rec_drug', margin + 100, y - 2, 200, fieldHeight, opportunity.recommended_drug_name || '');
      y -= 18;
      page.drawText('NDC:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('rec_ndc', margin + 30, y - 2, 120, fieldHeight, '');
      page.drawText('Days Supply:', { x: margin + 190, y: y - 10, size: sz, font: fontBold });
      addTextField('rec_days', margin + 250, y - 2, 50, fieldHeight, '');
      page.drawText('Refills:', { x: margin + 320, y: y - 10, size: sz, font: fontBold });
      addTextField('rec_refills', margin + 356, y - 2, 50, fieldHeight, '');
      y -= 22;

      // INTERCHANGE TYPE
      drawHeader('Request Type');

      const oppType = (opportunity.opportunity_type || '').toLowerCase();
      addCheckbox('type_generic', margin + 8, y, oppType.includes('generic'));
      page.drawText('Generic Substitution', { x: margin + 22, y: y - 9, size: sz, font });
      addCheckbox('type_therapeutic', margin + 150, y, oppType.includes('therapeutic') || oppType.includes('interchange'));
      page.drawText('Therapeutic Alternative', { x: margin + 164, y: y - 9, size: sz, font });
      addCheckbox('type_formulary', margin + 310, y, oppType.includes('formulary'));
      page.drawText('Formulary Preferred', { x: margin + 324, y: y - 9, size: sz, font });
      y -= 22;

      // CLINICAL RATIONALE
      drawHeader('Clinical Rationale / Reason for Request');

      const rationaleText = rationale || opportunity.clinical_rationale || '';
      const rationaleField = addTextField('rationale', margin + 4, y - 2, contentWidth - 8, 45, rationaleText);
      rationaleField.enableMultiline();
      rationaleField.setFontSize(sz);
      y -= 52;

      // PRESCRIBER RESPONSE
      drawHeader('Prescriber Response');

      page.drawText('Please indicate your decision regarding this prescription request:', { x: margin + 4, y: y - 10, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 14;
      addCheckbox('resp_approved', margin + 8, y, false);
      page.drawText('APPROVED - Please write a new prescription as requested above', { x: margin + 22, y: y - 9, size: sz, font });
      y -= 14;
      addCheckbox('resp_denied', margin + 8, y, false);
      page.drawText('DENIED - Continue current medication, do not write new prescription', { x: margin + 22, y: y - 9, size: sz, font });
      y -= 18;

      page.drawText('If denied, reason:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('denied_reason', margin + 90, y - 2, contentWidth - 95, fieldHeight, '');
      y -= 22;

      // AUTHORIZATION
      drawHeader('Prescriber Authorization');

      page.drawText('Prescriber Signature:', { x: margin + 4, y: y - 12, size: sz, font: fontBold });
      page.drawLine({ start: { x: margin + 100, y: y - 12 }, end: { x: margin + 340, y: y - 12 }, thickness: 1 });
      page.drawText('Date:', { x: margin + 360, y: y - 12, size: sz, font: fontBold });
      addTextField('sig_date', margin + 385, y - 4, 80, fieldHeight, '');
      y -= 22;

      // INSTRUCTIONS
      drawHeader('Response Instructions');
      const instructionText = pharmacy?.fax
        ? `Please sign and fax this completed form back to ${pharmacy.fax}. Thank you for your partnership in optimizing patient care.`
        : 'Please sign and fax this completed form back to the pharmacy. Thank you for your partnership in optimizing patient care.';
      page.drawText(instructionText, { x: margin + 4, y: y - 12, size: sz, font });

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const prescriberSlug = (opportunity.prescriber_name || 'prescriber').replace(/[^a-z0-9]/gi, '_');
      const patientSlug = (patientName || 'patient').replace(/[^a-z0-9]/gi, '_');
      link.download = `TIF_${patientSlug}_${prescriberSlug}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      // Log to fax history
      try {
        const faxHistory = JSON.parse(localStorage.getItem('therxos_fax_history') || '[]');
        faxHistory.unshift({
          id: `fax_${Date.now()}`,
          generated_at: new Date().toISOString(),
          prescriber_name: opportunity.prescriber_name || 'Unknown Prescriber',
          patient_name: patientName,
          patient_id: opportunity.patient_id,
          opportunity_ids: [opportunity.opportunity_id],
          opportunity_count: 1,
          status: 'pending',
          days_since_generated: 0,
        });
        localStorage.setItem('therxos_fax_history', JSON.stringify(faxHistory.slice(0, 100)));
      } catch (e) {
        console.error('Failed to save fax history:', e);
      }

    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  // Generate batch fax PDF for multiple opportunities (same patient, same prescriber)
  async function generateBatchFaxPDF() {
    const selectedOpps = getSelectedOpportunities();
    if (selectedOpps.length === 0) {
      alert('Please select at least one opportunity to include in the fax.');
      return;
    }
    if (!groupItem) return;
    setGenerating(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const form = pdfDoc.getForm();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const { width, height } = page.getSize();
      const margin = 36;
      const contentWidth = width - (margin * 2);
      const navyBlue = rgb(30/255, 58/255, 95/255);
      const lightGray = rgb(245/255, 245/255, 245/255);
      const sz = 8;
      const szBold = 8;
      const fieldHeight = 15;

      let y = height - 36;
      let fieldCounter = 0;

      // Helper to draw section header
      const drawHeader = (text: string) => {
        page.drawRectangle({ x: margin, y: y - 13, width: contentWidth, height: 15, color: navyBlue });
        page.drawText(text, { x: margin + 4, y: y - 10, size: szBold, font: fontBold, color: rgb(1, 1, 1) });
        y -= 17;
      };

      // Helper to add text field
      const addTextField = (name: string, x: number, yPos: number, w: number, h: number, defaultValue: string = '') => {
        const fieldName = `${name}_${fieldCounter++}`;
        const textField = form.createTextField(fieldName);
        textField.addToPage(page, { x, y: yPos - h + 2, width: w, height: h, borderWidth: 1 });
        if (defaultValue) textField.setText(defaultValue);
        return textField;
      };

      // Helper to add checkbox
      const addCheckbox = (name: string, x: number, yPos: number, checked: boolean = false) => {
        const fieldName = `${name}_${fieldCounter++}`;
        const checkbox = form.createCheckBox(fieldName);
        checkbox.addToPage(page, { x, y: yPos - 10, width: 10, height: 10 });
        if (checked) checkbox.check();
        return checkbox;
      };

      // Title
      page.drawText('Prescription Request Form', { x: width / 2 - 80, y: y, size: 12, font: fontBold });
      y -= 14;
      page.drawText(`${selectedOpps.length} Therapeutic Interchange ${selectedOpps.length === 1 ? 'Request' : 'Requests'}`, { x: width / 2 - 85, y: y, size: sz, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 16;

      // Important notice box
      page.drawRectangle({ x: margin, y: y - 28, width: contentWidth, height: 30, color: rgb(255/255, 248/255, 230/255), borderColor: rgb(200/255, 170/255, 80/255), borderWidth: 0.5 });
      page.drawText('IMPORTANT: This is a REQUEST for new prescription(s).', { x: margin + 5, y: y - 8, size: szBold, font: fontBold });
      page.drawText('We are requesting your consideration to prescribe the recommended medication(s) below based on the', { x: margin + 5, y: y - 18, size: 7, font });
      page.drawText("patient's clinical needs and/or insurance formulary preferences. This is NOT a report of existing prescriptions.", { x: margin + 5, y: y - 27, size: 7, font });
      y -= 34;

      // Date received field
      page.drawText('Date request received:', { x: width - margin - 160, y: y, size: sz, font });
      addTextField('date_received', width - margin - 65, y + 3, 65, fieldHeight, '');
      y -= 16;

      // PHARMACY SECTION
      drawHeader('Requesting Pharmacy Information');

      // Row 1
      page.drawText('Date Submitted:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('date_submitted', margin + 78, y - 2, 90, fieldHeight, new Date().toLocaleDateString('en-US'));
      page.drawText('NPI:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_npi', margin + contentWidth/2 + 28, y - 2, 100, fieldHeight, pharmacy?.npi || '');
      y -= 18;

      // Row 2
      page.drawText('Pharmacy Name:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_name', margin + 82, y - 2, 145, fieldHeight, pharmacy?.pharmacy_name || '');
      page.drawText('Fax:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('pharmacy_fax', margin + contentWidth/2 + 26, y - 2, 100, fieldHeight, pharmacy?.fax || '');
      y -= 20;

      // PRESCRIBER SECTION
      const prescriberName = selectedOpps[0]?.prescriber_name || 'Unknown Prescriber';
      drawHeader('Prescriber Information');

      page.drawText('Prescriber Name:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('prescriber_name', margin + 88, y - 2, 195, fieldHeight, prescriberName);
      page.drawText('Fax:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('prescriber_fax', margin + contentWidth/2 + 26, y - 2, 100, fieldHeight, '');
      y -= 20;

      // PATIENT SECTION
      drawHeader('Patient Information');

      const patientName = groupItem.first_name && groupItem.last_name
        ? `${groupItem.first_name} ${groupItem.last_name}`
        : 'Patient';
      const dob = groupItem.date_of_birth
        ? (parseLocalDate(groupItem.date_of_birth)?.toLocaleDateString('en-US') || '')
        : '';

      page.drawText('Patient Name:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('patient_name', margin + 72, y - 2, 165, fieldHeight, patientName);
      page.drawText('Date of Birth:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('patient_dob', margin + contentWidth/2 + 68, y - 2, 90, fieldHeight, dob);
      y -= 18;

      const binPcn = [selectedOpps[0]?.insurance_bin, selectedOpps[0]?.insurance_pcn].filter(Boolean).join('/');
      page.drawText('Insurance:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('insurance', margin + 52, y - 2, 185, fieldHeight, selectedOpps[0]?.plan_name || '');
      page.drawText('BIN/PCN:', { x: margin + contentWidth/2 + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('bin_pcn', margin + contentWidth/2 + 48, y - 2, 100, fieldHeight, binPcn);
      y -= 20;

      // MEDICATIONS TABLE
      drawHeader('Requested New Prescriptions (Therapeutic Interchanges)');

      // Table header
      const col1Width = contentWidth * 0.50;
      const col2Width = contentWidth * 0.50;
      page.drawRectangle({ x: margin, y: y - 15, width: contentWidth, height: 15, color: lightGray });
      page.drawText("Patient's Current Medication", { x: margin + 4, y: y - 10, size: 7, font: fontBold });
      page.drawText('Requested New Prescription', { x: margin + col1Width + 4, y: y - 10, size: 7, font: fontBold });
      y -= 17;

      // Table rows with fillable fields for each medication
      for (let i = 0; i < selectedOpps.length; i++) {
        const opp = selectedOpps[i];
        // Draw row borders
        page.drawRectangle({ x: margin, y: y - 17, width: col1Width, height: 17, borderWidth: 0.5, borderColor: rgb(0.8, 0.8, 0.8) });
        page.drawRectangle({ x: margin + col1Width, y: y - 17, width: col2Width, height: 17, borderWidth: 0.5, borderColor: rgb(0.8, 0.8, 0.8) });

        // Add fillable text fields
        addTextField(`current_${i}`, margin + 2, y - 1, col1Width - 4, 14, opp.current_drug_name || '');
        addTextField(`recommended_${i}`, margin + col1Width + 2, y - 1, col2Width - 4, 14, opp.recommended_drug_name || '');
        y -= 17;
      }
      y -= 6;

      // CLINICAL RATIONALE
      drawHeader('Clinical Rationale / Reason for Request');

      // Build combined rationale text
      const rationaleLines: string[] = [];
      for (const opp of selectedOpps.slice(0, 4)) {
        const rat = (opp.clinical_rationale || '').split('\n')[0].substring(0, 80);
        rationaleLines.push(`• ${opp.current_drug_name}: ${rat}`);
      }
      if (selectedOpps.length > 4) {
        rationaleLines.push(`... and ${selectedOpps.length - 4} more interchange requests`);
      }
      const rationaleText = rationaleLines.join('\n');

      const rationaleField = addTextField('rationale', margin + 4, y - 2, contentWidth - 8, 50, rationaleText);
      rationaleField.enableMultiline();
      rationaleField.setFontSize(sz);
      y -= 56;

      // PRESCRIBER RESPONSE
      drawHeader('Prescriber Response');

      page.drawText('Please indicate your decision regarding these prescription requests:', { x: margin + 4, y: y - 10, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 14;
      addCheckbox('resp_approved', margin + 8, y, false);
      page.drawText('APPROVED - Please write new prescription(s) as requested above', { x: margin + 22, y: y - 9, size: sz, font });
      y -= 14;
      addCheckbox('resp_denied', margin + 8, y, false);
      page.drawText('DENIED - Continue current medication(s), do not write new prescription(s)', { x: margin + 22, y: y - 9, size: sz, font });
      y -= 18;

      page.drawText('If denied, reason:', { x: margin + 4, y: y - 10, size: sz, font: fontBold });
      addTextField('denied_reason', margin + 90, y - 2, contentWidth - 95, fieldHeight, '');
      y -= 22;

      // AUTHORIZATION
      drawHeader('Prescriber Authorization');

      page.drawText('Prescriber Signature:', { x: margin + 4, y: y - 12, size: sz, font: fontBold });
      page.drawLine({ start: { x: margin + 100, y: y - 12 }, end: { x: margin + 340, y: y - 12 }, thickness: 1 });
      page.drawText('Date:', { x: margin + 360, y: y - 12, size: sz, font: fontBold });
      addTextField('sig_date', margin + 385, y - 4, 80, fieldHeight, '');
      y -= 22;

      // INSTRUCTIONS
      drawHeader('Response Instructions');
      const instructionText = pharmacy?.fax
        ? `Please sign and fax this completed form back to ${pharmacy.fax}. Thank you for your partnership in optimizing patient care.`
        : 'Please sign and fax this completed form back to the pharmacy. Thank you for your partnership in optimizing patient care.';
      page.drawText(instructionText, { x: margin + 4, y: y - 12, size: sz, font });

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const prescriberSlug = prescriberName.replace(/[^a-z0-9]/gi, '_');
      const patientSlug = patientName.replace(/[^a-z0-9]/gi, '_');
      link.download = `TIF_BATCH_${patientSlug}_${prescriberSlug}_${selectedOpps.length}opps_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      // Log to fax history
      try {
        const faxHistory = JSON.parse(localStorage.getItem('therxos_fax_history') || '[]');
        faxHistory.unshift({
          id: `fax_${Date.now()}`,
          generated_at: new Date().toISOString(),
          prescriber_name: prescriberName,
          patient_name: patientName,
          patient_id: selectedOpps[0]?.patient_id,
          opportunity_ids: selectedOpps.map(o => o.opportunity_id),
          opportunity_count: selectedOpps.length,
          status: 'pending',
          days_since_generated: 0,
        });
        localStorage.setItem('therxos_fax_history', JSON.stringify(faxHistory.slice(0, 100)));
      } catch (e) {
        console.error('Failed to save fax history:', e);
      }

      // Clear selection after generating
      setSelectedForFax(new Set());

    } catch (e) {
      console.error('Batch PDF generation failed:', e);
      alert('Failed to generate batch PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <aside className="fixed inset-y-0 right-0 w-[480px] bg-[#0d2137] border-l border-[#1e3a5f] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3a5f]">
        <span className="font-semibold text-white">
          {viewMode === 'batch' ? 'Batch Fax Builder' : 'Opportunity Details'}
        </span>
        <div className="flex items-center gap-2">
          {canUseBatchMode && (
            <button
              onClick={() => {
                setViewMode(viewMode === 'single' ? 'batch' : 'single');
                setSelectedForFax(new Set());
              }}
              className={`px-3 py-1 text-xs rounded ${viewMode === 'batch' ? 'bg-amber-500 text-white' : 'bg-[#1e3a5f] text-slate-300 hover:bg-[#2d4a6f]'}`}
            >
              {viewMode === 'batch' ? 'Single View' : `Batch (${allOpportunities.length})`}
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Patient - ALWAYS use opportunity's patient data to prevent HIPAA issues */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Patient</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center text-[#0a1628] font-semibold">
              {getInitials(opportunity.patient_last_name || '')}
            </div>
            <div>
              <div className="font-semibold text-white">
                {formatPatientName(opportunity.patient_first_name, opportunity.patient_last_name, '', isDemo)}
              </div>
              <div className="text-sm text-slate-400">DOB: {formatDate(opportunity.patient_dob || '')}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-[#14b8a6]/20 text-[#14b8a6] text-xs rounded font-medium">
              BIN: {opportunity.insurance_bin || 'N/A'}
            </span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
              Group: {opportunity.insurance_group || 'N/A'}
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

        {/* Batch View - Select opportunities by prescriber */}
        {viewMode === 'batch' ? (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Select Opportunities to Include ({selectedForFax.size} selected)
            </div>
            {Object.entries(byPrescriber).map(([prescriber, opps]) => (
              <div key={prescriber} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{prescriber}</span>
                    <span className="text-xs text-slate-400">({opps.length} {opps.length === 1 ? 'opp' : 'opps'})</span>
                  </div>
                  <button
                    onClick={() => selectAllForPrescriber(prescriber)}
                    className="text-xs text-[#14b8a6] hover:text-[#0d9488]"
                  >
                    {opps.every(o => selectedForFax.has(o.opportunity_id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-2">
                  {opps.map(opp => (
                    <label
                      key={opp.opportunity_id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedForFax.has(opp.opportunity_id)
                          ? 'bg-[#14b8a6]/20 border border-[#14b8a6]'
                          : 'bg-[#1e3a5f] hover:bg-[#2d4a6f] border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedForFax.has(opp.opportunity_id)}
                        onChange={() => toggleSelection(opp.opportunity_id, prescriber)}
                        className="mt-1 rounded border-slate-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white truncate">{opp.current_drug_name}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-sm text-[#14b8a6] truncate">{opp.recommended_drug_name}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {opp.opportunity_type?.replace(/_/g, ' ')} • ${Number(opp.potential_margin_gain || 0).toFixed(2)} GP
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {selectedForFax.size > 0 && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="text-sm text-amber-400">
                  {selectedForFax.size} {selectedForFax.size === 1 ? 'opportunity' : 'opportunities'} selected for batch fax
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Total GP: ${getSelectedOpportunities().reduce((sum, o) => sum + Number(o.potential_margin_gain || 0), 0).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Single Opportunity View */
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
                  {opportunity.recommended_ndc && (
                    <div className="text-xs text-slate-400 mt-0.5">NDC: {formatNdc(opportunity.recommended_ndc)}</div>
                  )}
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
        )}

        {/* Dosing Equivalency Table */}
        {equivalency?.table && (
          <div>
            <button
              onClick={() => setEqOpen(!eqOpen)}
              className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-3 hover:text-slate-300 transition-colors w-full"
            >
              {eqOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Dosing Equivalency — {equivalency.table.className}
            </button>
            {eqOpen && (
              <div className="bg-[#1e3a5f] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#2d4a6f]">
                      {equivalency.table.columns.map((col, i) => (
                        <th key={i} className={`px-2 py-2 font-semibold text-slate-300 ${i === 0 ? 'text-left' : 'text-center'}`}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {equivalency.table.rows.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-t border-[#2d4a6f] ${i === equivalency.matchedRow ? 'bg-[#14b8a6]/15' : ''}`}
                      >
                        <td className={`px-2 py-1.5 font-medium ${i === equivalency.matchedRow ? 'text-[#14b8a6]' : 'text-white'}`}>
                          {row.drug}
                        </td>
                        {row.values.map((val, j) => (
                          <td key={j} className="px-2 py-1.5 text-center text-slate-400">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {equivalency.table.note && (
                  <div className="px-2 py-1.5 text-[10px] text-slate-500 border-t border-[#2d4a6f]">
                    {equivalency.table.note}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Value */}
        {showAnyFinancials && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Value & Impact</div>
            <div className="bg-[#1e3a5f] rounded-lg p-4 grid grid-cols-2 gap-4">
              <div className={showFullFinancials ? '' : 'col-span-2'}>
                <div className="text-xs text-slate-500">Per Fill GP</div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(Number(opportunity.potential_margin_gain) || 0)}</div>
                <div className="text-xs text-slate-400 mt-1">First fill value</div>
              </div>
              {showFullFinancials && (
                <div>
                  <div className="text-xs text-slate-500">Monthly Value</div>
                  <div className="text-2xl font-bold text-[#14b8a6]">{formatCurrency(getAnnualValue(opportunity) / 12)}</div>
                  <div className="text-xs text-slate-400 mt-1">{formatCurrency(getAnnualValue(opportunity))}/year</div>
                </div>
              )}
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
        {viewMode === 'batch' ? (
          <button
            onClick={generateBatchFaxPDF}
            disabled={generating || selectedForFax.size === 0}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating Batch...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Batch Fax ({selectedForFax.size} {selectedForFax.size === 1 ? 'opp' : 'opps'})
              </>
            )}
          </button>
        ) : (
          <button
            onClick={generateFaxPDF}
            disabled={generating}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Fax PDF
              </>
            )}
          </button>
        )}
        <button
          onClick={openFaxModal}
          disabled={opportunity.status !== 'Not Submitted'}
          className={`w-full py-2.5 bg-[#14b8a6] hover:bg-[#0d9488] text-[#0a1628] rounded-lg font-medium flex items-center justify-center gap-2 ${opportunity.status !== 'Not Submitted' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Send className="w-4 h-4" />
          {opportunity.status !== 'Not Submitted' ? 'Already Actioned' : 'Send Fax Now'}
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

      {/* Fax Send Modal */}
      {faxModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-[#0d2137] border border-[#1e3a5f] rounded-xl w-[450px] max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#1e3a5f]">
              <h3 className="text-lg font-semibold text-white">Send Fax to Prescriber</h3>
              <p className="text-sm text-slate-400 mt-1">
                {opportunity.prescriber_name || 'Unknown Prescriber'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {faxLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-[#14b8a6] animate-spin" />
                  <span className="ml-2 text-slate-400">Running preflight checks...</span>
                </div>
              ) : faxPreflight ? (
                <>
                  {/* Warnings */}
                  {faxPreflight.warnings && faxPreflight.warnings.length > 0 && (
                    <div className={`p-4 rounded-lg ${faxPreflight.canSend ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`w-5 h-5 mt-0.5 ${faxPreflight.canSend ? 'text-amber-400' : 'text-red-400'}`} />
                        <div>
                          {faxPreflight.warnings.map((w, i) => (
                            <p key={i} className={`text-sm ${faxPreflight.canSend ? 'text-amber-300' : 'text-red-300'}`}>{w}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily limit info */}
                  {faxPreflight.dailyCount !== undefined && (
                    <div className="text-sm text-slate-400">
                      Faxes sent today: {faxPreflight.dailyCount} / {faxPreflight.dailyLimit}
                    </div>
                  )}

                  {faxPreflight.canSend && (
                    <>
                      {/* Fax number input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Prescriber Fax Number
                        </label>
                        <input
                          type="tel"
                          value={faxNumber}
                          onChange={(e) => setFaxNumber(e.target.value)}
                          placeholder="e.g., 555-123-4567"
                          className="w-full px-4 py-3 bg-[#1e3a5f] border border-[#2d4a6f] rounded-lg text-white placeholder-slate-500 focus:border-[#14b8a6] focus:outline-none"
                        />
                        {faxPreflight.savedFaxNumber && (
                          <p className="text-xs text-slate-500 mt-1">
                            Using saved fax number from directory
                          </p>
                        )}
                      </div>

                      {/* NPI Confirmation */}
                      <div className="bg-[#1e3a5f] rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={npiConfirmed}
                            onChange={(e) => setNpiConfirmed(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-[#2d4a6f] bg-[#0d2137] text-[#14b8a6] focus:ring-[#14b8a6]"
                          />
                          <span className="text-sm text-slate-300">
                            I confirm that the prescriber NPI{opportunity.prescriber_npi ? ` (${opportunity.prescriber_npi})` : ''} matches the hardcopy prescription and this fax is authorized.
                          </span>
                        </label>
                      </div>

                      {/* Drug change summary */}
                      <div className="bg-[#1e3a5f]/50 rounded-lg p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recommendation</p>
                        <p className="text-sm text-white">
                          {opportunity.current_drug_name} → <span className="text-[#14b8a6]">{opportunity.recommended_drug_name}</span>
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>

            <div className="p-4 border-t border-[#1e3a5f] flex gap-3">
              <button
                onClick={() => {
                  setFaxModalOpen(false);
                  setFaxNumber('');
                  setNpiConfirmed(false);
                  setFaxPreflight(null);
                }}
                className="flex-1 py-2.5 bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg font-medium"
              >
                Cancel
              </button>
              {faxPreflight?.canSend && (
                <button
                  onClick={sendFaxNow}
                  disabled={!faxNumber || !npiConfirmed || faxSending}
                  className="flex-1 py-2.5 bg-[#14b8a6] hover:bg-[#0d9488] disabled:bg-[#14b8a6]/50 text-[#0a1628] rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {faxSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Fax
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// Main Component
export default function OpportunitiesPage() {
  const user = useAuthStore((state) => state.user);
  const { canViewFinancialData, canViewLimitedFinancialData } = usePermissions();
  const isDemo = user?.email === 'demo@therxos.com';

  // Financial display levels:
  // - canViewFinancialData: full access (annual values, totals, all amounts)
  // - canViewLimitedFinancialData: single fill values only (no annual, no totals)
  // - neither: no financial data shown
  const showAnyFinancials = canViewFinancialData || canViewLimitedFinancialData;
  const showFullFinancials = canViewFinancialData; // annual values, totals
  const showLimitedFinancials = !canViewFinancialData && canViewLimitedFinancialData; // single fill only
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, not_submitted: 0, submitted: 0, approved: 0, completed: 0, didnt_work: 0, flagged: 0, denied: 0,
    total_annual: 0, not_submitted_annual: 0, submitted_annual: 0, approved_annual: 0, completed_annual: 0,
    unknown_coverage_count: 0, unknown_coverage_annual: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showDenied, setShowDenied] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [hideUnknownCoverage, setHideUnknownCoverage] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState('patient');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedItem | null>(null);
  const [notesModal, setNotesModal] = useState<Opportunity | null>(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [prescriberWarning, setPrescriberWarning] = useState<{ data: PrescriberWarningData; pendingUpdate: { id: string; status: string } } | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);

  // Fetch pharmacy info
  useEffect(() => {
    async function fetchPharmacy() {
      try {
        const token = localStorage.getItem('therxos_token');
        const res = await fetch(`${API_URL}/api/settings/pharmacy-info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPharmacy(data.pharmacy);
        }
      } catch (e) {
        console.error('Failed to fetch pharmacy:', e);
      }
    }
    if (user?.pharmacyId) fetchPharmacy();
  }, [user?.pharmacyId]);

  // Check URL for type/filter/search params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      const filterParam = params.get('filter');
      const searchParam = params.get('search');
      if (type) {
        setTypeFilter(type);
        setGroupBy('category');
      }
      if (filterParam === 'flagged') {
        setFilter('flagged');
      }
      if (searchParam) {
        setSearch(searchParam);
      }
    }
  }, []);

  // Re-fetch when pharmacy changes (e.g., after impersonation)
  useEffect(() => { if (user?.pharmacyId) fetchData(); }, [user?.pharmacyId]);
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
      // Use verified margin (excludes unknown coverage) for Not Submitted
      const getVerifiedMargin = (status: string) => apiCounts[status]?.verifiedMargin ?? apiCounts[status]?.totalMargin ?? 0;
      const unknownCount = apiCounts['Not Submitted']?.unknownCount || 0;
      const unknownMargin = getMargin('Not Submitted') - getVerifiedMargin('Not Submitted');

      // Calculate active total (exclude Denied, Flagged, Completed, Didn't Work)
      // Use verified margin for Not Submitted (excludes unknown coverage)
      const activeTotal = getCount('Not Submitted') + getCount('Submitted') + getCount('Approved');
      const activeMargin = getVerifiedMargin('Not Submitted') + getMargin('Submitted') + getMargin('Approved');

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
        not_submitted_annual: getVerifiedMargin('Not Submitted') * 12,
        submitted_annual: getMargin('Submitted') * 12,
        approved_annual: getMargin('Approved') * 12,
        completed_annual: getMargin('Completed') * 12,
        unknown_coverage_count: unknownCount,
        unknown_coverage_annual: unknownMargin * 12,
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
        case 'drug':
          key = (opp.recommended_drug_name || 'unknown').toLowerCase();
          label = opp.recommended_drug_name || 'Unknown Drug';
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
      // Recalculate stats (exclude unknown coverage from Not Submitted margins)
      const opps = opportunities.map(o => o.opportunity_id === id ? { ...o, status } : o);
      const notSubmitted = opps.filter(o => o.status === 'Not Submitted');
      const verifiedNotSubmitted = notSubmitted.filter(o => o.coverage_confidence !== 'unknown');
      const unknownNotSubmitted = notSubmitted.filter(o => o.coverage_confidence === 'unknown');
      const activeOpps = opps.filter(o => o.status !== 'Denied' && o.status !== 'Flagged' && o.status !== "Didn't Work" && o.status !== 'Completed');
      const activeVerifiedMargin = verifiedNotSubmitted.reduce((s, o) => s + getAnnualValue(o), 0)
        + opps.filter(o => o.status === 'Submitted').reduce((s, o) => s + getAnnualValue(o), 0)
        + opps.filter(o => o.status === 'Approved').reduce((s, o) => s + getAnnualValue(o), 0);
      setStats({
        total: activeOpps.length,
        not_submitted: notSubmitted.length,
        submitted: opps.filter(o => o.status === 'Submitted').length,
        approved: opps.filter(o => o.status === 'Approved').length,
        completed: opps.filter(o => o.status === 'Completed').length,
        didnt_work: opps.filter(o => o.status === "Didn't Work").length,
        flagged: opps.filter(o => o.status === 'Flagged').length,
        denied: opps.filter(o => o.status === 'Denied').length,
        total_annual: activeVerifiedMargin,
        not_submitted_annual: verifiedNotSubmitted.reduce((s, o) => s + getAnnualValue(o), 0),
        submitted_annual: opps.filter(o => o.status === 'Submitted').reduce((s, o) => s + getAnnualValue(o), 0),
        approved_annual: opps.filter(o => o.status === 'Approved').reduce((s, o) => s + getAnnualValue(o), 0),
        completed_annual: opps.filter(o => o.status === 'Completed').reduce((s, o) => s + getAnnualValue(o), 0),
        unknown_coverage_count: unknownNotSubmitted.length,
        unknown_coverage_annual: unknownNotSubmitted.reduce((s, o) => s + getAnnualValue(o), 0),
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
              <th>Coverage</th>
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
                <td>${opp.coverage_confidence === 'verified' ? 'Verified' : opp.coverage_confidence === 'likely' ? 'Likely' : opp.coverage_confidence === 'excluded' ? 'Excluded' : 'Unknown'}</td>
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
      // Hide unknown coverage for Not Submitted when toggle is on
      if (hideUnknownCoverage && o.status === 'Not Submitted' && o.coverage_confidence === 'unknown') return false;
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
                {showFullFinancials && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(stats.total_annual)} annual</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-[#14b8a6] font-medium">{formatCurrency(stats.total_annual / 12)}/mo</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-medium">Approved: {formatCurrency(stats.approved_annual)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-green-400 font-medium">Completed: {formatCurrency(stats.completed_annual)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-teal-400 font-medium">Captured: {formatCurrency(stats.approved_annual + stats.completed_annual)}</span>
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
              {showFullFinancials && (
                <div className="flex gap-2 mt-3">
                  <span className="text-xs px-2 py-1 bg-[#1e3a5f] text-slate-300 rounded">
                    {formatShortCurrency(card.annual)}/yr
                  </span>
                  <span className="text-xs px-2 py-1 bg-[#1e3a5f] text-slate-300 rounded">
                    {formatShortCurrency(card.annual / 12)}/mo
                  </span>
                </div>
              )}
              {card.key === 'not_submitted' && stats.unknown_coverage_count > 0 && (
                <div className="mt-2 text-[10px] text-slate-500" title="Unknown coverage opportunities excluded from margin totals">
                  +{stats.unknown_coverage_count} unknown coverage ({showFullFinancials ? formatShortCurrency(stats.unknown_coverage_annual) + '/yr' : ''})
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
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, drug, prescriber..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-[#0d2137] border border-[#1e3a5f] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#14b8a6]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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
          {/* Hide Unknown Coverage toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={hideUnknownCoverage}
              onChange={(e) => setHideUnknownCoverage(e.target.checked)}
              className="w-4 h-4 rounded accent-[#14b8a6]"
            />
            Hide Unknown Coverage
            {stats.unknown_coverage_count > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded">
                {stats.unknown_coverage_count}
              </span>
            )}
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
          {search && (
            <div className="flex items-center gap-2 ml-2">
              <span className="px-3 py-1.5 bg-[#14b8a6]/20 text-[#14b8a6] rounded-lg text-sm font-medium">
                Search: "{search}"
              </span>
              <button
                onClick={() => { setSearch(''); window.history.replaceState({}, '', '/dashboard/opportunities'); }}
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
              <option value="drug">Drug</option>
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
          {filteredCount} opportunities{showFullFinancials && <> • <span className="text-[#14b8a6] font-medium">{formatCurrency(filteredValue)}</span> annual value</>}
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
                      {showFullFinancials && (
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
                          {showAnyFinancials && (
                            <>
                              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Qty/Fill</th>
                              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">
                                {showFullFinancials ? 'GP/Fill / Annual' : 'GP/Fill'}
                              </th>
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
                          const altCount = opp.alternatives?.length || 0;
                          return (
                            <React.Fragment key={opp.opportunity_id}>
                            <tr className="border-t border-[#1e3a5f] hover:bg-[#1e3a5f]/30">
                              {groupBy !== 'patient' && (
                                <td className="px-5 py-3">
                                  <div className="font-medium text-white">
                                    {formatPatientName(opp.patient_first_name, opp.patient_last_name, opp.patient_hash, isDemo)}
                                  </div>
                                  <InsuranceTags opp={opp} size="xs" />
                                </td>
                              )}
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">
                                    {opp.current_drug_name || 'N/A'} → <span className="text-[#14b8a6]">{opp.recommended_drug_name}</span>
                                    {opp.recommended_ndc && <span className="text-xs text-slate-400 ml-1">(NDC: {formatNdc(opp.recommended_ndc)})</span>}
                                  </span>
                                  <CoverageConfidenceBadge confidence={opp.coverage_confidence} size="xs" />
                                  {altCount > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpanded(prev => {
                                          const next = new Set(prev);
                                          const altKey = `alt-${opp.opportunity_id}`;
                                          if (next.has(altKey)) next.delete(altKey);
                                          else next.add(altKey);
                                          return next;
                                        });
                                      }}
                                      className="px-1.5 py-0.5 text-[10px] font-medium bg-[#1e3a5f] hover:bg-[#2d4a6f] text-blue-300 rounded transition-colors"
                                      title={`${altCount} alternative${altCount > 1 ? 's' : ''} available`}
                                    >
                                      +{altCount} alt{altCount > 1 ? 's' : ''}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="text-sm text-slate-400 max-w-xs truncate">{action || rationale}</div>
                              </td>
                              {showAnyFinancials && (
                                <>
                                  <td className="px-5 py-3">
                                    <div className="text-sm text-slate-400">
                                      {opp.avg_dispensed_qty ? Math.round(Number(opp.avg_dispensed_qty)) : '-'}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div>
                                      <div className="text-emerald-400 font-semibold">{formatCurrency(Number(opp.potential_margin_gain) || 0)}</div>
                                      {showFullFinancials && (
                                        <div className="text-xs text-slate-500">{formatCurrency(getAnnualValue(opp))}/yr</div>
                                      )}
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
                            {altCount > 0 && expanded.has(`alt-${opp.opportunity_id}`) && (
                              opp.alternatives?.map((alt: any, i: number) => (
                                <tr key={`alt-${alt.opportunity_id}`} className="border-t border-[#1e3a5f]/50 bg-[#0a1628]">
                                  {groupBy !== 'patient' && <td className="px-5 py-2"></td>}
                                  <td className="px-5 py-2 pl-10">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500">↳</span>
                                      <span className="text-sm text-slate-300">
                                        Alt {i + 1}: <span className="text-[#14b8a6]/70">{alt.recommended_drug_name}</span>
                                      </span>
                                      <CoverageConfidenceBadge confidence={alt.coverage_confidence} size="xs" />
                                    </div>
                                  </td>
                                  <td className="px-5 py-2"></td>
                                  {showAnyFinancials && (
                                    <>
                                      <td className="px-5 py-2">
                                        <div className="text-xs text-slate-500">
                                          {alt.avg_dispensed_qty ? Math.round(Number(alt.avg_dispensed_qty)) : '-'}
                                        </div>
                                      </td>
                                      <td className="px-5 py-2">
                                        <div className="text-sm text-emerald-400/70">{formatCurrency(Number(alt.potential_margin_gain) || 0)}</div>
                                      </td>
                                    </>
                                  )}
                                  <td colSpan={4} className="px-5 py-2"></td>
                                </tr>
                              ))
                            )}
                            </React.Fragment>
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
            key={selectedOpp.opportunity_id}
            opportunity={selectedOpp}
            groupItem={selectedGroup}
            allOpportunitiesData={opportunities}
            onClose={() => { setSelectedOpp(null); setSelectedGroup(null); }}
            onStatusChange={updateStatus}
            isDemo={isDemo}
            showFullFinancials={showFullFinancials}
            showLimitedFinancials={showLimitedFinancials}
            pharmacy={pharmacy}
            groupBy={groupBy}
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
