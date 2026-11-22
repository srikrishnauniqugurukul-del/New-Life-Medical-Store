-- ============================================================================
-- NEW LIFE MEDICAL STORE KALIMPONG — SUPABASE POSTGRESQL MIGRATION (001)
-- ============================================================================
-- Timezone reference: Asia/Kolkata (IST)
-- Security: Row Level Security (RLS) enforced on ALL 12 tables.
-- Run this SQL inside your Supabase Project -> SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. PROFILES (Links to Supabase Auth users; Role-Based Access Control)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper function to check if current JWT belongs to an active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 2. DEPARTMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT,
  name_ne TEXT,
  category TEXT NOT NULL CHECK (category IN ('doctor_consultation', 'diagnostic')),
  description TEXT,
  icon_name TEXT DEFAULT 'stethoscope',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_category_order ON public.departments(category, display_order);

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. SERVICES (Doctor Consultations, Diagnostic Categories, Health Packages, Lab Tests)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_bn TEXT,
  name_ne TEXT,
  category TEXT NOT NULL CHECK (category IN ('doctor_consultation', 'diagnostic', 'health_package', 'pathology_test')),
  description TEXT,
  image_url TEXT,
  icon_name TEXT DEFAULT 'activity',
  duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (duration_minutes > 0 AND duration_minutes <= 240),
  fee_inr NUMERIC(10, 2) CHECK (fee_inr IS NULL OR fee_inr >= 0),
  availability_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category_active ON public.services(category, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_services_department ON public.services(department_id);

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. DOCTORS (Draft by default; NEVER published until administrator verifies)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  speciality TEXT NOT NULL,
  photo_url TEXT,
  poster_url TEXT,
  qualifications TEXT,
  registration_number TEXT,
  hospital_affiliation TEXT,
  consultation_fee_inr NUMERIC(10, 2) CHECK (consultation_fee_inr IS NULL OR consultation_fee_inr >= 0),
  available_days TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  appointment_duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (appointment_duration_minutes > 0 AND appointment_duration_minutes <= 120),
  available_time_slots TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bio TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_published ON public.doctors(is_verified, is_active, department_id);

CREATE TRIGGER trg_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. DOCTOR AVAILABILITY (Per-day doctor chamber schedules)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday ... 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 20,
  max_bookings INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_day ON public.doctor_availability(doctor_id, day_of_week);

CREATE TRIGGER trg_doctor_availability_updated_at
  BEFORE UPDATE ON public.doctor_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. BUSINESS HOURS (Separate schedules for medical_store, doctor_consultation, diagnostic)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('medical_store', 'doctor_consultation', 'diagnostic')),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  is_24_hours BOOLEAN NOT NULL DEFAULT FALSE,
  open_time TIME,
  close_time TIME,
  break_start TIME,
  break_end TIME,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes BETWEEN 5 AND 120),
  appointment_duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (appointment_duration_minutes BETWEEN 5 AND 180),
  daily_capacity INTEGER NOT NULL DEFAULT 24 CHECK (daily_capacity >= 0),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_type, day_of_week)
);

CREATE TRIGGER trg_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. BLOCKED DATES & HOLIDAYS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date DATE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'doctor_consultation', 'diagnostic', 'doctor')),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
  blocked_slots TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_lookup ON public.blocked_dates(block_date, is_active, scope);

CREATE TRIGGER trg_blocked_dates_updated_at
  BEFORE UPDATE ON public.blocked_dates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. CUSTOMERS (Strictly private — NEVER exposed to public visitors)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  email TEXT,
  age INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 125)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mobile_number)
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. APPOINTMENTS (Double-booking prevention enforced at database level)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('doctor_consultation', 'diagnostic')),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL, -- 'HH:MM' 24-hour Asia/Kolkata
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  customer_message TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_reference ON public.appointments(booking_reference);

-- Database-level conflict protection: prevent two active bookings for the same doctor + date + time
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_doctor_slot
  ON public.appointments (doctor_id, appointment_date, appointment_time)
  WHERE doctor_id IS NOT NULL AND status IN ('pending', 'confirmed');

-- Database-level conflict protection: prevent two active bookings for the same diagnostic/unassigned service + date + time
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_service_slot
  ON public.appointments (service_id, appointment_date, appointment_time)
  WHERE doctor_id IS NULL AND service_id IS NOT NULL AND status IN ('pending', 'confirmed');

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. GALLERY (Owner-approved store, diagnostic, and chamber photography)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  caption TEXT,
  section TEXT NOT NULL CHECK (section IN ('store_exterior', 'medical_facility', 'consultation_area', 'diagnostic_facility', 'business_photographs')),
  image_url TEXT NOT NULL,
  storage_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_section_order ON public.gallery(is_published, section, display_order);

CREATE TRIGGER trg_gallery_updated_at
  BEFORE UPDATE ON public.gallery
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. NOTIFICATIONS (Booking & Enquiry event log + channel delivery audit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp', 'sms')),
  recipient TEXT,
  event_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'recorded' CHECK (delivery_status IN ('recorded', 'sent', 'not_configured', 'failed')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- ----------------------------------------------------------------------------
-- 12. SITE SETTINGS (Multilingual CMS content & business configuration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public READ-ONLY policies (only published/active non-sensitive catalog records)
CREATE POLICY "Public can read active departments" ON public.departments FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can read active services" ON public.services FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can read verified active doctors" ON public.doctors FOR SELECT USING (is_verified = TRUE AND is_active = TRUE);
CREATE POLICY "Public can read active doctor availability" ON public.doctor_availability FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can read business hours" ON public.business_hours FOR SELECT USING (TRUE);
CREATE POLICY "Public can read active blocked dates" ON public.blocked_dates FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can read published gallery" ON public.gallery FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Public can read site settings" ON public.site_settings FOR SELECT USING (TRUE);

-- Strict privacy: Customers, Appointments, Notifications, and Profiles have ZERO public read policies.
-- Bookings are created via the validated Node.js server API using the secret key after conflict validation.

-- Admin full access policies across all 12 tables
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage departments" ON public.departments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage services" ON public.services FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage doctors" ON public.doctors FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage doctor availability" ON public.doctor_availability FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage business hours" ON public.business_hours FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage blocked dates" ON public.blocked_dates FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage appointments" ON public.appointments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage gallery" ON public.gallery FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage site settings" ON public.site_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- SUPABASE STORAGE BUCKET (Run in Supabase Dashboard -> Storage or SQL Editor)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-gallery', 'clinic-gallery', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view clinic gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-gallery');

CREATE POLICY "Admins can upload clinic gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'clinic-gallery' AND public.is_admin());

CREATE POLICY "Admins can delete clinic gallery images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'clinic-gallery' AND public.is_admin());
