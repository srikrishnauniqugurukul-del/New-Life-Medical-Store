import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '../lib/i18n';
import type {
  AdminProfile,
  AppointmentCategory,
  Language,
  PublicSitePayload,
} from '../lib/types';
import { api } from '../services/apiClient';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface BookingPrefill {
  category?: AppointmentCategory;
  serviceId?: string;
  departmentId?: string;
  doctorId?: string;
}

interface AppContextValue {
  path: string;
  navigate: (to: string, prefill?: BookingPrefill) => void;
  bookingPrefill: BookingPrefill | null;
  clearBookingPrefill: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  publicData: PublicSitePayload | null;
  loadingPublic: boolean;
  publicError: string | null;
  refreshPublicData: () => Promise<void>;
  // Admin Auth (Token kept strictly in React memory — never localStorage)
  adminToken: string | null;
  adminProfile: AdminProfile | null;
  setAdminSession: (token: string | null, profile: AdminProfile | null) => void;
  logoutAdmin: () => void;
  // Toasts
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const PAGE_TITLES: Record<string, string> = {
  '/': 'New Life Medical Store Kalimpong — Doctor Consultations & Diagnostic Lab',
  '/about': 'About Us — New Life Medical Store Kalimpong',
  '/services': 'Medical & Diagnostic Services — New Life Medical Store Kalimpong',
  '/doctors': 'Doctors Directory — New Life Medical Store Kalimpong',
  '/diagnostics': 'Pathology Lab & Health Packages — New Life Diagnostic & Polyclinic',
  '/book': 'Book Appointment — New Life Medical Store Kalimpong',
  '/gallery': 'Facility & Clinic Gallery — New Life Medical Store Kalimpong',
  '/contact': 'Contact & Location — New Life Medical Store Kalimpong',
  '/privacy': 'Privacy Policy — New Life Medical Store Kalimpong',
  '/terms': 'Terms & Conditions — New Life Medical Store Kalimpong',
  '/booking-policy': 'Appointment Booking Policy — New Life Medical Store Kalimpong',
  '/cancellation-policy': 'Cancellation Policy — New Life Medical Store Kalimpong',
  '/admin': 'Admin Dashboard — New Life Medical Store Kalimpong',
  '/admin/login': 'Administrator Login — New Life Medical Store Kalimpong',
};

function normalizePath(raw: string): string {
  const clean = (raw || '/').split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.replace(/\/+$/, '');
  }
  return clean || '/';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(() => normalizePath(window.location.pathname));
  const [lang, setLangState] = useState<Language>('en');
  const [publicData, setPublicData] = useState<PublicSitePayload | null>(null);
  const [loadingPublic, setLoadingPublic] = useState<boolean>(true);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill | null>(null);

  // Admin auth stored strictly in memory
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key,
    [lang]
  );

  const navigate = useCallback((to: string, prefill?: BookingPrefill) => {
    const normalized = normalizePath(to);
    if (prefill) {
      setBookingPrefill(prefill);
    }
    if (normalizePath(window.location.pathname) !== normalized) {
      window.history.pushState({}, '', normalized);
    }
    setPath(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearBookingPrefill = useCallback(() => {
    setBookingPrefill(null);
  }, []);

  const refreshPublicData = useCallback(async () => {
    try {
      setLoadingPublic(true);
      setPublicError(null);
      const data = await api.getPublicBootstrap();
      setPublicData(data);
    } catch (err: any) {
      setPublicError(err?.message || 'Unable to load clinic services.');
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    refreshPublicData();
  }, [refreshPublicData]);

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title =
      PAGE_TITLES[path] || 'New Life Medical Store Kalimpong — Doctor Consultations & Diagnostic Lab';
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const url = window.location.origin + path;
    if (canonical) {
      canonical.href = url;
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = url;
      document.head.appendChild(link);
    }
  }, [path]);

  const setAdminSession = useCallback((token: string | null, profile: AdminProfile | null) => {
    setAdminToken(token);
    setAdminProfile(profile);
  }, []);

  const logoutAdmin = useCallback(() => {
    setAdminToken(null);
    setAdminProfile(null);
    pushToast('info', 'Signed out of administrator panel.');
    navigate('/admin/login');
  }, [navigate, pushToast]);

  return (
    <AppContext.Provider
      value={{
        path,
        navigate,
        bookingPrefill,
        clearBookingPrefill,
        lang,
        setLang,
        t,
        publicData,
        loadingPublic,
        publicError,
        refreshPublicData,
        adminToken,
        adminProfile,
        setAdminSession,
        logoutAdmin,
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
