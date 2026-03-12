/**
 * Public Store Layout
 * Header + left sidebar with URL-based category navigation → /shop
 */
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import logoImg from "../../assets/logo.png";
import { fetchCategories } from "../../services/store";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const StoreLayout = () => {
  const { user } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeCategory = searchParams.get("category") || "";
  const isShopRoute = location.pathname === "/shop";
  const isProductRoute = location.pathname.startsWith("/product/");

  useEffect(() => {
    fetchCategories()
      .then(({ data }) => setCategories(data?.data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen text-slate-900" style={{ backgroundColor: "#f0f2f7" }}>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/">
            <img src={logoImg} alt="Logo" className="h-10 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            {/* Dil Seçici */}
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 cursor-pointer"
              style={{ focusRingColor: "#233d7d" }}
            >
              <option value="tr">🇹🇷 TR</option>
              <option value="en">🇬🇧 EN</option>
            </select>

            {user?.role === "customer" ? (
              <Link
                to="/app/cart"
                className="text-sm font-medium text-slate-600 hover:text-[#233d7d] transition-colors flex items-center gap-1.5"
              >
                <i className="bi bi-bag"></i>
                {t("myBasket")}
              </Link>
            ) : (
              <Link
                to="/shop"
                className={`text-sm font-medium transition-colors ${isShopRoute ? "text-[#233d7d] font-semibold" : "text-slate-600 hover:text-[#233d7d]"}`}
              >
                {t("shop")}
              </Link>
            )}
            <Link
              to={user ? "/app/account" : "/login"}
              className="inline-flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: "#233d7d" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a2f61")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#233d7d")}
            >
              <i className={`bi ${user ? "bi-person-circle" : "bi-box-arrow-in-right"}`}></i>
              {user ? t("myAccount") : t("login")}
            </Link>
          </div>
        </div>
      </header>

      {isProductRoute ? (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="md:col-span-1 bg-white rounded-xl p-4 space-y-2 sticky md:top-20 h-fit" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)" }}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {t("categories")}
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <nav className="space-y-1">
                <Link
                  to="/shop"
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm border transition-colors ${isShopRoute && !activeCategory ? "bg-blue-50 text-[#233d7d] border-blue-200 font-semibold" : "text-slate-700 border-transparent hover:bg-slate-50"}`}
                >
                  <i className="bi bi-grid-3x3-gap text-xs"></i> {t("allProducts")}
                </Link>
                {categories.map((cat) => {
                  const slug = cat.slug || String(cat.id);
                  const active = isShopRoute && activeCategory === slug;
                  return (
                    <Link
                      key={cat.id}
                      to={`/shop?category=${slug}`}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm border transition-colors ${active ? "bg-blue-50 text-[#233d7d] border-blue-200 font-semibold" : "text-slate-700 border-transparent hover:bg-slate-50"}`}
                    >
                      <i className="bi bi-tag text-xs"></i> {cat.name}
                    </Link>
                  );
                })}
              </nav>
            )}
          </aside>

          <main className="md:col-span-3">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
};

export const useStoreLayoutContext = () => ({});
export default StoreLayout;
