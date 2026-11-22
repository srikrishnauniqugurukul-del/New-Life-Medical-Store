import React, { useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, MapPin, Phone, Send, User } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { api } from '../services/apiClient';

export function ContactPage() {
  const { publicData, pushToast, navigate, t } = useApp();
  const settings = publicData?.settings;

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [subject, setSubject] = useState('Doctor Consultation Enquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2 || mobile.replace(/\D/g, '').length < 10) {
      pushToast('error', 'Please enter your name and a valid 10-digit mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitEnquiry({
        full_name: fullName.trim(),
        mobile_number: mobile.trim(),
        subject,
        message: message.trim(),
      });
      setSubmitted(true);
      setFullName('');
      setMobile('');
      setMessage('');
      pushToast('success', t('enquirySuccess'));
    } catch (err: any) {
      pushToast('error', err?.message || 'Unable to send enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-2xl space-y-3">
        <div className="text-xs font-semibold text-[#168B4B]">
          Healthcare &amp; Appointment Desk · Kalimpong
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#26352E]">
          {t('contactTitle')}
        </h1>
        <p className="text-base text-[#52645B]">{t('contactSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Direct Business Details */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-[#DDECE3] bg-white p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <User className="w-5 h-5 text-[#168B4B] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-[#52645B]">{t('ownerRole')}</div>
                <div className="font-display font-bold text-base text-[#26352E]">
                  {settings?.owner_name || 'Bijay Gupta'}
                </div>
                <div className="text-xs text-[#52645B]">
                  {settings?.business_name || 'New Life Medical Store Kalimpong'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-4 border-t border-[#EEF5F0]">
              <Phone className="w-5 h-5 text-[#E34C3D] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-[#52645B]">{t('contactLabel')}</div>
                <a
                  href={`tel:${(settings?.primary_phone || '+919800333776').replace(/\s+/g, '')}`}
                  className="block font-display font-bold text-lg text-[#26352E] hover:text-[#168B4B] tabular-nums"
                >
                  {settings?.primary_phone || '+91 98003 33776'}
                </a>
                {(settings?.secondary_phones || ['+91 97333 76088', '+91 76793 54643']).map((p) => (
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

            <div className="flex items-start gap-3.5 pt-4 border-t border-[#EEF5F0]">
              <MapPin className="w-5 h-5 text-[#168B4B] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-[#52645B]">{t('locationLabel')}</div>
                <p className="text-sm text-[#26352E] mt-0.5 leading-relaxed">
                  {settings?.address ||
                    'KD Pradhan Road, Chotta Bhalukhop, Kalimpong, West Bengal 734301'}
                </p>
                <a
                  href={
                    settings?.google_maps_url ||
                    'https://www.google.com/maps/search/?api=1&query=New+Life+Medical+Store+KD+Pradhan+Road+Kalimpong+734301'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-[#F2F9F4] hover:bg-[#168B4B] text-[#168B4B] hover:text-white text-xs font-semibold transition-colors"
                >
                  {t('openGoogleMaps')}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-4 border-t border-[#EEF5F0]">
              <Clock className="w-5 h-5 text-[#168B4B] mt-0.5 shrink-0" />
              <div className="text-xs text-[#52645B] space-y-1 leading-relaxed">
                <div className="font-semibold text-[#26352E] text-sm">{t('hoursLabel')}</div>
                <p>Diagnostic Lab Poster Hours: 8:00 AM – 6:00 PM</p>
                <p>Doctor Consultations: By specialist schedule &amp; appointment</p>
                <p>{t('medicalStore24hNote')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#DDECE3] bg-[#F2F9F4] p-4 text-xs text-[#52645B] leading-relaxed">
            Use these contact details strictly for healthcare appointments, diagnostic testing
            enquiries, and clinic directions. Online medicine ordering is not available on this
            platform.
          </div>
        </div>

        {/* Right: Appointment Enquiry Form */}
        <div className="lg:col-span-7 rounded-2xl border border-[#DDECE3] bg-white p-6 sm:p-8">
          <h2 className="font-display font-bold text-xl text-[#26352E]">
            {t('enquiryFormTitle')}
          </h2>
          <p className="text-xs text-[#52645B] mt-1 mb-6">
            Looking to book a specific time slot right away?{' '}
            <button
              type="button"
              onClick={() => navigate('/book')}
              className="text-[#168B4B] font-semibold hover:underline"
            >
              Use our online appointment calendar →
            </button>
          </p>

          {submitted ? (
            <div className="rounded-xl border border-[#CBE0D3] bg-[#F2F9F4] p-6 text-center space-y-3">
              <CheckCircle2 className="w-9 h-9 text-[#168B4B] mx-auto" />
              <div className="font-display font-bold text-lg text-[#26352E]">
                Enquiry Received
              </div>
              <p className="text-sm text-[#52645B]">{t('enquirySuccess')}</p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 rounded-lg bg-[#168B4B] text-white text-xs font-semibold"
              >
                Send Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                    {t('fieldFullName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                    {t('fieldMobile')}
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Enquiry Topic
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm bg-white"
                >
                  <option>Doctor Consultation Enquiry</option>
                  <option>Pathology &amp; Diagnostic Lab Enquiry</option>
                  <option>Health Check-up Package Enquiry</option>
                  <option>Existing Appointment Reschedule / Cancellation</option>
                  <option>Clinic Location &amp; Timings</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26352E] mb-1.5">
                  Message *
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your scheduling question. Please do not include sensitive medical reports or prescription details."
                  className="w-full px-4 py-3 rounded-xl border border-[#CBE0D3] text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#168B4B] hover:bg-[#11713C] disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Sending...' : 'Submit Enquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
