'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  Radio,
  Send,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { useNotifications } from '@/components/providers/NotificationProvider';

export default function AdminNotificationsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const { soundEnabled, toggleSound, pushPermission, requestPushPermission } = useNotifications();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tasks');
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const sendTestNotification = async () => {
    try {
      setSendingTest(true);
      setTestResult(null);
      const res = await fetch('/api/push/test', { method: 'POST' });
      const json = await res.json();
      setTestResult(json.message || 'Notification test dispatched!');
    } catch (err: any) {
      setTestResult('Test failed: ' + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleToggleNotification = async (taskId: string, isEnabled: boolean) => {
    try {
      await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationEnabled: !isEnabled }),
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Automatic Notification Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure shift-aligned push notifications, escalation intervals, and test live browser delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={sendTestNotification}
            disabled={sendingTest}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{sendingTest ? 'Sending Test...' : 'Test Notification System'}</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span>{testResult}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-blue-500 hover:text-blue-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Push Status Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Browser Web Push & In-App Engine</h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                The notification scheduler delivers reminders based on employees' assigned shift start times and
                work hours. Notifications do not fire before shifts begin, and forgotten tasks escalate automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Browser Permission:</span>
              <span
                className={`font-semibold text-xs capitalize ${
                  pushPermission === 'granted' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {pushPermission}
              </span>
            </div>

            {pushPermission !== 'granted' ? (
              <button
                onClick={requestPushPermission}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 shadow-sm"
              >
                Allow Permission
              </button>
            ) : (
              <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Active</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Schedule Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Task Reminder Notification Schedule</h2>
          <span className="text-xs text-slate-400">{tasks.length} Configured Tasks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-3">Notification Time</th>
                <th className="py-3 px-3">Reminder Message</th>
                <th className="py-3 px-3">Shift Assigned</th>
                <th className="py-3 px-3">Repeat Interval</th>
                <th className="py-3 px-3">Escalation</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No tasks found.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const schedule = t.notificationSchedule;
                  const isEnabled = schedule ? schedule.isEnabled : true;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        <div className="text-[10px] text-slate-400">Due at: {t.dueTime}</div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-blue-600">
                        {t.reminderTime || t.startTime}
                      </td>

                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                        {schedule?.message || `Scheduled reminder for task "${t.name}".`}
                      </td>

                      <td className="py-3 px-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {t.shiftName}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono">
                        Every {schedule?.repeatIntervalMinutes || 15}m
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono">
                        After {schedule?.escalationMinutes || 30}m
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleNotification(t.id, isEnabled)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition ${
                            isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
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

