export type Language = 'en' | 'bn' | 'ne';

export type ServiceCategory =
  | 'doctor_consultation'
  | 'diagnostic'
  | 'health_package'
  | 'pathology_test';

export type AppointmentCategory = 'doctor_consultation' | 'diagnostic';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type ScheduleType = 'medical_store' | 'doctor_consultation' | 'diagnostic';

export type GallerySection =
  | 'store_exterior'
  | 'medical_facility'
  | 'consultation_area'
  | 'diagnostic_facility'
  | 'business_photographs';

export interface Department {
  id: string;
  slug: string;
  name: string;
  name_bn?: string | null;
  name_ne?: string | null;
  category: AppointmentCategory;
  description?: string | null;
  icon_name?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceItem {
  id: string;
  department_id?: string | null;
  name: string;
  name_bn?: string | null;
  name_ne?: string | null;
  category: ServiceCategory;
  description?: string | null;
  image_url?: string | null;
  icon_name?: string | null;
  duration_minutes: number;
  fee_inr?: number | null;
  availability_note?: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Doctor {
  id: string;
  department_id?: string | null;
  full_name: string;
  speciality: string;
  photo_url?: string | null;
  poster_url?: string | null;
  qualifications?: string | null;
  registration_number?: string | null;
  hospital_affiliation?: string | null;
  consultation_fee_inr?: number | null;
  available_days: string[];
  appointment_duration_minutes: number;
  available_time_slots: string[];
  bio?: string | null;
  is_verified: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
  slot_duration_minutes: number;
  max_bookings: number;
  is_active: boolean;
}

export interface BusinessHour {
  id: string;
  schedule_type: ScheduleType;
  day_of_week: number; // 0 = Sun ... 6 = Sat
  is_open: boolean;
  is_24_hours: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
  slot_interval_minutes: number;
  appointment_duration_minutes: number;
  daily_capacity: number;
  is_verified: boolean;
}

export interface BlockedDate {
  id: string;
  block_date: string; // YYYY-MM-DD
  scope: 'all' | 'doctor_consultation' | 'diagnostic' | 'doctor';
  doctor_id?: string | null;
  is_full_day: boolean;
  blocked_slots: string[];
  reason: string;
  is_active: boolean;
  created_at?: string;
}

export interface Customer {
  id: string;
  full_name: string;
  mobile_number: string;
  email?: string | null;
  age?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  booking_reference: string;
  customer_id: string;
  category: AppointmentCategory;
  department_id?: string | null;
  service_id?: string | null;
  doctor_id?: string | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  timezone: string;
  status: AppointmentStatus;
  customer_message?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string;
  // Populated relations for admin view
  customer?: Customer | null;
  service_name?: string | null;
  department_name?: string | null;
  doctor_name?: string | null;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption?: string | null;
  section: GallerySection;
  image_url: string;
  storage_path?: string | null;
  display_order: number;
  is_published: boolean;
  created_at?: string;
}

export interface NotificationLog {
  id: string;
  appointment_id?: string | null;
  channel: 'in_app' | 'email' | 'whatsapp' | 'sms';
  recipient?: string | null;
  event_type: string;
  subject: string;
  message: string;
  delivery_status: 'recorded' | 'sent' | 'not_configured' | 'failed';
  is_read: boolean;
  created_at: string;
}

export interface LocalizedText {
  en: string;
  bn: string;
  ne: string;
}

export interface SiteContentSettings {
  business_name: string;
  diagnostic_wing_name: string;
  owner_name: string;
  owner_photo_url: string;
  primary_phone: string;
  secondary_phones: string[];
  address: string;
  google_maps_url: string;
  lab_timing_note: string;
  hero_heading: LocalizedText;
  hero_subheading: LocalizedText;
  about_intro: LocalizedText;
  about_mission: LocalizedText;
  pathology_disclaimer: LocalizedText;
  highlight_cards: {
    consultations: { title: LocalizedText; description: LocalizedText };
    diagnostics: { title: LocalizedText; description: LocalizedText };
    support: { title: LocalizedText; description: LocalizedText };
  };
}

export interface BackendHealthStatus {
  supabaseConnected: boolean;
  storageConnected: boolean;
  mode: 'supabase' | 'local_preview';
  timezone: 'Asia/Kolkata';
  adminInitialized: boolean;
  authMode: 'supabase_auth' | 'local_claim';
  notificationProviders: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
  };
}

export interface TimeSlotOption {
  time: string; // HH:MM
  label: string; // e.g. 09:00 AM
  available: boolean;
  reason?: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  phone?: string | null;
}

export interface PublicSitePayload {
  health: BackendHealthStatus;
  settings: SiteContentSettings;
  departments: Department[];
  services: ServiceItem[];
  doctors: Doctor[];
  businessHours: BusinessHour[];
  blockedDates: BlockedDate[];
  gallery: GalleryItem[];
}
