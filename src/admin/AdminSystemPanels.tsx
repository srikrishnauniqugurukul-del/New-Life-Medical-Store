import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Database,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  UserCog,
} from 'lucide-react';
import type {
  AdminProfile,
  BackendHealthStatus,
  Language,
  NotificationLog,
  SiteContentSettings,
} from '../lib/types';
import { formatTimestampIST } from '../lib/timezone';

// ============================================================================
// 10. MULTILINGUAL WEBSITE CONTENT EDITOR (EN / BN / NE)
// ============================================================================

export function AdminContentPanel({
  settings,
  onSave,
}: {
  settings: SiteContentSettings;
  onSave: (next: SiteContentSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SiteContentSettings>(settings);
  const [editLang, setEditLang] = useState<Language>('en');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-[#F2F9F4] border border-[#DDECE3]">
          {[
            { code: 'en', label: 'English' },
            { code: 'bn', label: 'Bengali (বাংলা)' },
            { code: 'ne', label: 'Nepali (नेपाली)' },
          ].map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setEditLang(l.code as Language)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold ${
                editLang === l.code ? 'bg-white text-[#168B4B] shadow-xs' : 'text-[#52645B]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#168B4B] text-white font-semibold"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Publish Website Content'}
        </button>
      </div>

      <div className="rounded-xl border border-[#DDECE3] bg-white p-5 space-y-4">
        <h3 className="font-display font-bold text-sm text-[#26352E]">
          Homepage Hero &amp; About Text ({editLang.toUpperCase()})
        </h3>
        <div>
          <label className="block font-semibold mb-1">Hero Main Heading</label>
          <input
            value={draft.hero_heading[editLang]}
            onChange={(e) =>
              setDraft({
                ...draft,
                hero_heading: { ...draft.hero_heading, [editLang]: e.target.value },
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Hero Supporting Text</label>
          <textarea
            rows={2}
            value={draft.hero_subheading[editLang]}
            onChange={(e) =>
              setDraft({
                ...draft,
                hero_subheading: { ...draft.hero_subheading, [editLang]: e.target.value },
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">About Us Introduction</label>
          <textarea
            rows={3}
            value={draft.about_intro[editLang]}
            onChange={(e) =>
              setDraft({
                ...draft,
                about_intro: { ...draft.about_intro, [editLang]: e.target.value },
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">About Us Extended Mission</label>
          <textarea
            rows={3}
            value={draft.about_mission[editLang]}
            onChange={(e) =>
              setDraft({
                ...draft,
                about_mission: { ...draft.about_mission, [editLang]: e.target.value },
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Pathology &amp; Medical Disclaimer</label>
          <textarea
            rows={2}
            value={draft.pathology_disclaimer[editLang]}
            onChange={(e) =>
              setDraft({
                ...draft,
                pathology_disclaimer: {
                  ...draft.pathology_disclaimer,
                  [editLang]: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#DDECE3] bg-white p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <h3 className="md:col-span-2 font-display font-bold text-sm text-[#26352E]">
          Business Identity, Owner Photo &amp; Contact Details
        </h3>
        <div>
          <label className="block font-semibold mb-1">Owner Name</label>
          <input
            value={draft.owner_name}
            onChange={(e) => setDraft({ ...draft, owner_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Owner Photo URL</label>
          <input
            value={draft.owner_photo_url}
            onChange={(e) => setDraft({ ...draft, owner_photo_url: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Primary Appointment Phone</label>
          <input
            value={draft.primary_phone}
            onChange={(e) => setDraft({ ...draft, primary_phone: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Owner-Approved Google Maps Link</label>
          <input
            value={draft.google_maps_url}
            onChange={(e) => setDraft({ ...draft, google_maps_url: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block font-semibold mb-1">Full Address</label>
          <input
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-[#CBE0D3]"
          />
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// 11. NOTIFICATIONS LOG & EXTERNAL CHANNEL STATUS
// ============================================================================

export function AdminNotificationsPanel({
  notifications,
  health,
  onMarkRead,
}: {
  notifications: NotificationLog[];
  health: BackendHealthStatus;
  onMarkRead: (id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Email (SMTP)',
            active: health.notificationProviders.email,
            env: 'SMTP_HOST, SMTP_USER, SMTP_PASS',
            icon: Mail,
          },
          {
            label: 'WhatsApp Business API',
            active: health.notificationProviders.whatsapp,
            env: 'WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID',
            icon: MessageSquare,
          },
          {
            label: 'SMS Gateway',
            active: health.notificationProviders.sms,
            env: 'SMS_API_KEY, SMS_SENDER_ID',
            icon: Smartphone,
          },
        ].map((ch) => {
          const Icon = ch.icon;
          return (
            <div key={ch.label} className="rounded-xl border border-[#DDECE3] bg-white p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-sm text-[#26352E]">
                  <Icon className="w-4 h-4 text-[#168B4B]" />
                  {ch.label}
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    ch.active ? 'bg-[#F2F9F4] text-[#168B4B]' : 'bg-neutral-100 text-[#52645B]'
                  }`}
                >
                  {ch.active ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <p className="text-[11px] text-[#52645B] font-mono">{ch.env}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#DDECE3] bg-white overflow-hidden">
        <div className="px-5 py-3.5 bg-[#F2F9F4] border-b border-[#DDECE3] flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-[#26352E] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#168B4B]" />
            Appointment &amp; Enquiry Notification Log ({notifications.length})
          </h3>
        </div>
        <div className="divide-y divide-[#EEF5F0]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#52645B]">
              No notifications recorded yet. New appointment submissions, confirmations,
              cancellations, and contact enquiries are logged here automatically.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex flex-wrap items-start justify-between gap-3 text-xs ${
                  n.is_read ? 'bg-white' : 'bg-[#F2F9F4]/50'
                }`}
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="font-bold text-[#26352E]">{n.subject}</div>
                  <p className="text-[#52645B] leading-relaxed">{n.message}</p>
                  <div className="text-[11px] text-[#7D9186] tabular-nums">
                    {formatTimestampIST(n.created_at)} · Channel: {n.channel} · Status:{' '}
                    {n.delivery_status}
                  </div>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => onMarkRead(n.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#168B4B] text-white font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 12. SETTINGS & LIVE 12-TABLE DATABASE INSPECTOR
// ============================================================================

export function AdminSettingsAndDatabasePanel({
  health,
  onLoadInspector,
  onSeedSupabase,
}: {
  health: BackendHealthStatus;
  onLoadInspector: () => Promise<{
    mode: 'supabase' | 'local_preview';
    tables: Array<{ name: string; count: number; sample: any[] }>;
  }>;
  onSeedSupabase: () => Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<{
    mode: 'supabase' | 'local_preview';
    tables: Array<{ name: string; count: number; sample: any[] }>;
  } | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('appointments');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await onLoadInspector();
      setSnapshot(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const currentTable = snapshot?.tables.find((t) => t.name === selectedTable);

  return (
    <div className="space-y-6">
      {/* Supabase Connection Status Card */}
      <div className="rounded-xl border border-[#DDECE3] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#168B4B]" />
            <div>
              <h3 className="font-display font-bold text-base text-[#26352E]">
                Database &amp; Supabase PostgreSQL Status
              </h3>
              <p className="text-xs text-[#52645B]">
                Timezone: {health.timezone} · Mode:{' '}
                <strong>
                  {health.supabaseConnected
                    ? 'Connected to Supabase PostgreSQL'
                    : 'Not Connected (Local Server Preview)'}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {health.supabaseConnected && (
              <button
                type="button"
                disabled={seeding}
                onClick={async () => {
                  setSeeding(true);
                  try {
                    await onSeedSupabase();
                    await refresh();
                  } finally {
                    setSeeding(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#168B4B] text-white text-xs font-semibold"
              >
                {seeding ? 'Seeding...' : 'Seed Clinic Catalog to Supabase'}
              </button>
            )}
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#CBE0D3] text-xs font-semibold hover:bg-[#F2F9F4]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Tables
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#F2F9F4] border border-[#DDECE3]">
            <div className="font-mono font-bold text-[#26352E]">SUPABASE_URL</div>
            <div className="text-[#52645B] mt-0.5">
              {health.supabaseConnected ? 'Configured in server env' : 'Awaiting secret'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F2F9F4] border border-[#DDECE3]">
            <div className="font-mono font-bold text-[#26352E]">SUPABASE_PUBLISHABLE_KEY</div>
            <div className="text-[#52645B] mt-0.5">
              {health.supabaseConnected ? 'Configured in server env' : 'Awaiting secret'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F2F9F4] border border-[#DDECE3]">
            <div className="font-mono font-bold text-[#26352E]">SUPABASE_SECRET_KEY</div>
            <div className="text-[#52645B] mt-0.5">
              {health.supabaseConnected ? 'Server-side only (protected)' : 'Awaiting secret'}
            </div>
          </div>
        </div>

        {!health.supabaseConnected && (
          <div className="text-xs text-[#52645B] bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 leading-relaxed">
            To connect your live Supabase PostgreSQL database: run{' '}
            <code className="font-mono font-semibold">database/migrations/001_initial_schema.sql</code>{' '}
            inside Supabase SQL Editor, add the 3 environment variables above in Secrets, and
            restart the server.
          </div>
        )}
      </div>

      {/* Live 12-Table Database Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 rounded-xl border border-[#DDECE3] bg-white p-4 space-y-1.5">
          <div className="text-xs font-bold text-[#26352E] px-2 pb-2 border-b border-[#EEF5F0]">
            Database Tables (12)
          </div>
          {(snapshot?.tables || []).map((tbl) => (
            <button
              key={tbl.name}
              type="button"
              onClick={() => setSelectedTable(tbl.name)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                selectedTable === tbl.name
                  ? 'bg-[#168B4B] text-white font-semibold'
                  : 'text-[#26352E] hover:bg-[#F2F9F4]'
              }`}
            >
              <span>{tbl.name}</span>
              <span className="tabular-nums opacity-80">{tbl.count}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 rounded-xl border border-[#DDECE3] bg-white p-5 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#EEF5F0] pb-2.5">
            <h4 className="font-mono font-bold text-sm text-[#26352E]">
              public.{selectedTable}
            </h4>
            <span className="text-xs text-[#52645B] tabular-nums">
              {currentTable?.count ?? 0} total rows
            </span>
          </div>

          {!currentTable || currentTable.sample.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#52645B]">
              Table <code className="font-mono">{selectedTable}</code> currently has 0 rows.
            </div>
          ) : (
            <pre className="text-[11px] font-mono bg-[#1B2822] text-[#DCFCE7] p-4 rounded-xl overflow-x-auto max-h-[420px] leading-relaxed">
              {JSON.stringify(currentTable.sample, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 13. ADMIN PROFILE PANEL
// ============================================================================

export function AdminProfilePanel({
  profile,
  onSaveProfile,
}: {
  profile: AdminProfile | null;
  onSaveProfile: (payload: {
    full_name?: string;
    phone?: string;
    new_password?: string;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '+91 98003 33776');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        new_password: newPassword.trim() || undefined,
      });
      setNewPassword('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg rounded-xl border border-[#DDECE3] bg-white p-6 space-y-4 text-xs"
    >
      <div className="flex items-center gap-3 pb-3 border-b border-[#EEF5F0]">
        <div className="w-10 h-10 rounded-xl bg-[#F2F9F4] text-[#168B4B] flex items-center justify-center">
          <UserCog className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base text-[#26352E]">
            Administrator Account
          </h3>
          <div className="text-[#52645B]">{profile?.email}</div>
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1">Full Name</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBE0D3] text-sm"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Contact Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBE0D3] text-sm tabular-nums"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">
          New Password (Optional — min. 8 characters)
        </label>
        <input
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBE0D3] text-sm"
        />
      </div>

      <div className="flex items-center gap-2 text-[#168B4B] pt-1">
        <ShieldCheck className="w-4 h-4" />
        <span>Role: Active Administrator</span>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-[#168B4B] hover:bg-[#11713C] text-white font-semibold text-sm"
      >
        {saving ? 'Updating...' : 'Save Profile Changes'}
      </button>
    </form>
  );
}
