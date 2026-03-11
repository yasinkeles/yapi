import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Profile() {
    const { user, setUser } = useAuth();

    // Password Change State
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // 2FA State
    const [qrCode, setQrCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [setupCode, setSetupCode] = useState('');
    const [showSetup, setShowSetup] = useState(false);

    // Common State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [freshUser, setFreshUser] = useState(null);

    // Username Edit State
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameForm, setUsernameForm] = useState({
        newUsername: '',
        password: ''
    });

    // Email Edit State
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailForm, setEmailForm] = useState({
        newEmail: '',
        password: ''
    });

    // Fetch latest user data on mount to ensure 2FA status is correct
    // Note: removed setUser from dependencies to prevent infinite loops
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    const { data: userResponse } = await api.get('/admin/auth/me');
                    if (userResponse.success) {
                        const freshData = userResponse.data;
                        setFreshUser(freshData);
                        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

                        // Only update if there's an actual change to prevent unnecessary state updates
                        if (JSON.stringify(freshData) !== JSON.stringify(storedUser)) {
                            localStorage.setItem('user', JSON.stringify(freshData));
                            if (setUser) {
                                setUser(freshData);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to refresh user data", err);
            }
        };
        fetchUserData();
    }, []); // Empty dependency array means this only runs once on mount

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }

        if (formData.currentPassword === formData.newPassword) {
            setError('New password must be different from current password');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            await api.post(
                '/admin/auth/change-password',
                {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                }
            );

            setSuccess('Password changed successfully!');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setError('');
        setSuccess('');
    };

    // 2FA Handlers
    const handleStartSetup = async () => {
        setLoading(true);
        try {
            const res = await api.post('/admin/auth/2fa/setup', {});
            setQrCode(res.data.data.qrCode);
            setRecoveryCodes(res.data.data.recoveryCodes || []);
            setShowSetup(true);
        } catch (err) {
            alert('Failed to start setup: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySetup = async () => {
        if (!setupCode || setupCode.length !== 6) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            await api.post('/admin/auth/2fa/verify', { token: setupCode });

            // Update user data in storage and context
            const { data: userResponse } = await api.get('/admin/auth/me');

            if (userResponse.success) {
                localStorage.setItem('user', JSON.stringify(userResponse.data));
            }

            // Attempt to refresh tokens to update 2FA claim in Access Token
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const { data: refreshRes } = await api.post('/admin/auth/refresh', {
                        refreshToken
                    });
                    if (refreshRes.data?.accessToken) {
                        localStorage.setItem('accessToken', refreshRes.data.accessToken);
                    }
                }
            } catch (err) {
                console.warn("Could not refresh token automatically", err);
            }

            alert('Two-Factor Authentication enabled successfully!');
            window.location.reload();
        } catch (err) {
            alert('Verification failed: ' + (err.response?.data?.error?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUsername = async () => {
        if (!usernameForm.newUsername || !usernameForm.password) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            await api.post('/admin/auth/update-username', {
                newUsername: usernameForm.newUsername,
                password: usernameForm.password
            });
            alert('Username updated successfully. Please log in again.');
            localStorage.clear();
            window.location.href = '/login';
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Failed to update username');
            setLoading(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!emailForm.newEmail || !emailForm.password) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            await api.post('/admin/auth/update-email', {
                newEmail: emailForm.newEmail,
                password: emailForm.password
            });
            alert('Email updated successfully.');
            // Refresh user data
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Failed to update email');
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) return;
        const password = prompt('Please enter your password to disable 2FA:');
        if (!password) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            await api.post('/admin/auth/2fa/disable', { password });
            alert('2FA has been disabled.');
            window.location.reload();
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Failed to disable 2FA');
        } finally {
            setLoading(false);
        }
    };

        const is2FARequired =
            new URLSearchParams(window.location.search).get('2fa_required') &&
            freshUser &&
            freshUser.role === 'admin' &&
            !freshUser.two_factor_enabled;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Profile Settings</h1>
            </div>

            <div className="max-w-3xl">
                {is2FARequired && (
                    <div className="mb-8 p-6 bg-red-900/20 border border-red-900/50 rounded-2xl text-red-400 animate-pulse flex items-start gap-4">
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <i className="bi bi-shield-lock-fill text-3xl"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">Action Required: Enable 2FA</h3>
                            <p className="text-slate-300">
                                To ensure the security of your account and access all features of the system,
                                you must enable Two-Factor Authentication (2FA) below.
                            </p>
                        </div>
                    </div>
                )}

                {!is2FARequired ? (
                    <>
                        {/* Account Info Card */}
                        <div className="card mb-6">
                            <h2 className="text-lg font-semibold mb-4">Account Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={usernameForm.newUsername !== '' ? usernameForm.newUsername : (user?.username || '')}
                                            onChange={(e) => setUsernameForm({ ...usernameForm, newUsername: e.target.value })}
                                            disabled={!isEditingUsername}
                                            className={`input w-full ${!isEditingUsername ? 'bg-dark-800/50 cursor-not-allowed' : ''}`}
                                        />
                                        {!isEditingUsername ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingUsername(true);
                                                    setUsernameForm({ newUsername: user?.username, password: '' });
                                                }}
                                                className="btn btn-secondary whitespace-nowrap"
                                            >
                                                Edit
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingUsername(false);
                                                    setUsernameForm({ newUsername: '', password: '' });
                                                    setError('');
                                                }}
                                                className="btn btn-secondary whitespace-nowrap"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>

                                    {isEditingUsername && (
                                        <div className="mt-3 p-4 bg-dark-800/50 rounded-lg border border-dark-700 animate-fadeIn">
                                            <p className="text-sm text-slate-400 mb-3">To change your username, please enter your current password.</p>
                                            <input
                                                type="password"
                                                placeholder="Current Password"
                                                value={usernameForm.password}
                                                onChange={(e) => setUsernameForm({ ...usernameForm, password: e.target.value })}
                                                className="input w-full mb-3"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleUpdateUsername}
                                                disabled={loading || !usernameForm.newUsername || !usernameForm.password}
                                                className="btn btn-primary w-full"
                                            >
                                                {loading ? 'Updating...' : 'Save New Username'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={emailForm.newEmail !== '' ? emailForm.newEmail : (user?.email || '')}
                                            onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                                            disabled={!isEditingEmail}
                                            className={`input w-full ${!isEditingEmail ? 'bg-dark-800/50 cursor-not-allowed text-slate-400' : ''}`}
                                        />
                                        {!isEditingEmail ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingEmail(true);
                                                    setEmailForm({ newEmail: user?.email, password: '' });
                                                }}
                                                className="btn btn-secondary whitespace-nowrap"
                                            >
                                                Edit
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingEmail(false);
                                                    setEmailForm({ newEmail: '', password: '' });
                                                }}
                                                className="btn btn-secondary whitespace-nowrap"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>

                                    {isEditingEmail && (
                                        <div className="mt-3 p-4 bg-dark-800/50 rounded-lg border border-dark-700 animate-fadeIn">
                                            <p className="text-sm text-slate-400 mb-3">To update your email, please enter your password.</p>
                                            <input
                                                type="password"
                                                placeholder="Password"
                                                value={emailForm.password}
                                                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                                                className="input w-full mb-3"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleUpdateEmail}
                                                disabled={loading || !emailForm.newEmail || !emailForm.password}
                                                className="btn btn-primary w-full"
                                            >
                                                {loading ? 'Updating...' : 'Save New Email'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                                    <input type="text" value={user?.role || 'User'} disabled className="input w-full capitalize bg-dark-800/50 cursor-not-allowed font-medium text-indigo-400" />
                                </div>
                            </div>
                        </div>

                        {/* Change Password Card */}
                        <div className="card mb-6">
                            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
                            {success && (
                                <div className="mb-4 p-3 bg-teal-900/20 border border-teal-900/50 rounded-lg text-teal-500 text-sm">
                                    {success}
                                </div>
                            )}
                            {error && (
                                <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Current Password *</label>
                                    <input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} className="input w-full" placeholder="Enter current password" disabled={loading} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">New Password *</label>
                                    <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} className="input w-full" placeholder="Enter new password (min 6 characters)" disabled={loading} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password *</label>
                                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input w-full" placeholder="Confirm new password" disabled={loading} />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-dark-800">
                                    <button type="submit" disabled={loading} className="btn btn-primary">
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                    <button type="button" onClick={handleCancel} disabled={loading} className="btn btn-secondary">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                ) : null}

                {/* Two-Factor Authentication Card */}
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication (2FA)</h2>

                    {user?.two_factor_enabled ? (
                        <div className="status-active rounded-lg p-4 mb-4 border w-full">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-teal-500/10 rounded-full">
                                    <i className="bi bi-shield-check text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold">2FA is Enabled</h3>
                                    <p className="text-sm opacity-90">Your account is secured with two-factor authentication.</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-dark-800/20 light:border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleDisable2FA}
                                    className="btn bg-red-600 hover:bg-red-700 !text-white border-transparent text-sm font-bold shadow-sm !opacity-100"
                                    disabled={loading}
                                >
                                    Disable 2FA
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-slate-400 mb-4 text-sm">
                                Protect your account by adding an extra layer of security. When enabled, you'll need to enter a code from your authenticator app to log in.
                            </p>

                            {!showSetup ? (
                                <button
                                    type="button"
                                    onClick={handleStartSetup}
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    Enable 2FA
                                </button>
                            ) : (
                                <div className="mt-4 border-t border-dark-800 pt-4 animate-fadeIn">
                                    <div className="text-center mb-4">
                                        <div className="bg-white p-2 inline-block rounded mb-2">
                                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                        </div>
                                        <p className="text-sm text-slate-300">Scan this code with your Authenticator App</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            <i className="bi bi-info-circle me-1"></i>
                                            You can scan this code with multiple devices (e.g. phone and tablet) to enable 2FA on all of them.
                                        </p>
                                    </div>

                                    {recoveryCodes && recoveryCodes.length > 0 && (
                                        <div className="mb-4 bg-dark-800 p-4 rounded-lg text-left max-w-sm mx-auto border border-dark-700">
                                            <h4 className="text-amber-500 font-bold text-sm mb-2 flex items-center gap-2">
                                                <i className="bi bi-key-fill"></i>
                                                Backup Codes (IMPORTANT)
                                            </h4>
                                            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                                                Please save these codes! If you lose your device, you can use one of these codes to log in. Each code can only be used once.
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                {recoveryCodes.map((code, idx) => (
                                                    <div key={idx} className="bg-dark-950 border border-dark-700 rounded px-2 py-1 text-center font-mono text-xs text-slate-300 tracking-wider">
                                                        {code}
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const text = "Yapi Backup Codes:\n\n" + recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n');
                                                    if (navigator.clipboard) {
                                                        navigator.clipboard.writeText(text).then(() => {
                                                            alert('Backup codes copied to clipboard!');
                                                        }).catch(() => {
                                                            prompt("Copy your codes manually:", text);
                                                        });
                                                    } else {
                                                        prompt("Copy your codes manually:", text);
                                                    }
                                                }}
                                                className="btn btn-xs btn-secondary w-full"
                                            >
                                                <i className="bi bi-clipboard me-1"></i> Copy Codes
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-3 max-w-xs mx-auto">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Enter Verification Code</label>
                                            <input
                                                type="text"
                                                value={setupCode}
                                                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                className="input w-full text-center tracking-widest font-mono text-lg"
                                                placeholder="000 000"
                                                maxLength={6}
                                                autoFocus
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleVerifySetup}
                                            disabled={loading || setupCode.length !== 6}
                                            className="btn btn-primary w-full"
                                        >
                                            Verify & Enable
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowSetup(false)}
                                            className="btn btn-secondary w-full"
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
