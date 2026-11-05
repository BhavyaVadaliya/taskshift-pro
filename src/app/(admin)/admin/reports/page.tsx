'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [preset, setPreset] = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        preset,
        ...(preset === 'custom' && customStart ? { startDate: customStart } : {}),
        ...(preset === 'custom' && customEnd ? { endDate: customEnd } : {}),
        ...(selectedDept ? { departmentId: selectedDept } : {}),
        ...(selectedEmployee ? { employeeId: selectedEmployee } : {}),
      });

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd, selectedDept, selectedEmployee]);

  useEffect(() => {
    fetchReports();
    // Load departments & employees for dropdowns
    fetch('/api/admin/departments')
      .then((r) => r.json())
      .then((j) => setDepartments(j.departments || []));
    fetch('/api/admin/employees')
      .then((r) => r.json())
      .then((j) => setEmployees(j.employees || []));
  }, [fetchReports]);

  // Export CSV handler
  const handleExportCSV = () => {
    const params = new URLSearchParams({
      preset,
      format: 'csv',
      ...(preset === 'custom' && customStart ? { startDate: customStart } : {}),
      ...(preset === 'custom' && customEnd ? { endDate: customEnd } : {}),
      ...(selectedDept ? { departmentId: selectedDept } : {}),
      ...(selectedEmployee ? { employeeId: selectedEmployee } : {}),
    });
    window.open(`/api/admin/reports?${params.toString()}`, '_blank');
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  const overall = data?.overall || {
    totalEmployees: 0,
    totalShiftsLogged: 0,
    totalWorkingHours: '0.0',
    totalTasksAssigned: 0,
    totalTasksCompleted: 0,
    totalOverdue: 0,
    totalMissed: 0,
    overallOnTimePercentage: 0,
  };

  const reports = data?.employeeReports || [];

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Reports & Operational Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified productivity metrics, employee shift attendance durations, and task completion rates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on Print) */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm print:hidden">
        {/* Preset Range Selector */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'thisWeek', label: 'This Week' },
            { id: 'lastWeek', label: 'Last Week' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'custom', label: 'Custom' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                preset === item.id ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-200 p-1.5 text-xs text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-200 p-1.5 text-xs text-slate-700"
            />
          </div>
        )}

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName} ({e.employeeId})
            </option>
          ))}
        </select>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
        <h1 className="text-lg font-bold text-slate-900">TaskShift Pro – Shift & Productivity Audit Report</h1>
        <p className="text-xs text-slate-500">
          Period: {data?.range?.startDate} to {data?.range?.endDate} • Generated on {new Date().toLocaleString()}
        </p>
      </div>

      {/* Aggregate Performance Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Shifts Completed</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{overall.totalShiftsLogged}</div>
          <span className="text-[10px] text-slate-400">Across {overall.totalEmployees} employees</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Total Working Hours</span>
          <div className="mt-1 text-2xl font-bold text-blue-600">{overall.totalWorkingHours} hrs</div>
          <span className="text-[10px] text-slate-400">Net logged working duration</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Tasks Throughput</span>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {overall.totalTasksCompleted}/{overall.totalTasksAssigned}
          </div>
          <span className="text-[10px] text-slate-400">Completed assigned tasks</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-slate-500 block">Overall On-Time Rate</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{overall.overallOnTimePercentage}%</div>
          <span className="text-[10px] text-slate-400">Target benchmark: 85%</span>
        </div>
      </div>

      {/* Employee-wise Detailed Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Employee Performance & Attendance Breakdown</h2>
          <span className="text-xs text-slate-400">{reports.length} Employees Reported</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Total Shifts</th>
                <th className="py-3 px-3">Total Hours</th>
                <th className="py-3 px-3">Avg Shift (Mins)</th>
                <th className="py-3 px-3">Tasks Assigned</th>
                <th className="py-3 px-3">Completed</th>
                <th className="py-3 px-3">Overdue</th>
                <th className="py-3 px-3">Missed</th>
                <th className="py-3 px-3">Avg Time (Mins)</th>
                <th className="py-3 px-4 text-right">On-Time %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-slate-400">
                    No records found for the selected date range.
                  </td>
                </tr>
              ) : (
                reports.map((r: any) => (
                  <tr key={r.userId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.employeeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.employeeId}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">{r.department}</td>

                    <td className="py-3 px-3 font-mono font-medium text-slate-800">{r.totalShifts}</td>

                    <td className="py-3 px-3 font-mono text-slate-900 font-bold">{r.totalWorkingHours}h</td>

                    <td className="py-3 px-3 font-mono text-slate-600">{r.avgShiftDurationMinutes}m</td>

                    <td className="py-3 px-3 font-mono text-slate-800">{r.totalTasksAssigned}</td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-emerald-700">{r.completedTasks}</span>
                      {r.completedLate > 0 && (
                        <span className="text-[10px] text-amber-600 ml-1">({r.completedLate} late)</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {r.overdueTasks > 0 ? (
                        <span className="text-red-600 font-bold">{r.overdueTasks}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {r.missedTasks > 0 ? (
                        <span className="text-rose-600 font-bold">{r.missedTasks}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {r.avgCompletionMinutes > 0 ? `${r.avgCompletionMinutes}m` : '--'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded ${
                          r.onTimeCompletionPercentage >= 80
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.onTimeCompletionPercentage >= 50
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {r.onTimeCompletionPercentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

