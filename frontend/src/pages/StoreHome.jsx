import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, fetchCategories } from "../services/store";
import ProductCard from "../components/store/ProductCard";
import SectionHeader from "../components/store/SectionHeader";
import EmptyState from "../components/store/EmptyState";
import { useLanguage } from "../context/LanguageContext";

const StoreHome = () => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          fetchProducts({ limit: 8 }),
          fetchCategories(),
        ]);
        setNewArrivals(prodRes.data?.data || []);
        setCategories(catRes.data?.data || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section
        className="rounded-2xl px-8 py-14 flex flex-col items-center text-center border border-blue-100"
        style={{
          background: "linear-gradient(135deg, #eef2fb 0%, #dde6f7 100%)",
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4 border"
          style={{
            backgroundColor: "#dde6f7",
            color: "#233d7d",
            borderColor: "#b3c5e8",
          }}
        >
          <i className="bi bi-stars"></i> {t("upcomingProducts")}
        </span>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight max-w-xl"
          style={{ color: "#233d7d" }}
        >
          {t("welcome")}
        </h1>
        <p className="mt-3 text-slate-500 text-lg max-w-md">
          {t("shop")}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            style={{ backgroundColor: "#233d7d" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#1a2f61")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#233d7d")
            }
          >
            {t("shop")} <i className="bi bi-arrow-right"></i>
          </Link>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <SectionHeader title={t("categories")} href="/shop" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.slug || cat.id}`}
                className="group flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#233d7d";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "";
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: "#eef2fb" }}
                >
                  <i className="bi bi-grid" style={{ color: "#233d7d" }}></i>
                </div>
                <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      <section>
        <SectionHeader
          title={t("newProducts")}
          subtitle={t("products")}
          href="/shop"
        />
        {error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-100 rounded-xl h-64 animate-pulse"
              ></div>
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <EmptyState
            icon="bi bi-bag"
            title={t("noProductsFound")}
            message={t("tryDifferentSearch")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StoreHome;
