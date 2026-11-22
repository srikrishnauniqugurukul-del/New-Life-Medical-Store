import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
} from '../api/seedData';
import { getBrowserSupabaseClient } from '../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toUuidOrNull(val?: string | null): string | null {
  if (!val) return null;
  return UUID_REGEX.test(val) ? val : null;
}

function getAuthedClient(token: string): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function isBrowserSupabaseReady(): boolean {
  return getBrowserSupabaseClient() !== null;
}

async function checkAdminSlotClaimed(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.rpc('is_admin_slot_claimed');
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

function makeSupabaseHealth(adminClaimed: boolean): BackendHealthStatus {
  return {
    supabaseConnected: true,
    storageConnected: true,
    mode: 'supabase',
    timezone: CLINIC_TIMEZONE,
    adminInitialized: adminClaimed,
    authMode: 'supabase_auth',
    notificationProviders: {
      email: false,
      whatsapp: false,
      sms: false,
    },
  };
}

export const supabaseBrowserApi = {
  async getPublicBootstrap(): Promise<PublicSitePayload> {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');

    const [claimedRes, settingsRes, deptRes, servRes, docRes, hoursRes, blockedRes, galleryRes] =
      await Promise.all([
        sb.rpc('is_admin_slot_claimed'),
        sb.from('site_settings').select('value').eq('key', 'site_content').maybeSingle(),
        sb.from('departments').select('*').eq('is_active', true).order('display_order', { ascending: true }),
        sb.from('services').select('*').eq('is_active', true).order('display_order', { ascending: true }),
        sb.from('doctors').select('*').eq('is_verified', true).eq('is_active', true).order('display_order', { ascending: true }),
        sb.from('business_hours').select('*').order('schedule_type', { ascending: true }).order('day_of_week', { ascending: true }),
        sb.from('blocked_dates').select('*').eq('is_active', true).order('block_date', { ascending: true }),
        sb.from('gallery').select('*').eq('is_published', true).order('display_order', { ascending: true }),
      ]);

    const adminClaimed = !claimedRes.error ? Boolean(claimedRes.data) : false;
    const settings: SiteContentSettings = settingsRes.data?.value
      ? { ...DEFAULT_SITE_SETTINGS, ...(settingsRes.data.value as Partial<SiteContentSettings>) }
      : structuredClone(DEFAULT_SITE_SETTINGS);

    const departments =
      !deptRes.error && deptRes.data && deptRes.data.length > 0
        ? (deptRes.data as Department[])
        : structuredClone(INITIAL_DEPARTMENTS).filter((d) => d.is_active);

    const services =
      !servRes.error && servRes.data && servRes.data.length > 0
        ? (servRes.data as ServiceItem[])
        : structuredClone(INITIAL_SERVICES).filter((s) => s.is_active);

    const doctors =
      !docRes.error && docRes.data && docRes.data.length > 0
        ? (docRes.data as Doctor[])
        : structuredClone(INITIAL_DOCTORS).filter((d) => d.is_verified && d.is_active);

    const businessHours =
      !hoursRes.error && hoursRes.data && hoursRes.data.length > 0
        ? (hoursRes.data as BusinessHour[])
        : structuredClone(INITIAL_BUSINESS_HOURS);

    const blockedDates =
      !blockedRes.error && blockedRes.data ? (blockedRes.data as BlockedDate[]) : [];

    const gallery =
      !galleryRes.error && galleryRes.data && galleryRes.data.length > 0
        ? (galleryRes.data as GalleryItem[])
        : structuredClone(INITIAL_GALLERY).filter((g) => g.is_published);

    return {
      health: makeSupabaseHealth(adminClaimed),
      settings,
      departments,
      services,
      doctors,
      businessHours,
      blockedDates,
      gallery,
    };
  },

  async getAvailableSlots(params: {
    category: AppointmentCategory;
    date: string;
    serviceId?: string;
    doctorId?: string;
  }) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');

    const todayIST = getTodayIST();
    if (params.date < todayIST) {
      return {
        date: params.date,
        timezone: CLINIC_TIMEZONE,
        isBlocked: true,
        blockReason: 'Past dates cannot be booked.',
        slots: [] as TimeSlotOption[],
      };
    }

    const [hoursRes, blockedRes, docRes, bookedRes] = await Promise.all([
      sb.from('business_hours').select('*'),
      sb.from('blocked_dates').select('*').eq('is_active', true),
      sb.from('doctors').select('*').eq('is_verified', true).eq('is_active', true),
      sb.rpc('get_booked_slots_for_date', { p_date: params.date }),
    ]);

    const hours =
      !hoursRes.error && hoursRes.data && hoursRes.data.length > 0
        ? (hoursRes.data as BusinessHour[])
        : INITIAL_BUSINESS_HOURS;
    const blockedDates = (!blockedRes.error && blockedRes.data ? blockedRes.data : []) as BlockedDate[];
    const doctors =
      !docRes.error && docRes.data && docRes.data.length > 0
        ? (docRes.data as Doctor[])
        : INITIAL_DOCTORS.filter((d) => d.is_verified && d.is_active);
    const activeBookings = (!bookedRes.error && bookedRes.data ? bookedRes.data : []) as Array<{
      category: AppointmentCategory;
      service_id: string | null;
      doctor_id: string | null;
      appointment_time: string;
    }>;

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
        slots: [] as TimeSlotOption[],
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
        slots: [] as TimeSlotOption[],
      };
    }

    let candidateTimes: string[] = [];
    if (params.doctorId) {
      const doctor = doctors.find((d) => d.id === params.doctorId);
      if (doctor && doctor.available_days.length > 0 && !doctor.available_days.includes(dayName)) {
        return {
          date: params.date,
          timezone: CLINIC_TIMEZONE,
          isBlocked: true,
          blockReason: `${doctor.full_name} does not hold chamber on ${dayName}.`,
          slots: [] as TimeSlotOption[],
        };
      }
      if (doctor && doctor.available_time_slots.length > 0) {
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
        if (breakStart !== null && breakEnd !== null && m >= breakStart && m < breakEnd) continue;
        candidateTimes.push(minutesToTime(m));
      }
    }

    const blockedSlotSet = new Set<string>();
    for (const b of matchingBlocks) {
      for (const s of b.blocked_slots || []) blockedSlotSet.add(s);
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
  },

  async submitBooking(payload: {
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
  }) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');

    const fallbackService = INITIAL_SERVICES.find((s) => s.id === payload.service_id);
    const fallbackDoctor = payload.doctor_id
      ? INITIAL_DOCTORS.find((d) => d.id === payload.doctor_id)
      : null;

    const { data, error } = await sb.rpc('create_public_booking', {
      p_category: payload.category,
      p_department_id: toUuidOrNull(payload.department_id),
      p_service_id: toUuidOrNull(payload.service_id),
      p_doctor_id: toUuidOrNull(payload.doctor_id),
      p_appointment_date: payload.appointment_date,
      p_appointment_time: payload.appointment_time,
      p_full_name: payload.full_name.trim(),
      p_mobile_number: payload.mobile_number.trim(),
      p_email: payload.email?.trim() || null,
      p_age: payload.age ?? null,
      p_customer_message: payload.customer_message?.trim() || null,
      p_service_name_fallback: fallbackService?.name || null,
      p_doctor_name_fallback: fallbackDoctor?.full_name || null,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Unable to save booking to Supabase.');
    }

    const row = data as {
      booking_reference: string;
      status: AppointmentStatus;
      appointment_date: string;
      appointment_time: string;
      timezone: string;
      service_name: string | null;
      doctor_name: string | null;
      category: AppointmentCategory;
    };

    return {
      ...row,
      notificationChannels: {
        in_app: 'recorded',
        email: 'not_configured',
        whatsapp: 'not_configured',
        sms: 'not_configured',
      },
      backendMode: 'supabase' as const,
    };
  },

  async lookupBooking(booking_reference: string, mobile_number: string) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');

    const { data, error } = await sb.rpc('lookup_public_booking', {
      p_booking_reference: booking_reference,
      p_mobile_number: mobile_number,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('No matching appointment found for those details.');
    return data as {
      booking_reference: string;
      status: AppointmentStatus;
      appointment_date: string;
      appointment_time: string;
      timezone: string;
      service_name: string | null;
      doctor_name: string | null;
      category: AppointmentCategory;
    };
  },

  async submitEnquiry(payload: {
    full_name: string;
    mobile_number: string;
    subject: string;
    message: string;
  }) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');
    const { error } = await sb.rpc('submit_public_enquiry', {
      p_full_name: payload.full_name,
      p_mobile_number: payload.mobile_number,
      p_subject: payload.subject,
      p_message: payload.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async getAuthStatus(token?: string | null) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');
    const adminClaimed = await checkAdminSlotClaimed(sb);
    let profile: AdminProfile | null = null;
    if (token) {
      const authed = getAuthedClient(token);
      const { data: userRes } = await authed.auth.getUser(token);
      if (userRes.user) {
        const { data: prof } = await authed
          .from('profiles')
          .select('id, email, full_name, role, phone, is_active')
          .eq('id', userRes.user.id)
          .maybeSingle();
        if (prof && prof.role === 'admin' && prof.is_active) {
          profile = {
            id: prof.id,
            email: prof.email,
            full_name: prof.full_name,
            role: 'admin',
            phone: prof.phone || undefined,
          };
        }
      }
    }
    return {
      authenticated: Boolean(profile),
      profile,
      health: makeSupabaseHealth(adminClaimed),
    };
  },

  async claimAdmin(payload: { email: string; full_name: string; password: string }) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');

    const alreadyClaimed = await checkAdminSlotClaimed(sb);
    if (alreadyClaimed) {
      throw new Error(
        'The single administrator slot has already been claimed. Nobody else can create an admin account.'
      );
    }

    const { data: signUpData, error: signUpErr } = await sb.auth.signUp({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      options: {
        data: { full_name: payload.full_name.trim() },
      },
    });
    if (signUpErr) {
      throw new Error(signUpErr.message);
    }

    let accessToken = signUpData.session?.access_token;
    if (!accessToken) {
      const { data: signInData, error: signInErr } = await sb.auth.signInWithPassword({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });
      if (signInErr || !signInData.session) {
        throw new Error(
          'Admin user created in Supabase Auth. Please disable "Confirm email" in Supabase Auth settings (or confirm your email) and then sign in to complete claiming the single admin slot.'
        );
      }
      accessToken = signInData.session.access_token;
    }

    const authed = getAuthedClient(accessToken);
    const { data: claimedRows, error: claimErr } = await authed.rpc('claim_single_admin', {
      p_full_name: payload.full_name.trim(),
    });
    if (claimErr) {
      throw new Error(claimErr.message);
    }

    const row = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;
    if (!row) {
      throw new Error('Failed to verify single admin profile.');
    }

    return {
      token: accessToken,
      profile: {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        role: 'admin' as const,
        phone: row.phone || undefined,
      },
    };
  },

  async loginAdmin(payload: { email: string; password: string }) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');

    const { data, error } = await sb.auth.signInWithPassword({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });
    if (error || !data.session || !data.user) {
      throw new Error(error?.message || 'Invalid administrator email or password.');
    }

    const authed = getAuthedClient(data.session.access_token);
    const { data: prof } = await authed
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active')
      .eq('id', data.user.id)
      .maybeSingle();

    // If user confirmed email after initial sign-up and the single slot is still open, auto-claim it cleanly
    if (!prof) {
      const claimed = await checkAdminSlotClaimed(sb);
      if (!claimed) {
        const { data: claimedRows, error: claimErr } = await authed.rpc('claim_single_admin', {
          p_full_name:
            (data.user.user_metadata?.full_name as string) || 'Bijay Gupta',
        });
        if (!claimErr) {
          const row = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;
          if (row) {
            return {
              token: data.session.access_token,
              profile: {
                id: row.id,
                email: row.email,
                full_name: row.full_name,
                role: 'admin' as const,
                phone: row.phone || undefined,
              },
            };
          }
        }
      }
      throw new Error('This account does not have active administrator permissions.');
    }

    if (prof.role !== 'admin' || !prof.is_active) {
      throw new Error('This account does not have active administrator permissions.');
    }

    return {
      token: data.session.access_token,
      profile: {
        id: prof.id,
        email: prof.email,
        full_name: prof.full_name,
        role: 'admin' as const,
        phone: prof.phone || undefined,
      },
    };
  },

  async resetAdminPassword(email: string) {
    const sb = getBrowserSupabaseClient();
    if (!sb) throw new Error('Supabase browser client unavailable.');
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/login`,
    });
    if (error) throw new Error(error.message);
    return {
      message:
        'If an administrator account matches that email, a password reset link has been sent.',
    };
  },

  async getAdminDashboard(token: string) {
    const authed = getAuthedClient(token);
    const [
      apptRes,
      custRes,
      deptRes,
      servRes,
      docRes,
      hoursRes,
      blockedRes,
      galleryRes,
      notifRes,
      settingsRes,
    ] = await Promise.all([
      authed
        .from('appointments')
        .select('*, customer:customers(*)')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false }),
      authed.from('customers').select('*').order('created_at', { ascending: false }),
      authed.from('departments').select('*').order('display_order', { ascending: true }),
      authed.from('services').select('*').order('display_order', { ascending: true }),
      authed.from('doctors').select('*').order('display_order', { ascending: true }),
      authed
        .from('business_hours')
        .select('*')
        .order('schedule_type', { ascending: true })
        .order('day_of_week', { ascending: true }),
      authed.from('blocked_dates').select('*').order('block_date', { ascending: true }),
      authed.from('gallery').select('*').order('display_order', { ascending: true }),
      authed.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
      authed.from('site_settings').select('value').eq('key', 'site_content').maybeSingle(),
    ]);

    if (apptRes.error) throw new Error(apptRes.error.message);

    const departments =
      deptRes.data && deptRes.data.length > 0
        ? (deptRes.data as Department[])
        : structuredClone(INITIAL_DEPARTMENTS);
    const services =
      servRes.data && servRes.data.length > 0
        ? (servRes.data as ServiceItem[])
        : structuredClone(INITIAL_SERVICES);
    const doctors =
      docRes.data && docRes.data.length > 0
        ? (docRes.data as Doctor[])
        : structuredClone(INITIAL_DOCTORS);

    const deptMap = new Map(departments.map((d) => [d.id, d.name]));
    const servMap = new Map(services.map((s) => [s.id, s.name]));
    const docMap = new Map(doctors.map((d) => [d.id, d.full_name]));

    const appointments = (apptRes.data || []).map((row: any) => ({
      ...row,
      department_name: row.department_id ? deptMap.get(row.department_id) || null : null,
      service_name: row.service_id ? servMap.get(row.service_id) || null : null,
      doctor_name: row.doctor_id ? docMap.get(row.doctor_id) || null : null,
    })) as Appointment[];

    return {
      health: makeSupabaseHealth(true),
      appointments,
      customers: (custRes.data || []) as Customer[],
      departments,
      services,
      doctors,
      businessHours:
        hoursRes.data && hoursRes.data.length > 0
          ? (hoursRes.data as BusinessHour[])
          : structuredClone(INITIAL_BUSINESS_HOURS),
      blockedDates: (blockedRes.data || []) as BlockedDate[],
      gallery:
        galleryRes.data && galleryRes.data.length > 0
          ? (galleryRes.data as GalleryItem[])
          : structuredClone(INITIAL_GALLERY),
      notifications: (notifRes.data || []) as NotificationLog[],
      settings: settingsRes.data?.value
        ? { ...DEFAULT_SITE_SETTINGS, ...(settingsRes.data.value as Partial<SiteContentSettings>) }
        : structuredClone(DEFAULT_SITE_SETTINGS),
    };
  },

  async updateAppointment(
    token: string,
    id: string,
    patch: { status?: AppointmentStatus; admin_notes?: string }
  ) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed
      .from('appointments')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Appointment;
  },

  async createService(token: string, payload: Omit<ServiceItem, 'id'>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed.from('services').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return data as ServiceItem;
  },

  async updateService(token: string, id: string, patch: Partial<ServiceItem>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed
      .from('services')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as ServiceItem;
  },

  async deleteService(token: string, id: string) {
    const authed = getAuthedClient(token);
    const { error } = await authed.from('services').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async createDoctor(token: string, payload: Omit<Doctor, 'id'>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed.from('doctors').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return data as Doctor;
  },

  async updateDoctor(token: string, id: string, patch: Partial<Doctor>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed
      .from('doctors')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Doctor;
  },

  async deleteDoctor(token: string, id: string) {
    const authed = getAuthedClient(token);
    const { error } = await authed.from('doctors').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async saveBusinessHours(token: string, hours: BusinessHour[]) {
    const authed = getAuthedClient(token);
    const { error } = await authed
      .from('business_hours')
      .upsert(hours, { onConflict: 'schedule_type,day_of_week' });
    if (error) throw new Error(error.message);
    const { data } = await authed.from('business_hours').select('*');
    return (data || hours) as BusinessHour[];
  },

  async createBlockedDate(token: string, payload: Omit<BlockedDate, 'id'>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed
      .from('blocked_dates')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as BlockedDate;
  },

  async updateBlockedDate(token: string, id: string, patch: Partial<BlockedDate>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed
      .from('blocked_dates')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as BlockedDate;
  },

  async deleteBlockedDate(token: string, id: string) {
    const authed = getAuthedClient(token);
    const { error } = await authed.from('blocked_dates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async createGalleryItem(token: string, payload: Omit<GalleryItem, 'id'>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed.from('gallery').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return data as GalleryItem;
  },

  async updateGalleryItem(token: string, id: string, patch: Partial<GalleryItem>) {
    const authed = getAuthedClient(token);
    const { data, error } = await authed
      .from('gallery')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as GalleryItem;
  },

  async deleteGalleryItem(token: string, id: string) {
    const authed = getAuthedClient(token);
    const { error } = await authed.from('gallery').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async uploadGalleryImage(
    token: string,
    payload: {
      fileName: string;
      contentType: 'image/jpeg' | 'image/png' | 'image/webp';
      base64Data: string;
    }
  ) {
    const authed = getAuthedClient(token);
    const safeExt =
      payload.contentType === 'image/png'
        ? 'png'
        : payload.contentType === 'image/webp'
          ? 'webp'
          : 'jpg';
    const cleanName = payload.fileName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'clinic';
    const storagePath = `uploads/${Date.now()}-${cleanName}.${safeExt}`;
    const bytes = Uint8Array.from(atob(payload.base64Data), (c) => c.charCodeAt(0));
    const { error } = await authed.storage
      .from('clinic-gallery')
      .upload(storagePath, bytes, { contentType: payload.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = authed.storage.from('clinic-gallery').getPublicUrl(storagePath);
    return { image_url: data.publicUrl, storage_path: storagePath };
  },

  async saveSiteSettings(token: string, settings: SiteContentSettings) {
    const authed = getAuthedClient(token);
    const { error } = await authed
      .from('site_settings')
      .upsert({ key: 'site_content', value: settings }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return settings;
  },

  async markNotificationRead(token: string, id: string) {
    const authed = getAuthedClient(token);
    await authed.from('notifications').update({ is_read: true }).eq('id', id);
    return { ok: true };
  },

  async getDatabaseInspector(token: string) {
    const authed = getAuthedClient(token);
    const names = [
      'profiles',
      'departments',
      'services',
      'doctors',
      'business_hours',
      'blocked_dates',
      'customers',
      'appointments',
      'gallery',
      'notifications',
      'site_settings',
    ];
    const tables = await Promise.all(
      names.map(async (name) => {
        const { data, count } = await authed
          .from(name)
          .select('*', { count: 'exact' })
          .limit(5);
        return { name, count: count ?? (data?.length || 0), sample: data || [] };
      })
    );
    return { mode: 'supabase' as const, tables };
  },

  async seedSupabaseCatalog(token: string) {
    const authed = getAuthedClient(token);
    await authed
      .from('site_settings')
      .upsert({ key: 'site_content', value: DEFAULT_SITE_SETTINGS }, { onConflict: 'key' });

    const { count: deptCount } = await authed
      .from('departments')
      .select('*', { count: 'exact', head: true });
    if (!deptCount || deptCount === 0) {
      const deptRows = INITIAL_DEPARTMENTS.map(({ id: _id, ...rest }) => rest);
      const { data: insertedDepts } = await authed.from('departments').insert(deptRows).select('*');
      const slugToId = new Map((insertedDepts || []).map((d: any) => [d.slug, d.id]));
      const oldToSlug = new Map(INITIAL_DEPARTMENTS.map((d) => [d.id, d.slug]));

      const servRows = INITIAL_SERVICES.map(({ id: _id, department_id, ...rest }) => ({
        ...rest,
        department_id: department_id ? slugToId.get(oldToSlug.get(department_id) || '') || null : null,
      }));
      await authed.from('services').insert(servRows);

      const docRows = INITIAL_DOCTORS.map(({ id: _id, department_id, ...rest }) => ({
        ...rest,
        department_id: department_id ? slugToId.get(oldToSlug.get(department_id) || '') || null : null,
      }));
      await authed.from('doctors').insert(docRows);
    }

    const { count: hrsCount } = await authed
      .from('business_hours')
      .select('*', { count: 'exact', head: true });
    if (!hrsCount || hrsCount === 0) {
      await authed
        .from('business_hours')
        .upsert(
          INITIAL_BUSINESS_HOURS.map(({ id: _id, ...rest }) => rest),
          { onConflict: 'schedule_type,day_of_week' }
        );
    }

    const { count: galCount } = await authed
      .from('gallery')
      .select('*', { count: 'exact', head: true });
    if (!galCount || galCount === 0) {
      await authed
        .from('gallery')
        .insert(INITIAL_GALLERY.map(({ id: _id, ...rest }) => rest));
    }

    return {
      seeded: true,
      summary: 'Authentic clinic catalog synced to Supabase PostgreSQL.',
    };
  },

  async updateAdminProfile(
    token: string,
    payload: { full_name?: string; phone?: string; new_password?: string }
  ) {
    const authed = getAuthedClient(token);
    const { data: userRes } = await authed.auth.getUser(token);
    if (!userRes.user) throw new Error('Unauthorized administrator access.');

    if (payload.new_password) {
      const { error: pwErr } = await authed.auth.updateUser({ password: payload.new_password });
      if (pwErr) throw new Error(pwErr.message);
    }

    const { data, error } = await authed
      .from('profiles')
      .update({
        ...(payload.full_name ? { full_name: payload.full_name } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      })
      .eq('id', userRes.user.id)
      .select('id, email, full_name, role, phone')
      .single();
    if (error) throw new Error(error.message);
    return data as AdminProfile;
  },
};
