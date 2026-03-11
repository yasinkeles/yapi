import { useEffect, useState } from 'react';
import { listPages, archivePage, hardDeletePage, restorePage } from '../services/pages';
import { Link } from 'react-router-dom';

const PagesBuilder = () => {
  const [state, setState] = useState({ loading: true, error: null, rows: [], page: 1, total: 0, limit: 20 });

  const load = async (page = 1) => {
    try {
      const { data } = await listPages({ page, limit: state.limit });
      setState((s) => ({ ...s, loading: false, error: null, rows: data.data, page, total: data.meta.totalItems }));
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  };

  useEffect(() => { load(1); }, []);

  const onArchive = async (id) => {
    const ok = window.confirm('Archive this page? It will be marked archived (not removed).');
    if (!ok) return;
    await archivePage(id);
    await load(state.page);
  };

  const onHardDelete = async (id, status) => {
    const ok = window.confirm('Bu sayfayı kalıcı olarak silmek istiyor musun? Geri alınamaz.');
    if (!ok) return;

    if (status !== 'archived') {
      try {
        await archivePage(id);
      } catch (err) {
        alert(err.response?.data?.error?.message || err.message || 'Archive failed');
        return;
      }
    }

    await hardDeletePage(id);
    await load(state.page);
  };

  const onRestore = async (id, status) => {
    if (status !== 'archived') {
      alert('Only archived pages can be restored.');
      return;
    }
    await restorePage(id);
    await load(state.page);
  };

  if (state.loading) return <div className="p-6 text-slate-400">Loading pages...</div>;
  if (state.error) return <div className="p-6 text-red-400">{state.error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Page Builder</h1>
          <p className="text-slate-400 text-sm">Create and delete pages (auto-published)</p>
        </div>
        <Link to="/pages-builder/new" className="btn btn-primary text-sm">New Page</Link>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Published</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.slug}</td>
                <td className="capitalize">{row.status}</td>
                <td>{row.current_version_id ? 'Yes' : 'No'}</td>
                <td className="text-right space-x-2">
                  <Link to={`/admin/pages/${row.id}/edit`} className="text-teal-400 text-sm">Edit</Link>
                  <button onClick={() => onArchive(row.id)} className="text-sm text-amber-400 hover:text-amber-200">Archive</button>
                  <button onClick={() => onHardDelete(row.id, row.status)} className="text-sm text-red-400 hover:text-red-200">Delete</button>
                  {row.status === 'archived' && (
                    <button onClick={() => onRestore(row.id, row.status)} className="text-sm text-green-400 hover:text-green-200">Restore</button>
                  )}
                  {row.slug && (
                    <>
                      <Link to={`/p/${row.slug}?preview=1`} className="text-sm text-blue-300 hover:text-white">Preview</Link>
                      {row.status === 'published' && row.current_version_id ? (
                        <Link to={`/p/${row.slug}`} className="text-sm text-slate-300 hover:text-white">View</Link>
                      ) : (
                        <span className="text-sm text-slate-500">Not published</span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PagesBuilder;
