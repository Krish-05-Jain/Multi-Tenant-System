import React, { useState, useEffect } from 'react';
import api from './api';
import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';

function App() {
  const [tenantSlug, setTenantSlug] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantChecked, setTenantChecked] = useState(false);
  const [tenantExists, setTenantExists] = useState(true);
  
  // Auth state
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if a subdomain is active
  const checkSubdomain = async () => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    let slug = null;
    if (parts.length >= 3 && parts[0] !== 'www') {
      slug = parts[0];
    } else {
      // Fallback: Check local storage
      slug = localStorage.getItem('tenant_slug');
    }

    if (slug) {
      setTenantSlug(slug);
      try {
        const response = await api.get(`/api/tenants/check-slug/${slug}`);
        if (response.data.available) {
          // Slug is available, meaning no tenant exists with this name!
          setTenantExists(false);
        } else {
          setTenantExists(true);
          setTenantName(response.data.tenant_name || slug);
          localStorage.setItem('tenant_slug', slug);
          if (response.data.tenant_name) {
            localStorage.setItem('tenant_name', response.data.tenant_name);
          }
        }
      } catch (err) {
        console.error('Failed to verify tenant:', err);
      }
    }
    setTenantChecked(true);
  };

  // Check user authorization token
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthChecked(true);
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch (err) {
      console.error('Invalid token, logging out:', err);
      handleLogout();
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkSubdomain();
      await checkAuth();
    };
    init();
  }, [tenantSlug]);

  const handleSelectTenant = (slug) => {
    setTenantSlug(slug);
    setTenantExists(true);
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    setUser(null);
  };

  const handleBackToPortal = () => {
    localStorage.removeItem('tenant_slug');
    localStorage.removeItem('tenant_name');
    setTenantSlug(null);
    setTenantExists(true);
    handleLogout();
  };

  if (!tenantChecked || !authChecked) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(0, 240, 255, 0.1)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
          CONFIGURING SECURE DOMAIN HANDLER...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If subdomain is specified but doesn't exist in the system database
  if (tenantSlug && !tenantExists) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh' }}>
        <div className="glass-panel glow-secondary" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Workspace Not Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            The workspace slug <strong>"{tenantSlug}"</strong> does not correspond to an active organization registry.
          </p>
          <button className="btn btn-primary" onClick={handleBackToPortal}>
            Return to Core Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header bar (only shown if not in dashboard view, dashboards have their own sidebars) */}
      {!user && (
        <header className="app-header">
          <div className="container header-container">
            <a href="/" className="logo gradient-text">
              ✨ AetherSaaS
            </a>
            {tenantSlug && (
              <span className="badge badge-info">
                🔒 Workspace: {tenantName || tenantSlug}
              </span>
            )}
          </div>
        </header>
      )}

      {/* Primary Routing */}
      {user ? (
        user.role === 'admin' ? (
          <AdminDashboard user={user} onLogout={handleLogout} />
        ) : (
          <UserDashboard user={user} onLogout={handleLogout} />
        )
      ) : tenantSlug ? (
        <Auth 
          tenantSlug={tenantSlug} 
          onAuthSuccess={handleAuthSuccess} 
          onBackToPortal={handleBackToPortal} 
        />
      ) : (
        <Onboarding onSelectTenant={handleSelectTenant} />
      )}
    </div>
  );
}

export default App;
