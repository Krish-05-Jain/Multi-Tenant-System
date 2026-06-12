import React, { useState } from 'react';
import api from '../api';

export default function Onboarding({ onSelectTenant }) {
  const [view, setView] = useState('portal'); // 'portal' or 'register'
  
  // Lookup states
  const [lookupSlug, setLookupSlug] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // Registration states
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupSlug) return;
    setLookupError('');
    setLookupLoading(true);

    try {
      const response = await api.get(`/api/tenants/check-slug/${lookupSlug.toLowerCase().trim()}`);
      if (response.data.available) {
        setLookupError('Workspace not found. Would you like to register it?');
      } else {
        // Workspace exists! Switch to its portal
        localStorage.setItem('tenant_slug', lookupSlug.toLowerCase().trim());
        localStorage.setItem('tenant_name', response.data.tenant_name || lookupSlug);
        
        // Redirect if on lvh.me or local, or just trigger callback
        const hostname = window.location.hostname;
        if (hostname.includes('lvh.me')) {
          const port = window.location.port ? `:${window.location.port}` : '';
          window.location.href = `${window.location.protocol}//${lookupSlug.toLowerCase().trim()}.lvh.me${port}`;
        } else {
          onSelectTenant(lookupSlug.toLowerCase().trim());
        }
      }
    } catch (err) {
      setLookupError('Error finding workspace. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const payload = {
        tenant_name: tenantName,
        tenant_slug: tenantSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, ''),
        admin_email: adminEmail,
        admin_password: adminPassword
      };

      if (!payload.tenant_slug) {
        throw new Error("Slug must contain only alphanumeric characters or hyphens");
      }

      await api.post('/api/tenants/register', payload);
      setRegisterSuccess(true);
      
      // Auto redirect to workspace login
      setTimeout(() => {
        const hostname = window.location.hostname;
        if (hostname.includes('lvh.me')) {
          const port = window.location.port ? `:${window.location.port}` : '';
          window.location.href = `${window.location.protocol}//${payload.tenant_slug}.lvh.me${port}`;
        } else {
          localStorage.setItem('tenant_slug', payload.tenant_slug);
          localStorage.setItem('tenant_name', payload.tenant_name);
          onSelectTenant(payload.tenant_slug);
        }
      }, 2000);

    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed';
      setRegisterError(msg);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: 'calc(100vh - 100px)', padding: '4rem 1rem' }}>
      {view === 'portal' ? (
        <div className="glass-panel glow-primary" style={{ maxWidth: '480px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>AetherSaaS</h1>
            <p style={{ color: 'var(--text-muted)' }}>Secure, Isolated Multi-Tenant Workspace Hub</p>
          </div>

          <form onSubmit={handleLookup}>
            <div className="input-group">
              <label className="input-label">Enter Workspace ID</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. acme"
                  value={lookupSlug}
                  onChange={(e) => setLookupSlug(e.target.value)}
                  required
                />
                <span className="flex-center" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingRight: '0.5rem' }}>
                  .lvh.me
                </span>
              </div>
              {lookupError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {lookupError}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={lookupLoading}>
              {lookupLoading ? 'Checking...' : 'Go to Workspace →'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Want to onboard your organization?
            </p>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%' }} 
              onClick={() => { setView('register'); setLookupError(''); }}
            >
              Create New System (SaaS Head)
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel glow-secondary" style={{ maxWidth: '520px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Create Workspace</h2>
            <p style={{ color: 'var(--text-muted)' }}>Register your system head admin and configure subdomain.</p>
          </div>

          {registerSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div className="badge badge-success" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', marginBottom: '1.5rem' }}>
                Workspace Registered Successfully!
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Redirecting you to your system dashboard login...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="input-group">
                <label className="input-label">Tenant Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Acme Corp"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Subdomain Slug</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="acme"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    required
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>.lvh.me</span>
                </div>
              </div>

              <div className="input-group" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
                <label className="input-label">Admin Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="admin@acme.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Admin Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>

              {registerError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {registerError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => { setView('portal'); setRegisterError(''); }}
                  disabled={registerLoading}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                  disabled={registerLoading}
                >
                  {registerLoading ? 'Creating Workspace...' : 'Register Workspace'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
