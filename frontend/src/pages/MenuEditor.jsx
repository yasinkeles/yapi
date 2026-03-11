import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMenu, getMenu, updateMenu } from '../services/menus';

const MenuEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const [state, setState] = useState({ loading: !isNew, error: null });
  const [form, setForm] = useState({ key: '', name: '', description: '', permissions: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const { data } = await getMenu(id);
        const menu = data.data;
        setForm({
          key: menu.key,
          name: menu.name,
          description: menu.description || '',
          permissions: menu.permissions_json || null
        });
        setState({ loading: false, error: null });
      } catch (err) {
        const msg = err.response?.data?.error?.message || err.message;
        setState({ loading: false, error: msg });
      }
    };
    load();
  }, [id, isNew]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        key: form.key,
        name: form.name,
        description: form.description,
        permissions_json: form.permissions
      };
      if (isNew) {
        await createMenu(payload);
      } else {
        await updateMenu(id, payload);
      }
      navigate('/menus');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && state.loading) return <div className="p-6 text-slate-400">Loading menu...</div>;
  if (!isNew && state.error) return <div className="p-6 text-red-400">{state.error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isNew ? 'New Menu' : 'Edit Menu'}</h1>
          <p className="text-slate-400 text-sm">Menü meta ve izinler</p>
        </div>
        <button className="btn btn-primary text-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="block text-sm text-slate-300">Name</label>
          <input className="input w-full" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
          <label className="block text-sm text-slate-300">Key</label>
          <input className="input w-full" value={form.key} onChange={(e) => updateField('key', e.target.value)} disabled={!isNew} />
          <label className="block text-sm text-slate-300">Description</label>
          <input className="input w-full" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
        </div>
        <div className="space-y-3">
          <label className="block text-sm text-slate-300">Permissions JSON (opsiyonel)</label>
          <textarea className="input w-full h-32" value={form.permissions ? JSON.stringify(form.permissions, null, 2) : ''} onChange={(e) => {
            try { updateField('permissions', e.target.value ? JSON.parse(e.target.value) : null); } catch (err) { /* ignore */ }
          }} />
          <p className="text-xs text-slate-500">Rol listesi veya {`{"roles":["admin","developer"]}` } formatı.</p>
        </div>
      </div>
    </div>
  );
};

export default MenuEditor;
