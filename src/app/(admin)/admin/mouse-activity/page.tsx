'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MousePointer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Check,
  Building,
  Calendar,
  X,
  ExternalLink,
  Coffee,
} from 'lucide-react';
import { getTodayDateString } from '@/lib/utils';
import Link from 'next/link';

export default function AdminMouseActivityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activeTab, setActiveTab] = useState<'ALL' | 'LIVE' | 'LOGS'>('ALL');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'IDLE' | 'OFFLINE'>('ALL');
  const [selectedEmployeeLogs, setSelectedEmployeeLogs] = useState<any | null>(null);

  const fetchActivityData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/monitoring/activity?date=${selectedDate}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load mouse activity data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchActivityData();
    // Auto-refresh every 15s to keep mouse activity statuses live
    const interval = setInterval(fetchActivityData, 15000);
    return () => clearInterval(interval);
  }, [fetchActivityData]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(getTodayDateString());
  };

  const employees: any[] = data?.employees || [];
  const inactivityLogs: any[] = data?.inactivityLogs || [];
  const summary = data?.summary || {
    totalEmployees: 0,
    clockedInCount: 0,
    activeWorkingCount: 0,
    idleCount: 0,
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !searchQuery ||
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.departmentName.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = emp.statusType === 'ACTIVE';
    } else if (statusFilter === 'IDLE') {
      matchesStatus = emp.statusType === 'IDLE_15M';
    } else if (statusFilter === 'OFFLINE') {
      matchesStatus = emp.statusType === 'OFFLINE';
    }

    return matchesSearch && matchesStatus;
  });

  // Filter logs
  const filteredLogs = inactivityLogs.filter((log) => {
    if (selectedEmployeeLogs && log.userId !== selectedEmployeeLogs.userId) {
      return false;
    }
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      log.employeeName.toLowerCase().includes(term) ||
      log.employeeId.toLowerCase().includes(term) ||
      (log.notes && log.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-600 p-2 text-white shadow-md shadow-blue-500/20">
              <MousePointer className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Employee Mouse Activity & 15m Inactivity Monitor
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Live monitoring of mouse movement and automated detection of 15+ minute inactivity periods.
              </p>
            </div>
          </div>
        </div>

        {/* Date Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={handlePrevDay}
              className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 transition"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                selectedDate === getTodayDateString()
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
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
              className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 transition"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => fetchActivityData()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            title="Refresh Live Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 5 Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Registered */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Registered Staff</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{summary.totalEmployees}</div>
          <div className="mt-1 text-[11px] text-slate-400">Total active accounts</div>
        </div>

        {/* Clocked In Staff */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800">Clocked-In Today</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{summary.clockedInCount}</div>
          <div className="mt-1 text-[11px] text-blue-600 font-medium">Active shift attendees</div>
        </div>

        {/* Active Working Mouse */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800">Active Mouse Movement</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <MousePointer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{summary.activeWorkingCount}</div>
          <div className="mt-1 text-[11px] text-emerald-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active within &lt;15m</span>
          </div>
        </div>

        {/* 15m+ Idle Staff */}
        <div
          className={`rounded-2xl border p-4 shadow-sm transition ${
            summary.idleCount > 0 ? 'border-red-300 bg-red-50/50' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${summary.idleCount > 0 ? 'text-red-800' : 'text-slate-500'}`}>
              15m+ Idle (No Mouse)
            </span>
            <div
              className={`rounded-lg p-2 ${
                summary.idleCount > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-bold ${summary.idleCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {summary.idleCount}
          </div>
          <div
            className={`mt-1 text-[11px] ${
              summary.idleCount > 0 ? 'text-red-600 font-bold' : 'text-slate-400'
            }`}
          >
            {summary.idleCount > 0 ? 'Requires supervisor attention' : 'No employees currently idle'}
          </div>
        </div>

        {/* Total Inactivity Episodes Today */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">15m+ Incidents Today</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{inactivityLogs.length}</div>
          <div className="mt-1 text-[11px] text-amber-700">Events logged on {selectedDate}</div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`pb-2.5 transition border-b-2 ${
              activeTab === 'ALL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Views (Floor & Logs)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LIVE')}
            className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'LIVE'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Live Workstation Floor ({employees.length})</span>
            {summary.idleCount > 0 && (
              <span className="rounded-full bg-red-100 text-red-700 px-1.5 py-0.2 text-[10px] font-bold">
                {summary.idleCount} Idle
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>15-Minute Inactivity Audit Trail ({inactivityLogs.length})</span>
          </button>
        </div>

        {/* Live Pulse Indicator */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auto-refreshing every 15s</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name, employee ID, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({employees.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Active ({summary.activeWorkingCount})
          </button>
          <button
            onClick={() => setStatusFilter('IDLE')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              statusFilter === 'IDLE'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            15m+ Idle ({summary.idleCount})
          </button>
          <button
            onClick={() => setStatusFilter('OFFLINE')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              statusFilter === 'OFFLINE'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Shift Off ({employees.length - summary.clockedInCount})
          </button>
        </div>

        {(searchQuery || statusFilter !== 'ALL' || selectedEmployeeLogs) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setSelectedEmployeeLogs(null);
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* SECTION 1: Live Workstation Floor Activity Table */}
      {(activeTab === 'ALL' || activeTab === 'LIVE') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Live Workstation Mouse Floor ({filteredEmployees.length} Staff Monitored)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time mouse activity detection. Workstations with no interaction for 15+ minutes are flagged automatically.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-mono text-slate-600">
                Rule: Inactivity Flag at 15 continuous minutes
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold text-[11px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Assigned Shift</th>
                  <th className="py-3 px-3">Punch-In Time</th>
                  <th className="py-3 px-3">Live Mouse Activity Status</th>
                  <th className="py-3 px-3">Last Movement Recorded</th>
                  <th className="py-3 px-3">Idle Duration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-600 inline mr-2" />
                      Loading live mouse tracking data...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                      No employees found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    return (
                      <tr key={emp.userId} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                              {emp.fullName
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{emp.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          <div>{emp.departmentName}</div>
                          <div className="text-[10px] text-slate-400">{emp.designation}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800">{emp.shiftName}</span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {emp.shiftStart ? (
                            <span className="text-emerald-700 font-semibold">
                              {new Date(emp.shiftStart).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-300">--:--</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {!emp.isShiftActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10px] font-semibold border border-slate-200">
                              <MousePointer className="h-3 w-3 text-slate-400" />
                              Shift Inactive ⚪
                            </span>
                          ) : emp.isOnBreak ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold border border-amber-200">
                              <Coffee className="h-3 w-3 text-amber-600" />
                              ⏸️ On Break ({emp.breakReason || 'Break'})
                            </span>
                          ) : emp.isIdle ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-[10px] font-bold border border-red-200 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              ⚠️ Inactive {emp.idleMinutes}m (No Mouse)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold border border-emerald-200">
                              <MousePointer className="h-3 w-3 text-emerald-600" />
                              🟢 Active ({emp.idleMinutes === 0 ? 'Just now' : `${emp.idleMinutes}m ago`})
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-700">
                          {emp.lastActiveAt ? (
                            new Date(emp.lastActiveAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          ) : (
                            <span className="text-slate-300">--:--:--</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono">
                          {emp.isShiftActive ? (
                            <span className={`font-bold ${emp.isIdle ? 'text-red-700' : 'text-slate-700'}`}>
                              {emp.idleMinutes}m
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedEmployeeLogs(emp);
                              setActiveTab('LOGS');
                            }}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1"
                          >
                            <span>Inspect Logs</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
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
      )}

      {/* SECTION 2: 15-Minute Mouse Inactivity Audit Log Section */}
      {(activeTab === 'ALL' || activeTab === 'LOGS') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  15-Minute Mouse Inactivity Audit Log ({filteredLogs.length} Events on {selectedDate})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact chronological log of all periods where an employee stopped moving the mouse for 15+ minutes, and when activity was resumed.
              </p>
            </div>

            {selectedEmployeeLogs && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1 text-xs text-blue-800">
                <span>Filtered for: <strong>{selectedEmployeeLogs.fullName}</strong></span>
                <button
                  onClick={() => setSelectedEmployeeLogs(null)}
                  className="rounded-full p-0.5 hover:bg-blue-200 text-blue-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Event Type</th>
                  <th className="py-3 px-3">Duration Idle</th>
                  <th className="py-3 px-4">Audit Details & Status Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        <span className="font-semibold text-slate-700">No 15-Minute Inactivity Incidents Recorded</span>
                        <span className="text-[11px] text-slate-400">
                          Employees have maintained continuous mouse movement and completed their scheduled tasks.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any, idx: number) => {
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

                        <td className="py-3 px-3 font-mono font-semibold text-slate-900">
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
                                Mouse Activity Resumed
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <span className="font-bold text-slate-900">{log.idleMinutes}m</span>
                          <span className="text-slate-400 text-[10px] ml-1">idle span</span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {log.notes || (isInactive
                            ? 'No mouse movement or keyboard input was detected for at least 15 minutes.'
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
      )}

      {/* Security Footer Notice */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Workstation Activity Policy: Continuous 15-minute absence of mouse or keyboard activity is flagged automatically.</span>
        </div>
        <Link
          href="/admin/employees"
          className="text-blue-600 hover:text-blue-700 font-semibold underline inline-flex items-center gap-1"
        >
          <span>Manage Employees</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

