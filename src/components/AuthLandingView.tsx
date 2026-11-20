import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, Building2, UserPlus, CheckCircle2 } from 'lucide-react';
import type { StaffMember } from '../types/audit';
import { getStoredDepartmentRoster, saveDepartmentRoster } from '../data/roster';
import { generateSalt, hashPassword, verifyPassword } from '../utils/authCrypto';

interface AuthLandingViewProps {
  onLogin: (staff: StaffMember) => void;
}

export const AuthLandingView: React.FC<AuthLandingViewProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [roster, setRoster] = useState<StaffMember[]>(() => getStoredDepartmentRoster());

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');

  // Password Reset / Change state (when must_change_password is true or legacy unhashed)
  const [pendingUserForPasswordChange, setPendingUserForPasswordChange] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccessMsg, setSignUpSuccessMsg] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    const cleanedEmail = signInEmail.trim().toLowerCase();

    if (!cleanedEmail || !signInPassword) {
      setSignInError('Invalid work email or password.');
      return;
    }

    if (cleanedEmail.startsWith('admin') || cleanedEmail.includes('admin@')) {
      setSignInError('Invalid work email or password.');
      return;
    }

    const user = roster.find((u) => u.email.toLowerCase() === cleanedEmail);
    if (!user) {
      setSignInError('Invalid work email or password.');
      return;
    }

    // Legacy / Unhashed Account Check
    if (!user.password_hash || !user.password_salt || user.password_hash.length !== 64) {
      setPendingUserForPasswordChange(user);
      return;
    }

    // Strict Password Check
    const isValid = await verifyPassword(signInPassword, user.password_salt, user.password_hash);
    if (!isValid) {
      setSignInError('Invalid work email or password.');
      return;
    }

    if (user.role === null || user.account_status === 'PENDING_APPROVAL') {
      setSignInError('Your account is pending role assignment and activation by the System Admin.');
      return;
    }

    if (!user.is_active || user.account_status === 'INACTIVE') {
      setSignInError('Your account is inactive. Please contact the System Admin.');
      return;
    }

    if (user.must_change_password) {
      setPendingUserForPasswordChange(user);
      return;
    }

    onLogin(user);
  };

  const handleCompletePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    if (!pendingUserForPasswordChange) return;

    if (newPassword.length < 8) {
      setPasswordChangeError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    const salt = generateSalt();
    const password_hash = await hashPassword(newPassword, salt);

    if (typeof password_hash !== 'string' || password_hash.length !== 64) {
      setPasswordChangeError('Password hashing failed. Please try again.');
      return;
    }

    const updatedRoster = roster.map((s) =>
      s.id === pendingUserForPasswordChange.id
        ? {
            ...s,
            password_salt: salt,
            password_hash,
            must_change_password: false,
          }
        : s
    );

    saveDepartmentRoster(updatedRoster);
    setRoster(updatedRoster);

    const updatedStaff = updatedRoster.find((s) => s.id === pendingUserForPasswordChange.id);
    if (updatedStaff) {
      onLogin(updatedStaff);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpSuccessMsg('');

    const name = signUpName.trim();
    const email = signUpEmail.trim().toLowerCase();
    const password = signUpPassword;

    if (!name || !email || !password || !signUpConfirm) {
      setSignUpError('All fields are required.');
      return;
    }

    if (email.startsWith('admin') || email.includes('admin@')) {
      setSignUpError('Admin personnel are strictly excluded from audit department access.');
      return;
    }

    if (password.length < 8) {
      setSignUpError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== signUpConfirm) {
      setSignUpError('Passwords do not match.');
      return;
    }

    if (roster.some((s) => s.email.toLowerCase() === email)) {
      setSignUpError('An account with this work email already exists. Please sign in.');
      return;
    }

    const isFirstUser = roster.length === 0;
    const salt = generateSalt();
    const password_hash = await hashPassword(password, salt);

    if (typeof password_hash !== 'string' || password_hash.length !== 64) {
      setSignUpError('Password hashing failed. Please try again.');
      return;
    }

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      title: isFirstUser ? 'System Administrator' : 'Pending Staff Member',
      role: isFirstUser ? 'SYSTEM_ADMIN' : null,
      supervisorId: null,
      email,
      password_salt: salt,
      password_hash,
      must_change_password: false,
      is_active: isFirstUser ? true : false,
      account_status: isFirstUser ? 'ACTIVE' : 'PENDING_APPROVAL',
    };

    const updatedRoster = [...roster, newStaff];
    saveDepartmentRoster(updatedRoster);
    setRoster(updatedRoster);

    if (isFirstUser) {
      onLogin(newStaff);
    } else {
      setSignUpSuccessMsg(
        'Account created successfully. Please wait for the System Admin to assign your role and activate your account before signing in.'
      );
      setSignUpName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpConfirm('');
    }
  };

  if (pendingUserForPasswordChange) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shadow-md">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
              Password Reset &amp; Setup Required
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Your account requires a new password setup. Please enter a secure unique password (min 8 characters).
            </p>
          </div>

          <form onSubmit={handleCompletePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">New Password (min 8 chars) *</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Confirm New Password *</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {passwordChangeError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{passwordChangeError}</span>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
            >
              Set Password &amp; Sign In
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F] text-white shadow-md">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
            Audit Time Cost &amp; Fee Guideline System
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            MIA Recommended Practice Guide 7 (RPG 7, Revised)
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setSignInError('');
            }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              activeTab === 'signin'
                ? 'bg-[#1E3A5F] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setSignUpError('');
              setSignUpSuccessMsg('');
            }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              activeTab === 'signup'
                ? 'bg-[#1E3A5F] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {activeTab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Work Email</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="e.g., pic1@meridianaudit.my"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {signInError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{signInError}</span>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] py-2.5 text-xs font-semibold text-white hover:bg-[#254878] transition-colors"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            {roster.length === 0 && (
              <div className="rounded border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
                <p className="font-semibold">First-User Bootstrap Notice</p>
                <p className="mt-0.5 text-[11px] text-sky-300">
                  The user directory is empty. The first registered account will automatically become the initial **System Administrator** with full management privileges.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300">Full Name *</label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Work Email *</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="e.g., alex.j@firm.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Create Unique Password (min 8 chars) *</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Confirm Password *</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={signUpConfirm}
                  onChange={(e) => setSignUpConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {signUpError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{signUpError}</span>
              </div>
            )}

            {signUpSuccessMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{signUpSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Audit Department Roster · Secured with SHA-256</span>
        </div>
      </div>
    </div>
  );
};
