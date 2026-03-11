import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCart } from '../services/cart';
import { getCustomerOrders } from '../services/order';
import { getAddresses } from '../services/address';
import OrderStatusBadge from '../components/store/OrderStatusBadge';

const colorMap = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-100' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    hover: 'group-hover:bg-blue-100' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-600',    hover: 'group-hover:bg-teal-100' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  hover: 'group-hover:bg-violet-100' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-600',   hover: 'group-hover:bg-slate-200' },
};

const StatCard = ({ icon, label, value, to, color = 'emerald' }) => {
  const c = colorMap[color];
  return (
    <Link to={to} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all group">
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.hover} flex items-center justify-center mb-3 transition-colors`}>
        <i className={`${icon} ${c.text} text-lg`}></i>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </Link>
  );
};

const QuickAction = ({ icon, label, desc, to, color = 'emerald' }) => {
  const c = colorMap[color];
  return (
    <Link to={to} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all group">
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.hover} flex items-center justify-center flex-shrink-0 transition-colors`}>
        <i className={`${icon} ${c.text} text-lg`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{label}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      </div>
      <i className="bi bi-chevron-right text-slate-400 flex-shrink-0"></i>
    </Link>
  );
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, o, a] = await Promise.all([
        getCart().catch(() => []),
        getCustomerOrders().catch(() => []),
        getAddresses().catch(() => []),
      ]);
      setCart(c || []);
      setOrders(o || []);
      setAddresses(a || []);
      setLoading(false);
    })();
  }, []);

  const activeOrders = orders.filter((o) => ['pending', 'confirmed', 'preparing', 'shipped'].includes(o.order_status));
  const deliveredOrders = orders.filter((o) => o.order_status === 'delivered');
  const recentOrders = orders.slice(0, 5);
  const cartPreview = cart.slice(0, 3);
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + (i.campaign_price_snapshot || i.unit_price) * i.quantity, 0);

  return (
    <div className="max-w-4xl space-y-7">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-700 font-medium">{greeting()},</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{user?.username || 'Customer'} 👋</h1>
          <p className="text-sm text-slate-500 mt-1">Here's a summary of your account.</p>
        </div>
        <Link to="/shop" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors self-start sm:self-auto">
          <i className="bi bi-bag"></i> Shop Now
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-28 bg-slate-100 rounded-xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="bi bi-bag" label="Items in Basket" value={cartItemCount} to="/app/cart" color="emerald" />
          <StatCard icon="bi bi-hourglass-split" label="Active Orders" value={activeOrders.length} to="/app/orders" color="blue" />
          <StatCard icon="bi bi-bag-check" label="Delivered" value={deliveredOrders.length} to="/app/orders" color="teal" />
          <StatCard icon="bi bi-geo-alt" label="Saved Addresses" value={addresses.length} to="/app/addresses" color="violet" />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickAction icon="bi bi-bag" label="My Basket" desc={loading ? '—' : `${cartItemCount} item${cartItemCount !== 1 ? 's' : ''} · $${cartTotal.toFixed(2)}`} to="/app/cart" color="emerald" />
          <QuickAction icon="bi bi-receipt" label="My Orders" desc={loading ? '—' : `${orders.length} total · ${activeOrders.length} active`} to="/app/orders" color="blue" />
          <QuickAction icon="bi bi-geo-alt" label="Addresses" desc={loading ? '—' : `${addresses.length} saved address${addresses.length !== 1 ? 'es' : ''}`} to="/app/addresses" color="teal" />
          <QuickAction icon="bi bi-gear" label="Settings" desc="Profile & password" to="/app/settings" color="slate" />
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            <Link to="/app/orders" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">View all →</Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-12 bg-slate-100 rounded animate-pulse"></div>)}</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No orders yet.</p>
              <Link to="/shop" className="text-xs text-emerald-600 hover:underline mt-1.5 block">Start shopping →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <Link key={order.id} to={`/app/orders/${order.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 font-mono">#{order.order_number}</p>
                    <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.order_status} showIcon={false} />
                    <span className="text-sm font-bold text-slate-900">${Number(order.grand_total).toFixed(2)}</span>
                    <i className="bi bi-chevron-right text-slate-400 text-xs"></i>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Basket preview */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">My Basket</h2>
            <Link to="/app/cart" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">View basket →</Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1, 2].map((n) => <div key={n} className="h-14 bg-slate-100 rounded animate-pulse"></div>)}</div>
          ) : cart.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Your basket is empty.</p>
              <Link to="/shop" className="text-xs text-emerald-600 hover:underline mt-1.5 block">Browse products →</Link>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {cartPreview.map((item) => {
                  const price = item.campaign_price_snapshot || item.unit_price;
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                      {item.product_image_snapshot ? (
                        <img src={item.product_image_snapshot} alt={item.product_name_snapshot} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <i className="bi bi-image text-slate-300"></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.product_name_snapshot}</p>
                        <p className="text-xs text-slate-500">×{item.quantity}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900 flex-shrink-0">${(price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
                {cart.length > 3 && (
                  <p className="px-5 py-2.5 text-xs text-slate-400 text-center">+{cart.length - 3} more item{cart.length - 3 !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{cartItemCount} item{cartItemCount !== 1 ? 's' : ''}</p>
                  <p className="font-bold text-slate-900">${cartTotal.toFixed(2)}</p>
                </div>
                <Link to="/app/cart" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  Go to Basket <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
