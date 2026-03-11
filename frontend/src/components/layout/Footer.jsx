import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('home')}</h3>
            <p className="text-slate-600 text-sm">
              {t('welcome')} {t('home')}
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li><a href="/shop" className="text-slate-600 hover:text-[#233d7d] text-sm">{t('shop')}</a></li>
              <li><a href="/cart" className="text-slate-600 hover:text-[#233d7d] text-sm">{t('cart')}</a></li>
              <li><a href="/checkout" className="text-slate-600 hover:text-[#233d7d] text-sm">{t('checkout')}</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact</h3>
            <p className="text-slate-600 text-sm">
              Email: info@example.com
            </p>
          </div>
        </div>
        
        <div className="border-t border-slate-200 mt-8 pt-8 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} {t('home')}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;