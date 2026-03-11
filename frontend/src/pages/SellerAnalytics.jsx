import { useEffect, useState } from 'react';
import { getSalesOverview, getProductPerformance, getCampaignPerformance, getInventoryHealth } from '../services/sellerAnalytics';

const TABS = ['Sales Overview', 'Product Performance', 'Campaign Performance', 'Inventory Health'];
const PERIODS = [{ label: 'Last 7 days', value: 7 }, { label: 'Last 30 days', value: 30 }, { label: 'Last 90 days', value: 90 }];

const StatCard = ({ icon, label, value, sub }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <i className={icon}></i>
      <span>{label}</span>
    </div>
    <p className="text-2xl font-semibold text-slate-900">{value}</p>
    {sub && <p className="text-xs text-slate-400">{sub}</p>}
  </div>
);

const SellerAnalytics = () => {
  const [tab, setTab] = useState(0);
  const [period, setPeriod] = useState(30);
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, pr, cp, ih] = await Promise.all([
        getSalesOverview(period),
        getProductPerformance(period),
        getCampaignPerformance(),
        getInventoryHealth()
      ]);
      setOverview(ov.data?.data || null);
      setProducts(pr.data?.data || []);
      setCampaigns(cp.data?.data || []);
      setHealth(ih.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  const fmt = (n) => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-slate-500 text-sm">Monitor your store performance.</p>
        </div>
        <select
          className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value))}>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-500 text-sm py-10 text-center">Loading analytics...</div> : (
        <>
          {/* Sales Overview */}
          {tab === 0 && overview && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="bi bi-currency-dollar" label="Period Revenue" value={`$${fmt(overview.revenue?.period)}`} sub={`Total: $${fmt(overview.revenue?.total)}`} />
                <StatCard icon="bi bi-receipt" label="Period Orders" value={overview.orders?.period || 0} sub={`Total: ${overview.orders?.total || 0}`} />
                <StatCard icon="bi bi-box-seam" label="Units Sold" value={overview.unitsSold || 0} sub={`Last ${period} days`} />
                <StatCard icon="bi bi-graph-up" label="Top Products" value={overview.topProducts?.length || 0} sub="by revenue" />
              </div>

              {overview.topProducts?.length > 0 && (
                <div>
                  <h2 className="font-semibold text-slate-900 mb-3">Top Products</h2>
                  <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b">Product</th>
                        <th className="text-right px-3 py-2 border-b">Units Sold</th>
                        <th className="text-right px-3 py-2 border-b">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.topProducts.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium">{p.name}</td>
                          <td className="px-3 py-2 text-right">{p.units}</td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-700">${fmt(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Product Performance */}
          {tab === 1 && (
            <div>
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Product</th>
                    <th className="text-left px-3 py-2 border-b">SKU</th>
                    <th className="text-right px-3 py-2 border-b">Base Price</th>
                    <th className="text-right px-3 py-2 border-b">Units Sold</th>
                    <th className="text-right px-3 py-2 border-b">Orders</th>
                    <th className="text-right px-3 py-2 border-b">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-slate-500">{p.sku || '-'}</td>
                      <td className="px-3 py-2 text-right">${fmt(p.basePrice)}</td>
                      <td className="px-3 py-2 text-right">{p.unitsSold}</td>
                      <td className="px-3 py-2 text-right">{p.orderCount}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">${fmt(p.revenue)}</td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No data available.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Campaign Performance */}
          {tab === 2 && (
            <div>
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Campaign</th>
                    <th className="text-left px-3 py-2 border-b">Discount</th>
                    <th className="text-left px-3 py-2 border-b">Period</th>
                    <th className="text-right px-3 py-2 border-b">Orders</th>
                    <th className="text-right px-3 py-2 border-b">Revenue</th>
                    <th className="text-left px-3 py-2 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">{c.discountValue}{c.discountType === 'percentage' ? '%' : ' fixed'}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{fmtDate(c.startAt)} – {fmtDate(c.endAt)}</td>
                      <td className="px-3 py-2 text-right">{c.orders}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">${fmt(c.revenue)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {c.isActive ? 'Active' : 'Ended'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No campaigns yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Inventory Health */}
          {tab === 3 && health && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                  Low Stock ({health.lowStock?.length || 0})
                </h2>
                <div className="space-y-2">
                  {health.lowStock?.map((p) => (
                    <div key={p.id} className="border border-red-200 rounded-md px-3 py-2 bg-red-50 text-sm">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">Qty: <span className="font-semibold text-red-600">{p.qty}</span> / Reorder: {p.reorderLevel}</p>
                    </div>
                  ))}
                  {!health.lowStock?.length && <p className="text-sm text-slate-400">All products adequately stocked.</p>}
                </div>
              </div>

              <div>
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Fast Moving ({health.fastMoving?.length || 0})
                </h2>
                <div className="space-y-2">
                  {health.fastMoving?.map((p) => (
                    <div key={p.id} className="border border-emerald-200 rounded-md px-3 py-2 bg-emerald-50 text-sm">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">Sold: <span className="font-semibold text-emerald-700">{p.unitsSold}</span> units (30d)</p>
                    </div>
                  ))}
                  {!health.fastMoving?.length && <p className="text-sm text-slate-400">No fast moving products.</p>}
                </div>
              </div>

              <div>
                <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  Dead Stock ({health.deadStock?.length || 0})
                </h2>
                <div className="space-y-2">
                  {health.deadStock?.map((p) => (
                    <div key={p.id} className="border border-amber-200 rounded-md px-3 py-2 bg-amber-50 text-sm">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">Qty: {p.qty} — no orders (60d)</p>
                    </div>
                  ))}
                  {!health.deadStock?.length && <p className="text-sm text-slate-400">No dead stock detected.</p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SellerAnalytics;
