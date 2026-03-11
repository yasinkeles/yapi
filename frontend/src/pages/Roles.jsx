/**
 * Roles Management Page (dynamic page-aware)
 */

import { useState, useEffect } from 'react';
import axios from '../services/api';
import { listPages } from '../services/pages';

const STATIC_PAGES = [
  { path: '/', name: 'Dashboard', icon: 'bi-speedometer2' },
  { path: '/analytics', name: 'Analytics', icon: 'bi-graph-up' },
  { path: '/data-sources', name: 'Data Sources', icon: 'bi-database' },
  { path: '/api-endpoints', name: 'API Endpoints', icon: 'bi-hdd-network' },
  { path: '/api-keys', name: 'API Keys', icon: 'bi-key' },
  { path: '/users', name: 'Users', icon: 'bi-people' },
  { path: '/roles', name: 'Roles', icon: 'bi-shield-lock' },
  { path: '/profile', name: 'Profile', icon: 'bi-person' }
];

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [availablePages, setAvailablePages] = useState(STATIC_PAGES);

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    fetchRoles();
    fetchDynamicPages();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await axios.get('/admin/roles');
      if (data.success) {
        setRoles(data.data);
      }
    } catch (err) {
      setError('Failed to fetch roles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicPages = async () => {
    try {
      const { data } = await listPages({ status: 'published', limit: 100 });
      const pages = (data.data || []).map((p) => ({
        path: `/pages/${p.slug}`,
        name: p.name,
        icon: 'bi-file-earmark'
      }));
      setAvailablePages([...STATIC_PAGES, ...pages]);
    } catch (err) {
      console.warn('Dynamic pages could not be loaded for role permissions', err.message);
      setAvailablePages(STATIC_PAGES);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        display_name: '',
        description: '',
        permissions: []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ name: '', display_name: '', description: '', permissions: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await axios.put(`/admin/roles/${editingRole.id}`, {
          name: formData.name,
          display_name: formData.display_name,
          description: formData.description,
          permissions: formData.permissions
        });
        alert('Role updated successfully');
      } else {
        await axios.post('/admin/roles', formData);
        alert('Role created successfully');
      }
      handleCloseModal();
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save role');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await axios.delete(`/admin/roles/${id}`);
      setRoles(roles.filter(r => r.id !== id));
      alert('Role deleted successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete role');
    }
  };

  const togglePermission = (path) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(path)
        ? prev.permissions.filter(p => p !== path)
        : [...prev.permissions, path]
    }));
  };

  const toggleAllPermissions = () => {
    if (formData.permissions.length === availablePages.length) {
      setFormData(prev => ({ ...prev, permissions: [] }));
    } else {
      setFormData(prev => ({ ...prev, permissions: availablePages.map(p => p.path) }));
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Role Management</h1>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary flex items-center gap-2"
        >
          <i className="bi bi-plus-circle"></i>
          Add Role
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {roles.map(role => (
          <div key={role.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">{role.display_name}</h3>
                </div>
                <p className="text-sm text-slate-400 mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions && role.permissions.length > 0 ? (
                    role.permissions[0] === '*' ? (
                      <span className="px-2 py-1 bg-teal-900/30 text-teal-400 border border-teal-900/50 rounded text-xs">
                        <i className="bi bi-check-all me-1"></i>
                        All Pages
                      </span>
                    ) : (
                      role.permissions.map(perm => {
                        const page = availablePages.find(p => p.path === perm);
                        return (
                          <span key={perm} className="px-2 py-1 bg-dark-800 text-slate-300 border border-dark-700 rounded text-xs">
                            <i className={`bi ${page?.icon || 'bi-dot'} me-1`}></i>
                            {page?.name || perm}
                          </span>
                        );
                      })
                    )
                  ) : (
                    <span className="text-xs text-slate-500">No permissions</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(role)}
                  className="btn btn-sm btn-ghost text-indigo-400 hover:text-indigo-300"
                  title="Edit Role"
                >
                  <i className="bi bi-pencil"></i>
                </button>
                {role.name !== 'admin' && (
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="btn btn-sm btn-ghost text-red-400 hover:text-red-300"
                    title="Delete Role"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role Name (Internal)</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  placeholder="e.g., manager"
                />
                <p className="text-xs text-slate-500 mt-1">Lowercase, no spaces (use underscores)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g., Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  className="input w-full"
                  rows="2"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this role..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">Page Permissions</label>
                  <button
                    type="button"
                    onClick={toggleAllPermissions}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {formData.permissions.length === availablePages.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 bg-dark-800/50 rounded-lg border border-dark-700">
                  {availablePages.map(page => (
                    <label
                      key={page.path}
                      className="flex items-center gap-2 p-2 rounded hover:bg-dark-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(page.path)}
                        onChange={() => togglePermission(page.path)}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-dark-900"
                      />
                      <i className={`bi ${page.icon} text-slate-400`}></i>
                      <span className="text-sm text-slate-300">{page.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-dark-800">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
