import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Microscope, Search } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { pickLocalized } from '../lib/i18n';
import { NewLifeDiagnosticEmblem } from '../components/BrandLogo';

export function DiagnosticsPage() {
  const { navigate, publicData, lang, t } = useApp();
  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');

  const services = publicData?.services || [];
  const coreCategories = services.filter((s) => s.category === 'diagnostic');
  const healthPackages = services.filter((s) => s.category === 'health_package');
  const labTests = services.filter((s) => s.category === 'pathology_test');

  const groups = useMemo(() => {
    const set = new Set<string>(['All']);
    labTests.forEach((item) => {
      if (item.availability_note) set.add(item.availability_note);
    });
    return Array.from(set);
  }, [labTests]);

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return labTests.filter((item) => {
      const matchesGroup = selectedGroup === 'All' || item.availability_note === selectedGroup;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.availability_note || '').toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [labTests, query, selectedGroup]);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#DDECE3] bg-gradient-to-br from-[#F2F9F4] via-white to-[#FFF2F0]/40 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3">
            <NewLifeDiagnosticEmblem size={52} />
            <div>
              <div className="text-xs font-semibold text-[#168B4B]">
                KD Pradhan Road, Near District Hospital, Kalimpong
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-[#26352E]">
                {t('sectionDiagnostics')}
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#52645B] leading-relaxed">
            {t('sectionDiagnosticsSub')}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#26352E] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#168B4B]" />
              Lab Schedule (Poster): 8:00 AM – 6:00 PM
            </span>
            <span aria-hidden="true" className="text-[#A3C4B1]">
              ·
            </span>
            <span className="tabular-nums">
              Desk: +91 76793 54643 / +91 97333 76088 / +91 98003 33776
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/book', { category: 'diagnostic' })}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E34C3D] hover:bg-[#C93B2D] text-white text-sm font-semibold transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book Diagnostic Appointment
            </button>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-xl overflow-hidden border border-[#DDECE3] bg-white shadow-xs">
            <img
              src="/assets/aistudio/12_2cdba348.jpg"
              alt="New Life Diagnostic & Polyclinic 1st Year Anniversary Health Packages"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>

      {/* Core Diagnostic Categories (Blood, Stool, Urine, ECG, Dental X-ray, Sputum/FNAC/Biopsy) */}
      <section className="space-y-5">
        <h2 className="font-display font-bold text-2xl text-[#26352E]">
          Core Laboratory &amp; Diagnostic Facilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-[#DDECE3] bg-white p-5 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-display font-bold text-base text-[#26352E]">{cat.name}</h3>
                {cat.description && (
                  <p className="text-xs text-[#52645B] mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate('/book', {
                    category: 'diagnostic',
                    serviceId: cat.id,
                  })
                }
                className="mt-4 text-xs font-semibold text-[#168B4B] hover:text-[#E34C3D] w-fit"
              >
                {t('bookThisService')} →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Health Check-Up Packages */}
      <section className="space-y-5">
        <div>
          <h2 className="font-display font-bold text-2xl text-[#26352E]">
            {t('sectionPackages')}
          </h2>
          <p className="text-sm text-[#52645B] mt-1">{t('sectionPackagesSub')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {healthPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-[#DDECE3] bg-white p-5 flex flex-col justify-between hover:border-[#168B4B]/60 transition-colors"
            >
              <div>
                <div className="text-xs text-[#168B4B] font-semibold">Laboratory Package</div>
                <h3 className="font-display font-bold text-base text-[#26352E] mt-1.5 leading-snug">
                  {pkg.name}
                </h3>
                {pkg.description && (
                  <p className="text-xs text-[#52645B] mt-2 leading-relaxed">{pkg.description}</p>
                )}
                {pkg.fee_inr != null && (
                  <div className="mt-4 font-display font-extrabold text-2xl text-[#E34C3D] tabular-nums">
                    ₹{Number(pkg.fee_inr).toLocaleString('en-IN')}/-
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
                className="mt-5 w-full py-2.5 rounded-lg bg-[#168B4B] hover:bg-[#11713C] text-white text-xs font-semibold transition-colors"
              >
                {t('bookThisPackage')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Complete Searchable Pathology Test Rate Directory */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-2xl text-[#26352E] flex items-center gap-2">
              <Microscope className="w-5 h-5 text-[#168B4B]" />
              {t('sectionRateList')} ({filteredTests.length})
            </h2>
            <p className="text-sm text-[#52645B] mt-1">{t('sectionRateListSub')}</p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-[#52645B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchTestsPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBE0D3] bg-white text-sm text-[#26352E] placeholder:text-[#7D9186]"
            />
          </div>
        </div>

        {/* Category Group Filters */}
        <div className="flex flex-wrap gap-2">
          {groups.map((grp) => (
            <button
              key={grp}
              type="button"
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedGroup === grp
                  ? 'bg-[#26352E] text-white'
                  : 'bg-[#F2F9F4] text-[#52645B] hover:text-[#26352E]'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* High-Density Clean Rate Table */}
        <div className="rounded-2xl border border-[#DDECE3] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F2F9F4] border-b border-[#DDECE3] text-xs font-semibold text-[#52645B]">
                  <th className="py-3.5 px-5">#</th>
                  <th className="py-3.5 px-5">Test Name</th>
                  <th className="py-3.5 px-5">Panel / Group</th>
                  <th className="py-3.5 px-5 text-right">Listed Rate (INR)</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5F0] text-sm">
                {filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#52645B]">
                      No laboratory tests matched “{query}”. Try another keyword or call +91 98003
                      33776.
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((test, idx) => (
                    <tr key={test.id} className="hover:bg-[#F2F9F4]/50 transition-colors">
                      <td className="py-3 px-5 text-xs font-mono text-[#7D9186] tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-5 font-semibold text-[#26352E]">{test.name}</td>
                      <td className="py-3 px-5 text-xs text-[#52645B]">
                        {test.availability_note || 'Pathology'}
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-[#26352E] tabular-nums">
                        {test.fee_inr != null
                          ? `₹${Number(test.fee_inr).toLocaleString('en-IN')}`
                          : 'Confirm at Lab'}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/book', {
                              category: 'diagnostic',
                              serviceId: test.id,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#F2F9F4] hover:bg-[#168B4B] text-[#168B4B] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          {t('bookThisTest')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reference Photo of Official Rate Sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-2xl border border-[#DDECE3] bg-[#F2F9F4] p-6">
          <div className="lg:col-span-4 rounded-xl overflow-hidden border border-[#DDECE3] bg-white">
            <img
              src="/assets/aistudio/3_d36f363e.jpeg"
              alt="Official New Life Diagnostic & Polyclinic Rate List"
              referrerPolicy="no-referrer"
              className="w-full h-56 object-cover"
            />
          </div>
          <div className="lg:col-span-8 space-y-2">
            <h3 className="font-display font-bold text-lg text-[#26352E]">
              Informational Notice &amp; Medical Disclaimer
            </h3>
            <p className="text-sm text-[#52645B] leading-relaxed">
              {pickLocalized(publicData?.settings.pathology_disclaimer, lang)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
