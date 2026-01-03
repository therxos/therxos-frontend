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

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('therxos_token');
        localStorage.removeItem('therxos_user');
        window.location.href = '/login';
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

// Ingestion API
export const ingestionApi = {
  uploadCSV: (file: File, pharmacyId?: string, sourceEmail?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (pharmacyId) formData.append('pharmacyId', pharmacyId);
    if (sourceEmail) formData.append('sourceEmail', sourceEmail);
    
    return api.post('/ingest/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  triggerScan: (pharmacyIds?: string[]) =>
    api.post('/scan/trigger', { pharmacyIds, scanType: 'manual' }),
};

export default api;
