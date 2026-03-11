import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchProductDetail } from "../services/products";
import { addToCart } from "../services/cart";
import { useLanguage } from "../context/LanguageContext";

const groupSpecifications = (specs = []) =>
  specs.reduce((acc, spec) => {
    const group = spec.specGroup || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(spec);
    return acc;
  }, {});

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [cartStatus, setCartStatus] = useState(null);
  const [cartError, setCartError] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await fetchProductDetail(slug);
        setProduct(data?.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const images = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length) return product.images;
    if (product.mainImage) return [{ imageUrl: product.mainImage }];
    return [];
  }, [product]);

  const getImgSrc = (img) => (typeof img === "string" ? img : img?.imageUrl || img?.image_url || "");

  const handleAddToCart = async () => {
    setCartStatus("adding");
    setCartError(null);
    try {
      await addToCart(product.id, qty);
      setCartStatus("added");
      setTimeout(() => setCartStatus(null), 2500);
    } catch (err) {
      setCartError(err.response?.data?.error?.message || "Could not add to cart.");
      setCartStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="py-6 animate-pulse space-y-4">
        <div className="h-3 bg-white rounded w-56 shadow-sm" />
        <div className="bg-white rounded-2xl h-[500px] shadow-md" />
      </div>
    );
  }

  if (error)
    return <div className="min-h-[40vh] flex items-center justify-center text-red-500">{error}</div>;
  if (!product)
    return <div className="min-h-[40vh] flex items-center justify-center text-slate-500">{t("productNotFound")}</div>;

  const specsByGroup = groupSpecifications(product.specifications || []);
  const inStock = (product.stockQty ?? 0) > 0;
  const hasCampaign = product.campaignPrice !== null && product.campaignPrice !== undefined && product.campaignPrice !== "";
  const displayPrice = hasCampaign ? product.campaignPrice : product.basePrice;
  const discount = hasCampaign && product.basePrice > 0
    ? Math.round((1 - product.campaignPrice / product.basePrice) * 100)
    : null;

  return (
    <div className="py-4 space-y-5">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
        <Link to="/" className="hover:text-[#233d7d] transition-colors">{t("home")}</Link>
        <span>›</span>
        <Link to="/app/catalog" className="hover:text-[#233d7d] transition-colors">{t("catalog")}</Link>
        {product.categoryName && (<><span>›</span><span>{product.categoryName}</span></>)}
        <span>›</span>
        <span className="text-slate-700 font-semibold truncate max-w-[180px]">{product.name}</span>
      </nav>

      {/* ── Product layout ── */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.05)" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* Left: thumbnails + main image */}
          <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100">
            {/* Main image */}
            <div className="bg-slate-50 flex items-center justify-center p-8" style={{ minHeight: "480px" }}>
              {images.length > 0 ? (
                <img
                  src={getImgSrc(images[activeImage])}
                  alt={product.name}
                  className="w-full max-h-[440px] object-contain transition-all duration-300"
                  onError={e => { e.currentTarget.src = "https://via.placeholder.com/400x400?text=Görsel+Yok"; }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <i className="bi bi-image text-6xl" />
                  <span className="text-sm">Görsel yok</span>
                </div>
              )}
            </div>

            {/* Thumbnails — horizontal bottom row */}
            {images.length > 1 && (
              <div className="flex gap-2 p-4 border-t border-slate-100 overflow-x-auto">
                {images.map((img, idx) => (
                  <button key={idx} type="button" onClick={() => setActiveImage(idx)}
                    className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                    style={{
                      borderColor: idx === activeImage ? "#233d7d" : "rgba(0,0,0,0.08)",
                      boxShadow: idx === activeImage ? "0 0 0 3px rgba(35,61,125,0.15)" : "none",
                    }}>
                    <img src={getImgSrc(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="flex flex-col p-6 gap-4 min-w-0">

            {/* Category + Stock row */}
            <div className="flex items-center gap-2 flex-wrap">
              {product.categoryName && (
                <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md"
                  style={{ backgroundColor: "#eef2fb", color: "#233d7d" }}>
                  {product.categoryName}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-0.5 rounded-md text-[11px] ${inStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-500"}`} />
                {inStock ? `${t("inStock")} (${product.stockQty})` : t("outOfStock")}
              </span>
              {product.sku && (
                <span className="text-[11px] text-slate-400 ml-auto">
                  SKU: <span className="font-mono text-slate-500">{product.sku}</span>
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 leading-snug">
                {product.name}
              </h1>
              {product.shortDescription && (
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{product.shortDescription}</p>
              )}
            </div>

            {/* Price */}
            <div className="pt-1 pb-1 border-t border-b border-slate-100 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold leading-none" style={{ color: "#233d7d" }}>{displayPrice}</span>
                <span className="text-2xl font-semibold text-slate-400">{product.currency || "USD"}</span>
              </div>
              {hasCampaign && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 line-through">
                    {product.basePrice} {product.currency || "USD"}
                  </span>
                  {discount > 0 && (
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: "#e53e3e" }}>
                      -{discount}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Qty + Add to cart */}
            {inStock ? (
              <div className="space-y-2.5">
                {/* Qty + toplam */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">{t("quantity")}:</span>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors font-bold">−</button>
                    <span className="w-9 text-center text-sm font-bold text-slate-900">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(product.stockQty, q + 1))}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors font-bold">+</button>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-base font-extrabold leading-none" style={{ color: "#233d7d" }}>
                      {(displayPrice * qty).toFixed(2)} <span className="text-sm font-semibold">{product.currency || "USD"}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t("totalAmount")}</p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5">
                  <button onClick={handleAddToCart} disabled={cartStatus === "adding"}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                    style={{
                      backgroundColor: cartStatus === "added" ? "#eef2fb" : "#233d7d",
                      color: cartStatus === "added" ? "#233d7d" : "#fff",
                      boxShadow: cartStatus === "added" ? "none" : "0 4px 14px rgba(35,61,125,0.28)",
                    }}
                    onMouseEnter={e => { if (cartStatus !== "added") e.currentTarget.style.backgroundColor = "#1a2f61"; }}
                    onMouseLeave={e => { if (cartStatus !== "added") e.currentTarget.style.backgroundColor = "#233d7d"; }}>
                    <i className={`bi ${cartStatus === "adding" ? "bi-hourglass-split" : cartStatus === "added" ? "bi-check2-circle" : "bi-cart-plus"}`} />
                    {cartStatus === "adding" ? t("adding") : cartStatus === "added" ? t("addedToCart") : t("addToCart")} ({qty})
                  </button>
                  <button onClick={() => navigate("/app/cart")}
                    className="w-12 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-[#233d7d] hover:text-[#233d7d] transition-all">
                    <i className="bi bi-bag text-base" />
                  </button>
                </div>

                {cartStatus === "error" && cartError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{cartError}</p>
                )}
              </div>
            ) : (
              <div className="py-3 bg-slate-50 rounded-xl text-center text-slate-400 text-sm border border-slate-200 border-dashed">
                {t("outOfStock")}
              </div>
            )}

            {/* Info strip */}
            <div className="flex flex-col gap-0 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-3 py-2.5">
                <i className="bi bi-shop-window text-base flex-shrink-0" style={{ color: "#233d7d" }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700">{t("seller")}</p>
                  <p className="text-[11px] text-slate-400 truncate">{product.storeName || `Seller #${product.sellerId}`}</p>
                </div>
                <i className="bi bi-shield-check text-base flex-shrink-0 ml-auto" style={{ color: "#233d7d" }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700">{t("securePayment")}</p>
                  <p className="text-[11px] text-slate-400">{t("secureCheckout")}</p>
                </div>
              </div>
              {/* Teslimat uyarısı */}
              <div className="flex gap-2.5 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 mt-1">
                <i className="bi bi-info-circle-fill text-amber-500 flex-shrink-0 mt-0.5 text-sm" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {t("deliveryNotice")}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Description & Specs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">

          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)" }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eef2fb" }}>
                <i className="bi bi-file-text-fill text-xs" style={{ color: "#233d7d" }} />
              </span>
              <h3 className="font-bold text-slate-800">{t("description")}</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {product.description || <span className="text-slate-400 italic">{t("noDescription")}</span>}
              </p>
            </div>
          </div>

          {Object.keys(specsByGroup).length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)" }}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eef2fb" }}>
                  <i className="bi bi-list-check text-xs" style={{ color: "#233d7d" }} />
                </span>
                <h3 className="font-bold text-slate-800">{t("technicalSpecifications")}</h3>
              </div>
              {Object.entries(specsByGroup).map(([group, specs]) => (
                <div key={group}>
                  <div className="px-6 py-2 bg-slate-50 border-y border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{group}</span>
                  </div>
                  {specs.map((spec, i) => (
                    <div key={spec.id || spec.specKey}
                      className={`grid grid-cols-2 px-6 py-3 text-sm ${i % 2 === 0 ? "" : "bg-slate-50/60"}`}>
                      <dt className="text-slate-500">{spec.specKey}</dt>
                      <dd className="font-semibold text-slate-800">{spec.specValue}</dd>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {[
            { icon: "bi-truck", title: t("delivery"), items: [{ icon: "bi-lightning-fill", text: t("fastShipping") }, { icon: "bi-arrow-return-left", text: t("easyReturns") }] },
            { icon: "bi-shield-check", title: t("securePayment"), items: [{ icon: "bi-lock-fill", text: t("secureCheckout") }, { icon: "bi-credit-card-fill", text: t("multiplePaymentOptions") }] },
          ].map(({ icon, title, items }) => (
            <div key={title} className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eef2fb" }}>
                  <i className={`bi ${icon} text-xs`} style={{ color: "#233d7d" }} />
                </span>
                <h3 className="font-bold text-slate-800">{title}</h3>
              </div>
              <ul className="px-5 py-4 space-y-3">
                {items.map(({ icon: iIcon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50">
                      <i className={`bi ${iIcon} text-xs`} style={{ color: "#233d7d" }} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
