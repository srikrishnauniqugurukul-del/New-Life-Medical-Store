import React from 'react';
import { MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { NewLifeBrandLockup } from './BrandLogo';

export function Footer() {
  const { navigate, publicData, t } = useApp();
  const settings = publicData?.settings;

  return (
    <footer className="bg-[#1B2822] text-[#E6F0EA] border-t border-[#2D3E35] mt-20">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Address */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-3 inline-block">
              <NewLifeBrandLockup compact showSub />
            </div>
            <p className="text-sm text-[#B7C9BF] leading-relaxed">
              {settings?.business_name || 'New Life Medical Store Kalimpong'} &amp;{' '}
              {settings?.diagnostic_wing_name || 'New Life Diagnostic & Polyclinic'}. Local healthcare
              consultations and diagnostic facilities in Kalimpong.
            </p>
            <div className="flex items-start gap-2.5 text-sm text-[#D1E0D7]">
              <MapPin className="w-4 h-4 text-[#4ADE80] mt-0.5 shrink-0" />
              <span>
                {settings?.address ||
                  'KD Pradhan Road, Chotta Bhalukhop, Kalimpong, West Bengal 734301, India'}
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide mb-4">Navigation</h3>
            <ul className="space-y-2.5 text-sm text-[#B7C9BF]">
              {[
                { to: '/', key: 'navHome' },
                { to: '/about', key: 'navAbout' },
                { to: '/services', key: 'navServices' },
                { to: '/doctors', key: 'navDoctors' },
                { to: '/diagnostics', key: 'navDiagnostics' },
                { to: '/book', key: 'navBook' },
                { to: '/gallery', key: 'navGallery' },
                { to: '/contact', key: 'navContact' },
              ].map((link) => (
                <li key={link.to}>
                  <button
                    type="button"
                    onClick={() => navigate(link.to)}
                    className="hover:text-white transition-colors"
                  >
                    {t(link.key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Policies & Governance */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide mb-4">
              Patient Privacy &amp; Policies
            </h3>
            <ul className="space-y-2.5 text-sm text-[#B7C9BF]">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="hover:text-white transition-colors"
                >
                  {t('footerPrivacy')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="hover:text-white transition-colors"
                >
                  {t('footerTerms')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/booking-policy')}
                  className="hover:text-white transition-colors"
                >
                  {t('footerBookingPolicy')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/cancellation-policy')}
                  className="hover:text-white transition-colors"
                >
                  {t('footerCancellationPolicy')}
                </button>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#86EFAC] hover:text-white transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('footerAdmin')}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Appointment Desk */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide">Appointment Desk</h3>
            <div className="space-y-2 text-sm">
              <a
                href={`tel:${(settings?.primary_phone || '+919800333776').replace(/\s+/g, '')}`}
                className="flex items-center gap-2 text-white font-semibold hover:text-[#86EFAC] transition-colors tabular-nums"
              >
                <Phone className="w-4 h-4 text-[#E34C3D]" />
                {settings?.primary_phone || '+91 98003 33776'}
              </a>
              {(settings?.secondary_phones || ['+91 97333 76088', '+91 76793 54643']).map((p) => (
                <a
                  key={p}
                  href={`tel:${p.replace(/\s+/g, '')}`}
                  className="block text-[#B7C9BF] hover:text-white pl-6 tabular-nums"
                >
                  {p}
                </a>
              ))}
            </div>
            <p className="text-xs text-[#9BB2A5] leading-relaxed">
              Proprietor: {settings?.owner_name || 'Bijay Gupta'}. Information &amp; appointment
              booking platform only — no online medicine ordering or medical diagnosis is provided
              on this website.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#2D3E35] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9BB2A5]">
          <p>
            © {new Date().getFullYear()} {settings?.business_name || 'New Life Medical Store Kalimpong'}.{' '}
            {t('footerRights')}
          </p>
          <p>Timezone: Asia/Kolkata (IST) · Kalimpong, West Bengal 734301</p>
        </div>
      </div>
    </footer>
  );
}
