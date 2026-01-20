'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { opportunitiesApi, settingsApi } from '@/lib/api';
import usePermissions, { PERMISSIONS } from '@/hooks/usePermissions';
import {
  LayoutDashboard,
  Lightbulb,
  Users,
  BarChart3,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  FileText,
  Building2,
  Shield,
  Flag,
  Sparkles,
  ChevronUp,
  Send,
  CheckSquare,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Pharmacy {
  pharmacy_id: string;
  pharmacy_name: string;
  client_name: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, _hasHydrated, setAuth, setPermissionOverrides } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pharmacySwitcherOpen, setPharmacySwitcherOpen] = useState(false);
  const [switchingPharmacy, setSwitchingPharmacy] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [changelogData, setChangelogData] = useState<any>(null);

  // Handle search submission - goes to opportunities page
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/dashboard/opportunities?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isOnboarding = user?.clientStatus === 'onboarding';

  // Check impersonation status after hydration
  useEffect(() => {
    setIsImpersonating(localStorage.getItem('therxos_impersonating') === 'true');
  }, []);

  // Fetch changelog data for "What's New" section
  useEffect(() => {
    async function fetchChangelog() {
      try {
        const token = localStorage.getItem('therxos_token');
        const res = await fetch(`${API_URL}/api/changelog?limit=3`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setChangelogData(data);
        }
      } catch (err) {
        console.error('Failed to fetch changelog:', err);
      }
    }
    if (isAuthenticated) {
      fetchChangelog();
    }
  }, [isAuthenticated]);

  // Redirect onboarding clients to upload page if they try to access other pages
  useEffect(() => {
    if (isOnboarding && pathname !== '/dashboard/upload' && pathname !== '/dashboard/help') {
      router.replace('/dashboard/upload');
    }
  }, [isOnboarding, pathname, router]);

  // Get user permissions - MUST be called before any early returns (React hooks rule)
  const {
    can,
    roleInfo,
    canViewAnalytics,
    canViewPatientDetails,
    canUploadData,
    canManageSettings,
    canViewAuditRisks,
    canViewFinancialData,
  } = usePermissions();

  // Fetch opportunity counts for sidebar badge
  const { data: oppData } = useQuery({
    queryKey: ['opportunities-count', user?.pharmacyId],
    queryFn: () => opportunitiesApi.getAll({ limit: 1 }).then(r => r.data),
    enabled: isAuthenticated && !!user?.pharmacyId,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch pharmacies for super_admin switcher
  const { data: pharmaciesData } = useQuery({
    queryKey: ['admin-pharmacies'],
    queryFn: async () => {
      const token = localStorage.getItem('therxos_token');
      const res = await fetch(`${API_URL}/api/admin/pharmacies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch pharmacies');
      return res.json();
    },
    enabled: isSuperAdmin || isImpersonating,
  });

  // Fetch pharmacy settings for permission overrides
  const { data: pharmacySettings } = useQuery({
    queryKey: ['pharmacy-settings', user?.pharmacyId],
    queryFn: () => settingsApi.getPharmacySettings(user!.pharmacyId).then(r => r.data),
    enabled: !!user?.pharmacyId && isAuthenticated,
  });

  // Update permission overrides when settings change
  useEffect(() => {
    if (pharmacySettings?.permissionOverrides) {
      setPermissionOverrides(pharmacySettings.permissionOverrides);
    }
  }, [pharmacySettings, setPermissionOverrides]);

  const pharmacies: Pharmacy[] = pharmaciesData?.pharmacies || [];

  const notSubmittedCount = oppData?.counts?.['Not Submitted']?.count || oppData?.counts?.new?.count || 0;
  const flaggedCount = oppData?.counts?.Flagged?.count || 0;

  // Switch to a different pharmacy (impersonate)
  async function switchPharmacy(pharmacyId: string) {
    if (switchingPharmacy) return;
    setSwitchingPharmacy(true);
    setPharmacySwitcherOpen(false);

    try {
      // Get original token if impersonating, otherwise use current
      const originalToken = localStorage.getItem('therxos_original_token') || localStorage.getItem('therxos_token');

      const res = await fetch(`${API_URL}/api/admin/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${originalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pharmacy_id: pharmacyId }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('therxos_token', data.token);
        localStorage.setItem('therxos_impersonating', 'true');
        if (!localStorage.getItem('therxos_original_token')) {
          localStorage.setItem('therxos_original_token', originalToken || '');
        }

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
        alert('Failed to switch pharmacy: ' + (error.error || 'Unknown error'));
        setSwitchingPharmacy(false);
      }
    } catch (err) {
      console.error('Switch pharmacy failed:', err);
      alert('Failed to switch pharmacy');
      setSwitchingPharmacy(false);
    }
  }

  // Return to super admin view
  async function exitImpersonation() {
    const originalToken = localStorage.getItem('therxos_original_token');
    if (!originalToken) return;

    try {
      // Fetch super admin user data with original token
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${originalToken}` },
      });

      if (!res.ok) throw new Error('Token invalid');

      const data = await res.json();

      // Clear impersonation flags
      localStorage.removeItem('therxos_impersonating');
      localStorage.removeItem('therxos_original_token');

      // Restore token
      localStorage.setItem('therxos_token', originalToken);

      // Use hard navigation to ensure fresh page load with restored auth
      window.location.href = '/admin';
    } catch (err) {
      console.error('Exit impersonation failed:', err);
      // Clear everything and go to login
      localStorage.clear();
      window.location.href = '/login';
    }
  }

  // Build real notifications from opportunity data
  const notifications = [];
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (notSubmittedCount > 0) {
    notifications.push({
      id: 1,
      type: 'opportunity',
      message: `${notSubmittedCount} opportunities awaiting review`,
      time: 'Now',
      date: dateStr,
      href: '/dashboard/opportunities'
    });
  }
  if (flaggedCount > 0) {
    notifications.push({
      id: 2,
      type: 'flagged',
      message: `${flaggedCount} flagged opportunities need attention`,
      time: 'Now',
      date: dateStr,
      href: '/dashboard/flagged'
    });
  }
  // Add completed opportunities count if available
  const completedCount = oppData?.counts?.['Completed']?.count || oppData?.counts?.['Approved']?.count || 0;
  if (completedCount > 0) {
    notifications.push({
      id: 3,
      type: 'capture',
      message: `${completedCount} opportunities captured`,
      time: 'This month',
      date: dateStr,
      href: '/dashboard/opportunities?status=Completed'
    });
  }

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy-900)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-500)]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Navigation items with permission checks
  // Onboarding clients only see Upload
  const navigation = isOnboarding ? [
    { name: 'Data Upload', href: '/dashboard/upload', icon: Upload, show: true },
  ] : [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Opportunities', href: '/dashboard/opportunities', icon: Lightbulb, badge: notSubmittedCount, show: true },
    { name: 'Flagged', href: '/dashboard/flagged', icon: Flag, badge: flaggedCount, badgeColor: 'purple', show: true },
    { name: 'Fax Queue', href: '/dashboard/fax-queue', icon: Send, show: true },
    { name: 'Approval Queue', href: '/dashboard/approvals', icon: CheckSquare, show: canManageSettings },
    { name: 'Audit Risks', href: '/dashboard/audit', icon: ShieldAlert, badge: 0, show: canViewAuditRisks },
    { name: 'Patients', href: '/dashboard/patients', icon: Users, show: canViewPatientDetails },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, show: canViewAnalytics && canViewFinancialData },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText, show: canViewAnalytics && canViewFinancialData },
  ].filter(item => item.show);

  // Secondary nav items (shown after What's New)
  const secondaryNav = isOnboarding ? [] : [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, show: canManageSettings },
    { name: 'Data Upload', href: '/dashboard/upload', icon: Upload, show: canUploadData },
  ].filter(item => item.show);

  // Support nav at bottom - separate from main navigation
  const supportNav = isOnboarding ? [
    { name: 'Help & Contact', href: '/dashboard/help', icon: HelpCircle, show: true },
  ] : [
    { name: 'Suggestions', href: '/dashboard/suggestions', icon: MessageSquare, show: true },
    { name: 'Help & Contact', href: '/dashboard/help', icon: HelpCircle, show: true },
  ].filter(item => item.show);

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-60';
  const mainMargin = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60';

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full ${sidebarWidth} transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--navy-800)', borderRight: '1px solid var(--navy-600)' }}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-2">
            {!sidebarCollapsed && (
              <a 
                href="https://therxos.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <span className="text-2xl font-bold">
                  The<span style={{ color: 'var(--teal-500)' }}>RxOS</span>
                </span>
              </a>
            )}
            {sidebarCollapsed && (
              <a 
                href="https://therxos.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full hover:opacity-80 transition-opacity"
              >
                <span className="text-xl font-bold" style={{ color: 'var(--teal-500)' }}>Rx</span>
              </a>
            )}
            <button onClick={toggleSidebar} className="lg:hidden p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pharmacy info */}
          {!sidebarCollapsed && (
            <div className="pb-4 mb-6" style={{ borderBottom: '1px solid var(--navy-600)' }}>
              <a 
                href={user.pharmacyName ? `https://${user.pharmacyName.toLowerCase().replace(/\s+/g, '')}.com` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 hover:text-[var(--teal-400)] transition-colors"
                style={{ color: 'var(--slate-400)' }}
              >
                {user.pharmacyName}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {sidebarCollapsed && <div className="pb-4 mb-6" style={{ borderBottom: '1px solid var(--navy-600)' }} />}

          {/* Main Navigation */}
          <div className="mb-6">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3" style={{ color: 'var(--slate-500)' }}>
                Main Menu
              </p>
            )}
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                    {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: isActive ? 'var(--navy-900)' : (item as any).badgeColor === 'purple' ? 'rgb(147, 51, 234)' : 'var(--red-500)',
                          color: isActive ? 'var(--teal-500)' : '#ffffff'
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="absolute top-0 right-0 w-2 h-2 rounded-full"
                        style={{ background: (item as any).badgeColor === 'purple' ? 'rgb(147, 51, 234)' : 'var(--red-500)' }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* What's New Section */}
          {!isOnboarding && changelogData?.updates?.length > 0 && (
            <div className="mb-4">
              {!sidebarCollapsed && (
                <button
                  onClick={() => setWhatsNewOpen(!whatsNewOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left rounded-lg hover:bg-[var(--navy-700)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--teal-500)' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--slate-400)' }}>
                      What&apos;s New
                    </span>
                  </div>
                  {whatsNewOpen ? (
                    <ChevronUp className="w-4 h-4" style={{ color: 'var(--slate-500)' }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: 'var(--slate-500)' }} />
                  )}
                </button>
              )}
              {sidebarCollapsed && (
                <button
                  onClick={() => setWhatsNewOpen(!whatsNewOpen)}
                  className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-[var(--navy-700)] transition-colors"
                  title="What's New"
                >
                  <Sparkles className="w-5 h-5" style={{ color: 'var(--teal-500)' }} />
                </button>
              )}
              {whatsNewOpen && !sidebarCollapsed && (
                <div className="mt-2 px-3 space-y-3">
                  {changelogData.updates.slice(0, 2).map((update: any, idx: number) => (
                    <div key={idx} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold" style={{ color: 'var(--teal-400)' }}>
                          v{update.version}
                        </span>
                        <span style={{ color: 'var(--slate-500)' }}>{update.date}</span>
                      </div>
                      {update.entries.map((entry: any, entryIdx: number) => (
                        <div key={entryIdx} className="flex items-start gap-2 mb-1">
                          <span
                            className="inline-block w-2 h-2 rounded-full mt-1 flex-shrink-0"
                            style={{
                              background: entry.type === 'feature' ? 'var(--teal-500)' :
                                         entry.type === 'improvement' ? 'var(--blue-500)' : 'var(--amber-500)'
                            }}
                          />
                          <span style={{ color: 'var(--slate-300)' }}>{entry.title}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Secondary Navigation (Settings, Data Upload) */}
          {secondaryNav.length > 0 && (
            <div className="mb-4">
              <nav className="space-y-1">
                {secondaryNav.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Support Navigation - at bottom */}
          <div className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3" style={{ color: 'var(--slate-500)' }}>
                Support
              </p>
            )}
            <nav className="space-y-1">
              {supportNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center p-2 mb-4 rounded-lg hover:bg-[var(--navy-700)] transition-colors"
            style={{ color: 'var(--slate-400)' }}
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* User section */}
          <div className="pt-4" style={{ borderTop: '1px solid var(--navy-600)' }}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : 'px-2'}`}>
              <div className="avatar w-9 h-9 text-sm flex-shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleInfo?.color || ''}`}>
                      {roleInfo?.name || ''}
                    </span>
                  </div>
                  <button
                    onClick={isImpersonating ? exitImpersonation : handleLogout}
                    className="p-2 rounded-lg hover:bg-[var(--navy-700)] transition-colors"
                    style={{ color: isImpersonating ? 'var(--amber-400)' : 'var(--slate-400)' }}
                    title={isImpersonating ? 'Exit impersonation' : 'Sign out'}
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
        <header 
          className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-8"
          style={{ background: 'var(--navy-800)', borderBottom: '1px solid var(--navy-600)' }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden icon-btn"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Back to Admin button when impersonating */}
            {isImpersonating && (
              <button
                onClick={exitImpersonation}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors bg-red-500 hover:bg-red-600 text-white"
              >
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Admin</span>
              </button>
            )}

            {/* Pharmacy Switcher for Super Admin */}
            {(isSuperAdmin || isImpersonating) && (
              <div className="relative">
                <button
                  onClick={() => setPharmacySwitcherOpen(!pharmacySwitcherOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                  style={{
                    background: isImpersonating ? 'var(--amber-500)' : 'var(--navy-700)',
                    border: '1px solid var(--navy-600)',
                    color: isImpersonating ? 'var(--navy-900)' : 'var(--slate-200)'
                  }}
                  disabled={switchingPharmacy}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium max-w-[150px] truncate">
                    {switchingPharmacy ? 'Switching...' : user?.pharmacyName || 'Select Pharmacy'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${pharmacySwitcherOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Pharmacy dropdown */}
                {pharmacySwitcherOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPharmacySwitcherOpen(false)} />
                    <div
                      className="absolute left-0 mt-2 w-72 rounded-lg shadow-xl z-50 overflow-hidden"
                      style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)' }}
                    >
                      {/* Super Admin Dashboard - Top Option */}
                      <a
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--navy-700)] transition-colors"
                        style={{ borderBottom: '1px solid var(--navy-600)', background: 'var(--navy-900)' }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--red-500)' }}>
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Super Admin Dashboard</p>
                          <p className="text-xs" style={{ color: 'var(--slate-400)' }}>View all pharmacy stats</p>
                        </div>
                      </a>

                      <div className="p-3" style={{ borderBottom: '1px solid var(--navy-600)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--slate-400)' }}>
                            Switch Pharmacy
                          </span>
                          {isImpersonating && (
                            <button
                              onClick={exitImpersonation}
                              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              Exit View
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {pharmacies.map((pharmacy) => (
                          <button
                            key={pharmacy.pharmacy_id}
                            onClick={() => switchPharmacy(pharmacy.pharmacy_id)}
                            className={`w-full text-left px-4 py-3 hover:bg-[var(--navy-700)] transition-colors ${
                              pharmacy.pharmacy_name === user?.pharmacyName ? 'bg-[var(--teal-500)]/10 border-l-2 border-[var(--teal-500)]' : ''
                            }`}
                            style={{ borderBottom: '1px solid var(--navy-700)' }}
                          >
                            <p className="text-sm font-medium text-white">{pharmacy.pharmacy_name}</p>
                            <p className="text-xs" style={{ color: 'var(--slate-400)' }}>{pharmacy.client_name}</p>
                          </button>
                        ))}
                        {pharmacies.length === 0 && (
                          <div className="p-4 text-center text-sm" style={{ color: 'var(--slate-400)' }}>
                            No pharmacies available
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sync status */}
            <div className="hidden sm:flex items-center gap-2 text-xs" style={{ color: 'var(--slate-400)' }}>
              <div className="sync-dot" />
              <span>Last sync: 2 min ago</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg w-72"
              style={{ background: 'var(--navy-700)', border: '1px solid var(--navy-600)' }}
            >
              <Search className="w-4 h-4" style={{ color: 'var(--slate-500)' }} />
              <input
                type="text"
                placeholder="Search opportunities... (press Enter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="bg-transparent text-sm w-full outline-none placeholder:text-[var(--slate-500)]"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button 
                className="icon-btn relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: 'var(--red-500)' }} />
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 w-80 rounded-lg shadow-xl z-50 overflow-hidden"
                    style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-600)' }}
                  >
                    <div className="p-4" style={{ borderBottom: '1px solid var(--navy-600)' }}>
                      <h3 className="font-semibold">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((n: any) => (
                          <div
                            key={n.id}
                            className="p-4 hover:bg-[var(--navy-700)] cursor-pointer transition-colors"
                            style={{ borderBottom: '1px solid var(--navy-600)' }}
                            onClick={() => {
                              setNotificationsOpen(false);
                              if (n.href) router.push(n.href);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: n.type === 'capture' ? 'var(--green-500)' : n.type === 'flagged' ? 'rgb(147, 51, 234)' : 'var(--teal-500)',
                                  color: 'white'
                                }}
                              >
                                {n.type === 'capture' ? '✓' : n.type === 'flagged' ? <Flag className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">{n.message}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--slate-400)' }}>
                                  {n.time} <span style={{ color: 'var(--slate-500)' }}>· {n.date}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center" style={{ color: 'var(--slate-400)' }}>
                          <p>No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {isOnboarding && (
            <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--teal-500)/10', borderColor: 'var(--teal-500)' }}>
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 mt-0.5" style={{ color: 'var(--teal-500)' }} />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--teal-400)' }}>Welcome to TheRxOS!</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--slate-300)' }}>
                    Your account is being set up. Please upload your prescription data below and we&apos;ll analyze it to identify opportunities for your pharmacy.
                    Once your data is processed, you&apos;ll have full access to the platform.
                  </p>
                </div>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
