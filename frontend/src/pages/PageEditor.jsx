import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addPageVersion, createPage, getPage } from '../services/pages';

const emptyLayout = {
  type: 'grid',
  rows: [
    { cols: [{ span: 12, components: ['hero'] }] }
  ]
};

const emptyComponents = {
  hero: { type: 'card', title: 'Welcome', body: 'Edit the new page content.' }
};

const PageEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === undefined;
  const [state, setState] = useState({ loading: !isNew, error: null, page: null, currentVersion: null });
  const [form, setForm] = useState({ slug: '', name: '', base: 'pages', path: '/pages/example', layout: emptyLayout, components: emptyComponents });
  const [saving, setSaving] = useState(false);

  const normalizeJson = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (err) {
        console.warn('JSON parse failed', err.message);
        return fallback;
      }
    }
    return value;
  };

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const { data } = await getPage(id);
        const page = data.data.page;
        const current = data.data.currentVersion;
        setState({ loading: false, error: null, page, currentVersion: current });
        const base = (current?.path || '/pages/example').split('/').filter(Boolean)[0] || 'pages';
        setForm({
          slug: page.slug,
          name: page.name,
          base,
          path: current?.path || `/pages/${page.slug}`,
          layout: normalizeJson(current?.layout_json, emptyLayout),
          components: normalizeJson(current?.components_json, emptyComponents)
        });
      } catch (err) {
        const msg = err.response?.data?.error?.message || err.message;
        setState({ loading: false, error: msg, page: null, currentVersion: null });
      }
    };
    load();
  }, [id, isNew]);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const recomputePath = (next) => {
    const slug = next.slug || form.slug || 'example';
    const base = next.base || form.base || 'pages';
    return `/${base}/${slug}`.replace(/\/+/g, '/');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        path: form.path || recomputePath({}),
        layout_json: form.layout || emptyLayout,
        components_json: form.components || emptyComponents,
        visibility_rules_json: null
      };

      if (isNew) {
        const body = {
          slug: form.slug,
          name: form.name,
          path: form.path || recomputePath({}),
          layout_json: form.layout || emptyLayout,
          components_json: form.components || emptyComponents,
          visibility_rules_json: null
        };
        await createPage(body);
        navigate('/pages-builder');
      } else {
        await addPageVersion(id, payload);
        navigate('/pages-builder');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && state.loading) return <div className="p-6 text-slate-400">Loading page...</div>;
  if (!isNew && state.error) return <div className="p-6 text-red-400">{state.error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isNew ? 'New Page' : 'Update Page'}</h1>
          <p className="text-slate-400 text-sm">Entries are auto-published (default visibility: admin)</p>
        </div>
        <div className="space-x-2">
          <button className="btn btn-primary text-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-dark-800 bg-dark-900 p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Page Name</label>
            <input className="input w-full" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Sales Summary" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Slug</label>
            <input
              className="input w-full"
              value={form.slug}
              disabled={!isNew}
              onChange={(e) => {
                const slug = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
                const nextPath = recomputePath({ slug });
                setForm((f) => ({ ...f, slug, path: nextPath }));
              }}
              placeholder="sales-summary"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Base Folder</label>
            <select
              className="input w-full"
              value={form.base}
              onChange={(e) => {
                const base = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'pages';
                const nextPath = recomputePath({ base });
                setForm((f) => ({ ...f, base, path: nextPath }));
              }}
            >
              <option value="pages">pages (varsayılan)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">URL</label>
            <input
              className="input w-full"
              value={form.path}
              onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
              placeholder="/pages/sales-summary"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-dark-800 bg-dark-900 p-4 text-sm text-slate-400">
            Pages are published immediately and visible only to the admin role by default. Permissions will be managed separately.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageEditor;
