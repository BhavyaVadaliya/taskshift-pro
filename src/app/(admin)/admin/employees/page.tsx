'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

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

  // Open History Modal
  const handleHistoryClick = async (emp: any) => {
    setActiveEmployee(emp);
    setShowHistoryModal(true);
    setEmployeeHistory(null);
    try {
      const res = await fetch(`/api/admin/employees/${emp.id}`);
      if (res.ok) {
        const json = await res.json();
        setEmployeeHistory(json.employee);
      }
    } catch (err) {
      console.error(err);
    }
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
                <th className="py-3 px-3">Weekly Schedule</th>
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
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{emp.fullName}</div>
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
                      <div className="flex gap-0.5">
                        {ALL_DAYS.map((d) => {
                          const isWorkDay = emp.weeklyWorkingDays?.includes(d);
                          return (
                            <span
                              key={d}
                              className={`text-[9px] px-1 rounded font-mono ${
                                isWorkDay ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {d.charAt(0)}
                            </span>
                          );
                        })}
                      </div>
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
                          onClick={() => handleHistoryClick(emp)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                          title="View Shift & Task History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetClick(emp)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(emp)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="Edit Information"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(emp.id, emp.fullName)}
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

      {/* Employee History Modal */}
      {showHistoryModal && activeEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Activity History: {activeEmployee.fullName}</h3>
                <p className="text-[11px] text-slate-500">
                  Employee ID: {activeEmployee.employeeId} • Dept: {activeEmployee.departmentName}
                </p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-xs">
              {/* Recent Attendances */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Recent Shift Attendances</h4>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {!employeeHistory?.attendances || employeeHistory.attendances.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">No shift attendances logged yet.</div>
                  ) : (
                    employeeHistory.attendances.map((a: any) => (
                      <div key={a.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{a.date}</span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            {new Date(a.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {a.actualEnd
                              ? new Date(a.actualEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Active / Open'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-700">{a.totalDurationMinutes}m</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            {a.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Task Instances */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Recent Task Instances & Completions</h4>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {!employeeHistory?.taskInstances || employeeHistory.taskInstances.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">No task instances assigned yet.</div>
                  ) : (
                    employeeHistory.taskInstances.map((t: any) => (
                      <div key={t.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{t.task.name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            Scheduled: {t.date} • {t.task.startTime} - {t.task.dueTime}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.status === 'COMPLETED_LATE'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : t.status === 'OVERDUE'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

