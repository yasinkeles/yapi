import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCategories } from '../services/store';
import { createProduct, getSellerProduct, updateProduct } from '../services/products';
import ProductCard from '../components/store/ProductCard';

const emptyImage = () => ({ imageUrl: '', altText: '', isMain: false, sortOrder: 0 });
const emptySpec = () => ({ specGroup: '', specKey: '', specValue: '', sortOrder: 0 });

const SellerProductEditor = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    sku: '',
    categoryId: '',
    shortDescription: '',
    description: '',
    basePrice: '',
    campaignPrice: '',
    currency: 'USD',
    stockQty: 0,
    isActive: true
  });
  const [images, setImages] = useState([emptyImage()]);
  const [specs, setSpecs] = useState([emptySpec()]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, productRes] = await Promise.all([
          fetchCategories(),
          isEdit ? getSellerProduct(id) : Promise.resolve(null)
        ]);

        setCategories(catRes.data?.data || []);

        if (productRes) {
          const p = productRes.data?.data;
          setForm({
            name: p.name || '',
            slug: p.slug || '',
            sku: p.sku || '',
            categoryId: p.categoryId || '',
            shortDescription: p.shortDescription || '',
            description: p.description || '',
            basePrice: p.basePrice ?? '',
            campaignPrice: p.campaignPrice ?? '',
            currency: p.currency || 'USD',
            stockQty: p.stockQty ?? 0,
            isActive: p.isActive ?? true
          });
          setImages(p.images?.length ? p.images : [emptyImage()]);
          setSpecs(p.specifications?.length ? p.specifications : [emptySpec()]);
        }
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateImage = (index, patch) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  };

  const updateSpec = (index, patch) => {
    setSpecs((prev) => prev.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)));
  };

  const markMainImage = (index) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isMain: i === index })));
  };

  const cleanedPayload = useMemo(() => {
    return {
      ...form,
      categoryId: form.categoryId || null,
      basePrice: form.basePrice === '' ? null : Number(form.basePrice),
      campaignPrice: form.campaignPrice === '' ? null : Number(form.campaignPrice),
      stockQty: Number(form.stockQty || 0),
      images: images.filter((img) => img.imageUrl?.trim()).map((img, idx) => ({
        ...img,
        sortOrder: img.sortOrder ?? idx
      })),
      specifications: specs.filter((spec) => spec.specKey && spec.specValue).map((spec, idx) => ({
        ...spec,
        sortOrder: spec.sortOrder ?? idx
      }))
    };
  }, [form, images, specs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      setError('Product name is required');
      return;
    }
    if (form.basePrice === '' || form.basePrice === null) {
      setError('Base price is required');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(id, cleanedPayload);
      } else {
        await createProduct(cleanedPayload);
      }
      navigate('/seller/products');
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Product' : 'New Product'}</h1>
          <p className="text-slate-600">Basic template-based product editor.</p>
        </div>
        <Link to="/seller/products" className="btn btn-secondary">Back to list</Link>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600">Product Name *</label>
                <input className="input w-full" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm text-slate-600">Slug</label>
                <input className="input w-full" value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} placeholder="auto if empty" />
              </div>
              <div>
                <label className="text-sm text-slate-600">SKU</label>
                <input className="input w-full" value={form.sku} onChange={(e) => handleChange('sku', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-600">Category</label>
                <select className="input w-full" value={form.categoryId || ''} onChange={(e) => handleChange('categoryId', e.target.value)}>
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-600">Short Description</label>
                <textarea className="input w-full" value={form.shortDescription} onChange={(e) => handleChange('shortDescription', e.target.value)} rows={2} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-600">Full Description</label>
                <textarea className="input w-full" value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} />
                <span className="text-sm text-slate-600">Active</span>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-600">Base Price *</label>
              <input className="input w-full" type="number" min="0" value={form.basePrice} onChange={(e) => handleChange('basePrice', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-slate-600">Campaign Price</label>
              <input className="input w-full" type="number" min="0" value={form.campaignPrice} onChange={(e) => handleChange('campaignPrice', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Currency</label>
              <input className="input w-full" value={form.currency} onChange={(e) => handleChange('currency', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Stock Quantity</label>
              <input className="input w-full" type="number" min="0" value={form.stockQty} onChange={(e) => handleChange('stockQty', e.target.value)} />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Images</h3>
              <button type="button" className="btn btn-secondary text-sm" onClick={() => setImages((prev) => [...prev, emptyImage()])}>Add Image</button>
            </div>
            <div className="space-y-3">
              {images.map((img, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center border border-slate-100 rounded-lg p-3">
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600">Image URL *</label>
                    <input className="input w-full" value={img.imageUrl} onChange={(e) => updateImage(idx, { imageUrl: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Alt Text</label>
                    <input className="input w-full" value={img.altText || ''} onChange={(e) => updateImage(idx, { altText: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="mainImage" checked={img.isMain} onChange={() => markMainImage(idx)} />
                    <span className="text-sm">Main</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Technical Specifications</h3>
              <button type="button" className="btn btn-secondary text-sm" onClick={() => setSpecs((prev) => [...prev, emptySpec()])}>Add Row</button>
            </div>
            <div className="space-y-3">
              {specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className="input w-full" placeholder="Group (e.g., General)" value={spec.specGroup || ''} onChange={(e) => updateSpec(idx, { specGroup: e.target.value })} />
                  <input className="input w-full" placeholder="Key" value={spec.specKey || ''} onChange={(e) => updateSpec(idx, { specKey: e.target.value })} />
                  <input className="input w-full" placeholder="Value" value={spec.specValue || ''} onChange={(e) => updateSpec(idx, { specValue: e.target.value })} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-slate-900">Preview</h3>
            <ProductCard product={{
              ...cleanedPayload,
              slug: cleanedPayload.slug || 'preview',
              mainImage: cleanedPayload.images?.[0]?.imageUrl,
              images: cleanedPayload.images
            }} />
          </section>

          <div className="space-y-3">
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
            <Link to="/seller/products" className="btn btn-secondary w-full text-center">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SellerProductEditor;
