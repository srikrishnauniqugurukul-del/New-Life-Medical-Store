import React, { useState } from 'react';
import { ArrowRight, Clock, Microscope, Stethoscope } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { pickLocalized } from '../lib/i18n';

export function ServicesPage() {
  const { navigate, publicData, lang, t } = useApp();
  const [tab, setTab] = useState<'all' | 'doctor_consultation' | 'diagnostic'>('all');

  const services = publicData?.services || [];
  const consultationServices = services.filter((s) => s.category === 'doctor_consultation');
  const diagnosticServices = services.filter((s) => s.category === 'diagnostic');

  const getLocalizedName = (s: { name: string; name_bn?: string | null; name_ne?: string | null }) =>
    lang === 'bn' && s.name_bn ? s.name_bn : lang === 'ne' && s.name_ne ? s.name_ne : s.name;

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="text-xs font-semibold text-[#168B4B]">
            New Life Medical Store &amp; Diagnostic Polyclinic
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#26352E]">
            {t('navServices')}
          </h1>
          <p className="text-base text-[#52645B] leading-relaxed">
            Explore our visiting doctor consultation departments and in-house pathology &amp;
            diagnostic facilities in Kalimpong. All services are dynamically managed by the clinic
            administrator.
          </p>
        </div>

        {/* Interactive Filter Segmented Control */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#F2F9F4] border border-[#DDECE3] w-fit">
          {[
            { id: 'all', label: 'All Services' },
            { id: 'doctor_consultation', label: 'Doctor Consultations' },
            { id: 'diagnostic', label: 'Diagnostic Services' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setTab(btn.id as any)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                tab === btn.id
                  ? 'bg-white text-[#168B4B] font-semibold shadow-xs'
                  : 'text-[#52645B] hover:text-[#26352E]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor Consultation Services */}
      {(tab === 'all' || tab === 'doctor_consultation') && (
        <section className="space-y-6">
          <div className="flex items-center gap-2.5 border-b border-[#DDECE3] pb-3">
            <Stethoscope className="w-5 h-5 text-[#168B4B]" />
            <h2 className="font-display font-bold text-2xl text-[#26352E]">
              Doctor Consultation Services ({consultationServices.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {consultationServices.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border border-[#DDECE3] bg-white p-6 flex flex-col justify-between hover:border-[#168B4B]/50 transition-colors"
              >
                <div>
                  <div className="text-xs text-[#52645B] flex items-center gap-2">
                    <span>Doctor Consultation</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      {service.duration_minutes} mins
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#26352E] mt-2">
                    {getLocalizedName(service)}
                  </h3>
                  {service.description && (
                    <p className="text-sm text-[#52645B] mt-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#F0F5F2] flex items-center justify-between gap-3">
                  <div className="text-xs text-[#52645B]">
                    {service.fee_inr != null ? (
                      <span className="font-bold text-[#26352E] text-sm tabular-nums">
                        ₹{Number(service.fee_inr).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      t('feeOnEnquiry')
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/book', {
                        category: 'doctor_consultation',
                        serviceId: service.id,
                        departmentId: service.department_id || undefined,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#168B4B] hover:bg-[#11713C] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    {t('bookThisService')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Diagnostic Services */}
      {(tab === 'all' || tab === 'diagnostic') && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDECE3] pb-3">
            <div className="flex items-center gap-2.5">
              <Microscope className="w-5 h-5 text-[#E34C3D]" />
              <h2 className="font-display font-bold text-2xl text-[#26352E]">
                Diagnostic Services ({diagnosticServices.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/diagnostics')}
              className="text-sm font-semibold text-[#E34C3D] hover:underline inline-flex items-center gap-1"
            >
              View Full Pathology Rate List &amp; Health Packages
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {diagnosticServices.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border border-[#DDECE3] bg-white p-6 flex flex-col justify-between hover:border-[#E34C3D]/50 transition-colors"
              >
                <div>
                  <div className="text-xs text-[#52645B] flex items-center gap-2">
                    <span>New Life Diagnostic &amp; Polyclinic</span>
                    <span aria-hidden="true">·</span>
                    <span>{service.availability_note || 'Lab Hours: 8:00 AM – 6:00 PM'}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#26352E] mt-2">
                    {getLocalizedName(service)}
                  </h3>
                  {service.description && (
                    <p className="text-sm text-[#52645B] mt-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#F0F5F2] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#52645B] tabular-nums">
                    Approx. {service.duration_minutes} mins
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/book', {
                        category: 'diagnostic',
                        serviceId: service.id,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E34C3D] hover:bg-[#C93B2D] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    {t('bookThisService')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clear Scope & Medical Disclaimer */}
      <div className="rounded-xl border border-[#DDECE3] bg-[#F2F9F4] p-5 text-xs text-[#52645B] leading-relaxed">
        {pickLocalized(publicData?.settings.pathology_disclaimer, lang)}
      </div>
    </div>
  );
}
