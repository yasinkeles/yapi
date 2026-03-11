import { useEffect, useState } from 'react';
import { fetchProducts } from '../../../services/store';
// Basit slider için temel bir örnek (daha gelişmişi için bir kütüphane eklenebilir)
const ProductSlider = ({ title = 'Featured Products', productsCount = 5, showPrice = true, showButton = true }) => {
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchProducts({ limit: productsCount }).then(res => {
      setProducts(res.data?.data || []);
    });
  }, [productsCount]);

  if (!products.length) return <div className="p-6 text-slate-400">No products found.</div>;

  const product = products[index] || {};

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <div className="flex flex-col items-center">
        {product.image && <img src={product.image} alt={product.title} className="w-64 h-40 object-cover rounded mb-3" />}
        <div className="text-lg font-semibold mb-1">{product.title}</div>
        <div className="text-slate-600 mb-2">{product.description}</div>
        {showPrice && product.price && <div className="text-teal-600 font-bold text-xl mb-2">{product.price}</div>}
        {showButton && <a href={product.slug ? `/product/${product.slug}` : '#'} className="btn btn-primary">View Product</a>}
        <div className="flex gap-2 mt-4">
          <button onClick={() => setIndex((i) => (i - 1 + products.length) % products.length)} className="btn btn-secondary">Previous</button>
          <button onClick={() => setIndex((i) => (i + 1) % products.length)} className="btn btn-secondary">Next</button>
        </div>
      </div>
    </div>
  );
};
const Header = ({ text, subtitle, cta, href }) => (
  <div className="p-8 bg-white border border-slate-200 rounded-lg shadow-sm">
    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Featured</p>
    <h2 className="text-3xl font-bold text-slate-900 mb-2">{text}</h2>
    {subtitle && <p className="text-slate-600 mb-4">{subtitle}</p>}
    {cta && (
      <a className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded shadow-sm" href={href || '#'}>
        {cta}
      </a>
    )}
  </div>
);

const TextBlock = ({ text, size = 1 }) => (
  <p className="text-slate-800 leading-relaxed" style={{ fontSize: `${size}rem` }}>
    {text}
  </p>
);

const ImageBlock = ({ src, alt }) => (
  <img src={src} alt={alt} className="rounded-lg w-full object-cover" />
);

const Card = ({ title, text, price, badge, image, buttonLabel, href }) => (
  <div className="border border-slate-200 rounded-lg bg-white text-slate-900 shadow-md overflow-hidden">
    {image && <img src={image} alt={title} className="w-full h-48 object-cover" />}
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h4 className="text-lg font-semibold">{title}</h4>
          <p className="text-sm text-slate-600">{text}</p>
        </div>
        {badge && <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold whitespace-nowrap">{badge}</span>}
      </div>
      {price && <div className="text-xl font-bold text-slate-900">{price}</div>}
      {buttonLabel && (
        <a href={href || '#'} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-900 rounded-md shadow-sm">
          {buttonLabel}
        </a>
      )}
    </div>
  </div>
);

const Grid = ({ columns = 2, gap = 12, children }) => (
  <div
    className="grid"
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${gap}px` }}
  >
    {children}
  </div>
);

const Section = ({ background = '#ffffff', padding = 24, rounded = true, shadow = true, children }) => (
  <div
    style={{ background, padding }}
    className={`${rounded ? 'rounded-xl' : ''} ${shadow ? 'shadow-lg' : ''} border border-slate-200`}
  >
    {children}
  </div>
);

const Button = ({ label, href }) => (
  <a href={href || '#'} className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-200 rounded text-slate-900 shadow-sm">
    {label}
  </a>
);

const BlockRenderer = ({ block }) => {
  if (!block) return null;
  const { type, props = {}, children = [] } = block;

  if (type === 'header') return <Header {...props} />;
  if (type === 'text') return <TextBlock {...props} />;
  if (type === 'image') return <ImageBlock {...props} />;
  if (type === 'card') return <Card {...props} />;
  if (type === 'grid') return <Grid {...props}>{children.map((child) => <BlockRenderer key={child.id} block={child} />)}</Grid>;
  if (type === 'section') return <Section {...props}>{children.map((child) => <BlockRenderer key={child.id} block={child} />)}</Section>;
  if (type === 'button') return <Button {...props} />;
  if (type === 'productSlider') return <ProductSlider {...props} />;

  return <div className="text-slate-400 text-sm">Unknown block: {type}</div>;
};

export default BlockRenderer;
