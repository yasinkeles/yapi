import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSellerOrderDetail, updateSellerOrderStatus } from '../services/order';

const statusOptions = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const SellerOrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const data = await getSellerOrderDetail(id);
        setOrder(data);
        setStatus(data.order_status);
      } catch (err) {
        setError('Failed to load order detail');
      }
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setUpdating(true);
    setError(null);
    try {
      await updateSellerOrderStatus(id, newStatus);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (err) {
      setError('Failed to update status');
    }
    setUpdating(false);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!order) return <div>Order not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Order #{order.order_number}</h1>
        <Link to="/seller/orders" className="text-primary-600 hover:underline">Back to Seller Orders</Link>
      </div>
      <div className="flex flex-wrap gap-6 bg-gray-50 rounded p-4">
        <div>
          <div className="text-gray-500 text-xs">Status</div>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[order.order_status] || 'bg-gray-100 text-gray-800'}`}>{order.order_status}</span>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Date</div>
          {new Date(order.created_at).toLocaleString()}
        </div>
        <div>
          <div className="text-gray-500 text-xs">Customer</div>
          {order.customer_id}
        </div>
        <div>
          <div className="text-gray-500 text-xs">Payment</div>
          {order.payment_method}
        </div>
      </div>
      <div className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Shipping Address</h2>
        <div className="text-sm text-gray-700">
          Address ID: {order.shipping_address_id}
        </div>
      </div>
      <div className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Product</th>
              <th className="p-2">Price</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || order.order_items || []).map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-2 flex items-center gap-2">
                  {item.product_image_snapshot && (
                    <img src={item.product_image_snapshot} alt={item.product_name_snapshot} className="w-10 h-10 object-cover rounded" />
                  )}
                  <span>{item.product_name_snapshot}</span>
                </td>
                <td className="p-2">${(item.campaign_price_applied || item.unit_price).toFixed(2)}</td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">${item.line_total?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-end space-y-1">
        <div>Subtotal: <span className="font-medium">${order.subtotal?.toFixed(2)}</span></div>
        <div>Discount: <span className="font-medium text-green-700">-${order.discount_total?.toFixed(2)}</span></div>
        <div>Shipping: <span className="font-medium">${order.shipping_total?.toFixed(2)}</span></div>
        <div className="font-bold text-lg">Grand Total: ${order.grand_total?.toFixed(2)}</div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <label className="font-medium">Update Status:</label>
        <select
          className="border rounded px-3 py-2"
          value={status}
          onChange={handleStatusChange}
          disabled={updating}
        >
          {statusOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {success && <span className="text-green-600 text-sm">Updated!</span>}
      </div>
      {order.customer_note && (
        <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
          <span className="font-medium">Note:</span> {order.customer_note}
        </div>
      )}
    </div>
  );
};

export default SellerOrderDetail;
