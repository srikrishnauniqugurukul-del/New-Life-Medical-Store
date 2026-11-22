-- ============================================================================
-- NEW LIFE MEDICAL STORE KALIMPONG — SINGLE ADMIN SLOT & PUBLIC RPC MIGRATION (002)
-- ============================================================================
-- Run this SQL inside your Supabase Project (wbyvpjfeciuvpviqdbuo) -> SQL Editor
-- AFTER running 001_initial_schema.sql.
--
-- Guarantees:
-- 1. Strictly ONE admin account can EVER exist (database unique index + advisory lock).
-- 2. Once claimed, nobody else can create an admin account.
-- 3. Public bookings, status lookup, and contact enquiries work securely using ONLY
--    your Supabase Publishable Key (no secret key required on static hosts).
-- 4. All bookings & customer details remain strictly private (admin-only via RLS).
-- ============================================================================

-- 1. Database-enforced Single Admin Account constraint (mathematically blocks a 2nd admin)
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_single_admin
  ON public.profiles ((role))
  WHERE role = 'admin';

-- Allow authenticated users to read their own profile row (for role check after sign-in)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 2. Public boolean check: has the 1-of-1 admin slot already been claimed?
-- Returns ONLY true/false (zero PII exposed).
CREATE OR REPLACE FUNCTION public.is_admin_slot_claimed()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role = 'admin' AND is_active = TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_slot_claimed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_slot_claimed() TO anon, authenticated;

-- 3. Atomic one-time single-admin claim function (authenticated caller only)
CREATE OR REPLACE FUNCTION public.claim_single_admin(p_full_name TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_clean_name TEXT := NULLIF(BTRIM(p_full_name), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim administrator slot.';
  END IF;

  -- Serialize concurrent attempts at transaction level
  PERFORM pg_advisory_xact_lock(73430101);

  IF EXISTS (SELECT 1 FROM public.profiles WHERE profiles.role = 'admin') THEN
    RAISE EXCEPTION 'The single administrator slot is already claimed. No additional admin accounts are allowed.';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated user email not found.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (v_uid, LOWER(v_email), COALESCE(v_clean_name, 'Clinic Administrator'), 'admin', TRUE)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = 'admin',
        is_active = TRUE;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.role, p.phone
  FROM public.profiles p
  WHERE p.id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_single_admin(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_single_admin(TEXT) TO authenticated;

-- 4. Secure public booking RPC (writes customer + appointment + admin notification without opening public SELECT on PII)
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_category TEXT,
  p_department_id UUID,
  p_service_id UUID,
  p_doctor_id UUID,
  p_appointment_date DATE,
  p_appointment_time TEXT,
  p_full_name TEXT,
  p_mobile_number TEXT,
  p_email TEXT DEFAULT NULL,
  p_age INTEGER DEFAULT NULL,
  p_customer_message TEXT DEFAULT NULL,
  p_service_name_fallback TEXT DEFAULT NULL,
  p_doctor_name_fallback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_mobile TEXT;
  v_customer_id UUID;
  v_booking_ref TEXT;
  v_appt_id UUID;
  v_service_name TEXT;
  v_doctor_name TEXT;
  v_valid_dept UUID := NULL;
  v_valid_service UUID := NULL;
  v_valid_doctor UUID := NULL;
BEGIN
  IF p_category NOT IN ('doctor_consultation', 'diagnostic') THEN
    RAISE EXCEPTION 'Invalid appointment category.';
  END IF;

  IF p_appointment_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE THEN
    RAISE EXCEPTION 'Past dates cannot be booked.';
  END IF;

  IF p_appointment_time !~ '^\d{2}:\d{2}$' THEN
    RAISE EXCEPTION 'Invalid time format.';
  END IF;

  v_clean_mobile := RIGHT(REGEXP_REPLACE(COALESCE(p_mobile_number, ''), '\D', '', 'g'), 10);
  IF LENGTH(v_clean_mobile) <> 10 THEN
    RAISE EXCEPTION 'Valid 10-digit mobile number is required.';
  END IF;

  IF LENGTH(BTRIM(COALESCE(p_full_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Patient full name is required.';
  END IF;

  -- Resolve optional foreign keys safely (supports both seeded DB catalog and static catalog IDs)
  IF p_department_id IS NOT NULL THEN
    SELECT d.id INTO v_valid_dept FROM public.departments d WHERE d.id = p_department_id;
  END IF;

  IF p_service_id IS NOT NULL THEN
    SELECT s.id, s.name INTO v_valid_service, v_service_name
    FROM public.services s WHERE s.id = p_service_id;
  END IF;

  IF p_doctor_id IS NOT NULL THEN
    SELECT doc.id, doc.full_name INTO v_valid_doctor, v_doctor_name
    FROM public.doctors doc WHERE doc.id = p_doctor_id;
  END IF;

  -- Upsert customer by mobile_number
  INSERT INTO public.customers (full_name, mobile_number, email, age)
  VALUES (
    BTRIM(p_full_name),
    v_clean_mobile,
    NULLIF(BTRIM(COALESCE(p_email, '')), ''),
    p_age
  )
  ON CONFLICT (mobile_number) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = COALESCE(EXCLUDED.email, public.customers.email),
        age = COALESCE(EXCLUDED.age, public.customers.age),
        updated_at = NOW()
  RETURNING id INTO v_customer_id;

  v_booking_ref := 'NL-' || TO_CHAR(p_appointment_date, 'YYYYMMDD') || '-' || LPAD(FLOOR(1000 + RANDOM() * 8999)::TEXT, 4, '0');

  INSERT INTO public.appointments (
    booking_reference,
    customer_id,
    category,
    department_id,
    service_id,
    doctor_id,
    appointment_date,
    appointment_time,
    timezone,
    status,
    customer_message
  )
  VALUES (
    v_booking_ref,
    v_customer_id,
    p_category,
    v_valid_dept,
    v_valid_service,
    v_valid_doctor,
    p_appointment_date,
    p_appointment_time,
    'Asia/Kolkata',
    'pending',
    NULLIF(BTRIM(COALESCE(p_customer_message, '')), '')
  )
  RETURNING id INTO v_appt_id;

  INSERT INTO public.notifications (
    appointment_id,
    channel,
    recipient,
    event_type,
    subject,
    message,
    delivery_status
  )
  VALUES (
    v_appt_id,
    'in_app',
    'Admin Desk',
    'booking_created',
    'New Appointment Request (' || v_booking_ref || ')',
    BTRIM(p_full_name) || ' (' || v_clean_mobile || ') requested '
      || COALESCE(v_service_name, p_service_name_fallback, p_category)
      || CASE WHEN COALESCE(v_doctor_name, p_doctor_name_fallback) IS NOT NULL
              THEN ' with ' || COALESCE(v_doctor_name, p_doctor_name_fallback)
              ELSE '' END
      || ' on ' || TO_CHAR(p_appointment_date, 'YYYY-MM-DD') || ' at ' || p_appointment_time || ' IST.',
    'recorded'
  );

  RETURN jsonb_build_object(
    'booking_reference', v_booking_ref,
    'status', 'pending',
    'appointment_date', TO_CHAR(p_appointment_date, 'YYYY-MM-DD'),
    'appointment_time', p_appointment_time,
    'timezone', 'Asia/Kolkata',
    'service_name', COALESCE(v_service_name, p_service_name_fallback),
    'doctor_name', COALESCE(v_doctor_name, p_doctor_name_fallback),
    'category', p_category
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This time slot was just reserved by another patient. Please select another slot.';
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_booking(TEXT, UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(TEXT, UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 5. Secure public booking status lookup (requires BOTH exact reference AND 10-digit mobile)
CREATE OR REPLACE FUNCTION public.lookup_public_booking(
  p_booking_reference TEXT,
  p_mobile_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref TEXT := UPPER(BTRIM(COALESCE(p_booking_reference, '')));
  v_mobile TEXT := RIGHT(REGEXP_REPLACE(COALESCE(p_mobile_number, ''), '\D', '', 'g'), 10);
  v_row RECORD;
BEGIN
  IF v_ref = '' OR LENGTH(v_mobile) <> 10 THEN
    RETURN NULL;
  END IF;

  SELECT
    a.booking_reference,
    a.status,
    TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
    a.appointment_time,
    a.timezone,
    a.category,
    s.name AS service_name,
    d.full_name AS doctor_name
  INTO v_row
  FROM public.appointments a
  INNER JOIN public.customers c ON c.id = a.customer_id
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.doctors d ON d.id = a.doctor_id
  WHERE UPPER(a.booking_reference) = v_ref
    AND c.mobile_number = v_mobile
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'booking_reference', v_row.booking_reference,
    'status', v_row.status,
    'appointment_date', v_row.appointment_date,
    'appointment_time', v_row.appointment_time,
    'timezone', v_row.timezone,
    'service_name', v_row.service_name,
    'doctor_name', v_row.doctor_name,
    'category', v_row.category
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_public_booking(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_public_booking(TEXT, TEXT) TO anon, authenticated;

-- 6. Secure public slot occupancy check (returns ONLY booked times, ZERO PII)
CREATE OR REPLACE FUNCTION public.get_booked_slots_for_date(p_date DATE)
RETURNS TABLE (
  category TEXT,
  service_id UUID,
  doctor_id UUID,
  appointment_time TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.category, a.service_id, a.doctor_id, a.appointment_time
  FROM public.appointments a
  WHERE a.appointment_date = p_date
    AND a.status IN ('pending', 'confirmed');
$$;

REVOKE ALL ON FUNCTION public.get_booked_slots_for_date(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots_for_date(DATE) TO anon, authenticated;

-- 7. Secure public contact enquiry RPC
CREATE OR REPLACE FUNCTION public.submit_public_enquiry(
  p_full_name TEXT,
  p_mobile_number TEXT,
  p_subject TEXT,
  p_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    appointment_id,
    channel,
    recipient,
    event_type,
    subject,
    message,
    delivery_status
  )
  VALUES (
    NULL,
    'in_app',
    'Admin Desk',
    'contact_enquiry',
    'Enquiry: ' || LEFT(BTRIM(COALESCE(p_subject, 'General')), 120),
    'From ' || LEFT(BTRIM(COALESCE(p_full_name, 'Visitor')), 100) || ' (' || LEFT(BTRIM(COALESCE(p_mobile_number, '')), 20) || '): ' || LEFT(BTRIM(COALESCE(p_message, '')), 600),
    'recorded'
  );
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_enquiry(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_enquiry(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
