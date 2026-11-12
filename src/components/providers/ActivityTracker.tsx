'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthProvider';

const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000; // 15 Minutes
const PULSE_INTERVAL_MS = 60 * 1000; // Send active heartbeat every 60s
const CHECK_INTERVAL_MS = 10 * 1000; // Check idle status every 10s

export function ActivityTracker() {
  const { user } = useAuth();
  const lastActiveRef = useRef<number>(Date.now());
  const lastPulseSentRef = useRef<number>(0);
  const isIdleRef = useRef<boolean>(false);

  // Send activity status to server
  const sendActivityUpdate = useCallback(async (eventType: 'MOUSE_PULSE' | 'MOUSE_INACTIVE_15M' | 'MOUSE_RESUMED', isIdle: boolean, idleDurationMinutes?: number) => {
    if (!user) return;
    try {
      await fetch('/api/employee/activity/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          isIdle,
          idleDurationMinutes,
        }),
      });
    } catch (err) {
      // Suppress network errors in background
    }
  }, [user]);

  // Handle user interaction (mouse, keyboard, scroll)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;

    // If previously flagged as idle, user has returned!
    if (isIdleRef.current) {
      isIdleRef.current = false;
      lastPulseSentRef.current = now;
      sendActivityUpdate('MOUSE_RESUMED', false);
      return;
    }

    // If active and pulse interval has passed, send active pulse
    if (now - lastPulseSentRef.current >= PULSE_INTERVAL_MS) {
      lastPulseSentRef.current = now;
      sendActivityUpdate('MOUSE_PULSE', false);
    }
  }, [sendActivityUpdate]);

  useEffect(() => {
    if (!user) return;

    // Send initial active pulse on mount
    handleUserActivity();

    // Listen to user interaction events (passive for performance)
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const onActivity = () => handleUserActivity();

    events.forEach((evt) => {
      window.addEventListener(evt, onActivity, { passive: true });
    });

    // Inactivity ticker to check if 15 minutes of inactivity elapsed
    const ticker = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActiveRef.current;

      // Detect 15 minutes of inactivity
      if (elapsed >= INACTIVITY_THRESHOLD_MS && !isIdleRef.current) {
        isIdleRef.current = true;
        const idleMins = Math.floor(elapsed / 60000);
        sendActivityUpdate('MOUSE_INACTIVE_15M', true, idleMins);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onActivity);
      });
      clearInterval(ticker);
    };
  }, [user, handleUserActivity, sendActivityUpdate]);

  return null; // Silent background listener
}
