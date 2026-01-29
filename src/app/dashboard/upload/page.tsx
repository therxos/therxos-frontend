'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ingestionApi, analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Database,
  UserPlus,
  Image,
  FileSpreadsheet,
  Send,
  Download,
  Plus,
  Pill,
  CreditCard,
  User,
  Lightbulb
} from 'lucide-react';

// Demo ingestion history
const DEMO_HISTORY = [
  { id: 1, filename: 'pioneer_rx_export_dec.csv', status: 'completed', records: 1240, created_at: '2025-12-20T10:30:00Z' },
  { id: 2, filename: 'patient_data_nov.csv', status: 'completed', records: 890, created_at: '2025-11-15T14:20:00Z' },
  { id: 3, filename: 'rx_history_oct.csv', status: 'completed', records: 1100, created_at: '2025-10-10T09:15:00Z' },
];

// Demo intake results
const DEMO_INTAKE_RESULTS = {
  patient: { firstName: 'John', lastName: 'Smith', dob: '1965-03-15' },
  insurance: { bin: '004336', pcn: 'ADV', group: 'RX1234' },
  medications: [
    { name: 'Lisinopril 10mg', frequency: 'Once daily' },
    { name: 'Metformin 500mg', frequency: 'Twice daily' },
    { name: 'Atorvastatin 20mg', frequency: 'Once daily at bedtime' },
  ],
  opportunities: [
    { type: 'Therapeutic Interchange', current: 'Atorvastatin 20mg', recommended: 'Rosuvastatin 10mg', reason: 'Equivalent efficacy, better formulary coverage' },
    { type: 'Missing Therapy', current: 'Metformin (Diabetes)', recommended: 'GLP-1 Agonist', reason: 'A1C optimization, cardiovascular benefit' },
  ]
};

interface IntakeResult {
  patient: { firstName: string; lastName: string; dob: string };
  insurance: { bin: string; pcn: string; group: string };
  medications: { name: string; frequency?: string }[];
  opportunities: { type: string; current: string; recommended: string; reason: string; opportunityId?: string }[];
}

export default function UploadPage() {
  const user = useAuthStore((state) => state.user);
  const isDemo = user?.userId === 'demo-user-001';

  // Prescription Data Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [runAutoComplete, setRunAutoComplete] = useState(true);
  const [runScan, setRunScan] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);

  // New Patient Intake State
  const [intakeDragActive, setIntakeDragActive] = useState(false);
  const [intakeFile, setIntakeFile] = useState<File | null>(null);
  const [intakePreview, setIntakePreview] = useState<string | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [intakeMessage, setIntakeMessage] = useState('');
  const [intakeResults, setIntakeResults] = useState<IntakeResult | null>(null);
  const [addingToQueue, setAddingToQueue] = useState<string | null>(null);

  // Manual insurance entry (pre-processing)
  const [manualBin, setManualBin] = useState('');
  const [manualPcn, setManualPcn] = useState('');
  const [manualGroup, setManualGroup] = useState('');

  // Editable insurance (post-processing)
  const [editedInsurance, setEditedInsurance] = useState<{ bin: string; pcn: string; group: string }>({ bin: '', pcn: '', group: '' });

  const { data: ingestionStatus } = useQuery({
    queryKey: ['ingestion-status', user?.pharmacyId],
    queryFn: () => analyticsApi.ingestionStatus().then((r) => r.data),
    enabled: !isDemo && !!user?.pharmacyId,
  });

  // Prescription Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => ingestionApi.uploadCSV(file, {
      pharmacyId: user?.pharmacyId,
      runAutoComplete: runAutoComplete,
      runScan: runScan
    }),
    onSuccess: (data) => {
      setUploadStatus('success');
      const results = data.data;
      setUploadResults(results);

      let message = `Successfully processed ${results?.recordsProcessed || 0} records`;
      if (results?.autoComplete?.completed > 0) {
        message += ` • ${results.autoComplete.completed} opportunities auto-completed`;
      }
      if (results?.scan?.opportunitiesCreated > 0) {
        message += ` • ${results.scan.opportunitiesCreated} new opportunities found`;
      }
      setUploadMessage(message);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      setUploadStatus('error');
      setUploadMessage(error.response?.data?.error || 'Upload failed. Please try again.');
    },
  });

  // New Patient Intake Mutation
  const intakeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pharmacyId', user?.pharmacyId || '');
      if (manualBin.trim()) formData.append('manualBin', manualBin.trim());
      if (manualPcn.trim()) formData.append('manualPcn', manualPcn.trim());
      if (manualGroup.trim()) formData.append('manualGroup', manualGroup.trim());

      const token = localStorage.getItem('therxos_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intake/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Processing failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIntakeStatus('success');
      setIntakeResults(data);
      setEditedInsurance(data.insurance || { bin: '', pcn: '', group: '' });
      setIntakeMessage(`Found ${data.medications?.length || 0} medications and ${data.opportunities?.length || 0} potential opportunities`);
    },
    onError: (error: any) => {
      setIntakeStatus('error');
      setIntakeMessage(error.message || 'Failed to process file. Please try again.');
    },
  });

  // Prescription drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setUploadResults(null);
      } else {
        setUploadStatus('error');
        setUploadMessage('Please upload a CSV file');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus('idle');
      setUploadResults(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!user?.pharmacyId) {
      setUploadStatus('error');
      setUploadMessage('Session expired. Please log out and log back in.');
      return;
    }

    if (isDemo) {
      setUploadStatus('uploading');
      setTimeout(() => {
        setUploadStatus('success');
        setUploadMessage('Demo mode: Simulated upload of 1,240 records');
        setSelectedFile(null);
      }, 2000);
      return;
    }

    setUploadStatus('uploading');
    uploadMutation.mutate(selectedFile);
  };

  // Intake drag handlers
  const handleIntakeDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIntakeDragActive(true);
    } else if (e.type === 'dragleave') {
      setIntakeDragActive(false);
    }
  }, []);

  const handleIntakeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIntakeDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'text/csv'];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.csv'];

      const isValidType = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (isValidType) {
        setIntakeFile(file);
        setIntakeStatus('idle');
        setIntakeResults(null);

        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => setIntakePreview(e.target?.result as string);
          reader.readAsDataURL(file);
        } else {
          setIntakePreview(null);
        }
      } else {
        setIntakeStatus('error');
        setIntakeMessage('Please upload a JPG, PNG, PDF, or CSV file');
      }
    }
  }, []);

  const handleIntakeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIntakeFile(file);
      setIntakeStatus('idle');
      setIntakeResults(null);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setIntakePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setIntakePreview(null);
      }
    }
  };

  const handleIntakeProcess = async () => {
    if (!intakeFile) return;

    if (!user?.pharmacyId) {
      setIntakeStatus('error');
      setIntakeMessage('Session expired. Please log out and log back in.');
      return;
    }

    if (isDemo) {
      setIntakeStatus('processing');
      setTimeout(() => {
        setIntakeStatus('success');
        setIntakeResults(DEMO_INTAKE_RESULTS);
        setEditedInsurance(DEMO_INTAKE_RESULTS.insurance);
        setIntakeMessage('Demo mode: Found 3 medications and 2 potential opportunities');
      }, 3000);
      return;
    }

    setIntakeStatus('processing');
    intakeMutation.mutate(intakeFile);
  };

  const handleAddToQueue = async (opportunity: IntakeResult['opportunities'][0], index: number) => {
    if (!intakeResults?.patient) return;

    setAddingToQueue(`${index}`);

    try {
      const token = localStorage.getItem('therxos_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intake/add-opportunity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pharmacyId: user?.pharmacyId,
          patient: intakeResults.patient,
          insurance: editedInsurance,
          opportunity
        }),
      });

      if (!response.ok) throw new Error('Failed to add');

      const data = await response.json();

      // Update the opportunity with the created ID
      setIntakeResults(prev => {
        if (!prev) return prev;
        const newOpps = [...prev.opportunities];
        newOpps[index] = { ...newOpps[index], opportunityId: data.opportunityId };
        return { ...prev, opportunities: newOpps };
      });
    } catch (err) {
      console.error('Failed to add opportunity:', err);
    } finally {
      setAddingToQueue(null);
    }
  };

  const handleExportCSV = () => {
    if (!intakeResults) return;

    const rows = [
      ['Patient Name', 'DOB', 'Insurance BIN', 'PCN', 'Group', 'Opportunity Type', 'Current', 'Recommended', 'Reason'],
      ...intakeResults.opportunities.map(opp => [
        `${intakeResults.patient.firstName} ${intakeResults.patient.lastName}`,
        intakeResults.patient.dob,
        editedInsurance.bin,
        editedInsurance.pcn,
        editedInsurance.group,
        opp.type,
        opp.current,
        opp.recommended,
        opp.reason
      ])
    ];

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intake_${intakeResults.patient.lastName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const clearIntake = () => {
    setIntakeFile(null);
    setIntakePreview(null);
    setIntakeStatus('idle');
    setIntakeResults(null);
    setIntakeMessage('');
    setManualBin('');
    setManualPcn('');
    setManualGroup('');
    setEditedInsurance({ bin: '', pcn: '', group: '' });
  };

  const history = isDemo ? DEMO_HISTORY : (ingestionStatus?.recentUploads || []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-10 h-10" style={{ color: 'var(--blue-500)' }} />;
    if (file.type === 'application/pdf') return <FileText className="w-10 h-10" style={{ color: 'var(--red-500)' }} />;
    return <FileSpreadsheet className="w-10 h-10" style={{ color: 'var(--green-500)' }} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Data Upload</h1>
        <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
          Upload prescription data or process new patient intake documents
        </p>
      </div>

      {/* Prescription Data Upload */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Prescription Data Upload</h2>
            <p className="text-sm" style={{ color: 'var(--slate-400)' }}>Upload CSV exports from your pharmacy system</p>
          </div>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive ? 'border-[var(--teal-500)] bg-[var(--teal-500)]/5' : 'border-[var(--navy-600)]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-10 h-10" style={{ color: 'var(--teal-500)' }} />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="icon-btn ml-4"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Processing Options */}
              <div className="flex flex-wrap gap-4 justify-center mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runAutoComplete}
                    onChange={(e) => setRunAutoComplete(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--teal-500)' }}
                  />
                  <span className="text-sm">Auto-complete matching opportunities</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runScan}
                    onChange={(e) => setRunScan(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--teal-500)' }}
                  />
                  <span className="text-sm">Scan for new opportunities</span>
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploadStatus === 'uploading'}
                className="btn btn-primary"
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Process
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--slate-400)' }} />
              <p className="font-medium mb-2">Drag and drop your CSV file here</p>
              <p className="text-sm mb-4" style={{ color: 'var(--slate-400)' }}>
                or click to browse
              </p>
              <label className="btn btn-secondary cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                Browse Files
              </label>
            </>
          )}
        </div>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--green-100)' }}>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5" style={{ color: '#166534' }} />
              <span className="font-medium" style={{ color: '#166534' }}>{uploadMessage}</span>
            </div>
            {uploadResults && (
              <div className="text-sm mt-3 space-y-1" style={{ color: '#166534' }}>
                {uploadResults.prescriptionsCreated > 0 && (
                  <p>• {uploadResults.prescriptionsCreated} new prescriptions added</p>
                )}
                {uploadResults.patientsCreated > 0 && (
                  <p>• {uploadResults.patientsCreated} new patients created</p>
                )}
                {uploadResults.autoComplete && (
                  <p>• {uploadResults.autoComplete.completed || 0} opportunities auto-completed from matching fills</p>
                )}
                {uploadResults.scan && uploadResults.scan.opportunitiesCreated > 0 && (
                  <p>• {uploadResults.scan.opportunitiesCreated} new opportunities identified</p>
                )}
              </div>
            )}
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-4 p-4 rounded-lg flex items-center gap-3" style={{ background: 'var(--red-100)' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#991b1b' }} />
            <span style={{ color: '#991b1b' }}>{uploadMessage}</span>
          </div>
        )}

        {/* Format Info */}
        <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
          <h3 className="font-medium mb-2">Supported Formats</h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--slate-400)' }}>
            <li>• PioneerRx dispense report (CSV)</li>
            <li>• Rx30 prescription export (CSV)</li>
            <li>• Generic CSV with required columns: patient_id, ndc, drug_name, quantity, days_supply, dispense_date</li>
          </ul>
        </div>
      </div>

      {/* New Patient Intake Upload */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">New Patient Intake</h2>
            <p className="text-sm" style={{ color: 'var(--slate-400)' }}>Upload medication list to identify opportunities before first fill</p>
          </div>
        </div>

        {!intakeResults ? (
          <>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                intakeDragActive ? 'border-[var(--blue-500)] bg-[var(--blue-500)]/5' : 'border-[var(--navy-600)]'
              }`}
              onDragEnter={handleIntakeDrag}
              onDragLeave={handleIntakeDrag}
              onDragOver={handleIntakeDrag}
              onDrop={handleIntakeDrop}
            >
              {intakeFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon(intakeFile)}
                    <div className="text-left">
                      <p className="font-medium">{intakeFile.name}</p>
                      <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                        {(intakeFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => { setIntakeFile(null); setIntakePreview(null); }}
                      className="icon-btn ml-4"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {intakePreview && (
                    <div className="max-w-xs mx-auto">
                      <img src={intakePreview} alt="Preview" className="rounded-lg border border-[var(--navy-600)]" />
                    </div>
                  )}

                  {/* Insurance Info Fields */}
                  <div className="p-4 rounded-lg text-left" style={{ background: 'var(--navy-700)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium">Insurance Info</span>
                      <span className="text-xs" style={{ color: 'var(--slate-500)' }}>(optional — enter what you have)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--slate-400)' }}>BIN</label>
                        <input
                          type="text"
                          value={manualBin}
                          onChange={e => setManualBin(e.target.value)}
                          placeholder="e.g. 004336"
                          maxLength={6}
                          className="w-full px-3 py-1.5 rounded-lg text-sm border border-[var(--navy-600)] focus:border-[var(--blue-500)] outline-none transition-colors"
                          style={{ background: 'var(--navy-800)', color: 'var(--slate-100)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--slate-400)' }}>PCN</label>
                        <input
                          type="text"
                          value={manualPcn}
                          onChange={e => setManualPcn(e.target.value)}
                          placeholder="e.g. ADV"
                          className="w-full px-3 py-1.5 rounded-lg text-sm border border-[var(--navy-600)] focus:border-[var(--blue-500)] outline-none transition-colors"
                          style={{ background: 'var(--navy-800)', color: 'var(--slate-100)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--slate-400)' }}>GROUP</label>
                        <input
                          type="text"
                          value={manualGroup}
                          onChange={e => setManualGroup(e.target.value)}
                          placeholder="e.g. RX1234"
                          className="w-full px-3 py-1.5 rounded-lg text-sm border border-[var(--navy-600)] focus:border-[var(--blue-500)] outline-none transition-colors"
                          style={{ background: 'var(--navy-800)', color: 'var(--slate-100)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleIntakeProcess}
                    disabled={intakeStatus === 'processing'}
                    className="btn btn-primary"
                    style={{ background: 'var(--blue-500)' }}
                  >
                    {intakeStatus === 'processing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-4 h-4" />
                        Find Opportunities
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <UserPlus className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--slate-400)' }} />
                  <p className="font-medium mb-2">Upload patient medication list</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--slate-400)' }}>
                    Drag and drop or click to browse • JPG, PNG, PDF, or CSV
                  </p>
                  <label className="btn btn-secondary cursor-pointer">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.csv"
                      onChange={handleIntakeFileSelect}
                      className="hidden"
                    />
                    Browse Files
                  </label>
                </>
              )}
            </div>

            {intakeStatus === 'error' && (
              <div className="mt-4 p-4 rounded-lg flex items-center gap-3" style={{ background: 'var(--red-100)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: '#991b1b' }} />
                <span style={{ color: '#991b1b' }}>{intakeMessage}</span>
              </div>
            )}

            <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
              <h3 className="font-medium mb-2">How It Works</h3>
              <ul className="text-sm space-y-1" style={{ color: 'var(--slate-400)' }}>
                <li>• Upload a photo or scan of the patient's medication list</li>
                <li>• Our AI extracts medications and insurance information</li>
                <li>• We identify therapeutic opportunities before their first fill</li>
                <li>• Add opportunities to your queue or generate a fax</li>
              </ul>
            </div>
          </>
        ) : (
          /* Intake Results */
          <div className="space-y-6">
            {/* Patient & Insurance Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-blue-400" />
                  <h3 className="font-medium">Patient Information</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span style={{ color: 'var(--slate-400)' }}>Name:</span> {intakeResults.patient.firstName} {intakeResults.patient.lastName}</p>
                  <p><span style={{ color: 'var(--slate-400)' }}>DOB:</span> {intakeResults.patient.dob}</p>
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-green-400" />
                  <h3 className="font-medium">Insurance Information</h3>
                  <span className="text-xs" style={{ color: 'var(--slate-500)' }}>(editable)</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-12" style={{ color: 'var(--slate-400)' }}>BIN:</span>
                    <input
                      type="text"
                      value={editedInsurance.bin}
                      onChange={e => setEditedInsurance(prev => ({ ...prev, bin: e.target.value }))}
                      placeholder="Not found"
                      maxLength={6}
                      className="flex-1 px-2 py-1 rounded text-sm border border-transparent focus:border-[var(--blue-500)] outline-none transition-colors"
                      style={{ background: 'var(--navy-800)', color: 'var(--slate-100)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12" style={{ color: 'var(--slate-400)' }}>PCN:</span>
                    <input
                      type="text"
                      value={editedInsurance.pcn}
                      onChange={e => setEditedInsurance(prev => ({ ...prev, pcn: e.target.value }))}
                      placeholder="Not found"
                      className="flex-1 px-2 py-1 rounded text-sm border border-transparent focus:border-[var(--blue-500)] outline-none transition-colors"
                      style={{ background: 'var(--navy-800)', color: 'var(--slate-100)' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12" style={{ color: 'var(--slate-400)' }}>Group:</span>
                    <input
                      type="text"
                      value={editedInsurance.group}
                      onChange={e => setEditedInsurance(prev => ({ ...prev, group: e.target.value }))}
                      placeholder="Not found"
                      className="flex-1 px-2 py-1 rounded text-sm border border-transparent focus:border-[var(--blue-500)] outline-none transition-colors"
                      style={{ background: 'var(--navy-800)', color: 'var(--slate-100)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Medications Found */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pill className="w-4 h-4 text-purple-400" />
                <h3 className="font-medium">Medications Found ({intakeResults.medications.length})</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {intakeResults.medications.map((med, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-sm" style={{ background: 'var(--navy-700)' }}>
                    {med.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Opportunities Found */}
            {intakeResults.opportunities.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h3 className="font-medium">Opportunities Found ({intakeResults.opportunities.length})</h3>
                </div>
                <div className="space-y-3">
                  {intakeResults.opportunities.map((opp, i) => (
                    <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--navy-700)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="badge badge-amber">{opp.type}</span>
                          </div>
                          <p className="text-sm mb-1">
                            <span style={{ color: 'var(--slate-400)' }}>Current:</span> {opp.current}
                          </p>
                          <p className="text-sm mb-2">
                            <span style={{ color: 'var(--slate-400)' }}>Recommended:</span>{' '}
                            <span className="text-teal-400 font-medium">{opp.recommended}</span>
                          </p>
                          <p className="text-xs" style={{ color: 'var(--slate-500)' }}>{opp.reason}</p>
                        </div>
                        <div>
                          {opp.opportunityId ? (
                            <span className="badge badge-green">Added</span>
                          ) : (
                            <button
                              onClick={() => handleAddToQueue(opp, i)}
                              disabled={addingToQueue === `${i}`}
                              className="btn btn-primary text-sm py-1.5 px-3"
                            >
                              {addingToQueue === `${i}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Add to Queue
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6" style={{ color: 'var(--slate-400)' }}>
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">No opportunities identified</p>
                <p className="text-sm">This patient's medications are already optimized</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--navy-600)]">
              <button onClick={handleExportCSV} className="btn btn-secondary">
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => {/* TODO: Generate fax */}}
                className="btn btn-secondary"
                disabled={intakeResults.opportunities.length === 0}
              >
                <Send className="w-4 h-4" />
                Generate Fax
              </button>
              <button onClick={clearIntake} className="btn btn-ghost ml-auto">
                <X className="w-4 h-4" />
                Clear & Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: 'var(--teal-500)' }} />
          Recent Uploads
        </h2>

        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((upload: any) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: 'var(--navy-700)' }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" style={{ color: 'var(--slate-400)' }} />
                  <div>
                    <p className="font-medium">{upload.filename}</p>
                    <p className="text-sm" style={{ color: 'var(--slate-400)' }}>
                      {upload.records.toLocaleString()} records
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`badge ${upload.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                    {upload.status}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--slate-400)' }}>
                    {new Date(upload.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: 'var(--slate-400)' }}>
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No upload history yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
