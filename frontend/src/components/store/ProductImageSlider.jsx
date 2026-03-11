import { useEffect, useMemo, useState } from 'react';

const ProductImageSlider = ({ images = [], heightClass = 'h-48', alt = 'Product image', index: indexProp = 0, onIndexChange }) => {
  const normalized = useMemo(() => {
    if (!images || !images.length) {
      return ['https://via.placeholder.com/640x400?text=Product'];
    }
    return images.map((img) => (typeof img === 'string' ? img : img.imageUrl || img.image_url)).filter(Boolean);
  }, [images]);

  const [index, setIndex] = useState(indexProp || 0);

  useEffect(() => {
    setIndex(indexProp || 0);
  }, [indexProp]);
  const total = normalized.length;

  const go = (dir) => {
    setIndex((prev) => {
      const next = dir === 'next' ? (prev + 1) % total : (prev - 1 + total) % total;
      if (onIndexChange) onIndexChange(next);
      return next;
    });
  };

  if (!normalized.length) return null;

  return (
    <div className={`relative w-full overflow-hidden rounded-lg bg-white flex items-center justify-center ${heightClass}`}>
      <img
        src={normalized[index]}
        alt={alt}
        className="w-full h-full object-contain transition-all duration-300 p-2"
        onError={e => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Görsel+Yok'; }}
      />

      {total > 1 && (
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <button
            type="button"
            className="btn btn-secondary text-xs px-2 py-1 bg-white/80 hover:bg-white/90"
            onClick={e => { e.preventDefault(); e.stopPropagation(); go('prev'); }}
          >
            ◀
          </button>
          <button
            type="button"
            className="btn btn-secondary text-xs px-2 py-1 bg-white/80 hover:bg-white/90"
            onClick={e => { e.preventDefault(); e.stopPropagation(); go('next'); }}
          >
            ▶
          </button>
        </div>
      )}

      {total > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
          {normalized.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === index ? 'bg-blue-500' : 'bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageSlider;
