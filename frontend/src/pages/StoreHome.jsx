import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, fetchCategories } from "../services/store";
import ProductCard from "../components/store/ProductCard";
import { useLanguage } from "../context/LanguageContext";

const BRAND = "#233d7d";
const BRAND_LIGHT = "#eef2fb";

const StoreHome = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetchProducts({ limit: 8, sort: "newest" }),
          fetchCategories(),
        ]);
        setProducts(prodRes.data?.data?.data || prodRes.data?.data || []);
        setCategories(catRes.data?.data || []);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="space-y-10">

      {/* ── Hero ── */}
      <section className="relative rounded-3xl overflow-hidden border border-blue-100"
        style={{ background: "linear-gradient(135deg, #eef2fb 0%, #dde8f8 50%, #ccd9f2 100%)" }}>
        <div className="px-8 py-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-4 border"
              style={{ backgroundColor: "#dde8f8", color: BRAND, borderColor: "#b3c9e8" }}>
              <i className="bi bi-stars"></i> {t("upcomingProducts")}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: BRAND }}>
              {t("welcome")}
            </h1>
            <p className="mt-3 text-slate-500 text-sm max-w-md leading-relaxed">
              ELK Biotechnology, ThermoFisher ve daha fazlası — 12.000'den fazla biyomedikal ürün.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                style={{ backgroundColor: BRAND }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#1a2f61"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = BRAND}
              >
                {t("shop")} <i className="bi bi-arrow-right"></i>
              </Link>
              <Link
                to="/shop?category=elk-biotechnology-elisa"
                className="inline-flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-sm border-2 transition-colors"
                style={{ color: BRAND, borderColor: BRAND, backgroundColor: "transparent" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = BRAND; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = BRAND; }}
              >
                <i className="bi bi-eyedropper"></i> ELISA Kitleri
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-3">
            {[
              { icon: "bi-box-seam", value: "12,000+", label: "Ürün" },
              { icon: "bi-building", value: "10+", label: "Marka" },
              { icon: "bi-truck", value: "6–8 hf", label: "Teslimat" },
              { icon: "bi-shield-check", value: "SSL", label: "Güvenli Ödeme" },
            ].map(({ icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-5 py-3.5 rounded-2xl bg-white/70 border border-white min-w-[100px]"
                style={{ boxShadow: "0 1px 4px rgba(35,61,125,0.08)" }}>
                <i className={`bi ${icon} text-xl`} style={{ color: BRAND }} />
                <span className="text-lg font-extrabold leading-none" style={{ color: BRAND }}>{value}</span>
                <span className="text-[11px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{t("categories")}</h2>
            <Link to="/shop" className="text-sm font-semibold flex items-center gap-1" style={{ color: BRAND }}>
              {t("allProducts")} <i className="bi bi-arrow-right text-xs"></i>
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-7 gap-2.5">
            {categories.slice(0, 14).map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.slug || cat.id}`}
                className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl text-center transition-all hover:shadow-md group"
                onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.transform = ""; }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND_LIGHT }}>
                  <i className="bi bi-eyedropper text-sm" style={{ color: BRAND }}></i>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 leading-tight line-clamp-2">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── New Arrivals ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t("newProducts")}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{t("products")}</p>
          </div>
          <Link to="/shop" className="text-sm font-semibold flex items-center gap-1" style={{ color: BRAND }}>
            {t("allProducts")} <i className="bi bi-arrow-right text-xs"></i>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* ── Info strip ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "bi-truck", title: "6–8 Hafta Teslimat", desc: "Gümrük işlemleri nedeniyle teslimat 6–8 hafta sürebilir." },
          { icon: "bi-shield-lock", title: t("securePayment"), desc: t("secureCheckout") },
          { icon: "bi-headset", title: "Destek", desc: "Ürün ve sipariş sorularınız için 7/24 destek." },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: BRAND_LIGHT }}>
              <i className={`bi ${icon} text-base`} style={{ color: BRAND }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </section>

    </div>
  );
};

export default StoreHome;
