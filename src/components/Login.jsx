// src/components/Login.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, User, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const result = login(email, password);
      if (!result.success) {
        setError(result.message);
        setIsSubmitting(false);
      }
    }, 800);
  };

  return (
    <div className="login-fullscreen">
      <div className="login-split-card">
        {/* Left Side: Brand Pane */}
        <div className="login-pane-brand">
          <div className="brand-grid-overlay"></div>
          <div className="brand-content">
            <div className="brand-logo-strip">
              <div className="shield-icon">
                <Shield size={24} fill="currentColor" />
              </div>
              <span className="brand-name">ELRMS</span>
            </div>

            <div className="brand-welcome">
              <h1>Welcome <br /> Back</h1>
              <p>Access your secure dashboard and manage records efficiently.</p>
            </div>

            <div className="brand-footer">
              <p>© 2026 ELRMS Systems</p>
              <p>Keiphil G.</p>
              <p>Cedrix F.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Form Pane */}
        <div className="login-pane-form">
          <div className="form-header">
            <h2>Sign In</h2>
            <p>Please enter your credentials to continue.</p>
          </div>

          {error && (
            <div className="login-error-pill">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label>USERNAME</label>
              <div className="input-icon-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <div className="label-flex">
                <label>PASSWORD</label>
                <a href="#" className="label-link">Forgot Password?</a>
              </div>
              <div className="input-icon-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>



            <button
              type="submit"
              className="btn-login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : 'Login'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};

export default Login;
