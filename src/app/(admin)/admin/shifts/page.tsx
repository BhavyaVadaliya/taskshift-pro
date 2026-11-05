'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Plus,
  Moon,
  Sun,
  Sunset,
  Edit,
  Trash2,
  Clock,
  Coffee,
  ShieldAlert,
  CheckCircle2,
  X,
  Users,
} from 'lucide-react';

export default function AdminShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);

  // Form
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(60);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [earlyLoginMinutes, setEarlyLoginMinutes] = useState(30);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(60);
  const [lateLoginRules, setLateLoginRules] = useState('');
  const [isOvernight, setIsOvernight] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [formError, setFormError] = useState<string | null>(null);

  const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/shifts');
      if (res.ok) {
        const json = await res.json();
        setShifts(json.shifts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const openCreateModal = () => {
    setEditingShift(null);
    setName('');
    setStartTime('09:00');
    setEndTime('18:00');
    setBreakDurationMinutes(60);
    setGracePeriodMinutes(15);
    setEarlyLoginMinutes(30);
    setAutoLogoutMinutes(60);
    setLateLoginRules('Clock in exceeding 15m grace is marked late.');
    setIsOvernight(false);
    setWorkingDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (shift: any) => {
    setEditingShift(shift);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setBreakDurationMinutes(shift.breakDurationMinutes);
    setGracePeriodMinutes(shift.gracePeriodMinutes);
    setEarlyLoginMinutes(shift.earlyLoginMinutes);
    setAutoLogoutMinutes(shift.autoLogoutMinutes);
    setLateLoginRules(shift.lateLoginRules || '');
    setIsOvernight(shift.isOvernight);
    setWorkingDays(shift.workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name,
      startTime,
      endTime,
      breakDurationMinutes,
      gracePeriodMinutes,
      earlyLoginMinutes,
      autoLogoutMinutes,
      lateLoginRules,
      isOvernight,
      workingDays,
    };

    try {
      const url = editingShift ? `/api/admin/shifts/${editingShift.id}` : '/api/admin/shifts';
      const method = editingShift ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        fetchShifts();
      } else {
        setFormError(data.error || 'Failed to save shift');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    }
  };

  const handleDelete = async (id: string, shiftName: string) => {
    if (!confirm(`Are you sure you want to delete shift "${shiftName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/shifts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchShifts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Shift Schedule & Timing Policies
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure morning, evening, and overnight shifts with grace periods and automatic punch-out rules.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Shift</span>
        </button>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shifts.map((shift) => {
          const isNight = shift.isOvernight || shift.name.toLowerCase().includes('night');
          const isEvening = shift.name.toLowerCase().includes('evening');

          return (
            <div
              key={shift.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isNight
                          ? 'bg-purple-50 text-purple-600'
                          : isEvening
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isNight ? (
                        <Moon className="h-4 w-4" />
                      ) : isEvening ? (
                        <Sunset className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{shift.name}</h3>
                      {shift.isOvernight && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-semibold text-purple-700">
                          Overnight Shift
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(shift)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id, shift.name)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Working Hours:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {shift.startTime} – {shift.endTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Break Duration:</span>
                    <span className="font-medium text-slate-700">{shift.breakDurationMinutes} mins</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Late Grace Period:</span>
                    <span className="font-medium text-emerald-700">+{shift.gracePeriodMinutes} mins</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Early Punch Permission:</span>
                    <span className="font-medium text-slate-700">Up to {shift.earlyLoginMinutes}m prior</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Auto Logout Review:</span>
                    <span className="font-medium text-slate-700">{shift.autoLogoutMinutes} mins post-shift</span>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] text-slate-400 block mb-1">Working Days:</span>
                    <div className="flex gap-1">
                      {ALL_DAYS.map((d) => {
                        const active = shift.workingDays?.includes(d);
                        return (
                          <span
                            key={d}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                              active ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {d}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>{shift.employeeCount || 0} employees assigned</span>
                </div>
                <span className="font-medium text-blue-600">{shift.taskCount || 0} tasks</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingShift ? 'Edit Shift Configuration' : 'Create New Shift'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-red-700 text-xs border border-red-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Morning Shift"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Break Duration (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    value={breakDurationMinutes}
                    onChange={(e) => setBreakDurationMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grace Period (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    value={gracePeriodMinutes}
                    onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Early Clock-in (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    value={earlyLoginMinutes}
                    onChange={(e) => setEarlyLoginMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Auto Logout Flag (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    value={autoLogoutMinutes}
                    onChange={(e) => setAutoLogoutMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isOvernight"
                  checked={isOvernight}
                  onChange={(e) => setIsOvernight(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isOvernight" className="text-xs font-semibold text-slate-700">
                  Overnight Shift (Crosses midnight to the next calendar day)
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Working Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const isSelected = workingDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          if (isSelected) {
                            setWorkingDays(workingDays.filter((d) => d !== day));
                          } else {
                            setWorkingDays([...workingDays, day]);
                          }
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
