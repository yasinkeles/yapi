import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth.service';

const TABS = ['Profile', 'Password'];
const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#233d7d]';

const Settings = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('New passwords do not match.'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    setPwSaving(true); setPwError(null); setPwSuccess(false);
    try {
      await authService.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err.response?.data?.error?.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500">Manage your account information.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? 'border-[#233d7d] text-[#233d7d]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-[#233d7d] text-xl font-bold uppercase">
              {user?.username?.[0] || user?.email?.[0] || '?'}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.username || 'User'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
            </div>
          </div>
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Username</label><input className={inp} value={user?.username || ''} readOnly /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label><input type="email" className={inp} value={user?.email || ''} readOnly /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Role</label><input className={inp} value={user?.role || ''} readOnly /></div>
          </div>
          <p className="text-xs text-slate-400">To update your profile details, please contact support.</p>
        </div>
      )}

      {tab === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Change Password</h2>
          {pwError && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{pwError}</div>}
          {pwSuccess && <div className="text-[#233d7d] text-sm bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">Password changed successfully.</div>}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label><input type="password" className={inp} value={pwForm.currentPassword} onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} required /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">New Password</label><input type="password" className={inp} value={pwForm.newPassword} onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} required minLength={6} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label><input type="password" className={inp} value={pwForm.confirmPassword} onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} required /></div>
            <button type="submit" disabled={pwSaving} className="w-full bg-[#233d7d] hover:bg-[#1a2f61] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
              {pwSaving ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
