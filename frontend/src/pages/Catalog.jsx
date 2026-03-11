import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/store/ProductCard';
import EmptyState from '../components/store/EmptyState';
import { fetchCatalogProducts } from '../services/products';
import { fetchCategories } from '../services/store';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name A–Z', value: 'name_asc' },
];

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [draftSearch, setDraftSearch] = useState(search);

  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 12;

  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchCatalogProducts({ category, sort, page, limit, search });
      setProducts(data?.data || []);
      setTotal(data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [category, sort, page, search]);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const { data } = await fetchCategories();
        setCategories(data?.data || []);
      } catch (_) {}
    };
    loadCats();
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(draftSearch);
    setParam('search', draftSearch);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-6 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Categories</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setParam('category', '')}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!category ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  All Products
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => setParam('category', cat.slug || String(cat.id))}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${category === (cat.slug || String(cat.id)) ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">{total} results</span>
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-700"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Mobile category chips */}
        {categories.length > 0 && (
          <div className="flex lg:hidden gap-2 flex-wrap">
            <button
              onClick={() => setParam('category', '')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!category ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400'}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setParam('category', cat.slug || String(cat.id))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${category === (cat.slug || String(cat.id)) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-xl h-64 animate-pulse"></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon="bi bi-search"
            title="No products found"
            message="Try adjusting your filters or search query."
            action={
              <button onClick={() => { setParam('category', ''); setParam('search', ''); setDraftSearch(''); setSearch(''); }} className="text-sm text-emerald-600 hover:underline">
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - page) <= 2).map((p) => (
              <button
                key={p}
                onClick={() => setParam('page', String(p))}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${p === page ? 'bg-emerald-600 text-white font-semibold' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setParam('page', String(page + 1))}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
