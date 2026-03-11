/**
 * Users Management Page
 */

import { useState, useEffect } from 'react';
import axios from '../services/api';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form State
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'customer'
  });

  const [editUserForm, setEditUserForm] = useState({
    username: '',
    email: '',
    role: '',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/admin/users');
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axios.get('/admin/roles');
      if (data.success) {
        setRoles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/admin/users', newUserForm);
      setShowAddModal(false);
      setNewUserForm({ username: '', email: '', password: '', role: 'customer' });
      fetchUsers();
      alert('User created successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create user');
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditUserForm({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/admin/users/${editingUser.id}`, editUserForm);
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      alert('User updated successfully');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  const handleReset2FA = async (id) => {
    if (!window.confirm('Are you sure you want to reset 2FA for this user?')) return;
    try {
      await axios.post(`/admin/users/${id}/reset-2fa`);
      alert('2FA reset successfully');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to reset 2FA');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <i className="bi bi-person-plus"></i>
          Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-800 text-slate-400 text-sm">
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Username</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">2FA</th>
                <th className="p-3 font-medium">Created At</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-dark-800/50 transition-colors">
                  <td className="p-3 text-slate-500 font-mono">#{u.id}</td>
                  <td className="p-3 font-medium text-white">{u.username}</td>
                  <td className="p-3 text-slate-300">{u.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-900/30 text-indigo-400 border border-indigo-900/50">
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.is_active ? (
                      <span className="text-green-400 text-xs">Active</span>
                    ) : (
                      <span className="text-red-400 text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="p-3">
                    {u.two_factor_enabled ? (
                      <span className="text-green-400 text-xs flex items-center gap-1">
                        <i className="bi bi-shield-check"></i> Enabled
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Disabled</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 text-sm">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="btn btn-sm btn-ghost text-indigo-400 hover:text-indigo-300"
                        title="Edit User"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      {!!u.two_factor_enabled && (
                        <button
                          onClick={() => handleReset2FA(u.id)}
                          className="btn btn-sm btn-ghost text-orange-400 hover:text-orange-300"
                          title="Reset 2FA"
                        >
                          <i className="bi bi-shield-x"></i>
                        </button>
                      )}

                      {currentUser?.id !== u.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="btn btn-sm btn-ghost text-red-400 hover:text-red-300"
                          title="Delete User"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={newUserForm.username}
                  onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="input w-full"
                  value={newUserForm.email}
                  onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="input w-full"
                  value={newUserForm.password}
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  className="input w-full"
                  value={newUserForm.role}
                  onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn btn-primary flex-1">Create User</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  value={editUserForm.username}
                  onChange={e => setEditUserForm({ ...editUserForm, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="input w-full"
                  value={editUserForm.email}
                  onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  className="input w-full"
                  value={editUserForm.role}
                  onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  disabled={currentUser?.id === editingUser.id}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>
                      {role.display_name}
                    </option>
                  ))}
                </select>
                {currentUser?.id === editingUser.id && (
                  <p className="text-xs text-slate-500 mt-1">You cannot change your own role</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUserForm.is_active}
                    onChange={e => setEditUserForm({ ...editUserForm, is_active: e.target.checked })}
                    disabled={currentUser?.id === editingUser.id}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-teal-600"
                  />
                  <span className="text-sm text-slate-300">Active Account</span>
                </label>
                {currentUser?.id === editingUser.id && (
                  <p className="text-xs text-slate-500 mt-1">You cannot deactivate your own account</p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn btn-primary flex-1">Update User</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
