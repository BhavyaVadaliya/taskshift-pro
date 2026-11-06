'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Timer,
  Search,
  Filter,
  ArrowRight,
  ListChecks,
  Check,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';
import { getTodayDateString } from '@/lib/utils';
import { soundPlayer } from '@/lib/audio';

function formatTimer(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function EmployeeHistoryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<string>('');
  const [currentMs, setCurrentMs] = useState<number>(Date.now());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Live 1-second ticker for next due countdowns
  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentMs(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

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

  // Quick check action directly from history
  const handleCheckNow = async (checklistId: string) => {
    try {
      setActionLoading(checklistId);
      const res = await fetch('/api/employee/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistId,
          date: selectedDate,
        }),
      });
      if (res.ok) {
        soundPlayer.playChime('success');
        await fetchHistory();
      }
    } catch (err) {
      console.error('Failed to check task:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tasks = data?.tasks || [];
  const historyLogs: any[] = data?.historyLogs || [];
  const shift = data?.shift;
  const isShiftActive = Boolean(shift?.isShiftActive);
  const isToday = selectedDate === getTodayDateString();

  // Filter logs by search query and task dropdown
  const filteredLogs = useMemo(() => {
    return historyLogs.filter((log) => {
      const matchesSearch =
        log.taskName.toLowerCase().includes(search.toLowerCase()) ||
        log.checkedAtTime.toLowerCase().includes(search.toLowerCase()) ||
        log.nextDueAtTime.toLowerCase().includes(search.toLowerCase());
      const matchesTask = !selectedTaskFilter || log.checklistId === selectedTaskFilter;
      return matchesSearch && matchesTask;
    });
  }, [historyLogs, search, selectedTaskFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Shift Audit Trail
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">Task History</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl mt-0.5">
            Task Execution & Verification History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exact timestamp of every task completed and next scheduled check times (+10m / +1hr).
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
            title="Refresh History"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Shift Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
              Shift Attendance
            </span>
            <div className="text-sm font-bold text-slate-900">
              {shift?.name || 'Morning Shift'}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {shift?.startTime} – {shift?.endTime}
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${
              isShiftActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {isShiftActive ? 'Shift Active 🟢' : 'Shift OFF ⚪'}
          </span>
        </div>

        {/* Total Tasks Monitored */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
            Tasks Monitored
          </span>
          <div className="text-xl font-bold font-mono text-slate-900">
            {tasks.length} Configured Tasks
          </div>
          <span className="text-[10px] text-slate-500">1x 10m • 6x 1hr intervals</span>
        </div>

        {/* Total Checks Logged Today */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 block mb-0.5">
            Checks Logged Today
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {historyLogs.length} Verified
          </div>
          <span className="text-[10px] text-emerald-600/80 font-medium">Exact timestamps recorded</span>
        </div>

        {/* Status Mode */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 block mb-0.5">
            Next Interval Rule
          </span>
          <div className="text-sm font-bold text-slate-900">
            Dynamic Post-Check
          </div>
          <span className="text-[10px] text-slate-500">Timer starts when checked</span>
        </div>
      </div>

      {/* SECTION 1: Current Status & Next Due Times For All 7 Tasks */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Live Task Status & Next Scheduled Check Times
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              When a task is checked, its next verification time is automatically scheduled (10m or 1hr later).
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {tasks.length} Active Tasks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-3">Recurring Timer</th>
                <th className="py-3 px-3">Last Checked At</th>
                <th className="py-3 px-3">Next Due At</th>
                <th className="py-3 px-3">Next Check Countdown</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    {loading ? 'Loading tasks...' : 'No tasks configured.'}
                  </td>
                </tr>
              ) : (
                tasks.map((task: any) => {
                  const isBoldDesk = task.timerMinutes === 10 || task.title?.toLowerCase().includes('bold desk');
                  const isActionPending = actionLoading === task.id;

                  // Compute live remaining seconds
                  let remainingSec = 0;
                  if (task.nextDueAt) {
                    const nextMs = new Date(task.nextDueAt).getTime();
                    remainingSec = Math.floor((nextMs - currentMs) / 1000);
                  }

                  const isDue = isShiftActive && remainingSec <= 0;

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition">
                      {/* Task Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{task.title}</span>
                          {task.isRequired && (
                            <span className="rounded bg-red-50 text-red-600 text-[9px] font-bold px-1.5 py-0.2 border border-red-100">
                              Mandatory
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Interval */}
                      <td className="py-3.5 px-3">
                        <span className="rounded-md bg-amber-50 text-amber-900 px-2 py-0.5 text-[11px] font-semibold border border-amber-200 font-mono inline-flex items-center gap-1">
                          <Timer className="h-3 w-3 text-amber-600" />
                          {task.timerMinutes < 60 ? `Every ${task.timerMinutes} min` : 'Every 1 hr'}
                        </span>
                      </td>

                      {/* Last Checked At (Exact time) */}
                      <td className="py-3.5 px-3 font-mono">
                        {task.lastCompletedAt ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {new Date(task.lastCompletedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not checked yet today</span>
                        )}
                      </td>

                      {/* Next Due At (Exact time) */}
                      <td className="py-3.5 px-3 font-mono">
                        {task.nextDueAt && isShiftActive ? (
                          <div className="text-slate-900 font-bold">
                            {new Date(task.nextDueAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {isShiftActive ? 'Due from shift start' : 'Starts with shift'}
                          </span>
                        )}
                      </td>

                      {/* Live Countdown */}
                      <td className="py-3.5 px-3 font-mono">
                        {!isShiftActive ? (
                          <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-bold border border-slate-200">
                            Shift Inactive
                          </span>
                        ) : isDue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[10px] font-bold animate-pulse shadow-sm">
                            <Clock className="h-3 w-3" />
                            DUE NOW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 px-2.5 py-0.5 text-[11px] font-bold border border-blue-200">
                            <Clock className="h-3 w-3 text-blue-600" />
                            Due in {formatTimer(remainingSec)}
                          </span>
                        )}
                      </td>

                      {/* Check Now Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleCheckNow(task.id)}
                          disabled={isActionPending || !isShiftActive}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-40 ${
                            isDue
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                          }`}
                          title={isShiftActive ? 'Click to record check at exact current time' : 'Start shift first to check tasks'}
                        >
                          <Check className="h-3 w-3" />
                          <span>{isActionPending ? 'Saving...' : 'Check & Reset'}</span>
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

      {/* SECTION 2: Chronological Exact-Time Check History Audit Log */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Verified Check Log & Audit Trail ({filteredLogs.length} Records)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of every check performed, with the exact time of check and the next due time generated.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search check log..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white py-1 pl-8 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-44"
              />
            </div>

            <select
              value={selectedTaskFilter}
              onChange={(e) => setSelectedTaskFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="">All Tasks</option>
              {tasks.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-3">Task Name</th>
                <th className="py-3 px-3">Exact Time Checked</th>
                <th className="py-3 px-3">Set Interval</th>
                <th className="py-3 px-3">Next Due Time Was Set For</th>
                <th className="py-3 px-4 text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                      <span>Loading check history records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No verified task checks recorded for this date yet. Check tasks to populate this history log.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any, index: number) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      {/* Row Number */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                        {index + 1}
                      </td>

                      {/* Task Name */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {log.taskName}
                      </td>

                      {/* Exact Checked Time */}
                      <td className="py-3 px-3 font-mono">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 text-xs border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{log.checkedAtTime}</span>
                        </span>
                      </td>

                      {/* Set Interval */}
                      <td className="py-3 px-3 font-mono">
                        <span className="rounded-md bg-amber-50 text-amber-900 px-2 py-0.5 text-[10px] font-semibold border border-amber-200">
                          +{log.intervalMinutes} min ({log.intervalMinutes < 60 ? `${log.intervalMinutes}m` : '1 hr'})
                        </span>
                      </td>

                      {/* Next Due Generated */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span>{log.nextDueAtTime}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right">
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 border border-emerald-200">
                          Verified & Logged ✓
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Audit log records exact timestamp of every verification and automatically advances the next check time.</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredLogs.length} Records on {selectedDate}
          </span>
        </div>
      </div>
    </div>
  );
}
