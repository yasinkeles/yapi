/**
 * Dashboard Page (AdminLTE 4)
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data } = await api.get('/admin/analytics');
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // If it's a 2FA error, the api interceptor will handle the redirect.
      // We just need to stop the spinner here.
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Endpoints', value: stats?.counts?.totalEndpoints || 0, icon: 'bi-hdd-network', link: '/api-endpoints', color: 'text-teal-500' },
    { title: 'Active API Keys', value: stats?.counts?.activeApiKeys || 0, icon: 'bi-key', link: '/api-keys', color: 'text-teal-600' },
    { title: 'Data Sources', value: stats?.counts?.totalDataSources || 0, icon: 'bi-database', link: '/data-sources', color: 'text-amber-500' },
    { title: 'Total Requests', value: stats?.stats?.total_requests || 0, icon: 'bi-bar-chart', link: '/analytics', color: 'text-teal-600' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Welcome to your Multi-Database API Service</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="group relative bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-sm hover:border-dark-700 transition-all duration-200"
          >
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded-lg bg-dark-800 ${stat.color}`}>
                <i className={`bi ${stat.icon} text-xl`}></i>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/data-sources" className="bg-dark-900 border border-dark-800 rounded-xl p-6 hover:bg-dark-800 transition-colors group">
            <div className="w-12 h-12 bg-dark-800 rounded-lg flex items-center justify-center text-teal-500 mb-4 group-hover:scale-110 transition-transform">
              <i className="bi bi-database-add text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Add Data Source</h3>
            <p className="text-slate-400 text-sm">Connect to a new database and start querying</p>
          </Link>

          <Link to="/api-endpoints" className="bg-dark-900 border border-dark-800 rounded-xl p-6 hover:bg-dark-800 transition-colors group">
            <div className="w-12 h-12 bg-dark-800 rounded-lg flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
              <i className="bi bi-code-square text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Create API Endpoint</h3>
            <p className="text-slate-400 text-sm">Generate a new API endpoint from SQL queries</p>
          </Link>

          <Link to="/api-keys" className="bg-dark-900 border border-dark-800 rounded-xl p-6 hover:bg-dark-800 transition-colors group">
            <div className="w-12 h-12 bg-dark-800 rounded-lg flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
              <i className="bi bi-key-fill text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Generate API Key</h3>
            <p className="text-slate-400 text-sm">Create secure access keys for your applications</p>
          </Link>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">System Health</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-dark-800 rounded-lg text-yellow-500">
                  <i className="bi bi-lightning-charge-fill"></i>
                </div>
                <span className="text-slate-300">Avg Response Time</span>
              </div>
              <span className="text-white font-mono font-bold">{Math.round(stats?.stats?.avg_response_time || 0)}ms</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-dark-800 rounded-lg text-teal-600">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <span className="text-slate-300">Success Rate</span>
              </div>
              <span className="text-white font-mono font-bold">{Math.round(100 - (stats?.stats?.error_rate || 0))}%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-dark-800 rounded-lg text-teal-500">
                  <i className="bi bi-people-fill"></i>
                </div>
                <span className="text-slate-300">Total Users</span>
              </div>
              <span className="text-white font-mono font-bold">{stats?.counts?.totalUsers || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Performance Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-dark-800">
                <span className="text-slate-400">Total Requests</span>
                <span className="text-white font-bold">{stats?.stats?.total_requests || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-dark-800">
                <span className="text-slate-400">Failed Requests</span>
                <span className="text-red-400 font-bold">{stats?.stats?.error_count || 0}</span>
              </div>
            </div>
          </div>

          <Link to="/analytics" className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors font-medium">
            View Full Report <i className="bi bi-arrow-right"></i>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
