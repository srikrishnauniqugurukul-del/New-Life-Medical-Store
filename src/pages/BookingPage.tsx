import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Microscope,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import type { AppointmentCategory, AppointmentStatus, TimeSlotOption } from '../lib/types';
import {
  DAY_SHORT_EN,
  formatDateReadable,
  formatTime12h,
  getDayOfWeekFromDateString,
  getTodayIST,
  getUpcomingDatesIST,
} from '../lib/timezone';
import { api } from '../services/apiClient';

export function BookingPage() {
  const { publicData, bookingPrefill, clearBookingPrefill, pushToast, t } = useApp();

  const [step, setStep] = useState<number>(1);
  const [category, setCategory] = useState<AppointmentCategory>('doctor_consultation');
  const [serviceId, setServiceId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>(''); // '' means Clinic-Assigned Specialist / N/A
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIST());
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Dynamic slot state fetched from server
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [dateBlocked, setDateBlocked] = useState(false);
  const [dateBlockReason, setDateBlockReason] = useState<string>('');

  // Customer info
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Submission & confirmation
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    booking_reference: string;
    status: AppointmentStatus;
    appointment_date: string;
    appointment_time: string;
    timezone: string;
    service_name: string | null;
    doctor_name: string | null;
    category: AppointmentCategory;
    backendMode: 'supabase' | 'local_preview';
  } | null>(null);

  // Booking status lookup
  const [lookupRef, setLookupRef] = useState('');
  const [lookupMobile, setLookupMobile] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    booking_reference: string;
    status: AppointmentStatus;
    appointment_date: string;
    appointment_time: string;
    service_name: string | null;
    doctor_name: string | null;
  } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const services = publicData?.services || [];
  const doctors = publicData?.doctors || [];
  const blockedDates = publicData?.blockedDates || [];

  // Apply navigation prefill if user clicked a specific doctor/service/test
  useEffect(() => {
    if (!bookingPrefill || services.length === 0) return;
    if (bookingPrefill.category) {
      setCategory(bookingPrefill.category);
    }
    if (bookingPrefill.serviceId) {
      setServiceId(bookingPrefill.serviceId);
      setStep(bookingPrefill.category === 'diagnostic' ? 4 : 3);
    } else if (bookingPrefill.departmentId) {
      const matchingService = services.find(
        (s) => s.category === 'doctor_consultation' && s.department_id === bookingPrefill.departmentId
      );
      if (matchingService) {
        setServiceId(matchingService.id);
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (bookingPrefill.category) {
      setStep(2);
    }
    if (bookingPrefill.doctorId) {
      setDoctorId(bookingPrefill.doctorId);
      setStep(4);
    }
    clearBookingPrefill();
  }, [bookingPrefill, services, clearBookingPrefill]);

  const filteredServices = useMemo(() => {
    if (category === 'doctor_consultation') {
      return services.filter((s) => s.category === 'doctor_consultation');
    }
    return services.filter(
      (s) =>
        s.category === 'diagnostic' ||
        s.category === 'health_package' ||
        s.category === 'pathology_test'
    );
  }, [services, category]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId]
  );

  const matchingDoctors = useMemo(() => {
    if (category !== 'doctor_consultation') return [];
    if (!selectedService?.department_id) return doctors;
    return doctors.filter((d) => d.department_id === selectedService.department_id);
  }, [category, doctors, selectedService]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId) || null,
    [doctors, doctorId]
  );

  const upcomingDates = useMemo(() => getUpcomingDatesIST(28), []);

  // Fetch live server-side available slots whenever date/category/service/doctor changes on step >= 4
  useEffect(() => {
    if (step < 4 || !selectedDate) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime('');
    api
      .getAvailableSlots({
        category,
        date: selectedDate,
        serviceId: serviceId || undefined,
        doctorId: doctorId || undefined,
      })
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        setDateBlocked(res.isBlocked);
        setDateBlockReason(res.blockReason || '');
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setDateBlocked(true);
        setDateBlockReason('Unable to load slot availability right now.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, category, serviceId, doctorId, selectedDate]);

  const isDateMarkedBlocked = (dateStr: string) =>
    blockedDates.some(
      (b) =>
        b.is_active &&
        b.is_full_day &&
        b.block_date === dateStr &&
        (b.scope === 'all' ||
          b.scope === category ||
          (b.scope === 'doctor' && doctorId && b.doctor_id === doctorId))
    );

  const validateCustomerStep = (): boolean => {
    setFormError(null);
    if (fullName.trim().length < 2) {
      setFormError(t('errNameRequired'));
      return false;
    }
    const digits = mobile.replace(/\D/g, '');
    if (digits.length !== 10) {
      setFormError(t('errMobileInvalid'));
      return false;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError(t('errEmailInvalid'));
      return false;
    }
    if (age.trim()) {
      const n = Number(age);
      if (Number.isNaN(n) || n < 0 || n > 120) {
        setFormError(t('errAgeInvalid'));
        return false;
      }
    }
    return true;
  };

  const handleSubmitBooking = async () => {
    if (!serviceId || !selectedDate || !selectedTime) {
      pushToast('error', t('errSlotRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.submitBooking({
        category,
        department_id: selectedService?.department_id || null,
        service_id: serviceId,
        doctor_id: category === 'doctor_consultation' && doctorId ? doctorId : null,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        full_name: fullName.trim(),
        mobile_number: mobile.replace(/\D/g, ''),
        email: email.trim() || null,
        age: age.trim() ? Number(age) : null,
        customer_message: message.trim() || null,
      });
      setConfirmedBooking(res);
      setStep(8);
      pushToast('success', `Booking ${res.booking_reference} submitted.`);
    } catch (err: any) {
      pushToast('error', err?.message || 'Booking could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    setLookupLoading(true);
    try {
      const res = await api.lookupBooking(lookupRef, lookupMobile);
      setLookupResult(res);
    } catch (err: any) {
      setLookupError(err?.message || 'Booking not found.');
    } finally {
      setLookupLoading(false);
    }
  };

  const resetWizard = () => {
    setConfirmedBooking(null);
    setStep(1);
    setServiceId('');
    setDoctorId('');
    setSelectedTime('');
    setFullName('');
    setMobile('');
    setEmail('');
    setAge('');
    setMessage('');
  };

  const statusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return { label: t('statusConfirmed'), cls: 'bg-[#F2F9F4] text-[#168B4B] border-[#168B4B]/30' };
      case 'cancelled':
        return { label: t('statusCancelled'), cls: 'bg-[#FFF2F0] text-[#E34C3D] border-[#E34C3D]/30' };
      case 'completed':
        return { label: t('statusCompleted'), cls: 'bg-[#F0F5F2] text-[#26352E] border-[#CBE0D3]' };
      case 'no_show':
        return { label: t('statusNoShow'), cls: 'bg-[#FFF2F0] text-[#C93B2D] border-[#E34C3D]/30' };
      default:
        return { label: t('statusPending'), cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
  };

  const stepLabels = [
    t('step1Title'),
    t('step2Title'),
    t('step3Title'),
    t('step4Title'),
    t('step5Title'),
    t('step6Title'),
    t('step7Title'),
    t('step8Title'),
  ];

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Page Header */}
      <div className="space-y-2 max-w-2xl">
        <div className="text-xs font-semibold text-[#168B4B]">
          Asia/Kolkata (IST) · Real-Time Slot Availability
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#26352E]">
          {t('bookingTitle')}
        </h1>
        <p className="text-sm sm:text-base text-[#52645B]">{t('bookingSubtitle')}</p>
      </div>

      {/* Backend connection honesty notice (only when Supabase env vars aren't configured yet) */}
      {publicData && !publicData.health.supabaseConnected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <div>
            <strong>Preview Server Mode:</strong> Supabase PostgreSQL credentials are not yet
            connected in server secrets. Bookings submitted now are validated by the live Node.js
            server and visible in the Admin Dashboard for testing, but connect Supabase to persist
            records permanently.
          </div>
        </div>
      )}

      {/* Progress Stepper */}
      <div className="overflow-x-auto pb-2">
        <ol className="flex items-center gap-2 min-w-max">
          {stepLabels.map((label, idx) => {
            const num = idx + 1;
            const active = step === num;
            const done = step > num;
            return (
              <li
                key={label}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#168B4B] text-white border-[#168B4B]'
                    : done
                      ? 'bg-[#F2F9F4] text-[#168B4B] border-[#CBE0D3]'
                      : 'bg-white text-[#7D9186] border-[#E6EFEA]'
                }`}
              >
                {label}
              </li>
            );
          })}
        </ol>
      </div>

      {/* MAIN WIZARD CARD */}
      <div className="rounded-2xl border border-[#DDECE3] bg-white p-6 sm:p-8 shadow-xs">
        {/* STEP 1: CATEGORY */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-[#26352E]">{t('chooseCategory')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                type="button"
                onClick={() => {
                  setCategory('doctor_consultation');
                  setServiceId('');
                  setDoctorId('');
                  setStep(2);
                }}
                className={`text-left p-6 rounded-xl border transition-all ${
                  category === 'doctor_consultation'
                    ? 'border-[#168B4B] bg-[#F2F9F4]/60'
                    : 'border-[#DDECE3] hover:border-[#168B4B]/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#F2F9F4] text-[#168B4B] flex items-center justify-center mb-4">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div className="font-display font-bold text-lg text-[#26352E]">
                  {t('catDoctor')}
                </div>
                <p className="text-sm text-[#52645B] mt-1.5 leading-relaxed">{t('catDoctorDesc')}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('diagnostic');
                  setServiceId('');
                  setDoctorId('');
                  setStep(2);
                }}
                className={`text-left p-6 rounded-xl border transition-all ${
                  category === 'diagnostic'
                    ? 'border-[#E34C3D] bg-[#FFF2F0]/60'
                    : 'border-[#DDECE3] hover:border-[#E34C3D]/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFF2F0] text-[#E34C3D] flex items-center justify-center mb-4">
                  <Microscope className="w-6 h-6" />
                </div>
                <div className="font-display font-bold text-lg text-[#26352E]">
                  {t('catDiagnostic')}
                </div>
                <p className="text-sm text-[#52645B] mt-1.5 leading-relaxed">
                  {t('catDiagnosticDesc')}
                </p>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEPARTMENT OR SERVICE */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display font-bold text-xl text-[#26352E]">
                {t('chooseService')}
              </h2>
              <span className="text-xs font-medium text-[#52645B]">
                {category === 'doctor_consultation' ? t('catDoctor') : t('catDiagnostic')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredServices.map((srv) => {
                const active = serviceId === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      setServiceId(srv.id);
                      setDoctorId('');
                      setStep(category === 'doctor_consultation' ? 3 : 4);
                    }}
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      active
                        ? 'border-[#168B4B] bg-[#F2F9F4]'
                        : 'border-[#DDECE3] hover:border-[#168B4B]/60'
                    }`}
                  >
                    <div className="text-[11px] font-medium text-[#52645B]">
                      {srv.category === 'health_package'
                        ? 'Health Package'
                        : srv.category === 'pathology_test'
                          ? srv.availability_note || 'Pathology Test'
                          : srv.category === 'diagnostic'
                            ? 'Diagnostic Service'
                            : 'Consultation'}
                    </div>
                    <div className="font-display font-bold text-sm text-[#26352E] mt-1 leading-snug">
                      {srv.name}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#52645B] tabular-nums">
                      <span>{srv.duration_minutes} min</span>
                      {srv.fee_inr != null && (
                        <span className="font-bold text-[#E34C3D]">
                          ₹{Number(srv.fee_inr).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#EEF5F0]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBE0D3] text-sm font-semibold text-[#26352E] hover:bg-[#F2F9F4]"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('btnBack')}
              </button>
              <button
                type="button"
                disabled={!serviceId}
                onClick={() => setStep(category === 'doctor_consultation' ? 3 : 4)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#168B4B] disabled:opacity-40 text-white text-sm font-semibold"
              >
                {t('btnContinue')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SELECT DOCTOR (APPLICABLE FOR DOCTOR CONSULTATIONS) */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-[#26352E]">{t('chooseDoctor')}</h2>
              <p className="text-xs text-[#52645B] mt-1">
                Department: <strong className="text-[#26352E]">{selectedService?.name}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchingDoctors.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setDoctorId(doc.id);
                    setStep(4);
                  }}
                  className={`text-left p-5 rounded-xl border transition-colors ${
                    doctorId === doc.id
                      ? 'border-[#168B4B] bg-[#F2F9F4]'
                      : 'border-[#DDECE3] hover:border-[#168B4B]/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[#F2F9F4] flex items-center justify-center shrink-0">
                      <UserRound className="w-5 h-5 text-[#168B4B]" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-base text-[#26352E]">
                        {doc.full_name}
                      </div>
                      <div className="text-xs text-[#E34C3D] font-medium">{doc.speciality}</div>
                      {doc.qualifications && (
                        <div className="text-xs text-[#52645B] mt-1">{doc.qualifications}</div>
                      )}
                      {doc.available_days.length > 0 && (
                        <div className="text-xs text-[#168B4B] mt-1.5 font-medium">
                          Days: {doc.available_days.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Always allow Clinic-Assigned option (essential while doctors await owner verification) */}
              <button
                type="button"
                onClick={() => {
                  setDoctorId('');
                  setStep(4);
                }}
                className={`text-left p-5 rounded-xl border transition-colors ${
                  doctorId === ''
                    ? 'border-[#168B4B] bg-[#F2F9F4]/60'
                    : 'border-[#DDECE3] hover:border-[#168B4B]/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg bg-[#F2F9F4] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#168B4B]" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base text-[#26352E]">
                      {t('anyAvailableDoctor')}
                    </div>
                    <p className="text-xs text-[#52645B] mt-1 leading-relaxed">
                      Our Kalimpong appointment desk will confirm the visiting specialist chamber
                      slot for {selectedService?.name}.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#EEF5F0]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBE0D3] text-sm font-semibold text-[#26352E] hover:bg-[#F2F9F4]"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('btnBack')}
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#168B4B] text-white text-sm font-semibold"
              >
                {t('btnContinue')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 & 5: INTERACTIVE CALENDAR + LIVE SERVER TIME SLOTS */}
        {(step === 4 || step === 5) && (
          <div className="space-y-8">
            {/* Date Picker Grid */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display font-bold text-xl text-[#26352E] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#168B4B]" />
                  {t('chooseDate')}
                </h2>
                <span className="text-xs text-[#52645B] tabular-nums">
                  Selected: <strong className="text-[#26352E]">{formatDateReadable(selectedDate)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {upcomingDates.map((dateStr) => {
                  const dow = getDayOfWeekFromDateString(dateStr);
                  const dayNum = dateStr.split('-')[2];
                  const monthNum = dateStr.split('-')[1];
                  const blocked = isDateMarkedBlocked(dateStr);
                  const active = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={blocked}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setStep(5);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-colors min-h-[64px] flex flex-col items-center justify-center ${
                        blocked
                          ? 'bg-[#FFF2F0]/70 border-[#F5C6C0] text-[#B36B63] cursor-not-allowed line-through'
                          : active
                            ? 'bg-[#168B4B] border-[#168B4B] text-white shadow-xs'
                            : 'bg-white border-[#DDECE3] text-[#26352E] hover:border-[#168B4B]'
                      }`}
                    >
                      <span className="text-[11px] opacity-80">{DAY_SHORT_EN[dow]}</span>
                      <span className="text-sm font-bold tabular-nums mt-0.5">
                        {dayNum}/{monthNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Time Slots */}
            <div className="space-y-4 pt-6 border-t border-[#EEF5F0]">
              <h3 className="font-display font-bold text-lg text-[#26352E] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#168B4B]" />
                {t('chooseSlot')}
              </h3>

              {loadingSlots ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <div key={n} className="h-11 rounded-xl bg-[#F2F9F4] animate-pulse" />
                  ))}
                </div>
              ) : dateBlocked ? (
                <div className="rounded-xl border border-[#F5C6C0] bg-[#FFF2F0] p-4 text-sm text-[#992B20]">
                  {dateBlockReason || t('blockedDateMsg')}
                </div>
              ) : slots.filter((s) => s.available).length === 0 ? (
                <div className="rounded-xl border border-[#DDECE3] bg-[#F2F9F4] p-4 text-sm text-[#52645B]">
                  {t('noSlotsDate')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {slots.map((slot) => {
                    const active = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setStep(5);
                        }}
                        className={`py-3 px-3 rounded-xl border text-xs sm:text-sm font-semibold tabular-nums transition-colors ${
                          !slot.available
                            ? 'bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed line-through'
                            : active
                              ? 'bg-[#E34C3D] border-[#E34C3D] text-white shadow-xs'
                              : 'bg-white border-[#CBE0D3] text-[#26352E] hover:border-[#168B4B] hover:bg-[#F2F9F4]'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#EEF5F0]">
              <button
                type="button"
                onClick={() => setStep(category === 'doctor_consultation' ? 3 : 2)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBE0D3] text-sm font-semibold text-[#26352E] hover:bg-[#F2F9F4]"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('btnBack')}
              </button>
              <button
                type="button"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(6)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#168B4B] disabled:opacity-40 text-white text-sm font-semibold"
              >
                {t('btnContinue')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: CUSTOMER DETAILS */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-[#26352E]">
                {t('patientDetailsTitle')}
              </h2>
              <p className="text-xs text-[#52645B] mt-1">{t('privacyMinNote')}</p>
            </div>

            {formError && (
              <div className="rounded-xl border border-[#F5C6C0] bg-[#FFF2F0] px-4 py-3 text-sm text-[#C93B2D]">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  {t('fieldFullName')}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Pemba Sherpa"
                  className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm text-[#26352E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  {t('fieldMobile')}
                </label>
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm text-[#26352E] tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  {t('fieldEmail')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm text-[#26352E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  {t('fieldAge')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Years"
                  className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm text-[#26352E] tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  {t('fieldMessage')}
                </label>
                <textarea
                  rows={3}
                  maxLength={350}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Optional scheduling note (e.g. fasting morning test preferred). Do not enter private medical records."
                  className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm text-[#26352E]"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#EEF5F0]">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBE0D3] text-sm font-semibold text-[#26352E] hover:bg-[#F2F9F4]"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('btnBack')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateCustomerStep()) setStep(7);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#168B4B] text-white text-sm font-semibold"
              >
                {t('btnContinue')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: BOOKING SUMMARY */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-[#26352E]">{t('summaryTitle')}</h2>

            <div className="rounded-xl border border-[#DDECE3] bg-[#F2F9F4]/60 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[#52645B]">Appointment Category</div>
                <div className="font-semibold text-[#26352E] mt-0.5">
                  {category === 'doctor_consultation' ? t('catDoctor') : t('catDiagnostic')}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52645B]">Selected Service</div>
                <div className="font-semibold text-[#26352E] mt-0.5">
                  {selectedService?.name}
                  {selectedService?.fee_inr != null && (
                    <span className="ml-2 text-[#E34C3D] tabular-nums">
                      (₹{Number(selectedService.fee_inr).toLocaleString('en-IN')})
                    </span>
                  )}
                </div>
              </div>
              {category === 'doctor_consultation' && (
                <div>
                  <div className="text-xs text-[#52645B]">Doctor</div>
                  <div className="font-semibold text-[#26352E] mt-0.5">
                    {selectedDoctor ? selectedDoctor.full_name : t('anyAvailableDoctor')}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-[#52645B]">Date &amp; Time (Asia/Kolkata)</div>
                <div className="font-semibold text-[#168B4B] mt-0.5 tabular-nums">
                  {formatDateReadable(selectedDate)} · {formatTime12h(selectedTime)} IST
                </div>
              </div>
              <div>
                <div className="text-xs text-[#52645B]">Patient Name</div>
                <div className="font-semibold text-[#26352E] mt-0.5">{fullName}</div>
              </div>
              <div>
                <div className="text-xs text-[#52645B]">Mobile Number</div>
                <div className="font-semibold text-[#26352E] mt-0.5 tabular-nums">{mobile}</div>
              </div>
              {email && (
                <div>
                  <div className="text-xs text-[#52645B]">Email</div>
                  <div className="font-semibold text-[#26352E] mt-0.5">{email}</div>
                </div>
              )}
              {age && (
                <div>
                  <div className="text-xs text-[#52645B]">Age</div>
                  <div className="font-semibold text-[#26352E] mt-0.5 tabular-nums">{age} yrs</div>
                </div>
              )}
              {message && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-[#52645B]">Note</div>
                  <div className="text-[#26352E] mt-0.5">{message}</div>
                </div>
              )}
            </div>

            <p className="text-xs text-[#52645B] leading-relaxed">
              Your appointment will be saved with status <strong>Pending Confirmation</strong> until
              confirmed by New Life Medical Store Kalimpong. No online payment is collected on this
              website.
            </p>

            <div className="flex justify-between pt-4 border-t border-[#EEF5F0]">
              <button
                type="button"
                onClick={() => setStep(6)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBE0D3] text-sm font-semibold text-[#26352E] hover:bg-[#F2F9F4]"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('btnBack')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitBooking}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E34C3D] hover:bg-[#C93B2D] disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {submitting ? t('submitting') : t('btnConfirmSubmit')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 8: GENUINE DATABASE-BACKED CONFIRMATION REFERENCE */}
        {step === 8 && confirmedBooking && (
          <div className="space-y-6 text-center max-w-xl mx-auto py-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F2F9F4] text-[#168B4B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-2xl text-[#26352E]">
                {t('bookingSuccessTitle')}
              </h2>
              <p className="text-sm text-[#52645B] mt-1.5">
                Please save your unique booking reference below. Our clinic desk will verify and
                confirm your slot.
              </p>
            </div>

            <div className="rounded-xl border border-[#DDECE3] bg-[#F2F9F4] p-5 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-[#DDECE3] pb-3">
                <span className="text-xs text-[#52645B]">{t('bookingRefLabel')}</span>
                <span className="font-mono font-bold text-lg text-[#168B4B] tabular-nums">
                  {confirmedBooking.booking_reference}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#52645B]">{t('bookingStatusLabel')}</span>
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    statusBadge(confirmedBooking.status).cls
                  }`}
                >
                  {statusBadge(confirmedBooking.status).label}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#52645B]">Service</span>
                <span className="font-semibold text-[#26352E]">{confirmedBooking.service_name}</span>
              </div>
              {confirmedBooking.doctor_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#52645B]">Doctor</span>
                  <span className="font-semibold text-[#26352E]">
                    {confirmedBooking.doctor_name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#52645B]">Date &amp; Time</span>
                <span className="font-semibold text-[#26352E] tabular-nums">
                  {formatDateReadable(confirmedBooking.appointment_date)} ·{' '}
                  {formatTime12h(confirmedBooking.appointment_time)} IST
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetWizard}
                className="px-5 py-2.5 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-sm font-semibold"
              >
                {t('bookAnother')}
              </button>
              <a
                href="tel:+919800333776"
                className="px-5 py-2.5 rounded-xl border border-[#CBE0D3] text-[#26352E] hover:bg-[#F2F9F4] text-sm font-semibold"
              >
                Call Desk: +91 98003 33776
              </a>
            </div>
          </div>
        )}
      </div>

      {/* LIVE BOOKING STATUS LOOKUP */}
      <section className="rounded-2xl border border-[#DDECE3] bg-[#F2F9F4]/60 p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="font-display font-bold text-lg text-[#26352E] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#168B4B]" />
            {t('lookupTitle')}
          </h2>
          <p className="text-xs text-[#52645B] mt-1">
            Verify live confirmation status using both your booking reference and mobile number.
          </p>
        </div>

        <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            value={lookupRef}
            onChange={(e) => setLookupRef(e.target.value)}
            placeholder={t('lookupPlaceholder')}
            className="px-4 py-2.5 rounded-xl border border-[#CBE0D3] bg-white text-sm text-[#26352E] font-mono"
          />
          <input
            type="tel"
            required
            value={lookupMobile}
            onChange={(e) => setLookupMobile(e.target.value)}
            placeholder={t('lookupMobilePlaceholder')}
            className="px-4 py-2.5 rounded-xl border border-[#CBE0D3] bg-white text-sm text-[#26352E] tabular-nums"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="px-5 py-2.5 rounded-xl bg-[#26352E] hover:bg-[#1B2822] text-white text-sm font-semibold transition-colors"
          >
            {lookupLoading ? 'Checking...' : t('lookupButton')}
          </button>
        </form>

        {lookupError && <p className="text-xs font-medium text-[#C93B2D]">{lookupError}</p>}

        {lookupResult && (
          <div className="rounded-xl border border-[#DDECE3] bg-white p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
            <div>
              <div className="font-mono font-bold text-[#168B4B]">
                {lookupResult.booking_reference}
              </div>
              <div className="text-xs text-[#52645B] mt-0.5">
                {lookupResult.service_name}
                {lookupResult.doctor_name ? ` · ${lookupResult.doctor_name}` : ''}
              </div>
            </div>
            <div className="text-xs font-semibold text-[#26352E] tabular-nums">
              {formatDateReadable(lookupResult.appointment_date)} ·{' '}
              {formatTime12h(lookupResult.appointment_time)} IST
            </div>
            <span
              className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                statusBadge(lookupResult.status).cls
              }`}
            >
              {statusBadge(lookupResult.status).label}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
