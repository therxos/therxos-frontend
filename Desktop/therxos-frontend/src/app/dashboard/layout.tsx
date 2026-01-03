'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
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
  Calendar,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Opportunities', href: '/dashboard/opportunities', icon: Lightbulb, badge: 12 },
  { name: 'Patients', href: '/dashboard/patients', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Data Upload', href: '/dashboard/upload', icon: Upload },
];

const secondaryNav = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
        className={`fixed top-0 left-0 z-50 h-full w-60 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--navy-800)', borderRight: '1px solid var(--navy-600)' }}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-2">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-2xl font-bold">
                The<span style={{ color: 'var(--teal-500)' }}>RxOS</span>
              </span>
            </Link>
            <button onClick={toggleSidebar} className="lg:hidden p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pharmacy info */}
          <div className="pb-4 mb-6" style={{ borderBottom: '1px solid var(--navy-600)' }}>
            <p className="text-xs" style={{ color: 'var(--slate-400)' }}>{user.pharmacyName}</p>
          </div>

          {/* Main Navigation */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3" style={{ color: 'var(--slate-500)' }}>
              Main Menu
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
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
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Secondary Navigation */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3" style={{ color: 'var(--slate-500)' }}>
              Settings
            </p>
            <nav className="space-y-1">
              {secondaryNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User section */}
          <div className="pt-4" style={{ borderTop: '1px solid var(--navy-600)' }}>
            <div className="flex items-center gap-3 px-2">
              <div className="avatar w-9 h-9 text-sm">
                {user.firstName[0]}{user.lastName[0]}
              </div>
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
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-60">
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
            <button className="icon-btn relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: 'var(--red-500)' }} />
            </button>
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
