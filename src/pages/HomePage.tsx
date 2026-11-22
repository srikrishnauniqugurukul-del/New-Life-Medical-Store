import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Microscope,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserRound,
} from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { pickLocalized } from '../lib/i18n';
import { NewLifeBrandLockup, NewLifeDiagnosticEmblem } from '../components/BrandLogo';

export function HomePage() {
  const { navigate, publicData, loadingPublic, lang, t } = useApp();
  const [heroDeptFilter, setHeroDeptFilter] = useState<string>('all');

  const verifiedDoctors = publicData?.doctors || [];
  const filteredHeroDoctors = useMemo(() => {
    if (heroDeptFilter === 'all') return verifiedDoctors;
    return verifiedDoctors.filter((d) => d.department_id === heroDeptFilter);
  }, [verifiedDoctors, heroDeptFilter]);

  if (loadingPublic && !publicData) {
    return (
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="h-72 rounded-2xl bg-[#F2F9F4] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-[#F2F9F4] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const settings = publicData?.settings;
  const departments = (publicData?.departments || []).filter(
    (d) => d.category === 'doctor_consultation'
  );
  const packages = (publicData?.services || []).filter((s) => s.category === 'health_package');
  const labTestsCount = (publicData?.services || []).filter(
    (s) => s.category === 'pathology_test'
  ).length;

  return (
    <div>
      {/* 1. PREMIUM HEALTHCARE HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F2F9F4] via-white to-white border-b border-[#DDECE3]">
        {/* Subtle geometric medical grid accent */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 85% 18%, rgba(22, 139, 75, 0.12) 0%, transparent 45%), radial-gradient(circle at 12% 85%, rgba(227, 76, 61, 0.08) 0%, transparent 40%)',
          }}
        />

        <div className="relative max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Dominant Editorial Narrative */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm font-medium text-[#168B4B]">
                <span>{t('heroKicker')}</span>
                <span aria-hidden="true" className="text-[#A3C4B1]">
                  ·
                </span>
                <span className="text-[#52645B] tabular-nums">
                  {settings?.primary_phone || '+91 98003 33776'}
                </span>
              </div>

              <h1 className="font-display font-extrabold tracking-tight text-[#26352E] text-[clamp(2.25rem,4.2vw,3.75rem)] leading-[1.08]">
                {pickLocalized(settings?.hero_heading, lang) || 'Your Health, Our Priority.'}
              </h1>

              <p className="text-base sm:text-lg text-[#52645B] leading-relaxed max-w-2xl">
                {pickLocalized(settings?.hero_subheading, lang) ||
                  'Accessible healthcare services, professional consultations and diagnostic facilities in Kalimpong.'}
              </p>

              {/* Primary + Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/book')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-sm sm:text-base font-semibold transition-colors shadow-sm whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4" />
                  {t('ctaBook')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/services')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-[#F2F9F4] text-[#26352E] border border-[#CBE0D3] text-sm sm:text-base font-semibold transition-colors whitespace-nowrap"
                >
                  {t('ctaExplore')}
                  <ArrowRight className="w-4 h-4 text-[#168B4B]" />
                </button>
              </div>

              <p className="text-xs text-[#52645B] pt-2 max-w-xl leading-relaxed">
                {t('heroNotice')}
              </p>
            </div>

            {/* Right Authentic Clinic & Diagnostic Visual Showcase */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-[#DDECE3] bg-white shadow-sm flex-1 min-h-[280px]">
                <img
                  src="/assets/aistudio/12_2cdba348.jpg"
                  alt="New Life Diagnostic & Polyclinic Kalimpong Health Packages & Laboratory Timings"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="bg-gradient-to-t from-[#1B2822]/90 via-[#1B2822]/30 to-transparent absolute inset-0 flex flex-col justify-end p-5 text-white">
                  <div className="text-xs font-medium text-[#86EFAC]">
                    New Life Diagnostic &amp; Polyclinic · Lab Hours 8:00 AM – 6:00 PM
                  </div>
                  <div className="text-base font-display font-bold mt-0.5">
                    Blood, Stool, Urine, E.C.G., Dental X-Ray &amp; Health Packages
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-[#DDECE3] bg-white aspect-[16/10] relative">
                  <img
                    src="/assets/aistudio/1_4fd6a044.jpeg"
                    alt="New Life Medical Store Kalimpong Signboard"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-[#DDECE3] bg-white aspect-[16/10] relative">
                  <img
                    src="/assets/aistudio/2_69cc9ed2.jpeg"
                    alt="New Life Diagnostic Services Standee"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Three Editable Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                key: 'consultations',
                icon: Stethoscope,
                accent: 'text-[#168B4B] bg-[#F2F9F4]',
                action: () => navigate('/doctors'),
                actionLabel: t('viewAllDoctors'),
                data: settings?.highlight_cards.consultations,
              },
              {
                key: 'diagnostics',
                icon: Microscope,
                accent: 'text-[#E34C3D] bg-[#FFF2F0]',
                action: () => navigate('/diagnostics'),
                actionLabel: t('ctaViewLab'),
                data: settings?.highlight_cards.diagnostics,
              },
              {
                key: 'support',
                icon: UserCheck,
                accent: 'text-[#168B4B] bg-[#F2F9F4]',
                action: () => navigate('/contact'),
                actionLabel: t('ctaCallNow'),
                data: settings?.highlight_cards.support,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className="bg-white rounded-2xl border border-[#DDECE3] p-6 flex flex-col justify-between hover:border-[#168B4B]/50 transition-colors"
                >
                  <div>
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${card.accent}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-display font-bold text-lg text-[#26352E]">
                      {pickLocalized(card.data?.title, lang)}
                    </h2>
                    <p className="text-sm text-[#52645B] leading-relaxed mt-2">
                      {pickLocalized(card.data?.description, lang)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={card.action}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#168B4B] hover:text-[#11713C] w-fit"
                  >
                    {card.actionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Visiting Specialist Doctors Showcase — All Doctors & Specialities */}
          {verifiedDoctors.length > 0 && (
            <div className="mt-12 rounded-2xl border border-[#DDECE3] bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#EEF5F0]">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#168B4B]">
                    Visiting Specialist Chambers · New Life Medical Store Kalimpong
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#26352E]">
                    Our Specialist Doctors ({verifiedDoctors.length})
                  </h2>
                  <p className="text-sm text-[#52645B]">
                    Browse all visiting specialists by department and book your consultation chamber
                    slot directly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/doctors')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#168B4B] hover:text-[#11713C] whitespace-nowrap shrink-0"
                >
                  {t('viewAllDoctors')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Clean Interactive Speciality Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5 py-5">
                <button
                  type="button"
                  onClick={() => setHeroDeptFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    heroDeptFilter === 'all'
                      ? 'bg-[#168B4B] text-white'
                      : 'bg-[#F2F9F4] text-[#52645B] hover:text-[#26352E]'
                  }`}
                >
                  All Specialists ({verifiedDoctors.length})
                </button>
                {departments.map((dept) => {
                  const count = verifiedDoctors.filter((d) => d.department_id === dept.id).length;
                  if (count === 0) return null;
                  const shortLabel = dept.name
                    .replace(' Consultation', '')
                    .replace(' and Skin', '')
                    .replace(' and Head & Neck', '');
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setHeroDeptFilter(dept.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        heroDeptFilter === dept.id
                          ? 'bg-[#168B4B] text-white'
                          : 'bg-[#F2F9F4] text-[#52645B] hover:text-[#26352E]'
                      }`}
                    >
                      {shortLabel} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Clean, Scannable Doctors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredHeroDoctors.map((doc) => {
                  const dept = departments.find((d) => d.id === doc.department_id);
                  const deptTitle = dept
                    ? dept.name.replace(' Consultation', '')
                    : doc.speciality;
                  return (
                    <div
                      key={doc.id}
                      className="group rounded-xl border border-[#DDECE3] bg-[#FCFDFC] hover:bg-white hover:border-[#168B4B]/60 p-4 flex flex-col justify-between transition-colors"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F2F9F4] text-[#168B4B] group-hover:bg-[#168B4B] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                            <UserRound className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-[#168B4B] truncate">
                              {deptTitle}
                            </div>
                            <h3 className="font-display font-bold text-[15px] text-[#26352E] leading-snug mt-0.5">
                              {doc.full_name}
                            </h3>
                          </div>
                        </div>

                        <div className="text-xs font-medium text-[#E34C3D] leading-snug">
                          {doc.speciality}
                        </div>

                        {doc.qualifications && (
                          <p className="text-[11px] text-[#52645B] leading-relaxed line-clamp-2">
                            {doc.qualifications}
                          </p>
                        )}

                        {doc.hospital_affiliation && (
                          <p className="text-[11px] text-[#52645B] font-medium truncate">
                            {doc.hospital_affiliation}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#EEF5F0] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#52645B] tabular-nums">
                          {doc.registration_number
                            ? `Reg: ${doc.registration_number}`
                            : 'Kalimpong Chamber'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/book', {
                              category: 'doctor_consultation',
                              departmentId: doc.department_id || undefined,
                              doctorId: doc.id,
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#168B4B] hover:text-[#E34C3D] transition-colors whitespace-nowrap shrink-0"
                        >
                          Book
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. DOCTOR CONSULTATION DEPARTMENTS */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#26352E]">
              {t('sectionDepartments')}
            </h2>
            <p className="text-sm sm:text-base text-[#52645B] mt-2">
              {t('sectionDepartmentsSub')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/services')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#168B4B] hover:text-[#11713C] whitespace-nowrap shrink-0"
          >
            {t('viewAllServices')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {departments.map((dept, index) => (
            <div
              key={dept.id}
              className="rounded-xl border border-[#DDECE3] bg-white p-5 flex flex-col justify-between hover:border-[#168B4B]/60 transition-colors"
            >
              <div>
                <div className="text-xs font-mono text-[#52645B] tabular-nums mb-2">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="font-display font-bold text-[15px] text-[#26352E] leading-snug">
                  {lang === 'bn' && dept.name_bn
                    ? dept.name_bn
                    : lang === 'ne' && dept.name_ne
                      ? dept.name_ne
                      : dept.name}
                </h3>
                {dept.description && (
                  <p className="text-xs text-[#52645B] mt-2 leading-relaxed line-clamp-2">
                    {dept.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate('/book', {
                    category: 'doctor_consultation',
                    departmentId: dept.id,
                  })
                }
                className="mt-4 text-xs font-semibold text-[#168B4B] hover:text-[#E34C3D] inline-flex items-center gap-1 transition-colors"
              >
                {t('bookThisService')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. PATHOLOGY LAB & OFFICIAL HEALTH PACKAGES */}
      <section className="bg-[#F2F9F4] border-y border-[#DDECE3] py-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="flex items-start gap-4 max-w-2xl">
              <NewLifeDiagnosticEmblem size={54} />
              <div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#26352E]">
                  {t('sectionDiagnostics')}
                </h2>
                <p className="text-sm sm:text-base text-[#52645B] mt-1.5">
                  {t('sectionPackagesSub')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/diagnostics')}
                className="px-5 py-2.5 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                {t('ctaViewLab')} ({labTestsCount}+ Tests)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.slice(0, 8).map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl border border-[#DDECE3] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-[#52645B] flex items-center gap-1.5">
                    <span>Diagnostic Package</span>
                    <span aria-hidden="true">·</span>
                    <span>{pkg.availability_note || '8:00 AM – 6:00 PM'}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-[#26352E] mt-2 leading-snug">
                    {lang === 'bn' && pkg.name_bn
                      ? pkg.name_bn
                      : lang === 'ne' && pkg.name_ne
                        ? pkg.name_ne
                        : pkg.name}
                  </h3>
                  {pkg.fee_inr != null && (
                    <div className="mt-3 font-display font-extrabold text-2xl text-[#E34C3D] tabular-nums">
                      ₹{Number(pkg.fee_inr).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/book', {
                      category: 'diagnostic',
                      serviceId: pkg.id,
                    })
                  }
                  className="mt-5 w-full py-2.5 px-4 rounded-lg bg-[#F2F9F4] hover:bg-[#168B4B] text-[#168B4B] hover:text-white text-xs font-semibold transition-colors"
                >
                  {t('bookThisPackage')}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#52645B] mt-6 leading-relaxed max-w-4xl">
            {pickLocalized(settings?.pathology_disclaimer, lang)}
          </p>
        </div>
      </section>

      {/* 4. ABOUT & OWNER IDENTITY SECTION (FEATURING REAL OWNER PHOTO) */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-[#DDECE3] bg-[#F2F9F4] aspect-[4/4]">
              <img
                src={settings?.owner_photo_url || '/assets/aistudio/10_3d4d9de3.jpg'}
                alt={`${settings?.owner_name || 'Bijay Gupta'} — Proprietor, New Life Medical Store Kalimpong`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <NewLifeBrandLockup showSub />
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#26352E]">
              Trusted Local Healthcare Coordination in Kalimpong
            </h2>
            <p className="text-base text-[#52645B] leading-relaxed">
              {pickLocalized(settings?.about_intro, lang)}
            </p>
            <p className="text-sm text-[#52645B] leading-relaxed">
              {pickLocalized(settings?.about_mission, lang)}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#DDECE3]">
              <div className="flex items-start gap-3 pt-3">
                <ShieldCheck className="w-5 h-5 text-[#168B4B] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-[#52645B]">{t('ownerRole')}</div>
                  <div className="font-display font-bold text-[#26352E]">
                    {settings?.owner_name || 'Bijay Gupta'}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-3">
                <Phone className="w-5 h-5 text-[#E34C3D] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-[#52645B]">{t('contactLabel')}</div>
                  <a
                    href={`tel:${(settings?.primary_phone || '+919800333776').replace(/\s+/g, '')}`}
                    className="font-display font-bold text-[#26352E] hover:text-[#168B4B] tabular-nums"
                  >
                    {settings?.primary_phone || '+91 98003 33776'}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="w-5 h-5 text-[#168B4B] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-[#52645B]">{t('locationLabel')}</div>
                  <div className="text-sm font-medium text-[#26352E]">
                    {settings?.address}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="px-5 py-2.5 rounded-xl bg-[#26352E] hover:bg-[#1B2822] text-white text-sm font-semibold transition-colors"
              >
                {t('navAbout')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/gallery')}
                className="px-5 py-2.5 rounded-xl border border-[#CBE0D3] text-[#26352E] hover:bg-[#F2F9F4] text-sm font-semibold transition-colors"
              >
                {t('viewGallery')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VERIFIED DOCTORS PREVIEW + APPOINTMENT CTA BAND */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-2xl bg-[#168B4B] text-white p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-[#BBF7D0]">
              <Clock className="w-4 h-4" />
              <span>Asia/Kolkata (IST) Online Scheduling</span>
              {verifiedDoctors.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{verifiedDoctors.length} Verified Consultants Published</span>
                </>
              )}
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">
              Need a Doctor Consultation or Diagnostic Lab Slot?
            </h2>
            <p className="text-sm sm:text-base text-[#DCFCE7]">
              Submit your appointment request online in minutes or check the live status of an
              existing booking reference.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/book')}
              className="px-6 py-3.5 rounded-xl bg-[#E34C3D] hover:bg-[#C93B2D] text-white text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
            >
              {t('ctaBook')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="px-6 py-3.5 rounded-xl bg-white text-[#168B4B] hover:bg-[#F2F9F4] text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {t('navContact')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
