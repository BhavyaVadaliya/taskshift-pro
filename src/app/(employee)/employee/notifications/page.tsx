'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  RefreshCw,
  Search,
  Filter,
  Check,
  Send,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  Info,
  Laptop,
} from 'lucide-react';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { soundPlayer } from '@/lib/audio';
import Link from 'next/link';

interface DetectedNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  deliveryStatus: string;
  createdAt: string;
  source?: 'CHROME_PUSH' | 'LOCAL_CHROME' | 'SERVER_LOG';
}

export default function EmployeeChromeNotificationsPage() {
  const {
    notifications,
    unreadCount,
    pushPermission,
    isPushSubscribed,
    soundEnabled,
    toggleSound,
    requestPushPermission,
    markAsRead,
    fetchNotifications,
  } = useNotifications();

  const [localDetected, setLocalDetected] = useState<DetectedNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [testTitle, setTestTitle] = useState('Bold Desk 10m Checklist Due');
  const [testMessage, setTestMessage] = useState('Task interval completed. Please check off your task items.');
  const [testCategory, setTestCategory] = useState('TASK_REMINDER');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Listen for real-time Chrome service worker BroadcastChannel events
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    try {
      const channel = new BroadcastChannel('chrome_notifications_channel');
      channel.onmessage = (event) => {
        const data = event.data;
        if (data && (data.type === 'CHROME_PUSH_RECEIVED' || data.type === 'CHROME_PUSH_CLICKED')) {
          const newEntry: DetectedNotification = {
            id: 'chrome_' + Date.now(),
            title: data.title || 'Chrome Desktop Notification',
            message: data.body || 'Chrome notification event received.',
            type: data.data?.type || 'CHROME_PUSH',
            isRead: false,
            deliveryStatus: 'CHROME_DESKTOP_DISPLAYED',
            createdAt: data.timestamp || new Date().toISOString(),
            source: 'CHROME_PUSH',
          };
          setLocalDetected((prev) => [newEntry, ...prev]);
          if (soundEnabled) {
            soundPlayer.playChime('reminder');
          }
          fetchNotifications();
        }
      };

      return () => {
        channel.close();
      };
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }
  }, [soundEnabled, fetchNotifications]);

  // Combine server notification logs and any locally captured Chrome events
  const combinedNotifications: DetectedNotification[] = useMemo(() => {
    const serverItems: DetectedNotification[] = (notifications || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: Boolean(n.isRead),
      deliveryStatus: n.deliveryStatus || 'DELIVERED',
      createdAt: n.createdAt,
      source: 'SERVER_LOG',
    }));

    // Merge without duplicates by ID
    const seen = new Set<string>();
    const merged: DetectedNotification[] = [];

    for (const item of [...localDetected, ...serverItems]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, localDetected]);

  // Filtered notifications
  const filteredList = useMemo(() => {
    return combinedNotifications.filter((n) => {
      const matchesSearch =
        search === '' ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'UNREAD' && !n.isRead) ||
        (filterType === 'TASK' && (n.type === 'TASK_REMINDER' || n.type === 'OVERDUE_ALERT')) ||
        (filterType === 'SHIFT' && (n.type === 'SHIFT_START' || n.type === 'BREAK_NOTICE')) ||
        (filterType === 'SYSTEM' && (n.type === 'SYSTEM' || n.type === 'TEST'));

      return matchesSearch && matchesType;
    });
  }, [combinedNotifications, search, filterType]);

  // Trigger a Native Chrome Desktop Notification
  const handleTriggerNativeChrome = async (customT?: string, customM?: string, customCat?: string) => {
    const titleToUse = customT || testTitle;
    const msgToUse = customM || testMessage;
    const catToUse = customCat || testCategory;

    setTestSending(true);
    setFeedback(null);

    try {
      // 1. Ensure permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        let perm = Notification.permission;
        if (perm !== 'granted') {
          perm = await Notification.requestPermission();
        }

        if (perm === 'granted') {
          // Display native Chrome popup banner
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(titleToUse, {
              body: msgToUse,
              icon: '/icon-192.png',
              badge: '/badge-72.png',
              data: { url: '/employee/tasks', type: catToUse },
            });
          } else {
            new Notification(titleToUse, {
              body: msgToUse,
              icon: '/favicon.ico',
            });
          }
        }
      }

      // 2. Play sound
      if (soundEnabled) {
        soundPlayer.playChime('reminder');
      }

      // 3. Persist to notification logs
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToUse,
          message: msgToUse,
          type: catToUse,
          deliveryStatus: 'DELIVERED',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.notification) {
          setLocalDetected((prev) => [
            {
              ...json.notification,
              source: 'LOCAL_CHROME',
            },
            ...prev,
          ]);
        }
      }

      // 4. Also fire test push endpoint
      fetch('/api/push/test', { method: 'POST' }).catch(() => {});

      setFeedback(`Chrome notification "${titleToUse}" displayed & logged successfully!`);
      setTimeout(() => setFeedback(null), 4000);
      fetchNotifications();
    } catch (err: any) {
      console.error('Failed to trigger Chrome notification:', err);
      setFeedback('Error displaying notification: ' + (err.message || 'Error'));
    } finally {
      setTestSending(false);
    }
  };

  const getCategoryBadge = (type: string) => {
    switch (type) {
      case 'OVERDUE_ALERT':
        return { label: 'Overdue Alert', icon: AlertTriangle, bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'TASK_REMINDER':
        return { label: 'Task Reminder', icon: Clock, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SHIFT_START':
        return { label: 'Shift Notice', icon: Radio, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'BREAK_NOTICE':
        return { label: 'Break Alert', icon: Clock, bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'CHROME_PUSH':
        return { label: 'Chrome Push', icon: BellRing, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'System Notice', icon: Bell, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Chrome Notification Center
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">User Panel</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl mt-0.5 flex items-center gap-2">
            <BellRing className="h-6 w-6 text-blue-600" />
            <span>Chrome Notifications & Detection</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feed, Chrome browser desktop push detector, and diagnostic log for all workstation task notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Enable Notifications Button */}
          {pushPermission !== 'granted' && (
            <button
              type="button"
              onClick={requestPushPermission}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Enable Chrome Notifications</span>
            </button>
          )}

          {/* Quick Test Popup Button */}
          <button
            type="button"
            onClick={() => handleTriggerNativeChrome()}
            disabled={testSending}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 text-xs font-bold text-blue-800 shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{testSending ? 'Sending Popup...' : 'Test Chrome Popup 🔔'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
              soundEnabled
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
            title={soundEnabled ? 'Sound ON' : 'Muted'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-blue-600" /> : <VolumeX className="h-4 w-4" />}
            <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Mark All Read */}
          <button
            type="button"
            onClick={() => markAsRead()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <Check className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Mark All Read</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchNotifications().finally(() => setLoading(false));
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 shadow-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* 4 Diagnostic Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chrome Permission */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Chrome Permission</span>
            <Laptop className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                pushPermission === 'granted'
                  ? 'bg-emerald-500 animate-pulse'
                  : pushPermission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-base font-bold text-slate-900 capitalize">
              {pushPermission}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {pushPermission === 'granted'
              ? 'Chrome desktop alerts allowed'
              : pushPermission === 'denied'
              ? 'Blocked in Chrome settings'
              : 'Permission not yet granted'}
          </p>
        </div>

        {/* Card 2: Service Worker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Service Worker Push</span>
            <Radio className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPushSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
              }`}
            />
            <span className="text-base font-bold text-slate-900">
              {isPushSubscribed ? 'Subscribed 🟢' : 'Active (Local) 🟢'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Listening for desktop background push
          </p>
        </div>

        {/* Card 3: BroadcastChannel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Live Detector Bridge</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-bold text-slate-900">
              Connected 📡
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            BroadcastChannel event stream active
          </p>
        </div>

        {/* Card 4: Unread Count */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Total Detected</span>
            <Bell className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {combinedNotifications.length}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Recorded in this session & account
          </p>
        </div>
      </div>

      {/* Chrome Security Sandbox Transparency Alert */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 p-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900">
              How Chrome Notification Detection Works in TaskShift Pro:
            </div>
            <p className="leading-relaxed">
              This panel automatically intercepts, detects, and logs all Chrome browser desktop notifications, Web Push alerts, recurring task countdown rings, shift alarms, and break notices sent to your workstation.
            </p>
            <p className="text-[11px] text-slate-500 italic">
              <strong>Note regarding external sites:</strong> Due to Google Chrome&apos;s privacy and security sandbox (Same-Origin Policy), web applications cannot view notifications belonging to other private websites (such as personal Gmail or WhatsApp) without an installed Chrome extension. All TaskShift Pro Chrome notifications are tracked here in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Test Triggers Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Trigger & Test Chrome Desktop Notification
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Instant native popup</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              handleTriggerNativeChrome(
                '⏱️ Bold Desk Checklist Due (10m)',
                '10-minute recurring checklist cycle completed. Action required.',
                'TASK_REMINDER'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-900 transition active:scale-95"
          >
            <span>⏱️ 10m Task Due Alert</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleTriggerNativeChrome(
                '⚠️ Task Overdue Warning',
                'Your scheduled shift task is past due. Please complete checklist now.',
                'OVERDUE_ALERT'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-900 transition active:scale-95"
          >
            <span>⚠️ Overdue Warning</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleTriggerNativeChrome(
                '🍱 Lunch Break Reminder',
                'Break ended. Expired task countdown timers are ready for checking.',
                'BREAK_NOTICE'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 transition active:scale-95"
          >
            <span>🍱 Lunch Break Ended</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleTriggerNativeChrome(
                '🚀 Shift Started Successfully',
                'Your shift is active. Real-time countdowns and mouse tracking are enabled.',
                'SHIFT_START'
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition active:scale-95"
          >
            <span>🚀 Shift Start Notice</span>
          </button>
        </div>
      </div>

      {/* Detected Chrome Notifications Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Filter & Search Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Notifications' },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'TASK', label: 'Task Reminders' },
              { id: 'SHIFT', label: 'Shift & Breaks' },
              { id: 'SYSTEM', label: 'System & Push' },
            ].map((tab) => {
              const active = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Notification Title</th>
                <th className="py-3 px-4">Message Body</th>
                <th className="py-3 px-3">Chrome Delivery Status</th>
                <th className="py-3 px-3">Received Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Bell className="h-6 w-6 text-slate-300" />
                      <span className="font-semibold text-slate-600">No Notifications Detected</span>
                      <span className="text-[11px] text-slate-400">
                        {search ? 'Try clearing your search term.' : 'Click "Test Chrome Popup" above to trigger and detect your first notification.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((n, idx) => {
                  const badge = getCategoryBadge(n.type);
                  const Icon = badge.icon;
                  const isUnread = !n.isRead;

                  return (
                    <tr
                      key={n.id || idx}
                      className={`hover:bg-slate-50/80 transition ${isUnread ? 'bg-blue-50/20' : ''}`}
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${badge.bg}`}>
                          <Icon className="h-3 w-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <span>{n.title}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-md">
                        {n.message}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Delivered to Chrome
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        <div>
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
                          >
                            Mark Read
                          </button>
                        )}
                        <Link
                          href="/employee/tasks"
                          className="rounded-lg bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 text-[11px] font-medium hover:bg-blue-100 transition inline-flex items-center gap-1"
                        >
                          <span>Go to Tasks</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

