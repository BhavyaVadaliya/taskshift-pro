'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  History,
  UserCheck,
  Bell,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/components/providers/NotificationProvider';

export function EmployeeSidebar() {
  const pathname = usePathname();
  const { unreadCount, pushPermission } = useNotifications();

  const employeeNavItems = [
    { label: 'My Tasks', href: '/employee/tasks', icon: CheckSquare },
    {
      label: 'Chrome Notifications',
      href: '/employee/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? `${unreadCount}` : 'Live',
      badgeColor: unreadCount > 0 ? 'bg-red-50 text-red-600 border-red-200 font-bold' : 'bg-blue-50 text-blue-700 border-blue-200',
    },
    { label: 'Task History', href: '/employee/history', icon: History },
    { label: 'My Profile', href: '/employee/profile', icon: UserCheck },
  ];

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
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] border',
                        item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-xs">Chrome Push Status</p>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              pushPermission === 'granted' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            )}
            title={`Permission: ${pushPermission}`}
          />
        </div>
        <p className="text-[11px] text-blue-700/80 leading-relaxed">
          {pushPermission === 'granted'
            ? 'Chrome notifications active. Reminders trigger on your desktop.'
            : 'Allow Chrome notifications to get live audio & popup task alerts.'}
        </p>
      </div>
    </aside>
  );
}

