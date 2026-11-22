import React, { useState } from 'react';
import { CalendarOff, Check, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import type {
  BlockedDate,
  BusinessHour,
  Doctor,
  GalleryItem,
  GallerySection,
  ScheduleType,
} from '../lib/types';
import { DAY_NAMES_EN, formatDateReadable, getTodayIST } from '../lib/timezone';

// ============================================================================
// 7. BUSINESS HOURS MANAGEMENT (SEPARATE STORE / DOCTOR / DIAGNOSTIC SCHEDULES)
// ============================================================================

export function AdminBusinessHoursPanel({
  businessHours,
  onSave,
}: {
  businessHours: BusinessHour[];
  onSave: (hours: BusinessHour[]) => Promise<void>;
}) {
  const [activeType, setActiveType] = useState<ScheduleType>('doctor_consultation');
  const [draft, setDraft] = useState<BusinessHour[]>(businessHours);
  const [saving, setSaving] = useState(false);

  const visibleRows = draft
    .filter((h) => h.schedule_type === activeType)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const updateRow = (id: string, patch: Partial<BusinessHour>) => {
    setDraft((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const approveAllCurrent = () => {
    setDraft((prev) =>
      prev.map((row) =>
        row.schedule_type === activeType ? { ...row, is_verified: true } : row
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-[#F2F9F4] border border-[#DDECE3]">
          {[
            { id: 'doctor_consultation', label: 'Doctor Consultations' },
            { id: 'diagnostic', label: 'Diagnostic Lab' },
            { id: 'medical_store', label: 'Medical Store' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveType(t.id as ScheduleType)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold ${
                activeType === t.id ? 'bg-white text-[#168B4B] shadow-xs' : 'text-[#52645B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={approveAllCurrent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#168B4B] text-[#168B4B] hover:bg-[#F2F9F4] text-xs font-semibold"
          >
            <Check className="w-3.5 h-3.5" />
            Mark Schedule Owner-Verified
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#168B4B] hover:bg-[#11713C] disabled:opacity-50 text-white text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Weekly Schedule'}
          </button>
        </div>
      </div>

      <p className="text-xs text-[#52645B]">
        Configure separate Monday–Sunday hours, breaks, slot intervals, appointment durations, and
        daily capacities. 24-hour store hours are never automatically applied to doctors or
        diagnostic lab appointments.
      </p>

      <div className="rounded-xl border border-[#DDECE3] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F2F9F4] border-b border-[#DDECE3] text-[#52645B] font-semibold">
                <th className="py-3 px-3">Day</th>
                <th className="py-3 px-3">Open</th>
                <th className="py-3 px-3">Start</th>
                <th className="py-3 px-3">End</th>
                <th className="py-3 px-3">Break Start</th>
                <th className="py-3 px-3">Break End</th>
                <th className="py-3 px-3">Interval (m)</th>
                <th className="py-3 px-3">Duration (m)</th>
                <th className="py-3 px-3">Daily Cap</th>
                <th className="py-3 px-3">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF5F0]">
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 px-3 font-semibold text-[#26352E]">
                    {DAY_NAMES_EN[row.day_of_week]}
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={row.is_open}
                      onChange={(e) => updateRow(row.id, { is_open: e.target.checked })}
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="time"
                      disabled={!row.is_open}
                      value={row.open_time || ''}
                      onChange={(e) => updateRow(row.id, { open_time: e.target.value || null })}
                      className="px-2 py-1 rounded border border-[#CBE0D3] tabular-nums disabled:opacity-40"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="time"
                      disabled={!row.is_open}
                      value={row.close_time || ''}
                      onChange={(e) => updateRow(row.id, { close_time: e.target.value || null })}
                      className="px-2 py-1 rounded border border-[#CBE0D3] tabular-nums disabled:opacity-40"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="time"
                      disabled={!row.is_open}
                      value={row.break_start || ''}
                      onChange={(e) => updateRow(row.id, { break_start: e.target.value || null })}
                      className="px-2 py-1 rounded border border-[#CBE0D3] tabular-nums disabled:opacity-40"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="time"
                      disabled={!row.is_open}
                      value={row.break_end || ''}
                      onChange={(e) => updateRow(row.id, { break_end: e.target.value || null })}
                      className="px-2 py-1 rounded border border-[#CBE0D3] tabular-nums disabled:opacity-40"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={row.slot_interval_minutes}
                      onChange={(e) =>
                        updateRow(row.id, { slot_interval_minutes: Number(e.target.value) })
                      }
                      className="w-16 px-2 py-1 rounded border border-[#CBE0D3] tabular-nums"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={row.appointment_duration_minutes}
                      onChange={(e) =>
                        updateRow(row.id, {
                          appointment_duration_minutes: Number(e.target.value),
                        })
                      }
                      className="w-16 px-2 py-1 rounded border border-[#CBE0D3] tabular-nums"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={row.daily_capacity}
                      onChange={(e) =>
                        updateRow(row.id, { daily_capacity: Number(e.target.value) })
                      }
                      className="w-16 px-2 py-1 rounded border border-[#CBE0D3] tabular-nums"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={row.is_verified}
                      onChange={(e) => updateRow(row.id, { is_verified: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 8. BLOCKED DATES & HOLIDAY MANAGEMENT
// ============================================================================

export function AdminBlockedDatesPanel({
  blockedDates,
  doctors,
  onCreate,
  onToggleActive,
  onDelete,
}: {
  blockedDates: BlockedDate[];
  doctors: Doctor[];
  onCreate: (payload: Omit<BlockedDate, 'id'>) => Promise<void>;
  onToggleActive: (id: string, is_active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [blockDate, setBlockDate] = useState(() => getTodayIST());
  const [scope, setScope] = useState<'all' | 'doctor_consultation' | 'diagnostic' | 'doctor'>('all');
  const [doctorId, setDoctorId] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [slotsInput, setSlotsInput] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate || !reason.trim()) return;
    setSaving(true);
    try {
      const parsedSlots = isFullDay
        ? []
        : slotsInput
            .split(',')
            .map((s) => s.trim())
            .filter((s) => /^\d{2}:\d{2}$/.test(s));
      await onCreate({
        block_date: blockDate,
        scope,
        doctor_id: scope === 'doctor' && doctorId ? doctorId : null,
        is_full_day: isFullDay,
        blocked_slots: parsedSlots,
        reason: reason.trim(),
        is_active: true,
      });
      setReason('');
      setSlotsInput('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-5 rounded-xl border border-[#DDECE3] bg-white p-5 space-y-4 text-xs"
      >
        <h3 className="font-display font-bold text-base text-[#26352E] flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-[#E34C3D]" />
          Block Date, Holiday, or Time Slots
        </h3>
        <div>
          <label className="block font-semibold mb-1">Date (Asia/Kolkata) *</label>
          <input
            type="date"
            required
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] tabular-nums"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Applies To</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] bg-white"
          >
            <option value="all">Entire Clinic (All Services)</option>
            <option value="doctor_consultation">Doctor Consultations Only</option>
            <option value="diagnostic">Diagnostic Lab Only</option>
            <option value="doctor">Specific Doctor Unavailable</option>
          </select>
        </div>

        {scope === 'doctor' && (
          <div>
            <label className="block font-semibold mb-1">Select Doctor</label>
            <select
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] bg-white"
            >
              <option value="">— Choose Doctor —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="inline-flex items-center gap-2 font-semibold text-[#26352E]">
          <input
            type="checkbox"
            checked={isFullDay}
            onChange={(e) => setIsFullDay(e.target.checked)}
          />
          Block Full Day
        </label>

        {!isFullDay && (
          <div>
            <label className="block font-semibold mb-1">
              Specific Slots to Block (HH:MM comma-separated)
            </label>
            <input
              value={slotsInput}
              onChange={(e) => setSlotsInput(e.target.value)}
              placeholder="10:00, 10:30, 11:00"
              className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] font-mono"
            />
          </div>
        )}

        <div>
          <label className="block font-semibold mb-1">Reason / Holiday Title *</label>
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Public Holiday, Specialist Out of Station, Temporary Closure"
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-[#E34C3D] hover:bg-[#C93B2D] text-white font-semibold"
        >
          {saving ? 'Applying...' : 'Block Selected Date / Slots'}
        </button>
      </form>

      <div className="lg:col-span-7 space-y-3">
        {blockedDates.length === 0 ? (
          <div className="rounded-xl border border-[#DDECE3] bg-white p-8 text-center text-xs text-[#52645B]">
            No blocked dates or holidays configured. Blocked dates immediately disappear from the
            public booking calendar.
          </div>
        ) : (
          blockedDates.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-[#DDECE3] bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-bold text-[#26352E] tabular-nums">
                  {formatDateReadable(b.block_date)}
                  <span className="ml-2 font-normal text-[#52645B]">
                    ({b.is_full_day ? 'Full Day' : `Slots: ${b.blocked_slots.join(', ')}`})
                  </span>
                </div>
                <div className="text-[#52645B] mt-0.5">
                  {b.reason} · Scope: <strong className="capitalize">{b.scope.replace('_', ' ')}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleActive(b.id, !b.is_active)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold ${
                    b.is_active
                      ? 'bg-[#FFF2F0] text-[#E34C3D]'
                      : 'bg-[#F2F9F4] text-[#168B4B]'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  {b.is_active ? 'Restore Date' : 'Re-Block'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(b.id)}
                  className="p-1.5 rounded-lg border border-[#F5C6C0] text-[#E34C3D]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 9. GALLERY MANAGEMENT (SUPABASE STORAGE UPLOAD + ORDER + PUBLISH)
// ============================================================================

export function AdminGalleryPanel({
  gallery,
  storageConnected,
  onUploadFile,
  onCreate,
  onUpdate,
  onDelete,
}: {
  gallery: GalleryItem[];
  storageConnected: boolean;
  onUploadFile: (file: File) => Promise<{ image_url: string; storage_path: string | null }>;
  onCreate: (payload: Omit<GalleryItem, 'id'>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<GalleryItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [section, setSection] = useState<GallerySection>('medical_facility');
  const [imageUrl, setImageUrl] = useState('');
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await onUploadFile(file);
      setImageUrl(res.image_url);
      setStoragePath(res.storage_path);
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        caption: caption.trim() || null,
        section,
        image_url: imageUrl.trim(),
        storage_path: storagePath,
        display_order: gallery.length + 1,
        is_published: true,
      });
      setTitle('');
      setCaption('');
      setImageUrl('');
      setStoragePath(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="rounded-xl border border-[#DDECE3] bg-white p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
      >
        <div className="md:col-span-2 flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-[#26352E]">
            Add Owner-Approved Photograph
          </h3>
          <span className="text-[11px] text-[#52645B]">
            Supabase Storage: {storageConnected ? 'Connected (clinic-gallery)' : 'Not Connected'}
          </span>
        </div>

        <div>
          <label className="block font-semibold mb-1">Photograph Title *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Diagnostic Reception Desk"
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Gallery Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as GallerySection)}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] bg-white"
          >
            <option value="store_exterior">Store Exterior</option>
            <option value="medical_facility">Medical Facility</option>
            <option value="consultation_area">Consultation Area</option>
            <option value="diagnostic_facility">Diagnostic Facility</option>
            <option value="business_photographs">Business Photographs</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">Image URL or Upload to Supabase Storage</label>
          <input
            required
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/assets/aistudio/... or https://..."
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Upload File (JPG/PNG/WEBP)</label>
          <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#168B4B] bg-[#F2F9F4] text-[#168B4B] font-semibold cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Select Image File'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold mb-1">Caption</label>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Short caption describing this facility photograph"
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#168B4B] text-white font-semibold"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adding...' : 'Add to Gallery'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {gallery.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[#DDECE3] bg-white overflow-hidden flex flex-col justify-between"
          >
            <div>
              <img
                src={item.image_url}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-44 object-cover bg-[#F2F9F4]"
              />
              <div className="p-4 space-y-1 text-xs">
                <div className="text-[11px] font-semibold text-[#168B4B] capitalize">
                  {item.section.replace('_', ' ')} · Order #{item.display_order}
                </div>
                <div className="font-bold text-sm text-[#26352E]">{item.title}</div>
                {item.caption && <p className="text-[#52645B] line-clamp-2">{item.caption}</p>}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[#EEF5F0] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onUpdate(item.id, { is_published: !item.is_published })}
                className={`px-2.5 py-1 rounded-md font-semibold ${
                  item.is_published
                    ? 'bg-[#F2F9F4] text-[#168B4B]'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {item.is_published ? 'Published' : 'Unpublished'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 rounded-lg border border-[#F5C6C0] text-[#E34C3D] hover:bg-[#FFF2F0]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
