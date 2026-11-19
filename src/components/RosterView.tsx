import React from 'react';
import { UserCheck } from 'lucide-react';
import type { StaffMember } from '../types/audit';
import { DEPARTMENT_ROSTER, getStaffById } from '../data/roster';

interface RosterViewProps {
  currentUser: StaffMember;
  onSwitchUser: (userId: string) => void;
}

export const RosterView: React.FC<RosterViewProps> = ({ currentUser, onSwitchUser }) => {
  const roleLabel = (role: StaffMember['role']) => {
    switch (role) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Audit Department Roster &amp; RBAC Matrix
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          21 active audit personnel (1 Audit Partner, 1 Audit Manager, 4 Supervisors, 15 Audit PICs). Admin personnel (2 staff) are strictly excluded from system access.
        </p>
      </div>

      {/* Role Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <p className="text-xs text-slate-500">Audit Partner</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">1</p>
          <p className="mt-0.5 text-[11px] text-slate-500">2nd-level &amp; fee decision</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Audit Manager</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">1</p>
          <p className="mt-0.5 text-[11px] text-slate-500">1st-level &amp; 1st extension</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Supervisors</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">4</p>
          <p className="mt-0.5 text-[11px] text-slate-500">PIC on own · Viewer post-approval</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Audit PICs</p>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">15</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Draft intake &amp; 26-section budget</p>
        </div>
      </div>

      {/* 21-User Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="px-5 py-3 font-semibold">Staff Member</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Assigned Supervisor</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 text-right font-semibold">Simulate Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DEPARTMENT_ROSTER.map((member) => {
                const sup = member.supervisorId ? getStaffById(member.supervisorId) : null;
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
                    <td className="px-4 py-3 text-slate-600">
                      {sup ? sup.name : member.role === 'SUPERVISOR' ? 'Reports to Manager' : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{member.email}</td>
                    <td className="px-5 py-3 text-right">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <UserCheck className="h-3.5 w-3.5" />
                          Active User
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSwitchUser(member.id)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          Switch Role
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
