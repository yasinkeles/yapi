import { useEffect, useState } from 'react';
import { getSellerSettings, saveSellerSettings } from '../services/sellerSettings';

const TABS = ['Store Profile', 'Shipping', 'Payment', 'Notifications'];

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const inp = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

const SellerSettings = () => {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState({
    storeName: '', storeLogo: '', storeDescription: '', contactEmail: '', contactPhone: '',
    shippingRegions: [], shippingPrice: 0, freeShippingThreshold: '',
    bankName: '', bankIban: '', taxId: '', invoiceAddress: '',
    notifyOrders: true, notifyLowStock: true, notifyEmail: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [regionInput, setRegionInput] = useState('');

  useEffect(() => {
    getSellerSettings()
      .then((r) => {
        const d = r.data?.data;
        if (d) setSettings((prev) => ({ ...prev, ...d }));
      })
      .catch((e) => setError(e.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  const s = (key) => (e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }));
  const sb = (key) => (e) => setSettings((prev) => ({ ...prev, [key]: e.target.checked }));

  const addRegion = () => {
    const r = regionInput.trim();
    if (!r) return;
    if (settings.shippingRegions.includes(r)) return;
    setSettings((prev) => ({ ...prev, shippingRegions: [...prev.shippingRegions, r] }));
    setRegionInput('');
  };
  const removeRegion = (r) => setSettings((prev) => ({ ...prev, shippingRegions: prev.shippingRegions.filter((x) => x !== r) }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const r = await saveSellerSettings(settings);
      setSettings((prev) => ({ ...prev, ...(r.data?.data || {}) }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-500 text-sm py-10 text-center">Loading settings...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-slate-500 text-sm">Configure your store profile, shipping, payment and notifications.</p>
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      {saved && <div className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">Settings saved successfully.</div>}

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === i ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Store Profile */}
        {tab === 0 && (
          <>
            <Field label="Store Name">
              <input className={inp} value={settings.storeName || ''} onChange={s('storeName')} placeholder="My Store" />
            </Field>
            <Field label="Store Logo URL" hint="Paste a publicly accessible image URL for your logo.">
              <input className={inp} value={settings.storeLogo || ''} onChange={s('storeLogo')} placeholder="https://..." />
              {settings.storeLogo && <img src={settings.storeLogo} alt="logo preview" className="mt-2 h-16 object-contain rounded border border-slate-200" />}
            </Field>
            <Field label="Store Description">
              <textarea className={inp} rows={3} value={settings.storeDescription || ''} onChange={s('storeDescription')} placeholder="Tell customers about your store..." />
            </Field>
            <Field label="Contact Email">
              <input type="email" className={inp} value={settings.contactEmail || ''} onChange={s('contactEmail')} />
            </Field>
            <Field label="Contact Phone">
              <input type="tel" className={inp} value={settings.contactPhone || ''} onChange={s('contactPhone')} />
            </Field>
          </>
        )}

        {/* Shipping */}
        {tab === 1 && (
          <>
            <Field label="Shipping Regions" hint="Add countries or regions you ship to.">
              <div className="flex gap-2">
                <input className={inp} value={regionInput} onChange={(e) => setRegionInput(e.target.value)} placeholder="e.g. Turkey, USA"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRegion())} />
                <button onClick={addRegion} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-md whitespace-nowrap">Add</button>
              </div>
              {settings.shippingRegions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.shippingRegions.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full">
                      {r}
                      <button onClick={() => removeRegion(r)} className="hover:text-red-500"><i className="bi bi-x"></i></button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Default Shipping Price ($)">
              <input type="number" step="0.01" min="0" className={inp} value={settings.shippingPrice || 0} onChange={s('shippingPrice')} />
            </Field>
            <Field label="Free Shipping Threshold ($)" hint="Orders above this amount qualify for free shipping. Leave empty to disable.">
              <input type="number" step="0.01" min="0" className={inp} value={settings.freeShippingThreshold || ''} onChange={s('freeShippingThreshold')} placeholder="e.g. 100" />
            </Field>
          </>
        )}

        {/* Payment */}
        {tab === 2 && (
          <>
            <Field label="Bank Name">
              <input className={inp} value={settings.bankName || ''} onChange={s('bankName')} />
            </Field>
            <Field label="IBAN">
              <input className={inp} value={settings.bankIban || ''} onChange={s('bankIban')} placeholder="TR00 0000 0000 0000 0000 0000 00" />
            </Field>
            <Field label="Tax ID / VAT Number">
              <input className={inp} value={settings.taxId || ''} onChange={s('taxId')} />
            </Field>
            <Field label="Invoice Address">
              <textarea className={inp} rows={3} value={settings.invoiceAddress || ''} onChange={s('invoiceAddress')} />
            </Field>
          </>
        )}

        {/* Notifications */}
        {tab === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Choose which notifications you want to receive.</p>
            <div className="space-y-3">
              {[
                { key: 'notifyEmail', label: 'Email Notifications', desc: 'Receive notifications via email' },
                { key: 'notifyOrders', label: 'Order Alerts', desc: 'Get notified when a new order is placed' },
                { key: 'notifyLowStock', label: 'Low Stock Alerts', desc: 'Get warned when a product reaches its reorder level' }
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <input type="checkbox" className="mt-0.5 accent-emerald-600" checked={!!settings[key]} onChange={sb(key)} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerSettings;
