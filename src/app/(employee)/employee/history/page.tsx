'use client';

import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, Clock, ListChecks } from 'lucide-react';

export default function EmployeeHistoryPage() {
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employee/history?type=tasks')
      .then((r) => r.json())
      .then((j) => setHistoryTasks(j.tasks || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Completed Tasks & Historical Records
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audit trail of past task executions, checklist completions, and submission timestamps.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Task Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Scheduled Time</th>
                <th className="py-3 px-3">Completed At</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Checklists</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    {loading ? 'Loading task history...' : 'No historical tasks found.'}
                  </td>
                </tr>
              ) : (
                historyTasks.map((t) => {
                  const total = t.task.checklists.length;
                  const completed = t.checklistCompletions.filter((c: any) => c.isCompleted).length;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{t.date}</td>

                      <td className="py-3 px-3 font-medium text-slate-800">{t.task.name}</td>

                      <td className="py-3 px-3 text-slate-600">{t.task.category}</td>

                      <td className="py-3 px-3 font-mono text-slate-500">
                        {t.task.startTime} – {t.task.dueTime}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {t.completedAt ? (
                          <span className="text-emerald-700 font-medium">
                            {new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-300">--:--</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.status === 'COMPLETED_LATE'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                        {completed}/{total} Done
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

