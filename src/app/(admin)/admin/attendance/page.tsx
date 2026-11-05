'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit,
  X,
  Search,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react';
import { formatDurationMinutes, getTodayDateString } from '@/lib/utils';

export default function AdminAttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [activeAtt, setActiveAtt] = useState<any>(null);
  const [overrideStart, setOverrideStart] = useState('');
  const [overrideEnd, setOverrideEnd] = useState('');
  const [overrideBreaks, setOverrideBreaks] = useState(0);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [adminReason, setAdminReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAttendances = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const res = await fetch(`/api/admin/attendance?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAttendances(json.attendances || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  const openOverrideModal = (att: any) => {
    setActiveAtt(att);
    setOverrideStart(att.actualStart ? att.actualStart.substring(0, 16) : '');
    setOverrideEnd(att.actualEnd ? att.actualEnd.substring(0, 16) : '');
    setOverrideBreaks(att.breakMinutes || 0);
    setOverrideStatus(att.status || 'COMPLETED');
    setOverrideNotes(att.notes || '');
    setAdminReason('');
    setFormError(null);
    setShowOverrideModal(true);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReason.trim()) {
      setFormError('An administrative audit reason is required for compliance.');
      return;
    }

    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: activeAtt.id,
          actualStart: overrideStart ? new Date(overrideStart).toISOString() : undefined,
          actualEnd: overrideEnd ? new Date(overrideEnd).toISOString() : undefined,
          breakMinutes: overrideBreaks,
          status: overrideStatus,
          notes: overrideNotes,
          adminReason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowOverrideModal(false);
        fetchAttendances();
      } else {
        setFormError(data.error || 'Failed to update attendance');
      }
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const filtered = attendances.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.employeeName.toLowerCase().includes(q) ||
      a.employeeId.toLowerCase().includes(q) ||
      a.departmentName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Shift Attendance & Review Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily clock-in/out records, break calculations, forgotten logout flags, and administrative audit overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium focus:border-blue-600 focus:outline-none"
          />
          <button
            onClick={() => fetchAttendances()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Attendance Statuses</option>
          <option value="ON_TIME">On Time</option>
          <option value="LATE">Late Clock-In</option>
          <option value="ACTIVE">Currently Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="FORGOTTEN_LOGOUT">Forgotten Logout (Flagged)</option>
        </select>
      </div>

      {/* Attendance Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Assigned Shift</th>
                <th className="py-3 px-3">Clock-In (UTC)</th>
                <th className="py-3 px-3">Clock-Out (UTC)</th>
                <th className="py-3 px-3">Break Time</th>
                <th className="py-3 px-3">Net Duration</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Admin Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    {loading ? 'Loading attendance logs...' : 'No attendance records found for this date.'}
                  </td>
                </tr>
              ) : (
                filtered.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{att.employeeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{att.employeeId}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">{att.departmentName}</td>

                    <td className="py-3 px-3 font-medium text-slate-800">{att.shiftName}</td>

                    <td className="py-3 px-3 font-mono">
                      <span className="font-medium text-slate-800">
                        {new Date(att.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {att.isLate && (
                        <span className="ml-1 rounded bg-red-50 px-1 py-0.5 text-[9px] text-red-600 font-bold">
                          +{att.lateMinutes}m Late
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {att.actualEnd ? (
                        <span className="text-slate-800 font-medium">
                          {new Date(att.actualEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Active Clocked-In</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {att.breakMinutes > 0 ? `${att.breakMinutes}m` : '0m'}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-900 font-bold">
                      {att.totalDurationMinutes > 0 ? formatDurationMinutes(att.totalDurationMinutes) : '--'}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          att.status === 'FORGOTTEN_LOGOUT'
                            ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                            : att.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : att.status === 'LATE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {att.status === 'FORGOTTEN_LOGOUT' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                        {att.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openOverrideModal(att)}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="Correct Attendance Record"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && activeAtt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Correct Attendance: {activeAtt.employeeName}
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-red-700 text-xs border border-red-200">
                  {formError}
                </div>
              )}

              {activeAtt.flagReason && (
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-800 text-[11px] border border-amber-200">
                  ⚠️ <strong>System Flag:</strong> {activeAtt.flagReason}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actual Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={overrideStart}
                  onChange={(e) => setOverrideStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actual End Time</label>
                <input
                  type="datetime-local"
                  value={overrideEnd}
                  onChange={(e) => setOverrideEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Break (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={overrideBreaks}
                    onChange={(e) => setOverrideBreaks(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ON_TIME">ON_TIME</option>
                    <option value="LATE">LATE</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Administrative Reason for Change *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  placeholder="e.g. Employee forgot to punch out due to client emergency. Verified with shift supervisor."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  This justification will be permanently saved in the company audit trail.
                </span>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Corrected Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
