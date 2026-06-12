import React, { useState, useEffect } from 'react';
import api from '../api';

export default function UserDashboard({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Project creation states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState('To Do');
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  const tenantSlug = localStorage.getItem('tenant_slug') || user.tenant_id;
  const tenantName = localStorage.getItem('tenant_name') || tenantSlug;

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data);
    } catch (err) {
      setError('Failed to fetch workspace projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
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
    } catch (err) {
      setError('Failed to add project.');
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
    } catch (err) {
      setError('Failed to update project status.');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '0 0.5rem' }}>
          <h3 className="gradient-text" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
            {tenantName}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MEMBER WORKSPACE</span>
        </div>

        <ul className="sidebar-menu">
          <li>
            <div className="sidebar-link active">
              📁 My Board Tasks
            </div>
          </li>
        </ul>

        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            Signed in as Member:<br/>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2>My Tasks</h2>
            <p style={{ color: 'var(--text-muted)' }}>Collaborative workspace tasks isolated to your division.</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setProjectFormOpen(!projectFormOpen)}
          >
            {projectFormOpen ? 'Close Panel' : '＋ Add Task'}
          </button>
        </div>

        {projectFormOpen && (
          <form className="glass-panel" onSubmit={handleCreateProject} style={{ marginBottom: '2.5rem', maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Add New Project Task</h3>
            <div className="input-group">
              <label className="input-label">Task Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Submit final presentation deck"
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
                placeholder="Include dashboard graphics and link parameters..."
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
            <button type="submit" className="btn btn-primary">Add Task</button>
          </form>
        )}

        {loading && <p style={{ color: 'var(--primary)' }}>Retrieving workspace tasks...</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {projects.length === 0 ? (
            <div className="glass-panel flex-center" style={{ padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>No tasks assigned. You're all caught up!</p>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="project-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{project.title}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{project.description || 'No description.'}</p>
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
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
