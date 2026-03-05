/**
 * Login Page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logoDark from '../assets/logo.png';
import logoLight from '../assets/logo2.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // If showing 2FA, send code. If not, send empty string (backend ignores undefined)
      const result = await login(username, password, show2FA ? twoFactorCode : undefined);

      if (result.require2fa) {
        setShow2FA(true);
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err) {
      console.error('Login error caught:', err);
      const errorMessage = err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Invalid username or password';
      setError(errorMessage);

      // If 2FA fails, maybe we want to keep showing 2FA input? Yes.
      // But if it's "Invalid username/password", setShow2FA(false) might be better?
      // Usually keep it unless user cancels.
    } finally {
      setLoading(false);
    }
  };

  const handleCancel2FA = () => {
    setShow2FA(false);
    setTwoFactorCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img src={theme === 'dark' ? logoDark : logoLight} alt="Logo" className="h-20 object-contain" />
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-6">
            {show2FA ? 'Two-Factor Authentication' : 'Sign In'}
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
              <div className="flex items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!show2FA ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input w-full"
                    placeholder="Enter your username or email"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {useBackupCode ? 'Backup / Recovery Code' : 'Authentication Code'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (useBackupCode) {
                        setTwoFactorCode(val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8));
                      } else {
                        setTwoFactorCode(val.replace(/\D/g, '').slice(0, 6));
                      }
                    }}
                    className="input w-full text-center text-2xl tracking-widest font-mono"
                    placeholder={useBackupCode ? 'abc12345' : '000 000'}
                    required
                    autoFocus
                    maxLength={useBackupCode ? 8 : 6}
                  />
                  <div className="text-center mt-2 text-xs text-slate-400">
                    {useBackupCode
                      ? 'Enter one of your 8-character backup codes.'
                      : 'Open your authenticator app and enter the code.'}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline block mx-auto"
                  >
                    {useBackupCode ? 'Use Authenticator App' : 'Use Backup Code'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (show2FA ? 'Verifying...' : 'Signing in...') : (show2FA ? 'Verify' : 'Sign In')}
            </button>

            {show2FA && (
              <button
                type="button"
                onClick={handleCancel2FA}
                className="btn btn-secondary w-full mt-2"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
