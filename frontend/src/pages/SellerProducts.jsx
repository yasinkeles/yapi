import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteProduct, getSellerProducts } from '../services/products';

const SellerProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await getSellerProducts();
      setProducts(data?.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this product?');
    if (!ok) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-slate-600">Manage your product catalog.</p>
        </div>
        <Link to="/seller/products/new" className="btn btn-primary">New Product</Link>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Image</th>
                <th className="text-left px-3 py-2 border-b">Name</th>
                <th className="text-left px-3 py-2 border-b">SKU</th>
                <th className="text-left px-3 py-2 border-b">Price</th>
                <th className="text-left px-3 py-2 border-b">Campaign</th>
                <th className="text-left px-3 py-2 border-b">Stock</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-right px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-slate-100">
                      <img src={p.mainImage || 'https://via.placeholder.com/80'} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-3 py-2 text-slate-600">{p.sku || '-'}</td>
                  <td className="px-3 py-2 text-slate-900">{p.basePrice} {p.currency}</td>
                  <td className="px-3 py-2 text-emerald-700">{p.campaignPrice || '-'}</td>
                  <td className="px-3 py-2 text-slate-700">{p.stockQty ?? 0}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${p.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {p.isActive ? 'Active' : 'Passive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      className="btn btn-secondary text-sm px-3 py-1"
                      onClick={() => navigate(`/seller/products/${p.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-secondary text-sm px-3 py-1"
                      onClick={() => handleDelete(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SellerProducts;
