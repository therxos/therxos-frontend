'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import {
  Settings,
  Building2,
  Crosshair,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  BarChart3,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
  ExternalLink,
  Flag,
  Zap,
  Database,
  TrendingDown,
  TrendingUp,
  Layers,
  BookOpen,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Pharmacy {
  pharmacy_id: string;
  pharmacy_name: string;
  client_name: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, _hasHydrated, setAuth, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pharmacySwitcherOpen, setPharmacySwitcherOpen] = useState(false);
  const [switchingPharmacy, setSwitchingPharmacy] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);

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

    // Fetch pharmacies for switcher
    fetchPharmacies();
  }, [user, _hasHydrated]);

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

  async function switchPharmacy(pharmacyId: string) {
    if (switchingPharmacy) return;
    setSwitchingPharmacy(true);
    setPharmacySwitcherOpen(false);

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
        localStorage.setItem('therxos_token', data.token);
        localStorage.setItem('therxos_impersonating', 'true');
        localStorage.setItem('therxos_original_token', token || '');

        // Update Zustand persisted state to avoid stale pharmacy data on reload
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
        alert('Failed to switch pharmacy: ' + (error.error || 'Unknown error'));
        setSwitchingPharmacy(false);
      }
    } catch (err) {
      console.error('Switch pharmacy failed:', err);
      alert('Failed to switch pharmacy');
      setSwitchingPharmacy(false);
    }
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'super_admin') {
    return null;
  }

  // Navigation items for admin panel
  const navigation: { name: string; href: string; icon: any; children?: { name: string; href: string; icon: any }[] }[] = [
    { name: 'Overview', href: '/admin', icon: BarChart3 },
    { name: 'Pharmacies', href: '/admin/pharmacies', icon: Building2 },
    { name: 'Triggers', href: '/admin/triggers', icon: Crosshair },
    { name: 'Audit Rules', href: '/admin/audit-rules', icon: ShieldAlert },
    { name: "Didn't Work Queue", href: '/admin/didnt-work', icon: AlertCircle },
    { name: 'Data Quality', href: '/admin/data-quality', icon: Database },
    {
      name: 'Opportunity Approval',
      href: '/admin/opportunity-approval',
      icon: ShieldCheck,
      children: [
        { name: 'Negative GP Scan', href: '/admin/opportunity-approval/negative-gp', icon: TrendingDown },
        { name: 'Positive GP Scan', href: '/admin/opportunity-approval/positive-gp', icon: TrendingUp },
        { name: 'NDC Optimization', href: '/admin/opportunity-approval/ndc-optimization', icon: Layers },
        { name: 'Reference Data', href: '/admin/opportunity-approval/reference-data', icon: BookOpen },
      ],
    },
    { name: 'Coverage Scanner', href: '/admin/coverage', icon: Zap },
  ];

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-60';
  const mainMargin = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60';

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full ${sidebarWidth} transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-[#0d2137] border-r border-[#1e3a5f]`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-2">
            {!sidebarCollapsed && (
              <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-lg font-bold text-white">
                  Admin Panel
                </span>
              </Link>
            )}
            {sidebarCollapsed && (
              <Link href="/admin" className="flex items-center justify-center w-full hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
              </Link>
            )}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtitle */}
          {!sidebarCollapsed && (
            <div className="pb-4 mb-6 border-b border-[#1e3a5f]">
              <p className="text-xs text-slate-400">Platform-wide management</p>
            </div>
          )}
          {sidebarCollapsed && <div className="pb-4 mb-6 border-b border-[#1e3a5f]" />}

          {/* Main Navigation */}
          <div className="mb-6">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3 text-slate-500">
                Management
              </p>
            )}
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const isChildActive = item.children?.some(child => pathname === child.href);
                const isExpanded = isActive || isChildActive;
                return (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive || isChildActive
                          ? 'bg-red-500/20 text-red-400'
                          : 'text-slate-300 hover:bg-[#1e3a5f] hover:text-white'
                      } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                    </Link>
                    {/* Sub-menu items */}
                    {item.children && !sidebarCollapsed && isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-[#1e3a5f] pl-3">
                        {item.children.map((child) => {
                          const isSubActive = pathname === child.href;
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                isSubActive
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'text-slate-400 hover:bg-[#1e3a5f] hover:text-white'
                              }`}
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Pharmacy Switcher */}
          <div className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3 text-slate-500">
                Quick Actions
              </p>
            )}
            <div className="relative">
              <button
                onClick={() => setPharmacySwitcherOpen(!pharmacySwitcherOpen)}
                disabled={switchingPharmacy}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-slate-300 hover:bg-[#1e3a5f] hover:text-white ${
                  sidebarCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <Building2 className="w-5 h-5 flex-shrink-0 text-teal-400" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {switchingPharmacy ? 'Switching...' : 'View as Pharmacy'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${pharmacySwitcherOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {pharmacySwitcherOpen && !sidebarCollapsed && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPharmacySwitcherOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg shadow-xl z-50 overflow-hidden bg-[#0d2137] border border-[#1e3a5f]">
                    <div className="p-3 border-b border-[#1e3a5f]">
                      <span className="text-xs font-semibold uppercase text-slate-400">
                        Switch to Pharmacy Dashboard
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {pharmacies.map((pharmacy) => (
                        <button
                          key={pharmacy.pharmacy_id}
                          onClick={() => switchPharmacy(pharmacy.pharmacy_id)}
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

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center p-2 mb-4 rounded-lg hover:bg-[#1e3a5f] transition-colors text-slate-400"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* User section */}
          <div className="pt-4 border-t border-[#1e3a5f]">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : 'px-2'}`}>
              <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm font-semibold flex-shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      Super Admin
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-[#1e3a5f] transition-colors text-slate-400"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`${mainMargin} transition-all duration-200`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-8 bg-[#0d2137] border-b border-[#1e3a5f]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#1e3a5f] text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <span className="text-xl font-bold">
                The<span className="text-teal-500">RxOS</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e3a5f] hover:bg-[#2a4a6f] transition-colors text-sm text-white"
            >
              <ExternalLink className="w-4 h-4" />
              View Dashboard
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
