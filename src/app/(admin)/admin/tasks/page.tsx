'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Copy,
  Pause,
  Play,
  Edit,
  Trash2,
  Clock,
  Bell,
  ListChecks,
  AlertCircle,
  X,
  PlusCircle,
  Trash,
  Tag,
  Building,
  User,
} from 'lucide-react';

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('General');
  const [startTime, setStartTime] = useState('09:15');
  const [dueTime, setDueTime] = useState('10:30');
  const [reminderTime, setReminderTime] = useState('09:10');
  const [repeatFrequency, setRepeatFrequency] = useState('DAILY');
  const [repeatDays, setRepeatDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [requiredCompletion, setRequiredCompletion] = useState(true);
  const [allowEarlyCompletion, setAllowEarlyCompletion] = useState(false);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [checklists, setChecklists] = useState<Array<{ title: string; isRequired: boolean }>>([
    { title: 'Verify task requirements', isRequired: true },
  ]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [repeatIntervalMinutes, setRepeatIntervalMinutes] = useState(15);
  const [maxReminders, setMaxReminders] = useState(3);
  const [escalationMinutes, setEscalationMinutes] = useState(30);
  const [formError, setFormError] = useState<string | null>(null);

  const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, eRes, dRes, sRes] = await Promise.all([
        fetch('/api/admin/tasks'),
        fetch('/api/admin/employees'),
        fetch('/api/admin/departments'),
        fetch('/api/admin/shifts'),
      ]);

      if (tRes.ok) {
        const tJson = await tRes.json();
        setTasks(tJson.tasks || []);
      }
      if (eRes.ok) {
        const eJson = await eRes.json();
        setEmployees(eJson.employees || []);
      }
      if (dRes.ok) {
        const dJson = await dRes.json();
        setDepartments(dJson.departments || []);
      }
      if (sRes.ok) {
        const sJson = await sRes.json();
        setShifts(sJson.shifts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreateModal = () => {
    setEditingTaskId(null);
    setName('');
    setDescription('');
    setInstructions('');
    setDepartmentId(departments[0]?.id || '');
    setShiftId(shifts[0]?.id || '');
    setPriority('MEDIUM');
    setCategory('General');
    setStartTime('09:15');
    setDueTime('10:30');
    setReminderTime('09:10');
    setRepeatFrequency('DAILY');
    setRepeatDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setRequiredCompletion(true);
    setAllowEarlyCompletion(false);
    setAssignedEmployeeIds([]);
    setChecklists([
      { title: 'Check emails and notifications', isRequired: true },
      { title: 'Update CRM log', isRequired: true },
    ]);
    setNotificationMessage('Please start your scheduled task.');
    setRepeatIntervalMinutes(15);
    setMaxReminders(3);
    setEscalationMinutes(30);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (task: any) => {
    setEditingTaskId(task.id);
    setName(task.name);
    setDescription(task.description || '');
    setInstructions(task.instructions || '');
    setDepartmentId(task.departmentId || '');
    setShiftId(task.shiftId || '');
    setPriority(task.priority);
    setCategory(task.category);
    setStartTime(task.startTime);
    setDueTime(task.dueTime);
    setReminderTime(task.reminderTime);
    setRepeatFrequency(task.repeatFrequency);
    setRepeatDays(task.repeatDays || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setRequiredCompletion(task.requiredCompletion);
    setAllowEarlyCompletion(task.allowEarlyCompletion);
    setAssignedEmployeeIds(task.assignments.map((a: any) => a.userId));
    setChecklists(
      task.checklists.map((c: any) => ({
        title: c.title,
        isRequired: c.isRequired,
      }))
    );
    setNotificationMessage(task.notificationSchedule?.message || '');
    setRepeatIntervalMinutes(task.notificationSchedule?.repeatIntervalMinutes || 15);
    setMaxReminders(task.notificationSchedule?.maxReminders || 3);
    setEscalationMinutes(task.notificationSchedule?.escalationMinutes || 30);
    setFormError(null);
    setShowModal(true);
  };

  // Add / Remove Checklist Item inside form
  const addChecklistItem = () => {
    setChecklists([...checklists, { title: '', isRequired: true }]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklists(checklists.filter((_, i) => i !== index));
  };

  const updateChecklistItem = (index: number, field: string, value: any) => {
    const updated = [...checklists];
    updated[index] = { ...updated[index], [field]: value };
    setChecklists(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validChecklists = checklists.filter((c) => c.title.trim().length > 0);
    if (validChecklists.length === 0) {
      setFormError('Please add at least one checklist item with a title.');
      return;
    }

    const payload = {
      name,
      description,
      instructions,
      departmentId: departmentId || null,
      shiftId: shiftId || null,
      priority,
      category,
      startTime,
      dueTime,
      reminderTime: reminderTime || startTime,
      repeatFrequency,
      repeatDays,
      requiredCompletion,
      allowEarlyCompletion,
      assignedEmployeeIds,
      checklists: validChecklists,
      notificationMessage,
      repeatIntervalMinutes,
      maxReminders,
      escalationMinutes,
    };

    try {
      const url = editingTaskId ? `/api/admin/tasks/${editingTaskId}` : '/api/admin/tasks';
      const method = editingTaskId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        fetchAll();
      } else {
        setFormError(data.error || 'Failed to save task');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    }
  };

  // Duplicate Task
  const handleDuplicate = async (taskId: string) => {
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Pause / Activate Task
  const handleTogglePause = async (taskId: string, isPaused: boolean) => {
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: !isPaused }),
      });
      if (res.ok) {
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Task
  const handleDelete = async (taskId: string, taskName: string) => {
    if (!confirm(`Are you sure you want to delete task "${taskName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = !selectedDept || t.departmentId === selectedDept;
    const matchesShift = !selectedShift || t.shiftId === selectedShift;
    return matchesSearch && matchesDept && matchesShift;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Task & Checklist Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create scheduled tasks, define required checklist items, and assign automatic reminder schedules.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <input
          type="text"
          placeholder="Search tasks by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
        />

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
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value)}
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

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredTasks.length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            {loading ? 'Loading tasks...' : 'No tasks found. Click "Create New Task" to begin.'}
          </div>
        ) : (
          filteredTasks.map((t) => {
            const priorityColors: Record<string, string> = {
              URGENT: 'bg-red-50 text-red-700 border-red-200',
              HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
              MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
              LOW: 'bg-slate-50 text-slate-600 border-slate-200',
            };

            return (
              <div
                key={t.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition flex flex-col justify-between ${
                  t.isPaused ? 'border-slate-200 opacity-70 bg-slate-50/40' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Bar: Name, Priority, Actions */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            priorityColors[t.priority] || priorityColors.MEDIUM
                          }`}
                        >
                          {t.priority}
                        </span>
                        {t.isPaused && (
                          <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-semibold">
                            Paused
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Category: <span className="font-medium text-slate-700">{t.category}</span> •{' '}
                        {t.departmentName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTogglePause(t.id, t.isPaused)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title={t.isPaused ? 'Activate Task' : 'Pause Task'}
                      >
                        {t.isPaused ? <Play className="h-3.5 w-3.5 text-emerald-600" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDuplicate(t.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Duplicate Task"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(t)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit Task"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete Task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Timings & Reminders */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      <span>
                        Time: <strong className="font-mono text-slate-800">{t.startTime}</strong> –{' '}
                        <strong className="font-mono text-slate-800">{t.dueTime}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Bell className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        Reminder: <strong className="font-mono text-slate-800">{t.reminderTime}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Checklist preview */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 mb-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-2">
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5 text-blue-600" />
                        <span>Checklist Items ({t.checklists?.length || 0})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {t.requiredCompletion ? 'All Required' : 'Optional'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {t.checklists?.map((cl: any, idx: number) => (
                        <div key={cl.id || idx} className="flex items-center gap-2 text-xs text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">{cl.title}</span>
                          {cl.isRequired && (
                            <span className="text-[9px] text-red-500 font-bold shrink-0">*</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer: Assigned Staff & Recurrence */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {t.assignments?.length > 0
                        ? `${t.assignments.length} assigned employees`
                        : 'Assigned to all department staff'}
                    </span>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 font-mono">
                    {t.repeatFrequency}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Creation & Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingTaskId ? 'Edit Task & Checklist Template' : 'Create Scheduled Task'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-red-700 text-xs border border-red-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily Office Opening Checklist"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">All Departments</option>
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
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">All Shifts</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Operations, Client Care, etc."
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-3 gap-3">
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
                  <label className="block font-semibold text-slate-700 mb-1">Due Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reminder Time</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Recurrence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Repeat Frequency</label>
                  <select
                    value={repeatFrequency}
                    onChange={(e) => setRepeatFrequency(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  >
                    <option value="DAILY">Daily (Working Days)</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="SPECIFIC_DAYS">Specific Weekdays</option>
                    <option value="ONCE">Once</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Repeat Weekdays</label>
                  <div className="flex gap-1 pt-1">
                    {ALL_DAYS.map((day) => {
                      const sel = repeatDays.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => {
                            if (sel) {
                              setRepeatDays(repeatDays.filter((d) => d !== day));
                            } else {
                              setRepeatDays([...repeatDays, day]);
                            }
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
                            sel ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {day.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Checklist Items Builder */}
              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800 text-xs">Checklist Items Inside Task</label>
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {checklists.map((cl, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px] w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="e.g. Check client email tickets"
                        value={cl.title}
                        onChange={(e) => updateChecklistItem(idx, 'title', e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 p-1.5 text-xs bg-white focus:border-blue-600 focus:outline-none"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 shrink-0">
                        <input
                          type="checkbox"
                          checked={cl.isRequired}
                          onChange={(e) => updateChecklistItem(idx, 'isRequired', e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span>Required</span>
                      </label>
                      {checklists.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(idx)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned Employees Multi-selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Specific Employees</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50">
                  {employees.map((emp) => {
                    const isAssigned = assignedEmployeeIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedEmployeeIds([...assignedEmployeeIds, emp.id]);
                            } else {
                              setAssignedEmployeeIds(assignedEmployeeIds.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="truncate">
                          {emp.fullName} ({emp.employeeId})
                        </span>
                      </label>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave empty to assign automatically to all employees in the task's department or shift.
                </span>
              </div>

              {/* Notification Message & Intervals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Notification Reminder Message</label>
                  <input
                    type="text"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="e.g. Please update CRM client notes and logs."
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Repeat Interval (Mins)</label>
                  <input
                    type="number"
                    min="5"
                    value={repeatIntervalMinutes}
                    onChange={(e) => setRepeatIntervalMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Reminders</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxReminders}
                    onChange={(e) => setMaxReminders(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Escalation Alert (Mins)</label>
                  <input
                    type="number"
                    min="10"
                    value={escalationMinutes}
                    onChange={(e) => setEscalationMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Rules & Permissions */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowEarlyCompletion}
                    onChange={(e) => setAllowEarlyCompletion(e.target.checked)}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                  <span>Allow Early Start (Before scheduled availability)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiredCompletion}
                    onChange={(e) => setRequiredCompletion(e.target.checked)}
                    className="rounded text-blue-600 h-4 w-4"
                  />
                  <span>Mandatory Task (Flag if missed)</span>
                </label>
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
                  Save Task Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
