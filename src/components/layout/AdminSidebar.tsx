'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarClock,
  CheckSquare,
  BellRing,
  Activity,
  ClipboardList,
  BarChart3,
  Settings,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Daily Checklist', href: '/admin/checklists', icon: ListChecks, badge: 'All Users' },
  { label: 'Employees', href: '/admin/employees', icon: Users },
  { label: 'Departments', href: '/admin/departments', icon: Building2 },
  { label: 'Shifts', href: '/admin/shifts', icon: CalendarClock },
  { label: 'Task Management', href: '/admin/tasks', icon: CheckSquare },
  { label: 'Notification Schedule', href: '/admin/notifications', icon: BellRing },
  { label: 'Attendance', href: '/admin/attendance', icon: ClipboardList },
  { label: 'Reports & Analytics', href: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white h-full flex flex-col justify-between p-4 overflow-hidden select-none">
      <div className="space-y-6">
        {/* Navigation Group */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Admin Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href === '/admin/checklists' && pathname === '/admin/monitoring');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Security badge */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-medium text-slate-700 mb-1">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Role-Based Security</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Admin portal with verified server-side permission checks.
        </p>
      </div>
    </aside>
  );
}

