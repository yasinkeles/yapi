/**
 * Layout Component
 * Modern Collapsible Sidebar Layout
 */

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logoDark from '../../assets/logo.png';
import logoLight from '../../assets/logo2.png';

import { hasPermissionSync, fetchRolePermissions } from '../../config/permissions';
import axios from '../../services/api';
import { listPages } from '../../services/pages';

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile menu state
  const [roles, setRoles] = useState([]);
  const [userPages, setUserPages] = useState([]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/login');
  };

  // Fetch roles for display names
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data } = await axios.get('/admin/roles');
        if (data.success) {
          setRoles(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const { data } = await listPages({ status: 'published', limit: 50 });
        const pages = (data.data || []).map((p) => ({
          name: p.name,
          path: `/admin/pages/${p.slug}`,
          icon: 'bi bi-file-earmark'
        }));
        setUserPages(pages);
      } catch (err) {
        console.warn('Published pages could not be loaded for sidebar', err.message);
        setUserPages([]);
      }
    };
    fetchPages();
  }, []);

  // Preload permissions on mount
  useEffect(() => {
    // Force refresh permissions when user role changes
    fetchRolePermissions(true);
  }, [user?.role]);

  // Get role display name
  const getRoleDisplayName = (roleName) => {
    const role = roles.find(r => r.name === roleName);
    return role?.display_name || roleName;
  };

  const sellerMenu = [
    { name: 'Storefront Designer', path: '/seller/storefront-designer', icon: 'bi bi-layout-text-window' },
    { name: 'My Products', path: '/seller/products', icon: 'bi bi-box-seam' },
    { name: 'Orders', path: '/seller/orders', icon: 'bi bi-receipt' },
    { name: 'Campaigns', path: '/seller/campaigns', icon: 'bi bi-megaphone' },
    { name: 'Analytics', path: '/seller/analytics', icon: 'bi bi-graph-up' }
  ];

  const allNavigationGroups = [
    {
      title: 'ADMIN',
      items: [
        { name: 'Dashboard', path: '/admin', icon: 'bi bi-speedometer2' },
        { name: 'Analytics', path: '/admin/analytics', icon: 'bi bi-graph-up' },
        { name: 'Data Sources', path: '/admin/data-sources', icon: 'bi bi-database' },
        { name: 'API Endpoints', path: '/admin/api-endpoints', icon: 'bi bi-hdd-network' },
        { name: 'API Keys', path: '/admin/api-keys', icon: 'bi bi-key' },
        { name: 'Users', path: '/admin/users', icon: 'bi bi-people' },
        { name: 'Roles', path: '/admin/roles', icon: 'bi bi-shield-lock' },
        { name: 'Pages', path: '/admin/pages-builder', icon: 'bi bi-layout-text-window' },
        { name: 'Page Builder (D&D)', path: '/admin/pages/new', icon: 'bi bi-ui-radios-grid' },
        { name: 'Menus', path: '/admin/menus', icon: 'bi bi-list-ul' }
      ]
    },
    {
      title: 'END USER PAGES',
      items: userPages.map(p => ({ ...p }))
    }
  ];

  // Show seller-specific sidebar if seller
  const navigationGroups = user?.role === 'seller'
    ? [{ title: 'SELLER', items: sellerMenu }]
    : allNavigationGroups.map(group => ({
        ...group,
        items: group.items.filter(item => hasPermissionSync(user?.role, item.path))
      })).filter(group => group.items.length > 0);

  return (
    <div className="flex h-screen bg-dark-950 text-slate-100 overflow-hidden md:p-0">
      {/* Sidebar */}
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative top-0 left-0 h-full z-40
          bg-dark-900 border-r md:border border-dark-800 flex-shrink-0 flex flex-col transition-all duration-300 rounded-r-2xl md:rounded-2xl
          ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} 
          shadow-2xl md:shadow-none md:h-[calc(100vh-3rem)] md:p-0 md:my-6 md:ml-6
        `}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center justify-center border-b border-dark-800 ${sidebarCollapsed ? 'md:px-3' : 'px-6'} relative`}>
          <img
            src={theme === 'dark' ? logoDark : logoLight}
            alt="Logo"
            className={`object-contain transition-all duration-300 ${sidebarCollapsed ? 'h-8 w-8' : 'h-10'}`}
          />
          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden text-slate-400 hover:text-white"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {navigationGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {(!sidebarCollapsed || mobileMenuOpen) && group.title && (
                <div className="px-6 mb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {group.title}
                  </h3>
                </div>
              )}
              <div className={`space-y-1 ${sidebarCollapsed ? 'md:px-3' : 'px-4'}`}>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)} // Close menu on click
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${isActive
                        ? 'bg-teal-700 text-white shadow-sm shadow-teal-900/10 [&_*]:!text-white'
                        : 'text-slate-400 hover:bg-dark-800 hover:text-slate-200'
                        } ${sidebarCollapsed ? 'md:justify-center' : ''}`}
                      title={sidebarCollapsed ? item.name : ''}
                    >
                      <i className={`${item.icon} text-lg ${isActive ? 'text-white' : ''}`}></i>
                      {(!sidebarCollapsed || mobileMenuOpen) && <span>{item.name}</span>}

                      {/* Tooltip for collapsed state (Desktop only) */}
                      {sidebarCollapsed && !mobileMenuOpen && (
                        <div className="hidden md:block absolute left-full ml-2 px-2 py-1 bg-dark-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Signature */}
        <div className={`border-t border-dark-800 flex items-center justify-center transition-all duration-300 ${sidebarCollapsed ? 'py-3' : 'py-4'}`}>
          {sidebarCollapsed && !mobileMenuOpen ? (
            <div className="text-xs font-semibold text-slate-600 rotate-90 whitespace-nowrap hidden md:block">
              YK
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500 tracking-wider">
                YASİN KELEŞ
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Yapi
              </p>
            </div>
          )}
        </div>

        {/* Desktop Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-dark-800 border border-dark-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <i className={`bi ${sidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'} text-xs`}></i>
        </button>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-6 md:my-6 md:mr-6 rounded-none md:rounded-2xl bg-dark-900 border-0 md:border border-dark-800 shadow-2xl md:h-[calc(100vh-3rem)] h-full">
        {/* Top Header */}
        <header className="bg-dark-900/50 backdrop-blur-md border-b border-dark-800 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 rounded-t-none md:rounded-t-2xl">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-white mr-2"
            >
              <i className="bi bi-list text-2xl"></i>
            </button>

            <h1 className="text-lg font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {navigationGroups
                .flatMap(g => g.items)
                .find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* User Info - Simplified on Mobile */}
            <Link
              to="/profile"
              className="flex items-center gap-3 px-2 md:px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-dark-800 hover:text-teal-400 transition-colors border-0 md:border border-dark-700"
              title="Go to Profile"
            >
              <i className="bi bi-person-circle text-xl"></i>
              <div className="hidden md:flex items-center gap-2">
                <span className="font-semibold text-white">{user?.username}</span>
                <span className="px-2 py-0.5 bg-teal-900/30 text-teal-400 border border-teal-900/50 rounded text-xs font-bold uppercase">
                  {getRoleDisplayName(user?.role)}
                </span>
              </div>
            </Link>

            {/* Theme Toggle - Hidden on super small screens if needed, but keeping for now */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-800 hover:text-teal-400 transition-colors border border-dark-700"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`}></i>
              <span className="hidden lg:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {/* Logout Button - Icon only on mobile */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-dark-800 hover:text-red-400 transition-colors border border-dark-700"
              title="Logout"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
