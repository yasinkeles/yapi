import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, clearCart } from '../services/cart';
import { getAddresses } from '../services/address';
import { placeOrder } from '../services/order';

const PAYMENT_METHODS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: 'bi bi-cash-coin' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'bi bi-bank' },
  { value: 'manual_placeholder', label: 'Manual Payment', icon: 'bi bi-credit-card' },
];

const Checkout = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [customerNote, setCustomerNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cart, addr] = await Promise.all([getCart(), getAddresses()]);
        setCartItems(cart || []);
        setAddresses(addr || []);
        const def = (addr || []).find((a) => a.is_default);
        setSelectedAddress(def ? def.id : (addr?.[0]?.id || null));
      } catch {
        setError('Failed to load checkout data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const subtotal = cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discount = cartItems.reduce((s, i) => s + (i.unit_price - (i.campaign_price_snapshot || i.unit_price)) * i.quantity, 0);
  const grandTotal = subtotal - discount;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { setError('Please select a delivery address.'); return; }
    if (!cartItems.length) { setError('Your cart is empty.'); return; }
    setPlacing(true);
    setError(null);
    try {
      await placeOrder({ shippingAddressId: selectedAddress, paymentMethod, customerNote });
      await clearCart();
      setSuccess(true);
      setTimeout(() => navigate('/app/orders'), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Order placement failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-4">
      <div className="h-8 bg-slate-100 rounded w-32"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-32 bg-slate-100 rounded-xl"></div>
          <div className="h-24 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="h-48 bg-slate-100 rounded-xl"></div>
      </div>
    </div>
  );

  if (success) return (
    <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
        <i className="bi bi-check2-circle text-4xl text-[#233d7d]"></i>
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Order Placed!</h2>
      <p className="text-slate-500">Thank you for your order. Redirecting to your orders...</p>
    </div>
  );

  const selectedAddr = addresses.find((a) => a.id === selectedAddress);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>

      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Address */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <i className="bi bi-geo-alt text-[#233d7d]"></i> Delivery Address
            </h2>
            {addresses.length === 0 ? (
              <div className="text-sm text-slate-500">
                No addresses on file. <Link to="/app/addresses" className="text-[#233d7d] hover:underline font-medium">Add an address</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedAddress === addr.id ? 'border-[#233d7d] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <input type="radio" name="address" value={addr.id} checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} className="mt-0.5 accent-[#233d7d]" />
                    <div className="text-sm">
                      <p className="font-semibold text-slate-900">{addr.title || addr.full_name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{addr.full_name}</p>
                      <p className="text-slate-500 text-xs">{addr.address_line}, {addr.district}, {addr.city}</p>
                      {addr.is_default && <span className="text-xs text-[#233d7d] font-semibold">Default</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <i className="bi bi-credit-card text-[#233d7d]"></i> Payment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <label
                  key={pm.value}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${paymentMethod === pm.value ? 'border-[#233d7d] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <input type="radio" name="payment" value={pm.value} checked={paymentMethod === pm.value} onChange={() => setPaymentMethod(pm.value)} className="accent-[#233d7d]" />
                  <div className="flex items-center gap-2 text-sm">
                    <i className={`${pm.icon} text-slate-500`}></i>
                    <span className="text-slate-700 font-medium">{pm.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Note */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <i className="bi bi-chat-left-text text-[#233d7d]"></i> Order Note <span className="text-xs font-normal text-slate-400">(optional)</span>
            </h2>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#233d7d] resize-none"
              rows={3}
              placeholder="Any special instructions..."
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
            />
          </section>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Order Summary</h2>
            <div className="divide-y divide-slate-100 text-sm max-h-64 overflow-y-auto">
              {cartItems.map((item) => {
                const price = item.campaign_price_snapshot || item.unit_price;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2.5">
                    {item.product_image_snapshot && (
                      <img src={item.product_image_snapshot} alt={item.product_name_snapshot} className="w-10 h-10 object-cover rounded-lg flex-shrink-0 bg-slate-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-medium truncate text-xs">{item.product_name_snapshot}</p>
                      <p className="text-slate-500 text-xs">×{item.quantity}</p>
                    </div>
                    <span className="text-slate-900 font-semibold text-xs">${(price * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#233d7d]">
                  <span>Discount</span><span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2">
                <span>Total</span><span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={placing || !selectedAddress}
              className="w-full flex items-center justify-center gap-2 bg-[#233d7d] hover:bg-[#1a2f61] text-white font-semibold py-3 rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {placing ? <><i className="bi bi-hourglass-split"></i> Placing Order...</> : <><i className="bi bi-bag-check"></i> Place Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
