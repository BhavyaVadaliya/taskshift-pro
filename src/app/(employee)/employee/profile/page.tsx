'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { User, Bell, Volume2, ShieldCheck, Mail, Phone, Building, Calendar, Radio } from 'lucide-react';
import { soundPlayer } from '@/lib/audio';

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const {
    pushPermission,
    requestPushPermission,
    soundEnabled,
    toggleSound,
  } = useNotifications();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Employee Profile & Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View your corporate staff details, shift policies, and configure browser notification permissions.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-md">
            {user?.fullName.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.fullName}</h2>
            <p className="text-xs text-slate-500 font-mono">
              Employee ID: {user?.employeeId} • {user?.designation || 'Staff Member'}
            </p>
            <span className="inline-block mt-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
              {user?.departmentName || 'General Staff'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <Mail className="h-4 w-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Work Email:</span>
              <span className="font-semibold text-slate-800">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600">
            <Building className="h-4 w-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Department:</span>
              <span className="font-semibold text-slate-800">{user?.departmentName || 'Operations'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-600">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">System Access:</span>
              <span className="font-semibold text-slate-800">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Notification & Alert Settings</h2>
        </div>

        {/* Push status & toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
          <div className="flex items-center gap-3">
            <Radio className="h-4 w-4 text-blue-600" />
            <div>
              <span className="font-bold text-slate-800 block">Browser Push Notifications</span>
              <span className="text-[11px] text-slate-500">
                Permission status: <strong className="capitalize">{pushPermission}</strong>
              </span>
            </div>
          </div>

          {pushPermission !== 'granted' ? (
            <button
              onClick={requestPushPermission}
              className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 shadow-sm transition"
            >
              Request Permission
            </button>
          ) : (
            <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 text-[10px]">
              Active & Subscribed
            </span>
          )}
        </div>

        {/* Sound toggle & test */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-blue-600" />
            <div>
              <span className="font-bold text-slate-800 block">Notification Audio Chimes</span>
              <span className="text-[11px] text-slate-500">
                Play pleasant audio bell when task reminders fire.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => soundPlayer.playChime('reminder')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Test Sound
            </button>

            <button
              onClick={toggleSound}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                soundEnabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
