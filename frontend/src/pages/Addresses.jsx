import { useEffect, useState } from 'react';
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../services/address';
import EmptyState from '../components/store/EmptyState';

const EMPTY_FORM = {
  title: '', full_name: '', phone: '', address_line: '', district: '', city: '', state: '', postal_code: '', country: 'TR', is_default: false,
};

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#233d7d]';

const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', data }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAddresses();
      setAddresses(data || []);
      setError(null);
    } catch {
      setError('Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(null); setModal({ mode: 'add' }); };
  const openEdit = (addr) => { setForm({ ...EMPTY_FORM, ...addr }); setFormError(null); setModal({ mode: 'edit', id: addr.id }); };
  const closeModal = () => setModal(null);

  const s = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.address_line.trim() || !form.city.trim()) {
      setFormError('Full name, address line and city are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (modal.mode === 'add') {
        const created = await createAddress(form);
        setAddresses((prev) => [...prev, created]);
      } else {
        const updated = await updateAddress(modal.id, form);
        setAddresses((prev) => prev.map((a) => a.id === modal.id ? updated : a));
      }
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Could not delete address.');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
    } catch {
      setError('Could not set default address.');
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Addresses</h1>
          <p className="text-sm text-slate-500">Manage your saved shipping addresses.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#233d7d] hover:bg-[#1a2f61] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <i className="bi bi-plus-lg"></i> Add Address
        </button>
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((n) => <div key={n} className="h-28 bg-slate-100 rounded-xl"></div>)}
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="bi bi-geo-alt"
          title="No addresses saved"
          message="Add a shipping address to use during checkout."
          action={<button onClick={openAdd} className="inline-flex items-center gap-2 bg-[#233d7d] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1a2f61] transition-colors"><i className="bi bi-plus-lg"></i> Add Address</button>}
        />
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className={`bg-white border rounded-xl p-4 space-y-2 ${addr.is_default ? 'border-emerald-400 bg-blue-50/30' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 text-sm">{addr.title || addr.full_name}</p>
                    {addr.is_default && <span className="text-xs bg-blue-100 text-[#233d7d] font-semibold px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{addr.full_name}</p>
                  <p className="text-sm text-slate-500">{addr.address_line}, {addr.district}, {addr.city}</p>
                  {addr.phone && <p className="text-xs text-slate-400 mt-0.5">{addr.phone}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!addr.is_default && (
                    <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-[#233d7d] hover:text-[#233d7d] font-medium border border-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                      Set Default
                    </button>
                  )}
                  <button onClick={() => openEdit(addr)} className="text-xs text-slate-600 hover:text-slate-800 border border-slate-300 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(addr.id)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{modal.mode === 'add' ? 'Add Address' : 'Edit Address'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address Title (e.g. Home)</label>
                  <input className={inp} value={form.title} onChange={s('title')} placeholder="Home, Office..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                  <input className={inp} value={form.full_name} onChange={s('full_name')} placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input type="tel" className={inp} value={form.phone} onChange={s('phone')} placeholder="+1 555 000 0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                  <input className={inp} value={form.country} onChange={s('country')} placeholder="TR" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address Line *</label>
                  <textarea className={inp} rows={2} value={form.address_line} onChange={s('address_line')} placeholder="Street, building, apartment..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">District</label>
                  <input className={inp} value={form.district} onChange={s('district')} placeholder="District" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">City *</label>
                  <input className={inp} value={form.city} onChange={s('city')} placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State / Province</label>
                  <input className={inp} value={form.state} onChange={s('state')} placeholder="State" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Postal Code</label>
                  <input className={inp} value={form.postal_code} onChange={s('postal_code')} placeholder="00000" />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-[#233d7d]" checked={form.is_default} onChange={s('is_default')} />
                    <span className="text-sm text-slate-700">Set as default address</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={closeModal} className="flex-1 border border-slate-300 text-slate-700 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#233d7d] hover:bg-[#1a2f61] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Addresses;
