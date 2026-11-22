import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
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
  ServiceItem,
  SiteContentSettings,
  TimeSlotOption,
} from '../lib/types';
import {
  CLINIC_TIMEZONE,
  DAY_NAMES_EN,
  formatTime12h,
  getCurrentMinutesIST,
  getDayOfWeekFromDateString,
  getTodayIST,
  minutesToTime,
  timeToMinutes,
} from '../lib/timezone';
import {
  DEFAULT_SITE_SETTINGS,
  INITIAL_BUSINESS_HOURS,
  INITIAL_DEPARTMENTS,
  INITIAL_DOCTORS,
  INITIAL_GALLERY,
  INITIAL_SERVICES,
} from './seedData';

const SESSION_SIGNING_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface LocalAdminAccount {
  id: string;
  email: string;
  full_name: string;
  role: 'admin';
  phone?: string;
  passwordSalt: string;
  passwordHash: string;
}

/**
 * Runtime preview store used ONLY when Supabase credentials are not yet supplied.
 * Notice: customers, appointments, and notifications start completely EMPTY.
 * Never fabricates demo bookings or fake customer records.
 */
const previewStore: {
  settings: SiteContentSettings;
  departments: Department[];
  services: ServiceItem[];
  doctors: Doctor[];
  businessHours: BusinessHour[];
  blockedDates: BlockedDate[];
  customers: Customer[];
  appointments: Appointment[];
  gallery: GalleryItem[];
  notifications: NotificationLog[];
  localAdmin: LocalAdminAccount | null;
} = {
  settings: structuredClone(DEFAULT_SITE_SETTINGS),
  departments: structuredClone(INITIAL_DEPARTMENTS),
  services: structuredClone(INITIAL_SERVICES),
  doctors: structuredClone(INITIAL_DOCTORS),
  businessHours: structuredClone(INITIAL_BUSINESS_HOURS),
  blockedDates: [],
  customers: [],
  appointments: [],
  gallery: structuredClone(INITIAL_GALLERY),
  notifications: [],
  localAdmin: null,
};

let adminSupabaseClient: SupabaseClient | null = null;
let publicSupabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SECRET_KEY &&
      process.env.SUPABASE_URL.startsWith('http')
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!adminSupabaseClient) {
    adminSupabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return adminSupabaseClient;
}

export function getSupabasePublic(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith('http')) return null;
  if (!publicSupabaseClient) {
    publicSupabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return publicSupabaseClient;
}

export function getNotificationProviderStatus() {
  return {
    email: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    whatsapp: Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    sms: Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER_ID),
  };
}

export function getBackendHealth(): BackendHealthStatus {
  const connected = isSupabaseConfigured();
  const hasPasscodeOverride = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.length >= 6);
  return {
    supabaseConnected: connected,
    storageConnected: connected,
    mode: connected ? 'supabase' : 'local_preview',
    timezone: CLINIC_TIMEZONE,
    adminInitialized: connected || hasPasscodeOverride || previewStore.localAdmin !== null,
    authMode: connected ? 'supabase_auth' : 'local_claim',
    notificationProviders: getNotificationProviderStatus(),
  };
}

export async function getBackendHealthAsync(): Promise<BackendHealthStatus> {
  const base = getBackendHealth();
  const sbAdmin = getSupabaseAdmin();
  if (sbAdmin) {
    const { count, error } = await sbAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);
    if (!error) {
      return {
        ...base,
        adminInitialized: (count ?? 0) > 0,
      };
    }
  }
  return base;
}

// ============================================================================
// CRYPTO & SESSION HELPERS (Local preview admin claim / Bearer token verification)
// ============================================================================

function hashPasswordScrypt(password: string, salt?: string): { salt: string; hash: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

function verifyPasswordScrypt(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPasswordScrypt(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signLocalToken(profile: AdminProfile): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  return `local.${payload}.${sig}`;
}

export function verifyLocalToken(token: string): AdminProfile | null {
  if (!token.startsWith('local.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    if (data.role !== 'admin') return null;
    return {
      id: data.sub,
      email: data.email,
      full_name: data.full_name,
      role: 'admin',
    };
  } catch {
    return null;
  }
}

export async function claimLocalAdmin(email: string, fullName: string, password: string): Promise<{ token: string; profile: AdminProfile }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();

  const sbAdmin = getSupabaseAdmin();
  const sbPublic = getSupabasePublic();
  if (sbAdmin && sbPublic) {
    // Strictly enforce 1-of-1 Single Admin Slot in Supabase PostgreSQL
    const { count, error: countErr } = await sbAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    if (countErr) {
      throw new Error(countErr.message);
    }
    if ((count ?? 0) > 0) {
      const err = new Error(
        'The single administrator slot has already been claimed. Nobody else can create an admin account.'
      );
      (err as any).statusCode = 403;
      throw err;
    }

    const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: cleanName },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || 'Unable to create administrator account.');
    }

    const { error: profErr } = await sbAdmin.from('profiles').insert({
      id: created.user.id,
      email: normalizedEmail,
      full_name: cleanName,
      role: 'admin',
      is_active: true,
    });
    if (profErr) {
      // Clean up auth user if unique single-admin constraint rejected a concurrent race
      await sbAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      const err = new Error(
        'The single administrator slot has already been claimed. Nobody else can create an admin account.'
      );
      (err as any).statusCode = 403;
      throw err;
    }

    const { data: sessionData, error: loginErr } = await sbPublic.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (loginErr || !sessionData.session) {
      throw new Error(loginErr?.message || 'Admin created, please sign in with your credentials.');
    }

    return {
      token: sessionData.session.access_token,
      profile: {
        id: created.user.id,
        email: normalizedEmail,
        full_name: cleanName,
        role: 'admin',
      },
    };
  }

  if (process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.length >= 6) {
    const err = new Error('Administrator account is already locked via server environment.');
    (err as any).statusCode = 403;
    throw err;
  }
  if (previewStore.localAdmin) {
    const err = new Error(
      'The single administrator slot has already been claimed. Nobody else can create an admin account.'
    );
    (err as any).statusCode = 403;
    throw err;
  }
  const { salt, hash } = hashPasswordScrypt(password);
  const account: LocalAdminAccount = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    full_name: cleanName,
    role: 'admin',
    passwordSalt: salt,
    passwordHash: hash,
  };
  previewStore.localAdmin = account;
  const profile: AdminProfile = {
    id: account.id,
    email: account.email,
    full_name: account.full_name,
    role: 'admin',
  };
  return { token: signLocalToken(profile), profile };
}

export async function loginAdmin(email: string, password: string): Promise<{ token: string; profile: AdminProfile }> {
  const sbAdmin = getSupabaseAdmin();
  const sbPublic = getSupabasePublic();

  if (sbAdmin && sbPublic) {
    const { data, error } = await sbPublic.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.session || !data.user) {
      throw new Error(error?.message || 'Invalid administrator email or password.');
    }
    const { data: prof, error: profErr } = await sbAdmin
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active')
      .eq('id', data.user.id)
      .single();

    if (profErr || !prof || prof.role !== 'admin' || !prof.is_active) {
      throw new Error('This account does not have active administrator permissions.');
    }

    return {
      token: data.session.access_token,
      profile: {
        id: prof.id,
        email: prof.email,
        full_name: prof.full_name,
        role: prof.role,
        phone: prof.phone,
      },
    };
  }

  // Local preview mode (when Supabase credentials are not yet configured)
  const envPasscode = process.env.ADMIN_PASSCODE;
  if (envPasscode && envPasscode.length >= 6) {
    const a = Buffer.from(password);
    const b = Buffer.from(envPasscode);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('Invalid administrator credentials.');
    }
    const profile: AdminProfile = {
      id: 'env-admin',
      email: email.trim().toLowerCase() || 'admin@newlifekalimpong.in',
      full_name: 'Bijay Gupta',
      role: 'admin',
    };
    return { token: signLocalToken(profile), profile };
  }

  if (!previewStore.localAdmin) {
    throw new Error('Administrator account not initialized yet. Please complete first-run admin setup.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedEmail !== previewStore.localAdmin.email ||
    !verifyPasswordScrypt(password, previewStore.localAdmin.passwordSalt, previewStore.localAdmin.passwordHash)
  ) {
    throw new Error('Invalid administrator email or password.');
  }

  const profile: AdminProfile = {
    id: previewStore.localAdmin.id,
    email: previewStore.localAdmin.email,
    full_name: previewStore.localAdmin.full_name,
    role: 'admin',
    phone: previewStore.localAdmin.phone,
  };
  return { token: signLocalToken(profile), profile };
}

export async function verifyAdminBearerToken(token: string | undefined): Promise<AdminProfile | null> {
  if (!token) return null;
  const sbAdmin = getSupabaseAdmin();
  if (sbAdmin) {
    const { data, error } = await sbAdmin.auth.getUser(token);
    if (error || !data.user) return null;
    const { data: prof } = await sbAdmin
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active')
      .eq('id', data.user.id)
      .single();
    if (!prof || prof.role !== 'admin' || !prof.is_active) return null;
    return {
      id: prof.id,
      email: prof.email,
      full_name: prof.full_name,
      role: prof.role,
      phone: prof.phone,
    };
  }
  return verifyLocalToken(token);
}

export async function updateAdminProfile(
  admin: AdminProfile,
  updates: { full_name?: string; phone?: string; new_password?: string }
): Promise<AdminProfile> {
  const sbAdmin = getSupabaseAdmin();
  if (sbAdmin) {
    if (updates.new_password) {
      const { error: pwErr } = await sbAdmin.auth.admin.updateUserById(admin.id, {
        password: updates.new_password,
      });
      if (pwErr) throw new Error(pwErr.message);
    }
    const { data, error } = await sbAdmin
      .from('profiles')
      .update({
        full_name: updates.full_name ?? admin.full_name,
        phone: updates.phone ?? admin.phone ?? null,
      })
      .eq('id', admin.id)
      .select('id, email, full_name, role, phone')
      .single();
    if (error) throw new Error(error.message);
    return data as AdminProfile;
  }

  if (previewStore.localAdmin) {
    if (updates.full_name) previewStore.localAdmin.full_name = updates.full_name;
    if (updates.phone !== undefined) previewStore.localAdmin.phone = updates.phone;
    if (updates.new_password) {
      const { salt, hash } = hashPasswordScrypt(updates.new_password);
      previewStore.localAdmin.passwordSalt = salt;
      previewStore.localAdmin.passwordHash = hash;
    }
    return {
      id: previewStore.localAdmin.id,
      email: previewStore.localAdmin.email,
      full_name: previewStore.localAdmin.full_name,
      role: 'admin',
      phone: previewStore.localAdmin.phone,
    };
  }
  return { ...admin, full_name: updates.full_name ?? admin.full_name, phone: updates.phone };
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const sbPublic = getSupabasePublic();
  if (sbPublic) {
    const redirectTo = process.env.APP_URL ? `${process.env.APP_URL}/admin/login` : undefined;
    const { error } = await sbPublic.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw new Error(error.message);
    return { message: 'If an administrator account matches that email, a Supabase password reset link has been sent.' };
  }
  return {
    message:
      'Password reset emails require Supabase Auth to be connected. In local preview mode, update your password inside Admin Profile or configure ADMIN_PASSCODE in server secrets.',
  };
}

// ============================================================================
// DATA ACCESS REPOSITORY (Supabase PostgreSQL primary, preview store fallback)
// ============================================================================

export async function getSiteSettings(): Promise<SiteContentSettings> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from('site_settings')
      .select('value')
      .eq('key', 'site_content')
      .maybeSingle();
    if (data?.value) {
      return { ...DEFAULT_SITE_SETTINGS, ...(data.value as Partial<SiteContentSettings>) };
    }
  }
  return previewStore.settings;
}

export async function saveSiteSettings(settings: SiteContentSettings): Promise<SiteContentSettings> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { error } = await sb
      .from('site_settings')
      .upsert({ key: 'site_content', value: settings }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return settings;
  }
  previewStore.settings = settings;
  return previewStore.settings;
}

export async function listDepartments(onlyActive = false): Promise<Department[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    let q = sb.from('departments').select('*').order('display_order', { ascending: true });
    if (onlyActive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as Department[];
  }
  return previewStore.departments
    .filter((d) => (!onlyActive ? true : d.is_active))
    .sort((a, b) => a.display_order - b.display_order);
}

export async function listServices(onlyActive = false): Promise<ServiceItem[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    let q = sb.from('services').select('*').order('display_order', { ascending: true });
    if (onlyActive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as ServiceItem[];
  }
  return previewStore.services
    .filter((s) => (!onlyActive ? true : s.is_active))
    .sort((a, b) => a.display_order - b.display_order);
}

export async function createService(input: Omit<ServiceItem, 'id'>): Promise<ServiceItem> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('services').insert(input).select('*').single();
    if (error) throw new Error(error.message);
    return data as ServiceItem;
  }
  const item: ServiceItem = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  previewStore.services.push(item);
  return item;
}

export async function updateService(id: string, patch: Partial<ServiceItem>): Promise<ServiceItem> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('services').update(patch).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return data as ServiceItem;
  }
  const idx = previewStore.services.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Service not found.');
  previewStore.services[idx] = {
    ...previewStore.services[idx],
    ...patch,
    id,
    updated_at: new Date().toISOString(),
  };
  return previewStore.services[idx];
}

export async function deleteService(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { error } = await sb.from('services').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  previewStore.services = previewStore.services.filter((s) => s.id !== id);
}

export async function listDoctors(onlyPublished = false): Promise<Doctor[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    let q = sb.from('doctors').select('*').order('display_order', { ascending: true });
    if (onlyPublished) q = q.eq('is_verified', true).eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as Doctor[];
  }
  return previewStore.doctors
    .filter((d) => (!onlyPublished ? true : d.is_verified && d.is_active))
    .sort((a, b) => a.display_order - b.display_order);
}

export async function createDoctor(input: Omit<Doctor, 'id'>): Promise<Doctor> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('doctors').insert(input).select('*').single();
    if (error) throw new Error(error.message);
    return data as Doctor;
  }
  const doc: Doctor = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  previewStore.doctors.push(doc);
  return doc;
}

export async function updateDoctor(id: string, patch: Partial<Doctor>): Promise<Doctor> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('doctors').update(patch).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return data as Doctor;
  }
  const idx = previewStore.doctors.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error('Doctor record not found.');
  previewStore.doctors[idx] = {
    ...previewStore.doctors[idx],
    ...patch,
    id,
    updated_at: new Date().toISOString(),
  };
  return previewStore.doctors[idx];
}

export async function deleteDoctor(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { error } = await sb.from('doctors').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  previewStore.doctors = previewStore.doctors.filter((d) => d.id !== id);
}

export async function listBusinessHours(): Promise<BusinessHour[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('business_hours')
      .select('*')
      .order('schedule_type', { ascending: true })
      .order('day_of_week', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as BusinessHour[];
  }
  return previewStore.businessHours;
}

export async function saveBusinessHours(hours: BusinessHour[]): Promise<BusinessHour[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { error } = await sb
      .from('business_hours')
      .upsert(hours, { onConflict: 'schedule_type,day_of_week' });
    if (error) throw new Error(error.message);
    return listBusinessHours();
  }
  previewStore.businessHours = hours;
  return previewStore.businessHours;
}

export async function listBlockedDates(onlyActive = false): Promise<BlockedDate[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    let q = sb.from('blocked_dates').select('*').order('block_date', { ascending: true });
    if (onlyActive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as BlockedDate[];
  }
  return previewStore.blockedDates
    .filter((b) => (!onlyActive ? true : b.is_active))
    .sort((a, b) => a.block_date.localeCompare(b.block_date));
}

export async function createBlockedDate(input: Omit<BlockedDate, 'id'>): Promise<BlockedDate> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('blocked_dates').insert(input).select('*').single();
    if (error) throw new Error(error.message);
    return data as BlockedDate;
  }
  const item: BlockedDate = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  previewStore.blockedDates.push(item);
  return item;
}

export async function updateBlockedDate(id: string, patch: Partial<BlockedDate>): Promise<BlockedDate> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('blocked_dates').update(patch).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return data as BlockedDate;
  }
  const idx = previewStore.blockedDates.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Blocked date not found.');
  previewStore.blockedDates[idx] = { ...previewStore.blockedDates[idx], ...patch, id };
  return previewStore.blockedDates[idx];
}

export async function deleteBlockedDate(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { error } = await sb.from('blocked_dates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  previewStore.blockedDates = previewStore.blockedDates.filter((b) => b.id !== id);
}

export async function listGallery(onlyPublished = false): Promise<GalleryItem[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    let q = sb.from('gallery').select('*').order('display_order', { ascending: true });
    if (onlyPublished) q = q.eq('is_published', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GalleryItem[];
  }
  return previewStore.gallery
    .filter((g) => (!onlyPublished ? true : g.is_published))
    .sort((a, b) => a.display_order - b.display_order);
}

export async function createGalleryItem(input: Omit<GalleryItem, 'id'>): Promise<GalleryItem> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('gallery').insert(input).select('*').single();
    if (error) throw new Error(error.message);
    return data as GalleryItem;
  }
  const item: GalleryItem = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  previewStore.gallery.push(item);
  return item;
}

export async function updateGalleryItem(id: string, patch: Partial<GalleryItem>): Promise<GalleryItem> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb.from('gallery').update(patch).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    return data as GalleryItem;
  }
  const idx = previewStore.gallery.findIndex((g) => g.id === id);
  if (idx === -1) throw new Error('Gallery item not found.');
  previewStore.gallery[idx] = { ...previewStore.gallery[idx], ...patch, id };
  return previewStore.gallery[idx];
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data: existing } = await sb.from('gallery').select('storage_path').eq('id', id).maybeSingle();
    if (existing?.storage_path) {
      await sb.storage.from('clinic-gallery').remove([existing.storage_path]);
    }
    const { error } = await sb.from('gallery').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  previewStore.gallery = previewStore.gallery.filter((g) => g.id !== id);
}

export async function uploadGalleryImage(
  fileName: string,
  contentType: string,
  base64Data: string
): Promise<{ image_url: string; storage_path: string | null }> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    throw new Error('Supabase Storage is not connected yet. Configure SUPABASE_URL and SUPABASE_SECRET_KEY to upload files, or add an image URL.');
  }
  const safeExt =
    contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const cleanName = fileName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'clinic-photo';
  const storagePath = `uploads/${Date.now()}-${cleanName}.${safeExt}`;
  const buffer = Buffer.from(base64Data, 'base64');

  const { error } = await sb.storage.from('clinic-gallery').upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = sb.storage.from('clinic-gallery').getPublicUrl(storagePath);
  return { image_url: data.publicUrl, storage_path: storagePath };
}

export async function listNotifications(): Promise<NotificationLog[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data || []) as NotificationLog[];
  }
  return [...previewStore.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function recordNotification(
  input: Omit<NotificationLog, 'id' | 'created_at' | 'is_read'>
): Promise<NotificationLog> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('notifications')
      .insert({ ...input, is_read: false })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as NotificationLog;
  }
  const log: NotificationLog = {
    ...input,
    id: crypto.randomUUID(),
    is_read: false,
    created_at: new Date().toISOString(),
  };
  previewStore.notifications.unshift(log);
  return log;
}

export async function markNotificationRead(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb) {
    await sb.from('notifications').update({ is_read: true }).eq('id', id);
    return;
  }
  const n = previewStore.notifications.find((x) => x.id === id);
  if (n) n.is_read = true;
}

export async function listCustomers(): Promise<Customer[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as Customer[];
  }
  return [...previewStore.customers].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listAppointmentsEnriched(): Promise<Appointment[]> {
  const [departments, services, doctors] = await Promise.all([
    listDepartments(false),
    listServices(false),
    listDoctors(false),
  ]);
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const servMap = new Map(services.map((s) => [s.id, s.name]));
  const docMap = new Map(doctors.map((d) => [d.id, d.full_name]));

  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('appointments')
      .select('*, customer:customers(*)')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      ...row,
      department_name: row.department_id ? deptMap.get(row.department_id) || null : null,
      service_name: row.service_id ? servMap.get(row.service_id) || null : null,
      doctor_name: row.doctor_id ? docMap.get(row.doctor_id) || null : null,
    }));
  }

  const custMap = new Map(previewStore.customers.map((c) => [c.id, c]));
  return [...previewStore.appointments]
    .sort((a, b) => `${b.appointment_date}T${b.appointment_time}`.localeCompare(`${a.appointment_date}T${a.appointment_time}`))
    .map((row) => ({
      ...row,
      customer: custMap.get(row.customer_id) || null,
      department_name: row.department_id ? deptMap.get(row.department_id) || null : null,
      service_name: row.service_id ? servMap.get(row.service_id) || null : null,
      doctor_name: row.doctor_id ? docMap.get(row.doctor_id) || null : null,
    }));
}

// ============================================================================
// SLOT ENGINE & ATOMIC APPOINTMENT CREATION (ASIA/KOLKATA)
// ============================================================================

async function getActiveBookingsForDate(date: string): Promise<Appointment[]> {
  const sb = getSupabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from('appointments')
      .select('*')
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed']);
    if (error) throw new Error(error.message);
    return (data || []) as Appointment[];
  }
  return previewStore.appointments.filter(
    (a) => a.appointment_date === date && (a.status === 'pending' || a.status === 'confirmed')
  );
}

export async function computeAvailableSlots(params: {
  category: AppointmentCategory;
  serviceId?: string | null;
  doctorId?: string | null;
  date: string;
}): Promise<{
  date: string;
  timezone: string;
  isBlocked: boolean;
  blockReason?: string;
  slots: TimeSlotOption[];
}> {
  const todayIST = getTodayIST();
  if (params.date < todayIST) {
    return {
      date: params.date,
      timezone: CLINIC_TIMEZONE,
      isBlocked: true,
      blockReason: 'Past dates cannot be booked.',
      slots: [],
    };
  }

  const [hours, blockedDates, doctors, activeBookings] = await Promise.all([
    listBusinessHours(),
    listBlockedDates(true),
    listDoctors(false),
    getActiveBookingsForDate(params.date),
  ]);

  // 1. Check full-day blocks
  const matchingBlocks = blockedDates.filter((b) => {
    if (b.block_date !== params.date || !b.is_active) return false;
    if (b.scope === 'all') return true;
    if (b.scope === params.category) return true;
    if (b.scope === 'doctor' && params.doctorId && b.doctor_id === params.doctorId) return true;
    return false;
  });

  const fullDayBlock = matchingBlocks.find((b) => b.is_full_day);
  if (fullDayBlock) {
    return {
      date: params.date,
      timezone: CLINIC_TIMEZONE,
      isBlocked: true,
      blockReason: fullDayBlock.reason || 'Clinic closed on this date.',
      slots: [],
    };
  }

  const dayOfWeek = getDayOfWeekFromDateString(params.date);
  const dayName = DAY_NAMES_EN[dayOfWeek];
  const schedule = hours.find(
    (h) => h.schedule_type === params.category && h.day_of_week === dayOfWeek
  );

  if (!schedule || !schedule.is_open || !schedule.open_time || !schedule.close_time) {
    return {
      date: params.date,
      timezone: CLINIC_TIMEZONE,
      isBlocked: true,
      blockReason: `Closed on ${dayName} for ${params.category === 'diagnostic' ? 'diagnostics' : 'doctor consultations'}.`,
      slots: [],
    };
  }

  // Check daily capacity for category
  const categoryBookingsCount = activeBookings.filter((b) => b.category === params.category).length;
  if (schedule.daily_capacity > 0 && categoryBookingsCount >= schedule.daily_capacity) {
    return {
      date: params.date,
      timezone: CLINIC_TIMEZONE,
      isBlocked: true,
      blockReason: 'Daily booking capacity reached for this date.',
      slots: [],
    };
  }

  // Doctor-specific availability check
  let candidateTimes: string[] = [];
  if (params.doctorId) {
    const doctor = doctors.find((d) => d.id === params.doctorId);
    if (!doctor || !doctor.is_active || !doctor.is_verified) {
      return {
        date: params.date,
        timezone: CLINIC_TIMEZONE,
        isBlocked: true,
        blockReason: 'Selected doctor is currently unavailable for online booking.',
        slots: [],
      };
    }
    if (doctor.available_days.length > 0 && !doctor.available_days.includes(dayName)) {
      return {
        date: params.date,
        timezone: CLINIC_TIMEZONE,
        isBlocked: true,
        blockReason: `${doctor.full_name} does not hold chamber on ${dayName}.`,
        slots: [],
      };
    }
    if (doctor.available_time_slots.length > 0) {
      candidateTimes = [...doctor.available_time_slots].sort();
    }
  }

  if (candidateTimes.length === 0) {
    const startMin = timeToMinutes(schedule.open_time);
    const endMin = timeToMinutes(schedule.close_time);
    const interval = Math.max(10, schedule.slot_interval_minutes || 30);
    const breakStart = schedule.break_start ? timeToMinutes(schedule.break_start) : null;
    const breakEnd = schedule.break_end ? timeToMinutes(schedule.break_end) : null;

    for (let m = startMin; m + interval <= endMin; m += interval) {
      if (breakStart !== null && breakEnd !== null && m >= breakStart && m < breakEnd) {
        continue;
      }
      candidateTimes.push(minutesToTime(m));
    }
  }

  const blockedSlotSet = new Set<string>();
  for (const b of matchingBlocks) {
    for (const s of b.blocked_slots || []) {
      blockedSlotSet.add(s);
    }
  }

  const nowMinIST = params.date === todayIST ? getCurrentMinutesIST() : -1;

  const slots: TimeSlotOption[] = candidateTimes.map((time) => {
    const slotMin = timeToMinutes(time);
    if (params.date === todayIST && slotMin <= nowMinIST + 15) {
      return { time, label: formatTime12h(time), available: false, reason: 'Past time' };
    }
    if (blockedSlotSet.has(time)) {
      return { time, label: formatTime12h(time), available: false, reason: 'Blocked by clinic' };
    }
    const hasConflict = activeBookings.some((b) => {
      if (b.appointment_time !== time) return false;
      if (params.doctorId && b.doctor_id === params.doctorId) return true;
      if (!params.doctorId && params.serviceId && b.service_id === params.serviceId && !b.doctor_id) return true;
      return false;
    });
    if (hasConflict) {
      return { time, label: formatTime12h(time), available: false, reason: 'Booked' };
    }
    return { time, label: formatTime12h(time), available: true };
  });

  return {
    date: params.date,
    timezone: CLINIC_TIMEZONE,
    isBlocked: false,
    slots,
  };
}

function generateBookingReference(dateStr: string): string {
  const compact = dateStr.replace(/-/g, '');
  const rand = crypto.randomInt(1000, 9999);
  return `NL-${compact}-${rand}`;
}

export interface CreateBookingInput {
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
}

export async function createValidatedBooking(input: CreateBookingInput): Promise<{
  appointment: Appointment;
  notificationChannels: { in_app: string; email: string; whatsapp: string; sms: string };
}> {
  // 1. Validate active service
  const services = await listServices(true);
  const service = services.find((s) => s.id === input.service_id);
  if (!service) {
    throw new Error('Selected service is no longer active. Please choose another service.');
  }

  // 2. Validate doctor if specified
  let doctorName: string | null = null;
  if (input.doctor_id) {
    const doctors = await listDoctors(true);
    const doctor = doctors.find((d) => d.id === input.doctor_id);
    if (!doctor) {
      throw new Error('Selected doctor is not currently verified or active.');
    }
    doctorName = doctor.full_name;
  }

  // 3. Re-verify slot availability atomically on the server
  const availability = await computeAvailableSlots({
    category: input.category,
    serviceId: input.service_id,
    doctorId: input.doctor_id || null,
    date: input.appointment_date,
  });

  if (availability.isBlocked) {
    throw new Error(availability.blockReason || 'Selected date is unavailable.');
  }

  const slot = availability.slots.find((s) => s.time === input.appointment_time);
  if (!slot || !slot.available) {
    const err = new Error('This time slot is no longer available. Please select another slot.');
    (err as any).statusCode = 409;
    throw err;
  }

  const bookingRef = generateBookingReference(input.appointment_date);
  const cleanMobile = input.mobile_number.replace(/\D/g, '').slice(-10);

  const sb = getSupabaseAdmin();
  let createdAppointment: Appointment;

  if (sb) {
    // Upsert customer by mobile_number
    const { data: customer, error: custErr } = await sb
      .from('customers')
      .upsert(
        {
          full_name: input.full_name.trim(),
          mobile_number: cleanMobile,
          email: input.email?.trim() || null,
          age: input.age ?? null,
        },
        { onConflict: 'mobile_number' }
      )
      .select('*')
      .single();

    if (custErr || !customer) {
      throw new Error(custErr?.message || 'Failed to save customer contact record.');
    }

    const { data: appt, error: apptErr } = await sb
      .from('appointments')
      .insert({
        booking_reference: bookingRef,
        customer_id: customer.id,
        category: input.category,
        department_id: input.department_id || service.department_id || null,
        service_id: service.id,
        doctor_id: input.doctor_id || null,
        appointment_date: input.appointment_date,
        appointment_time: input.appointment_time,
        timezone: CLINIC_TIMEZONE,
        status: 'pending',
        customer_message: input.customer_message?.trim() || null,
      })
      .select('*')
      .single();

    if (apptErr) {
      if (apptErr.code === '23505') {
        const err = new Error('This time slot was just reserved by another patient. Please pick another time.');
        (err as any).statusCode = 409;
        throw err;
      }
      throw new Error(apptErr.message);
    }

    createdAppointment = {
      ...(appt as Appointment),
      service_name: service.name,
      doctor_name: doctorName,
    };
  } else {
    // Preview store atomic duplicate guard
    const duplicate = previewStore.appointments.find(
      (a) =>
        a.appointment_date === input.appointment_date &&
        a.appointment_time === input.appointment_time &&
        (a.status === 'pending' || a.status === 'confirmed') &&
        (input.doctor_id
          ? a.doctor_id === input.doctor_id
          : a.service_id === service.id && !a.doctor_id)
    );
    if (duplicate) {
      const err = new Error('This time slot was just reserved. Please pick another time.');
      (err as any).statusCode = 409;
      throw err;
    }

    let customer = previewStore.customers.find((c) => c.mobile_number === cleanMobile);
    if (!customer) {
      customer = {
        id: crypto.randomUUID(),
        full_name: input.full_name.trim(),
        mobile_number: cleanMobile,
        email: input.email?.trim() || null,
        age: input.age ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      previewStore.customers.push(customer);
    } else {
      customer.full_name = input.full_name.trim();
      if (input.email) customer.email = input.email.trim();
      if (input.age !== undefined) customer.age = input.age;
      customer.updated_at = new Date().toISOString();
    }

    createdAppointment = {
      id: crypto.randomUUID(),
      booking_reference: bookingRef,
      customer_id: customer.id,
      category: input.category,
      department_id: input.department_id || service.department_id || null,
      service_id: service.id,
      doctor_id: input.doctor_id || null,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      timezone: CLINIC_TIMEZONE,
      status: 'pending',
      customer_message: input.customer_message?.trim() || null,
      admin_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service_name: service.name,
      doctor_name: doctorName,
    };
    previewStore.appointments.push(createdAppointment);
  }

  // Record truthful notification events (never pretending external providers sent if unconfigured)
  const providers = getNotificationProviderStatus();
  await recordNotification({
    appointment_id: createdAppointment.id,
    channel: 'in_app',
    recipient: 'Admin Desk',
    event_type: 'booking_created',
    subject: `New Appointment Request (${bookingRef})`,
    message: `${input.full_name} requested ${service.name}${doctorName ? ` with ${doctorName}` : ''} on ${input.appointment_date} at ${formatTime12h(input.appointment_time)} IST.`,
    delivery_status: 'recorded',
  });

  return {
    appointment: createdAppointment,
    notificationChannels: {
      in_app: 'recorded',
      email: providers.email && input.email ? 'queued' : 'not_configured',
      whatsapp: providers.whatsapp ? 'queued' : 'not_configured',
      sms: providers.sms ? 'queued' : 'not_configured',
    },
  };
}

export async function lookupBookingStatus(reference: string, mobile: string): Promise<{
  booking_reference: string;
  status: AppointmentStatus;
  appointment_date: string;
  appointment_time: string;
  timezone: string;
  service_name: string | null;
  doctor_name: string | null;
  category: AppointmentCategory;
} | null> {
  const cleanRef = reference.trim().toUpperCase();
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  if (!cleanRef || cleanMobile.length !== 10) return null;

  const all = await listAppointmentsEnriched();
  const found = all.find(
    (a) =>
      a.booking_reference.toUpperCase() === cleanRef &&
      a.customer?.mobile_number === cleanMobile
  );
  if (!found) return null;

  return {
    booking_reference: found.booking_reference,
    status: found.status,
    appointment_date: found.appointment_date,
    appointment_time: found.appointment_time,
    timezone: found.timezone,
    service_name: found.service_name || null,
    doctor_name: found.doctor_name || null,
    category: found.category,
  };
}

export async function updateAppointmentAdmin(
  id: string,
  patch: { status?: AppointmentStatus; admin_notes?: string }
): Promise<Appointment> {
  const sb = getSupabaseAdmin();
  let updated: Appointment | null = null;

  if (sb) {
    const { data, error } = await sb
      .from('appointments')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    updated = data as Appointment;
  } else {
    const idx = previewStore.appointments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found.');
    previewStore.appointments[idx] = {
      ...previewStore.appointments[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    updated = previewStore.appointments[idx];
  }

  if (patch.status && updated) {
    const providers = getNotificationProviderStatus();
    await recordNotification({
      appointment_id: updated.id,
      channel: 'in_app',
      recipient: updated.booking_reference,
      event_type: `booking_${patch.status}`,
      subject: `Booking ${updated.booking_reference} marked ${patch.status}`,
      message: `Administrator updated booking ${updated.booking_reference} status to ${patch.status.toUpperCase()}. External SMS/WhatsApp/Email delivery: ${providers.whatsapp || providers.sms || providers.email ? 'provider active' : 'provider not configured'}.`,
      delivery_status: 'recorded',
    });
  }

  const all = await listAppointmentsEnriched();
  return all.find((a) => a.id === id) || updated!;
}

/**
 * Seeds initial catalog (departments, services, pathology rates, draft doctors,
 * business hours, gallery, and site settings) into a connected Supabase PostgreSQL database.
 * NEVER seeds fake customers or fake appointments.
 */
export async function seedConnectedSupabaseCatalog(): Promise<{ seeded: boolean; summary: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    throw new Error('Supabase is not connected yet.');
  }

  const { error: dErr } = await sb.from('departments').upsert(INITIAL_DEPARTMENTS, { onConflict: 'id' });
  if (dErr) throw new Error(`Departments seed error: ${dErr.message}`);

  const { error: sErr } = await sb.from('services').upsert(INITIAL_SERVICES, { onConflict: 'id' });
  if (sErr) throw new Error(`Services seed error: ${sErr.message}`);

  const { error: docErr } = await sb.from('doctors').upsert(INITIAL_DOCTORS, { onConflict: 'id' });
  if (docErr) throw new Error(`Doctors seed error: ${docErr.message}`);

  const { error: bhErr } = await sb
    .from('business_hours')
    .upsert(INITIAL_BUSINESS_HOURS, { onConflict: 'schedule_type,day_of_week' });
  if (bhErr) throw new Error(`Business hours seed error: ${bhErr.message}`);

  const { error: gErr } = await sb.from('gallery').upsert(INITIAL_GALLERY, { onConflict: 'id' });
  if (gErr) throw new Error(`Gallery seed error: ${gErr.message}`);

  const { error: stErr } = await sb
    .from('site_settings')
    .upsert({ key: 'site_content', value: DEFAULT_SITE_SETTINGS }, { onConflict: 'key' });
  if (stErr) throw new Error(`Site settings seed error: ${stErr.message}`);

  return {
    seeded: true,
    summary: `Seeded ${INITIAL_DEPARTMENTS.length} departments, ${INITIAL_SERVICES.length} services & pathology rates, ${INITIAL_DOCTORS.length} draft doctors, 21 schedule entries, and ${INITIAL_GALLERY.length} gallery photos.`,
  };
}

/**
 * Returns row counts & live previews of all 12 database tables for the Admin Database Inspector.
 */
export async function getDatabaseInspectorSnapshot(): Promise<{
  mode: 'supabase' | 'local_preview';
  tables: Array<{ name: string; count: number; sample: any[] }>;
}> {
  const sb = getSupabaseAdmin();
  const tableNames = [
    'profiles',
    'departments',
    'services',
    'doctors',
    'doctor_availability',
    'business_hours',
    'blocked_dates',
    'customers',
    'appointments',
    'gallery',
    'notifications',
    'site_settings',
  ];

  if (sb) {
    const tables = await Promise.all(
      tableNames.map(async (name) => {
        const { data, count } = await sb
          .from(name)
          .select('*', { count: 'exact' })
          .limit(15);
        return {
          name,
          count: count ?? (data?.length || 0),
          sample: data || [],
        };
      })
    );
    return { mode: 'supabase', tables };
  }

  const localMap: Record<string, any[]> = {
    profiles: previewStore.localAdmin
      ? [{ id: previewStore.localAdmin.id, email: previewStore.localAdmin.email, full_name: previewStore.localAdmin.full_name, role: 'admin', is_active: true }]
      : [],
    departments: previewStore.departments,
    services: previewStore.services,
    doctors: previewStore.doctors,
    doctor_availability: [],
    business_hours: previewStore.businessHours,
    blocked_dates: previewStore.blockedDates,
    customers: previewStore.customers,
    appointments: previewStore.appointments,
    gallery: previewStore.gallery,
    notifications: previewStore.notifications,
    site_settings: [{ key: 'site_content', business_name: previewStore.settings.business_name, owner: previewStore.settings.owner_name }],
  };

  return {
    mode: 'local_preview',
    tables: tableNames.map((name) => ({
      name,
      count: localMap[name].length,
      sample: localMap[name].slice(0, 15),
    })),
  };
}
