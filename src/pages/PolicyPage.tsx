import React from 'react';
import { useApp } from '../hooks/useAppContext';

type PolicyType = 'privacy' | 'terms' | 'booking' | 'cancellation';

const POLICY_CONTENT: Record<
  PolicyType,
  { title: string; updated: string; sections: Array<{ heading: string; body: string }> }
> = {
  privacy: {
    title: 'Privacy Policy & Patient Data Protection',
    updated: 'Effective 2026 · New Life Medical Store Kalimpong',
    sections: [
      {
        heading: '1. Minimum Data Collection Principle',
        body: 'We collect only the minimum personal contact information strictly necessary to schedule and confirm your visit: Full Name, Mobile Number, optional Email Address, optional Age, and your chosen appointment slot. We do not collect prescription uploads, medical records, diagnostic images, or clinical histories through this website.',
      },
      {
        heading: '2. Confidentiality & Private Storage',
        body: 'All customer records and appointment histories are strictly private and accessible only to authorized administrators of New Life Medical Store Kalimpong protected by authentication and Row Level Security. Personal records are never displayed to public visitors.',
      },
      {
        heading: '3. Purpose of Use',
        body: 'Your contact number and optional email are used solely to confirm, reschedule, or notify you about your requested doctor consultation or diagnostic appointment at our KD Pradhan Road, Kalimpong centre.',
      },
      {
        heading: '4. Data Correction & Deletion Requests',
        body: 'You may request correction or deletion of your contact details at any time by calling our appointment desk at +91 98003 33776 or visiting New Life Medical Store Kalimpong.',
      },
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    updated: 'Effective 2026 · New Life Medical Store Kalimpong',
    sections: [
      {
        heading: '1. Platform Scope (No Online Pharmacy)',
        body: 'This website is an informational and appointment-scheduling platform for New Life Medical Store Kalimpong and New Life Diagnostic & Polyclinic. We do not offer online medicine purchasing, prescription drug delivery, or automated prescription refills through this platform.',
      },
      {
        heading: '2. No Online Medical Advice or Diagnosis',
        body: 'Nothing on this website constitutes medical advice, clinical diagnosis, or test-selection recommendations. Patients must consult a qualified registered medical practitioner for medical guidance and test prescriptions.',
      },
      {
        heading: '3. Rates & Specialist Schedules',
        body: 'Diagnostic test rates, health check-up packages, and visiting specialist chamber hours are maintained by the clinic administrator and remain subject to change at the centre. Final confirmation is provided directly by the appointment desk.',
      },
    ],
  },
  booking: {
    title: 'Appointment Booking Policy',
    updated: 'Effective 2026 · Asia/Kolkata (IST)',
    sections: [
      {
        heading: '1. Pending Status Until Clinic Confirmation',
        body: 'Submitting an online request generates a unique booking reference with status Pending Confirmation. An appointment is finalized only when verified and marked Confirmed by the New Life Medical Store Kalimpong desk.',
      },
      {
        heading: '2. Timezone & Arrival',
        body: 'All appointment dates and time slots operate strictly in Indian Standard Time (Asia/Kolkata). Please arrive 10–15 minutes before your confirmed slot, especially for fasting morning pathology tests.',
      },
      {
        heading: '3. Separate Store, Doctor & Diagnostic Timings',
        body: 'While local store availability may extend longer, specialist doctor consultations and pathology diagnostic appointments operate strictly within their dedicated, admin-configured schedules.',
      },
    ],
  },
  cancellation: {
    title: 'Cancellation & Rescheduling Policy',
    updated: 'Effective 2026 · New Life Medical Store Kalimpong',
    sections: [
      {
        heading: '1. Patient Cancellations',
        body: 'If you are unable to attend your scheduled consultation or laboratory visit, please inform our appointment desk at +91 98003 33776 at least 2 hours prior to your slot so the time can be released for another patient.',
      },
      {
        heading: '2. Clinic or Specialist Schedule Changes',
        body: 'Because visiting specialist schedules in Kalimpong may occasionally adjust due to hospital emergencies or travel, New Life Medical Store reserves the right to reschedule appointments and will notify affected patients promptly.',
      },
      {
        heading: '3. No Online Advance Payment',
        body: 'Online booking requests do not require online pre-payment on this platform; there are no online cancellation fees.',
      },
    ],
  },
};

export function PolicyPage({ type }: { type: PolicyType }) {
  const { navigate } = useApp();
  const doc = POLICY_CONTENT[type];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 border-b border-[#DDECE3] pb-6">
        <div className="text-xs font-semibold text-[#168B4B]">{doc.updated}</div>
        <h1 className="font-display font-extrabold text-3xl text-[#26352E]">{doc.title}</h1>
      </div>

      <div className="space-y-6">
        {doc.sections.map((sec) => (
          <section key={sec.heading} className="space-y-2">
            <h2 className="font-display font-bold text-lg text-[#26352E]">{sec.heading}</h2>
            <p className="text-sm sm:text-base text-[#52645B] leading-relaxed">{sec.body}</p>
          </section>
        ))}
      </div>

      <div className="pt-6 border-t border-[#DDECE3] flex flex-wrap gap-3 text-xs font-semibold">
        {[
          { to: '/privacy', label: 'Privacy Policy' },
          { to: '/terms', label: 'Terms & Conditions' },
          { to: '/booking-policy', label: 'Booking Policy' },
          { to: '/cancellation-policy', label: 'Cancellation Policy' },
        ].map((link) => (
          <button
            key={link.to}
            type="button"
            onClick={() => navigate(link.to)}
            className="px-3 py-1.5 rounded-lg bg-[#F2F9F4] text-[#168B4B] hover:bg-[#168B4B] hover:text-white transition-colors"
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
}
