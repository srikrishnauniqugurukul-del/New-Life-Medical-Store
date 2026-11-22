import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Appointment,
  AppointmentStatus,
  BackendHealthStatus,
  Customer,
  Department,
  Doctor,
  ServiceItem,
} from '../lib/types';
import {
  DAY_SHORT_EN,
  formatDateReadable,
  formatTime12h,
  formatTimestampIST,
  getTodayIST,
} from '../lib/timezone';

// ============================================================================
// 1. ADMIN OVERVIEW (8 KPI CARDS + CHARTS)
// ============================================================================

export function AdminOverviewPanel({
  health,
  appointments,
  customers,
  services,
  doctors,
  departments,
  onNavigateTab,
}: {
  health: BackendHealthStatus;
  appointments: Appointment[];
  customers: Customer[];
  services: ServiceItem[];
  doctors: Doctor[];
  departments: Department[];
  onNavigateTab: (tab: string) => void;
}) {
  const [trendRange, setTrendRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const todayIST = getTodayIST();

  const stats = useMemo(() => {
    const total = appointments.length;
    const today = appointments.filter((a) => a.appointment_date === todayIST).length;
    const pending = appointments.filter((a) => a.status === 'pending').length;
    const confirmed = appointments.filter((a) => a.status === 'confirmed').length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
    const activeServices = services.filter((s) => s.is_active).length;
    const verifiedDoctors = doctors.filter((d) => d.is_verified && d.is_active).length;
    return {
      total,
      today,
      pending,
      confirmed,
      cancelled,
      customers: customers.length,
      activeServices,
      verifiedDoctors,
    };
  }, [appointments, customers, services, doctors, todayIST]);

  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    if (trendRange === 'daily') {
      // Last 7 days in IST
      const [y, m, d] = todayIST.split('-').map(Number);
      const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(base.getTime() - i * 86400000);
        const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
          dt.getUTCDate()
        ).padStart(2, '0')}`;
        map.set(key.slice(5), 0);
      }
      appointments.forEach((a) => {
        const k = a.appointment_date.slice(5);
        if (map.has(k)) map.set(k, (map.get(k) || 0) + 1);
      });
    } else if (trendRange === 'weekly') {
      for (let i = 3; i >= 0; i--) map.set(`W-${i === 0 ? 'Now' : i}`, 0);
      const [y, m, d] = todayIST.split('-').map(Number);
      const todayMs = Date.UTC(y, m - 1, d, 12, 0, 0);
      appointments.forEach((a) => {
        const [ay, am, ad] = a.appointment_date.split('-').map(Number);
        const diffDays = Math.floor((todayMs - Date.UTC(ay, am - 1, ad, 12, 0, 0)) / 86400000);
        const w = Math.floor(diffDays / 7);
        if (w >= 0 && w <= 3) {
          const label = `W-${w === 0 ? 'Now' : w}`;
          map.set(label, (map.get(label) || 0) + 1);
        }
      });
    } else {
      const [y, m] = todayIST.split('-').map(Number);
      for (let i = 5; i >= 0; i--) {
        const dt = new Date(Date.UTC(y, m - 1 - i, 1));
        const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
        map.set(key, 0);
      }
      appointments.forEach((a) => {
        const key = a.appointment_date.slice(0, 7);
        if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
      });
    }
    return Array.from(map.entries()).map(([label, bookings]) => ({ label, bookings }));
  }, [appointments, trendRange, todayIST]);

  const deptData = useMemo(() => {
    const counts = new Map<string, number>();
    departments.forEach((d) => counts.set(d.name.replace(' Consultation', ''), 0));
    appointments.forEach((a) => {
      const name = (a.department_name || 'Diagnostic').replace(' Consultation', '');
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name: name.slice(0, 16), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [appointments, departments]);

  const statusData = useMemo(() => {
    const counts: Record<AppointmentStatus, number> = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    appointments.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return [
      { name: 'Pending', value: counts.pending, color: '#D97706' },
      { name: 'Confirmed', value: counts.confirmed, color: '#168B4B' },
      { name: 'Completed', value: counts.completed, color: '#26352E' },
      { name: 'Cancelled', value: counts.cancelled, color: '#E34C3D' },
      { name: 'No-Show', value: counts.no_show, color: '#9CA3AF' },
    ].filter((d) => d.value > 0);
  }, [appointments]);

  const kpis = [
    { label: 'Total Appointments', value: stats.total, tone: 'text-[#26352E]', tab: 'appointments' },
    { label: "Today's Appointments", value: stats.today, tone: 'text-[#168B4B]', tab: 'appointments' },
    { label: 'Pending Appointments', value: stats.pending, tone: 'text-amber-700', tab: 'appointments' },
    { label: 'Confirmed Appointments', value: stats.confirmed, tone: 'text-[#168B4B]', tab: 'appointments' },
    { label: 'Cancelled Appointments', value: stats.cancelled, tone: 'text-[#E34C3D]', tab: 'appointments' },
    { label: 'Registered Customers', value: stats.customers, tone: 'text-[#26352E]', tab: 'customers' },
    { label: 'Active Services & Tests', value: stats.activeServices, tone: 'text-[#168B4B]', tab: 'services' },
    { label: 'Verified Doctors', value: stats.verifiedDoctors, tone: 'text-[#26352E]', tab: 'doctors' },
  ];

  return (
    <div className="space-y-6">
      {!health.supabaseConnected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <div>
              <strong>Supabase PostgreSQL Not Connected Yet.</strong> Connect{' '}
              <code className="font-mono">SUPABASE_URL</code>,{' '}
              <code className="font-mono">SUPABASE_PUBLISHABLE_KEY</code>, and{' '}
              <code className="font-mono">SUPABASE_SECRET_KEY</code> to persist real production data
              permanently. Zero fake customer bookings are shown.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="px-3.5 py-2 rounded-lg bg-amber-800 text-white font-semibold whitespace-nowrap shrink-0"
          >
            Open Database Setup
          </button>
        </div>
      )}

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => onNavigateTab(card.tab)}
            className="text-left rounded-xl border border-[#DDECE3] bg-white p-5 hover:border-[#168B4B]/60 transition-colors"
          >
            <div className="text-xs font-medium text-[#52645B]">{card.label}</div>
            <div className={`font-display font-extrabold text-3xl mt-2 tabular-nums ${card.tone}`}>
              {card.value}
            </div>
          </button>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Appointment Trends */}
        <div className="lg:col-span-7 rounded-xl border border-[#DDECE3] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-base text-[#26352E]">
                Appointment Trends
              </h2>
              <p className="text-xs text-[#52645B]">Real database bookings in Asia/Kolkata time</p>
            </div>
            <div className="inline-flex p-0.5 rounded-lg bg-[#F2F9F4] border border-[#DDECE3]">
              {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTrendRange(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${
                    trendRange === r ? 'bg-white text-[#168B4B] shadow-xs' : 'text-[#52645B]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF5F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#52645B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#52645B' }} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#168B4B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="lg:col-span-5 rounded-xl border border-[#DDECE3] bg-white p-5 space-y-4">
          <div>
            <h2 className="font-display font-bold text-base text-[#26352E]">
              Status Distribution
            </h2>
            <p className="text-xs text-[#52645B]">Breakdown of current appointment states</p>
          </div>

          {statusData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-[#52645B] bg-[#F2F9F4]/50 rounded-lg">
              No appointments recorded yet.
            </div>
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Department-wise Bookings */}
        <div className="lg:col-span-12 rounded-xl border border-[#DDECE3] bg-white p-5 space-y-4">
          <div>
            <h2 className="font-display font-bold text-base text-[#26352E]">
              Department-Wise Bookings
            </h2>
            <p className="text-xs text-[#52645B]">
              Distribution across specialist consultation chambers and diagnostic wing
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF5F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#52645B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#52645B' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#E34C3D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. APPOINTMENTS ADMINISTRATION TABLE + DETAIL MODAL
// ============================================================================

export function AdminAppointmentsPanel({
  appointments,
  onUpdateStatus,
}: {
  appointments: Appointment[];
  onUpdateStatus: (
    id: string,
    patch: { status?: AppointmentStatus; admin_notes?: string }
  ) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = appointments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.booking_reference.toLowerCase().includes(q) ||
        (a.customer?.full_name || '').toLowerCase().includes(q) ||
        (a.customer?.mobile_number || '').includes(q) ||
        (a.service_name || '').toLowerCase().includes(q) ||
        (a.doctor_name || '').toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => {
      const cmp = `${a.appointment_date}T${a.appointment_time}`.localeCompare(
        `${b.appointment_date}T${b.appointment_time}`
      );
      return sortAsc ? cmp : -cmp;
    });
  }, [appointments, search, statusFilter, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const triggerUpdate = async (
    id: string,
    patch: { status?: AppointmentStatus; admin_notes?: string }
  ) => {
    setSavingId(id);
    try {
      await onUpdateStatus(id, patch);
      if (activeAppt && activeAppt.id === id) {
        setActiveAppt((prev) => (prev ? { ...prev, ...patch } : null));
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#52645B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search Booking ID, patient, mobile, service..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#CBE0D3] bg-white text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-[#CBE0D3] bg-white text-xs font-semibold text-[#26352E]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-Show</option>
          </select>

          <button
            type="button"
            onClick={() => setSortAsc((p) => !p)}
            className="px-3 py-2 rounded-xl border border-[#CBE0D3] bg-white text-xs font-semibold text-[#26352E] hover:bg-[#F2F9F4]"
          >
            Date: {sortAsc ? 'Oldest First' : 'Newest First'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#DDECE3] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F2F9F4] border-b border-[#DDECE3] text-[#52645B] font-semibold">
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Date &amp; Time (IST)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF5F0]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-[#52645B]">
                    No appointments found. Genuine patient bookings submitted through the public
                    booking wizard appear here immediately.
                  </td>
                </tr>
              ) : (
                paginated.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F2F9F4]/40">
                    <td className="py-3 px-4 font-mono font-bold text-[#168B4B] whitespace-nowrap">
                      {a.booking_reference}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#26352E]">
                      {a.customer?.full_name || '—'}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-[#52645B]">
                      {a.customer?.mobile_number || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#26352E] max-w-[180px] truncate">
                      {a.service_name || a.category}
                    </td>
                    <td className="py-3 px-4 text-[#52645B]">
                      {a.doctor_name || (a.category === 'diagnostic' ? 'Pathology Lab' : 'Desk Assigned')}
                    </td>
                    <td className="py-3 px-4 tabular-nums whitespace-nowrap text-[#26352E]">
                      {a.appointment_date} · {formatTime12h(a.appointment_time)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-semibold capitalize ${
                          a.status === 'confirmed'
                            ? 'bg-[#F2F9F4] text-[#168B4B]'
                            : a.status === 'cancelled' || a.status === 'no_show'
                              ? 'bg-[#FFF2F0] text-[#E34C3D]'
                              : a.status === 'completed'
                                ? 'bg-neutral-100 text-[#26352E]'
                                : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#52645B] whitespace-nowrap tabular-nums">
                      {formatTimestampIST(a.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      {a.status === 'pending' && (
                        <button
                          type="button"
                          disabled={savingId === a.id}
                          onClick={() => triggerUpdate(a.id, { status: 'confirmed' })}
                          className="p-1.5 rounded bg-[#F2F9F4] text-[#168B4B] hover:bg-[#168B4B] hover:text-white"
                          title="Confirm Booking"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button
                          type="button"
                          disabled={savingId === a.id}
                          onClick={() => triggerUpdate(a.id, { status: 'cancelled' })}
                          className="p-1.5 rounded bg-[#FFF2F0] text-[#E34C3D] hover:bg-[#E34C3D] hover:text-white"
                          title="Cancel Booking"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAppt(a);
                          setNotesDraft(a.admin_notes || '');
                        }}
                        className="p-1.5 rounded border border-[#DDECE3] text-[#26352E] hover:bg-[#F2F9F4]"
                        title="View Details & Notes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#EEF5F0] flex items-center justify-between text-xs text-[#52645B]">
            <span>
              Page {page} of {totalPages} ({filtered.length} total)
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 rounded border border-[#CBE0D3] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded border border-[#CBE0D3] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Detail & Admin Action Modal */}
      {activeAppt && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setActiveAppt(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono font-bold text-sm text-[#168B4B]">
                  {activeAppt.booking_reference}
                </div>
                <h3 className="font-display font-bold text-lg text-[#26352E]">
                  {activeAppt.customer?.full_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppt(null)}
                className="p-1.5 rounded-lg hover:bg-[#F2F9F4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F2F9F4]/60 p-4 rounded-xl">
              <div>
                <span className="text-[#52645B]">Mobile:</span>
                <div className="font-semibold text-[#26352E] tabular-nums">
                  {activeAppt.customer?.mobile_number}
                </div>
              </div>
              <div>
                <span className="text-[#52645B]">Email / Age:</span>
                <div className="font-semibold text-[#26352E]">
                  {activeAppt.customer?.email || '—'} ·{' '}
                  {activeAppt.customer?.age != null ? `${activeAppt.customer.age} yrs` : '—'}
                </div>
              </div>
              <div>
                <span className="text-[#52645B]">Service:</span>
                <div className="font-semibold text-[#26352E]">{activeAppt.service_name}</div>
              </div>
              <div>
                <span className="text-[#52645B]">Doctor:</span>
                <div className="font-semibold text-[#26352E]">
                  {activeAppt.doctor_name || 'Clinic Assigned / Lab'}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-[#52645B]">Slot (IST):</span>
                <div className="font-semibold text-[#168B4B] tabular-nums">
                  {formatDateReadable(activeAppt.appointment_date)} at{' '}
                  {formatTime12h(activeAppt.appointment_time)}
                </div>
              </div>
              {activeAppt.customer_message && (
                <div className="col-span-2">
                  <span className="text-[#52645B]">Patient Note:</span>
                  <div className="text-[#26352E] mt-0.5">{activeAppt.customer_message}</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#26352E]">
                Update Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={savingId === activeAppt.id}
                      onClick={() => triggerUpdate(activeAppt.id, { status: st })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                        activeAppt.status === st
                          ? 'bg-[#168B4B] text-white border-[#168B4B]'
                          : 'bg-white text-[#26352E] border-[#CBE0D3] hover:bg-[#F2F9F4]'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#26352E]">
                Internal Administrative Notes
              </label>
              <textarea
                rows={3}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Private desk notes (never visible to public)..."
                className="w-full px-3 py-2 rounded-xl border border-[#CBE0D3] text-xs"
              />
              <button
                type="button"
                disabled={savingId === activeAppt.id}
                onClick={() => triggerUpdate(activeAppt.id, { admin_notes: notesDraft })}
                className="px-4 py-2 rounded-lg bg-[#26352E] text-white text-xs font-semibold"
              >
                Save Internal Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. INTERACTIVE CALENDAR VIEW (DAILY / WEEKLY / MONTHLY MODES)
// ============================================================================

export function AdminCalendarPanel({ appointments }: { appointments: Appointment[] }) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [anchorDate, setAnchorDate] = useState<string>(() => getTodayIST());

  const shiftDate = (days: number) => {
    const [y, m, d] = anchorDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
    setAnchorDate(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
        dt.getUTCDate()
      ).padStart(2, '0')}`
    );
  };

  const visibleDates = useMemo(() => {
    const [y, m, d] = anchorDate.split('-').map(Number);
    if (viewMode === 'daily') return [anchorDate];
    if (viewMode === 'weekly') {
      const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const startOffset = base.getUTCDay();
      return Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(base.getTime() + (i - startOffset) * 86400000);
        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
          dt.getUTCDate()
        ).padStart(2, '0')}`;
      });
    }
    // Monthly
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      return `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    });
  }, [anchorDate, viewMode]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDate(viewMode === 'daily' ? -1 : viewMode === 'weekly' ? -7 : -30)}
            className="p-2 rounded-lg border border-[#CBE0D3] bg-white hover:bg-[#F2F9F4]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-1.5 rounded-lg bg-white border border-[#DDECE3] text-xs font-semibold text-[#26352E] flex items-center gap-2 tabular-nums">
            <CalendarIcon className="w-4 h-4 text-[#168B4B]" />
            {formatDateReadable(anchorDate)}
          </div>
          <button
            type="button"
            onClick={() => shiftDate(viewMode === 'daily' ? 1 : viewMode === 'weekly' ? 7 : 30)}
            className="p-2 rounded-lg border border-[#CBE0D3] bg-white hover:bg-[#F2F9F4]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(getTodayIST())}
            className="px-3 py-1.5 rounded-lg bg-[#F2F9F4] text-[#168B4B] text-xs font-semibold"
          >
            Today (IST)
          </button>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-[#F2F9F4] border border-[#DDECE3]">
          {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                viewMode === mode ? 'bg-white text-[#168B4B] shadow-xs' : 'text-[#52645B]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid gap-3 ${
          viewMode === 'daily'
            ? 'grid-cols-1'
            : viewMode === 'weekly'
              ? 'grid-cols-1 md:grid-cols-7'
              : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
        }`}
      >
        {visibleDates.map((dateStr) => {
          const dayAppts = appointments
            .filter((a) => a.appointment_date === dateStr)
            .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
          const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
          const isToday = dateStr === getTodayIST();
          return (
            <div
              key={dateStr}
              className={`rounded-xl border p-3 bg-white min-h-[120px] flex flex-col gap-2 ${
                isToday ? 'border-[#168B4B]' : 'border-[#DDECE3]'
              }`}
            >
              <div className="flex items-center justify-between text-xs border-b border-[#EEF5F0] pb-1.5">
                <span className="font-semibold text-[#52645B]">{DAY_SHORT_EN[dow]}</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    isToday ? 'text-[#168B4B]' : 'text-[#26352E]'
                  }`}
                >
                  {dateStr.slice(5)}
                </span>
              </div>

              {dayAppts.length === 0 ? (
                <div className="text-[11px] text-[#9BB2A5] py-2">No bookings</div>
              ) : (
                <div className="space-y-1.5">
                  {dayAppts.map((a) => (
                    <div
                      key={a.id}
                      className={`p-2 rounded-lg text-[11px] border ${
                        a.status === 'confirmed'
                          ? 'bg-[#F2F9F4] border-[#168B4B]/30 text-[#168B4B]'
                          : a.status === 'cancelled'
                            ? 'bg-[#FFF2F0] border-[#E34C3D]/30 text-[#E34C3D] line-through'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-mono font-bold tabular-nums">
                        {formatTime12h(a.appointment_time)}
                      </div>
                      <div className="font-semibold truncate">{a.customer?.full_name}</div>
                      <div className="truncate opacity-80">{a.service_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
