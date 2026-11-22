import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import type { GalleryItem, GallerySection } from '../lib/types';

const SECTION_LABELS: Record<GallerySection | 'all', string> = {
  all: 'All Photographs',
  store_exterior: 'Store Exterior',
  diagnostic_facility: 'Diagnostic Facility',
  consultation_area: 'Consultation Area',
  medical_facility: 'Medical Facility',
  business_photographs: 'Business Photographs',
};

export function GalleryPage() {
  const { publicData, t } = useApp();
  const [filter, setFilter] = useState<GallerySection | 'all'>('all');
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);

  const items = publicData?.gallery || [];
  const visibleItems = filter === 'all' ? items : items.filter((g) => g.section === filter);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="max-w-2xl space-y-3">
        <div className="text-xs font-semibold text-[#168B4B]">
          Verified Clinic, Diagnostic Lab &amp; Chamber Notices
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#26352E]">
          {t('navGallery')}
        </h1>
        <p className="text-base text-[#52645B]">
          Owner-approved photographs of New Life Medical Store Kalimpong, New Life Diagnostic &amp;
          Polyclinic, and official specialist chamber announcements.
        </p>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SECTION_LABELS) as Array<GallerySection | 'all'>).map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setFilter(sec)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filter === sec
                ? 'bg-[#168B4B] text-white'
                : 'bg-[#F2F9F4] text-[#52645B] hover:text-[#26352E]'
            }`}
          >
            {SECTION_LABELS[sec]}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-[#DDECE3] bg-[#F2F9F4] p-12 text-center text-sm text-[#52645B]">
          No published photographs in this section yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleItems.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActivePhoto(photo)}
              className="text-left group rounded-2xl overflow-hidden border border-[#DDECE3] bg-white hover:border-[#168B4B]/60 transition-colors flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#F2F9F4] overflow-hidden w-full">
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-4 space-y-1">
                <div className="text-[11px] font-medium text-[#168B4B]">
                  {SECTION_LABELS[photo.section]}
                </div>
                <h2 className="font-display font-bold text-base text-[#26352E]">{photo.title}</h2>
                {photo.caption && (
                  <p className="text-xs text-[#52645B] line-clamp-2 leading-relaxed">
                    {photo.caption}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#DDECE3]">
              <div>
                <div className="text-xs font-semibold text-[#168B4B]">
                  {SECTION_LABELS[activePhoto.section]}
                </div>
                <h3 className="font-display font-bold text-base text-[#26352E]">
                  {activePhoto.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="p-2 rounded-lg hover:bg-[#F2F9F4] text-[#26352E]"
                aria-label="Close image preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#1B2822] flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={activePhoto.image_url}
                alt={activePhoto.title}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            {activePhoto.caption && (
              <div className="px-5 py-4 text-sm text-[#52645B]">{activePhoto.caption}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
