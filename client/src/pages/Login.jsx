import React, { useState } from 'react';
import api from '../utils/api';
import { LogIn } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Administrative Access</h1>
          </div>

          {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem', fontWeight: '500' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', marginTop: '12px', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
