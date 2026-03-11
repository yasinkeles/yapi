/**
 * App Layout for customer/seller panels with role-based sidebars
 */
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import logoImg from '../../assets/logo.png';

const navConfig = {
  customer: [
    { name: 'My Account', path: '/app/account', icon: 'bi bi-person-circle' },
    { name: 'My Basket', path: '/app/cart', icon: 'bi bi-bag' },
    { name: 'Orders', path: '/app/orders', icon: 'bi bi-receipt' },
    { name: 'Addresses', path: '/app/addresses', icon: 'bi bi-geo-alt' },
    { name: 'Settings', path: '/app/settings', icon: 'bi bi-gear' },
  ],
  seller: [
    { name: 'Storefront Designer', path: '/seller/storefront-designer', icon: 'bi bi-magic' },
    { name: 'Products', path: '/seller/products', icon: 'bi bi-box-seam' },
    { name: 'Pricing & Campaigns', path: '/seller/pricing', icon: 'bi bi-percent' },
    { name: 'Stock & Warehouses', path: '/seller/stock', icon: 'bi bi-truck' },
    { name: 'Analytics', path: '/seller/analytics', icon: 'bi bi-bar-chart' },
    { name: 'Settings', path: '/seller/settings', icon: 'bi bi-gear' }
  ]
};

const AppLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role === 'seller' ? 'seller' : 'customer';
  const navItems = navConfig[role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 bg-white border-r border-slate-200 shadow-sm sticky top-0 h-screen`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
          <Link to="/"><img src={logoImg} alt="Logo" className="h-8 object-contain" /></Link>
          <button className="md:hidden text-slate-500" onClick={() => setSidebarOpen(false)}><i className="bi bi-x"></i></button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${active ? 'text-white border-transparent shadow-sm' : 'text-slate-700 border-transparent hover:bg-blue-50'}`}
                style={active ? { backgroundColor: '#233d7d' } : {}}
              >
                <i className={item.icon}></i>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-600" onClick={() => setSidebarOpen(true)}><i className="bi bi-list"></i></button>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <span className="hidden sm:inline">{user?.email}</span>
            <span className="px-2 py-1 rounded-full text-xs capitalize font-medium text-white" style={{ backgroundColor: '#233d7d' }}>{role}</span>
            <button onClick={handleLogout} className="text-slate-600 hover:text-red-500"><i className="bi bi-box-arrow-right"></i></button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
