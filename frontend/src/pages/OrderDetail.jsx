import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCustomerOrderDetail } from '../services/order';
import OrderStatusBadge from '../components/store/OrderStatusBadge';

const TIMELINE = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCustomerOrderDetail(id);
        setOrder(data);
        setError(null);
      } catch {
        setError('Failed to load order detail.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-slate-100 rounded w-48"></div>
      <div className="h-20 bg-slate-100 rounded-xl"></div>
      <div className="h-48 bg-slate-100 rounded-xl"></div>
    </div>
  );

  if (error) return <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-3xl mx-auto">{error}</div>;
  if (!order) return <div className="text-slate-500 text-center py-16">Order not found.</div>;

  const items = order.items || order.order_items || [];
  const isCancelled = order.order_status === 'cancelled';
  const currentStep = TIMELINE.indexOf(order.order_status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/app/orders" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1">
            <i className="bi bi-arrow-left"></i> Back to Orders
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Order #{order.order_number}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Placed on {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <OrderStatusBadge status={order.order_status} />
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center">
            {TIMELINE.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep;
              return (
                <div key={step} className="flex-1 flex flex-col items-center">
                  <div className="relative w-full flex items-center">
                    {idx > 0 && <div className={`flex-1 h-0.5 ${idx <= currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`}></div>}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                      done ? 'bg-blue-500 border-[#233d7d] text-white' : 'bg-white border-slate-300 text-slate-400'
                    } ${active ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}>
                      {done ? <i className="bi bi-check text-sm font-bold"></i> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    {idx < TIMELINE.length - 1 && <div className={`flex-1 h-0.5 ${idx < currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`}></div>}
                  </div>
                  <p className={`text-xs mt-2 capitalize font-medium ${done ? 'text-[#233d7d]' : 'text-slate-400'}`}>{step}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Items ({items.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const price = item.campaign_price_applied || item.unit_price;
            const hasDiscount = item.campaign_price_applied && item.campaign_price_applied < item.unit_price;
            return (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                {item.product_image_snapshot ? (
                  <img src={item.product_image_snapshot} alt={item.product_name_snapshot} className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-slate-100" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-image text-slate-300 text-xl"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{item.product_name_snapshot}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-slate-700">${price?.toFixed(2)}</span>
                    {hasDiscount && <span className="text-xs text-slate-400 line-through">${item.unit_price?.toFixed(2)}</span>}
                    <span className="text-xs text-slate-500">× {item.quantity}</span>
                  </div>
                </div>
                <span className="font-bold text-slate-900 text-sm">${item.line_total?.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals + Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shipping Address */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <i className="bi bi-geo-alt text-[#233d7d]"></i> Shipping Address
          </h2>
          {order.shipping_address ? (
            <div className="text-sm text-slate-600 space-y-0.5">
              <p className="font-medium text-slate-800">{order.shipping_address.full_name}</p>
              <p>{order.shipping_address.address_line}</p>
              <p>{order.shipping_address.district}, {order.shipping_address.city}</p>
              {order.shipping_address.phone && <p className="text-slate-500">{order.shipping_address.phone}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Address ID: {order.shipping_address_id}</p>
          )}
        </div>

        {/* Payment + Totals */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <i className="bi bi-receipt text-[#233d7d]"></i> Payment
          </h2>
          <p className="text-sm text-slate-600 capitalize">{order.payment_method?.replace(/_/g, ' ')}</p>
          <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
            {Number(order.discount_total) > 0 && (
              <div className="flex justify-between text-[#233d7d]"><span>Discount</span><span>-${Number(order.discount_total).toFixed(2)}</span></div>
            )}
            {Number(order.shipping_total) > 0 && (
              <div className="flex justify-between text-slate-600"><span>Shipping</span><span>${Number(order.shipping_total).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2">
              <span>Total</span><span>${Number(order.grand_total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {order.customer_note && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">Note:</span> {order.customer_note}
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
