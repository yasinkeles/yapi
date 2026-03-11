import { Link } from "react-router-dom";
import ProductImageSlider from "./ProductImageSlider";
import { useLanguage } from "../../context/LanguageContext";

const ProductCard = ({ product }) => {
  const { t } = useLanguage();

  if (!product) return null;

  const images =
    product.images && product.images.length
      ? product.images
      : product.mainImage
        ? [{ imageUrl: product.mainImage }]
        : [];

  const hasCampaign =
    product.campaignPrice !== null &&
    product.campaignPrice !== undefined &&
    product.campaignPrice !== "";

  const discount =
    hasCampaign && product.basePrice > 0
      ? Math.round((1 - product.campaignPrice / product.basePrice) * 100)
      : null;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-250"
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(35,61,125,0.18), 0 0 0 1px rgba(35,61,125,0.12)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Image area */}
      <div className="relative p-3 pb-0">
        <ProductImageSlider images={images} heightClass="h-44" alt={product.name} />

        {/* Discount badge */}
        {hasCampaign && discount > 0 && (
          <span
            className="absolute top-5 left-5 z-10 text-[11px] font-bold px-2 py-0.5 rounded-full text-white tracking-wide"
            style={{ backgroundColor: "#e53e3e" }}
          >
            -{discount}%
          </span>
        )}
      </div>

      {/* Thin separator */}
      <div className="mx-4 mt-3 border-t border-slate-100" />

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 py-3 gap-1">
        {/* Campaign badge */}
        {hasCampaign && (
          <span
            className="self-start text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md mb-0.5"
            style={{ backgroundColor: "#eef2fb", color: "#233d7d" }}
          >
            {t("campaignPrice")}
          </span>
        )}

        <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
          {product.name}
        </p>

        {product.shortDescription && (
          <p className="text-[11px] text-slate-400 line-clamp-1">
            {product.shortDescription}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          {hasCampaign ? (
            <>
              <span className="text-base font-bold" style={{ color: "#233d7d" }}>
                {product.campaignPrice} {product.currency || "USD"}
              </span>
              <span className="text-xs text-slate-400 line-through">
                {product.basePrice} {product.currency || "USD"}
              </span>
            </>
          ) : (
            <span className="text-base font-bold text-slate-800">
              {product.basePrice} {product.currency || "USD"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
