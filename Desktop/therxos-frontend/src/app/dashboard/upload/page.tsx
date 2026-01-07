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
  Database
} from 'lucide-react';

// Demo ingestion history
const DEMO_HISTORY = [
  { id: 1, filename: 'pioneer_rx_export_dec.csv', status: 'completed', records: 1240, created_at: '2025-12-20T10:30:00Z' },
  { id: 2, filename: 'patient_data_nov.csv', status: 'completed', records: 890, created_at: '2025-11-15T14:20:00Z' },
  { id: 3, filename: 'rx_history_oct.csv', status: 'completed', records: 1100, created_at: '2025-10-10T09:15:00Z' },
];

export default function UploadPage() {
  const user = useAuthStore((state) => state.user);
  const isDemo = user?.userId === 'demo-user-001';
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [runAutoComplete, setRunAutoComplete] = useState(true);
  const [runScan, setRunScan] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);

  const { data: ingestionStatus } = useQuery({
    queryKey: ['ingestion-status'],
    queryFn: () => analyticsApi.ingestionStatus().then((r) => r.data),
    enabled: !isDemo,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => ingestionApi.uploadCSV(file, {
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

  const history = isDemo ? DEMO_HISTORY : (ingestionStatus?.recentUploads || []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Data Upload</h1>
        <p className="mt-1" style={{ color: 'var(--slate-400)' }}>
          Upload prescription data from your pharmacy management system
        </p>
      </div>

      {/* Upload Area */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Upload CSV File</h2>
        
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

      {/* Upload History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" style={{ color: 'var(--teal-500)' }} />
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
