import React, { useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import type {
  Appointment,
  Customer,
  Department,
  Doctor,
  ServiceCategory,
  ServiceItem,
} from '../lib/types';
import { DAY_NAMES_EN, formatDateReadable, formatTime12h, getTodayIST } from '../lib/timezone';

// ============================================================================
// 4. DOCTORS MANAGEMENT (CRUD + OWNER VERIFICATION WORKFLOW)
// ============================================================================

export function AdminDoctorsPanel({
  doctors,
  departments,
  onCreate,
  onUpdate,
  onDelete,
}: {
  doctors: Doctor[];
  departments: Department[];
  onCreate: (payload: Omit<Doctor, 'id'>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Doctor>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Partial<Doctor> | null>(null);
  const [saving, setSaving] = useState(false);

  const consultDepts = departments.filter((d) => d.category === 'doctor_consultation');

  const openNew = () => {
    setEditing({
      full_name: '',
      speciality: '',
      department_id: consultDepts[0]?.id || null,
      qualifications: '',
      registration_number: '',
      hospital_affiliation: '',
      consultation_fee_inr: null,
      available_days: ['Monday', 'Wednesday', 'Friday'],
      appointment_duration_minutes: 20,
      available_time_slots: ['10:00', '10:30', '11:00', '11:30', '16:00', '16:30'],
      bio: '',
      photo_url: '',
      is_verified: false,
      is_active: true,
      display_order: doctors.length + 1,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.full_name || !editing.speciality) return;
    setSaving(true);
    try {
      const payload: Omit<Doctor, 'id'> = {
        department_id: editing.department_id || null,
        full_name: editing.full_name.trim(),
        speciality: editing.speciality.trim(),
        photo_url: editing.photo_url?.trim() || null,
        poster_url: editing.poster_url || null,
        qualifications: editing.qualifications?.trim() || null,
        registration_number: editing.registration_number?.trim() || null,
        hospital_affiliation: editing.hospital_affiliation?.trim() || null,
        consultation_fee_inr:
          editing.consultation_fee_inr != null && editing.consultation_fee_inr !== ('' as any)
            ? Number(editing.consultation_fee_inr)
            : null,
        available_days: editing.available_days || [],
        appointment_duration_minutes: Number(editing.appointment_duration_minutes || 20),
        available_time_slots: editing.available_time_slots || [],
        bio: editing.bio?.trim() || null,
        is_verified: Boolean(editing.is_verified),
        is_active: editing.is_active !== false,
        display_order: Number(editing.display_order || 0),
      };
      if (editing.id) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    if (!editing) return;
    const current = editing.available_days || [];
    setEditing({
      ...editing,
      available_days: current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[#52645B]">
            Doctors remain hidden from public pages until you verify their credentials and click{' '}
            <strong>Verify &amp; Publish</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Doctor Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doctors.map((doc) => (
          <div
            key={doc.id}
            className="rounded-xl border border-[#DDECE3] bg-white p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-base text-[#26352E]">
                    {doc.full_name}
                  </h3>
                  <div className="text-xs font-semibold text-[#E34C3D]">{doc.speciality}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${
                    doc.is_verified && doc.is_active
                      ? 'bg-[#F2F9F4] text-[#168B4B]'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {doc.is_verified ? 'Verified & Live' : 'Draft · Pending Verification'}
                </span>
              </div>

              {doc.qualifications && (
                <p className="text-xs text-[#26352E] leading-relaxed">{doc.qualifications}</p>
              )}
              {doc.registration_number && (
                <p className="text-xs font-mono text-[#52645B]">Reg: {doc.registration_number}</p>
              )}
              <div className="text-xs text-[#52645B] flex flex-wrap gap-x-3 gap-y-1">
                <span>
                  Fee:{' '}
                  <strong className="text-[#26352E] tabular-nums">
                    {doc.consultation_fee_inr != null ? `₹${doc.consultation_fee_inr}` : 'Not set'}
                  </strong>
                </span>
                <span>
                  Days:{' '}
                  <strong className="text-[#26352E]">
                    {doc.available_days.length > 0 ? doc.available_days.join(', ') : 'Not set'}
                  </strong>
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EEF5F0] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onUpdate(doc.id, { is_verified: !doc.is_verified })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  doc.is_verified
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'bg-[#168B4B] text-white hover:bg-[#11713C]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {doc.is_verified ? 'Unpublish' : 'Verify & Publish'}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(doc)}
                  className="p-2 rounded-lg border border-[#CBE0D3] text-[#26352E] hover:bg-[#F2F9F4]"
                  title="Edit doctor"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  className="p-2 rounded-lg border border-[#F5C6C0] text-[#E34C3D] hover:bg-[#FFF2F0]"
                  title="Delete doctor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Doctor Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#EEF5F0] pb-3">
              <h3 className="font-display font-bold text-lg text-[#26352E]">
                {editing.id ? 'Edit Doctor Profile' : 'Create Doctor Profile'}
              </h3>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  required
                  value={editing.full_name || ''}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Speciality *</label>
                <input
                  required
                  value={editing.speciality || ''}
                  onChange={(e) => setEditing({ ...editing, speciality: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Department</label>
                <select
                  value={editing.department_id || ''}
                  onChange={(e) => setEditing({ ...editing, department_id: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] bg-white"
                >
                  <option value="">— Select Department —</option>
                  {consultDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Registration Number (Verified)</label>
                <input
                  value={editing.registration_number || ''}
                  onChange={(e) => setEditing({ ...editing, registration_number: e.target.value })}
                  placeholder="e.g. WBMC - 76915"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Verified Qualifications</label>
                <input
                  value={editing.qualifications || ''}
                  onChange={(e) => setEditing({ ...editing, qualifications: e.target.value })}
                  placeholder="MBBS, MS, MD..."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Hospital Affiliation</label>
                <input
                  value={editing.hospital_affiliation || ''}
                  onChange={(e) => setEditing({ ...editing, hospital_affiliation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Consultation Fee (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.consultation_fee_inr ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      consultation_fee_inr: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Appointment Duration (mins)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={editing.appointment_duration_minutes ?? 20}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      appointment_duration_minutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Photo URL (Owner-approved only)</label>
                <input
                  value={editing.photo_url || ''}
                  onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })}
                  placeholder="/assets/... or https://..."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1.5">Available Chamber Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES_EN.map((day) => {
                    const checked = (editing.available_days || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-2.5 py-1 rounded-md font-semibold border ${
                          checked
                            ? 'bg-[#168B4B] text-white border-[#168B4B]'
                            : 'bg-white text-[#52645B] border-[#CBE0D3]'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">
                  Available Time Slots (24h HH:MM comma-separated, e.g. 10:00, 10:30, 11:00)
                </label>
                <input
                  value={(editing.available_time_slots || []).join(', ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      available_time_slots: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => /^\d{2}:\d{2}$/.test(s)),
                    })
                  }
                  placeholder="10:00, 10:30, 11:00, 16:00, 16:30"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] font-mono"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 font-semibold text-[#168B4B]">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.is_verified)}
                    onChange={(e) => setEditing({ ...editing, is_verified: e.target.checked })}
                  />
                  Verified by Administrator (Publish to Public Directory)
                </label>
                <label className="inline-flex items-center gap-2 font-semibold text-[#26352E]">
                  <input
                    type="checkbox"
                    checked={editing.is_active !== false}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EEF5F0]">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#CBE0D3] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#168B4B] text-white text-xs font-semibold"
              >
                {saving ? 'Saving...' : 'Save Doctor Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. SERVICES & PATHOLOGY LAB MANAGEMENT
// ============================================================================

export function AdminServicesPanel({
  services,
  departments,
  onCreate,
  onUpdate,
  onDelete,
}: {
  services: ServiceItem[];
  departments: Department[];
  onCreate: (payload: Omit<ServiceItem, 'id'>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<ServiceItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [catFilter, setCatFilter] = useState<ServiceCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<ServiceItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (catFilter !== 'all' && s.category !== catFilter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, catFilter, search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name || !editing.category) return;
    setSaving(true);
    try {
      const payload: Omit<ServiceItem, 'id'> = {
        department_id: editing.department_id || null,
        name: editing.name.trim(),
        name_bn: editing.name_bn?.trim() || null,
        name_ne: editing.name_ne?.trim() || null,
        category: editing.category,
        description: editing.description?.trim() || null,
        duration_minutes: Number(editing.duration_minutes || 20),
        fee_inr:
          editing.fee_inr != null && editing.fee_inr !== ('' as any)
            ? Number(editing.fee_inr)
            : null,
        availability_note: editing.availability_note?.trim() || null,
        is_active: editing.is_active !== false,
        display_order: Number(editing.display_order || 0),
      };
      if (editing.id) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#52645B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter services or lab tests..."
              className="pl-9 pr-3 py-2 rounded-xl border border-[#CBE0D3] bg-white text-xs w-60"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-[#CBE0D3] bg-white text-xs font-semibold"
          >
            <option value="all">All Categories ({services.length})</option>
            <option value="doctor_consultation">Doctor Consultations</option>
            <option value="diagnostic">Diagnostic Services</option>
            <option value="health_package">Health Packages</option>
            <option value="pathology_test">Pathology Lab Tests</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditing({
              name: '',
              category: 'diagnostic',
              duration_minutes: 20,
              fee_inr: null,
              is_active: true,
              display_order: services.length + 1,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#168B4B] text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Service / Lab Test
        </button>
      </div>

      <div className="rounded-xl border border-[#DDECE3] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F2F9F4] border-b border-[#DDECE3] text-[#52645B] font-semibold">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Service / Test Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Fee (INR)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF5F0]">
              {visible.map((s) => (
                <tr key={s.id} className="hover:bg-[#F2F9F4]/40">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-[#52645B]">
                    {s.display_order}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-[#26352E]">{s.name}</td>
                  <td className="py-2.5 px-4 capitalize text-[#52645B]">
                    {s.category.replace('_', ' ')}
                  </td>
                  <td className="py-2.5 px-4 tabular-nums">{s.duration_minutes} min</td>
                  <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                    {s.fee_inr != null ? `₹${Number(s.fee_inr).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => onUpdate(s.id, { is_active: !s.is_active })}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        s.is_active
                          ? 'bg-[#F2F9F4] text-[#168B4B]'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-1">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="p-1.5 rounded border border-[#CBE0D3] hover:bg-[#F2F9F4]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(s.id)}
                      className="p-1.5 rounded border border-[#F5C6C0] text-[#E34C3D] hover:bg-[#FFF2F0]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#EEF5F0] pb-3">
              <h3 className="font-display font-bold text-base text-[#26352E]">
                {editing.id ? 'Edit Service' : 'Add New Service / Lab Test'}
              </h3>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Service Name (English) *</label>
                <input
                  required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Category *</label>
                <select
                  value={editing.category || 'diagnostic'}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] bg-white"
                >
                  <option value="doctor_consultation">Doctor Consultation</option>
                  <option value="diagnostic">Diagnostic Service</option>
                  <option value="health_package">Health Package</option>
                  <option value="pathology_test">Pathology Lab Test</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Department</label>
                <select
                  value={editing.department_id || ''}
                  onChange={(e) => setEditing({ ...editing, department_id: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3] bg-white"
                >
                  <option value="">— None —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Fee in INR (Optional)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.fee_inr ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      fee_inr: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={editing.duration_minutes ?? 20}
                  onChange={(e) =>
                    setEditing({ ...editing, duration_minutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Panel / Availability Note</label>
                <input
                  value={editing.availability_note || ''}
                  onChange={(e) => setEditing({ ...editing, availability_note: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={editing.display_order ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, display_order: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
                />
              </div>
              <label className="inline-flex items-center gap-2 font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editing.is_active !== false}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active &amp; Published
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#CBE0D3] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#168B4B] text-white text-xs font-semibold"
              >
                {saving ? 'Saving...' : 'Save Service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. PRIVATE CUSTOMER MANAGEMENT & BOOKING HISTORY
// ============================================================================

export function AdminCustomersPanel({
  customers,
  appointments,
}: {
  customers: Customer[];
  appointments: Appointment[];
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'cancelled'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const today = getTodayIST();

  const enriched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .map((c) => {
        const hist = appointments.filter((a) => a.customer_id === c.id);
        const upcoming = hist.filter(
          (a) => a.appointment_date >= today && (a.status === 'pending' || a.status === 'confirmed')
        );
        const cancelled = hist.filter((a) => a.status === 'cancelled');
        return { customer: c, hist, upcoming, cancelled };
      })
      .filter((row) => {
        if (filter === 'upcoming' && row.upcoming.length === 0) return false;
        if (filter === 'cancelled' && row.cancelled.length === 0) return false;
        if (!q) return true;
        return (
          row.customer.full_name.toLowerCase().includes(q) ||
          row.customer.mobile_number.includes(q)
        );
      });
  }, [customers, appointments, search, filter, today]);

  const selectedHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return appointments.filter((a) => a.customer_id === selectedCustomer.id);
  }, [selectedCustomer, appointments]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#52645B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer by name or mobile..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#CBE0D3] bg-white text-xs"
          />
        </div>
        <div className="inline-flex p-1 rounded-xl bg-[#F2F9F4] border border-[#DDECE3]">
          {[
            { id: 'all', label: 'All Customers' },
            { id: 'upcoming', label: 'Has Upcoming' },
            { id: 'cancelled', label: 'Has Cancelled' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filter === btn.id ? 'bg-white text-[#168B4B] shadow-xs' : 'text-[#52645B]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#DDECE3] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F2F9F4] border-b border-[#DDECE3] text-[#52645B] font-semibold">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4 text-right">Total Bookings</th>
                <th className="py-3 px-4 text-right">Upcoming</th>
                <th className="py-3 px-4 text-right">Cancelled</th>
                <th className="py-3 px-4 text-right">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF5F0]">
              {enriched.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#52645B]">
                    No customer records yet. Patient contact profiles are created privately when real
                    appointments are booked.
                  </td>
                </tr>
              ) : (
                enriched.map((row) => (
                  <tr key={row.customer.id} className="hover:bg-[#F2F9F4]/40">
                    <td className="py-3 px-4 font-semibold text-[#26352E]">
                      {row.customer.full_name}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-mono">{row.customer.mobile_number}</td>
                    <td className="py-3 px-4 text-[#52645B]">{row.customer.email || '—'}</td>
                    <td className="py-3 px-4 tabular-nums">
                      {row.customer.age != null ? row.customer.age : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      {row.hist.length}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#168B4B] tabular-nums">
                      {row.upcoming.length}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#E34C3D] tabular-nums">
                      {row.cancelled.length}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(row.customer)}
                        className="px-3 py-1 rounded-lg bg-[#F2F9F4] text-[#168B4B] hover:bg-[#168B4B] hover:text-white font-semibold"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#EEF5F0] pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-[#26352E]">
                  {selectedCustomer.full_name}
                </h3>
                <div className="text-xs text-[#52645B] tabular-nums">
                  {selectedCustomer.mobile_number}
                  {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {selectedHistory.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl border border-[#DDECE3] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-[#168B4B]">{a.booking_reference}</div>
                    <div className="font-semibold text-[#26352E] mt-0.5">{a.service_name}</div>
                    <div className="text-[#52645B] tabular-nums">
                      {formatDateReadable(a.appointment_date)} · {formatTime12h(a.appointment_time)}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#F2F9F4] font-semibold capitalize text-[#26352E]">
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
