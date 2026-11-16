'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { showChromeDesktopNotification } from '@/lib/clientNotification';
import { soundPlayer } from '@/lib/audio';

export function ChromeTaskWatcher() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [shiftStartMs, setShiftStartMs] = useState<number>(Date.now());
  const lastNotifiedRef = useRef<Record<string, number>>({});
  const soundEnabledRef = useRef<boolean>(true);

  // Sync sound preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sound_enabled');
      soundEnabledRef.current = stored === null ? true : stored === 'true';
    }
  }, []);

  // Fetch current tasks and break status
  const fetchTaskData = useCallback(async () => {
    if (!user) return;
    try {
      const [tasksRes, shiftRes] = await Promise.all([
        fetch('/api/employee/tasks'),
        fetch('/api/employee/shift/current'),
      ]);

      if (tasksRes.ok) {
        const json = await tasksRes.json();
        setTasks(json.tasks || []);
      }

      if (shiftRes.ok) {
        const json = await shiftRes.json();
        const activeBreak = json.activeBreak || null;
        setIsOnBreak(Boolean(json.isShiftActive && activeBreak));
        if (json.attendance?.actualStart) {
          setShiftStartMs(new Date(json.attendance.actualStart).getTime());
        }
      }
    } catch (err) {
      // Background silent catch
    }
  }, [user]);

  // Initial fetch and periodic polling
  useEffect(() => {
    if (!user) return;
    fetchTaskData();
    const interval = setInterval(fetchTaskData, 20000);
    return () => clearInterval(interval);
  }, [user, fetchTaskData]);

  // Evaluate countdowns on every tick from Web Worker
  const handleTick = useCallback(
    (currentMs: number) => {
      if (!user || tasks.length === 0) return;

      const itemsDue: Array<{
        checklistId: string;
        taskName: string;
        title: string;
        timerMinutes: number;
      }> = [];

      tasks.forEach((t) => {
        (t.checklists || []).forEach((c: any) => {
          if (c.timerMinutes) {
            const intervalMs = c.timerMinutes * 60 * 1000;
            const refMs = c.completedAt ? new Date(c.completedAt).getTime() : shiftStartMs;
            const diffSec = Math.floor((intervalMs - (currentMs - refMs)) / 1000);

            // Item is due if never completed or interval expired
            if (!c.isCompleted || diffSec <= 0) {
              itemsDue.push({
                checklistId: c.id,
                taskName: t.taskName || t.name || 'Scheduled Task',
                title: c.title || 'Checklist Item',
                timerMinutes: c.timerMinutes,
              });
            }
          }
        });
      });

      if (itemsDue.length > 0) {
        const now = Date.now();
        let shouldPlaySound = false;

        itemsDue.forEach((item) => {
          const lastSent = lastNotifiedRef.current[item.checklistId] || 0;
          // Trigger Chrome desktop notification once every 2 minutes per due task item
          if (now - lastSent >= 120000) {
            lastNotifiedRef.current[item.checklistId] = now;
            shouldPlaySound = true;

            showChromeDesktopNotification(
              `⏱️ ${item.title} Due Now`,
              `Cycle interval completed (${item.timerMinutes}m). Please review and check off your task items.`,
              'TASK_REMINDER',
              '/employee/tasks'
            );
          }
        });

        // Play alarm sound if not on break and sound is enabled
        if (shouldPlaySound && !isOnBreak && soundEnabledRef.current) {
          soundPlayer.playAlarm();
        }
      }
    },
    [user, tasks, shiftStartMs, isOnBreak]
  );

  // Background Web Worker Ticker (runs without Chrome background tab throttling)
  useEffect(() => {
    if (!user) return;

    let worker: Worker | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      worker = new Worker('/worker-ticker.js');
      worker.onmessage = (e) => {
        if (e.data?.now) {
          handleTick(e.data.now);
        }
      };
      worker.postMessage('START');
    } catch (err) {
      // Fallback timer if Web Workers are restricted in certain environments
      fallbackInterval = setInterval(() => {
        handleTick(Date.now());
      }, 1000);
    }

    return () => {
      if (worker) {
        worker.postMessage('STOP');
        worker.terminate();
      }
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [user, handleTick]);

  return null; // Silent background manager active as long as the tab is open
}
