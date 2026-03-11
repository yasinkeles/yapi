import { useEffect, useState } from 'react';
import {
  getPriceList, updatePrice,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getScheduledPrices, createScheduledPrice, deleteScheduledPrice
} from '../services/pricing';
import { getSellerProducts } from '../services/products';

const TABS = ['Price List', 'Campaigns', 'Coupons', 'Scheduled Pricing'];

const emptyForm = {
  campaign: { name: '', description: '', discountType: 'percentage', discountValue: '', startAt: '', endAt: '', isActive: true, productIds: [] },
  coupon: { code: '', discountType: 'percentage', discountValue: '', usageLimit: '', expiresAt: '', isActive: true, productIds: [] },
  scheduled: { productId: '', price: '', startAt: '', endAt: '' }
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><i className="bi bi-x-lg"></i></button>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {children}
  </div>
);

const inp = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
const sel = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white';

const SellerPricing = () => {
  const [tab, setTab] = useState(0);
  const [priceList, setPriceList] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'campaign'|'coupon'|'scheduled', data }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null); // { id, basePrice, campaignPrice }

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pl, cam, cop, sch, prod] = await Promise.all([
        getPriceList(),
        getCampaigns(),
        getCoupons(),
        getScheduledPrices(),
        getSellerProducts()
      ]);
      setPriceList(pl.data?.data || []);
      setCampaigns(cam.data?.data || []);
      setCoupons(cop.data?.data || []);
      setScheduled(sch.data?.data || []);
      setProducts(prod.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (type, data = null) => {
    setForm(data ? { ...data } : { ...emptyForm[type] });
    setModal({ type, data });
  };
  const closeModal = () => { setModal(null); setForm({}); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal.type === 'campaign') {
        if (modal.data?.id) await updateCampaign(modal.data.id, form);
        else await createCampaign(form);
        const r = await getCampaigns();
        setCampaigns(r.data?.data || []);
      } else if (modal.type === 'coupon') {
        if (modal.data?.id) await updateCoupon(modal.data.id, form);
        else await createCoupon(form);
        const r = await getCoupons();
        setCoupons(r.data?.data || []);
      } else if (modal.type === 'scheduled') {
        await createScheduledPrice(form);
        const r = await getScheduledPrices();
        setScheduled(r.data?.data || []);
      }
      closeModal();
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Delete?')) return;
    try {
      if (type === 'campaign') { await deleteCampaign(id); setCampaigns(campaigns.filter((c) => c.id !== id)); }
      else if (type === 'coupon') { await deleteCoupon(id); setCoupons(coupons.filter((c) => c.id !== id)); }
      else if (type === 'scheduled') { await deleteScheduledPrice(id); setScheduled(scheduled.filter((s) => s.id !== id)); }
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
  };

  const saveSinglePrice = async (product) => {
    try {
      await updatePrice(product.id, { basePrice: parseFloat(editingPrice.basePrice), campaignPrice: editingPrice.campaignPrice ? parseFloat(editingPrice.campaignPrice) : null });
      setPriceList(priceList.map((p) => p.id === product.id ? { ...p, basePrice: parseFloat(editingPrice.basePrice), campaignPrice: editingPrice.campaignPrice ? parseFloat(editingPrice.campaignPrice) : null } : p));
      setEditingPrice(null);
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
  };

  const f = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const fb = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }));

  const toggleProductInForm = (pid) => {
    setForm((prev) => {
      const ids = prev.productIds || [];
      return { ...prev, productIds: ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid] };
    });
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const badge = (active) => (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {active ? 'Active' : 'Passive'}
    </span>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pricing & Campaigns</h1>
        <p className="text-slate-500 text-sm">Manage prices, campaigns, coupons and scheduled pricing.</p>
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="text-slate-500 text-sm py-8 text-center">Loading...</div> : (
        <>
          {/* ── Price List ── */}
          {tab === 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Product</th>
                    <th className="text-left px-3 py-2 border-b">SKU</th>
                    <th className="text-left px-3 py-2 border-b">Base Price</th>
                    <th className="text-left px-3 py-2 border-b">Campaign Price</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {priceList.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{p.name}</td>
                      <td className="px-3 py-2 text-slate-500">{p.sku || '-'}</td>
                      <td className="px-3 py-2">
                        {editingPrice?.id === p.id
                          ? <input type="number" step="0.01" className={inp + ' w-28'} value={editingPrice.basePrice} onChange={(e) => setEditingPrice((prev) => ({ ...prev, basePrice: e.target.value }))} />
                          : <span>{p.basePrice} {p.currency}</span>}
                      </td>
                      <td className="px-3 py-2">
                        {editingPrice?.id === p.id
                          ? <input type="number" step="0.01" className={inp + ' w-28'} placeholder="None" value={editingPrice.campaignPrice || ''} onChange={(e) => setEditingPrice((prev) => ({ ...prev, campaignPrice: e.target.value }))} />
                          : <span className="text-emerald-700">{p.campaignPrice || '-'}</span>}
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        {editingPrice?.id === p.id ? (
                          <>
                            <button className="text-xs px-2 py-1 bg-emerald-600 text-white rounded" onClick={() => saveSinglePrice(p)}>Save</button>
                            <button className="text-xs px-2 py-1 border rounded" onClick={() => setEditingPrice(null)}>Cancel</button>
                          </>
                        ) : (
                          <button className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
                            onClick={() => setEditingPrice({ id: p.id, basePrice: p.basePrice, campaignPrice: p.campaignPrice || '' })}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Campaigns ── */}
          {tab === 1 && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => openModal('campaign')} className="btn btn-primary text-sm">+ New Campaign</button>
              </div>
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Name</th>
                    <th className="text-left px-3 py-2 border-b">Discount</th>
                    <th className="text-left px-3 py-2 border-b">Period</th>
                    <th className="text-left px-3 py-2 border-b">Products</th>
                    <th className="text-left px-3 py-2 border-b">Status</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">{c.discountValue}{c.discountType === 'percentage' ? '%' : ' fixed'}</td>
                      <td className="px-3 py-2 text-slate-500">{fmtDate(c.startAt)} – {fmtDate(c.endAt)}</td>
                      <td className="px-3 py-2">{c.products?.length || 0}</td>
                      <td className="px-3 py-2">{badge(c.isActive)}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button className="text-xs px-2 py-1 border rounded" onClick={() => openModal('campaign', { ...c, productIds: c.products?.map((p) => p.id) || [] })}>Edit</button>
                        <button className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded" onClick={() => handleDelete('campaign', c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No campaigns yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Coupons ── */}
          {tab === 2 && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => openModal('coupon')} className="btn btn-primary text-sm">+ New Coupon</button>
              </div>
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Code</th>
                    <th className="text-left px-3 py-2 border-b">Discount</th>
                    <th className="text-left px-3 py-2 border-b">Usage</th>
                    <th className="text-left px-3 py-2 border-b">Expires</th>
                    <th className="text-left px-3 py-2 border-b">Status</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-semibold text-emerald-700">{c.code}</td>
                      <td className="px-3 py-2">{c.discountValue}{c.discountType === 'percentage' ? '%' : ' fixed'}</td>
                      <td className="px-3 py-2">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                      <td className="px-3 py-2 text-slate-500">{c.expiresAt ? fmtDate(c.expiresAt) : 'No limit'}</td>
                      <td className="px-3 py-2">{badge(c.isActive)}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button className="text-xs px-2 py-1 border rounded" onClick={() => openModal('coupon', { ...c, productIds: c.products?.map((p) => p.id) || [] })}>Edit</button>
                        <button className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded" onClick={() => handleDelete('coupon', c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No coupons yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Scheduled Pricing ── */}
          {tab === 3 && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => openModal('scheduled')} className="btn btn-primary text-sm">+ Schedule Price</button>
              </div>
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Product</th>
                    <th className="text-left px-3 py-2 border-b">Price</th>
                    <th className="text-left px-3 py-2 border-b">Start</th>
                    <th className="text-left px-3 py-2 border-b">End</th>
                    <th className="text-left px-3 py-2 border-b">Applied</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduled.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{s.productName}</td>
                      <td className="px-3 py-2 font-semibold">{s.price}</td>
                      <td className="px-3 py-2 text-slate-500">{fmtDate(s.startAt)}</td>
                      <td className="px-3 py-2 text-slate-500">{s.endAt ? fmtDate(s.endAt) : 'Open'}</td>
                      <td className="px-3 py-2">{badge(s.isApplied)}</td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded" onClick={() => handleDelete('scheduled', s.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {scheduled.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No scheduled prices yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Campaign Modal ── */}
      {modal?.type === 'campaign' && (
        <Modal title={modal.data?.id ? 'Edit Campaign' : 'New Campaign'} onClose={closeModal}>
          <Field label="Name"><input className={inp} value={form.name || ''} onChange={f('name')} /></Field>
          <Field label="Description"><textarea className={inp} rows={2} value={form.description || ''} onChange={f('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount Type">
              <select className={sel} value={form.discountType || 'percentage'} onChange={f('discountType')}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </Field>
            <Field label="Discount Value"><input type="number" className={inp} value={form.discountValue || ''} onChange={f('discountValue')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date"><input type="datetime-local" className={inp} value={form.startAt ? form.startAt.slice(0, 16) : ''} onChange={f('startAt')} /></Field>
            <Field label="End Date"><input type="datetime-local" className={inp} value={form.endAt ? form.endAt.slice(0, 16) : ''} onChange={f('endAt')} /></Field>
          </div>
          <Field label="Products (select applicable)">
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(form.productIds || []).includes(p.id)} onChange={() => toggleProductInForm(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isActive} onChange={fb('isActive')} /> Active</label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={closeModal}>Cancel</button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* ── Coupon Modal ── */}
      {modal?.type === 'coupon' && (
        <Modal title={modal.data?.id ? 'Edit Coupon' : 'New Coupon'} onClose={closeModal}>
          <Field label="Coupon Code"><input className={inp + ' uppercase'} value={form.code || ''} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount Type">
              <select className={sel} value={form.discountType || 'percentage'} onChange={f('discountType')}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </Field>
            <Field label="Discount Value"><input type="number" className={inp} value={form.discountValue || ''} onChange={f('discountValue')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Usage Limit"><input type="number" className={inp} placeholder="Unlimited" value={form.usageLimit || ''} onChange={f('usageLimit')} /></Field>
            <Field label="Expiration Date"><input type="date" className={inp} value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''} onChange={f('expiresAt')} /></Field>
          </div>
          <Field label="Applicable Products (leave empty for all)">
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(form.productIds || []).includes(p.id)} onChange={() => toggleProductInForm(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isActive} onChange={fb('isActive')} /> Active</label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={closeModal}>Cancel</button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* ── Scheduled Price Modal ── */}
      {modal?.type === 'scheduled' && (
        <Modal title="Schedule Price Change" onClose={closeModal}>
          <Field label="Product">
            <select className={sel} value={form.productId || ''} onChange={f('productId')}>
              <option value="">Select product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="New Price"><input type="number" step="0.01" className={inp} value={form.price || ''} onChange={f('price')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date"><input type="datetime-local" className={inp} value={form.startAt || ''} onChange={f('startAt')} /></Field>
            <Field label="End Date (optional)"><input type="datetime-local" className={inp} value={form.endAt || ''} onChange={f('endAt')} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={closeModal}>Cancel</button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SellerPricing;
