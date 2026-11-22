# New Life Medical Store Kalimpong — Full-Stack Healthcare & Appointment Platform

A production full-stack healthcare information, pathology lab directory, doctor consultation showcase, and appointment management platform built for **New Life Medical Store Kalimpong** (Owner: Bijay Gupta, KD Pradhan Road, Chotta Bhalukhop, Kalimpong, West Bengal 734301).

## Key Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Recharts, multilingual support (English, Bengali, Nepali).
- **Backend:** Express + Node.js (`server.ts`) with Zod validation, `Asia/Kolkata` timezone scheduling, double-booking protection, and private server-side Supabase integration.
- **Database & Auth:** Supabase PostgreSQL (`@supabase/supabase-js`) with 12 relational tables, Row Level Security (RLS), Supabase Auth for admin access, and Supabase Storage for gallery uploads.

## Connecting Your Supabase Project

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in Supabase and run `/database/migrations/001_initial_schema.sql`.
3. Create your first Administrator user securely:
   - In Supabase Dashboard -> **Authentication** -> **Users**, click **Add user** (Email + strong password; keep public signups disabled under Auth -> Providers -> Email).
   - Copy the new user's UUID and insert their admin profile in SQL Editor:
     ```sql
     INSERT INTO public.profiles (id, email, full_name, role, is_active)
     VALUES ('<USER_UUID>', 'admin@newlifekalimpong.in', 'Bijay Gupta', 'admin', true);
     ```
4. Configure the following secrets in your hosting / AI Studio Secrets panel (never commit credentials to git):
   - `SUPABASE_URL` — Project URL (`https://<project-ref>.supabase.co`)
   - `SUPABASE_PUBLISHABLE_KEY` — Publishable / anon key
   - `SUPABASE_SECRET_KEY` — Server-side secret / service_role key (never exposed to browser code)
5. Restart the server. The Admin Dashboard (`/admin`) -> **Settings & Database** tab will automatically show **Connected to Supabase PostgreSQL** and allow one-click seeding of initial departments, pathology lab rates, draft doctors, and gallery photos into your Supabase database.

## Optional External Notifications

External Email (SMTP), WhatsApp Business API, and SMS providers remain inactive until their respective credentials (`SMTP_*`, `WHATSAPP_*`, `SMS_*`) are set in environment variables. Every booking and status update is logged transparently in the `notifications` table.

## Running Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm start
```
