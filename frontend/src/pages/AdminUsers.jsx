import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/users');
        setUsers(res.data.users || []);
      } catch (err) {
        setError('Failed to load users');
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">User Management</h1>
      <input
        className="border rounded px-3 py-2 w-full max-w-xs"
        placeholder="Search by username or email"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <table className="w-full border rounded text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Username</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Created</th>
              <th className="p-2">Last Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-t">
                <td className="p-2">{user.username}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.role}</td>
                <td className="p-2">
                  {user.is_suspended ? (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Suspended</span>
                  ) : user.is_active ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Active</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Inactive</span>
                  )}
                </td>
                <td className="p-2">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                <td className="p-2">{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '-'}</td>
                <td className="p-2">
                  <Link to={`/admin/users/${user.id}`} className="text-primary-600 hover:underline">Detail</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminUsers;
