'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Timer,
  Check,
} from 'lucide-react';
import { getTodayDateString } from '@/lib/utils';
import { soundPlayer } from '@/lib/audio';

interface TaskColumn {
  id: string;
  title: string;
  timerMinutes: number;
  isRequired: boolean;
  sortOrder: number;
  targetTime?: string | null;
}

interface MatrixCell {
  isScheduled: boolean;
  status: 'CHECKED' | 'DUE_NOW' | 'MISSED' | 'SCHEDULED' | 'NOT_APPLICABLE';
  completedAt?: string;
  isLate?: boolean;
  comments?: string;
}

interface MatrixRow {
  slotTime: string;
  label: string;
  slotMinutes: number;
  isPast: boolean;
  isCurrent: boolean;
  tasks: Record<string, MatrixCell>;
}

export default function EmployeeHistoryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employee/history?date=${selectedDate}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load task history:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(getTodayDateString());
  };

  // Allow one-click check directly from history table
  const handleSlotCheck = async (checklistId: string, slotTime: string, currentStatus: string) => {
    const isCompleted = currentStatus !== 'CHECKED';
    const actionKey = `${checklistId}_${slotTime}`;
    try {
      setActionLoading(actionKey);
      const res = await fetch('/api/employee/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistId,
          slotTime,
          isCompleted,
          date: selectedDate,
        }),
      });
      if (res.ok) {
        soundPlayer.playChime('success');
        await fetchHistory();
      }
    } catch (err) {
      console.error('Failed to update check:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tasks: TaskColumn[] = data?.tasks || [];
  const matrix: MatrixRow[] = data?.matrix || [];
  const shift = data?.shift;
  const summary = data?.summary || {
    totalScheduledChecks: 0,
    completedChecks: 0,
    missedChecks: 0,
    completionRate: 0,
  };

  const isToday = selectedDate === getTodayDateString();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Page Title & Date Selector Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Shift Checklist Log
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">Task History</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl mt-0.5">
            Task Execution & Check History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Table of scheduled tasks across the header with recurring check times on the left.
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={handlePrevDay}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={handleToday}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                isToday ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Today
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-mono font-medium text-slate-800 bg-transparent border-none focus:outline-none"
            />

            <button
              onClick={handleNextDay}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => fetchHistory()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Shift Overview & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Shift Badge Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm lg:col-span-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Assigned Shift Schedule
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {shift?.name || 'Morning Shift'}
              </span>
              <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-mono font-bold border border-blue-200">
                {shift?.startLabel} – {shift?.endLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {shift?.isShiftActive ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Shift Currently Active (Timers Running)
                </span>
              ) : (
                <span>Floor Hours: 15m recurrent intervals</span>
              )}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold shrink-0">
            <Timer className="h-5 w-5" />
          </div>
        </div>

        {/* Total Scheduled Checks */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
            Scheduled Checks
          </span>
          <div className="text-xl font-bold font-mono text-slate-900">
            {summary.totalScheduledChecks}
          </div>
          <span className="text-[10px] text-slate-400">Total check slots today</span>
        </div>

        {/* Completed Checks */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 block mb-0.5">
            Completed Checks
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {summary.completedChecks}
          </div>
          <span className="text-[10px] text-emerald-600/80 font-medium">
            {summary.completionRate}% completion rate
          </span>
        </div>

        {/* Missed Checks */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-500 block mb-0.5">
            Missed / Overdue
          </span>
          <div className="text-xl font-bold font-mono text-red-600">
            {summary.missedChecks}
          </div>
          <span className="text-[10px] text-slate-400">Past slots unattended</span>
        </div>
      </div>

      {/* Primary Task History Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Scheduled Task Verification Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Time when each check is set on the left; tasks listed across the top header. Click any cell to mark or update.
            </p>
          </div>

          {/* Table Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-semibold border border-emerald-200">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Checked
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 font-bold border border-amber-300">
              <Clock className="h-3 w-3 text-amber-600" />
              Due Now
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-600 font-semibold border border-red-200">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              Missed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 border border-slate-200">
              <Clock className="h-3 w-3 text-slate-400" />
              Scheduled
            </span>
            <span className="text-slate-400 text-xs px-1">— Not Due</span>
          </div>
        </div>

        {/* Scrollable Container with Sticky Left Column & Top Header */}
        <div className="overflow-x-auto max-h-[720px] relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 sticky top-0 z-20 shadow-sm backdrop-blur-sm">
                {/* Left Column Header: Time */}
                <th className="py-3 px-4 font-bold text-slate-900 sticky left-0 z-30 bg-slate-100 border-r border-slate-200 min-w-[120px] shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <span>Set Time</span>
                  </div>
                </th>

                {/* Task Name Headers across the top */}
                {tasks.map((task) => (
                  <th
                    key={task.id}
                    className="py-3 px-3.5 font-bold text-slate-800 min-w-[180px] max-w-[240px] border-r border-slate-200/80 align-top"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-amber-50 text-amber-900 px-1.5 py-0.2 text-[10px] font-semibold border border-amber-200 font-mono">
                          Every {task.timerMinutes || 30}m
                        </span>
                        {task.isRequired && (
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-100">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={tasks.length + 1}
                    className="py-16 text-center text-xs text-slate-400 font-medium"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                      <span>Loading task schedule matrix...</span>
                    </div>
                  </td>
                </tr>
              ) : matrix.length === 0 ? (
                <tr>
                  <td
                    colSpan={tasks.length + 1}
                    className="py-16 text-center text-xs text-slate-400"
                  >
                    No schedule slots generated for this shift date.
                  </td>
                </tr>
              ) : (
                matrix.map((row) => {
                  const isCurrentRow = row.isCurrent;

                  return (
                    <tr
                      key={row.slotTime}
                      className={`transition-colors ${
                        isCurrentRow
                          ? 'bg-blue-50/50 hover:bg-blue-50/80 font-semibold ring-1 ring-inset ring-blue-300'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Left Side: Time when the time is set to check the task */}
                      <td
                        className={`py-2.5 px-4 sticky left-0 z-10 border-r border-slate-200 font-mono text-xs shadow-[2px_0_5px_rgba(0,0,0,0.03)] ${
                          isCurrentRow
                            ? 'bg-blue-100/90 text-blue-900 font-extrabold border-r-blue-300'
                            : 'bg-white text-slate-800 font-bold'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>{row.label}</span>
                          {isCurrentRow && (
                            <span className="rounded-full bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 animate-pulse">
                              NOW
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Task Cells */}
                      {tasks.map((task) => {
                        const cell = row.tasks[task.id];
                        const actionKey = `${task.id}_${row.slotTime}`;
                        const isActionPending = actionLoading === actionKey;

                        if (!cell || !cell.isScheduled) {
                          return (
                            <td
                              key={task.id}
                              className="py-2.5 px-3.5 border-r border-slate-100 text-center"
                            >
                              <span
                                className="text-slate-300 text-xs font-mono select-none"
                                title={`Not scheduled at ${row.label} (Every ${task.timerMinutes}m)`}
                              >
                                —
                              </span>
                            </td>
                          );
                        }

                        // Scheduled at this time slot:
                        return (
                          <td
                            key={task.id}
                            className="py-2 px-3 border-r border-slate-100 transition"
                          >
                            {cell.status === 'CHECKED' ? (
                              <button
                                type="button"
                                onClick={() => handleSlotCheck(task.id, row.slotTime, 'CHECKED')}
                                disabled={isActionPending}
                                className="w-full text-left rounded-lg bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200/90 p-1.5 transition group"
                                title={`Completed. Click to toggle if needed.`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px]">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Checked</span>
                                  </div>
                                  {cell.completedAt && (
                                    <span className="text-[10px] font-mono text-emerald-700/80">
                                      {new Date(cell.completedAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ) : cell.status === 'DUE_NOW' ? (
                              <button
                                type="button"
                                onClick={() => handleSlotCheck(task.id, row.slotTime, 'DUE_NOW')}
                                disabled={isActionPending}
                                className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] p-1.5 shadow-sm transition flex items-center justify-between gap-1 animate-pulse"
                                title="Task is due right now. Click to mark checked!"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-white shrink-0" />
                                  <span>Due Now</span>
                                </div>
                                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                  Check ✓
                                </span>
                              </button>
                            ) : cell.status === 'MISSED' ? (
                              <button
                                type="button"
                                onClick={() => handleSlotCheck(task.id, row.slotTime, 'MISSED')}
                                disabled={isActionPending}
                                className="w-full text-left rounded-lg bg-red-50/80 hover:bg-red-100 border border-red-200 p-1.5 transition group"
                                title="Slot passed without verification. Click to complete late."
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 text-red-700 font-semibold text-[11px]">
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                    <span>Missed</span>
                                  </div>
                                  <span className="text-[10px] text-red-600 opacity-0 group-hover:opacity-100 transition font-medium">
                                    +Check
                                  </span>
                                </div>
                              </button>
                            ) : (
                              // Future Scheduled
                              <div
                                className="rounded-lg bg-slate-50 border border-slate-200/60 p-1.5 text-slate-500 text-[11px] flex items-center justify-between gap-1"
                                title="Upcoming scheduled check time"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>Scheduled</span>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              All checklist tasks ring automatically on your dashboard at each scheduled time until checked off.
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {matrix.length} Time Slots • {tasks.length} Configured Tasks
          </span>
        </div>
      </div>
    </div>
  );
}
