'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, Coffee, AlertTriangle } from 'lucide-react';
import { formatDurationMinutes } from '@/lib/utils';

export default function EmployeeAttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employee/history?type=shifts')
      .then((r) => r.json())
      .then((j) => {
        setAttendances(j.attendances || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          My Shift Attendance Records
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review your punch in/out timestamps, total logged working hours, and break durations.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Shift</th>
                <th className="py-3 px-3">Actual Clock-In</th>
                <th className="py-3 px-3">Actual Clock-Out</th>
                <th className="py-3 px-3">Breaks</th>
                <th className="py-3 px-3">Net Duration</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    {loading ? 'Loading attendance logs...' : 'No attendance logs recorded yet.'}
                  </td>
                </tr>
              ) : (
                attendances.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{a.date}</td>

                    <td className="py-3 px-3 text-slate-700">{a.shift?.name || 'Standard'}</td>

                    <td className="py-3 px-3 font-mono">
                      <span>{new Date(a.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {a.isLate && (
                        <span className="ml-1 rounded bg-red-50 px-1 text-[9px] text-red-600 font-bold">Late</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {a.actualEnd ? (
                        <span>{new Date(a.actualEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Active</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">{a.breakMinutes}m</td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {a.totalDurationMinutes > 0 ? formatDurationMinutes(a.totalDurationMinutes) : '--'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {a.status}
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
