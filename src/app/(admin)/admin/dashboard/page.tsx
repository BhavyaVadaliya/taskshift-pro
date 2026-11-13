'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  Coffee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hourglass,
  RefreshCw,
  Filter,
  ArrowUpRight,
  Sparkles,
  MousePointer,
  Check,
} from 'lucide-react';
import { formatDurationMinutes, getTodayDateString } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedDepartment ? { department: selectedDepartment } : {}),
        ...(selectedShift ? { shift: selectedShift } : {}),
        ...(selectedStatus ? { status: selectedStatus } : {}),
      });

      const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedDepartment, selectedShift, selectedStatus]);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30s
    const timer = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  const metrics = data?.metrics || {
    totalEmployees: 0,
    employeesWorking: 0,
    employeesNotStarted: 0,
    employeesOnBreak: 0,
    employeesIdle15mCount: 0,
    completedTasksToday: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    missedTasks: 0,
    onTimeTasks: 0,
    lateTasks: 0,
  };

  const filteredActivity = (data?.liveActivity || []).filter((emp: any) => {
    if (!employeeSearch) return true;
    const term = employeeSearch.toLowerCase();
    return (
      emp.employeeName.toLowerCase().includes(term) ||
      emp.employeeId.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Filter Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Operations & Shift Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time employee shift attendance, task completions, and active floor activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-blue-600 focus:outline-none"
          />

          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            title="Refresh Live Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
          <Filter className="h-3.5 w-3.5 text-blue-600" />
          <span>Filters:</span>
        </div>

        {/* Department Filter */}
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Departments</option>
          {data?.filters?.departments?.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Shift Filter */}
        <select
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Shifts</option>
          {data?.filters?.shifts?.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Task Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Task Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="OVERDUE">Overdue</option>
          <option value="MISSED">Missed</option>
        </select>

        {/* Reset Filters */}
        {(selectedDepartment || selectedShift || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedDepartment('');
              setSelectedShift('');
              setSelectedStatus('');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Employees */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Employees</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalEmployees}</div>
          <div className="mt-1 text-[11px] text-slate-500">Registered staff</div>
        </div>

        {/* Employees Currently Working */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800">Currently Working</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{metrics.employeesWorking}</div>
          <div className="mt-1 text-[11px] text-emerald-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active clocked-in</span>
          </div>
        </div>

        {/* 15m+ Inactive Staff (Mouse Idle) */}
        <div
          className={`rounded-xl border p-4 shadow-sm transition ${
            (metrics.employeesIdle15mCount || 0) > 0
              ? 'border-red-300 bg-red-50/40'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold ${
                (metrics.employeesIdle15mCount || 0) > 0 ? 'text-red-800' : 'text-slate-500'
              }`}
            >
              15m+ Idle (No Mouse)
            </span>
            <div
              className={`rounded-lg p-2 ${
                (metrics.employeesIdle15mCount || 0) > 0
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <MousePointer className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              (metrics.employeesIdle15mCount || 0) > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {metrics.employeesIdle15mCount || 0}
          </div>
          <div
            className={`mt-1 text-[11px] ${
              (metrics.employeesIdle15mCount || 0) > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'
            }`}
          >
            {(metrics.employeesIdle15mCount || 0) > 0 ? 'Inactive staff detected' : 'All working staff active'}
          </div>
        </div>

        {/* Employees on Break */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Employees on Break</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Coffee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{metrics.employeesOnBreak}</div>
          <div className="mt-1 text-[11px] text-amber-700">Temporary break</div>
        </div>

        {/* Employees Not Started */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Not Started</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700">{metrics.employeesNotStarted}</div>
          <div className="mt-1 text-[11px] text-slate-400">Awaiting shift punch-in</div>
        </div>

        {/* Completed Tasks Today */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed Tasks</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{metrics.completedTasksToday}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {metrics.onTimeTasks} on-time, {metrics.lateTasks} late
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Tasks</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{metrics.pendingTasks}</div>
          <div className="mt-1 text-[11px] text-slate-500">In-progress or scheduled</div>
        </div>

        {/* Overdue Tasks */}
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-800">Overdue Tasks</span>
            <div className="rounded-lg bg-red-100 p-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600">{metrics.overdueTasks}</div>
          <div className="mt-1 text-[11px] text-red-700 font-medium">Requires supervisor attention</div>
        </div>

        {/* Missed Tasks */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Missed Tasks</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700">{metrics.missedTasks}</div>
          <div className="mt-1 text-[11px] text-slate-500">Uncompleted at shift end</div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart 1: Daily Task Completion Trends (Last 7 Days) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Task Completion Trends (7-Day Overview)</h2>
              <p className="text-[11px] text-slate-400">Daily throughput of completed tasks vs overdue incidents</p>
            </div>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
              Daily Recorded
            </span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
            {(data?.charts?.dailyCompletion || []).map((day: any) => {
              const maxVal = Math.max(1, ...data.charts.dailyCompletion.map((d: any) => d.total || 1));
              const heightPct = Math.min(100, Math.round((day.completed / maxVal) * 100));

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex justify-center items-end h-40">
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-8 sm:w-10 rounded-t-lg bg-blue-600 group-hover:bg-blue-700 transition relative flex flex-col justify-between p-1 shadow-sm"
                    >
                      <span className="text-[10px] font-bold text-white text-center">
                        {day.completed}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-semibold text-slate-700 block">{day.day}</span>
                    <span className="text-[9px] text-slate-400 block">{day.date.substring(5)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Task Status Distribution Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Today's Task Distribution</h2>
            <p className="text-[11px] text-slate-400">On-time, late, overdue, and missed breakdown</p>
          </div>

          <div className="space-y-3 pt-2">
            {(data?.charts?.taskStatusBreakdown || []).map((item: any) => {
              const totalTasks =
                metrics.completedTasksToday + metrics.pendingTasks + metrics.overdueTasks + metrics.missedTasks || 1;
              const percent = Math.round((item.value / totalTasks) * 100);

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-slate-900 font-bold">
                      {item.value} <span className="text-[10px] text-slate-400 font-normal">({percent}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${percent}%`, backgroundColor: item.color }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-3 border border-slate-100 text-[11px] text-slate-600">
            💡 <span className="font-medium text-slate-800">Operational Target:</span> Maintain on-time completion above 85% to prevent bottleneck escalations.
          </div>
        </div>
      </div>

      {/* Live Employee Activity Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900">Live Employee Floor & Task Activity</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Current real-time status of all employees scheduled for shift today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by name, ID, or dept..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Assigned Shift</th>
                <th className="py-3 px-3">Shift Timing</th>
                <th className="py-3 px-3">Actual Start</th>
                <th className="py-3 px-3">Floor Status</th>
                <th className="py-3 px-3">Mouse Activity (15m+)</th>
                <th className="py-3 px-3">Tasks Progress</th>
                <th className="py-3 px-3">Shift Duration</th>
                <th className="py-3 px-4">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivity.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                    No employee activity records found matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredActivity.map((emp: any) => {
                  const statusColors: Record<string, string> = {
                    Working: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'Working (Late In)': 'bg-amber-50 text-amber-700 border-amber-200',
                    'On Break': 'bg-blue-50 text-blue-700 border-blue-200',
                    'Shift Ended': 'bg-slate-100 text-slate-700 border-slate-200',
                    'Forgotten Logout': 'bg-red-50 text-red-700 border-red-200',
                    'Not Started': 'bg-slate-50 text-slate-500 border-slate-200',
                  };

                  return (
                    <tr key={emp.userId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">{emp.department}</td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800">{emp.shiftName}</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-500">
                        {emp.shiftStartTime} - {emp.expectedShiftEnd}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {emp.actualShiftStart ? (
                          <div>
                            <span className="text-slate-800 font-medium">
                              {new Date(emp.actualShiftStart).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {emp.isLate && (
                              <span className="ml-1.5 rounded bg-red-50 px-1 py-0.5 text-[9px] text-red-600 font-bold">
                                +{emp.lateMinutes}m
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                            statusColors[emp.currentStatus] || 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          {emp.currentStatus === 'Working' && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          {emp.currentStatus === 'On Break' && (
                            <Coffee className="h-3 w-3 text-amber-600" />
                          )}
                          {emp.currentStatus}
                          {emp.currentStatus === 'On Break' && emp.activeBreak?.reason && (
                            <span className="font-bold text-amber-800">({emp.activeBreak.reason})</span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {!emp.isShiftActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-semibold border border-slate-200">
                            <MousePointer className="h-3 w-3 text-slate-400" />
                            Shift Off
                          </span>
                        ) : emp.currentStatus === 'On Break' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                            <Coffee className="h-3 w-3 text-amber-600" />
                            Break ({emp.activeBreak?.reason || 'On Break'})
                          </span>
                        ) : emp.isIdle ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-[10px] font-bold border border-red-200 animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            Inactive {emp.idleMinutes}m
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold border border-emerald-200">
                            <MousePointer className="h-3 w-3 text-emerald-600" />
                            Active ({emp.idleMinutes === 0 ? 'Now' : `${emp.idleMinutes}m ago`})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800">
                            {emp.completedTasks}/{emp.totalAssignedTasks}
                          </span>
                          <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{
                                width: `${
                                  emp.totalAssignedTasks > 0
                                    ? Math.round((emp.completedTasks / emp.totalAssignedTasks) * 100)
                                    : 0
                                }%`,
                              }}
                              className="h-full bg-blue-600 rounded-full"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700">
                        {emp.shiftDurationMins > 0 ? formatDurationMinutes(emp.shiftDurationMins) : '--'}
                      </td>

                      <td className="py-3 px-4">
                        {emp.lastActivity ? (
                          <div>
                            <span className="text-[11px] font-medium text-slate-700 block">
                              {emp.lastActivity.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(emp.lastActivity.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">No logs today</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Break Logs & History Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Employee Break Logs & History
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                {(data?.breaksToday || []).length} Recorded Today
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of all employee breaks (Lunch, Washroom, Tea, etc.) with exact start/end timestamps and durations.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Date: {selectedDate}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Break Type / Reason</th>
                <th className="py-3 px-3">Start Time</th>
                <th className="py-3 px-3">End Time</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.breaksToday || data.breaksToday.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Coffee className="h-6 w-6 text-slate-300" />
                      <span className="font-semibold text-slate-600">No Breaks Recorded Yet Today</span>
                      <span className="text-[11px] text-slate-400">
                        When employees start a break (Lunch, Washroom, Tea), it will appear here in real-time.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.breaksToday.map((b: any, idx: number) => {
                  const getReasonBadge = (reason: string) => {
                    const r = (reason || '').toLowerCase();
                    if (r.includes('lunch')) {
                      return { bg: 'bg-amber-50 text-amber-900 border-amber-200', icon: '🍱' };
                    }
                    if (r.includes('washroom') || r.includes('restroom')) {
                      return { bg: 'bg-blue-50 text-blue-900 border-blue-200', icon: '🚻' };
                    }
                    if (r.includes('tea') || r.includes('coffee')) {
                      return { bg: 'bg-orange-50 text-orange-900 border-orange-200', icon: '☕' };
                    }
                    if (r.includes('prayer')) {
                      return { bg: 'bg-purple-50 text-purple-900 border-purple-200', icon: '🤲' };
                    }
                    return { bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: '⏸️' };
                  };
                  const badge = getReasonBadge(b.reason || '');

                  return (
                    <tr
                      key={b.id || idx}
                      className={`hover:bg-slate-50/80 transition ${b.isOngoing ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{b.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.employeeId}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {b.department}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badge.bg}`}>
                          <span>{badge.icon}</span>
                          <span>{b.reason}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800">
                        {b.startTimeFormatted}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800">
                        {b.isOngoing ? (
                          <span className="text-amber-700 font-semibold italic">In Progress</span>
                        ) : (
                          b.endTimeFormatted
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {b.durationMinutes}m {b.isOngoing ? 'elapsed' : ''}
                      </td>
                      <td className="py-3 px-4">
                        {b.isOngoing ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
                            Currently On Break
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold">
                            <Check className="h-3 w-3 text-emerald-600" />
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 15-Minute Mouse Inactivity Audit Log Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Floor-Wide 15-Minute Mouse Inactivity Audit Log
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                {(data?.inactivityLogs || []).length} Recorded Today
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live chronological log of all instances where employees did not move their mouse or interact for 15+ minutes.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Date: {selectedDate}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Activity Status</th>
                <th className="py-3 px-3">Duration Idle</th>
                <th className="py-3 px-4">Audit Details & Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.inactivityLogs || data.inactivityLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      <span className="font-semibold text-slate-700">No 15-Minute Inactivity Incidents Recorded</span>
                      <span className="text-[11px] text-slate-400">
                        Clocked-in employees are actively interacting and moving their mouse at their workstations.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.inactivityLogs.map((log: any, idx: number) => {
                  const isInactive = log.action === 'MOUSE_INACTIVE_15M';
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition ${isInactive ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{log.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.employeeId}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800">
                        {log.timeFormatted}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            isInactive
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isInactive ? (
                            <>
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              15m+ Inactivity (No Mouse)
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              Activity Resumed
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {log.idleMinutes}m
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {log.notes ||
                          (isInactive
                            ? 'Employee stopped moving mouse or typing for 15+ minutes during active shift.'
                            : 'Employee returned to workstation and resumed mouse or keyboard interaction.')}
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

