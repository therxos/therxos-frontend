'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { opportunitiesApi } from '@/lib/api';
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
  ShieldAlert,
  MessageSquare,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Fetch opportunity counts for sidebar badge
  const { data: oppData } = useQuery({
    queryKey: ['opportunities-count'],
    queryFn: () => opportunitiesApi.getAll({ limit: 1 }).then(r => r.data),
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
  });

  const notSubmittedCount = oppData?.counts?.new?.count || 0;

  // Demo notifications
  const notifications = [
    { id: 1, type: 'capture', message: '3 opportunities captured today', time: '2 min ago' },
    { id: 2, type: 'audit', message: 'New audit risk detected', time: '15 min ago' },
  ];

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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Opportunities', href: '/dashboard/opportunities', icon: Lightbulb, badge: notSubmittedCount },
    { name: 'Audit Risks', href: '/dashboard/audit', icon: ShieldAlert, badge: 0 },
    { name: 'Patients', href: '/dashboard/patients', icon: Users },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Data Upload', href: '/dashboard/upload', icon: Upload },
  ];

  const secondaryNav = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Suggestions', href: '/dashboard/suggestions', icon: MessageSquare },
    { name: 'Help & Contact', href: '/dashboard/help', icon: HelpCircle },
  ];

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
                          background: isActive ? 'var(--navy-900)' : 'var(--red-500)',
                          color: isActive ? 'var(--teal-500)' : '#ffffff'
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span 
                        className="absolute top-0 right-0 w-2 h-2 rounded-full"
                        style={{ background: 'var(--red-500)' }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Secondary Navigation */}
          <div className="mb-6">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3" style={{ color: 'var(--slate-500)' }}>
                Support
              </p>
            )}
            <nav className="space-y-1">
              {secondaryNav.map((item) => {
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

          {/* Spacer */}
          <div className="flex-1" />

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
                {user.firstName[0]}{user.lastName[0]}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs capitalize" style={{ color: 'var(--slate-400)' }}>
                      {user.role}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-[var(--navy-700)] transition-colors"
                    style={{ color: 'var(--slate-400)' }}
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
        <header 
          className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-8"
          style={{ background: 'var(--navy-800)', borderBottom: '1px solid var(--navy-600)' }}
        >
          <div className="flex items-center gap-6">
            <button
              onClick={toggleSidebar}
              className="lg:hidden icon-btn"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-xl font-bold hidden sm:block">Dashboard</h1>

            {/* Sync status */}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--slate-400)' }}>
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
                placeholder="Search patients, opportunities..."
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
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className="p-4 hover:bg-[var(--navy-700)] cursor-pointer transition-colors"
                            style={{ borderBottom: '1px solid var(--navy-600)' }}
                          >
                            <div className="flex items-start gap-3">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ 
                                  background: n.type === 'capture' ? 'var(--green-500)' : 'var(--amber-500)',
                                  color: 'var(--navy-900)'
                                }}
                              >
                                {n.type === 'capture' ? '✓' : '!'}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">{n.message}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--slate-400)' }}>{n.time}</p>
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
          {children}
        </main>
      </div>
    </div>
  );
}
