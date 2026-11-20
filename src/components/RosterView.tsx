import React, { useState } from 'react';
import { UserCheck, UserPlus, Trash2 } from 'lucide-react';
import type { StaffMember, UserRole } from '../types/audit';
import { getStoredDepartmentRoster, saveDepartmentRoster } from '../data/roster';

interface RosterViewProps {
  currentUser: StaffMember;
  onSwitchUser: (userId: string) => void;
}

export const RosterView: React.FC<RosterViewProps> = ({ currentUser, onSwitchUser }) => {
  const [roster, setRoster] = useState<StaffMember[]>(() => getStoredDepartmentRoster());
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('AUDIT_PIC');
  const [title, setTitle] = useState('Audit PIC');
  const [errorMsg, setErrorMsg] = useState('');

  const roleLabel = (r: UserRole) => {
    switch (r) {
      case 'AUDIT_PARTNER':
        return 'Audit Partner';
      case 'AUDIT_MANAGER':
        return 'Audit Manager';
      case 'SUPERVISOR':
        return 'Supervisor (Dual-Role)';
      case 'AUDIT_PIC':
        return 'Audit PIC';
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setErrorMsg('Staff Name and Work Email are required.');
      return;
    }

    if (trimmedEmail.startsWith('admin') || trimmedEmail.includes('admin@')) {
      setErrorMsg('Admin staff are strictly excluded from system access.');
      return;
    }

    if (roster.some((s) => s.email.toLowerCase() === trimmedEmail)) {
      setErrorMsg(`Email "${trimmedEmail}" is already registered.`);
      return;
    }

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      title: title || roleLabel(role),
      role,
      supervisorId: null,
      email: trimmedEmail,
    };

    const updated = [...roster, newStaff];
    saveDepartmentRoster(updated);
    setRoster(updated);
    setName('');
    setEmail('');
    setShowAddForm(false);
  };

  const handleRemoveStaff = (id: string) => {
    if (roster.length <= 1) {
      setErrorMsg('Cannot remove the last staff member.');
      return;
    }
    const updated = roster.filter((s) => s.id !== id);
    saveDepartmentRoster(updated);
    setRoster(updated);
  };

  const partnerCount = roster.filter((s) => s.role === 'AUDIT_PARTNER').length;
  const managerCount = roster.filter((s) => s.role === 'AUDIT_MANAGER').length;
  const supervisorCount = roster.filter((s) => s.role === 'SUPERVISOR').length;
  const picCount = roster.filter((s) => s.role === 'AUDIT_PIC').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Audit Department Directory &amp; RBAC Roster
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Active audit personnel directory (Admin staff strictly excluded).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162d4a] transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {showAddForm ? 'Close Form' : 'Add Staff Member'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddStaff} className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Add Staff Member</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Staff Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sarah Tan"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-[#1E3A5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Work Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., sarah.t@firm.com"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-[#1E3A5F] focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">System Role *</label>
              <select
                value={role}
                onChange={(e) => {
                  const r = e.target.value as UserRole;
                  setRole(r);
                  setTitle(r === 'AUDIT_PARTNER' ? 'Managing Audit Partner' : r === 'AUDIT_MANAGER' ? 'Audit Manager' : r === 'SUPERVISOR' ? 'Audit Supervisor' : 'Audit PIC');
                }}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-[#1E3A5F] focus:outline-none"
              >
                <option value="AUDIT_PARTNER">Audit Partner (2nd-Level Approver)</option>
                <option value="AUDIT_MANAGER">Audit Manager (1st-Level Approver)</option>
                <option value="SUPERVISOR">Supervisor (Dual-Role / Reviewer)</option>
                <option value="AUDIT_PIC">Audit PIC (Team Member)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-[#1E3A5F] focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && <p className="text-xs font-medium text-red-700">{errorMsg}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-[#1E3A5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#162d4a]"
            >
              Save Staff Member
            </button>
          </div>
        </form>
      )}

      {/* Role Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <p className="text-xs text-slate-500">Audit Partner</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">{partnerCount}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Audit Manager</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">{managerCount}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Supervisors</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">{supervisorCount}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Audit PICs</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">{picCount}</p>
        </div>
      </div>

      {/* Roster Table */}
      {roster.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No staff members in the directory</p>
          <p className="mt-1 text-xs text-slate-500">Click &quot;Add Staff Member&quot; above to populate the audit team roster.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="px-5 py-3 font-semibold">Staff Member</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Work Email</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {roster.map((member) => {
                  const isActive = member.id === currentUser.id;

                  return (
                    <tr key={member.id} className={isActive ? 'bg-slate-50' : 'hover:bg-slate-50/60'}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-[11px] text-slate-500">{member.title}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {roleLabel(member.role)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{member.email}</td>
                      <td className="px-5 py-3 text-right flex items-center justify-end gap-2">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <UserCheck className="h-3.5 w-3.5" />
                            Active Session
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onSwitchUser(member.id)}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              Switch Session
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStaff(member.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                              aria-label="Remove staff member"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
