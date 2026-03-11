import { useEffect, useState } from 'react';
import { listMenus } from '../services/menus';
import { Link } from 'react-router-dom';

const MenusBuilder = () => {
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await listMenus();
        setState({ loading: false, error: null, rows: data.data });
      } catch (err) {
        const msg = err.response?.data?.error?.message || err.message;
        setState({ loading: false, error: msg, rows: [] });
      }
    };
    load();
  }, []);

  if (state.loading) return <div className="p-6 text-slate-400">Loading menus...</div>;
  if (state.error) return <div className="p-6 text-red-400">{state.error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Menus</h1>
          <p className="text-slate-400 text-sm">Menü ve menü item yönetimi</p>
        </div>
        <Link to="/menus/new" className="btn btn-primary text-sm">New Menu</Link>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.key}</td>
                <td>{row.description || '-'}</td>
                <td className="text-right space-x-2">
                  <Link to={`/menus/${row.id}/edit`} className="text-sm text-teal-400">Edit</Link>
                  <Link to={`/menus/${row.key}/preview`} className="text-sm text-slate-300 hover:text-white">Preview</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MenusBuilder;
