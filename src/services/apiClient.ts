import type {
  AdminProfile,
  Appointment,
  AppointmentCategory,
  AppointmentStatus,
  BackendHealthStatus,
  BlockedDate,
  BusinessHour,
  Customer,
  Department,
  Doctor,
  GalleryItem,
  NotificationLog,
  PublicSitePayload,
  ServiceItem,
  SiteContentSettings,
  TimeSlotOption,
} from '../lib/types';
import { staticApiFallback } from './staticApiFallback';

class StaticHostFallbackSignal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaticHostFallbackSignal';
  }
}

let useStaticFallback = false;

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  if (useStaticFallback) {
    throw new StaticHostFallbackSignal('Static host mode active');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    useStaticFallback = true;
    throw new StaticHostFallbackSignal('Backend API unreachable');
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');

  // On static hosts (e.g., Netlify Drop / SPA redirect without Functions),
  // /api/* returns 200 OK with text/html (index.html) or 404/405/502 non-JSON.
  if (!isJson) {
    useStaticFallback = true;
    throw new StaticHostFallbackSignal(`Non-JSON response (${res.status}) from ${url}`);
  }

  const data = await res.json().catch(() => null);
  if (data === null) {
    useStaticFallback = true;
    throw new StaticHostFallbackSignal(`Malformed JSON response from ${url}`);
  }

  if (!res.ok) {
    // If Netlify Functions returned a 404/502 without our API error JSON shape, fall back cleanly
    if ((res.status === 404 || res.status === 502 || res.status === 503) && !data?.error) {
      useStaticFallback = true;
      throw new StaticHostFallbackSignal(`Unavailable API endpoint (${res.status})`);
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data as T;
}

async function withFallback<T>(
  remoteCall: () => Promise<T>,
  fallbackCall: () => Promise<T>
): Promise<T> {
  try {
    return await remoteCall();
  } catch (err) {
    if (err instanceof StaticHostFallbackSignal) {
      return fallbackCall();
    }
    throw err;
  }
}

export const api = {
  getPublicBootstrap: () =>
    withFallback(
      () => apiFetch<PublicSitePayload>('/api/public/bootstrap'),
      () => staticApiFallback.getPublicBootstrap()
    ),

  getAvailableSlots: (params: {
    category: AppointmentCategory;
    date: string;
    serviceId?: string;
    doctorId?: string;
  }) => {
    const q = new URLSearchParams({
      category: params.category,
      date: params.date,
    });
    if (params.serviceId) q.set('serviceId', params.serviceId);
    if (params.doctorId) q.set('doctorId', params.doctorId);
    return withFallback(
      () =>
        apiFetch<{
          date: string;
          timezone: string;
          isBlocked: boolean;
          blockReason?: string;
          slots: TimeSlotOption[];
        }>(`/api/public/slots?${q.toString()}`),
      () => staticApiFallback.getAvailableSlots(params)
    );
  },

  submitBooking: (payload: {
    category: AppointmentCategory;
    department_id?: string | null;
    service_id: string;
    doctor_id?: string | null;
    appointment_date: string;
    appointment_time: string;
    full_name: string;
    mobile_number: string;
    email?: string | null;
    age?: number | null;
    customer_message?: string | null;
  }) =>
    withFallback(
      () =>
        apiFetch<{
          booking_reference: string;
          status: AppointmentStatus;
          appointment_date: string;
          appointment_time: string;
          timezone: string;
          service_name: string | null;
          doctor_name: string | null;
          category: AppointmentCategory;
          notificationChannels: { in_app: string; email: string; whatsapp: string; sms: string };
          backendMode: 'supabase' | 'local_preview';
        }>('/api/bookings', { method: 'POST', body: JSON.stringify(payload) }),
      () => staticApiFallback.submitBooking(payload)
    ),

  lookupBooking: (booking_reference: string, mobile_number: string) =>
    withFallback(
      () =>
        apiFetch<{
          booking_reference: string;
          status: AppointmentStatus;
          appointment_date: string;
          appointment_time: string;
          timezone: string;
          service_name: string | null;
          doctor_name: string | null;
          category: AppointmentCategory;
        }>('/api/bookings/lookup', {
          method: 'POST',
          body: JSON.stringify({ booking_reference, mobile_number }),
        }),
      () => staticApiFallback.lookupBooking(booking_reference, mobile_number)
    ),

  submitEnquiry: (payload: {
    full_name: string;
    mobile_number: string;
    subject: string;
    message: string;
  }) =>
    withFallback(
      () =>
        apiFetch<{ ok: boolean }>('/api/contact/enquiry', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      () => staticApiFallback.submitEnquiry(payload)
    ),

  // Auth
  getAuthStatus: (token?: string | null) =>
    withFallback(
      () =>
        apiFetch<{
          authenticated: boolean;
          profile: AdminProfile | null;
          health: BackendHealthStatus;
        }>('/api/auth/status', {}, token),
      () => staticApiFallback.getAuthStatus(token)
    ),

  claimAdmin: (payload: { email: string; full_name: string; password: string }) =>
    withFallback(
      () =>
        apiFetch<{ token: string; profile: AdminProfile }>('/api/auth/claim-admin', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      () => staticApiFallback.claimAdmin(payload)
    ),

  loginAdmin: (payload: { email: string; password: string }) =>
    withFallback(
      () =>
        apiFetch<{ token: string; profile: AdminProfile }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      () => staticApiFallback.loginAdmin(payload)
    ),

  resetAdminPassword: (email: string) =>
    withFallback(
      () =>
        apiFetch<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        }),
      () => staticApiFallback.resetAdminPassword(email)
    ),

  // Protected Admin Endpoints
  getAdminDashboard: (token: string) =>
    withFallback(
      () =>
        apiFetch<{
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
        }>('/api/admin/dashboard', {}, token),
      () => staticApiFallback.getAdminDashboard(token)
    ),

  updateAppointment: (
    token: string,
    id: string,
    patch: { status?: AppointmentStatus; admin_notes?: string }
  ) =>
    withFallback(
      () =>
        apiFetch<Appointment>(
          `/api/admin/appointments/${id}`,
          { method: 'PATCH', body: JSON.stringify(patch) },
          token
        ),
      () => staticApiFallback.updateAppointment(token, id, patch)
    ),

  createService: (token: string, payload: Omit<ServiceItem, 'id'>) =>
    withFallback(
      () =>
        apiFetch<ServiceItem>(
          '/api/admin/services',
          { method: 'POST', body: JSON.stringify(payload) },
          token
        ),
      () => staticApiFallback.createService(token, payload)
    ),

  updateService: (token: string, id: string, patch: Partial<ServiceItem>) =>
    withFallback(
      () =>
        apiFetch<ServiceItem>(
          `/api/admin/services/${id}`,
          { method: 'PATCH', body: JSON.stringify(patch) },
          token
        ),
      () => staticApiFallback.updateService(token, id, patch)
    ),

  deleteService: (token: string, id: string) =>
    withFallback(
      () => apiFetch<{ ok: boolean }>(`/api/admin/services/${id}`, { method: 'DELETE' }, token),
      () => staticApiFallback.deleteService(token, id)
    ),

  createDoctor: (token: string, payload: Omit<Doctor, 'id'>) =>
    withFallback(
      () =>
        apiFetch<Doctor>(
          '/api/admin/doctors',
          { method: 'POST', body: JSON.stringify(payload) },
          token
        ),
      () => staticApiFallback.createDoctor(token, payload)
    ),

  updateDoctor: (token: string, id: string, patch: Partial<Doctor>) =>
    withFallback(
      () =>
        apiFetch<Doctor>(
          `/api/admin/doctors/${id}`,
          { method: 'PATCH', body: JSON.stringify(patch) },
          token
        ),
      () => staticApiFallback.updateDoctor(token, id, patch)
    ),

  deleteDoctor: (token: string, id: string) =>
    withFallback(
      () => apiFetch<{ ok: boolean }>(`/api/admin/doctors/${id}`, { method: 'DELETE' }, token),
      () => staticApiFallback.deleteDoctor(token, id)
    ),

  saveBusinessHours: (token: string, hours: BusinessHour[]) =>
    withFallback(
      () =>
        apiFetch<BusinessHour[]>(
          '/api/admin/business-hours',
          { method: 'PUT', body: JSON.stringify(hours) },
          token
        ),
      () => staticApiFallback.saveBusinessHours(token, hours)
    ),

  createBlockedDate: (token: string, payload: Omit<BlockedDate, 'id'>) =>
    withFallback(
      () =>
        apiFetch<BlockedDate>(
          '/api/admin/blocked-dates',
          { method: 'POST', body: JSON.stringify(payload) },
          token
        ),
      () => staticApiFallback.createBlockedDate(token, payload)
    ),

  updateBlockedDate: (token: string, id: string, patch: Partial<BlockedDate>) =>
    withFallback(
      () =>
        apiFetch<BlockedDate>(
          `/api/admin/blocked-dates/${id}`,
          { method: 'PATCH', body: JSON.stringify(patch) },
          token
        ),
      () => staticApiFallback.updateBlockedDate(token, id, patch)
    ),

  deleteBlockedDate: (token: string, id: string) =>
    withFallback(
      () =>
        apiFetch<{ ok: boolean }>(`/api/admin/blocked-dates/${id}`, { method: 'DELETE' }, token),
      () => staticApiFallback.deleteBlockedDate(token, id)
    ),

  createGalleryItem: (token: string, payload: Omit<GalleryItem, 'id'>) =>
    withFallback(
      () =>
        apiFetch<GalleryItem>(
          '/api/admin/gallery',
          { method: 'POST', body: JSON.stringify(payload) },
          token
        ),
      () => staticApiFallback.createGalleryItem(token, payload)
    ),

  updateGalleryItem: (token: string, id: string, patch: Partial<GalleryItem>) =>
    withFallback(
      () =>
        apiFetch<GalleryItem>(
          `/api/admin/gallery/${id}`,
          { method: 'PATCH', body: JSON.stringify(patch) },
          token
        ),
      () => staticApiFallback.updateGalleryItem(token, id, patch)
    ),

  deleteGalleryItem: (token: string, id: string) =>
    withFallback(
      () => apiFetch<{ ok: boolean }>(`/api/admin/gallery/${id}`, { method: 'DELETE' }, token),
      () => staticApiFallback.deleteGalleryItem(token, id)
    ),

  uploadGalleryImage: (
    token: string,
    payload: {
      fileName: string;
      contentType: 'image/jpeg' | 'image/png' | 'image/webp';
      base64Data: string;
    }
  ) =>
    withFallback(
      () =>
        apiFetch<{ image_url: string; storage_path: string | null }>(
          '/api/admin/gallery/upload',
          { method: 'POST', body: JSON.stringify(payload) },
          token
        ),
      () => staticApiFallback.uploadGalleryImage(token, payload)
    ),

  saveSiteSettings: (token: string, settings: SiteContentSettings) =>
    withFallback(
      () =>
        apiFetch<SiteContentSettings>(
          '/api/admin/settings',
          { method: 'PUT', body: JSON.stringify(settings) },
          token
        ),
      () => staticApiFallback.saveSiteSettings(token, settings)
    ),

  markNotificationRead: (token: string, id: string) =>
    withFallback(
      () =>
        apiFetch<{ ok: boolean }>(`/api/admin/notifications/${id}/read`, { method: 'PATCH' }, token),
      () => staticApiFallback.markNotificationRead(token, id)
    ),

  getDatabaseInspector: (token: string) =>
    withFallback(
      () =>
        apiFetch<{
          mode: 'supabase' | 'local_preview';
          tables: Array<{ name: string; count: number; sample: any[] }>;
        }>('/api/admin/database', {}, token),
      () => staticApiFallback.getDatabaseInspector(token)
    ),

  seedSupabaseCatalog: (token: string) =>
    withFallback(
      () =>
        apiFetch<{ seeded: boolean; summary: string }>(
          '/api/admin/database/seed',
          { method: 'POST' },
          token
        ),
      () => staticApiFallback.seedSupabaseCatalog(token)
    ),

  updateAdminProfile: (
    token: string,
    payload: { full_name?: string; phone?: string; new_password?: string }
  ) =>
    withFallback(
      () =>
        apiFetch<AdminProfile>(
          '/api/admin/profile',
          { method: 'PATCH', body: JSON.stringify(payload) },
          token
        ),
      () => staticApiFallback.updateAdminProfile(token, payload)
    ),
};
