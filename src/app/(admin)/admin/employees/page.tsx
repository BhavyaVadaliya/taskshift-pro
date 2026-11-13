'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  KeyRound,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  History,
  Shield,
  Building,
  Calendar,
  X,
  Clock,
  Timer,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowRight,
  ListChecks,
  ShieldCheck,
  Check,
  MousePointer,
} from 'lucide-react';
import { getTodayDateString } from '@/lib/utils';

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

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<any>(null);
  const [employeeHistory, setEmployeeHistory] = useState<any>(null);

  // History tracking modal state
  const [historyDate, setHistoryDate] = useState<string>(getTodayDateString());
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyTaskFilter, setHistoryTaskFilter] = useState<string>('');
  const [historyActiveTab, setHistoryActiveTab] = useState<'ALL' | 'TASKS' | 'LOGS' | 'MOUSE' | 'ATTENDANCE'>('ALL');
  const [historyCurrentMs, setHistoryCurrentMs] = useState<number>(Date.now());

  // Form states
  const [formFullName, setFormFullName] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formShiftId, setFormShiftId] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formWorkingDays, setFormWorkingDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, shiftRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/departments'),
        fetch('/api/admin/shifts'),
      ]);

      if (empRes.ok) {
        const empJson = await empRes.json();
        setEmployees(empJson.employees || []);
      }
      if (deptRes.ok) {
        const deptJson = await deptRes.json();
        setDepartments(deptJson.departments || []);
      }
      if (shiftRes.ok) {
        const shiftJson = await shiftRes.json();
        setShifts(shiftJson.shifts || []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Edit Modal
  const handleEditClick = (emp: any) => {
    setActiveEmployee(emp);
    setFormFullName(emp.fullName);
    setFormEmail(emp.email);
    setFormPhone(emp.phone || '');
    setFormDepartmentId(emp.departmentId || '');
    setFormDesignation(emp.designation || '');
    setFormShiftId(emp.assignedShiftId || '');
    setFormStatus(emp.accountStatus || 'ACTIVE');
    setFormWorkingDays(emp.weeklyWorkingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormError(null);
    setShowEditModal(true);
  };

  // Open Reset Password Modal
  const handleResetClick = (emp: any) => {
    setActiveEmployee(emp);
    setFormPassword('');
    setFormError(null);
    setShowResetModal(true);
  };

  // Live 1-second ticker for active history countdowns
  useEffect(() => {
    if (!showHistoryModal) return;
    const ticker = setInterval(() => {
      setHistoryCurrentMs(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, [showHistoryModal]);

  // Open Task History Tracking Modal for any clicked employee
  const handleHistoryClick = async (emp: any, dateToFetch?: string) => {
    setActiveEmployee(emp);
    setShowHistoryModal(true);
    const targetDate = dateToFetch || historyDate || getTodayDateString();
    setHistoryDate(targetDate);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}/history?date=${targetDate}`);
      if (res.ok) {
        const json = await res.json();
        setEmployeeHistory(json);
      }
    } catch (err) {
      console.error('Failed to load employee task history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryPrevDay = () => {
    const d = new Date(historyDate);
    d.setDate(d.getDate() - 1);
    const newDate = d.toISOString().split('T')[0];
    setHistoryDate(newDate);
    if (activeEmployee) handleHistoryClick(activeEmployee, newDate);
  };

  const handleHistoryNextDay = () => {
    const d = new Date(historyDate);
    d.setDate(d.getDate() + 1);
    const newDate = d.toISOString().split('T')[0];
    setHistoryDate(newDate);
    if (activeEmployee) handleHistoryClick(activeEmployee, newDate);
  };

  const handleHistoryToday = () => {
    const today = getTodayDateString();
    setHistoryDate(today);
    if (activeEmployee) handleHistoryClick(activeEmployee, today);
  };

  // Submit Add Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formFullName,
          employeeId: formEmployeeId,
          email: formEmail,
          phone: formPhone,
          password: formPassword || 'employee123',
          departmentId: formDepartmentId || null,
          designation: formDesignation,
          assignedShiftId: formShiftId || null,
          weeklyWorkingDays: formWorkingDays,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        fetchData();
      } else {
        setFormError(data.error || 'Failed to create employee');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    }
  };

  // Submit Edit Employee
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/employees/${activeEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formFullName,
          email: formEmail,
          phone: formPhone,
          departmentId: formDepartmentId || null,
          designation: formDesignation,
          assignedShiftId: formShiftId || null,
          accountStatus: formStatus,
          weeklyWorkingDays: formWorkingDays,
          isActive: formStatus === 'ACTIVE',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        fetchData();
      } else {
        setFormError(data.error || 'Failed to update employee');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    }
  };

  // Submit Password Reset
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPassword || formPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/employees/${activeEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: formPassword,
        }),
      });
      if (res.ok) {
        alert(`Password for ${activeEmployee.fullName} has been reset successfully.`);
        setShowResetModal(false);
      }
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Deactivate Employee
  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate employee "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = !selectedDeptFilter || emp.departmentId === selectedDeptFilter;
    const matchesShift = !selectedShiftFilter || emp.assignedShiftId === selectedShiftFilter;

    return matchesSearch && matchesDept && matchesShift;
  });

  const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Employee Directory & Credentials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage corporate staff, shift assignments, security credentials, and working days.
          </p>
        </div>

        <button
          onClick={() => {
            setFormFullName('');
            setFormEmployeeId(`EMP${Math.floor(100 + Math.random() * 900)}`);
            setFormEmail('');
            setFormPhone('');
            setFormDepartmentId(departments[0]?.id || '');
            setFormDesignation('Staff Member');
            setFormShiftId(shifts[0]?.id || '');
            setFormPassword('employee123');
            setFormWorkingDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
            setFormError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by full name, employee ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
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
          value={selectedShiftFilter}
          onChange={(e) => setSelectedShiftFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Shifts</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Designation</th>
                <th className="py-3 px-3">Assigned Shift</th>
                <th className="py-3 px-3">Mouse Activity (15m+)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    {loading ? 'Loading employee records...' : 'No employees found matching criteria.'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleHistoryClick(emp)}
                    className="hover:bg-blue-50/60 cursor-pointer transition group"
                    title="Click user to track their live task progress and check history"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5">
                        <span>{emp.fullName}</span>
                        <span className="text-[10px] text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-1.5 py-0.5 rounded-md font-medium border border-blue-200 transition inline-flex items-center gap-1">
                          <History className="h-2.5 w-2.5" />
                          <span>Track Tasks</span>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <span className="font-bold text-slate-600">{emp.employeeId}</span>
                        <span>• Joined {emp.joiningDate.substring(0, 10)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-800">{emp.email}</div>
                      <div className="text-[10px] text-slate-400">{emp.phone || 'No phone'}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700">{emp.departmentName}</span>
                    </td>

                    <td className="py-3 px-3 text-slate-600">{emp.designation}</td>

                    <td className="py-3 px-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
                        {emp.assignedShiftName}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                          emp.mouseStatusType === 'IDLE_15M'
                            ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                            : emp.mouseStatusType === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        <MousePointer className={`h-3 w-3 ${emp.mouseStatusType === 'IDLE_15M' ? 'text-amber-600' : emp.mouseStatusType === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{emp.mouseStatusLabel || 'Shift Inactive ⚪'}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          emp.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {emp.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {emp.accountStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHistoryClick(emp);
                          }}
                          className="rounded p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-700 transition"
                          title="View Shift & Task History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetClick(emp);
                          }}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(emp);
                          }}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="Edit Information"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivate(emp.id, emp.fullName);
                          }}
                          className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          title="Deactivate Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-red-700 text-xs border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="e.g. Robert Martin"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    placeholder="EMP105"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="robert.m@company.com"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1-555-0199"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="Operations Associate"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Shift *</label>
                  <select
                    value={formShiftId}
                    onChange={(e) => setFormShiftId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Select Shift</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="employee123"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Weekly Working Days</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_DAYS.map((day) => {
                    const isSelected = formWorkingDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          if (isSelected) {
                            setFormWorkingDays(formWorkingDays.filter((d) => d !== day));
                          } else {
                            setFormWorkingDays([...formWorkingDays, day]);
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
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Employee: {activeEmployee.fullName}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-red-700 text-xs border border-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Shift</label>
                  <select
                    value={formShiftId}
                    onChange={(e) => setFormShiftId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Select Shift</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE (Deactivated)</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
            <p className="mt-1 text-xs text-slate-500">
              Set a new secure password for {activeEmployee.fullName} ({activeEmployee.employeeId}).
            </p>

            <form onSubmit={handlePasswordResetSubmit} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="rounded-lg bg-red-50 p-2 text-red-700 text-xs border border-red-200">
                  {formError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Task History & Tracking Modal */}
      {showHistoryModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  {activeEmployee.fullName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {activeEmployee.fullName}
                    </h3>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {activeEmployee.employeeId}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        employeeHistory?.shift?.isShiftActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {employeeHistory?.shift?.isShiftActive ? 'Shift Active 🟢 (Working)' : 'Shift Inactive ⚪ (Off)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>{activeEmployee.departmentName || employeeHistory?.employee?.department}</span>
                    <span>•</span>
                    <span>{activeEmployee.designation || employeeHistory?.employee?.designation}</span>
                    <span>•</span>
                    <span className="text-blue-600 font-medium">
                      {activeEmployee.assignedShiftName || employeeHistory?.shift?.name}
                    </span>
                  </p>
                </div>
              </div>

              {/* Date Navigation & Close */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    onClick={handleHistoryPrevDay}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 transition"
                    title="Previous Day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleHistoryToday}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition ${
                      historyDate === getTodayDateString()
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Today
                  </button>
                  <input
                    type="date"
                    value={historyDate}
                    onChange={(e) => {
                      const newD = e.target.value;
                      setHistoryDate(newD);
                      if (activeEmployee) handleHistoryClick(activeEmployee, newD);
                    }}
                    className="px-1.5 py-0.5 text-xs font-mono font-medium text-slate-800 bg-transparent border-none focus:outline-none"
                  />
                  <button
                    onClick={handleHistoryNextDay}
                    className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 transition"
                    title="Next Day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleHistoryClick(activeEmployee, historyDate)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 transition"
                  title="Refresh User History"
                >
                  <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                </button>

                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Assigned Shift
                  </span>
                  <div className="text-sm font-bold text-slate-900">
                    {employeeHistory?.shift?.name || activeEmployee.assignedShiftName || 'Morning Shift'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {employeeHistory?.shift?.startTime} – {employeeHistory?.shift?.endTime}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Configured Tasks
                  </span>
                  <div className="text-base font-bold font-mono text-slate-900">
                    {employeeHistory?.tasks?.length || 7} Tasks Monitored
                  </div>
                  <span className="text-[10px] text-slate-500">1x 10m (Bold Desk) • 6x 1hr</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 block mb-0.5">
                    Checks Verified
                  </span>
                  <div className="text-base font-bold font-mono text-emerald-700">
                    {employeeHistory?.historyLogs?.length || 0} Recorded
                  </div>
                  <span className="text-[10px] text-emerald-600/80 font-medium">
                    On {historyDate}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 block mb-0.5">
                    Mouse Activity (15m+)
                  </span>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {employeeHistory?.mouseActivity?.statusLabel || 'Active'}
                  </div>
                  <span className="text-[10px] text-slate-500">15m idle flag tracker</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                    Interval Rule
                  </span>
                  <div className="text-sm font-bold text-slate-900">Dynamic Post-Check</div>
                  <span className="text-[10px] text-slate-500">+10m / +1hr from completion</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap border-b border-slate-200 gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('ALL')}
                  className={`pb-2.5 transition border-b-2 ${
                    historyActiveTab === 'ALL'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Tracking Views
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('TASKS')}
                  className={`pb-2.5 transition border-b-2 ${
                    historyActiveTab === 'TASKS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Live Task Timers ({employeeHistory?.tasks?.length || 7})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('LOGS')}
                  className={`pb-2.5 transition border-b-2 ${
                    historyActiveTab === 'LOGS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Verified Check Log ({employeeHistory?.historyLogs?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('MOUSE')}
                  className={`pb-2.5 transition border-b-2 ${
                    historyActiveTab === 'MOUSE'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mouse Activity & 15m Idle Logs ({employeeHistory?.mouseActivity?.logs?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryActiveTab('ATTENDANCE')}
                  className={`pb-2.5 transition border-b-2 ${
                    historyActiveTab === 'ATTENDANCE'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Shift Attendance Records
                </button>
              </div>

              {/* SECTION 1: Live 7-Task Status Table */}
              {(historyActiveTab === 'ALL' || historyActiveTab === 'TASKS') && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Live Task Status & Next Scheduled Check Times
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Current live status of all 7 tasks for {activeEmployee.fullName}.
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {employeeHistory?.tasks?.length || 7} Tasks
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold text-[11px]">
                          <th className="py-2.5 px-4">Task Name</th>
                          <th className="py-2.5 px-3">Interval</th>
                          <th className="py-2.5 px-3">Last Checked At</th>
                          <th className="py-2.5 px-3">Next Due At</th>
                          <th className="py-2.5 px-3">Next Check Countdown</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyLoading ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600 inline mr-2" />
                              Loading task tracking data...
                            </td>
                          </tr>
                        ) : !employeeHistory?.tasks || employeeHistory.tasks.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                              No configured support tasks found.
                            </td>
                          </tr>
                        ) : (
                          employeeHistory.tasks.map((task: any) => {
                            let remainingSec = 0;
                            if (task.nextDueAt) {
                              const nextMs = new Date(task.nextDueAt).getTime();
                              remainingSec = Math.floor((nextMs - historyCurrentMs) / 1000);
                            }
                            const isDue = employeeHistory?.shift?.isShiftActive && remainingSec <= 0;

                            return (
                              <tr key={task.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <span>{task.title}</span>
                                    {task.isRequired && (
                                      <span className="rounded bg-red-50 text-red-600 text-[9px] font-bold px-1.5 py-0.2 border border-red-100">
                                        Mandatory
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="rounded-md bg-amber-50 text-amber-900 px-2 py-0.5 text-[10px] font-semibold border border-amber-200 font-mono inline-flex items-center gap-1">
                                    <Timer className="h-3 w-3 text-amber-600" />
                                    {task.timerMinutes < 60 ? `Every ${task.timerMinutes} min` : 'Every 1 hr'}
                                  </span>
                                </td>

                                <td className="py-3 px-3 font-mono">
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

                                <td className="py-3 px-3 font-mono">
                                  {task.nextDueAt && employeeHistory?.shift?.isShiftActive ? (
                                    <div className="text-slate-900 font-bold">
                                      {new Date(task.nextDueAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">
                                      {employeeHistory?.shift?.isShiftActive ? 'Due from shift start' : 'Starts with shift'}
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 font-mono">
                                  {!employeeHistory?.shift?.isShiftActive ? (
                                    <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-bold border border-slate-200">
                                      Shift Inactive
                                    </span>
                                  ) : isDue ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-bold animate-pulse shadow-sm">
                                      <Clock className="h-3 w-3" />
                                      DUE NOW
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 px-2 py-0.5 text-[10px] font-bold border border-blue-200">
                                      <Clock className="h-3 w-3 text-blue-600" />
                                      Due in {formatTimer(remainingSec)}
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                      !employeeHistory?.shift?.isShiftActive
                                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                                        : isDue
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    {!employeeHistory?.shift?.isShiftActive
                                      ? 'INACTIVE'
                                      : isDue
                                      ? 'ACTION NEEDED'
                                      : 'ON SCHEDULE'}
                                  </span>
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

              {/* SECTION 2: Verified Check Log & Audit Trail */}
              {(historyActiveTab === 'ALL' || historyActiveTab === 'LOGS') && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Verified Check Log & Audit Trail ({employeeHistory?.historyLogs?.length || 0} Records)
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Exact time of every check completed by {activeEmployee.fullName} on {historyDate}.
                      </p>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search checks..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white py-1 pl-8 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-40"
                        />
                      </div>

                      <select
                        value={historyTaskFilter}
                        onChange={(e) => setHistoryTaskFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-600"
                      >
                        <option value="">All Tasks</option>
                        {(employeeHistory?.tasks || []).map((t: any) => (
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
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Task Name</th>
                          <th className="py-2.5 px-3">Exact Time Checked</th>
                          <th className="py-2.5 px-3">Interval</th>
                          <th className="py-2.5 px-3">Next Due Time Was Set For</th>
                          <th className="py-2.5 px-4 text-right">Audit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyLoading ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600 inline mr-2" />
                              Loading verified checks...
                            </td>
                          </tr>
                        ) : !employeeHistory?.historyLogs || employeeHistory.historyLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                              No task checks logged by this employee on {historyDate}.
                            </td>
                          </tr>
                        ) : (
                          employeeHistory.historyLogs
                            .filter((log: any) => {
                              const matchSearch =
                                !historySearch ||
                                log.taskName.toLowerCase().includes(historySearch.toLowerCase()) ||
                                log.checkedAtTime.toLowerCase().includes(historySearch.toLowerCase()) ||
                                log.nextDueAtTime.toLowerCase().includes(historySearch.toLowerCase());
                              const matchFilter =
                                !historyTaskFilter || log.checklistId === historyTaskFilter;
                              return matchSearch && matchFilter;
                            })
                            .map((log: any, index: number) => (
                              <tr key={log.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-medium">
                                  {index + 1}
                                </td>

                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {log.taskName}
                                </td>

                                <td className="py-2.5 px-3 font-mono">
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 text-xs border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    <span>{log.checkedAtTime}</span>
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 font-mono">
                                  <span className="rounded-md bg-amber-50 text-amber-900 px-2 py-0.5 text-[10px] font-semibold border border-amber-200">
                                    +{log.intervalMinutes} min ({log.intervalMinutes < 60 ? `${log.intervalMinutes}m` : '1 hr'})
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 font-mono">
                                  <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                                    <ArrowRight className="h-3 w-3 text-slate-400" />
                                    <span>{log.nextDueAtTime}</span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-4 text-right">
                                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 border border-emerald-200">
                                    Verified & Logged ✓
                                  </span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 3: Shift Attendance Records */}
              {(historyActiveTab === 'ALL' || historyActiveTab === 'ATTENDANCE') && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Recent Shift Attendance & Clock-In History
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Shift clock-ins, breaks, and durations for {activeEmployee.fullName}.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold text-[11px]">
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-3">Shift</th>
                          <th className="py-2.5 px-3">Clock-In Time</th>
                          <th className="py-2.5 px-3">Clock-Out Time</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-4 text-right">Attendance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!employeeHistory?.recentAttendances || employeeHistory.recentAttendances.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                              No recent shift attendance records found.
                            </td>
                          </tr>
                        ) : (
                          employeeHistory.recentAttendances.map((a: any) => (
                            <tr key={a.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                                {a.date}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {a.shiftName}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-700 font-medium">
                                {a.actualStart ? new Date(a.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {a.actualEnd ? new Date(a.actualEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active / Open'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-800">
                                <div>{a.durationMinutes || 0}m</div>
                                {a.breakMinutes > 0 && (
                                  <div className="text-[10px] text-amber-700 font-sans font-medium">({a.breakMinutes}m break)</div>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                    a.status === 'PRESENT' || a.status === 'COMPLETED'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : a.status === 'LATE'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
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
              )}

              {/* SECTION 4: Mouse Activity & 15-Minute Inactivity Audit Trail */}
              {(historyActiveTab === 'ALL' || historyActiveTab === 'MOUSE') && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-slate-100">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4 text-amber-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Mouse Activity & 15-Minute Inactivity Audit Trail
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Automatic detection of periods when employee did not move mouse or interact for 15+ minutes.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold border flex items-center gap-1.5 ${
                          !employeeHistory?.shift?.isShiftActive
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : employeeHistory?.mouseActivity?.isIdle
                            ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <MousePointer className="h-3 w-3" />
                        <span>{employeeHistory?.mouseActivity?.statusLabel || 'Active'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="p-4 bg-slate-50/40 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Current Idle Status
                      </span>
                      <div className="font-bold text-slate-800">
                        {employeeHistory?.mouseActivity?.isIdle ? (
                          <span className="text-red-600 font-extrabold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Flagged Idle ({employeeHistory?.mouseActivity?.idleMinutes || 15}m without mouse)
                          </span>
                        ) : employeeHistory?.shift?.isShiftActive ? (
                          <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Working / Active Mouse
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Shift Off</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Last Mouse Movement Recorded
                      </span>
                      <div className="font-bold font-mono text-slate-800">
                        {employeeHistory?.mouseActivity?.lastActiveAt ? (
                          new Date(employeeHistory.mouseActivity.lastActiveAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        ) : (
                          <span className="text-slate-400 font-normal">None recorded today</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        15m+ Idle Incidents Today
                      </span>
                      <div className="font-bold font-mono text-slate-800">
                        {(employeeHistory?.mouseActivity?.logs || []).filter((l: any) => l.action === 'MOUSE_INACTIVE_15M').length} Incidents
                      </div>
                    </div>
                  </div>

                  {/* Inactivity Events Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold text-[11px]">
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Event Timestamp</th>
                          <th className="py-2.5 px-3">Activity Status</th>
                          <th className="py-2.5 px-3">Duration Idle</th>
                          <th className="py-2.5 px-4">Audit Details & Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyLoading ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600 inline mr-2" />
                              Loading mouse activity log...
                            </td>
                          </tr>
                        ) : !employeeHistory?.mouseActivity?.logs || employeeHistory.mouseActivity.logs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                <span className="font-semibold text-slate-700">No 15-Minute Inactivity Incidents Recorded</span>
                                <span className="text-[11px] text-slate-400">
                                  Employee maintained active mouse/keyboard movement during shift hours.
                                </span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          employeeHistory.mouseActivity.logs.map((log: any, index: number) => {
                            const isInactiveAlert = log.action === 'MOUSE_INACTIVE_15M';
                            return (
                              <tr key={log.id} className={`hover:bg-slate-50/80 transition ${isInactiveAlert ? 'bg-amber-50/30' : ''}`}>
                                <td className="py-2.5 px-4 text-center font-mono text-slate-400 font-medium">
                                  {index + 1}
                                </td>

                                <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                                  {log.timeFormatted}
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                      isInactiveAlert
                                        ? 'bg-red-50 text-red-700 border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    {isInactiveAlert ? (
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

                                <td className="py-2.5 px-3 font-mono text-slate-800">
                                  <span className="font-bold text-slate-900">{log.idleMinutes}m</span>
                                  <span className="text-slate-400 text-[10px] ml-1">idle span</span>
                                </td>

                                <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                                  {log.notes || (isInactiveAlert
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
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Admin Task Tracking • Live audit trail updated in real-time</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold transition"
              >
                Close Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

