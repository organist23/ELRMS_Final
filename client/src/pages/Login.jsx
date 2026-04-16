import React, { useState } from 'react';
import api from '../utils/api';
import { Eye, EyeOff } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand-side">
          <img src="/logo.jpg" alt="ELRMS Logo" className="login-logo-image" />
        </div>

        <div className="login-form-side">
          <div className="mb-40 text-center">
            <h1 className="font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}>ADMINISTRATIVE ACCESS</h1>
          </div>

          {error && <div className="badge badge-rejected mb-20" style={{ width: '100%', padding: '12px', textAlign: 'center' }}>{error}</div>}

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
            <div className="form-group mb-32">
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                    padding: '8px',
                    display: 'flex'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center" style={{ padding: '14px', fontSize: '1rem' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <footer className="mt-32 text-center text-small text-muted" style={{ marginTop: '32px', opacity: 0.6 }}>
            <p>© {new Date().getFullYear()} @Keiphil G, Cedrix F.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
