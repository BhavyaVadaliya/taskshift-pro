'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bell,
  Eye,
  Check,
  X,
  Hourglass,
  Calendar,
  XCircle,
} from 'lucide-react';
import { formatTimeHHMM, getTodayDateString } from '@/lib/utils';

export default function AdminMonitoringPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Timeline / History Modal
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchLiveFeed = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const res = await fetch(`/api/admin/monitoring?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    fetchLiveFeed();
    const interval = setInterval(fetchLiveFeed, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveFeed]);

  const openTimelineModal = async (inst: any) => {
    setSelectedTask(inst);
    setTimelineData(null);
    setLoadingTimeline(true);

    try {
      const res = await fetch(`/api/admin/monitoring/${inst.instanceId}/history`);
      if (res.ok) {
        const json = await res.json();
        setTimelineData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.employeeName.toLowerCase().includes(q) ||
      t.employeeId.toLowerCase().includes(q) ||
      t.taskName.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COMPLETED_LATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NOT_STARTED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'MISSED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Live Task Monitoring
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feed of employee task execution, notification dispatches, checklists, and delays.
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
            onClick={() => fetchLiveFeed()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name, employee ID, or task title..."
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
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="COMPLETED_LATE">Completed Late</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="OVERDUE">Overdue</option>
          <option value="MISSED">Missed</option>
        </select>
      </div>

      {/* Live Monitoring Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Task Name</th>
                <th className="py-3 px-3">Scheduled Time</th>
                <th className="py-3 px-3">Notification Sent</th>
                <th className="py-3 px-3">Acknowledged</th>
                <th className="py-3 px-3">Task Started</th>
                <th className="py-3 px-3">Completed At</th>
                <th className="py-3 px-3">Checklists</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Delay</th>
                <th className="py-3 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-slate-400">
                    {loading ? 'Fetching live floor data...' : 'No task instances found for this date/filter.'}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.instanceId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{t.employeeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{t.employeeId}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{t.taskName}</div>
                      <div className="text-[10px] text-slate-400">{t.departmentName}</div>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {t.startTimeFormatted} – {t.dueTimeFormatted}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      {t.notificationSentAt ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-medium">
                          <Check className="h-3 w-3" />
                          {new Date(t.notificationSentAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-300">Pending</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      {t.notificationAcknowledgedAt ? (
                        <span className="text-blue-700 flex items-center gap-1 font-medium">
                          <Check className="h-3 w-3" />
                          {new Date(t.notificationAcknowledgedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      {t.startedAt ? (
                        <span className="text-slate-800 font-medium">
                          {new Date(t.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-slate-300">Not yet</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px]">
                      {t.completedAt ? (
                        <span className="text-emerald-700 font-semibold">
                          {new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-slate-300">--:--</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">
                          {t.checklistProgress.completed}/{t.checklistProgress.total}
                        </span>
                        <div className="h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${t.checklistProgress.percent}%` }}
                            className="h-full bg-blue-600 rounded-full"
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      {t.delayMinutes > 0 ? (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 font-bold">
                          +{t.delayMinutes}m
                        </span>
                      ) : (
                        <span className="text-slate-300">0m</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openTimelineModal(t)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
                        title="View Full Task Timeline & Audit Log"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task History & Timeline Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedTask.taskName}</h3>
                <p className="text-[11px] text-slate-500">
                  Assigned: {selectedTask.employeeName} ({selectedTask.employeeId}) • Date: {selectedTask.date}
                </p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Status:</span>
                  <span className="font-bold text-slate-800">{selectedTask.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Scheduled Window:</span>
                  <span className="font-mono text-slate-800">
                    {selectedTask.startTimeFormatted} – {selectedTask.dueTimeFormatted}
                  </span>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
                  Activity Timeline & Audit Trail
                </h4>

                {loadingTimeline ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading timeline...</div>
                ) : !timelineData?.timeline || timelineData.timeline.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No activity recorded yet for this task.</div>
                ) : (
                  <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-2">
                    {timelineData.timeline.map((item: any, idx: number) => (
                      <div key={idx} className="relative group">
                        {/* Dot */}
                        <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" />

                        <div className="text-xs">
                          <span className="font-mono text-[10px] font-semibold text-slate-500 block">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          <span className="font-medium text-slate-800 block mt-0.5">{item.label}</span>
                          {item.details && (
                            <span className="text-[11px] text-slate-500 block mt-0.5 italic">{item.details}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
