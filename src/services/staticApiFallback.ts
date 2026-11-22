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

const STORAGE_KEY = 'newlife_kalimpong_static_store_v2';

interface StaticAdminAccount {
  id: string;
  email: string;
  full_name: string;
  role: 'admin';
  phone?: string;
  passwordSalt: string;
  passwordHash: string;
}

interface StaticStoreState {
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
  localAdmin: StaticAdminAccount | null;
}

function createInitialState(): StaticStoreState {
  return {
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
}

let memoryState: StaticStoreState | null = null;

function loadState(): StaticStoreState {
  if (memoryState) return memoryState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StaticStoreState>;
      const defaults = createInitialState();
      memoryState = {
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        departments: parsed.departments?.length ? parsed.departments : defaults.departments,
        services: parsed.services?.length ? parsed.services : defaults.services,
        doctors: parsed.doctors?.length ? parsed.doctors : defaults.doctors,
        businessHours: parsed.businessHours?.length ? parsed.businessHours : defaults.businessHours,
        gallery: parsed.gallery?.length ? parsed.gallery : defaults.gallery,
        blockedDates: parsed.blockedDates || [],
        customers: parsed.customers || [],
        appointments: parsed.appointments || [],
        notifications: parsed.notifications || [],
        localAdmin: parsed.localAdmin ?? null,
      };
      return memoryState;
    }
  } catch {
    // Ignore storage access errors in restricted browsers
  }
  memoryState = createInitialState();
  return memoryState;
}

function saveState(state: StaticStoreState): void {
  memoryState = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private browsing errors
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Lightweight deterministic fallback if SubtleCrypto is unavailable on insecure origins
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function getStaticHealth(state: StaticStoreState): BackendHealthStatus {
  return {
    supabaseConnected: false,
    storageConnected: false,
    mode: 'local_preview',
    timezone: CLINIC_TIMEZONE,
    adminInitialized: state.localAdmin !== null,
    authMode: 'local_claim',
    notificationProviders: {
      email: false,
      whatsapp: false,
      sms: false,
    },
  };
}

function makeStaticToken(profile: AdminProfile): string {
  const payload = btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          exp: Date.now() + 1000 * 60 * 60 * 12,
        })
      )
    )
  );
  return `static.${payload}`;
}

function verifyStaticToken(token?: string | null): AdminProfile | null {
  if (!token || !token.startsWith('static.')) return null;
  try {
    const raw = decodeURIComponent(escape(atob(token.slice(7))));
    const parsed = JSON.parse(raw);
    if (!parsed.exp || Date.now() > parsed.exp || parsed.role !== 'admin') return null;
    const state = loadState();
    if (!state.localAdmin || state.localAdmin.id !== parsed.id) return null;
    return {
      id: state.localAdmin.id,
      email: state.localAdmin.email,
      full_name: state.localAdmin.full_name,
      role: 'admin',
      phone: state.localAdmin.phone,
    };
  } catch {
    return null;
  }
}

function requireStaticAdmin(token?: string | null): AdminProfile {
  const admin = verifyStaticToken(token);
  if (!admin) {
    throw new Error('Unauthorized administrator access.');
  }
  return admin;
}

function enrichAppointments(state: StaticStoreState): Appointment[] {
  const deptMap = new Map(state.departments.map((d) => [d.id, d.name]));
  const servMap = new Map(state.services.map((s) => [s.id, s.name]));
  const docMap = new Map(state.doctors.map((d) => [d.id, d.full_name]));
  const custMap = new Map(state.customers.map((c) => [c.id, c]));

  return [...state.appointments]
    .sort((a, b) =>
      `${b.appointment_date}T${b.appointment_time}`.localeCompare(
        `${a.appointment_date}T${a.appointment_time}`
      )
    )
    .map((row) => ({
      ...row,
      customer: custMap.get(row.customer_id) || null,
      department_name: row.department_id ? deptMap.get(row.department_id) || null : null,
      service_name: row.service_id ? servMap.get(row.service_id) || null : null,
      doctor_name: row.doctor_id ? docMap.get(row.doctor_id) || null : null,
    }));
}

function computeStaticSlots(
  state: StaticStoreState,
  params: {
    category: AppointmentCategory;
    date: string;
    serviceId?: string;
    doctorId?: string;
  }
): {
  date: string;
  timezone: string;
  isBlocked: boolean;
  blockReason?: string;
  slots: TimeSlotOption[];
} {
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

  const activeBookings = state.appointments.filter(
    (a) => a.appointment_date === params.date && (a.status === 'pending' || a.status === 'confirmed')
  );

  const matchingBlocks = state.blockedDates.filter((b) => {
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
  const schedule = state.businessHours.find(
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

  let candidateTimes: string[] = [];
  if (params.doctorId) {
    const doctor = state.doctors.find((d) => d.id === params.doctorId);
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
      if (!params.doctorId && params.serviceId && b.service_id === params.serviceId && !b.doctor_id) {
        return true;
      }
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

export const staticApiFallback = {
  async getPublicBootstrap(): Promise<PublicSitePayload> {
    const state = loadState();
    return {
      health: getStaticHealth(state),
      settings: state.settings,
      departments: state.departments
        .filter((d) => d.is_active)
        .sort((a, b) => a.display_order - b.display_order),
      services: state.services
        .filter((s) => s.is_active)
        .sort((a, b) => a.display_order - b.display_order),
      doctors: state.doctors
        .filter((d) => d.is_verified && d.is_active)
        .sort((a, b) => a.display_order - b.display_order),
      businessHours: state.businessHours,
      blockedDates: state.blockedDates
        .filter((b) => b.is_active)
        .sort((a, b) => a.block_date.localeCompare(b.block_date)),
      gallery: state.gallery
        .filter((g) => g.is_published)
        .sort((a, b) => a.display_order - b.display_order),
    };
  },

  async getAvailableSlots(params: {
    category: AppointmentCategory;
    date: string;
    serviceId?: string;
    doctorId?: string;
  }) {
    const state = loadState();
    return computeStaticSlots(state, params);
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
    const state = loadState();
    const service = state.services.find((s) => s.id === payload.service_id && s.is_active);
    if (!service) {
      throw new Error('Selected service is no longer active. Please choose another service.');
    }

    let doctorName: string | null = null;
    if (payload.doctor_id) {
      const doctor = state.doctors.find(
        (d) => d.id === payload.doctor_id && d.is_active && d.is_verified
      );
      if (!doctor) {
        throw new Error('Selected doctor is not currently verified or active.');
      }
      doctorName = doctor.full_name;
    }

    const availability = computeStaticSlots(state, {
      category: payload.category,
      serviceId: payload.service_id,
      doctorId: payload.doctor_id || undefined,
      date: payload.appointment_date,
    });
    if (availability.isBlocked) {
      throw new Error(availability.blockReason || 'Selected date is unavailable.');
    }
    const slot = availability.slots.find((s) => s.time === payload.appointment_time);
    if (!slot || !slot.available) {
      throw new Error('This time slot is no longer available. Please select another slot.');
    }

    const cleanMobile = payload.mobile_number.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      throw new Error('Valid 10-digit mobile number is required.');
    }

    const rand = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `NL-${payload.appointment_date.replace(/-/g, '')}-${rand}`;
    const nowIso = new Date().toISOString();

    let customer = state.customers.find((c) => c.mobile_number === cleanMobile);
    if (!customer) {
      customer = {
        id: randomId(),
        full_name: payload.full_name.trim(),
        mobile_number: cleanMobile,
        email: payload.email?.trim() || null,
        age: payload.age ?? null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      state.customers.push(customer);
    } else {
      customer.full_name = payload.full_name.trim();
      if (payload.email) customer.email = payload.email.trim();
      if (payload.age !== undefined) customer.age = payload.age;
      customer.updated_at = nowIso;
    }

    const appt: Appointment = {
      id: randomId(),
      booking_reference: bookingRef,
      customer_id: customer.id,
      category: payload.category,
      department_id: payload.department_id || service.department_id || null,
      service_id: service.id,
      doctor_id: payload.doctor_id || null,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time,
      timezone: CLINIC_TIMEZONE,
      status: 'pending',
      customer_message: payload.customer_message?.trim() || null,
      admin_notes: null,
      created_at: nowIso,
      updated_at: nowIso,
      service_name: service.name,
      doctor_name: doctorName,
    };
    state.appointments.push(appt);

    state.notifications.unshift({
      id: randomId(),
      appointment_id: appt.id,
      channel: 'in_app',
      recipient: 'Admin Desk',
      event_type: 'booking_created',
      subject: `New Appointment Request (${bookingRef})`,
      message: `${payload.full_name} requested ${service.name}${doctorName ? ` with ${doctorName}` : ''} on ${payload.appointment_date} at ${formatTime12h(payload.appointment_time)} IST.`,
      delivery_status: 'recorded',
      is_read: false,
      created_at: nowIso,
    });

    saveState(state);

    return {
      booking_reference: appt.booking_reference,
      status: appt.status,
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time,
      timezone: appt.timezone,
      service_name: service.name,
      doctor_name: doctorName,
      category: appt.category,
      notificationChannels: {
        in_app: 'recorded',
        email: 'not_configured',
        whatsapp: 'not_configured',
        sms: 'not_configured',
      },
      backendMode: 'local_preview' as const,
    };
  },

  async lookupBooking(booking_reference: string, mobile_number: string) {
    const state = loadState();
    const cleanRef = booking_reference.trim().toUpperCase();
    const cleanMobile = mobile_number.replace(/\D/g, '').slice(-10);
    const enriched = enrichAppointments(state);
    const found = enriched.find(
      (a) =>
        a.booking_reference.toUpperCase() === cleanRef &&
        a.customer?.mobile_number === cleanMobile
    );
    if (!found) {
      throw new Error('No matching appointment found for those details.');
    }
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
  },

  async submitEnquiry(payload: {
    full_name: string;
    mobile_number: string;
    subject: string;
    message: string;
  }) {
    const state = loadState();
    state.notifications.unshift({
      id: randomId(),
      appointment_id: null,
      channel: 'in_app',
      recipient: 'Admin Desk',
      event_type: 'contact_enquiry',
      subject: `Enquiry: ${payload.subject}`,
      message: `From ${payload.full_name} (${payload.mobile_number}): ${payload.message}`,
      delivery_status: 'recorded',
      is_read: false,
      created_at: new Date().toISOString(),
    });
    saveState(state);
    return { ok: true };
  },

  async getAuthStatus(token?: string | null) {
    const state = loadState();
    const profile = verifyStaticToken(token);
    return {
      authenticated: Boolean(profile),
      profile,
      health: getStaticHealth(state),
    };
  },

  async claimAdmin(payload: { email: string; full_name: string; password: string }) {
    const state = loadState();
    if (state.localAdmin) {
      throw new Error('Administrator account has already been initialized. Please sign in.');
    }
    if (payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    const salt = randomId();
    const hash = await sha256Hex(`${salt}:${payload.password}`);
    const account: StaticAdminAccount = {
      id: randomId(),
      email: payload.email.trim().toLowerCase(),
      full_name: payload.full_name.trim(),
      role: 'admin',
      passwordSalt: salt,
      passwordHash: hash,
    };
    state.localAdmin = account;
    saveState(state);
    const profile: AdminProfile = {
      id: account.id,
      email: account.email,
      full_name: account.full_name,
      role: 'admin',
    };
    return { token: makeStaticToken(profile), profile };
  },

  async loginAdmin(payload: { email: string; password: string }) {
    const state = loadState();
    if (!state.localAdmin) {
      throw new Error(
        'Administrator account not initialized yet. Please complete first-run admin setup.'
      );
    }
    const email = payload.email.trim().toLowerCase();
    const hash = await sha256Hex(`${state.localAdmin.passwordSalt}:${payload.password}`);
    if (email !== state.localAdmin.email || hash !== state.localAdmin.passwordHash) {
      throw new Error('Invalid administrator email or password.');
    }
    const profile: AdminProfile = {
      id: state.localAdmin.id,
      email: state.localAdmin.email,
      full_name: state.localAdmin.full_name,
      role: 'admin',
      phone: state.localAdmin.phone,
    };
    return { token: makeStaticToken(profile), profile };
  },

  async resetAdminPassword(_email: string) {
    return {
      message:
        'Password reset emails require Supabase Auth to be connected in Netlify Environment Variables. In static preview mode, update your password inside Admin Profile.',
    };
  },

  async getAdminDashboard(token: string) {
    requireStaticAdmin(token);
    const state = loadState();
    return {
      health: getStaticHealth(state),
      appointments: enrichAppointments(state),
      customers: [...state.customers].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      departments: [...state.departments].sort((a, b) => a.display_order - b.display_order),
      services: [...state.services].sort((a, b) => a.display_order - b.display_order),
      doctors: [...state.doctors].sort((a, b) => a.display_order - b.display_order),
      businessHours: state.businessHours,
      blockedDates: [...state.blockedDates].sort((a, b) =>
        a.block_date.localeCompare(b.block_date)
      ),
      gallery: [...state.gallery].sort((a, b) => a.display_order - b.display_order),
      notifications: [...state.notifications].sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      ),
      settings: state.settings,
    };
  },

  async updateAppointment(
    token: string,
    id: string,
    patch: { status?: AppointmentStatus; admin_notes?: string }
  ) {
    requireStaticAdmin(token);
    const state = loadState();
    const idx = state.appointments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found.');
    state.appointments[idx] = {
      ...state.appointments[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    if (patch.status) {
      state.notifications.unshift({
        id: randomId(),
        appointment_id: id,
        channel: 'in_app',
        recipient: 'Admin Desk',
        event_type: 'status_updated',
        subject: `Appointment ${state.appointments[idx].booking_reference} marked ${patch.status}`,
        message: `Status changed to ${patch.status}.`,
        delivery_status: 'recorded',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
    saveState(state);
    return state.appointments[idx];
  },

  async createService(token: string, payload: Omit<ServiceItem, 'id'>) {
    requireStaticAdmin(token);
    const state = loadState();
    const item: ServiceItem = {
      ...payload,
      id: randomId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.services.push(item);
    saveState(state);
    return item;
  },

  async updateService(token: string, id: string, patch: Partial<ServiceItem>) {
    requireStaticAdmin(token);
    const state = loadState();
    const idx = state.services.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Service not found.');
    state.services[idx] = {
      ...state.services[idx],
      ...patch,
      id,
      updated_at: new Date().toISOString(),
    };
    saveState(state);
    return state.services[idx];
  },

  async deleteService(token: string, id: string) {
    requireStaticAdmin(token);
    const state = loadState();
    state.services = state.services.filter((s) => s.id !== id);
    saveState(state);
    return { ok: true };
  },

  async createDoctor(token: string, payload: Omit<Doctor, 'id'>) {
    requireStaticAdmin(token);
    const state = loadState();
    const doc: Doctor = {
      ...payload,
      id: randomId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.doctors.push(doc);
    saveState(state);
    return doc;
  },

  async updateDoctor(token: string, id: string, patch: Partial<Doctor>) {
    requireStaticAdmin(token);
    const state = loadState();
    const idx = state.doctors.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Doctor record not found.');
    state.doctors[idx] = {
      ...state.doctors[idx],
      ...patch,
      id,
      updated_at: new Date().toISOString(),
    };
    saveState(state);
    return state.doctors[idx];
  },

  async deleteDoctor(token: string, id: string) {
    requireStaticAdmin(token);
    const state = loadState();
    state.doctors = state.doctors.filter((d) => d.id !== id);
    saveState(state);
    return { ok: true };
  },

  async saveBusinessHours(token: string, hours: BusinessHour[]) {
    requireStaticAdmin(token);
    const state = loadState();
    state.businessHours = hours;
    saveState(state);
    return hours;
  },

  async createBlockedDate(token: string, payload: Omit<BlockedDate, 'id'>) {
    requireStaticAdmin(token);
    const state = loadState();
    const item: BlockedDate = {
      ...payload,
      id: randomId(),
      created_at: new Date().toISOString(),
    };
    state.blockedDates.push(item);
    saveState(state);
    return item;
  },

  async updateBlockedDate(token: string, id: string, patch: Partial<BlockedDate>) {
    requireStaticAdmin(token);
    const state = loadState();
    const idx = state.blockedDates.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Blocked date not found.');
    state.blockedDates[idx] = { ...state.blockedDates[idx], ...patch, id };
    saveState(state);
    return state.blockedDates[idx];
  },

  async deleteBlockedDate(token: string, id: string) {
    requireStaticAdmin(token);
    const state = loadState();
    state.blockedDates = state.blockedDates.filter((b) => b.id !== id);
    saveState(state);
    return { ok: true };
  },

  async createGalleryItem(token: string, payload: Omit<GalleryItem, 'id'>) {
    requireStaticAdmin(token);
    const state = loadState();
    const item: GalleryItem = {
      ...payload,
      id: randomId(),
      created_at: new Date().toISOString(),
    };
    state.gallery.push(item);
    saveState(state);
    return item;
  },

  async updateGalleryItem(token: string, id: string, patch: Partial<GalleryItem>) {
    requireStaticAdmin(token);
    const state = loadState();
    const idx = state.gallery.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error('Gallery item not found.');
    state.gallery[idx] = { ...state.gallery[idx], ...patch, id };
    saveState(state);
    return state.gallery[idx];
  },

  async deleteGalleryItem(token: string, id: string) {
    requireStaticAdmin(token);
    const state = loadState();
    state.gallery = state.gallery.filter((g) => g.id !== id);
    saveState(state);
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
    requireStaticAdmin(token);
    return {
      image_url: `data:${payload.contentType};base64,${payload.base64Data}`,
      storage_path: null,
    };
  },

  async saveSiteSettings(token: string, settings: SiteContentSettings) {
    requireStaticAdmin(token);
    const state = loadState();
    state.settings = settings;
    saveState(state);
    return settings;
  },

  async markNotificationRead(token: string, id: string) {
    requireStaticAdmin(token);
    const state = loadState();
    const item = state.notifications.find((n) => n.id === id);
    if (item) {
      item.is_read = true;
      saveState(state);
    }
    return { ok: true };
  },

  async getDatabaseInspector(token: string) {
    requireStaticAdmin(token);
    const state = loadState();
    return {
      mode: 'local_preview' as const,
      tables: [
        { name: 'departments', count: state.departments.length, sample: state.departments.slice(0, 5) },
        { name: 'services', count: state.services.length, sample: state.services.slice(0, 5) },
        { name: 'doctors', count: state.doctors.length, sample: state.doctors.slice(0, 5) },
        { name: 'business_hours', count: state.businessHours.length, sample: state.businessHours.slice(0, 5) },
        { name: 'blocked_dates', count: state.blockedDates.length, sample: state.blockedDates.slice(0, 5) },
        { name: 'customers', count: state.customers.length, sample: state.customers.slice(0, 5) },
        { name: 'appointments', count: state.appointments.length, sample: state.appointments.slice(0, 5) },
        { name: 'gallery', count: state.gallery.length, sample: state.gallery.slice(0, 5) },
        { name: 'notifications', count: state.notifications.length, sample: state.notifications.slice(0, 5) },
      ],
    };
  },

  async seedSupabaseCatalog(token: string) {
    requireStaticAdmin(token);
    return {
      seeded: false,
      summary:
        'Configure SUPABASE_URL and SUPABASE_SECRET_KEY in Netlify Environment Variables (with Netlify Functions enabled) to sync catalog records to PostgreSQL.',
    };
  },

  async updateAdminProfile(
    token: string,
    payload: { full_name?: string; phone?: string; new_password?: string }
  ) {
    requireStaticAdmin(token);
    const state = loadState();
    if (!state.localAdmin) throw new Error('Admin account not found.');
    if (payload.full_name) state.localAdmin.full_name = payload.full_name;
    if (payload.phone !== undefined) state.localAdmin.phone = payload.phone;
    if (payload.new_password) {
      const salt = randomId();
      const hash = await sha256Hex(`${salt}:${payload.new_password}`);
      state.localAdmin.passwordSalt = salt;
      state.localAdmin.passwordHash = hash;
    }
    saveState(state);
    return {
      id: state.localAdmin.id,
      email: state.localAdmin.email,
      full_name: state.localAdmin.full_name,
      role: 'admin' as const,
      phone: state.localAdmin.phone,
    };
  },
};
