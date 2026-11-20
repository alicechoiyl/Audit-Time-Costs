import React, { useState } from 'react';
import { ShieldCheck, Mail, ArrowRight, AlertCircle, Building2, UserPlus, Trash2 } from 'lucide-react';
import type { StaffMember, UserRole } from '../types/audit';
import { getStoredDepartmentRoster, saveDepartmentRoster } from '../data/roster';

interface LoginViewProps {
  onLogin: (staff: StaffMember) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [roster, setRoster] = useState<StaffMember[]>(() => getStoredDepartmentRoster());
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Setup form state for adding staff when roster is empty
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('AUDIT_PIC');
  const [newTitle, setNewTitle] = useState('Audit PIC');

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleaned = emailInput.trim().toLowerCase();

    if (!cleaned) {
      setErrorMsg('Please enter your work email address.');
      return;
    }

    if (cleaned.startsWith('admin') || cleaned.includes('admin@')) {
      setErrorMsg('Access Denied: Admin personnel are strictly excluded from system access under department governance.');
      return;
    }

    const found = roster.find((s) => s.email.toLowerCase() === cleaned);
    if (!found) {
      setErrorMsg(`Unregistered work email "${emailInput}". Please check the department directory or add staff below.`);
      return;
    }

    onLogin(found);
  };

  const handleAddStaffMember = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();

    if (!name || !email) {
      setErrorMsg('Staff Name and Work Email are required.');
      return;
    }

    if (email.startsWith('admin') || email.includes('admin@')) {
      setErrorMsg('Admin personnel cannot be added to the audit department roster.');
      return;
    }

    if (roster.some((s) => s.email.toLowerCase() === email)) {
      setErrorMsg(`Staff email "${email}" is already registered in the directory.`);
      return;
    }

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      title: newTitle || newRole,
      role: newRole,
      supervisorId: null,
      email,
    };

    const updated = [...roster, newStaff];
    saveDepartmentRoster(updated);
    setRoster(updated);
    setNewName('');
    setNewEmail('');
  };

  const handleRemoveStaff = (id: string) => {
    const updated = roster.filter((s) => s.id !== id);
    saveDepartmentRoster(updated);
    setRoster(updated);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 py-12">
      <div className="w-full max-w-lg space-y-8 rounded-xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F] text-white shadow-md">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
            Audit Time Cost &amp; Fee Guideline System
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Malaysian Institute of Accountants (MIA) Recommended Practice Guide 7 (RPG 7, Revised)
          </p>
        </div>

        {roster.length === 0 ? (
          /* First-Time Directory Setup Form */
          <div className="space-y-6 rounded-lg border border-slate-800 bg-slate-850 p-6">
            <div className="border-b border-slate-700 pb-3">
              <h3 className="text-sm font-semibold text-white">Department Directory Setup</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                No audit staff registered yet. Add your firm&apos;s audit personnel (1 Partner, 1 Manager, Supervisors, Audit PICs) below. Admin staff are strictly excluded.
              </p>
            </div>

            <form onSubmit={handleAddStaffMember} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Staff Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Dato' Lim Wei Ming"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Work Email *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g., lim.wm@firm.com"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300">System Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setNewRole(r);
                      setNewTitle(r === 'AUDIT_PARTNER' ? 'Managing Audit Partner' : r === 'AUDIT_MANAGER' ? 'Audit Manager' : r === 'SUPERVISOR' ? 'Audit Supervisor' : 'Audit PIC');
                    }}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  >
                    <option value="AUDIT_PARTNER">Audit Partner (2nd-Level Approver)</option>
                    <option value="AUDIT_MANAGER">Audit Manager (1st-Level Approver)</option>
                    <option value="SUPERVISOR">Supervisor (Dual-Role / Reviewer)</option>
                    <option value="AUDIT_PIC">Audit PIC (Team Member)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Job Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded bg-sky-600 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add Staff Member to Directory
              </button>
            </form>

            {roster.length > 0 && (
              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs font-semibold text-slate-300">Registered Staff ({roster.length}):</p>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {roster.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
                      <div>
                        <span className="font-semibold text-white">{s.name}</span>
                        <span className="ml-2 font-mono text-[11px] text-slate-400">({s.email})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(s.id)}
                        className="text-red-400 hover:text-red-300"
                        aria-label="Remove staff"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (roster.length > 0) {
                      // Proceed to login
                    }
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Normal Work Email Login */
          <div className="space-y-6">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Mandatory Work Email Login
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g., staff@firm.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] py-2.5 text-xs font-semibold text-white hover:bg-[#254878] transition-colors"
              >
                Sign In with Work Email
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="border-t border-slate-800 pt-4 text-center">
              <p className="text-xs text-slate-400">
                Registered staff directory: <span className="font-mono text-slate-300">{roster.length} members</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Audit Department Roster · Admin Excluded</span>
        </div>
      </div>
    </div>
  );
};
