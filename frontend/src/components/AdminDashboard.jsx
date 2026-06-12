import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'projects', 'users', 'settings'
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Project Modal / Form States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState('To Do');
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  // Load Admin Data
  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [analyticsRes, usersRes, projectsRes] = await Promise.all([
        api.get('/api/admin/analytics'),
        api.get('/api/admin/users'),
        api.get('/api/projects')
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error loading system dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    setError('');
    try {
      const res = await api.post('/api/projects', {
        title: newTitle,
        description: newDesc,
        status: newStatus
      });
      setProjects([res.data, ...projects]);
      setNewTitle('');
      setNewDesc('');
      setNewStatus('To Do');
      setProjectFormOpen(false);
      // Reload analytics to update charts/counts
      const analyticRes = await api.get('/api/admin/analytics');
      setAnalytics(analyticRes.data);
    } catch (err) {
      setError('Failed to create project.');
    }
  };

  const handleUpdateStatus = async (projectId, currentTitle, currentDesc, nextStatus) => {
    try {
      const res = await api.put(`/api/projects/${projectId}`, {
        title: currentTitle,
        description: currentDesc,
        status: nextStatus
      });
      setProjects(projects.map(p => p.id === projectId ? res.data : p));
      const analyticRes = await api.get('/api/admin/analytics');
      setAnalytics(analyticRes.data);
    } catch (err) {
      setError('Failed to update project status.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/api/projects/${projectId}`);
      setProjects(projects.filter(p => p.id !== projectId));
      const analyticRes = await api.get('/api/admin/analytics');
      setAnalytics(analyticRes.data);
    } catch (err) {
      setError('Failed to delete project.');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.put(`/api/admin/users/${userId}/toggle-active`);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to toggle user state.');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '0 0.5rem' }}>
          <h3 className="gradient-text" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
            {analytics?.tenant_name || 'System Hub'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ADMIN DASHBOARD</span>
        </div>

        <ul className="sidebar-menu">
          <li>
            <div 
              className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Overview & Stats
            </div>
          </li>
          <li>
            <div 
              className={`sidebar-link ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              📁 Workspace Projects
            </div>
          </li>
          <li>
            <div 
              className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Member Directory
            </div>
          </li>
          <li>
            <div 
              className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Organization Settings
            </div>
          </li>
        </ul>

        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            Signed in as Admin:<br/>
            <span style={{ color: 'var(--text-main)' }}>{user.email}</span>
          </p>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onLogout}>
            🚪 Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem 1.5rem', marginBottom: '2rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading && <p style={{ color: 'var(--primary)' }}>Retrieving isolated tenant dataset...</p>}

        {activeTab === 'analytics' && analytics && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2>Welcome back, System Head</h2>
              <p style={{ color: 'var(--text-muted)' }}>Here is the real-time operational status for {analytics.tenant_name}.</p>
            </div>

            {/* Metrics Grid */}
            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <div className="stat-label">Total Workspace Members</div>
                <div className="stat-value">{analytics.users_count}</div>
              </div>
              <div className="glass-panel stat-card accent-card">
                <div className="stat-label">Isolated Projects</div>
                <div className="stat-value">{analytics.projects_count}</div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-label">Subscription Tier</div>
                <div className="stat-value" style={{ fontSize: '1.75rem', color: 'var(--success)' }}>
                  {analytics.plan.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Details Split Section */}
            <div className="dashboard-grid-2">
              <div className="glass-panel">
                <h3 style={{ marginBottom: '1.5rem' }}>Database Isolation Blueprint</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  This platform implements strict tenant isolation using dynamic database scoping. All SQL statements
                  invoked from this environment include an active database predicate mapping to:
                </p>
                <div style={{ margin: '1.5rem 0', background: 'rgba(0, 240, 255, 0.05)', borderLeft: '3px solid var(--primary)', padding: '1rem', fontFamily: 'monospace', borderRadius: '4px' }}>
                  SELECT * FROM projects WHERE tenant_id = '{analytics.tenant_slug}'
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  Even in multi-tenant environments, data safety, schema parameters, and access permissions are validated through global backend middlewares.
                </p>
              </div>

              <div className="glass-panel">
                <h3 style={{ marginBottom: '1.5rem' }}>Project Distribution</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>📝 TO DO</span>
                      <span>{analytics.project_statuses?.todo || 0}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--secondary)', width: `${analytics.projects_count ? (analytics.project_statuses.todo / analytics.projects_count) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>⚡ IN PROGRESS</span>
                      <span>{analytics.project_statuses?.in_progress || 0}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--primary)', width: `${analytics.projects_count ? (analytics.project_statuses.in_progress / analytics.projects_count) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>✅ COMPLETED</span>
                      <span>{analytics.project_statuses?.done || 0}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--success)', width: `${analytics.projects_count ? (analytics.project_statuses.done / analytics.projects_count) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2>Workspace Projects</h2>
                <p style={{ color: 'var(--text-muted)' }}>Scoped projects isolated in database for tenant.</p>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => setProjectFormOpen(!projectFormOpen)}
              >
                {projectFormOpen ? 'Close Panel' : '＋ Add Project'}
              </button>
            </div>

            {projectFormOpen && (
              <form className="glass-panel" onSubmit={handleCreateProject} style={{ marginBottom: '2.5rem', maxWidth: '600px' }}>
                <h3 style={{ marginBottom: '1.25rem' }}>Create Workspace Project</h3>
                <div className="input-group">
                  <label className="input-label">Project Title</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Refactor Database Drivers"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Task details and technical architecture specs..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select 
                    className="input-field"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">Publish Project</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {projects.length === 0 ? (
                <div className="glass-panel flex-center" style={{ padding: '3rem 1rem' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No projects in workspace. Get started by publishing one.</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="project-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{project.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{project.description || 'No description provided.'}</p>
                      <span className={`badge ${project.status === 'Done' ? 'badge-success' : project.status === 'In Progress' ? 'badge-info' : 'badge-danger'}`}>
                        {project.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select 
                        className="input-field"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
                        value={project.status}
                        onChange={(e) => handleUpdateStatus(project.id, project.title, project.description, e.target.value)}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>

                      <button 
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2>Member Directory</h2>
              <p style={{ color: 'var(--text-muted)' }}>Manage user status and dashboard access levels.</p>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th>Account Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.email}</strong> {member.id === user.id && <span style={{ color: 'var(--primary)' }}>(You)</span>}
                      </td>
                      <td>
                        <span className={`badge ${member.role === 'admin' ? 'badge-info' : 'badge-secondary'}`}>
                          {member.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${member.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {member.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {member.id !== user.id ? (
                          <button 
                            className={`btn ${member.is_active ? 'btn-danger' : 'btn-primary'}`}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => handleToggleUser(member.id)}
                          >
                            {member.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && analytics && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '2rem' }}>
              <h2>System Settings</h2>
              <p style={{ color: 'var(--text-muted)' }}>Manage billing tiers, endpoints, and system parameters.</p>
            </div>

            <div className="glass-panel">
              <div className="input-group">
                <label className="input-label">Organization Name</label>
                <input type="text" className="input-field" value={analytics.tenant_name} disabled />
              </div>
              <div className="input-group">
                <label className="input-label">Subdomain Slug</label>
                <input type="text" className="input-field" value={analytics.tenant_slug} disabled />
              </div>
              <div className="input-group">
                <label className="input-label">Creation Timestamp</label>
                <input type="text" className="input-field" value={new Date(analytics.created_at).toLocaleString()} disabled />
              </div>

              <div style={{ marginTop: '2rem', padding: '1.25rem', border: '1px solid rgba(0, 245, 212, 0.2)', background: 'rgba(0, 245, 212, 0.03)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>💡 Plan Limit</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Your system is configured on the **{analytics.plan.toUpperCase()}** billing plan. Multi-tenant database pools are active. Support for Stripe checkout integrations can be linked under settings modules.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
