'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sun, Moon, Sunset, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function EmployeeSchedulePage() {
  const { user } = useAuth();
  const [shift, setShift] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/employee/shift/current')
      .then((r) => r.json())
      .then((j) => setShift(j.assignedShift));

    fetch('/api/admin/holidays')
      .then((r) => r.json())
      .then((j) => setHolidays(j.holidays || []));
  }, []);

  const ALL_DAYS = [
    { code: 'MON', name: 'Monday' },
    { code: 'TUE', name: 'Tuesday' },
    { code: 'WED', name: 'Wednesday' },
    { code: 'THU', name: 'Thursday' },
    { code: 'FRI', name: 'Friday' },
    { code: 'SAT', name: 'Saturday' },
    { code: 'SUN', name: 'Sunday' },
  ];

  const workingDays = shift?.workingDays
    ? typeof shift.workingDays === 'string'
      ? JSON.parse(shift.workingDays)
      : shift.workingDays
    : ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          My Working Schedule & Calendar
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View your assigned shift hours, weekly roster, and upcoming corporate holidays.
        </p>
      </div>

      {/* Shift Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{shift?.name || 'Standard Morning Shift'}</h2>
              <span className="text-xs text-slate-500 font-mono">
                {shift?.startTime || '09:00'} – {shift?.endTime || '18:00'} (UTC)
              </span>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            Active Assignment
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-5">
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Break Allowance</span>
            <span className="font-bold text-slate-800">{shift?.breakDurationMinutes || 60} Minutes</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Late Grace Window</span>
            <span className="font-bold text-emerald-700">+{shift?.gracePeriodMinutes || 15} Minutes</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Early Clock-in</span>
            <span className="font-bold text-slate-800">Up to {shift?.earlyLoginMinutes || 30}m prior</span>
          </div>
        </div>

        {/* Weekly Day by Day Roster */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 mb-2">Weekly Working Roster</h3>
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {ALL_DAYS.map((d) => {
              const isWorking = workingDays.includes(d.code);
              return (
                <div
                  key={d.code}
                  className={`rounded-xl border p-3 text-center transition ${
                    isWorking
                      ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold block">{d.code}</span>
                  <span className="text-[10px] block mt-1">
                    {isWorking ? `${shift?.startTime} - ${shift?.endTime}` : 'Day Off'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Corporate Holidays Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-3">Upcoming Corporate Holidays</h2>
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
          {holidays.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No scheduled holidays.</div>
          ) : (
            holidays.map((h) => (
              <div key={h.id} className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{h.name}</span>
                  <span className="text-slate-500 ml-2">{h.description}</span>
                </div>
                <span className="font-mono text-blue-600 font-bold">{h.date}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

