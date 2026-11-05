'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Building,
  Clock,
  Bell,
  Volume2,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { soundPlayer } from '@/lib/audio';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General Settings
  const [companyName, setCompanyName] = useState('Apex Enterprises Global');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [workingDays, setWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(60);

  // Policy Settings
  const [allowEarlyTaskCompletion, setAllowEarlyTaskCompletion] = useState(false);
  const [requireAllChecklists, setRequireAllChecklists] = useState(true);
  const [notificationSoundsEnabled, setNotificationSoundsEnabled] = useState(true);
  const [reminderIntervalMinutes, setReminderIntervalMinutes] = useState(15);

  // Templates
  const [notificationTemplateStart, setNotificationTemplateStart] = useState('');
  const [notificationTemplateTask, setNotificationTemplateTask] = useState('');
  const [notificationTemplateOverdue, setNotificationTemplateOverdue] = useState('');

  // Holidays
  const [holidays, setHolidays] = useState<any[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const json = await res.json();
        const s = json.settings || {};
        if (s.companyName) setCompanyName(s.companyName);
        if (s.companyLogoUrl) setCompanyLogoUrl(s.companyLogoUrl);
        if (s.timezone) setTimezone(s.timezone);
        if (s.workingDays) setWorkingDays(s.workingDays);
        if (s.defaultGracePeriodMinutes) setGracePeriodMinutes(Number(s.defaultGracePeriodMinutes));
        if (s.defaultAutoLogoutMinutes) setAutoLogoutMinutes(Number(s.defaultAutoLogoutMinutes));
        if (s.allowEarlyTaskCompletion !== undefined) setAllowEarlyTaskCompletion(Boolean(s.allowEarlyTaskCompletion));
        if (s.requireAllChecklists !== undefined) setRequireAllChecklists(Boolean(s.requireAllChecklists));
        if (s.notificationSoundsEnabled !== undefined) setNotificationSoundsEnabled(Boolean(s.notificationSoundsEnabled));
        if (s.reminderIntervalMinutes) setReminderIntervalMinutes(Number(s.reminderIntervalMinutes));
        if (s.notificationTemplateStart) setNotificationTemplateStart(s.notificationTemplateStart);
        if (s.notificationTemplateTask) setNotificationTemplateTask(s.notificationTemplateTask);
        if (s.notificationTemplateOverdue) setNotificationTemplateOverdue(s.notificationTemplateOverdue);
        setHolidays(json.holidays || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    const payload = {
      companyName,
      companyLogoUrl,
      timezone,
      workingDays,
      defaultGracePeriodMinutes: gracePeriodMinutes,
      defaultAutoLogoutMinutes: autoLogoutMinutes,
      allowEarlyTaskCompletion,
      requireAllChecklists,
      notificationSoundsEnabled,
      reminderIntervalMinutes,
      notificationTemplateStart,
      notificationTemplateTask,
      notificationTemplateOverdue,
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const j = await res.json();
        setError(j.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;

    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newHolidayName, date: newHolidayDate }),
      });
      if (res.ok) {
        setNewHolidayName('');
        setNewHolidayDate('');
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/holidays?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            System Administration Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure global shift rules, company branding, automated notification templates, and holiday calendars.
          </p>
        </div>

        {saveSuccess && (
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Section 1: Company Profile & Timezone */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Company Identity & Regional Settings</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">System Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
              >
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New York (EST/EDT)</option>
                <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 text-xs">Company Default Working Days</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_DAYS.map((day) => {
                const active = workingDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => {
                      if (active) {
                        setWorkingDays(workingDays.filter((d) => d !== day));
                      } else {
                        setWorkingDays([...workingDays, day]);
                      }
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-medium border transition ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Shift & Task Execution Policies */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Shift Attendance & Task Policy Rules</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Late Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Clocking in after shift start + grace minutes flags the attendance as late.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Auto Logout Flagging Threshold (Minutes)
              </label>
              <input
                type="number"
                min="10"
                value={autoLogoutMinutes}
                onChange={(e) => setAutoLogoutMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Flag for supervisor review if employee does not clock out within this threshold.
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={requireAllChecklists}
                onChange={(e) => setRequireAllChecklists(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 h-4 w-4"
              />
              <span className="font-medium">
                Strict Task Completion: Require all checklist items marked before task completion.
              </span>
            </label>

            <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEarlyTaskCompletion}
                onChange={(e) => setAllowEarlyTaskCompletion(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 h-4 w-4"
              />
              <span className="font-medium">
                Allow Early Start: Permit employees to start tasks before scheduled availability time.
              </span>
            </label>
          </div>
        </div>

        {/* Section 3: Audio & Notification Sounds */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Notification Audio Chimes</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => soundPlayer.playChime('reminder')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Preview Reminder Bell
              </button>
              <button
                type="button"
                onClick={() => soundPlayer.playChime('urgent')}
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition"
              >
                Preview Overdue Alert
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationSoundsEnabled}
              onChange={(e) => setNotificationSoundsEnabled(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 h-4 w-4"
            />
            <span className="font-medium">
              Enable audio notification chimes when browser push or reminders arrive.
            </span>
          </label>
        </div>

        {/* Section 4: Notification Message Templates */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Automated Notification Templates</h2>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Task Reminder Notification Template
            </label>
            <input
              type="text"
              value={notificationTemplateTask}
              onChange={(e) => setNotificationTemplateTask(e.target.value)}
              placeholder="Scheduled task reminder: {task_name}. Due at {due_time}."
              className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Overdue Escalation Alert Template
            </label>
            <input
              type="text"
              value={notificationTemplateOverdue}
              onChange={(e) => setNotificationTemplateOverdue(e.target.value)}
              placeholder="ALERT: Task {task_name} is overdue. Please complete it now."
              className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Section 5: Holiday Calendar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Calendar className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Official Company Holiday Calendar</h2>
        </div>

        <form onSubmit={handleAddHoliday} className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            required
            placeholder="Holiday Name (e.g. Labor Day)"
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            className="rounded-lg border border-slate-200 p-2 text-xs flex-1 min-w-[180px] focus:border-blue-600 focus:outline-none"
          />
          <input
            type="date"
            required
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
            className="rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Holiday</span>
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
          {holidays.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No holidays configured yet.</div>
          ) : (
            holidays.map((h) => (
              <div key={h.id} className="p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{h.name}</span>
                  <span className="font-mono text-slate-400 ml-2">{h.date}</span>
                </div>
                <button
                  onClick={() => handleDeleteHoliday(h.id)}
                  className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove Holiday"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
