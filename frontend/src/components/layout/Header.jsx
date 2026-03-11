import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';

const Header = () => {
  const { t } = useLanguage();

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-slate-900 hover:text-[#233d7d] transition-colors">
              {t('home')}
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/shop" className="text-sm font-medium text-slate-700 hover:text-[#233d7d] transition-colors">
                {t('shop')}
              </Link>
              <Link to="/cart" className="text-sm font-medium text-slate-700 hover:text-[#233d7d] transition-colors">
                {t('cart')}
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;