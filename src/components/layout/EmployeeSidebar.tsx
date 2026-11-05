'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  History,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const employeeNavItems = [
  { label: 'My Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'My Tasks', href: '/employee/tasks', icon: CheckSquare },
  { label: 'Task History', href: '/employee/history', icon: History },
  { label: 'My Profile', href: '/employee/profile', icon: UserCheck },
];

export function EmployeeSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white h-full flex flex-col justify-between p-4 overflow-hidden select-none">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Employee Workspace
          </div>
          <nav className="space-y-1">
            {employeeNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
        <p className="font-semibold mb-0.5">Shift Reminders Active</p>
        <p className="text-[11px] text-blue-700/80">
          Ensure browser notifications are enabled to receive scheduled reminders on time.
        </p>
      </div>
    </aside>
  );
}

