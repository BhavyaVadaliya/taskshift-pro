'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Lock, Mail, Shield, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginId || !password) {
      setError('Please provide Email or Employee ID and Password.');
      return;
    }

    setLoading(true);
    const result = await login(loginId, password, rememberMe);
    setLoading(false);

    if (result.success && result.redirectUrl) {
      router.push(result.redirectUrl);
    } else {
      setError(result.error || 'Invalid credentials.');
    }
  };

  const fillQuickCredentials = (id: string, pass: string) => {
    setLoginId(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-md">
            TS
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            TaskShift Pro
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Employee Shift & Task Reminder Management System
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email or Employee ID
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="admin@company.com or EMP101"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-xs text-slate-600">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Quick Demo Login Credentials Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Quick Test Credentials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin@company.com', 'admin123')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 px-2.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
              >
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-medium text-[11px]">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('john.doe@company.com', 'employee123')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 px-2.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium text-[11px]">Employee (John)</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-center text-slate-400">
              Or use: <code className="text-slate-600 font-mono">sarah.j@company.com</code>, <code className="text-slate-600 font-mono">m.chen@company.com</code>
            </p>
          </div>
        </div>

        {/* Security disclaimer */}
        <p className="text-center text-[11px] text-slate-400">
          Protected by role-based authorization & encrypted session tokens.
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Forgot your password?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              For security compliance, employee passwords are administrators-managed.
              Please reach out to your HR administrator or supervisor to generate a temporary reset link.
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 p-2.5 text-[11px] text-blue-800 border border-blue-100">
              💡 If you are an administrator, you can reset passwords from the Admin Employees management console.
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
