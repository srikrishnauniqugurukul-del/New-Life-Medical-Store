import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BriefcaseMedical,
  Calendar,
  CalendarCheck,
  CalendarOff,
  Clock,
  FileEdit,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import type {
  Appointment,
  BackendHealthStatus,
  BlockedDate,
  BusinessHour,
  Customer,
  Department,
  Doctor,
  GalleryItem,
  NotificationLog,
  ServiceItem,
  SiteContentSettings,
} from '../lib/types';
import { api } from '../services/apiClient';
import { NewLifeBrandLockup } from '../components/BrandLogo';
import {
  AdminAppointmentsPanel,
  AdminCalendarPanel,
  AdminOverviewPanel,
} from './AdminOverviewAndAppointments';
import {
  AdminCustomersPanel,
  AdminDoctorsPanel,
  AdminServicesPanel,
} from './AdminCatalogPanels';
import {
  AdminBlockedDatesPanel,
  AdminBusinessHoursPanel,
  AdminGalleryPanel,
} from './AdminOperationsPanels';
import {
  AdminContentPanel,
  AdminNotificationsPanel,
  AdminProfilePanel,
  AdminSettingsAndDatabasePanel,
} from './AdminSystemPanels';

type AdminTab =
  | 'overview'
  | 'appointments'
  | 'calendar'
  | 'doctors'
  | 'services'
  | 'customers'
  | 'hours'
  | 'blocked'
  | 'gallery'
  | 'content'
  | 'notifications'
  | 'settings'
  | 'profile';

const SIDEBAR_ITEMS: Array<{ id: AdminTab | 'logout'; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'services', label: 'Services', icon: BriefcaseMedical },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'hours', label: 'Business Hours', icon: Clock },
  { id: 'blocked', label: 'Blocked Dates', icon: CalendarOff },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'content', label: 'Website Content', icon: FileEdit },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings & DB', icon: Settings },
  { id: 'profile', label: 'Admin Profile', icon: UserCog },
  { id: 'logout', label: 'Logout', icon: LogOut },
];

export function AdminDashboard() {
  const {
    adminToken,
    adminProfile,
    setAdminSession,
    logoutAdmin,
    navigate,
    refreshPublicData,
    pushToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('appointments');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<{
    health: BackendHealthStatus;
    appointments: Appointment[];
    customers: Customer[];
    departments: Department[];
    services: ServiceItem[];
    doctors: Doctor[];
    businessHours: BusinessHour[];
    blockedDates: BlockedDate[];
    gallery: GalleryItem[];
    notifications: NotificationLog[];
    settings: SiteContentSettings;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const res = await api.getAdminDashboard(adminToken);
      setData(res);
    } catch (err: any) {
      pushToast('error', err?.message || 'Session expired. Please sign in again.');
      logoutAdmin();
    } finally {
      setLoading(false);
    }
  }, [adminToken, logoutAdmin, pushToast]);

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    loadDashboard();
  }, [adminToken, navigate, loadDashboard]);

  if (!adminToken) return null;

  const syncAfterMutation = async (successMessage: string) => {
    pushToast('success', successMessage);
    await Promise.all([loadDashboard(), refreshPublicData()]);
  };

  const unreadCount = (data?.notifications || []).filter((n) => !n.is_read).length;
  const activeTitle = SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.label || 'Overview';

  const handleFileUpload = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      pushToast('error', 'Image must be smaller than 4 MB.');
      throw new Error('File too large');
    }
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    const res = await api.uploadGalleryImage(adminToken, {
      fileName: file.name,
      contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
      base64Data,
    });
    pushToast('success', 'Image uploaded to Supabase Storage.');
    return res;
  };

  return (
    <div className="min-h-screen bg-[#F5F9F6] flex">
      {/* Sidebar Desktop + Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#DDECE3] flex flex-col transition-transform lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-4 border-b border-[#DDECE3] flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left rounded-md focus-visible:outline-none"
            title="Go to Front Page"
          >
            <NewLifeBrandLockup compact />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-[#F2F9F4]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Admin sidebar">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  if (item.id === 'logout') {
                    logoutAdmin();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  item.id === 'logout'
                    ? 'text-[#E34C3D] hover:bg-[#FFF2F0] mt-3'
                    : active
                      ? 'bg-[#168B4B] text-white'
                      : 'text-[#26352E] hover:bg-[#F2F9F4]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                      active ? 'bg-white text-[#168B4B]' : 'bg-[#E34C3D] text-white'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#DDECE3] text-[11px] text-[#52645B]">
          <div className="font-semibold text-[#26352E] truncate">{adminProfile?.full_name}</div>
          <div className="truncate">{adminProfile?.email}</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-[#DDECE3] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#DDECE3] text-[#26352E] hover:bg-[#F2F9F4] shrink-0"
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F2F9F4] hover:bg-[#168B4B] text-[#168B4B] hover:text-white border border-[#CBE0D3] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              aria-label="Back to Front Page"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Back to Front Page</span>
            </button>
            <div className="hidden sm:flex items-center truncate pl-1 border-l border-[#DDECE3]">
              <span className="text-xs text-[#52645B] ml-2">Admin</span>
              <span className="mx-1.5 text-xs text-[#A3C4B1]">/</span>
              <span className="font-display font-bold text-sm sm:text-base text-[#26352E] truncate">
                {activeTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#CBE0D3] text-xs font-semibold text-[#26352E] hover:bg-[#F2F9F4] whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {!data ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-white border border-[#DDECE3] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <AdminOverviewPanel
                  health={data.health}
                  appointments={data.appointments}
                  customers={data.customers}
                  services={data.services}
                  doctors={data.doctors}
                  departments={data.departments}
                  onNavigateTab={(t) => setActiveTab(t as AdminTab)}
                />
              )}

              {activeTab === 'appointments' && (
                <AdminAppointmentsPanel
                  appointments={data.appointments}
                  onUpdateStatus={async (id, patch) => {
                    await api.updateAppointment(adminToken, id, patch);
                    await syncAfterMutation('Appointment updated.');
                  }}
                />
              )}

              {activeTab === 'calendar' && (
                <AdminCalendarPanel appointments={data.appointments} />
              )}

              {activeTab === 'doctors' && (
                <AdminDoctorsPanel
                  doctors={data.doctors}
                  departments={data.departments}
                  onCreate={async (payload) => {
                    await api.createDoctor(adminToken, payload);
                    await syncAfterMutation('Doctor profile created.');
                  }}
                  onUpdate={async (id, patch) => {
                    await api.updateDoctor(adminToken, id, patch);
                    await syncAfterMutation('Doctor profile updated.');
                  }}
                  onDelete={async (id) => {
                    await api.deleteDoctor(adminToken, id);
                    await syncAfterMutation('Doctor profile deleted.');
                  }}
                />
              )}

              {activeTab === 'services' && (
                <AdminServicesPanel
                  services={data.services}
                  departments={data.departments}
                  onCreate={async (payload) => {
                    await api.createService(adminToken, payload);
                    await syncAfterMutation('Service created.');
                  }}
                  onUpdate={async (id, patch) => {
                    await api.updateService(adminToken, id, patch);
                    await syncAfterMutation('Service updated.');
                  }}
                  onDelete={async (id) => {
                    await api.deleteService(adminToken, id);
                    await syncAfterMutation('Service removed.');
                  }}
                />
              )}

              {activeTab === 'customers' && (
                <AdminCustomersPanel
                  customers={data.customers}
                  appointments={data.appointments}
                />
              )}

              {activeTab === 'hours' && (
                <AdminBusinessHoursPanel
                  businessHours={data.businessHours}
                  onSave={async (hours) => {
                    await api.saveBusinessHours(adminToken, hours);
                    await syncAfterMutation('Business hours schedule saved.');
                  }}
                />
              )}

              {activeTab === 'blocked' && (
                <AdminBlockedDatesPanel
                  blockedDates={data.blockedDates}
                  doctors={data.doctors}
                  onCreate={async (payload) => {
                    await api.createBlockedDate(adminToken, payload);
                    await syncAfterMutation('Blocked date / holiday added.');
                  }}
                  onToggleActive={async (id, is_active) => {
                    await api.updateBlockedDate(adminToken, id, { is_active });
                    await syncAfterMutation(is_active ? 'Date re-blocked.' : 'Date restored.');
                  }}
                  onDelete={async (id) => {
                    await api.deleteBlockedDate(adminToken, id);
                    await syncAfterMutation('Blocked date deleted.');
                  }}
                />
              )}

              {activeTab === 'gallery' && (
                <AdminGalleryPanel
                  gallery={data.gallery}
                  storageConnected={data.health.storageConnected}
                  onUploadFile={handleFileUpload}
                  onCreate={async (payload) => {
                    await api.createGalleryItem(adminToken, payload);
                    await syncAfterMutation('Photograph added to gallery.');
                  }}
                  onUpdate={async (id, patch) => {
                    await api.updateGalleryItem(adminToken, id, patch);
                    await syncAfterMutation('Gallery item updated.');
                  }}
                  onDelete={async (id) => {
                    await api.deleteGalleryItem(adminToken, id);
                    await syncAfterMutation('Gallery item deleted.');
                  }}
                />
              )}

              {activeTab === 'content' && (
                <AdminContentPanel
                  settings={data.settings}
                  onSave={async (next) => {
                    await api.saveSiteSettings(adminToken, next);
                    await syncAfterMutation('Website content published.');
                  }}
                />
              )}

              {activeTab === 'notifications' && (
                <AdminNotificationsPanel
                  notifications={data.notifications}
                  health={data.health}
                  onMarkRead={async (id) => {
                    await api.markNotificationRead(adminToken, id);
                    await loadDashboard();
                  }}
                />
              )}

              {activeTab === 'settings' && (
                <AdminSettingsAndDatabasePanel
                  health={data.health}
                  onLoadInspector={() => api.getDatabaseInspector(adminToken)}
                  onSeedSupabase={async () => {
                    const res = await api.seedSupabaseCatalog(adminToken);
                    await syncAfterMutation(res.summary);
                  }}
                />
              )}

              {activeTab === 'profile' && (
                <AdminProfilePanel
                  profile={adminProfile}
                  onSaveProfile={async (payload) => {
                    const updated = await api.updateAdminProfile(adminToken, payload);
                    setAdminSession(adminToken, updated);
                    pushToast('success', 'Administrator profile updated.');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
