import React, { useState } from 'react';
import { UserCheck, UserPlus, Shield, ToggleLeft, ToggleRight, Trash2, Clock, CheckCircle } from 'lucide-react';
import type { StaffMember, UserRole } from '../types/audit';
import { getStoredDepartmentRoster, saveDepartmentRoster } from '../data/roster';

interface RosterViewProps {
  currentUser: StaffMember;
  onSwitchUser: (userId: string) => void;
}

export const RosterView: React.FC<RosterViewProps> = ({ currentUser, onSwitchUser: _onSwitchUser }) => {
  const [roster, setRoster] = useState<StaffMember[]>(() => getStoredDepartmentRoster());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for adding/editing staff manually
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('AUDIT_PIC');
  const [title, setTitle] = useState('Audit PIC');
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = currentUser.role === 'SYSTEM_ADMIN';

  const roleLabel = (r: UserRole | null) => {
    if (!r) return 'Pending Assignment';
    switch (r) {
      case 'SYSTEM_ADMIN':
        return 'System Admin';
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

  const handleSaveStaff = (e: React.FormEvent) => {
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

    if (editingId) {
      const updated = roster.map((s) =>
        s.id === editingId
          ? {
              ...s,
              name: trimmedName,
              email: trimmedEmail,
              role,
              title: title || roleLabel(role),
              is_active: true,
              account_status: 'ACTIVE' as const,
            }
          : s
      );
      saveDepartmentRoster(updated);
      setRoster(updated);
      setEditingId(null);
    } else {
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
        is_active: true,
        account_status: 'ACTIVE',
      };

      const updated = [...roster, newStaff];
      saveDepartmentRoster(updated);
      setRoster(updated);
    }

    setName('');
    setEmail('');
    setShowAddForm(false);
  };

  const handleAssignRoleAndActivate = (userId: string, newRole: UserRole) => {
    if (!isAdmin) return;
    const updated = roster.map((s) =>
      s.id === userId
        ? {
            ...s,
            role: newRole,
            title: newRole === 'SYSTEM_ADMIN' ? 'System Administrator' : newRole === 'AUDIT_PARTNER' ? 'Managing Audit Partner' : newRole === 'AUDIT_MANAGER' ? 'Audit Manager' : newRole === 'SUPERVISOR' ? 'Audit Supervisor' : 'Audit PIC',
            is_active: true,
            account_status: 'ACTIVE' as const,
          }
        : s
    );
    saveDepartmentRoster(updated);
    setRoster(updated);
  };

  const handleResetPassword = (id: string) => {
    if (!isAdmin) return;
    const updated = roster.map((s) => (s.id === id ? { ...s, must_change_password: true } : s));
    saveDepartmentRoster(updated);
    setRoster(updated);
    setErrorMsg('Password reset triggered. User will be required to create a new unique password on next sign-in.');
  };

  const handleToggleActive = (id: string) => {
    if (!isAdmin) return;
    const target = roster.find((s) => s.id === id);
    if (target?.role === 'SYSTEM_ADMIN' && target.id === currentUser.id) {
      setErrorMsg('Cannot deactivate your own System Admin account.');
      return;
    }

    const updated = roster.map((s) =>
      s.id === id
        ? {
            ...s,
            is_active: !s.is_active,
            account_status: !s.is_active ? ('ACTIVE' as const) : ('INACTIVE' as const),
          }
        : s
    );
    saveDepartmentRoster(updated);
    setRoster(updated);
  };

  const handleDeleteStaff = (id: string) => {
    if (!isAdmin) return;
    const target = roster.find((s) => s.id === id);
    if (target?.role === 'SYSTEM_ADMIN') {
      setErrorMsg('Cannot delete a System Admin account.');
      return;
    }

    const updated = roster.filter((s) => s.id !== id);
    saveDepartmentRoster(updated);
    setRoster(updated);
  };

  const startEdit = (staff: StaffMember) => {
    if (!isAdmin) return;
    setEditingId(staff.id);
    setName(staff.name);
    setEmail(staff.email);
    setRole(staff.role || 'AUDIT_PIC');
    setTitle(staff.title);
    setShowAddForm(true);
  };

  const pendingUsers = roster.filter(
    (s) => s.role === null || s.account_status === 'PENDING_APPROVAL'
  );

  const adminCount = roster.filter((s) => s.role === 'SYSTEM_ADMIN' && s.is_active).length;
  const partnerCount = roster.filter((s) => s.role === 'AUDIT_PARTNER' && s.is_active).length;
  const managerCount = roster.filter((s) => s.role === 'AUDIT_MANAGER' && s.is_active).length;
  const supervisorCount = roster.filter((s) => s.role === 'SUPERVISOR' && s.is_active).length;
  const picCount = roster.filter((s) => s.role === 'AUDIT_PIC' && s.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            User Directory &amp; RBAC Roster
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin
              ? 'Manage audit personnel, assign pending sign-ups, roles, and account status.'
              : 'View department staff directory.'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName('');
              setEmail('');
              setRole('AUDIT_PIC');
              setTitle('Audit PIC');
              setShowAddForm(!showAddForm);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162d4a] transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {showAddForm ? 'Close Form' : 'Add New User'}
          </button>
        )}
      </div>

      {/* Pending Role Assignment Highlight Section */}
      {isAdmin && pendingUsers.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-900">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-bold">
              Pending Role Assignment &amp; Activation ({pendingUsers.length})
            </h2>
          </div>
          <p className="text-xs text-amber-800">
            The following accounts have signed up and are waiting for System Admin role assignment and activation. Assigning a role will automatically activate their account.
          </p>

          <div className="overflow-x-auto rounded border border-amber-200 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-amber-200 bg-amber-100/50 text-amber-900">
                  <th className="px-4 py-2.5 font-semibold">Name &amp; Email</th>
                  <th className="px-4 py-2.5 font-semibold">Assigned Role</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pendingUsers.map((pUser) => (
                  <PendingUserRow key={pUser.id} user={pUser} onAssign={handleAssignRoleAndActivate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddForm && isAdmin && (
        <form onSubmit={handleSaveStaff} className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {editingId ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
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
                  setTitle(r === 'SYSTEM_ADMIN' ? 'System Administrator' : r === 'AUDIT_PARTNER' ? 'Managing Audit Partner' : r === 'AUDIT_MANAGER' ? 'Audit Manager' : r === 'SUPERVISOR' ? 'Audit Supervisor' : 'Audit PIC');
                }}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-xs focus:border-[#1E3A5F] focus:outline-none"
              >
                <option value="SYSTEM_ADMIN">System Admin (Full Access &amp; User Governance)</option>
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
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
              }}
              className="rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-[#1E3A5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#162d4a]"
            >
              {editingId ? 'Update Staff Member' : 'Save Staff Member'}
            </button>
          </div>
        </form>
      )}

      {/* Role Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <p className="text-xs text-slate-500">System Admins</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">{adminCount}</p>
        </div>
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

      {errorMsg && !showAddForm && <p className="text-xs font-medium text-red-700">{errorMsg}</p>}

      {/* Roster Table */}
      {roster.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No staff members in the directory</p>
          <p className="mt-1 text-xs text-slate-500">Use the Sign Up page or button above to add staff members.</p>
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
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {roster.map((member) => {
                  const isActiveUser = member.id === currentUser.id;

                  return (
                    <tr key={member.id} className={isActiveUser ? 'bg-slate-50' : 'hover:bg-slate-50/60'}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          {member.role === 'SYSTEM_ADMIN' && (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                              <Shield className="h-3 w-3" /> Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{member.title}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {roleLabel(member.role)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{member.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            member.is_active && member.role !== null
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {member.role === null ? 'Pending Role' : member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right flex items-center justify-end gap-2">
                        {isActiveUser ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <UserCheck className="h-3.5 w-3.5" />
                            Active Session
                          </span>
                        ) : (
                          <>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(member.id)}
                                className="text-slate-600 hover:text-slate-900 p-1"
                                title={member.is_active ? 'Deactivate user' : 'Activate user'}
                              >
                                {member.is_active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleResetPassword(member.id)}
                                className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                                title="Reset password requiring user to create a new password on next sign in"
                              >
                                Reset Password
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => startEdit(member)}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                            )}
                            {isAdmin && member.role !== 'SYSTEM_ADMIN' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(member.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                aria-label="Delete user"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
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

interface PendingUserRowProps {
  user: StaffMember;
  onAssign: (userId: string, role: UserRole) => void;
}

const PendingUserRow: React.FC<PendingUserRowProps> = ({ user, onAssign }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('AUDIT_PIC');

  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900">{user.name}</p>
        <p className="font-mono text-[11px] text-slate-500">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
          className="rounded border border-amber-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
        >
          <option value="AUDIT_PIC">Audit PIC (Team Member)</option>
          <option value="SUPERVISOR">Supervisor (Dual-Role / Reviewer)</option>
          <option value="AUDIT_MANAGER">Audit Manager (1st-Level Approver)</option>
          <option value="AUDIT_PARTNER">Audit Partner (2nd-Level Approver)</option>
          <option value="SYSTEM_ADMIN">System Admin</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onAssign(user.id, selectedRole)}
          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Assign &amp; Activate
        </button>
      </td>
    </tr>
  );
};
