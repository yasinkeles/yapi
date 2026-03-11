import React, { useEffect, useState } from 'react';
import { getSellerOrders } from '../services/order';
import { Link } from 'react-router-dom';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await getSellerOrders();
        setOrders(data);
      } catch (err) {
        setError('Failed to load seller orders');
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Seller Orders</h1>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : orders.length === 0 ? (
        <div>No orders found.</div>
      ) : (
        <table className="w-full border rounded text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Order #</th>
              <th className="p-2">Date</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Items</th>
              <th className="p-2">Total</th>
              <th className="p-2">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-t">
                <td className="p-2 font-mono">{order.order_number}</td>
                <td className="p-2">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="p-2">{order.customer_id}</td>
                <td className="p-2">{order.item_count || '-'}</td>
                <td className="p-2 font-medium">${order.grand_total?.toFixed(2)}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[order.order_status] || 'bg-gray-100 text-gray-800'}`}>
                    {order.order_status}
                  </span>
                </td>
                <td className="p-2">
                  <Link to={`/seller/orders/${order.id}`} className="text-primary-600 hover:underline">Detail</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SellerOrders;
