import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCustomerOrders } from '../services/order';
import OrderStatusBadge from '../components/store/OrderStatusBadge';
import EmptyState from '../components/store/EmptyState';

const TABS = ['All', 'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('All');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCustomerOrders();
        setOrders(data || []);
        setError(null);
      } catch {
        setError('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = tab === 'All' ? orders : orders.filter((o) => o.order_status === tab);

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 bg-slate-100 rounded w-32"></div>
      {[1, 2, 3].map((n) => <div key={n} className="h-24 bg-slate-100 rounded-xl"></div>)}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>

      {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-0">
        {TABS.map((t) => {
          const count = t === 'All' ? orders.length : orders.filter((o) => o.order_status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors capitalize ${
                tab === t ? 'border-[#233d7d] text-[#233d7d]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t} {count > 0 && <span className="ml-1 text-xs bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="bi bi-bag"
          title="No orders found"
          message={tab === 'All' ? "You haven't placed any orders yet." : `No ${tab} orders.`}
          action={tab === 'All' && <Link to="/app/catalog" className="inline-flex items-center gap-2 bg-[#233d7d] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1a2f61] transition-colors">Start Shopping <i className="bi bi-arrow-right"></i></Link>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.id}
              to={`/app/orders/${order.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 font-mono text-sm">#{order.order_number}</span>
                    <OrderStatusBadge status={order.order_status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {order.item_count ? ` · ${order.item_count} item${order.item_count !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900">${Number(order.grand_total).toFixed(2)}</p>
                  <p className="text-xs text-[#233d7d] mt-1 flex items-center gap-1 justify-end">
                    View details <i className="bi bi-chevron-right"></i>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
