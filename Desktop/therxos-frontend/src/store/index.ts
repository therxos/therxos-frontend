// Auth store for TheRxOS V2
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'pharmacist' | 'technician' | 'staff';
  clientId: string;
  clientName: string;
  pharmacyId: string;
  pharmacyName: string;
  subdomain: string;
  mustChangePassword: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('therxos_token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('therxos_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'therxos-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// UI Store for dashboard state
interface UIState {
  sidebarOpen: boolean;
  selectedOpportunities: string[];
  filters: {
    status: string;
    type: string;
    priority: string;
    search: string;
  };
  toggleSidebar: () => void;
  setSelectedOpportunities: (ids: string[]) => void;
  toggleOpportunitySelection: (id: string) => void;
  clearSelection: () => void;
  setFilter: (key: keyof UIState['filters'], value: string) => void;
  resetFilters: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedOpportunities: [],
  filters: {
    status: 'new',
    type: '',
    priority: '',
    search: '',
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSelectedOpportunities: (ids) => set({ selectedOpportunities: ids }),

  toggleOpportunitySelection: (id) =>
    set((state) => ({
      selectedOpportunities: state.selectedOpportunities.includes(id)
        ? state.selectedOpportunities.filter((i) => i !== id)
        : [...state.selectedOpportunities, id],
    })),

  clearSelection: () => set({ selectedOpportunities: [] }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () =>
    set({
      filters: { status: 'new', type: '', priority: '', search: '' },
    }),
}));
