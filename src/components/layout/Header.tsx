'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import {
  Bell,
  Volume2,
  VolumeX,
  LogOut,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Radio,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    soundEnabled,
    toggleSound,
    pushPermission,
    requestPushPermission,
  } = useNotifications();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* Left: Brand & Mobile Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-sm">
          TS
        </div>
        <div>
          <h1 className="text-base font-semibold leading-none text-slate-900 sm:text-lg">
            TaskShift Pro
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 hidden sm:block">
            Employee Shift & Task Management System
          </p>
        </div>
      </div>

      {/* Middle: Live Ticking Clock & Push status */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-medium text-slate-700">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span>{currentTime || 'Loading...'}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">UTC System Time</span>
        </div>

        {pushPermission !== 'granted' && (
          <button
            onClick={requestPushPermission}
            className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition"
            title="Enable browser push notifications"
          >
            <Radio className="h-3 w-3 text-amber-600 animate-pulse" />
            <span>Enable Push Notifications</span>
          </button>
        )}
      </div>

      {/* Right Actions: Sound Toggle, Notifications, User profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sound toggle button */}
        <button
          onClick={toggleSound}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title={soundEnabled ? 'Notification Sound: ON' : 'Notification Sound: MUTED'}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-blue-600" />
          ) : (
            <VolumeX className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <Bell className="h-4 w-4 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAsRead()}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-lg text-left transition hover:bg-slate-50 cursor-pointer ${
                        !n.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'OVERDUE_ALERT' ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill / Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 py-1 px-2 hover:bg-slate-100 transition"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? 'Admin' : user.employeeId}
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">{user.fullName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {user.role}
                  </span>
                </div>

                <div className="py-1">
                  {user.role === 'EMPLOYEE' && (
                    <Link
                      href="/employee/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
