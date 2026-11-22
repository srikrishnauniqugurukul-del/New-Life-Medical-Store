import React from 'react';

/**
 * Authentic vector mark modelled directly on the existing New Life Medical Store
 * Kalimpong signboard and chamber posters:
 * Split medical cross with Medical Green (#168B4B) left/top wing and
 * Healthcare Red (#E34C3D) right/bottom wing divided by a flowing white curve.
 */
export function NewLifeCrossMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Green upper-left medical cross half */}
      <path
        d="M23 6H35.5C36.6 6 37.5 6.9 37.5 8V14.5C37.5 23.2 28.5 31.4 23.2 41.2C20.2 46.8 20.4 53.5 24.4 58.6C18.3 54.4 17.5 46.3 20.1 39.8H11.5C8.5 39.8 6 37.3 6 34.3V26.2C6 23.2 8.5 20.7 11.5 20.7H20.8V8.2C20.8 7 21.8 6 23 6Z"
        fill="#168B4B"
      />
      {/* Red lower-right medical cross half */}
      <path
        d="M42.2 6.8C45.3 11.2 45.6 17.6 43.2 22.8H52.5C55.5 22.8 58 25.3 58 28.3V36.2C58 39.2 55.5 41.7 52.5 41.7H43.4V54.8C43.4 56.6 42 58 40.2 58H30.2C26.5 58 24.1 54.6 25.2 50.6C27.2 43.2 35.6 33.4 40.4 22.4C42.6 17.2 43.2 11.8 42.2 6.8Z"
        fill="#E34C3D"
      />
    </svg>
  );
}

/**
 * Full New Life Medical Store lockup for Hero/Footer/About/Admin brand surfaces.
 */
export function NewLifeBrandLockup({
  compact = false,
  showSub = false,
}: {
  compact?: boolean;
  showSub?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <NewLifeCrossMark size={compact ? 32 : 42} />
      <div className="leading-none">
        <div
          className={`font-display font-extrabold tracking-tight text-[#168B4B] whitespace-nowrap ${
            compact ? 'text-base' : 'text-xl'
          }`}
        >
          NEW LIFE
        </div>
        <div
          className={`font-display font-bold tracking-wide text-[#26352E] whitespace-nowrap ${
            compact ? 'text-[11px] mt-0.5' : 'text-xs mt-0.5'
          }`}
        >
          MEDICAL STORE
        </div>
        {showSub && (
          <div className="text-[10px] font-bold tracking-wider text-[#E34C3D] mt-0.5 whitespace-nowrap">
            CHEMIST &amp; DRUGGIST
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Authentic Diagnostic & Polyclinic microscope emblem modelled on the owner's
 * Diagnostic standee and anniversary banners.
 */
export function NewLifeDiagnosticEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M10 46A24 24 0 1 1 54 46"
        stroke="#168B4B"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M6 48C20 42 44 42 58 48" stroke="#168B4B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stylized Microscope in Healthcare Red */}
      <path
        d="M35 16L29 29L33 31L39 18L35 16Z"
        fill="#E34C3D"
      />
      <path
        d="M27 32H37V35H27V32Z"
        fill="#26352E"
      />
      <path
        d="M36 25C40 27 42 32 40 37C38.5 40.5 34.5 42 30 42H24V45H42V42H36"
        stroke="#E34C3D"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small medical cross accent */}
      <path d="M46 31V39M42 35H50" stroke="#168B4B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
