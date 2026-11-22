import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import type { Language } from '../lib/types';
import { NewLifeBrandLockup } from './BrandLogo';

const NAV_ITEMS = [
  { path: '/', key: 'navHome' },
  { path: '/about', key: 'navAbout' },
  { path: '/services', key: 'navServices' },
  { path: '/doctors', key: 'navDoctors' },
  { path: '/diagnostics', key: 'navDiagnostics' },
  { path: '/gallery', key: 'navGallery' },
  { path: '/contact', key: 'navContact' },
];

const LANGUAGES: Array<{ code: Language; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ne', label: 'नेपाली' },
];

export function Header() {
  const { path, navigate, lang, setLang, t } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (to: string) => {
    setMobileOpen(false);
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDECE3]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-[72px] flex items-center justify-between gap-4">
        {/* Zone 1: Brand Identity */}
        <button
          type="button"
          onClick={() => handleNav('/')}
          className="text-left focus-visible:outline-none rounded-md py-1 shrink-0"
          aria-label="New Life Medical Store Kalimpong Home"
        >
          <NewLifeBrandLockup compact />
        </button>

        {/* Zone 2: Primary Navigation Links */}
        <nav
          aria-label="Main navigation"
          className="hidden xl:flex items-center gap-6 text-[14px] font-medium text-[#26352E]"
        >
          {NAV_ITEMS.map((item) => {
            const active = path === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
                className={`relative py-2 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  active
                    ? 'text-[#168B4B] font-semibold'
                    : 'text-[#52645B] hover:text-[#168B4B]'
                }`}
              >
                {t(item.key)}
                {active && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#168B4B] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Language Switcher + Primary Book Appointment CTA + Mobile Menu Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-[#F2F9F4] border border-[#DDECE3]"
            role="group"
            aria-label="Language switcher"
          >
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  lang === item.code
                    ? 'bg-white text-[#168B4B] shadow-xs font-semibold'
                    : 'text-[#52645B] hover:text-[#26352E]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleNav('/book')}
            className="px-4 py-2.5 rounded-lg bg-[#E34C3D] hover:bg-[#C93B2D] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            {t('navBook')}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="xl:hidden p-2 rounded-lg border border-[#DDECE3] text-[#26352E] hover:bg-[#F2F9F4] transition-colors"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileOpen && (
        <div className="xl:hidden bg-white border-t border-[#DDECE3] px-4 py-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#DDECE3]">
            <span className="text-xs font-medium text-[#52645B]">Language</span>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#F2F9F4] border border-[#DDECE3]">
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLang(item.code)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    lang === item.code
                      ? 'bg-white text-[#168B4B] font-semibold shadow-xs'
                      : 'text-[#52645B]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-1.5" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => {
              const active = path === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#F2F9F4] text-[#168B4B] font-semibold'
                      : 'text-[#26352E] hover:bg-[#F2F9F4]/60'
                  }`}
                >
                  {t(item.key)}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleNav('/book')}
              className="col-span-2 mt-2 py-3 rounded-lg bg-[#168B4B] hover:bg-[#11713C] text-white text-sm font-semibold text-center"
            >
              {t('ctaBook')}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
