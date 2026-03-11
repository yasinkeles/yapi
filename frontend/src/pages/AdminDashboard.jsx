import React, { useEffect, useState } from 'react';
import api from '../services/api';

const summaryCards = [
  { key: 'users', label: 'Total Users' },
  { key: 'sellers', label: 'Total Sellers' },
  { key: 'products', label: 'Total Products' },
  { key: 'stores', label: 'Total Stores' },
  { key: 'orders', label: 'Total Orders' },
];

const AdminDashboard = () => {
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/dashboard');
        setSummary(res.data);
      } catch (err) {
        setError('Failed to load dashboard summary');
      }
      setLoading(false);
    };
    fetchSummary();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {summaryCards.map(card => (
            <div key={card.key} className="bg-white rounded shadow p-4 flex flex-col items-center">
              <div className="text-3xl font-bold text-primary-700">{summary[card.key] ?? '-'}</div>
              <div className="text-gray-600 mt-2 text-sm">{card.label}</div>
            </div>
          ))}
        </div>
      )}
      {/* Placeholder for pending approvals, alerts, recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-medium mb-2">Pending Approvals</h2>
          <div className="text-gray-500 text-sm">(Coming soon: pending sellers, stores, etc.)</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-medium mb-2">Operational Alerts</h2>
          <div className="text-gray-500 text-sm">(Coming soon: low stock, moderation, etc.)</div>
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 mt-8">
        <h2 className="font-medium mb-2">Recent Activity</h2>
        <div className="text-gray-500 text-sm">(Coming soon: recent admin actions, registrations, etc.)</div>
      </div>
    </div>
  );
};

export default AdminDashboard;
