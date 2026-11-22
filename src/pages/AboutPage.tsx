import React from 'react';
import { Calendar, Clock, ExternalLink, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { pickLocalized } from '../lib/i18n';
import { DAY_NAMES_EN, formatTime12h } from '../lib/timezone';
import { NewLifeBrandLockup } from '../components/BrandLogo';

export function AboutPage() {
  const { navigate, publicData, lang, t } = useApp();
  const settings = publicData?.settings;
  const businessHours = publicData?.businessHours || [];

  const diagHours = businessHours.filter((h) => h.schedule_type === 'diagnostic');
  const docHours = businessHours.filter((h) => h.schedule_type === 'doctor_consultation');
  const hoursVerified = businessHours.some((h) => h.is_verified);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Page Header */}
      <div className="max-w-3xl space-y-4">
        <div className="text-xs font-semibold text-[#168B4B] tracking-wide">
          New Life Medical Store Kalimpong · Established Local Healthcare Centre
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#26352E]">
          {t('navAbout')}
        </h1>
        <p className="text-base sm:text-lg text-[#52645B] leading-relaxed">
          {pickLocalized(settings?.about_intro, lang)}
        </p>
      </div>

      {/* Owner Profile & Brand Identity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl overflow-hidden border border-[#DDECE3] bg-[#F2F9F4]">
            <img
              src={settings?.owner_photo_url || '/assets/aistudio/10_3d4d9de3.jpg'}
              alt={`${settings?.owner_name || 'Bijay Gupta'} — Proprietor`}
              referrerPolicy="no-referrer"
              className="w-full aspect-square object-cover object-top"
            />
            <div className="p-5 bg-white border-t border-[#DDECE3]">
              <div className="text-xs text-[#168B4B] font-semibold">{t('ownerRole')}</div>
              <h2 className="font-display font-bold text-xl text-[#26352E] mt-0.5">
                {settings?.owner_name || 'Bijay Gupta'}
              </h2>
              <p className="text-sm text-[#52645B] mt-1">
                {settings?.business_name || 'New Life Medical Store Kalimpong'}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl border border-[#DDECE3] bg-white space-y-5">
            <NewLifeBrandLockup showSub />
            <p className="text-base text-[#26352E] leading-relaxed">
              {pickLocalized(settings?.about_mission, lang)}
            </p>
            <p className="text-sm text-[#52645B] leading-relaxed">
              This website serves strictly as our healthcare information, diagnostic rate
              reference, and appointment scheduling platform. We do not conduct online medicine
              sales, prescription drug dispensing online, or remote medical diagnoses. All patient
              consultations and diagnostic sample collections take place in person at our Kalimpong
              centre.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#DDECE3]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#168B4B] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[#52645B]">{t('locationLabel')}</div>
                  <div className="text-sm text-[#26352E] mt-0.5">{settings?.address}</div>
                  {settings?.google_maps_url && (
                    <a
                      href={settings.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#168B4B] hover:underline mt-2"
                    >
                      {t('openGoogleMaps')}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#E34C3D] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[#52645B]">{t('contactLabel')}</div>
                  <a
                    href={`tel:${(settings?.primary_phone || '+919800333776').replace(/\s+/g, '')}`}
                    className="block text-sm font-bold text-[#26352E] hover:text-[#168B4B] mt-0.5 tabular-nums"
                  >
                    {settings?.primary_phone || '+91 98003 33776'}
                  </a>
                  {(settings?.secondary_phones || []).map((p) => (
                    <a
                      key={p}
                      href={`tel:${p.replace(/\s+/g, '')}`}
                      className="block text-sm text-[#52645B] hover:text-[#168B4B] tabular-nums"
                    >
                      {p}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/book')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-sm font-semibold transition-colors"
              >
                <Calendar className="w-4 h-4" />
                {t('ctaBook')}
              </button>
            </div>
          </div>

          {/* Authentic Clinic Brand Photographs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden border border-[#DDECE3] bg-white">
              <img
                src="/assets/aistudio/1_4fd6a044.jpeg"
                alt="New Life Medical Store Kalimpong Exterior Signboard"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-3 text-xs text-[#52645B]">
                New Life Medical Store signboard — KD Pradhan Road, Kalimpong
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-[#DDECE3] bg-white">
              <img
                src="/assets/aistudio/2_69cc9ed2.jpeg"
                alt="New Life Diagnostic & Polyclinic Standee"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-3 text-xs text-[#52645B]">
                New Life Diagnostic &amp; Polyclinic — Blood, Stool, Urine, E.C.G., Dental X-ray
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Separate Business Hours Overview */}
      <section className="rounded-2xl border border-[#DDECE3] bg-[#F2F9F4] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-2xl text-[#26352E] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#168B4B]" />
              {t('hoursLabel')}
            </h2>
            <p className="text-sm text-[#52645B] mt-1">{t('medicalStore24hNote')}</p>
          </div>
          {!hoursVerified && (
            <div className="text-xs font-semibold text-[#C93B2D] bg-[#FFF2F0] border border-[#F5C6C0] px-3 py-1.5 rounded-lg w-fit">
              {t('timingsPendingNotice')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-[#DDECE3] p-5">
            <h3 className="font-display font-bold text-base text-[#26352E]">Medical Store</h3>
            <p className="text-xs text-[#52645B] mt-1">
              Public listing reference: 24-hour availability (confirm locally for late-night visits).
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#168B4B]">
              <ShieldCheck className="w-4 h-4" />
              Separate from doctor &amp; lab hours
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#DDECE3] p-5">
            <h3 className="font-display font-bold text-base text-[#26352E] mb-3">
              Doctor Consultations
            </h3>
            <div className="space-y-1.5 text-xs">
              {docHours.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[#52645B]">
                  <span className="font-medium text-[#26352E]">{DAY_NAMES_EN[h.day_of_week]}</span>
                  <span className="tabular-nums">
                    {!h.is_verified
                      ? 'Pending verification'
                      : h.is_open
                        ? `${formatTime12h(h.open_time)} – ${formatTime12h(h.close_time)}`
                        : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#DDECE3] p-5">
            <h3 className="font-display font-bold text-base text-[#26352E] mb-3">
              Diagnostic Lab Appointments
            </h3>
            <div className="space-y-1.5 text-xs">
              {diagHours.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[#52645B]">
                  <span className="font-medium text-[#26352E]">{DAY_NAMES_EN[h.day_of_week]}</span>
                  <span className="tabular-nums">
                    {!h.is_verified
                      ? '8:00 AM – 6:00 PM (Poster ref.)'
                      : h.is_open
                        ? `${formatTime12h(h.open_time)} – ${formatTime12h(h.close_time)}`
                        : 'Closed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
