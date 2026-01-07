// API Client for TheRxOS V2
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('therxos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors - clear token and let state management handle redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('therxos_token');
        localStorage.removeItem('therxos-auth'); // Clear Zustand persisted state
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  logout: () => api.post('/auth/logout'),
  
  me: () => api.get('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Opportunities API
export const opportunitiesApi = {
  getAll: (params?: {
    status?: string;
    type?: string;
    priority?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/opportunities', { params }),
  
  getOne: (id: string) => api.get(`/opportunities/${id}`),
  
  update: (id: string, data: { status?: string; staffNotes?: string; dismissedReason?: string }) =>
    api.patch(`/opportunities/${id}`, data),
  
  bulkUpdate: (ids: string[], status: string, staffNotes?: string) =>
    api.post('/opportunities/bulk-update', { opportunityIds: ids, status, staffNotes }),
  
  getStats: () => api.get('/opportunities/summary/stats'),
};

// Patients API
export const patientsApi = {
  getAll: (params?: {
    search?: string;
    hasOpportunities?: boolean;
    condition?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/patients', { params }),
  
  getOne: (id: string) => api.get(`/patients/${id}`),
  
  enrollMedSync: (id: string, syncDate: number) =>
    api.post(`/patients/${id}/med-sync`, { syncDate }),
};

// Analytics API
export const analyticsApi = {
  dashboard: (period?: number) => api.get('/analytics/dashboard', { params: { period } }),
  
  byType: (status?: string) => api.get('/analytics/opportunities/by-type', { params: { status } }),
  
  trends: (days?: number) => api.get('/analytics/trends', { params: { days } }),
  
  topPatients: (limit?: number) => api.get('/analytics/top-patients', { params: { limit } }),
  
  performance: (days?: number) => api.get('/analytics/performance', { params: { days } }),
  
  ingestionStatus: () => api.get('/analytics/ingestion-status'),
};

// Settings API
export const settingsApi = {
  getPharmacySettings: (pharmacyId: string) =>
    api.get(`/settings/pharmacy/${pharmacyId}`),

  updatePharmacySettings: (pharmacyId: string, settings: any) =>
    api.put(`/settings/pharmacy/${pharmacyId}`, { settings }),

  getExcludedPrescribers: (pharmacyId: string) =>
    api.get(`/settings/pharmacy/${pharmacyId}/excluded-prescribers`),

  addExcludedPrescriber: (pharmacyId: string, data: {
    prescriberName: string;
    prescriberNpi?: string;
    prescriberDea?: string;
    reason?: string;
  }) => api.post(`/settings/pharmacy/${pharmacyId}/excluded-prescribers`, data),

  removeExcludedPrescriber: (pharmacyId: string, id: string) =>
    api.delete(`/settings/pharmacy/${pharmacyId}/excluded-prescribers/${id}`),

  getPharmacyUsers: (pharmacyId: string) =>
    api.get(`/settings/pharmacy/${pharmacyId}/users`),

  createUser: (pharmacyId: string, data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }) => api.post(`/settings/pharmacy/${pharmacyId}/users`, data),

  updateUser: (pharmacyId: string, userId: string, data: {
    role?: string;
    isActive?: boolean;
  }) => api.patch(`/settings/pharmacy/${pharmacyId}/users/${userId}`, data),
};

// Ingestion API
export const ingestionApi = {
  uploadCSV: (file: File, options?: { pharmacyId?: string; sourceEmail?: string; runAutoComplete?: boolean; runScan?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.pharmacyId) formData.append('pharmacyId', options.pharmacyId);
    if (options?.sourceEmail) formData.append('sourceEmail', options.sourceEmail);
    if (options?.runAutoComplete) formData.append('runAutoComplete', 'true');
    if (options?.runScan) formData.append('runScan', 'true');

    return api.post('/ingest/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  triggerScan: (pharmacyIds?: string[]) =>
    api.post('/scan/trigger', { pharmacyIds, scanType: 'manual' }),
};

export default api;
