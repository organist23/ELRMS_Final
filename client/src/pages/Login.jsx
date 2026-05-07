import React, { useState } from 'react';
import api from '../utils/api';
import { Eye, EyeOff, KeyRound, ArrowLeft, Wifi, WifiOff, Loader } from 'lucide-react';

const Login = ({ onLogin }) => {
  // --- Login State ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Connection Test State ---
  const [pingStatus, setPingStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [pingMessage, setPingMessage] = useState('');

  // --- Forgot Password State ---
  const [showForgot, setShowForgot] = useState(false);
  const [fpUsername, setFpUsername] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpMessage, setFpMessage] = useState({ text: '', type: '' });
  const [fpLoading, setFpLoading] = useState(false);
  const [showFpNewPw, setShowFpNewPw] = useState(false);
  const [showFpConfirmPw, setShowFpConfirmPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/login', { username, password });
      if (data.success) {
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
    setPingStatus('testing');
    setPingMessage('');
    try {
      const { data } = await api.get('/ping');
      setPingStatus('success');
      setPingMessage(data.message);
    } catch (err) {
      setPingStatus('error');
      setPingMessage(err.response?.data?.message || 'Cannot reach the server. Make sure the app backend is running.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFpMessage({ text: '', type: '' });

    if (fpNewPassword !== fpConfirmPassword) {
      setFpMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (fpNewPassword.length < 4) {
      setFpMessage({ text: 'Password must be at least 4 characters.', type: 'error' });
      return;
    }

    setFpLoading(true);
    try {
      const { data } = await api.put('/auth/reset-password', {
        username: fpUsername,
        newPassword: fpNewPassword,
      });
      if (data.success) {
        setFpMessage({ text: 'Password updated successfully! You can now log in.', type: 'success' });
        setTimeout(() => {
          setShowForgot(false);
          setFpUsername('');
          setFpNewPassword('');
          setFpConfirmPassword('');
          setFpMessage({ text: '', type: '' });
        }, 2000);
      }
    } catch (err) {
      setFpMessage({ text: err.response?.data?.error || 'User not found. Check your username.', type: 'error' });
    } finally {
      setFpLoading(false);
    }
  };

  const inputWrap = { position: 'relative' };
  const eyeBtnStyle = {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-light)',
    padding: '8px',
    display: 'flex',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand-side">
          <img src="./logo.jpg" alt="ELRMS Logo" className="login-logo-image" />
        </div>

        <div className="login-form-side">
          {!showForgot ? (
            <>
              {/* ── LOGIN FORM ── */}
              <div className="mb-40 text-center">
                <h1 className="font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                  ADMINISTRATIVE ACCESS
                </h1>
              </div>

              {error && (
                <div
                  className="badge badge-rejected mb-20"
                  style={{ width: '100%', padding: '12px', textAlign: 'center' }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group mb-24">
                  <label className="label">Username</label>
                  <input
                    type="text"
                    className="input-field"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    required
                  />
                </div>

                <div className="form-group mb-16">
                  <label className="label">Password</label>
                  <div style={inputWrap}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ paddingRight: '48px' }}
                    />
                    <button type="button" style={eyeBtnStyle} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password link */}
                <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center"
                  style={{ padding: '14px', fontSize: '1rem' }}
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>

                {/* Test Connection Button */}
                <button
                  type="button"
                  onClick={handlePing}
                  disabled={pingStatus === 'testing'}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    cursor: pingStatus === 'testing' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  {pingStatus === 'testing' ? (
                    <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Testing Connection...</>
                  ) : (
                    <><Wifi size={15} /> Test Database Connection</>
                  )}
                </button>

                {/* Connection Test Result */}
                {pingStatus && pingStatus !== 'testing' && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: pingStatus === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${pingStatus === 'success' ? '#86efac' : '#fca5a5'}`,
                    color: pingStatus === 'success' ? '#16a34a' : '#dc2626',
                  }}>
                    {pingStatus === 'success' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {pingMessage}
                  </div>
                )}
              </form>
            </>
          ) : (
            <>
              {/* ── FORGOT PASSWORD FORM ── */}
              <div className="mb-32">
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setFpMessage({ text: '', type: '' }); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: '24px',
                  }}
                >
                  <ArrowLeft size={16} /> Back to Login
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'var(--accent-light)', borderRadius: '10px', padding: '10px', display: 'flex' }}>
                    <KeyRound size={22} color="var(--accent)" />
                  </div>
                  <div>
                    <h2 className="font-bold" style={{ fontSize: '1.25rem' }}>Reset Password</h2>
                    <p className="text-small text-muted">Enter your username and a new password.</p>
                  </div>
                </div>
              </div>

              {fpMessage.text && (
                <div
                  className={`badge ${fpMessage.type === 'success' ? 'badge-approved' : 'badge-rejected'} mb-20`}
                  style={{ width: '100%', padding: '12px', textAlign: 'center', borderRadius: '8px' }}
                >
                  {fpMessage.text}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <div className="form-group mb-24">
                  <label className="label">Username</label>
                  <input
                    type="text"
                    className="input-field"
                    value={fpUsername}
                    onChange={(e) => setFpUsername(e.target.value)}
                    placeholder="Enter your admin username"
                    required
                  />
                </div>

                <div className="form-group mb-24">
                  <label className="label">New Password</label>
                  <div style={inputWrap}>
                    <input
                      type={showFpNewPw ? 'text' : 'password'}
                      className="input-field"
                      value={fpNewPassword}
                      onChange={(e) => setFpNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ paddingRight: '48px' }}
                    />
                    <button type="button" style={eyeBtnStyle} onClick={() => setShowFpNewPw(!showFpNewPw)}>
                      {showFpNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group mb-32">
                  <label className="label">Confirm New Password</label>
                  <div style={inputWrap}>
                    <input
                      type={showFpConfirmPw ? 'text' : 'password'}
                      className="input-field"
                      value={fpConfirmPassword}
                      onChange={(e) => setFpConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ paddingRight: '48px' }}
                    />
                    <button type="button" style={eyeBtnStyle} onClick={() => setShowFpConfirmPw(!showFpConfirmPw)}>
                      {showFpConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center"
                  style={{ padding: '14px', fontSize: '1rem' }}
                  disabled={fpLoading}
                >
                  {fpLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}

          <footer className="text-center text-small text-muted" style={{ marginTop: '32px', opacity: 0.6 }}>
            <p>© {new Date().getFullYear()} @Keiphil G, Cedrix F.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
