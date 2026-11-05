'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Clock, ListChecks, CheckCircle2, AlertTriangle, Search, Filter } from 'lucide-react';
import { formatTimeHHMM } from '@/lib/utils';

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employee/tasks');
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean)));

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.taskName.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = !categoryFilter || t.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          My Scheduled Tasks & Checklists
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Complete checklist items, submit progress, and track daily operational tasks.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search my tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            {loading ? 'Loading scheduled tasks...' : 'No tasks assigned for today.'}
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.taskName}</h3>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Category: <strong className="text-slate-700">{t.category}</strong> • Time:{' '}
                    <span className="font-mono">{t.startTime} – {t.dueTime}</span>
                  </span>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    t.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : t.status === 'OVERDUE'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              {t.description && <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>}

              {/* Checklists items */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                <div className="text-[11px] font-semibold text-slate-700">Checklist Items:</div>
                {t.checklists.map((cl: any) => (
                  <div key={cl.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <span
                      className={`h-4 w-4 rounded flex items-center justify-center text-[10px] ${
                        cl.isCompleted ? 'bg-emerald-600 text-white font-bold' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {cl.isCompleted ? '✓' : ''}
                    </span>
                    <span className={cl.isCompleted ? 'line-through text-slate-400' : ''}>{cl.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

