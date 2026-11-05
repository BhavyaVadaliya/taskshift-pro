'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import {
  Clock,
  Play,
  Square,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Hourglass,
  Calendar,
  ChevronRight,
  ListChecks,
  Check,
  MessageSquare,
  Bell,
  Sparkles,
  ArrowRight,
  Radio,
  X,
} from 'lucide-react';
import { formatDurationMinutes, getTodayDateString } from '@/lib/utils';
import { soundPlayer } from '@/lib/audio';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { pushPermission, requestPushPermission } = useNotifications();

  const [shiftData, setShiftData] = useState<any>(null);
  const [tasksData, setTasksData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live clocks & timers
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [liveShiftSeconds, setLiveShiftSeconds] = useState<number>(0);
  const [liveBreakSeconds, setLiveBreakSeconds] = useState<number>(0);

  // Selected Task Drawer / Modal
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [checklistComments, setChecklistComments] = useState<Record<string, string>>({});
  const [taskComments, setTaskComments] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Category Filter
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'overdue' | 'completed'>('active');

  // Confirmation modal for End Shift
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);

  // Fetch current shift and tasks
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [shiftRes, tasksRes] = await Promise.all([
        fetch('/api/employee/shift/current'),
        fetch('/api/employee/tasks'),
      ]);

      if (shiftRes.ok) {
        const sJson = await shiftRes.json();
        setShiftData(sJson);
      }
      if (tasksRes.ok) {
        const tJson = await tasksRes.json();
        setTasksData(tJson);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll updates every 20s
    const poller = setInterval(fetchData, 20000);
    return () => clearInterval(poller);
  }, [fetchData]);

  // Live Current Time Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live Shift Duration Ticker
  useEffect(() => {
    if (!shiftData?.attendance || !shiftData.isShiftActive) {
      setLiveShiftSeconds(0);
      return;
    }

    const startMs = new Date(shiftData.attendance.actualStart).getTime();

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      // subtract total breaks
      const totalBreakSec = (shiftData.attendance.breakMinutes || 0) * 60;
      setLiveShiftSeconds(Math.max(0, elapsedSec - totalBreakSec));

      if (shiftData.activeBreak) {
        const breakStartMs = new Date(shiftData.activeBreak.startTime).getTime();
        setLiveBreakSeconds(Math.max(0, Math.floor((nowMs - breakStartMs) / 1000)));
      } else {
        setLiveBreakSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shiftData]);

  const formatTimerHHMMSS = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Shift Actions
  const handleStartShift = async () => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/employee/shift/start', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        soundPlayer.playChime('success');
        fetchData();
      } else {
        setErrorMessage(data.error || 'Failed to start shift');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/employee/shift/end', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowEndShiftModal(false);
        soundPlayer.playChime('success');
        fetchData();
      } else {
        setErrorMessage(data.error || 'Failed to end shift');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBreak = async () => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      const endpoint = shiftData?.activeBreak
        ? '/api/employee/shift/break/end'
        : '/api/employee/shift/break/start';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Regular Break' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        soundPlayer.playChime('reminder');
        fetchData();
      } else {
        setErrorMessage(data.error || 'Break action failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Task Actions
  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/employee/tasks/${taskId}/start`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        soundPlayer.playChime('success');
        fetchData();
      } else {
        setErrorMessage(data.error || 'Failed to start task');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleChecklist = async (instanceId: string, checklistId: string, currentVal: boolean) => {
    try {
      setErrorMessage(null);
      const comment = checklistComments[checklistId] || '';
      const res = await fetch(`/api/employee/tasks/${instanceId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistId,
          isCompleted: !currentVal,
          comments: comment,
        }),
      });

      if (res.ok) {
        soundPlayer.playChime('reminder');
        fetchData();
        // Update local selectedTask
        if (selectedTask && selectedTask.id === instanceId) {
          setSelectedTask({
            ...selectedTask,
            checklists: selectedTask.checklists.map((c: any) =>
              c.id === checklistId ? { ...c, isCompleted: !currentVal } : c
            ),
          });
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleCompleteTask = async (instanceId: string) => {
    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/employee/tasks/${instanceId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeComments: taskComments }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundPlayer.playChime('success');
        setSelectedTask(null);
        setTaskComments('');
        fetchData();
      } else {
        setErrorMessage(data.error || 'Failed to complete task');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter tasks based on active category tab
  const allTasks = tasksData?.tasks || [];
  const activeTasks = tasksData?.activeTasks || [];
  const upcomingTasks = tasksData?.upcomingTasks || [];
  const overdueTasks = tasksData?.overdueTasks || [];
  const completedTasks = tasksData?.completedTasks || [];

  const displayTasks =
    activeTab === 'all'
      ? allTasks
      : activeTab === 'active'
      ? activeTasks
      : activeTab === 'upcoming'
      ? upcomingTasks
      : activeTab === 'overdue'
      ? overdueTasks
      : completedTasks;

  const progress = tasksData?.progress || {
    totalRequiredItems: 0,
    completedRequiredItems: 0,
    progressPercent: 0,
  };

  const isShiftActive = shiftData?.isShiftActive;
  const assignedShift = shiftData?.assignedShift;
  const attendance = shiftData?.attendance;
  const activeBreak = shiftData?.activeBreak;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Shift Status Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                Workspace Dashboard
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-mono">
                {new Date().toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Welcome back, {user?.fullName}!
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>
                Employee ID: <strong className="font-mono text-slate-800">{user?.employeeId}</strong>
              </span>
              <span>•</span>
              <span>
                Assigned Shift:{' '}
                <strong className="text-slate-800">{assignedShift?.name || 'Standard Shift'}</strong>{' '}
                <span className="font-mono text-slate-500">
                  ({assignedShift?.startTime} – {assignedShift?.endTime})
                </span>
              </span>
            </div>
          </div>

          {/* Right Live Time & Status */}
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-1.5 font-mono text-xs font-bold text-slate-800 shadow-inner">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span>{currentTimeStr || '--:--:--'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                  isShiftActive
                    ? activeBreak
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : attendance?.actualEnd
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {isShiftActive && !activeBreak && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
                {isShiftActive
                  ? activeBreak
                    ? 'On Temporary Break'
                    : 'Shift Active & Working'
                  : attendance?.actualEnd
                  ? 'Shift Completed Today'
                  : 'Shift Not Started'}
              </span>
            </div>
          </div>
        </div>

        {/* Browser Push Permission Alert (if default or denied) */}
        {pushPermission !== 'granted' && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <Radio className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
              <span>
                <strong>Browser push notifications are currently disabled.</strong> Allow notifications so you receive
                scheduled reminders even when this tab is closed.
              </span>
            </div>
            <button
              onClick={requestPushPermission}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm shrink-0 ml-3"
            >
              Enable Notifications
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Middle Grid: Shift Controls & Overall Progress Ring */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Shift Control Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Shift Clock & Attendance Operations</h2>
                <p className="text-[11px] text-slate-500">Record exact punch in, breaks, and shift completion.</p>
              </div>
              <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {assignedShift?.name || 'General Shift'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-5">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Shift Clock-In</span>
                <span className="text-base font-bold font-mono text-slate-900 block">
                  {attendance?.actualStart
                    ? new Date(attendance.actualStart).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </span>
                {attendance?.isLate && (
                  <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
                    +{attendance.lateMinutes}m Late
                  </span>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Expected End</span>
                <span className="text-base font-bold font-mono text-slate-900 block">
                  {assignedShift?.endTime || '--:--'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Grace: +{assignedShift?.gracePeriodMinutes || 15}m
                </span>
              </div>

              <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-100">
                <span className="text-[11px] text-blue-700 block mb-1 font-medium">Live Shift Duration</span>
                <span className="text-lg font-bold font-mono text-blue-900 block tracking-wider">
                  {isShiftActive
                    ? formatTimerHHMMSS(liveShiftSeconds)
                    : attendance?.actualEnd
                    ? formatDurationMinutes(attendance.totalDurationMinutes)
                    : '00:00:00'}
                </span>
                {activeBreak && (
                  <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                    Break: {formatTimerHHMMSS(liveBreakSeconds)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            {!isShiftActive && !attendance?.actualEnd && (
              <button
                onClick={handleStartShift}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Start Shift Now</span>
              </button>
            )}

            {isShiftActive && (
              <>
                <button
                  onClick={handleToggleBreak}
                  disabled={actionLoading}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm border ${
                    activeBreak
                      ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Coffee className="h-4 w-4" />
                  <span>{activeBreak ? 'End Break' : 'Start Break'}</span>
                </button>

                <button
                  onClick={() => setShowEndShiftModal(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition ml-auto"
                >
                  <Square className="h-4 w-4 fill-white" />
                  <span>End Shift</span>
                </button>
              </>
            )}

            {attendance?.actualEnd && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  Your shift for today has been concluded (Total duration:{' '}
                  {formatDurationMinutes(attendance.totalDurationMinutes)}).
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Overall Progress Indicator Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Today's Task Progress</h2>
              <span className="text-[10px] text-slate-400 font-mono">
                {progress.completedRequiredItems}/{progress.totalRequiredItems} Items
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              {/* Circular Gauge / Percentage Indicator */}
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress Fill */}
                  <path
                    className="text-blue-600 transition-all duration-700 ease-out"
                    strokeDasharray={`${progress.progressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {progress.progressPercent}%
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-600 border border-slate-100">
            <span className="font-semibold text-slate-800">
              {progress.totalRequiredItems - progress.completedRequiredItems === 0
                ? '🎉 All required checklists completed!'
                : `${progress.totalRequiredItems - progress.completedRequiredItems} required items remaining`}
            </span>
          </div>
        </div>
      </div>

      {/* Task Section */}
      <div className="space-y-4">
        {/* Category Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { id: 'active', label: 'Active Tasks', count: activeTasks.length },
              { id: 'overdue', label: 'Overdue', count: overdueTasks.length, isDanger: true },
              { id: 'upcoming', label: 'Upcoming', count: upcomingTasks.length },
              { id: 'completed', label: 'Completed', count: completedTasks.length },
              { id: 'all', label: 'All Tasks', count: allTasks.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    activeTab === tab.id
                      ? 'bg-blue-700 text-white'
                      : tab.isDanger && tab.count > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 hidden sm:block">
            {displayTasks.length} task{displayTasks.length === 1 ? '' : 's'} shown
          </span>
        </div>

        {/* Task Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayTasks.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              No tasks found in the "{activeTab}" category.
            </div>
          ) : (
            displayTasks.map((t: any) => {
              const priorityColors: Record<string, string> = {
                URGENT: 'bg-red-50 text-red-700 border-red-200',
                HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
                MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
                LOW: 'bg-slate-50 text-slate-600 border-slate-200',
              };

              const isCompleted = t.status === 'COMPLETED' || t.status === 'COMPLETED_LATE';
              const isOverdue = t.status === 'OVERDUE';
              const isInProgress = t.status === 'IN_PROGRESS';

              return (
                <div
                  key={t.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition flex flex-col justify-between ${
                    isOverdue
                      ? 'border-red-300 ring-1 ring-red-100 bg-red-50/10'
                      : isInProgress
                      ? 'border-blue-300 ring-1 ring-blue-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header: Title, Category, Priority */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{t.taskName}</h3>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              priorityColors[t.priority] || priorityColors.MEDIUM
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          Category: <span className="font-medium text-slate-700">{t.category}</span>
                        </span>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isOverdue
                            ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                            : isInProgress
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Description & Instructions */}
                    {t.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                        {t.description}
                      </p>
                    )}

                    {/* Timings */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        <span>
                          Time: <strong className="font-mono text-slate-800">{t.startTime}</strong> –{' '}
                          <strong className="font-mono text-slate-800">{t.dueTime}</strong>
                        </span>
                      </div>
                      <div className="text-right text-[11px] font-mono text-slate-500">
                        {t.completedAt ? (
                          <span className="text-emerald-700 font-semibold">
                            Completed at {new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : isOverdue ? (
                          <span className="text-red-600 font-bold">Overdue</span>
                        ) : (
                          <span>Due today at {t.dueTime}</span>
                        )}
                      </div>
                    </div>

                    {/* Checklist Progress Bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">Checklist Progress</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {t.completedChecklists}/{t.totalChecklists} ({t.progressPercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${t.progressPercent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-600' : isOverdue ? 'bg-red-500' : 'bg-blue-600'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedTask(t);
                        setTaskComments(t.employeeComments || '');
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                    >
                      <ListChecks className="h-4 w-4" />
                      <span>View & Check Items</span>
                    </button>

                    <div>
                      {t.status === 'NOT_STARTED' && (
                        <button
                          onClick={() => handleStartTask(t.id)}
                          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm"
                        >
                          Start Task
                        </button>
                      )}

                      {(t.status === 'IN_PROGRESS' || t.status === 'OVERDUE') && (
                        <button
                          onClick={() => {
                            setSelectedTask(t);
                            setTaskComments(t.employeeComments || '');
                          }}
                          className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
                        >
                          Complete Task
                        </button>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Done</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Checklist Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedTask.taskName}</h3>
                <span className="text-[11px] text-slate-500">
                  Window: {selectedTask.startTime} – {selectedTask.dueTime} • Category: {selectedTask.category}
                </span>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {selectedTask.instructions && (
                <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-100 text-blue-900 leading-relaxed">
                  <strong>Instructions:</strong> {selectedTask.instructions}
                </div>
              )}

              {/* Checklist Items */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">Checklist Items (Tap to Mark)</label>
                <div className="space-y-2.5">
                  {selectedTask.checklists.map((item: any) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 transition ${
                        item.isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => handleToggleChecklist(selectedTask.id, item.id, item.isCompleted)}
                          className="mt-0.5 rounded text-blue-600 h-4 w-4"
                        />
                        <div className="flex-1">
                          <span
                            className={`font-medium block leading-tight ${
                              item.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {item.title}
                            {item.isRequired && <span className="text-red-500 ml-1 font-bold">*</span>}
                          </span>

                          {item.completedAt && (
                            <span className="text-[10px] text-emerald-700 block mt-1 font-mono">
                              ✓ Completed at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {item.isLate && ' (Completed late)'}
                            </span>
                          )}

                          {/* Comment field for this item */}
                          <input
                            type="text"
                            placeholder="Add item note / observation (optional)..."
                            defaultValue={item.comments || ''}
                            onBlur={(e) => {
                              setChecklistComments({
                                ...checklistComments,
                                [item.id]: e.target.value,
                              });
                            }}
                            className="mt-2 w-full rounded border border-slate-200 bg-white p-1 text-[11px] text-slate-700 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Task Comments */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Overall Employee Completion Comments
                </label>
                <textarea
                  rows={2}
                  value={taskComments}
                  onChange={(e) => setTaskComments(e.target.value)}
                  placeholder="Notes, handover details, or comments regarding this task..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>

                {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'COMPLETED_LATE' && (
                  <button
                    type="button"
                    onClick={() => handleCompleteTask(selectedTask.id)}
                    disabled={actionLoading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                  >
                    Finish & Complete Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Summary Confirmation Modal */}
      {showEndShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Confirm Shift Conclusion</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to end your shift now?
              Your total logged duration and task completion status will be saved to your attendance record.
            </p>

            {overdueTasks.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 border border-amber-200">
                ⚠️ You have {overdueTasks.length} unfinished/overdue task(s). Clocking out now will mark remaining tasks
                as missed according to admin policy.
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowEndShiftModal(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Continue Working
              </button>
              <button
                onClick={handleEndShift}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-sm"
              >
                Confirm & End Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
