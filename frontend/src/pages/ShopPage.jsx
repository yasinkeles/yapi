/**
 * Public Shop / Catalog page
 * Sits inside StoreLayout — uses StoreLayout's category sidebar for navigation.
 * Reads ?category, ?search, ?sort, ?page from URL.
 */
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/store/ProductCard";
import EmptyState from "../components/store/EmptyState";
import { fetchCatalogProducts } from "../services/products";
import { useLanguage } from "../context/LanguageContext";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Name A–Z", value: "name_asc" },
];

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draftSearch, setDraftSearch] = useState(
    searchParams.get("search") || "",
  );
  const { t } = useLanguage();

  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";
  const limit = 12;

  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchCatalogProducts({
        category,
        sort,
        page,
        limit,
        search,
      });
      setProducts(data?.data?.data || []);
      setTotal(data?.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [category, sort, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("search", draftSearch);
          }}
          className="flex gap-2 w-full sm:w-auto"
        >
          <div className="relative flex-1 sm:w-64">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder={t("searchProducts")}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#233d7d] text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#233d7d] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f61] transition-colors"
          >
            {t("search")}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {total} {total !== 1 ? t("results") : t("result")}
          </span>
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#233d7d] text-slate-700"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active category chip */}
      {category && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{t("categories")}:</span>
          <span className="inline-flex items-center gap-1 bg-blue-100 text-[#233d7d] text-xs font-semibold px-2.5 py-1 rounded-full">
            {category}
            <button
              onClick={() => setParam("category", "")}
              className="hover:text-red-500 ml-0.5"
            >
              <i className="bi bi-x"></i>
            </button>
          </span>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-slate-100 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="bi bi-search"
          title={t("noProductsFound")}
          message={t("tryDifferentSearch")}
          action={
            <button
              onClick={() => {
                setParam("category", "");
                setParam("search", "");
                setDraftSearch("");
              }}
              className="text-sm text-[#233d7d] hover:underline"
            >
              {t("clearFilters")}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2)
            .map((p) => (
              <button
                key={p}
                onClick={() => setParam("page", String(p))}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${p === page ? "bg-[#233d7d] text-white font-semibold" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
              >
                {p}
              </button>
            ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setParam("page", String(page + 1))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
