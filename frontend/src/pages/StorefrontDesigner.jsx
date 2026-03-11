import { useState, useEffect } from 'react';
import { getSellerProducts } from '../services/products';

/* ─── Section type catalog ─────────────────────────────────────────── */
const SECTION_TYPES = [
  { type: 'product-grid',  label: 'Product Grid',  icon: 'bi-grid-3x3-gap' },
  { type: 'hero-banner',   label: 'Hero Banner',   icon: 'bi-image'         },
  { type: 'text-block',    label: 'Text Block',    icon: 'bi-text-paragraph'},
  { type: 'divider',       label: 'Divider',       icon: 'bi-dash-lg'       },
];

const defaultSection = (type) => {
  switch (type) {
    case 'product-grid':
      return { type, label: 'Product Grid', products: [], columns: 3,
               showPrice: true, showBadge: true, borderRadius: 12, shadow: 2 };
    case 'hero-banner':
      return { type, label: 'Hero Banner', imageUrl: '',
               title: 'Welcome', subtitle: 'Discover our collection',
               buttonText: 'Shop Now', buttonUrl: '/' };
    case 'text-block':
      return { type, label: 'Text Block',
               content: 'Enter your text here...', align: 'left' };
    case 'divider':
      return { type, label: 'Divider', color: '#e2e8f0', height: 2 };
    default:
      return { type, label: type };
  }
};

/* ─── Main Component ───────────────────────────────────────────────── */
export default function StorefrontDesigner() {
  const [sections,    setSections]    = useState([defaultSection('product-grid')]);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);

  /* product picker state */
  const [showPicker,    setShowPicker]    = useState(false);
  const [allProducts,   setAllProducts]   = useState([]);
  const [loadingProds,  setLoadingProds]  = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const activeSection = sections[activeIdx];

  const updateSection = (patch) =>
    setSections(prev => prev.map((s, i) => i === activeIdx ? { ...s, ...patch } : s));

  const addSection = (type) => {
    setSections(prev => [...prev, defaultSection(type)]);
    setActiveIdx(sections.length);
    setShowAddMenu(false);
  };

  const removeSection = (idx) => {
    if (sections.length === 1) return;
    setSections(prev => prev.filter((_, i) => i !== idx));
    setActiveIdx(prev => Math.min(prev, sections.length - 2));
  };

  const moveSection = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const copy = [...sections];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setSections(copy);
    setActiveIdx(target);
  };

  /* ── Product picker ── */
  const openPicker = async () => {
    setShowPicker(true);
    if (allProducts.length === 0) {
      setLoadingProds(true);
      try {
        const res = await getSellerProducts({ limit: 200 });
        const list = res.data?.data?.products ?? res.data?.data ?? [];
        setAllProducts(list);
      } catch (e) {
        console.error('Failed to load products', e);
      } finally {
        setLoadingProds(false);
      }
    }
  };

  const toggleProduct = (product) => {
    const selected = activeSection.products ?? [];
    const exists   = selected.some(p => p.id === product.id);
    updateSection({
      products: exists
        ? selected.filter(p => p.id !== product.id)
        : [...selected, product]
    });
  };

  const filteredProducts = allProducts.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSave = () => alert('Design saved locally (mock).');

  return (
    <div className="grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 100px)' }}>

      {/* ── Left: Sections list ─────────────────────────── */}
      <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-slate-800">Sections</span>
          <button
            className="btn btn-primary text-xs px-2 py-1"
            onClick={() => setShowAddMenu(v => !v)}
            title="Add section"
          >
            <i className="bi bi-plus-lg"></i>
          </button>
        </div>

        {showAddMenu && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
            {SECTION_TYPES.map(st => (
              <button
                key={st.type}
                onClick={() => addSection(st.type)}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2 transition-colors text-slate-700"
              >
                <i className={`bi ${st.icon}`}></i>
                {st.label}
              </button>
            ))}
          </div>
        )}

        <ul className="flex-1 space-y-1 overflow-y-auto">
          {sections.map((section, idx) => (
            <li
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`group flex items-center justify-between gap-1 px-2 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                activeIdx === idx
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="truncate flex-1">{section.label}</span>
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); moveSection(idx, -1); }}
                  className="p-0.5 hover:text-teal-600" title="Move up"
                ><i className="bi bi-chevron-up text-xs"></i></button>
                <button
                  onClick={e => { e.stopPropagation(); moveSection(idx, 1); }}
                  className="p-0.5 hover:text-teal-600" title="Move down"
                ><i className="bi bi-chevron-down text-xs"></i></button>
                <button
                  onClick={e => { e.stopPropagation(); removeSection(idx); }}
                  className="p-0.5 hover:text-red-500" title="Delete"
                ><i className="bi bi-trash text-xs"></i></button>
              </div>
            </li>
          ))}
        </ul>

        <button onClick={handleSave} className="btn btn-primary text-xs w-full mt-1">
          <i className="bi bi-floppy me-1"></i> Save Design
        </button>
      </div>

      {/* ── Center: Designer ────────────────────────────── */}
      <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col overflow-y-auto shadow-sm">
        <h2 className="font-bold text-sm mb-4 text-slate-800">
          Designer — <span className="text-teal-600">{activeSection?.label}</span>
        </h2>

        {activeSection?.type === 'product-grid' && (
          <ProductGridEditor
            section={activeSection}
            updateSection={updateSection}
            onOpenPicker={openPicker}
          />
        )}
        {activeSection?.type === 'hero-banner' && (
          <HeroBannerEditor section={activeSection} updateSection={updateSection} />
        )}
        {activeSection?.type === 'text-block' && (
          <TextBlockEditor section={activeSection} updateSection={updateSection} />
        )}
        {activeSection?.type === 'divider' && (
          <DividerEditor section={activeSection} updateSection={updateSection} />
        )}
      </div>

      {/* ── Right: Live Preview ─────────────────────────── */}
      <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col overflow-y-auto shadow-sm">
        <h2 className="font-bold text-sm mb-4 text-slate-800">Preview</h2>
        <div className="flex flex-col gap-3">
          {sections.map((section, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`rounded-lg border-2 cursor-pointer transition-colors ${
                activeIdx === idx ? 'border-teal-500' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <SectionPreview section={section} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Product Picker Modal ─────────────────────────── */}
      {showPicker && (
        <ProductPickerModal
          products={filteredProducts}
          selected={activeSection?.products ?? []}
          loading={loadingProds}
          search={productSearch}
          onSearch={setProductSearch}
          onToggle={toggleProduct}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Section Editors
═══════════════════════════════════════════════════════════════════ */

const inp = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ── Product Grid Editor ── */
function ProductGridEditor({ section, updateSection, onOpenPicker }) {
  const products = section.products ?? [];

  return (
    <div className="space-y-4">
      {/* Selected products */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-600">
            Selected Products ({products.length})
          </label>
          <button onClick={onOpenPicker} className="btn btn-primary text-xs px-2 py-1">
            <i className="bi bi-plus-lg me-1"></i> Add / Remove
          </button>
        </div>
        {products.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50">
            No products selected. Click "Add / Remove" to pick products.
          </p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
            {products.map((p, i) => (
              <li key={p.id ?? i} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-100 text-slate-700">
                <span className="truncate">{p.name}</span>
                <button
                  onClick={() => {
                    updateSection({ products: products.filter(x => x.id !== p.id) });
                  }}
                  className="text-slate-400 hover:text-red-500 ml-2 shrink-0"
                ><i className="bi bi-x"></i></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Layout options */}
      <Field label="Columns">
        <select
          className={inp}
          value={section.columns}
          onChange={e => updateSection({ columns: Number(e.target.value) })}
        >
          {[2, 3, 4].map(n => <option key={n} value={n}>{n} columns</option>)}
        </select>
      </Field>

      <Field label="Border Radius (px)">
        <input
          type="number" min={0} max={32} className={inp}
          value={section.borderRadius}
          onChange={e => updateSection({ borderRadius: Number(e.target.value) })}
        />
      </Field>

      <Field label="Shadow Level">
        <input
          type="number" min={0} max={5} className={inp}
          value={section.shadow}
          onChange={e => updateSection({ shadow: Number(e.target.value) })}
        />
      </Field>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={section.showPrice}
            onChange={e => updateSection({ showPrice: e.target.checked })}
          />
          Show Price
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={section.showBadge}
            onChange={e => updateSection({ showBadge: e.target.checked })}
          />
          Show Badge
        </label>
      </div>
    </div>
  );
}

/* ── Hero Banner Editor ── */
function HeroBannerEditor({ section, updateSection }) {
  const upd = (e) => updateSection({ [e.target.name]: e.target.value });
  return (
    <div className="space-y-4">
      <Field label="Image URL">
        <input name="imageUrl" className={inp} value={section.imageUrl} onChange={upd} placeholder="https://..." />
      </Field>
      <Field label="Title">
        <input name="title" className={inp} value={section.title} onChange={upd} />
      </Field>
      <Field label="Subtitle">
        <input name="subtitle" className={inp} value={section.subtitle} onChange={upd} />
      </Field>
      <Field label="Button Text">
        <input name="buttonText" className={inp} value={section.buttonText} onChange={upd} />
      </Field>
      <Field label="Button URL">
        <input name="buttonUrl" className={inp} value={section.buttonUrl} onChange={upd} />
      </Field>
    </div>
  );
}

/* ── Text Block Editor ── */
function TextBlockEditor({ section, updateSection }) {
  return (
    <div className="space-y-4">
      <Field label="Content">
        <textarea
          className={inp + ' h-32 resize-y'}
          value={section.content}
          onChange={e => updateSection({ content: e.target.value })}
        />
      </Field>
      <Field label="Text Align">
        <select
          className={inp}
          value={section.align}
          onChange={e => updateSection({ align: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>
    </div>
  );
}

/* ── Divider Editor ── */
function DividerEditor({ section, updateSection }) {
  return (
    <div className="space-y-4">
      <Field label="Color">
        <input
          type="color" className="h-10 w-full rounded cursor-pointer border border-slate-300"
          value={section.color}
          onChange={e => updateSection({ color: e.target.value })}
        />
      </Field>
      <Field label="Height (px)">
        <input
          type="number" min={1} max={20} className={inp}
          value={section.height}
          onChange={e => updateSection({ height: Number(e.target.value) })}
        />
      </Field>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Section Previews
═══════════════════════════════════════════════════════════════════ */
function SectionPreview({ section }) {
  switch (section.type) {
    case 'product-grid':  return <ProductGridPreview section={section} />;
    case 'hero-banner':   return <HeroBannerPreview  section={section} />;
    case 'text-block':    return <TextBlockPreview   section={section} />;
    case 'divider':       return <DividerPreview     section={section} />;
    default:              return null;
  }
}

function ProductGridPreview({ section }) {
  const products = section.products ?? [];
  const cols = section.columns ?? 3;

  if (products.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
        <i className="bi bi-grid-3x3-gap text-2xl block mb-1 text-slate-300"></i>
        Product Grid — no products selected
      </div>
    );
  }

  return (
    <div
      className="p-3"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}
    >
      {products.map((p, i) => (
        <div
          key={p.id ?? i}
          className="bg-white border border-slate-200 overflow-hidden"
          style={{
            borderRadius: section.borderRadius,
            boxShadow: `0 2px ${section.shadow * 4}px rgba(0,0,0,0.08)`
          }}
        >
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.name} className="w-full h-20 object-cover" />
          ) : (
            <div className="w-full h-20 bg-slate-100 flex items-center justify-center">
              <i className="bi bi-image text-slate-300 text-2xl"></i>
            </div>
          )}
          <div className="p-2">
            <div className="text-xs font-semibold text-slate-800 truncate">{p.name}</div>
            {section.showPrice && p.price != null && (
              <div className="text-xs text-teal-600 font-bold mt-0.5">₺{p.price}</div>
            )}
            {section.showBadge && p.badge && (
              <span className="text-xs bg-teal-100 text-teal-700 px-1 rounded">
                {p.badge}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroBannerPreview({ section }) {
  return (
    <div
      className="relative flex items-center justify-center text-center overflow-hidden rounded-lg min-h-24"
      style={{
        backgroundImage: section.imageUrl ? `url(${section.imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: section.imageUrl ? undefined : '#1e293b'
      }}
    >
      <div className="bg-black/40 absolute inset-0 rounded-lg"></div>
      <div className="relative z-10 p-4">
        <div className="text-white font-bold text-base">{section.title}</div>
        {section.subtitle && <div className="text-slate-200 text-xs mt-1">{section.subtitle}</div>}
        {section.buttonText && (
          <span className="inline-block mt-2 px-3 py-1 bg-teal-500 text-white text-xs rounded-full font-medium">
            {section.buttonText}
          </span>
        )}
      </div>
    </div>
  );
}

function TextBlockPreview({ section }) {
  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200">
      <p className="text-sm text-slate-700 whitespace-pre-wrap" style={{ textAlign: section.align }}>
        {section.content}
      </p>
    </div>
  );
}

function DividerPreview({ section }) {
  return (
    <div className="px-4 py-2">
      <hr style={{ borderColor: section.color, borderTopWidth: section.height }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Product Picker Modal
═══════════════════════════════════════════════════════════════════ */
function ProductPickerModal({ products, selected, loading, search, onSearch, onToggle, onClose }) {
  const isSelected = (p) => selected.some(s => s.id === p.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-900">Select Products</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-200">
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="Search products..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading && (
            <div className="text-center py-8 text-slate-500 text-sm">
              <i className="bi bi-arrow-repeat animate-spin me-2"></i>Loading...
            </div>
          )}
          {!loading && products.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No products found.</div>
          )}
          {!loading && products.map((p) => {
            const sel = isSelected(p);
            return (
              <button
                key={p.id}
                onClick={() => onToggle(p)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                  sel
                    ? 'border-teal-500 bg-teal-50 text-slate-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {/* Thumbnail */}
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-slate-100 rounded shrink-0 flex items-center justify-center">
                    <i className="bi bi-image text-slate-400"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  {p.price != null && (
                    <div className="text-xs text-teal-600">₺{p.price}</div>
                  )}
                </div>
                <i className={`bi shrink-0 text-lg ${sel ? 'bi-check-circle-fill text-teal-500' : 'bi-circle text-slate-300'}`}></i>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">{selected.length} product{selected.length !== 1 ? 's' : ''} selected</span>
          <button onClick={onClose} className="btn btn-primary text-sm px-4">Done</button>
        </div>
      </div>
    </div>
  );
}
