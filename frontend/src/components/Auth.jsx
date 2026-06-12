import React, { useState } from 'react';
import api from '../api';

export default function Auth({ tenantSlug, onAuthSuccess, onBackToPortal }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const tenantName = localStorage.getItem('tenant_name') || tenantSlug;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post('/api/auth/login', { email, password });
        const { access_token, user } = response.data;
        
        // Save to local storage
        localStorage.setItem('token', access_token);
        localStorage.setItem('user_role', user.role);
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('tenant_slug', tenantSlug);
        
        onAuthSuccess(user);
      } else {
        // Signup
        await api.post('/api/auth/signup', { email, password });
        setSuccessMsg('Account created successfully! Switching to Login...');
        setEmail('');
        setPassword('');
        setTimeout(() => {
          setIsLogin(true);
          setSuccessMsg('');
        }, 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: 'calc(100vh - 100px)' }}>
      <div className="glass-panel glow-primary" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="badge badge-info" style={{ marginBottom: '0.75rem' }}>
            Workspace: {tenantName} ({tenantSlug})
          </span>
          <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
            {isLogin ? 'Welcome Back' : 'Join Workspace'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? 'Log in with your tenant credentials' : 'Sign up as a new team member'}
          </p>
        </div>

        {successMsg && (
          <div className="badge badge-success" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.25rem' }} disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Log In' : 'Register Account'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', marginTop: '1.25rem', fontSize: '0.9rem' }}>
          <button 
            type="button" 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }} 
            onClick={onBackToPortal}
          >
            ← Change Workspace
          </button>
          
          <button 
            type="button" 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} 
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
          >
            {isLogin ? 'Create Account' : 'Log In Instead'}
          </button>
        </div>
      </div>
    </div>
  );
}
