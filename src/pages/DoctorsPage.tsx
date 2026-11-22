import React, { useState } from 'react';
import { Calendar, Clock, Phone, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { formatTime12h } from '../lib/timezone';

export function DoctorsPage() {
  const { navigate, publicData, t } = useApp();
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const departments = (publicData?.departments || []).filter(
    (d) => d.category === 'doctor_consultation'
  );
  // publicData.doctors already contains ONLY administrator-verified & active profiles!
  const verifiedDoctors = publicData?.doctors || [];
  const filteredDoctors =
    selectedDept === 'all'
      ? verifiedDoctors
      : verifiedDoctors.filter((d) => d.department_id === selectedDept);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="text-xs font-semibold text-[#168B4B]">
            Specialist Consultation Chambers · New Life Medical Store Kalimpong
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#26352E]">
            {t('navDoctors')}
          </h1>
          <p className="text-base text-[#52645B] leading-relaxed">
            Every doctor profile published here has been verified by the New Life Medical Store
            Kalimpong administrator for qualifications, registration details, and chamber timings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/book', { category: 'doctor_consultation' })}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-sm font-semibold transition-colors whitespace-nowrap w-fit"
        >
          <Calendar className="w-4 h-4" />
          {t('ctaBook')}
        </button>
      </div>

      {/* Department Filter Tabs */}
      {verifiedDoctors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedDept('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              selectedDept === 'all'
                ? 'bg-[#168B4B] text-white'
                : 'bg-[#F2F9F4] text-[#26352E] hover:bg-[#E1F2E7]'
            }`}
          >
            All Departments ({verifiedDoctors.length})
          </button>
          {departments.map((dept) => {
            const count = verifiedDoctors.filter((d) => d.department_id === dept.id).length;
            if (count === 0) return null;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDept(dept.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDept === dept.id
                    ? 'bg-[#168B4B] text-white'
                    : 'bg-[#F2F9F4] text-[#26352E] hover:bg-[#E1F2E7]'
                }`}
              >
                {dept.name.replace(' Consultation', '')} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Published Verified Doctors Grid OR Clean Pending-Verification Notice */}
      {verifiedDoctors.length === 0 ? (
        <div className="rounded-2xl border border-[#DDECE3] bg-[#F2F9F4] p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#DDECE3] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#168B4B]" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-xl text-[#26352E]">
                {t('doctorsPendingTitle')}
              </h2>
              <p className="text-sm text-[#52645B] leading-relaxed">
                {t('doctorsPendingBody')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-white rounded-xl border border-[#DDECE3] p-4 flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#26352E]">
                  <Stethoscope className="w-4 h-4 text-[#168B4B] shrink-0" />
                  <span className="leading-snug">{dept.name.replace(' Consultation', '')}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/book', {
                      category: 'doctor_consultation',
                      departmentId: dept.id,
                    })
                  }
                  className="mt-3 text-left text-xs font-semibold text-[#168B4B] hover:text-[#E34C3D]"
                >
                  Request Consultation →
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={`tel:${(publicData?.settings.primary_phone || '+919800333776').replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E34C3D] hover:bg-[#C93B2D] text-white text-sm font-semibold"
            >
              <Phone className="w-4 h-4" />
              {t('ctaCallNow')}
            </a>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#CBE0D3] text-[#26352E] hover:bg-[#F2F9F4] text-xs font-semibold"
            >
              Clinic Owner? Verify &amp; Publish Doctors in Admin →
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <article
              key={doc.id}
              className="rounded-2xl border border-[#DDECE3] bg-white overflow-hidden flex flex-col justify-between"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {doc.photo_url ? (
                    <img
                      src={doc.photo_url}
                      alt={doc.full_name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-[#DDECE3] shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#F2F9F4] border border-[#DDECE3] flex items-center justify-center shrink-0">
                      <UserRound className="w-7 h-7 text-[#168B4B]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#168B4B] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('verifiedDoctorLabel')}</span>
                    </div>
                    <h2 className="font-display font-bold text-lg text-[#26352E] mt-0.5">
                      {doc.full_name}
                    </h2>
                    <p className="text-xs font-semibold text-[#E34C3D]">{doc.speciality}</p>
                  </div>
                </div>

                {doc.qualifications && (
                  <p className="text-xs text-[#26352E] leading-relaxed">
                    <span className="font-semibold text-[#52645B]">Qualifications: </span>
                    {doc.qualifications}
                  </p>
                )}

                {doc.hospital_affiliation && (
                  <p className="text-xs text-[#52645B]">{doc.hospital_affiliation}</p>
                )}

                {doc.registration_number && (
                  <p className="text-xs font-mono text-[#52645B] tabular-nums">
                    Reg. No.: {doc.registration_number}
                  </p>
                )}

                <div className="pt-3 border-t border-[#F0F5F2] space-y-1.5 text-xs text-[#52645B]">
                  <div className="flex items-center justify-between">
                    <span>Available Days</span>
                    <span className="font-medium text-[#26352E]">
                      {doc.available_days.length > 0
                        ? doc.available_days.join(', ')
                        : t('schedulePending')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Consultation Fee</span>
                    <span className="font-bold text-[#26352E] tabular-nums">
                      {doc.consultation_fee_inr != null
                        ? `₹${Number(doc.consultation_fee_inr).toLocaleString('en-IN')}`
                        : t('feeOnEnquiry')}
                    </span>
                  </div>
                  {doc.available_time_slots.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-[#168B4B] tabular-nums">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {doc.available_time_slots.slice(0, 4).map(formatTime12h).join(' · ')}
                        {doc.available_time_slots.length > 4 ? ' +' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-[#F2F9F4]/60 border-t border-[#DDECE3]">
                <button
                  type="button"
                  onClick={() =>
                    navigate('/book', {
                      category: 'doctor_consultation',
                      departmentId: doc.department_id || undefined,
                      doctorId: doc.id,
                    })
                  }
                  className="w-full py-2.5 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-xs font-semibold transition-colors"
                >
                  Book Consultation with {doc.full_name}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
