import { useEffect, useState } from 'react';
import {
  getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getInventory, upsertInventory, deleteInventory, transferStock,
  getMovements, createMovement
} from '../services/stock';
import { getSellerProducts } from '../services/products';

const TABS = ['Warehouses', 'Inventory', 'Stock Movements', 'Transfer'];
const MOVEMENT_TYPES = ['purchase', 'sale', 'return', 'adjustment'];

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
const sel = inp + ' bg-white';

const SellerStock = () => {
  const [tab, setTab] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filterWarehouse, setFilterWarehouse] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wh, inv, mov, prod] = await Promise.all([
        getWarehouses(),
        getInventory(),
        getMovements(),
        getSellerProducts()
      ]);
      setWarehouses(wh.data?.data || []);
      setInventory(inv.data?.data || []);
      setMovements(mov.data?.data || []);
      setProducts(prod.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadInventory = async (warehouseId) => {
    try {
      const r = await getInventory(warehouseId ? { warehouseId } : {});
      setInventory(r.data?.data || []);
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
  };

  const openModal = (type, data = null) => {
    const defaults = {
      warehouse: { name: '', address: '', city: '', capacity: '', isActive: true },
      inventory: { warehouseId: '', productId: '', quantity: 0, reservedQty: 0, reorderLevel: 0 },
      movement: { warehouseId: '', productId: '', movementType: 'purchase', quantity: '', note: '' },
      transfer: { fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: '' }
    };
    setForm(data ? { ...data } : { ...defaults[type] });
    setModal({ type, data });
  };
  const closeModal = () => { setModal(null); setForm({}); };

  const f = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const fb = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (modal.type === 'warehouse') {
        if (modal.data?.id) await updateWarehouse(modal.data.id, form);
        else await createWarehouse(form);
        const r = await getWarehouses();
        setWarehouses(r.data?.data || []);
      } else if (modal.type === 'inventory') {
        await upsertInventory({ ...form, warehouseId: parseInt(form.warehouseId), productId: parseInt(form.productId), quantity: parseInt(form.quantity), reservedQty: parseInt(form.reservedQty || 0), reorderLevel: parseInt(form.reorderLevel || 0) });
        const r = await getInventory(filterWarehouse ? { warehouseId: filterWarehouse } : {});
        setInventory(r.data?.data || []);
      } else if (modal.type === 'movement') {
        await createMovement({ ...form, warehouseId: parseInt(form.warehouseId), productId: parseInt(form.productId), quantity: parseInt(form.quantity) });
        const [mov, inv] = await Promise.all([getMovements(), getInventory(filterWarehouse ? { warehouseId: filterWarehouse } : {})]);
        setMovements(mov.data?.data || []);
        setInventory(inv.data?.data || []);
      } else if (modal.type === 'transfer') {
        await transferStock({ fromWarehouseId: parseInt(form.fromWarehouseId), toWarehouseId: parseInt(form.toWarehouseId), productId: parseInt(form.productId), quantity: parseInt(form.quantity) });
        const [mov, inv] = await Promise.all([getMovements(), getInventory()]);
        setMovements(mov.data?.data || []);
        setInventory(inv.data?.data || []);
      }
      closeModal();
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWarehouse = async (id) => {
    if (!window.confirm('Delete warehouse?')) return;
    try {
      await deleteWarehouse(id);
      setWarehouses(warehouses.filter((w) => w.id !== id));
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
  };

  const handleDeleteInventory = async (id) => {
    if (!window.confirm('Remove inventory record?')) return;
    try {
      await deleteInventory(id);
      setInventory(inventory.filter((i) => i.id !== id));
    } catch (e) { setError(e.response?.data?.error?.message || e.message); }
  };

  const badge = (active) => (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  const mvtBadge = (type) => {
    const colors = { purchase: 'bg-blue-50 text-blue-700 border-blue-200', sale: 'bg-red-50 text-red-600 border-red-200', return: 'bg-amber-50 text-amber-700 border-amber-200', adjustment: 'bg-purple-50 text-purple-700 border-purple-200', transfer_in: 'bg-emerald-50 text-emerald-700 border-emerald-200', transfer_out: 'bg-orange-50 text-orange-700 border-orange-200' };
    return <span className={`px-2 py-0.5 rounded-full text-xs border ${colors[type] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{type}</span>;
  };

  const filteredInventory = filterWarehouse ? inventory.filter((i) => i.warehouseId === parseInt(filterWarehouse)) : inventory;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Stock & Warehouses</h1>
        <p className="text-slate-500 text-sm">Manage warehouses, inventory and stock movements.</p>
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

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
          {/* Warehouses */}
          {tab === 0 && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => openModal('warehouse')} className="btn btn-primary text-sm">+ New Warehouse</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((w) => (
                  <div key={w.id} className="border border-slate-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{w.name}</p>
                        {w.city && <p className="text-sm text-slate-500"><i className="bi bi-geo-alt me-1"></i>{w.city}</p>}
                        {w.address && <p className="text-sm text-slate-500">{w.address}</p>}
                      </div>
                      {badge(w.isActive)}
                    </div>
                    {w.capacity && <p className="text-sm text-slate-500">Capacity: {w.capacity}</p>}
                    <div className="flex gap-2 pt-1">
                      <button className="text-xs px-2 py-1 border rounded" onClick={() => openModal('warehouse', w)}>Edit</button>
                      <button className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded" onClick={() => handleDeleteWarehouse(w.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {warehouses.length === 0 && <p className="text-slate-400 text-sm col-span-3 py-6 text-center">No warehouses yet.</p>}
              </div>
            </div>
          )}

          {/* Inventory */}
          {tab === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 justify-between">
                <select className={sel + ' max-w-xs'} value={filterWarehouse} onChange={(e) => { setFilterWarehouse(e.target.value); loadInventory(e.target.value || null); }}>
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <button onClick={() => openModal('inventory')} className="btn btn-primary text-sm">+ Add Inventory</button>
              </div>
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Product</th>
                    <th className="text-left px-3 py-2 border-b">Warehouse</th>
                    <th className="text-right px-3 py-2 border-b">Qty</th>
                    <th className="text-right px-3 py-2 border-b">Reserved</th>
                    <th className="text-right px-3 py-2 border-b">Available</th>
                    <th className="text-right px-3 py-2 border-b">Reorder Level</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((i) => (
                    <tr key={i.id} className={`border-b hover:bg-slate-50 ${i.availableQty <= i.reorderLevel && i.reorderLevel > 0 ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-2 font-medium">{i.productName}</td>
                      <td className="px-3 py-2 text-slate-500">{i.warehouseName}</td>
                      <td className="px-3 py-2 text-right">{i.quantity}</td>
                      <td className="px-3 py-2 text-right text-orange-600">{i.reservedQty}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-700">{i.availableQty}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{i.reorderLevel}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button className="text-xs px-2 py-1 border rounded" onClick={() => openModal('inventory', { warehouseId: i.warehouseId, productId: i.productId, quantity: i.quantity, reservedQty: i.reservedQty, reorderLevel: i.reorderLevel })}>Edit</button>
                        <button className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded" onClick={() => handleDeleteInventory(i.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No inventory records.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Stock Movements */}
          {tab === 2 && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => openModal('movement')} className="btn btn-primary text-sm">+ Record Movement</button>
              </div>
              <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Date</th>
                    <th className="text-left px-3 py-2 border-b">Product</th>
                    <th className="text-left px-3 py-2 border-b">Warehouse</th>
                    <th className="text-left px-3 py-2 border-b">Type</th>
                    <th className="text-right px-3 py-2 border-b">Qty</th>
                    <th className="text-left px-3 py-2 border-b">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 font-medium">{m.productName}</td>
                      <td className="px-3 py-2 text-slate-500">{m.warehouseName}</td>
                      <td className="px-3 py-2">{mvtBadge(m.movementType)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${m.quantity > 0 ? 'text-emerald-700' : 'text-red-500'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{m.note || '-'}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No stock movements yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Transfer */}
          {tab === 3 && (
            <div className="max-w-md space-y-4">
              <p className="text-sm text-slate-600">Transfer stock between warehouses. Each transfer is logged as stock movements.</p>
              <button onClick={() => openModal('transfer')} className="btn btn-primary text-sm">+ New Transfer</button>
            </div>
          )}
        </>
      )}

      {/* Warehouse Modal */}
      {modal?.type === 'warehouse' && (
        <Modal title={modal.data?.id ? 'Edit Warehouse' : 'New Warehouse'} onClose={closeModal}>
          <Field label="Name"><input className={inp} value={form.name || ''} onChange={f('name')} /></Field>
          <Field label="City"><input className={inp} value={form.city || ''} onChange={f('city')} /></Field>
          <Field label="Address"><textarea className={inp} rows={2} value={form.address || ''} onChange={f('address')} /></Field>
          <Field label="Capacity"><input type="number" className={inp} value={form.capacity || ''} onChange={f('capacity')} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isActive} onChange={fb('isActive')} /> Active</label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={closeModal}>Cancel</button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* Inventory Modal */}
      {modal?.type === 'inventory' && (
        <Modal title="Inventory Record" onClose={closeModal}>
          <Field label="Warehouse">
            <select className={sel} value={form.warehouseId || ''} onChange={f('warehouseId')}>
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="Product">
            <select className={sel} value={form.productId || ''} onChange={f('productId')}>
              <option value="">Select product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantity"><input type="number" className={inp} value={form.quantity || 0} onChange={f('quantity')} /></Field>
            <Field label="Reserved"><input type="number" className={inp} value={form.reservedQty || 0} onChange={f('reservedQty')} /></Field>
            <Field label="Reorder At"><input type="number" className={inp} value={form.reorderLevel || 0} onChange={f('reorderLevel')} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={closeModal}>Cancel</button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* Movement Modal */}
      {modal?.type === 'movement' && (
        <Modal title="Record Stock Movement" onClose={closeModal}>
          <Field label="Warehouse">
            <select className={sel} value={form.warehouseId || ''} onChange={f('warehouseId')}>
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="Product">
            <select className={sel} value={form.productId || ''} onChange={f('productId')}>
              <option value="">Select product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Movement Type">
              <select className={sel} value={form.movementType || 'purchase'} onChange={f('movementType')}>
                {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Quantity"><input type="number" className={inp} value={form.quantity || ''} onChange={f('quantity')} /></Field>
          </div>
          <Field label="Note (optional)"><input className={inp} value={form.note || ''} onChange={f('note')} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={closeModal}>Cancel</button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* Transfer Modal */}
      {modal?.type === 'transfer' && (
        <Modal title="Transfer Stock" onClose={closeModal}>
          <Field label="From Warehouse">
            <select className={sel} value={form.fromWarehouseId || ''} onChange={f('fromWarehouseId')}>
              <option value="">Select source...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="To Warehouse">
            <select className={sel} value={form.toWarehouseId || ''} onChange={f('toWarehouseId')}>
              <option value="">Select destination...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="Product">
            <select className={sel} value={form.productId || ''} onChange={f('productId')}>
              <option value="">Select product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity"><input type="number" min="1" className={inp} value={form.quantity || ''} onChange={f('quantity')} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={closeModal}>Cancel</button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" disabled={saving} onClick={handleSave}>{saving ? 'Transferring...' : 'Transfer'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SellerStock;
