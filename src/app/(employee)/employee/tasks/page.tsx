'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  BellRing,
  Timer,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Check,
  RotateCcw,
  Power,
  ShieldAlert,
  Coffee,
  Play,
  Pause,
  Utensils,
  X,
} from 'lucide-react';
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

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [shiftData, setShiftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState<number>(Date.now());
  const [isMuted, setIsMuted] = useState(false);
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // 1-second live ticker for real-time countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, shiftRes] = await Promise.all([
        fetch('/api/employee/tasks'),
        fetch('/api/employee/shift/current'),
      ]);

      if (tasksRes.ok) {
        const json = await tasksRes.json();
        setTasks(json.tasks || []);
      }
      if (shiftRes.ok) {
        const json = await shiftRes.json();
        setShiftData(json);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isShiftActive = Boolean(shiftData?.isShiftActive);
  const attendance = shiftData?.attendance;
  const assignedShift = shiftData?.assignedShift;
  const shiftStartMs = attendance?.actualStart
    ? new Date(attendance.actualStart).getTime()
    : currentMs;
  const activeBreak = shiftData?.activeBreak || null;
  const isOnBreak = Boolean(isShiftActive && activeBreak);
  const breakStartMs = activeBreak?.startTime ? new Date(activeBreak.startTime).getTime() : 0;
  const breakElapsedSeconds =
    isOnBreak && breakStartMs ? Math.max(0, Math.floor((currentMs - breakStartMs) / 1000)) : 0;

  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakReason, setBreakReason] = useState('Lunch Break');
  const [customReason, setCustomReason] = useState('');

  // Shift Toggle Handler
  const handleToggleShift = async () => {
    try {
      setActionLoading('shift_toggle');
      if (isShiftActive) {
        if (confirm('Are you sure you want to end your shift? Tasks and timers will be paused.')) {
          const res = await fetch('/api/employee/shift/end', { method: 'POST' });
          if (res.ok) {
            soundPlayer.playChime('success');
            await fetchData();
          }
        }
      } else {
        const res = await fetch('/api/employee/shift/start', { method: 'POST' });
        if (res.ok) {
          soundPlayer.playChime('success');
          await fetchData();
        }
      }
    } catch (err) {
      console.error('Failed to toggle shift:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Start Break Handler
  const handleStartBreak = async (reasonToUse?: string) => {
    const finalReason = reasonToUse || (breakReason === 'Other' ? customReason.trim() || 'Break' : breakReason);
    try {
      setActionLoading('break_start');
      const res = await fetch('/api/employee/shift/break/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
      });
      if (res.ok) {
        soundPlayer.playChime('success');
        setShowBreakModal(false);
        setCustomReason('');
        await fetchData();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error || 'Failed to start break');
      }
    } catch (err) {
      console.error('Failed to start break:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // End Break Handler
  const handleEndBreak = async () => {
    try {
      setActionLoading('break_end');
      const res = await fetch('/api/employee/shift/break/end', { method: 'POST' });
      if (res.ok) {
        soundPlayer.playChime('success');
        await fetchData();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error || 'Failed to end break');
      }
    } catch (err) {
      console.error('Failed to end break:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle checklist item completion
  const handleToggleChecklist = async (instanceId: string, checklistId: string, currentVal: boolean) => {
    try {
      setActionLoading(checklistId);
      const res = await fetch(`/api/employee/tasks/${instanceId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistId,
          isCompleted: !currentVal,
        }),
      });

      if (res.ok) {
        soundPlayer.playChime('success');
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Quick action: check all pending items in a task
  const handleCheckAllPendingInTask = async (task: any) => {
    const pendingItems = task.checklists.filter((c: any) => {
      const intervalMs = (c.timerMinutes || 60) * 60 * 1000;
      const refMs = c.completedAt ? new Date(c.completedAt).getTime() : shiftStartMs;
      const diffSec = Math.floor((intervalMs - (currentMs - refMs)) / 1000);
      return !c.isCompleted || (c.timerMinutes && diffSec <= 0);
    });

    if (pendingItems.length === 0) return;

    try {
      setActionLoading('all_' + task.id);
      for (const item of pendingItems) {
        await fetch(`/api/employee/tasks/${task.id}/checklist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checklistId: item.id,
            isCompleted: true,
          }),
        });
      }
      soundPlayer.playChime('success');
      await fetchData();
    } catch (err) {
      console.error('Failed to check all:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Evaluate status and next due time for each checklist item
  const evaluatedTasks = useMemo(() => {
    // If shift is inactive/OFF, tasks should NOT be marked pending or due
    if (!isShiftActive) {
      return tasks.map((task) => ({
        ...task,
        checklists: (task.checklists || []).map((item: any) => ({
          ...item,
          diffSec: 0,
          isPending: false,
          isRecurringDue: false,
          secondsUntilNext: 0,
        })),
        taskPendingCount: 0,
        isTaskPending: false,
      }));
    }

    return tasks.map((task) => {
      let taskPendingCount = 0;

      const evaluatedChecklists = (task.checklists || []).map((item: any) => {
        const intervalMs = (item.timerMinutes || 60) * 60 * 1000;
        const refMs = item.completedAt ? new Date(item.completedAt).getTime() : shiftStartMs;
        const diffSec = Math.floor((intervalMs - (currentMs - refMs)) / 1000);

        // A recurring task is pending if it has never been completed, or if its interval has expired
        const isRecurringDue = item.timerMinutes ? diffSec <= 0 : false;
        const isPending = !item.isCompleted || isRecurringDue;

        if (isPending) {
          taskPendingCount++;
        }

        return {
          ...item,
          diffSec,
          isPending,
          isRecurringDue,
          secondsUntilNext: Math.max(0, diffSec),
        };
      });

      return {
        ...task,
        checklists: evaluatedChecklists,
        taskPendingCount,
        isTaskPending: taskPendingCount > 0,
      };
    });
  }, [tasks, currentMs, shiftStartMs, isShiftActive]);

  // Separate tasks into pending vs all-done (only active during an active shift)
  const pendingTasks = isShiftActive ? evaluatedTasks.filter((t) => t.isTaskPending) : [];
  const completedTasks = isShiftActive ? evaluatedTasks.filter((t) => !t.isTaskPending) : [];

  const totalPendingItems = isShiftActive
    ? evaluatedTasks.reduce((sum, t) => sum + t.taskPendingCount, 0)
    : 0;
  const allTasksAreDone = isShiftActive && evaluatedTasks.length > 0 && totalPendingItems === 0;

  // Find all upcoming recurring checklist items across all tasks and identify the closest one
  const upcomingItems = useMemo(() => {
    if (!isShiftActive) return [];

    const list: Array<{
      taskId: string;
      taskName: string;
      checklistId: string;
      title: string;
      timerMinutes: number;
      secondsUntilNext: number;
    }> = [];

    evaluatedTasks.forEach((t) => {
      t.checklists.forEach((c: any) => {
        if (c.timerMinutes && c.secondsUntilNext > 0) {
          list.push({
            taskId: t.id,
            taskName: t.taskName,
            checklistId: c.id,
            title: c.title,
            timerMinutes: c.timerMinutes,
            secondsUntilNext: c.secondsUntilNext,
          });
        }
      });
    });

    list.sort((a, b) => a.secondsUntilNext - b.secondsUntilNext);
    return list;
  }, [evaluatedTasks, isShiftActive]);

  const nextDueItem = upcomingItems[0] || null;

  // Sound chime when a pending task is ringing (ONLY if shift is active and NOT on break)
  useEffect(() => {
    if (!isShiftActive || isOnBreak || isMuted || pendingTasks.length === 0) return;

    const hasRingingItems = pendingTasks.some((t) =>
      t.checklists.some((c: any) => c.isRecurringDue)
    );

    if (hasRingingItems) {
      soundPlayer.playAlarm();
      const ringTimer = setInterval(() => {
        soundPlayer.playAlarm();
      }, 8000);
      return () => clearInterval(ringTimer);
    }
  }, [pendingTasks, isMuted, isShiftActive, isOnBreak]);

  // Filter tasks based on search / category filter
  const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean)));

  const filteredPending = pendingTasks.filter((t) => {
    const matchesSearch =
      t.taskName.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = !categoryFilter || t.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Shift Checklist Control
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">My Tasks</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl mt-0.5">
            My Scheduled Tasks & Checklists
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isShiftActive
              ? 'Your shift is active. Pending tasks display below. When all tasks are done, next task timers countdown.'
              : 'Your shift is currently OFF. Start your shift to activate task reminders and checklists.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Break Action in Header */}
          {isShiftActive && !isOnBreak && (
            <button
              type="button"
              onClick={() => setShowBreakModal(true)}
              disabled={actionLoading === 'break_start'}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 shadow-sm transition active:scale-95"
              title="Take a Break (Lunch, Washroom, Tea, etc.)"
            >
              <Coffee className="h-3.5 w-3.5 text-amber-600" />
              <span>Take Break ☕</span>
            </button>
          )}

          {isShiftActive && isOnBreak && (
            <button
              type="button"
              onClick={handleEndBreak}
              disabled={actionLoading === 'break_end'}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-amber-200 transition active:scale-95 animate-pulse"
              title="Click to End Break & Resume Shift"
            >
              <Play className="h-3.5 w-3.5" />
              <span>End Break ({formatTimer(breakElapsedSeconds)})</span>
            </button>
          )}

          {/* Shift Toggle Button in Header */}
          <button
            type="button"
            onClick={handleToggleShift}
            disabled={actionLoading === 'shift_toggle' || isOnBreak}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 ${
              isShiftActive
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            } ${isOnBreak ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isOnBreak ? 'Please end your break before toggling shift' : isShiftActive ? 'Click to End Shift' : 'Click to Start Shift & Activate Tasks'}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{isShiftActive ? 'Shift ON 🟢' : 'Toggle Shift ON ⚪'}</span>
          </button>

          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
              isMuted
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={isMuted ? 'Alarm Sound Muted (Click to Unmute)' : 'Alarm Sound Active (Click to Mute)'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-blue-600" />}
            <span className="text-[11px] hidden sm:inline">{isMuted ? 'Muted' : 'Sound ON'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
            title="Refresh Tasks"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick 1-Click Break Pills when shift is active and NOT on break */}
      {isShiftActive && !isOnBreak && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
            <Coffee className="h-3.5 w-3.5 text-amber-600" />
            <span>Quick Break:</span>
          </div>
          <button
            type="button"
            onClick={() => handleStartBreak('Lunch Break')}
            disabled={actionLoading === 'break_start'}
            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 transition shadow-2xs active:scale-95"
          >
            <span>🍱 Lunch Break</span>
          </button>
          <button
            type="button"
            onClick={() => handleStartBreak('Washroom Break')}
            disabled={actionLoading === 'break_start'}
            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-900 transition shadow-2xs active:scale-95"
          >
            <span>🚻 Washroom</span>
          </button>
          <button
            type="button"
            onClick={() => handleStartBreak('Tea / Coffee Break')}
            disabled={actionLoading === 'break_start'}
            className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-900 transition shadow-2xs active:scale-95"
          >
            <span>☕ Tea Break</span>
          </button>
          <button
            type="button"
            onClick={() => handleStartBreak('Prayer Break')}
            disabled={actionLoading === 'break_start'}
            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-900 transition shadow-2xs active:scale-95"
          >
            <span>🤲 Prayer</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBreakModal(true)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition shadow-2xs"
          >
            <span>More Breaks...</span>
          </button>
        </div>
      )}

      {/* ACTIVE BREAK CONTROLLER BANNER */}
      {isShiftActive && isOnBreak && (
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 p-5 shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-200 animate-pulse">
                <Coffee className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-200/90 text-amber-900 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    Break Active
                  </span>
                  <span className="text-sm font-bold text-amber-950">
                    {activeBreak?.reason || 'Standard Break'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-950 mt-1 flex items-baseline gap-2">
                  <span>{formatTimer(breakElapsedSeconds)}</span>
                  <span className="text-xs font-semibold text-amber-700 font-sans">elapsed</span>
                </div>
                <div className="text-[11px] text-amber-800/90 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium">
                  <span className="inline-flex items-center gap-1 text-amber-900 font-semibold">
                    <VolumeX className="h-3 w-3 text-amber-700" /> Sound muted during break
                  </span>
                  <span>•</span>
                  <span>Task countdown timers continue ticking in background.</span>
                  <span>•</span>
                  <span>When you end break, expired tasks will ring and appear unchecked.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEndBreak}
                disabled={actionLoading === 'break_end'}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-emerald-200 transition active:scale-95 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                <span>{actionLoading === 'break_end' ? 'Ending Break...' : 'End Break & Resume Work'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 1: SHIFT IS OFF / INACTIVE -> SHOW SHIFT START PROMPT */}
      {!isShiftActive && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
                <Power className="h-7 w-7 text-slate-600" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600 border border-slate-200 mb-2">
                  Shift is Inactive (OFF)
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Your Shift Has Not Started Yet
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Scheduled tasks, individual timers, and alarm bells will activate as soon as you toggle ON your shift.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleToggleShift}
                  disabled={actionLoading === 'shift_toggle'}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition active:scale-95"
                >
                  <Power className="h-4 w-4" />
                  <span>Start Shift & Activate Tasks</span>
                </button>
              </div>

              {assignedShift && (
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Assigned Shift: <strong>{assignedShift.name}</strong> ({assignedShift.startTime} – {assignedShift.endTime})
                </div>
              )}
            </div>
          </div>

          {/* Preview of Configured Checklist Tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Configured Tasks Ready For Your Shift (7 Tasks)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Starts with shift</span>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.flatMap((t) => t.checklists || []).map((item: any, idx: number) => (
                <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    <span className="font-semibold text-slate-800">{item.title}</span>
                  </div>
                  <span className="rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-mono font-medium">
                    Every {item.timerMinutes || 60}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: SHIFT IS ACTIVE AND ALL TASKS ARE DONE -> SHOW NEXT TASK COUNTDOWN */}
      {isShiftActive && allTasksAreDone && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Hero Celebration & Countdown Banner */}
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/50 p-6 sm:p-8 shadow-sm text-center relative overflow-hidden ring-1 ring-emerald-100">
            <div className="relative z-10 max-w-xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/90 text-emerald-800 px-3.5 py-1 text-xs font-bold border border-emerald-300 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>All Tasks Completed For Now!</span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  You are all caught up!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  All scheduled checklist items have been checked off. The countdown below tracks your next recurring task reminder.
                </p>
              </div>

              {/* Big Digital Countdown Clock */}
              {nextDueItem ? (
                <div className="py-4">
                  <div className="inline-flex flex-col items-center justify-center rounded-2xl bg-slate-900 text-white p-6 shadow-xl border border-slate-800 min-w-[260px]">
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-spin" />
                      Next Task Countdown
                    </span>
                    <span className="text-4xl sm:text-5xl font-mono font-extrabold tracking-wider text-emerald-400">
                      {formatTimer(nextDueItem.secondsUntilNext)}
                    </span>
                    <div className="mt-2 text-xs font-medium text-slate-300 text-center max-w-[220px] truncate">
                      {nextDueItem.title}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Runs every {nextDueItem.timerMinutes} minutes
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-xs text-slate-500 font-medium">
                  No upcoming recurring task timers configured for this shift.
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>When the timer reaches 00:00, the task will automatically appear here with sound alert.</span>
              </div>
            </div>
          </div>

          {/* Upcoming Tasks Timeline Matrix Card */}
          {upcomingItems.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Next Upcoming Task Timers ({upcomingItems.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Live recurring intervals
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingItems.map((item, idx) => {
                  const isNext = idx === 0;

                  return (
                    <div
                      key={item.checklistId}
                      className={`rounded-xl border p-3.5 transition flex flex-col justify-between ${
                        isNext
                          ? 'bg-blue-50/70 border-blue-200 ring-2 ring-blue-300/50 shadow-sm'
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {isNext ? 'Next Due' : `In Queue #${idx + 1}`}
                          </span>
                          <span className="rounded-md bg-amber-50 text-amber-900 px-1.5 py-0.2 text-[9px] font-semibold border border-amber-200 font-mono">
                            Every {item.timerMinutes}m
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {item.title}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Due in:</span>
                        <span
                          className={`text-sm font-bold font-mono ${
                            isNext ? 'text-blue-700' : 'text-slate-800'
                          }`}
                        >
                          {formatTimer(item.secondsUntilNext)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle Accordion to View Completed Checklists */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowCompletedAccordion(!showCompletedAccordion)}
              className="w-full p-4 text-left flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  Review Today's Completed Checklists ({completedTasks.length} Tasks)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>{showCompletedAccordion ? 'Hide' : 'Show Details'}</span>
                {showCompletedAccordion ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showCompletedAccordion && (
              <div className="p-4 sm:p-5 space-y-4 border-t border-slate-100">
                {completedTasks.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{t.taskName}</span>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                        Checked
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {t.checklists.map((cl: any) => (
                        <div
                          key={cl.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span className="text-slate-700">{cl.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cl.completedAt
                              ? new Date(cl.completedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Done'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATE 3: SHIFT IS ACTIVE AND TASKS ARE PENDING -> SHOW TASKS WITH CHECKLISTS */}
      {isShiftActive && !allTasksAreDone && (
        <div className="space-y-6">
          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search pending tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Pending Tasks Banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                You have <strong>{totalPendingItems}</strong> pending checklist item{totalPendingItems > 1 ? 's' : ''} to check. Complete them below to resume the next task countdown.
              </span>
            </div>
            <span className="rounded-full bg-amber-200/80 text-amber-900 px-2 py-0.5 text-[10px] font-bold font-mono">
              Action Required
            </span>
          </div>

          {/* List of Pending Tasks with Checklists */}
          <div className="space-y-4">
            {filteredPending.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                {loading ? 'Loading scheduled tasks...' : 'No pending tasks matching selected filters.'}
              </div>
            ) : (
              filteredPending.map((task) => {
                const isAllChecking = actionLoading === 'all_' + task.id;

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition space-y-4 ring-1 ring-slate-100"
                  >
                    {/* Task Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{task.taskName}</h3>
                          <span className="rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 border border-amber-200">
                            {task.taskPendingCount} Pending
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Category: <strong className="text-slate-700">{task.category}</strong>
                          {task.startTime && task.dueTime && (
                            <>
                              {' '}• Shift Window:{' '}
                              <span className="font-mono text-slate-600">
                                {task.startTime} – {task.dueTime}
                              </span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Quick "Check All Pending" button for this task */}
                      <button
                        type="button"
                        onClick={() => handleCheckAllPendingInTask(task)}
                        disabled={isAllChecking}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{isAllChecking ? 'Checking...' : 'Check All Pending'}</span>
                      </button>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                        {task.description}
                      </p>
                    )}

                    {/* Interactive Checklist Items */}
                    <div className="space-y-2.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5 text-blue-600" />
                        <span>Checklist Items:</span>
                      </div>

                      <div className="space-y-2">
                        {task.checklists.map((cl: any) => {
                          const isChecking = actionLoading === cl.id;
                          const isDue = cl.isPending;

                          return (
                            <div
                              key={cl.id}
                              className={`rounded-xl border p-3 transition flex items-center justify-between gap-3 ${
                                isDue
                                  ? 'bg-amber-50/60 border-amber-200 ring-1 ring-amber-300'
                                  : 'bg-emerald-50/20 border-emerald-100'
                              }`}
                            >
                              <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                                <input
                                  type="checkbox"
                                  checked={!cl.isPending}
                                  onChange={() =>
                                    handleToggleChecklist(task.id, cl.id, !cl.isPending)
                                  }
                                  disabled={isChecking}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />

                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-xs font-semibold ${
                                        !cl.isPending
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-900 font-bold'
                                      }`}
                                    >
                                      {cl.title}
                                    </span>

                                    {/* Timer Interval */}
                                    {cl.timerMinutes && (
                                      <span className="rounded-md bg-amber-50 text-amber-900 px-1.5 py-0.2 text-[10px] font-semibold border border-amber-200 font-mono flex items-center gap-1">
                                        <Timer className="h-3 w-3 text-amber-600" />
                                        Every {cl.timerMinutes}m
                                      </span>
                                    )}

                                    {cl.isRequired && (
                                      <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>

                              {/* Status Badge */}
                              <div>
                                {cl.isRecurringDue ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-bold animate-pulse shadow-sm">
                                    <BellRing className="h-3 w-3" />
                                    DUE NOW
                                  </span>
                                ) : cl.isPending ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                                    <Clock className="h-3 w-3" />
                                    Pending Check
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold font-mono">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Done ({formatTimer(cl.secondsUntilNext)})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Break Selection Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Coffee className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Take a Work Break</h3>
                  <p className="text-[11px] text-slate-500">Choose your break reason</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { reason: 'Lunch Break', icon: '🍱', label: 'Lunch Break', desc: 'Meal time (30-60 min)' },
                { reason: 'Washroom Break', icon: '🚻', label: 'Washroom / Restroom', desc: 'Short comfort break (5-10 min)' },
                { reason: 'Tea / Coffee Break', icon: '☕', label: 'Tea / Coffee Break', desc: 'Quick refresh (10-15 min)' },
                { reason: 'Prayer Break', icon: '🤲', label: 'Prayer Break', desc: 'Prayer time (15 min)' },
                { reason: 'Personal Break', icon: '🚶', label: 'Personal Break', desc: 'Short personal pause' },
                { reason: 'Other', icon: '✏️', label: 'Other Reason', desc: 'Specify custom break reason' },
              ].map((item) => {
                const isSelected = breakReason === item.reason;
                return (
                  <button
                    key={item.reason}
                    type="button"
                    onClick={() => setBreakReason(item.reason)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-300'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.label}</div>
                        <div className="text-[10px] text-slate-500">{item.desc}</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="breakOption"
                      checked={isSelected}
                      onChange={() => setBreakReason(item.reason)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                    />
                  </button>
                );
              })}

              {breakReason === 'Other' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Break Reason:
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="e.g. Doctor Call, Quick Errand, etc."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-[11px] text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                <VolumeX className="h-3.5 w-3.5 text-amber-700" />
                Notification Mute & Timer Continuity:
              </div>
              <p>
                During your break, task alarm bells will not ring. Task countdown timers will keep ticking in the background. When you end your break, any expired tasks will immediately alert and prompt you to check off.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBreakModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStartBreak()}
                disabled={actionLoading === 'break_start' || (breakReason === 'Other' && !customReason.trim())}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-amber-200 transition active:scale-95 disabled:opacity-50"
              >
                <Coffee className="h-3.5 w-3.5" />
                <span>{actionLoading === 'break_start' ? 'Starting...' : 'Start Break'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
