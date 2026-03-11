import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { getMenuByKey } from '../../services/menus';
import { Link, useLocation } from 'react-router-dom';

const MenuRenderer = ({ menuKey, onNavigate }) => {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, error: null, menu: null });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await getMenuByKey(menuKey);
        if (mounted) setState({ loading: false, error: null, menu: data.data });
      } catch (err) {
        const message = err.response?.data?.error?.message || err.message;
        if (mounted) setState({ loading: false, error: message, menu: null });
      }
    };
    load();
    return () => { mounted = false; };
  }, [menuKey]);

  if (state.loading) return <p className="text-slate-400 text-sm px-4">Loading menu...</p>;
  if (state.error) return <p className="text-red-400 text-sm px-4">{state.error}</p>;
  if (!state.menu) return null;

  const items = state.menu.items || [];

  return (
    <nav className="space-y-1 px-4">
      {items.map((item) => {
        const isActive = item.target_type === 'page'
          ? location.pathname === item.target_ref
          : location.pathname === item.target_ref;

        if (item.target_type === 'url') {
          return (
            <a
              key={item.id}
              href={item.target_ref}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-dark-800'}`}
              target="_blank"
              rel="noreferrer"
            >
              {item.icon && <i className={`${item.icon} text-lg`}></i>}
              <span>{item.label}</span>
            </a>
          );
        }

        return (
          <Link
            key={item.id}
            to={item.target_type === 'page' ? `/pages/${item.target_ref}` : item.target_ref || '#'}
            onClick={() => onNavigate?.()}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-dark-800'}`}
          >
            {item.icon && <i className={`${item.icon} text-lg`}></i>}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

MenuRenderer.propTypes = {
  menuKey: PropTypes.string.isRequired,
  onNavigate: PropTypes.func,
};

export default MenuRenderer;
