import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem, clearCart } from '../services/cart';
import EmptyState from '../components/store/EmptyState';

const Cart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await getCart();
      setItems(data || []);
      setError(null);
    } catch {
      setError('Failed to load cart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, []);

  const handleQty = async (id, qty) => {
    if (qty < 1) return;
    setUpdatingId(id);
    try {
      await updateCartItem(id, qty);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
    } catch { fetchCart(); }
    finally { setUpdatingId(null); }
  };

  const handleRemove = async (id) => {
    setUpdatingId(id);
    try {
      await removeCartItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { fetchCart(); }
    finally { setUpdatingId(null); }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear your entire cart?')) return;
    await clearCart();
    setItems([]);
  };

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discount = items.reduce((s, i) => s + (i.unit_price - (i.campaign_price_snapshot || i.unit_price)) * i.quantity, 0);
  const grandTotal = subtotal - discount;

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
      {[1, 2, 3].map((n) => <div key={n} className="h-24 bg-slate-100 rounded-xl"></div>)}
    </div>
  );

  if (error) return <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-4xl mx-auto">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Basket</h1>
        {items.length > 0 && (
          <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
            <i className="bi bi-trash3"></i> Clear basket
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="bi bi-bag"
          title="Your basket is empty"
          message="Head to the shop and find something you love."
          action={<Link to="/shop" className="inline-flex items-center gap-2 bg-[#233d7d] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1a2f61] transition-colors">Go to Shop <i className="bi bi-arrow-right"></i></Link>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => {
              const price = item.campaign_price_snapshot || item.unit_price;
              const hasDiscount = item.campaign_price_snapshot && item.campaign_price_snapshot < item.unit_price;
              const isUpdating = updatingId === item.id;
              return (
                <div key={item.id} className={`flex gap-4 bg-white border border-slate-200 rounded-xl p-4 transition-opacity ${isUpdating ? 'opacity-50' : ''}`}>
                  {item.product_image_snapshot ? (
                    <img src={item.product_image_snapshot} alt={item.product_name_snapshot} className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-slate-100" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <i className="bi bi-image text-slate-300 text-2xl"></i>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{item.product_name_snapshot}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-slate-900">${price.toFixed(2)}</span>
                      {hasDiscount && <span className="text-xs text-slate-400 line-through">${item.unit_price.toFixed(2)}</span>}
                      {hasDiscount && <span className="text-xs text-[#233d7d] font-semibold bg-blue-50 px-1.5 py-0.5 rounded-full">Sale</span>}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-sm">
                        <button onClick={() => handleQty(item.id, item.quantity - 1)} disabled={isUpdating || item.quantity <= 1} className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                          <i className="bi bi-dash"></i>
                        </button>
                        <span className="px-3 py-1.5 text-slate-900 font-medium min-w-[2rem] text-center">{item.quantity}</span>
                        <button onClick={() => handleQty(item.id, item.quantity + 1)} disabled={isUpdating} className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">${(price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => handleRemove(item.id)} disabled={isUpdating} className="text-slate-400 hover:text-red-500 transition-colors">
                          <i className="bi bi-x-lg text-sm"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-6 space-y-4">
              <h2 className="font-semibold text-slate-900">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#233d7d]">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900 text-base">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/app/checkout')}
                className="w-full flex items-center justify-center gap-2 bg-[#233d7d] hover:bg-[#1a2f61] text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
              >
                Proceed to Checkout <i className="bi bi-arrow-right"></i>
              </button>
              <Link to="/shop" className="block text-center text-sm text-slate-500 hover:text-slate-700">
                <i className="bi bi-arrow-left"></i> Continue shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
