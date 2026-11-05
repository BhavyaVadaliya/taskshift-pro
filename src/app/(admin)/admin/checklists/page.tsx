'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ListChecks,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getTodayDateString } from '@/lib/utils';
import { soundPlayer } from '@/lib/audio';

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
  const [taskName, setTaskName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [dueTime, setDueTime] = useState('18:00');
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<Array<{ id?: string; title: string; isRequired: boolean }>>([]);

  // Search filter
  const [searchEmployee, setSearchEmployee] = useState('');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

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
          setTaskName(json.checklistTask.name);
          setStartTime(json.checklistTask.startTime || '09:00');
          setDueTime(json.checklistTask.dueTime || '18:00');
          setInstructions(json.checklistTask.instructions || '');
          setItems(
            json.checklistTask.items.map((i: any) => ({
              id: i.id,
              title: i.title,
              isRequired: i.isRequired,
            }))
          );
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
    setItems([...items, { title: '', isRequired: true }]);
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

  const filteredEmployees = employeeProgress.filter((e) => {
    if (!searchEmployee) return true;
    const q = searchEmployee.toLowerCase();
    return (
      e.employeeName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.departmentName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title & Status Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white font-bold shadow-sm">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Daily Checklist Hub (All Users)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Update daily checklist items here. Changes are instantly pushed to all employees' dashboards for live check-in.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-blue-600 focus:outline-none"
          />

          <button
            onClick={() => fetchChecklistData()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
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

      {/* Checklist Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Employees</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{summary.totalEmployees}</div>
          <span className="text-[10px] text-slate-400">All registered staff</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
          <span className="text-xs font-medium text-emerald-800 block">Fully Completed</span>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{summary.fullyCompletedEmployees}</div>
          <span className="text-[10px] text-emerald-600">All checklist items checked</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm">
          <span className="text-xs font-medium text-blue-800 block">In Progress</span>
          <div className="mt-1 text-2xl font-bold text-blue-700">{summary.inProgressEmployees}</div>
          <span className="text-[10px] text-blue-600">Partially checked items</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Team Completion Rate</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{summary.teamCompletionRate}%</div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              style={{ width: `${summary.teamCompletionRate}%` }}
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
            />
          </div>
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
              Add or edit checklist items below. When you click "Save & Push Updates", all employees will see the updated items immediately.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 shadow-sm transition shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Checklist Item</span>
          </button>
        </div>

        <form onSubmit={handleSaveAndPush} className="p-5 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">Checklist Title</label>
              <input
                type="text"
                required
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Daily Operational Checklist"
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scheduled Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due / Shift End Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Instructions for Employees</label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Ensure all tickets are verified before checking off."
              className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Checklist Items Inputs */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">Checklist Items ({items.length} items)</label>
            <div className="space-y-2.5">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 hover:border-slate-300 transition"
                >
                  <span className="font-mono text-slate-400 font-bold w-6 text-center">{idx + 1}.</span>
                  <input
                    type="text"
                    required
                    placeholder="Describe checklist task item..."
                    value={it.title}
                    onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  />

                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer px-2 shrink-0">
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
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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

      {/* Live Employee Check-in Tracking Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900">Live Employee Checklist Check-in Progress</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status showing which employee has checked off each item on their dashboard today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none w-52"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No employees found matching filter.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isExpanded = expandedEmployeeId === emp.userId;

              return (
                <div key={emp.userId} className="p-4 hover:bg-slate-50/50 transition">
                  <div
                    onClick={() => setExpandedEmployeeId(isExpanded ? null : emp.userId)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-xs">
                        {emp.employeeName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{emp.employeeName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({emp.employeeId})</span>
                          <span className="rounded bg-slate-100 px-2 py-0.2 text-[10px] text-slate-600 font-medium">
                            {emp.departmentName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Assigned Shift: {emp.shiftName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Progress Bar & Counter */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {emp.completedItems}/{emp.totalItems} Checked
                          </span>
                          <span className="text-[10px] text-slate-400 block">{emp.progressPercent}% complete</span>
                        </div>
                        <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${emp.progressPercent}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              emp.isFullyCompleted ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                          />
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          emp.isFullyCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : emp.completedItems > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {emp.isFullyCompleted ? 'Done' : emp.completedItems > 0 ? 'In Progress' : 'Not Started'}
                      </span>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Item Breakdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 pl-12 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider mb-2">
                        Checklist Items Breakdown:
                      </span>
                      {emp.checklistItems.map((item: any, i: number) => (
                        <div
                          key={item.checklistId || i}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold ${
                                item.isCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : 'border border-slate-300 bg-white text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`font-medium ${
                                item.isCompleted ? 'text-slate-800' : 'text-slate-500'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.isRequired && <span className="text-[10px] text-red-500 font-bold">*</span>}
                          </div>

                          <div className="flex items-center gap-3">
                            {item.comments && (
                              <span className="text-[11px] text-slate-500 italic max-w-xs truncate">
                                "{item.comments}"
                              </span>
                            )}
                            <span
                              className={`font-mono text-[10px] font-medium ${
                                item.isCompleted ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {item.isCompleted && item.completedAt
                                ? `Checked at ${new Date(item.completedAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}`
                                : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
