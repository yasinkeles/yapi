/**
 * Analytics Page (AdminLTE 4)
 */

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import analyticsService from '../services/analytics.service';
import Card from '../components/common/Card';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const result = await analyticsService.getOverview(days);
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
        <i className="bi bi-exclamation-triangle-fill text-red-500"></i>
        <span>{error}</span>
        <button onClick={fetchAnalytics} className="ml-auto text-sm font-bold underline hover:text-white">Retry</button>
      </div>
    );
  }

  const overviewStats = [
    { label: 'Total Endpoints', value: data?.counts?.totalEndpoints || 0, icon: 'bi-hdd-network', color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: 'Data Sources', value: data?.counts?.totalDataSources || 0, icon: 'bi-database', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Total Users', value: data?.counts?.totalUsers || 0, icon: 'bi-people', color: 'text-teal-600', bg: 'bg-teal-600/10' },
  ];

  const metricStats = [
    { label: 'Total Requests', value: data?.stats?.total_requests?.toLocaleString() || 0, sub: `In last ${days} days`, icon: 'bi-bar-chart', color: 'text-teal-600' },
    { label: 'Success Rate', value: `${Math.round(100 - (data?.stats?.error_rate || 0))}%`, sub: `${data?.stats?.error_count || 0} failures`, icon: 'bi-check-lg', color: 'text-teal-600' },
    { label: 'Avg Latency', value: `${Math.round(data?.stats?.avg_response_time || 0)} ms`, sub: 'Per request', icon: 'bi-lightning-charge', color: 'text-yellow-500' },
    { label: 'Active Keys', value: data?.counts?.activeApiKeys || 0, sub: `Out of ${data?.counts?.totalApiKeys || 0}`, icon: 'bi-key', color: 'text-teal-500' },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-slate-400">Deep dive into your API performance</p>
        </div>
        <div className="bg-dark-900 border border-dark-800 p-1 rounded-lg inline-flex">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${days === d
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-dark-800'
                }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {overviewStats.map((stat, idx) => (
          <div key={idx} className="bg-dark-900 border border-dark-800 rounded-xl p-6 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${stat.bg} ${stat.color}`}>
              <i className={`bi ${stat.icon}`}></i>
            </div>
            <div>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {data?.timeline && data.timeline.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card title="Request Traffic">
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                    labelFormatter={(str) => new Date(str).toLocaleDateString()}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" name="Requests" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Latency Trend (ms)">
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                    labelFormatter={(str) => new Date(str).toLocaleDateString()}
                  />
                  <Line type="monotone" dataKey="avg_time" stroke="#ec4899" strokeWidth={2} dot={{ r: 3, fill: '#ec4899' }} name="Avg Latency" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Metrics Grid */}
      <h3 className="text-lg font-bold text-white mb-4">Performance Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricStats.map((item, idx) => (
          <div key={idx} className="bg-dark-900 border border-dark-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{item.label}</p>
                <h3 className="text-2xl font-bold text-white">{item.value}</h3>
              </div>
              <div className={`p-2 rounded-lg bg-dark-800 ${item.color}`}>
                <i className={`bi ${item.icon} text-xl`}></i>
              </div>
            </div>
            <p className="text-xs text-slate-500">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Top Endpoints Table */}
      <Card title="Top Endpoints">
        {data?.topEndpoints?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Endpoint ID</th>
                  <th className="text-right">Requests</th>
                  <th className="text-right">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {data.topEndpoints.map((endpoint, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-xs md:text-sm">{endpoint.endpoint_id}</td>
                    <td className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-teal-600/10 text-teal-500">
                        {endpoint.request_count}
                      </span>
                    </td>
                    <td className="text-right font-mono text-slate-400">{Math.round(endpoint.avg_time)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            No endpoint data available yet
          </div>
        )}
      </Card>
    </div>
  );
}
