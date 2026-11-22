import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  claimLocalAdmin,
  computeAvailableSlots,
  createBlockedDate,
  createDoctor,
  createGalleryItem,
  createService,
  createValidatedBooking,
  deleteBlockedDate,
  deleteDoctor,
  deleteGalleryItem,
  deleteService,
  getBackendHealth,
  getBackendHealthAsync,
  getDatabaseInspectorSnapshot,
  getSiteSettings,
  listAppointmentsEnriched,
  listBlockedDates,
  listBusinessHours,
  listCustomers,
  listDepartments,
  listDoctors,
  listGallery,
  listNotifications,
  listServices,
  loginAdmin,
  lookupBookingStatus,
  markNotificationRead,
  recordNotification,
  requestPasswordReset,
  saveBusinessHours,
  saveSiteSettings,
  seedConnectedSupabaseCatalog,
  updateAdminProfile,
  updateAppointmentAdmin,
  updateBlockedDate,
  updateDoctor,
  updateGalleryItem,
  updateService,
  uploadGalleryImage,
  verifyAdminBearerToken,
} from './db';
import type { AdminProfile } from '../lib/types';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminProfile;
    }
  }
}

const safeUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) =>
      v === '' ||
      v.startsWith('/') ||
      v.startsWith('https://') ||
      v.startsWith('http://'),
    { message: 'URL must start with /, https://, or http://' }
  );

function extractBearer(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return undefined;
  return auth.slice(7).trim();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearer(req);
    const admin = await verifyAdminBearerToken(token);
    if (!admin) {
      res.status(401).json({ error: 'Unauthorized administrator access.' });
      return;
    }
    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication verification failed.' });
  }
}

export function createApiRouter() {
  const router = express.Router();

  // ==========================================================================
  // PUBLIC ENDPOINTS (Strictly non-PII catalog + validated booking submission)
  // ==========================================================================

  router.get('/health', (_req, res) => {
    res.json(getBackendHealth());
  });

  router.get('/public/bootstrap', async (_req, res) => {
    try {
      const [health, settings, departments, services, doctors, businessHours, blockedDates, gallery] =
        await Promise.all([
          getBackendHealthAsync(),
          getSiteSettings(),
          listDepartments(true),
          listServices(true),
          listDoctors(true), // ONLY admin-verified & active doctors!
          listBusinessHours(),
          listBlockedDates(true),
          listGallery(true),
        ]);

      res.json({
        health,
        settings,
        departments,
        services,
        doctors,
        businessHours,
        blockedDates,
        gallery,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load clinic data.' });
    }
  });

  router.get('/public/slots', async (req, res) => {
    const schema = z.object({
      category: z.enum(['doctor_consultation', 'diagnostic']),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceId: z.string().optional(),
      doctorId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid slot lookup parameters.' });
      return;
    }
    try {
      const result = await computeAvailableSlots({
        category: parsed.data.category,
        date: parsed.data.date,
        serviceId: parsed.data.serviceId || null,
        doctorId: parsed.data.doctorId || null,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Unable to check slot availability.' });
    }
  });

  router.post('/bookings', async (req, res) => {
    const bookingSchema = z.object({
      category: z.enum(['doctor_consultation', 'diagnostic']),
      department_id: z.string().nullable().optional(),
      service_id: z.string().min(1),
      doctor_id: z.string().nullable().optional(),
      appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
      full_name: z.string().trim().min(2).max(120),
      mobile_number: z
        .string()
        .trim()
        .refine((v) => v.replace(/\D/g, '').length >= 10, {
          message: 'Valid 10-digit mobile number is required.',
        }),
      email: z.string().trim().email().optional().or(z.literal('')).nullable(),
      age: z.number().int().min(0).max(120).nullable().optional(),
      customer_message: z.string().trim().max(400).nullable().optional(),
    });

    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid booking details.',
      });
      return;
    }

    try {
      const result = await createValidatedBooking({
        ...parsed.data,
        email: parsed.data.email || null,
      });
      res.status(201).json({
        booking_reference: result.appointment.booking_reference,
        status: result.appointment.status,
        appointment_date: result.appointment.appointment_date,
        appointment_time: result.appointment.appointment_time,
        timezone: result.appointment.timezone,
        service_name: result.appointment.service_name,
        doctor_name: result.appointment.doctor_name,
        category: result.appointment.category,
        notificationChannels: result.notificationChannels,
        backendMode: getBackendHealth().mode,
      });
    } catch (err: any) {
      const status = err?.statusCode === 409 ? 409 : 400;
      res.status(status).json({ error: err?.message || 'Could not complete booking.' });
    }
  });

  router.post('/bookings/lookup', async (req, res) => {
    const schema = z.object({
      booking_reference: z.string().trim().min(5).max(40),
      mobile_number: z.string().trim().min(10).max(20),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Provide both your booking reference and 10-digit mobile number.' });
      return;
    }
    try {
      const result = await lookupBookingStatus(
        parsed.data.booking_reference,
        parsed.data.mobile_number
      );
      if (!result) {
        res.status(404).json({ error: 'No matching appointment found for those details.' });
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Status lookup failed.' });
    }
  });

  router.post('/contact/enquiry', async (req, res) => {
    const schema = z.object({
      full_name: z.string().trim().min(2).max(100),
      mobile_number: z
        .string()
        .trim()
        .refine((v) => v.replace(/\D/g, '').length >= 10),
      subject: z.string().trim().min(2).max(120),
      message: z.string().trim().min(5).max(600),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please complete all required enquiry fields.' });
      return;
    }
    try {
      await recordNotification({
        appointment_id: null,
        channel: 'in_app',
        recipient: 'Admin Desk',
        event_type: 'contact_enquiry',
        subject: `Enquiry: ${parsed.data.subject}`,
        message: `From ${parsed.data.full_name} (${parsed.data.mobile_number}): ${parsed.data.message}`,
        delivery_status: 'recorded',
      });
      res.status(201).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to submit enquiry.' });
    }
  });

  // ==========================================================================
  // ADMIN AUTHENTICATION ROUTES
  // ==========================================================================

  router.get('/auth/status', async (req, res) => {
    const health = await getBackendHealthAsync();
    const token = extractBearer(req);
    const profile = token ? await verifyAdminBearerToken(token) : null;
    res.json({
      authenticated: Boolean(profile),
      profile,
      health,
    });
  });

  router.post('/auth/claim-admin', async (req, res) => {
    const schema = z.object({
      email: z.string().trim().email(),
      full_name: z.string().trim().min(2).max(100),
      password: z.string().min(8).max(128),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Provide a valid email, full name, and a password of at least 8 characters.' });
      return;
    }
    try {
      const result = await claimLocalAdmin(
        parsed.data.email,
        parsed.data.full_name,
        parsed.data.password
      );
      res.status(201).json(result);
    } catch (err: any) {
      const status = err?.statusCode === 403 ? 403 : 400;
      res.status(status).json({ error: err?.message || 'Unable to initialize administrator.' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    const schema = z.object({
      email: z.string().trim().email(),
      password: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter a valid email and password.' });
      return;
    }
    try {
      const result = await loginAdmin(parsed.data.email, parsed.data.password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err?.message || 'Invalid login credentials.' });
    }
  });

  router.post('/auth/reset-password', async (req, res) => {
    const schema = z.object({ email: z.string().trim().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    try {
      const result = await requestPasswordReset(parsed.data.email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Reset request failed.' });
    }
  });

  // ==========================================================================
  // PROTECTED ADMIN ROUTES (Strictly requires verified Admin Bearer token)
  // ==========================================================================

  router.use('/admin', requireAdmin);

  router.get('/admin/dashboard', async (_req, res) => {
    try {
      const [
        appointments,
        customers,
        departments,
        services,
        doctors,
        businessHours,
        blockedDates,
        gallery,
        notifications,
        settings,
      ] = await Promise.all([
        listAppointmentsEnriched(),
        listCustomers(),
        listDepartments(false),
        listServices(false),
        listDoctors(false),
        listBusinessHours(),
        listBlockedDates(false),
        listGallery(false),
        listNotifications(),
        getSiteSettings(),
      ]);

      res.json({
        health: getBackendHealth(),
        appointments,
        customers,
        departments,
        services,
        doctors,
        businessHours,
        blockedDates,
        gallery,
        notifications,
        settings,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load admin data.' });
    }
  });

  // Appointments administration
  router.patch('/admin/appointments/:id', async (req, res) => {
    const schema = z.object({
      status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
      admin_notes: z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid appointment update payload.' });
      return;
    }
    try {
      const updated = await updateAppointmentAdmin(req.params.id, parsed.data);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update appointment.' });
    }
  });

  // Services CRUD
  const serviceSchema = z.object({
    department_id: z.string().nullable().optional(),
    name: z.string().trim().min(2).max(160),
    name_bn: z.string().trim().max(160).nullable().optional(),
    name_ne: z.string().trim().max(160).nullable().optional(),
    category: z.enum(['doctor_consultation', 'diagnostic', 'health_package', 'pathology_test']),
    description: z.string().trim().max(600).nullable().optional(),
    image_url: safeUrlSchema.nullable().optional(),
    icon_name: z.string().max(40).nullable().optional(),
    duration_minutes: z.number().int().min(5).max(240).default(20),
    fee_inr: z.number().min(0).max(500000).nullable().optional(),
    availability_note: z.string().max(160).nullable().optional(),
    is_active: z.boolean().default(true),
    display_order: z.number().int().min(0).max(9999).default(0),
  });

  router.post('/admin/services', async (req, res) => {
    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid service data.' });
      return;
    }
    try {
      const item = await createService(parsed.data);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to create service.' });
    }
  });

  router.patch('/admin/services/:id', async (req, res) => {
    const parsed = serviceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid service update.' });
      return;
    }
    try {
      const item = await updateService(req.params.id, parsed.data);
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update service.' });
    }
  });

  router.delete('/admin/services/:id', async (req, res) => {
    try {
      await deleteService(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to delete service.' });
    }
  });

  // Doctors CRUD + Verification
  const doctorSchema = z.object({
    department_id: z.string().nullable().optional(),
    full_name: z.string().trim().min(2).max(120),
    speciality: z.string().trim().min(2).max(140),
    photo_url: safeUrlSchema.nullable().optional(),
    poster_url: safeUrlSchema.nullable().optional(),
    qualifications: z.string().trim().max(400).nullable().optional(),
    registration_number: z.string().trim().max(80).nullable().optional(),
    hospital_affiliation: z.string().trim().max(160).nullable().optional(),
    consultation_fee_inr: z.number().min(0).max(50000).nullable().optional(),
    available_days: z.array(z.string()).default([]),
    appointment_duration_minutes: z.number().int().min(5).max(120).default(20),
    available_time_slots: z.array(z.string()).default([]),
    bio: z.string().trim().max(600).nullable().optional(),
    is_verified: z.boolean().default(false),
    is_active: z.boolean().default(true),
    display_order: z.number().int().min(0).max(999).default(0),
  });

  router.post('/admin/doctors', async (req, res) => {
    const parsed = doctorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid doctor profile.' });
      return;
    }
    try {
      const doc = await createDoctor(parsed.data);
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to create doctor.' });
    }
  });

  router.patch('/admin/doctors/:id', async (req, res) => {
    const parsed = doctorSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid doctor update.' });
      return;
    }
    try {
      const doc = await updateDoctor(req.params.id, parsed.data);
      res.json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update doctor.' });
    }
  });

  router.delete('/admin/doctors/:id', async (req, res) => {
    try {
      await deleteDoctor(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to delete doctor.' });
    }
  });

  // Business Hours
  router.put('/admin/business-hours', async (req, res) => {
    const rowSchema = z.object({
      id: z.string(),
      schedule_type: z.enum(['medical_store', 'doctor_consultation', 'diagnostic']),
      day_of_week: z.number().int().min(0).max(6),
      is_open: z.boolean(),
      is_24_hours: z.boolean(),
      open_time: z.string().nullable(),
      close_time: z.string().nullable(),
      break_start: z.string().nullable(),
      break_end: z.string().nullable(),
      slot_interval_minutes: z.number().int().min(5).max(120),
      appointment_duration_minutes: z.number().int().min(5).max(180),
      daily_capacity: z.number().int().min(0).max(500),
      is_verified: z.boolean(),
    });
    const parsed = z.array(rowSchema).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid business hours schedule payload.' });
      return;
    }
    try {
      const saved = await saveBusinessHours(parsed.data);
      res.json(saved);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to save business hours.' });
    }
  });

  // Blocked Dates & Holidays
  const blockedSchema = z.object({
    block_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scope: z.enum(['all', 'doctor_consultation', 'diagnostic', 'doctor']),
    doctor_id: z.string().nullable().optional(),
    is_full_day: z.boolean().default(true),
    blocked_slots: z.array(z.string()).default([]),
    reason: z.string().trim().min(2).max(200),
    is_active: z.boolean().default(true),
  });

  router.post('/admin/blocked-dates', async (req, res) => {
    const parsed = blockedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid blocked date.' });
      return;
    }
    try {
      const item = await createBlockedDate(parsed.data);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to block date.' });
    }
  });

  router.patch('/admin/blocked-dates/:id', async (req, res) => {
    const parsed = blockedSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid blocked date update.' });
      return;
    }
    try {
      const item = await updateBlockedDate(req.params.id, parsed.data);
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update blocked date.' });
    }
  });

  router.delete('/admin/blocked-dates/:id', async (req, res) => {
    try {
      await deleteBlockedDate(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to delete blocked date.' });
    }
  });

  // Gallery CRUD & Storage Upload
  const gallerySchema = z.object({
    title: z.string().trim().min(2).max(140),
    caption: z.string().trim().max(400).nullable().optional(),
    section: z.enum([
      'store_exterior',
      'medical_facility',
      'consultation_area',
      'diagnostic_facility',
      'business_photographs',
    ]),
    image_url: safeUrlSchema,
    storage_path: z.string().nullable().optional(),
    display_order: z.number().int().min(0).max(999).default(0),
    is_published: z.boolean().default(true),
  });

  router.post('/admin/gallery', async (req, res) => {
    const parsed = gallerySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid gallery item.' });
      return;
    }
    try {
      const item = await createGalleryItem(parsed.data);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to add gallery item.' });
    }
  });

  router.patch('/admin/gallery/:id', async (req, res) => {
    const parsed = gallerySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid gallery update.' });
      return;
    }
    try {
      const item = await updateGalleryItem(req.params.id, parsed.data);
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update gallery item.' });
    }
  });

  router.delete('/admin/gallery/:id', async (req, res) => {
    try {
      await deleteGalleryItem(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to delete gallery item.' });
    }
  });

  router.post('/admin/gallery/upload', async (req, res) => {
    const schema = z.object({
      fileName: z.string().min(1).max(120),
      contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      base64Data: z.string().min(10).max(6_000_000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Only JPEG, PNG, or WEBP images under 4MB are accepted.' });
      return;
    }
    try {
      const uploaded = await uploadGalleryImage(
        parsed.data.fileName,
        parsed.data.contentType,
        parsed.data.base64Data
      );
      res.status(201).json(uploaded);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Upload failed.' });
    }
  });

  // Website Content & Settings
  const localizedSchema = z.object({
    en: z.string().max(1200),
    bn: z.string().max(1200),
    ne: z.string().max(1200),
  });

  const siteSettingsSchema = z.object({
    business_name: z.string().trim().min(2).max(160),
    diagnostic_wing_name: z.string().trim().min(2).max(160),
    owner_name: z.string().trim().min(2).max(120),
    owner_photo_url: safeUrlSchema,
    primary_phone: z.string().trim().min(6).max(40),
    secondary_phones: z.array(z.string().trim().max(40)).max(6),
    address: z.string().trim().min(5).max(400),
    google_maps_url: safeUrlSchema,
    lab_timing_note: z.string().max(240),
    hero_heading: localizedSchema,
    hero_subheading: localizedSchema,
    about_intro: localizedSchema,
    about_mission: localizedSchema,
    pathology_disclaimer: localizedSchema,
    highlight_cards: z.object({
      consultations: z.object({ title: localizedSchema, description: localizedSchema }),
      diagnostics: z.object({ title: localizedSchema, description: localizedSchema }),
      support: z.object({ title: localizedSchema, description: localizedSchema }),
    }),
  });

  router.put('/admin/settings', async (req, res) => {
    const parsed = siteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid site settings.' });
      return;
    }
    try {
      const saved = await saveSiteSettings(parsed.data);
      res.json(saved);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to save site settings.' });
    }
  });

  // Notifications
  router.patch('/admin/notifications/:id/read', async (req, res) => {
    try {
      await markNotificationRead(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update notification.' });
    }
  });

  // Database Inspector & Seeding
  router.get('/admin/database', async (_req, res) => {
    try {
      const snapshot = await getDatabaseInspectorSnapshot();
      res.json(snapshot);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to inspect database.' });
    }
  });

  router.post('/admin/database/seed', async (_req, res) => {
    try {
      const result = await seedConnectedSupabaseCatalog();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to seed Supabase database.' });
    }
  });

  // Admin Profile
  router.patch('/admin/profile', async (req, res) => {
    const schema = z.object({
      full_name: z.string().trim().min(2).max(100).optional(),
      phone: z.string().trim().max(30).optional(),
      new_password: z.string().min(8).max(128).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile update.' });
      return;
    }
    try {
      const updated = await updateAdminProfile(req.admin!, parsed.data);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update profile.' });
    }
  });

  return router;
}
