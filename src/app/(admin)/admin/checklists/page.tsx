'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ListChecks,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  Timer,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { getTodayDateString } from '@/lib/utils';
import { soundPlayer } from '@/lib/audio';

const DEFAULT_TASKS = [
  { title: 'Bold Desk - ticket software', timerMinutes: 15, targetTime: '09:15', isRequired: true },
  { title: 'WP engine', timerMinutes: 60, targetTime: '10:00', isRequired: true },
  { title: 'Ms teams - A1p tier 1 support new msgs', timerMinutes: 15, targetTime: '09:30', isRequired: true },
  { title: 'Twillio Tasks - running more than 1 hr', timerMinutes: 60, targetTime: '11:00', isRequired: true },
  { title: 'outlook - new emails or replies from henry or etc', timerMinutes: 30, targetTime: '10:30', isRequired: true },
  { title: 'Twilio status page', timerMinutes: 60, targetTime: '11:30', isRequired: true },
  { title: 'Pantheon status page', timerMinutes: 60, targetTime: '12:00', isRequired: true },
];

export default function AdminChecklistsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [date, setDate] = useState<string>(getTodayDateString());
  const [checklistTask, setChecklistTask] = useState<any>(null);
  const [employeeProgress, setEmployeeProgress] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalEmployees: 0,
    fullyCompletedEmployees: 0,
    inProgressEmployees: 0,
    notStartedEmployees: 0,
    teamCompletionRate: 0,
  });

  // Editor form state
  const [taskName, setTaskName] = useState('Daily Operational Checklist');
  const [startTime, setStartTime] = useState('09:00');
  const [dueTime, setDueTime] = useState('18:00');
  const [instructions, setInstructions] = useState('Perform scheduled checks for ticketing, servers, communications, and status pages.');
  const [items, setItems] = useState<
    Array<{
      id?: string;
      title: string;
      isRequired: boolean;
      timerMinutes: number;
      targetTime: string;
    }>
  >(DEFAULT_TASKS);

  const fetchChecklistData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/checklists?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        setChecklistTask(json.checklistTask);
        setEmployeeProgress(json.employeeProgress || []);
        setSummary(json.summary || {});

        // Populate editor state
        if (json.checklistTask) {
          setTaskName(json.checklistTask.name || 'Daily Operational Checklist');
          setStartTime(json.checklistTask.startTime || '09:00');
          setDueTime(json.checklistTask.dueTime || '18:00');
          setInstructions(json.checklistTask.instructions || '');

          if (json.checklistTask.items && json.checklistTask.items.length > 0) {
            setItems(
              json.checklistTask.items.map((i: any) => ({
                id: i.id,
                title: i.title,
                isRequired: i.isRequired !== undefined ? i.isRequired : true,
                timerMinutes: Number(i.timerMinutes) || 30,
                targetTime: i.targetTime || '09:30',
              }))
            );
          } else {
            setItems(DEFAULT_TASKS);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchChecklistData();
    const interval = setInterval(fetchChecklistData, 20000);
    return () => clearInterval(interval);
  }, [fetchChecklistData]);

  // Add Item to Checklist
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        title: '',
        isRequired: true,
        timerMinutes: 30,
        targetTime: '10:00',
      },
    ]);
  };

  // Reset to default 7 tasks
  const handleResetToDefaults = () => {
    if (confirm('Reset checklist items to the 7 default support tasks?')) {
      setItems(DEFAULT_TASKS);
    }
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('The checklist must contain at least one item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Update Item field
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: value };
    setItems(copy);
  };

  // Save and push to all users
  const handleSaveAndPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    const validItems = items.filter((i) => i.title.trim().length > 0);
    if (validItems.length === 0) {
      setErrorMessage('Please provide a title for all checklist items.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/checklists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: checklistTask?.id,
          name: taskName,
          instructions,
          startTime,
          dueTime,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundPlayer.playChime('success');
        setSaveSuccessMessage(data.message || 'Checklist updated and pushed to all user dashboards!');
        fetchChecklistData();
      } else {
        setErrorMessage(data.error || 'Failed to update checklist');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title & Status Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white font-bold shadow-sm">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Daily Checklist (All Users)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure the daily operational checklist. All updates are pushed directly to all employee dashboards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchChecklistData()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Checklist Configuration Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Items</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{items.length}</div>
          <span className="text-[10px] text-slate-400">Checklist steps</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm">
          <span className="text-xs font-medium text-blue-800 block">Mandatory Items</span>
          <div className="mt-1 text-2xl font-bold text-blue-700">
            {items.filter((i) => i.isRequired).length}
          </div>
          <span className="text-[10px] text-blue-600">Required completion</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
          <span className="text-xs font-medium text-emerald-800 block">Target Audience</span>
          <div className="mt-1 text-2xl font-bold text-emerald-700">All Staff</div>
          <span className="text-[10px] text-emerald-600">All registered employees</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Timer Mode</span>
          <div className="mt-1 text-sm font-bold text-slate-800">
            Shift-Triggered
          </div>
          <span className="text-[10px] text-slate-400">Timers start on user shift toggle</span>
        </div>
      </div>

      {/* Master Checklist Editor Card */}
      <div className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden ring-1 ring-blue-100">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-blue-50/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-600 text-white p-1">
                <Check className="h-3 w-3" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Update Daily Checklist for All Users
              </h2>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                Live on All User Dashboards
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Add or edit checklist items below. Timers begin dynamically when each employee starts their shift toggle.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition shrink-0"
              title="Reset to the 7 default support tasks"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset 7 Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 shadow-sm transition shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Checklist Task</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveAndPush} className="p-5 sm:p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Checklist Title</label>
            <input
              type="text"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Daily Operational Checklist"
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Checklist Items Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-bold text-slate-800">
                Checklist Tasks & Recurring Timers ({items.length} tasks)
              </label>
              <span className="text-[11px] text-slate-500">
                Timers start counting down when the user toggles ON their shift and ring until the shift ends
              </span>
            </div>

            <div className="space-y-2.5">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono text-slate-500 font-bold text-xs w-6 text-center shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Task name (e.g. Bold Desk - ticket software)..."
                      value={it.title}
                      onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* Timer / Interval Selector */}
                  <div className="flex items-center gap-3 pl-8 sm:pl-0 shrink-0">
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-xs text-amber-900">
                      <Timer className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <select
                        value={it.timerMinutes || 30}
                        onChange={(e) => handleUpdateItem(idx, 'timerMinutes', Number(e.target.value))}
                        className="bg-transparent text-xs font-semibold text-amber-900 focus:outline-none cursor-pointer"
                        title="Alert Ring Interval"
                      >
                        <option value={15}>Ring every 15 min</option>
                        <option value={20}>Ring every 20 min</option>
                        <option value={30}>Ring every 30 min</option>
                        <option value={45}>Ring every 45 min</option>
                        <option value={60}>Ring every 1 hour</option>
                        <option value={90}>Ring every 1.5 hr</option>
                        <option value={120}>Ring every 2 hours</option>
                        <option value={240}>Ring every 4 hours</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer px-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={it.isRequired}
                        onChange={(e) => handleUpdateItem(idx, 'isRequired', e.target.checked)}
                        className="rounded text-blue-600 h-4 w-4"
                      />
                      <span className="font-medium">Mandatory</span>
                    </label>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                        title="Remove Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              ⚡ Saving pushes this updated checklist to <strong>all employee dashboards</strong> for today.
            </span>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Pushing Updates to All Users...' : 'Save & Push to All User Dashboards'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
