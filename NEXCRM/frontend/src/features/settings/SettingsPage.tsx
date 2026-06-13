import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Save, Shield, Building2, Users, Database, Activity, ExternalLink,
  User, Lock, Bell, Phone, MessageSquare, Clock, Zap,
  ToggleLeft, ToggleRight, ChevronRight, CheckCircle, AlertTriangle,
  Mail, Smartphone, BarChart2, Plus, Trash2, Globe, Key,
  Edit2, Power, Layers, Megaphone, AlertOctagon, SlidersHorizontal,
} from "lucide-react";
import Modal from "../../components/Modal";
import { useAuthStore } from "../../store/authStore";
import { formatDate } from "../../utils/dateUtils";

// ── Shared toggle switch ──────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-brand-600" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-100 mb-6">
      <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

type Tab = "profile" | "workspace" | "nurturing" | "email" | "whatsapp" | "notifications" | "scoring" | "scheduler" | "tenants";

const NAV: { key: Tab; label: string; icon: any; adminOnly?: boolean; superAdminOnly?: boolean }[] = [
  { key: "profile",       label: "My Profile",          icon: User },
  { key: "workspace",     label: "Workspace",            icon: Building2,  adminOnly: true },
  { key: "nurturing",     label: "Nurturing Settings",   icon: Zap,         adminOnly: true },
  { key: "email",         label: "Email & Outreach",     icon: Mail,        adminOnly: true },
  { key: "whatsapp",      label: "WhatsApp API",         icon: Smartphone,  adminOnly: true },
  { key: "notifications", label: "Notifications",        icon: Bell,        adminOnly: true },
  { key: "scoring",       label: "Lead Scoring",         icon: BarChart2,   adminOnly: true },
  { key: "scheduler",     label: "Scheduler & Calls",    icon: Phone,       adminOnly: true },
  { key: "tenants",       label: "Tenant Management",    icon: Shield,      superAdminOnly: true },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "tenant_admin" || isSuperAdmin;
  const [tab, setTab] = useState<Tab>(isSuperAdmin ? "tenants" : "profile");

  const visibleNav = NAV.filter((n) => {
    if (n.superAdminOnly) return isSuperAdmin;
    if (n.adminOnly) return isAdmin;
    return true;
  });

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      {/* ── Left nav sidebar ── */}
      <aside className="w-52 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</p>
          </div>
          <nav className="p-2">
            {visibleNav.map((n) => (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 text-left ${
                  tab === n.key
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <n.icon className="w-4 h-4 flex-shrink-0" />
                {n.label}
                {tab === n.key && <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-400" />}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {tab === "profile"       && <ProfileTab user={user} />}
        {tab === "workspace"     && <WorkspaceTab />}
        {tab === "nurturing"     && <NurturingTab />}
        {tab === "email"         && <EmailOutreachTab />}
        {tab === "whatsapp"      && <WhatsAppMetaTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "scoring"       && <LeadScoringTab />}
        {tab === "scheduler"     && <SchedulerTab />}
        {tab === "tenants"       && <TenantManagementTab />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: My Profile
// ════════════════════════════════════════════════════════════════════════════
function ProfileTab({ user }: { user: any }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name:  user?.last_name  || "",
    phone:      user?.phone      || "",
  });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    setForm({ first_name: user?.first_name || "", last_name: user?.last_name || "", phone: user?.phone || "" });
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.put(`/users/${user?.id}`, data).then((r) => r.data),
    onSuccess: () => toast.success("Profile updated."),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to update profile."),
  });

  const pwMutation = useMutation({
    mutationFn: (data: any) => api.put(`/users/${user?.id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Password changed.");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to change password."),
  });

  const handlePwSubmit = () => {
    if (!pwForm.new_password) { setPwError("New password is required."); return; }
    if (pwForm.new_password.length < 8) { setPwError("Minimum 8 characters."); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Passwords don't match."); return; }
    setPwError("");
    pwMutation.mutate({ password: pwForm.new_password });
  };

  const roleLabel: Record<string, string> = {
    tenant_admin: "Admin",
    sales_manager: "Sales Manager",
    sales_rep: "Sales Rep",
    senior_sales_rep: "Senior Sales Rep",
  };

  return (
    <div className="space-y-6">
      {/* Personal info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={User} title="Personal Information" description="Update your name, phone, and display preferences." />

        {/* Avatar + role */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center text-2xl font-bold text-white select-none">
            {(user?.first_name?.[0] || "?").toUpperCase()}{(user?.last_name?.[0] || "").toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-brand-50 text-brand-700 rounded-full capitalize">
              {roleLabel[user?.role] || user?.role?.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="First Name">
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Last Name">
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Email Address" hint="Email cannot be changed. Contact your admin.">
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </Field>
          <Field label="Phone Number" hint="Used for callback scheduling.">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+91 XXXXXXXXXX"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => profileMutation.mutate(form)}
            disabled={profileMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {profileMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Password card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Lock} title="Change Password" description="Use a strong password with letters, numbers, and symbols." />

        <div className="max-w-sm space-y-4">
          <Field label="New Password">
            <input
              type="password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat new password"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          {pwError && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{pwError}</p>
          )}
          <button
            onClick={handlePwSubmit}
            disabled={pwMutation.isPending || !pwForm.new_password}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Lock className="w-4 h-4" />
            {pwMutation.isPending ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>

      {/* Account info card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Bell} title="Account Details" description="Read-only information about your account and access." />
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Role</p>
            <p className="font-medium text-gray-900 capitalize">{roleLabel[user?.role] || user?.role}</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Account Status</p>
            <p className="font-medium text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Active</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">User ID</p>
            <p className="font-mono text-xs text-gray-500 truncate">{user?.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Workspace
// ════════════════════════════════════════════════════════════════════════════
function WorkspaceTab() {
  const queryClient = useQueryClient();
  const { data: tenant } = useQuery({
    queryKey: ["tenant-current"],
    queryFn: () => api.get("/tenants/current").then((r) => r.data),
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (tenant && !form) setForm(tenant); }, [tenant]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/current", data).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenant-current"] }); toast.success("Workspace saved."); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save workspace."),
  });

  const current = form || tenant;
  if (!current) return <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>;

  const VERTICALS = ["Education", "Real Estate", "Healthcare", "Finance", "Technology", "Retail", "Manufacturing", "Other"];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Building2} title="Workspace" description="Organisation-level settings visible to all members of your account." />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Company Name">
            <input
              type="text"
              value={current.name || ""}
              onChange={(e) => setForm({ ...current, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Industry / Vertical">
            <select
              value={current.vertical_type || ""}
              onChange={(e) => setForm({ ...current, vertical_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select industry…</option>
              {VERTICALS.map((v) => <option key={v} value={v.toLowerCase().replace(" ", "_")}>{v}</option>)}
            </select>
          </Field>
          <Field label="Subdomain" hint="nexcrm.io subdomain (read-only)">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={current.subdomain || ""}
                disabled
                className="flex-1 px-3 py-2 border border-gray-100 rounded-l-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <span className="px-3 py-2 border border-l-0 border-gray-100 rounded-r-lg text-sm bg-gray-50 text-gray-400">.nexcrm.io</span>
            </div>
          </Field>
          <Field label="Plan Tier" hint="Contact support to upgrade.">
            <input
              type="text"
              value={current.plan_tier || "standard"}
              disabled
              className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed capitalize"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${current.is_active ? "bg-green-500" : "bg-red-400"}`} />
            <span className="text-xs text-gray-500">{current.is_active ? "Workspace active" : "Workspace suspended"}</span>
          </div>
          <button
            onClick={() => mutation.mutate({ name: current.name, vertical_type: current.vertical_type })}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? "Saving…" : "Save Workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Nurturing Settings
// ════════════════════════════════════════════════════════════════════════════
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function NurturingTab() {
  const queryClient = useQueryClient();

  const { data: nurturing } = useQuery({
    queryKey: ["nurturing-settings"],
    queryFn: () => api.get("/tenants/nurturing-settings").then((r) => r.data),
  });

  const { data: phoneConfig } = useQuery({
    queryKey: ["phone-config"],
    queryFn: () => api.get("/tenants/phone-config").then((r) => r.data),
  });

  const [form, setForm] = useState<any>(null);
  const [callThreshold, setCallThreshold] = useState<number>(6);

  useEffect(() => { if (nurturing && !form) setForm(nurturing); }, [nurturing]);
  useEffect(() => {
    if (phoneConfig) setCallThreshold(phoneConfig.max_call_attempts_before_fail || 6);
  }, [phoneConfig]);

  const nurturingMutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/nurturing-settings", data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["nurturing-settings"] });
      setForm(updated);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save nurturing settings."),
  });

  const phoneMutation = useMutation({
    mutationFn: (threshold: number) =>
      api.put("/tenants/phone-config", { max_call_attempts_before_fail: threshold }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phone-config"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save call threshold."),
  });

  const handleSave = async () => {
    if (!form) return;
    await Promise.all([nurturingMutation.mutateAsync(form), phoneMutation.mutateAsync(callThreshold)]);
    toast.success("Nurturing settings saved.");
  };

  const isSaving = nurturingMutation.isPending || phoneMutation.isPending;

  const f = form || nurturing;
  if (!f) return <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>;

  const toggleDay = (day: string) => {
    const current: string[] = f.allowed_send_days || [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setForm({ ...f, allowed_send_days: next });
  };

  return (
    <div className="space-y-6">
      {/* Global pause banner */}
      {f.global_pause && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          All automated outreach is currently <strong className="mx-1">paused</strong>. Leads will not receive any messages until you resume.
        </div>
      )}

      {/* Outreach intervals */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Zap} title="Outreach Intervals" description="Control how often COLD and FAILED leads are contacted. WARM and HOT leads have no automated cap — reps work them directly." />

        <div className="grid grid-cols-3 gap-4 mb-2">
          <Field label="Cold Interval (days)" hint="Days between automated outreach to COLD leads">
            <input type="number" min={1} max={30} value={f.cold_outreach_interval_days || 5}
              onChange={(e) => setForm({ ...f, cold_outreach_interval_days: +e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Failed Re-engagement (days)" hint="Re-engage FAILED leads after N days of inactivity">
            <input type="number" min={7} max={90} value={f.stale_reengagement_interval_days || 14}
              onChange={(e) => setForm({ ...f, stale_reengagement_interval_days: +e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Call Failure Threshold" hint="Lead is marked FAILED after this many No Answer / Not Interested outbound calls">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={20} value={callThreshold}
                onChange={(e) => setCallThreshold(+e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="text-xs text-gray-400 whitespace-nowrap">calls</span>
            </div>
          </Field>
        </div>
      </div>

      {/* Send window */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Clock} title="Send Window" description="Messages are only sent during this daily time window (your server timezone)." />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Field label="Window Opens" hint="Earliest time a message can be sent">
            <input type="time" value={f.daily_send_window_start || "09:00"}
              onChange={(e) => setForm({ ...f, daily_send_window_start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Window Closes" hint="Latest time a message can be sent">
            <input type="time" value={f.daily_send_window_end || "18:00"}
              onChange={(e) => setForm({ ...f, daily_send_window_end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
        </div>

        <Field label="Active Send Days" hint="Outreach runs only on selected days">
          <div className="flex flex-wrap gap-2 mt-1">
            {DAYS.map((day) => {
              const active = (f.allowed_send_days || []).includes(day);
              return (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:border-brand-400"
                  }`}>
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {/* Global pause */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={ToggleLeft} title="Global Controls" description="Emergency controls to pause all automated outreach instantly." />

        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-900">Pause All Automated Outreach</p>
            <p className="text-xs text-gray-500 mt-0.5">Stops all sequences, emails, and WhatsApp messages globally. Reps can still log calls manually.</p>
          </div>
          <Toggle checked={f.global_pause || false} onChange={(v) => setForm({ ...f, global_pause: v })} />
        </div>

        {f.global_pause && (
          <div className="mt-3">
            <Field label="Resume automatically on" hint="Leave blank to resume manually">
              <input type="datetime-local" value={f.global_pause_until ? new Date(f.global_pause_until).toISOString().slice(0, 16) : ""}
                onChange={(e) => setForm({ ...f, global_pause_until: e.target.value || null })}
                className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving…" : "Save Nurturing Settings"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Scheduler & Calls
// ════════════════════════════════════════════════════════════════════════════
function SchedulerTab() {
  const queryClient = useQueryClient();
  const { data: phoneConfig } = useQuery({
    queryKey: ["phone-config"],
    queryFn: () => api.get("/tenants/phone-config").then((r) => r.data),
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (phoneConfig && !form) setForm(phoneConfig); }, [phoneConfig]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/phone-config", data).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["phone-config"] });
      setForm(updated);
      toast.success("Scheduler & call settings saved.");
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });

  const f = form || phoneConfig;
  if (!f) return <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Call window & SLA */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Phone} title="Call Window & SLA" description="Define when calls can be made and how quickly WARM leads must be contacted." />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Call Window Start" hint="Earliest time reps can make outbound calls">
            <input type="time" value={f.call_window_start || "09:00"}
              onChange={(e) => setForm({ ...f, call_window_start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Call Window End" hint="Latest time reps can make outbound calls">
            <input type="time" value={f.call_window_end || "18:00"}
              onChange={(e) => setForm({ ...f, call_window_end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="FAILED Call Threshold" hint="Lead is marked FAILED after this many No Answer / Not Interested outbound calls">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={20} value={f.max_call_attempts_before_fail || 6}
                onChange={(e) => setForm({ ...f, max_call_attempts_before_fail: +e.target.value })}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="text-xs text-gray-400">attempts</span>
            </div>
          </Field>
          <Field label="WARM Lead SLA" hint="Alert if a WARM lead is not contacted within this window">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={96} value={f.sla_warm_contact_hours || 24}
                onChange={(e) => setForm({ ...f, sla_warm_contact_hours: +e.target.value })}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="text-xs text-gray-400">hours</span>
            </div>
          </Field>
        </div>
      </div>

      {/* Channel enablement */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={MessageSquare} title="Channels" description="Enable or disable communication channels. Credentials for Twilio are required for voice and WhatsApp." />

        <div className="space-y-3 mb-6">
          {[
            { key: "voice_enabled", label: "Voice Calls", desc: "Allow reps to log calls and use automated voice outreach" },
            { key: "whatsapp_enabled", label: "WhatsApp Messaging", desc: "Send automated and manual WhatsApp messages to leads" },
            { key: "call_recording_enabled", label: "Call Recording", desc: "Record outbound calls for QA and compliance (requires Twilio)" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={!!f[key]} onChange={(v) => setForm({ ...f, [key]: v })} />
            </div>
          ))}
        </div>

        {/* Twilio credentials */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" /> Twilio Credentials
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Account SID" hint="Starts with AC…">
              <input type="text" value={f.twilio_account_sid || ""}
                onChange={(e) => setForm({ ...f, twilio_account_sid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
            <Field label="Auth Token" hint="Saved encrypted. Last 4 chars shown after first save.">
              <input type="password" value={f.twilio_auth_token || ""}
                onChange={(e) => setForm({ ...f, twilio_auth_token: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
            <Field label="Twilio Phone Number" hint="E.164 format: +1XXXXXXXXXX">
              <input type="text" value={f.twilio_phone_number || ""}
                onChange={(e) => setForm({ ...f, twilio_phone_number: e.target.value })}
                placeholder="+1XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
            <Field label="WhatsApp Number" hint="The number registered with WhatsApp Business API">
              <input type="text" value={f.whatsapp_phone_number || ""}
                onChange={(e) => setForm({ ...f, whatsapp_phone_number: e.target.value })}
                placeholder="+91XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => mutation.mutate(f)} disabled={mutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {mutation.isPending ? "Saving…" : "Save Scheduler & Call Settings"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Email & Outreach
// ════════════════════════════════════════════════════════════════════════════
function EmailOutreachTab() {
  const queryClient = useQueryClient();

  const { data: nurturing } = useQuery({
    queryKey: ["nurturing-settings"],
    queryFn: () => api.get("/tenants/nurturing-settings").then((r) => r.data),
  });
  const { data: extSettings } = useQuery({
    queryKey: ["extended-settings"],
    queryFn: () => api.get("/tenants/extended-settings").then((r) => r.data),
  });

  const [nForm, setNForm] = useState<any>(null);
  const [eForm, setEForm] = useState<any>(null);
  const [suppressInput, setSuppressInput] = useState("");

  useEffect(() => { if (nurturing && !nForm) setNForm(nurturing); }, [nurturing]);
  useEffect(() => { if (extSettings !== undefined && !eForm) setEForm(extSettings?.email_outreach || {}); }, [extSettings]);

  const nurturingMutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/nurturing-settings", data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nurturing-settings"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });
  const extMutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/extended-settings", data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["extended-settings"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });

  const handleSave = async () => {
    if (!nForm) return;
    await Promise.all([
      nurturingMutation.mutateAsync({ max_messages_per_week: nForm.max_messages_per_week, max_cold_attempts: nForm.max_cold_attempts }),
      extMutation.mutateAsync({ email_outreach: eForm || {} }),
    ]);
    toast.success("Email & outreach settings saved.");
  };

  const addSuppression = () => {
    const email = suppressInput.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    const list: string[] = eForm?.suppression_list || [];
    if (!list.includes(email)) setEForm({ ...eForm, suppression_list: [...list, email] });
    setSuppressInput("");
  };

  const removeSuppression = (email: string) => {
    setEForm({ ...(eForm || {}), suppression_list: (eForm?.suppression_list || []).filter((x: string) => x !== email) });
  };

  const isSaving = nurturingMutation.isPending || extMutation.isPending;
  if (!nForm && !nurturing) return <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>;
  const n = nForm || nurturing || {};
  const e = eForm || {};

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Mail} title="Email Frequency Caps" description="Limit how many emails a single contact receives to prevent spam fatigue." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Max emails per contact per week" hint="Across all sequences and one-off emails">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={21} value={n.max_messages_per_week || 3}
                onChange={(ev) => setNForm({ ...n, max_messages_per_week: +ev.target.value })}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="text-xs text-gray-400">emails / week</span>
            </div>
          </Field>
          <Field label="Max cold outreach attempts" hint="Stop emailing a COLD lead after N unanswered attempts">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={30} value={n.max_cold_attempts || 5}
                onChange={(ev) => setNForm({ ...n, max_cold_attempts: +ev.target.value })}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="text-xs text-gray-400">attempts</span>
            </div>
          </Field>
          <Field label="Daily sequence enrollment limit" hint="Max leads enrolled across all sequences per day">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={2000} value={e.daily_enrollment_limit || 200}
                onChange={(ev) => setEForm({ ...e, daily_enrollment_limit: +ev.target.value })}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="text-xs text-gray-400">leads / day</span>
            </div>
          </Field>
          <Field label="Sender display name" hint="Shown as the From name in outreach emails">
            <input type="text" value={e.sender_display_name || ""}
              onChange={(ev) => setEForm({ ...e, sender_display_name: ev.target.value })}
              placeholder="e.g. Riya from Pritomatic"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Zap} title="Sequence Behaviour" description="Control what happens when a lead interacts with your outreach." />
        <div className="space-y-3">
          {([
            { key: "auto_unenroll_on_reply",  label: "Auto-unenroll on reply",          desc: "Remove a lead from the active sequence when they reply to any email" },
            { key: "skip_weekends",           label: "Skip weekends for sequence steps", desc: "Sequence steps are never scheduled on Saturday or Sunday" },
            { key: "track_opens",             label: "Track email opens",                desc: "Embed a 1×1 pixel to detect when the lead opens an email" },
            { key: "track_clicks",            label: "Track link clicks",                desc: "Rewrite links in emails to record when the lead clicks" },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={!!(e as any)[key]} onChange={(v) => setEForm({ ...e, [key]: v })} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Shield} title="Suppression List" description="Emails on this list will never receive automated outreach, regardless of sequence enrollment." />
        <div className="flex gap-2 mb-3">
          <input type="email" value={suppressInput}
            onChange={(ev) => setSuppressInput(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && addSuppression()}
            placeholder="email@domain.com"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button onClick={addSuppression}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {(e.suppression_list || []).length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">No suppressed emails yet</p>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {(e.suppression_list as string[]).map((email) => (
              <div key={email} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700 font-mono">{email}</span>
                <button onClick={() => removeSuppression(email)} className="text-gray-400 hover:text-red-500 transition-colors ml-3">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving…" : "Save Email & Outreach Settings"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: WhatsApp Meta API
// ════════════════════════════════════════════════════════════════════════════
function WhatsAppMetaTab() {
  const queryClient = useQueryClient();

  const { data: extSettings } = useQuery({
    queryKey: ["extended-settings"],
    queryFn: () => api.get("/tenants/extended-settings").then((r) => r.data),
  });
  const { data: phoneConfig } = useQuery({
    queryKey: ["phone-config"],
    queryFn: () => api.get("/tenants/phone-config").then((r) => r.data),
  });

  const [form, setForm] = useState<any>(null);
  const [waEnabled, setWaEnabled] = useState(false);

  useEffect(() => { if (extSettings !== undefined && !form) setForm(extSettings?.whatsapp_meta || {}); }, [extSettings]);
  useEffect(() => { if (phoneConfig) setWaEnabled(!!phoneConfig.whatsapp_enabled); }, [phoneConfig]);

  const extMutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/extended-settings", data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["extended-settings"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });
  const phoneMutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/phone-config", data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phone-config"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });

  const handleSave = async () => {
    await Promise.all([
      extMutation.mutateAsync({ whatsapp_meta: form || {} }),
      phoneMutation.mutateAsync({ whatsapp_enabled: waEnabled }),
    ]);
    toast.success("WhatsApp settings saved.");
  };

  const isSaving = extMutation.isPending || phoneMutation.isPending;
  const f = form || {};

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Smartphone} title="WhatsApp Status" description="Enable WhatsApp messaging for leads. Configure credentials below before enabling." />
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">WhatsApp Messaging Enabled</p>
            <p className="text-xs text-gray-400 mt-0.5">Allow automated and manual WhatsApp messages to be sent to leads</p>
          </div>
          <Toggle checked={waEnabled} onChange={setWaEnabled} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Globe} title="Meta Cloud API Credentials" description="Use Meta's direct Cloud API for higher throughput and no Twilio surcharge. Obtain these from Meta Business Manager → WhatsApp → API Setup." />

        <div className="grid grid-cols-2 gap-4 mb-5">
          <Field label="Meta Business Account ID (WABA ID)" hint="Found in Meta Business Manager → Business Settings → WhatsApp Accounts">
            <input type="text" value={f.business_account_id || ""}
              onChange={(e) => setForm({ ...f, business_account_id: e.target.value })}
              placeholder="e.g. 123456789012345"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Phone Number ID" hint="The specific number registered with your WABA. Found under WhatsApp → Getting Started.">
            <input type="text" value={f.phone_number_id || ""}
              onChange={(e) => setForm({ ...f, phone_number_id: e.target.value })}
              placeholder="e.g. 987654321098765"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Permanent API Token" hint="Generate a system user token in Meta Business Manager (never expires). Stored encrypted.">
            <input type="password" value={f.api_token || ""}
              onChange={(e) => setForm({ ...f, api_token: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Webhook Verify Token" hint="A string you choose. Enter the same value in Meta → Webhooks → Verify Token.">
            <input type="text" value={f.webhook_verify_token || ""}
              onChange={(e) => setForm({ ...f, webhook_verify_token: e.target.value })}
              placeholder="e.g. my_secret_verify_token"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
          <p className="font-medium text-blue-800 mb-1 flex items-center gap-1.5"><Globe className="w-4 h-4" /> Webhook callback URL</p>
          <p className="text-xs text-blue-700 mb-2">Register this URL in Meta Business Manager → WhatsApp → Configuration → Webhook:</p>
          <code className="block text-xs bg-white text-blue-900 border border-blue-200 rounded-lg px-3 py-2 font-mono break-all select-all">
            https://your-domain.com/webhooks/whatsapp/meta
          </code>
          <p className="text-xs text-blue-600 mt-2">Subscribe to <strong>messages</strong> and <strong>message_deliveries</strong> webhook fields.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={MessageSquare} title="Opt-in Settings" description="WhatsApp Business Policy requires explicit opt-in before messaging users." />
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Require opt-in before messaging</p>
              <p className="text-xs text-gray-400 mt-0.5">Only message leads who have explicitly opted in (recommended)</p>
            </div>
            <Toggle checked={f.opt_in_required !== false} onChange={(v) => setForm({ ...f, opt_in_required: v })} />
          </div>
        </div>
        <div className="mt-4">
          <Field label="Opt-in message text" hint="Message sent to ask for consent before starting WhatsApp nurturing">
            <textarea value={f.opt_in_message || ""}
              onChange={(e) => setForm({ ...f, opt_in_message: e.target.value })}
              rows={3}
              placeholder="Hi {{first_name}}, may we send you updates via WhatsApp? Reply YES to opt in."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving…" : "Save WhatsApp Settings"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Notifications
// ════════════════════════════════════════════════════════════════════════════
const NOTIF_EVENTS = [
  { key: "lead_assigned",       label: "Lead assigned to me",              desc: "When a lead is assigned to you directly" },
  { key: "temperature_changed", label: "Lead temperature changed",         desc: "When a lead moves from COLD → WARM → HOT (or reverses)" },
  { key: "lead_converted",      label: "Lead converted",                   desc: "When any lead in the workspace is marked as Converted" },
  { key: "sequence_completed",  label: "Sequence completed",               desc: "When a lead finishes all steps of a sequence" },
  { key: "sla_breach",          label: "WARM lead SLA breach",             desc: "When a WARM lead is not contacted within the SLA window" },
  { key: "call_failed",         label: "Lead marked FAILED",               desc: "When a lead hits the call threshold and is marked FAILED" },
  { key: "lead_added",          label: "New lead added to workspace",      desc: "When any new lead is created or imported" },
  { key: "callback_reminder",   label: "Callback reminder",                desc: "Before a scheduled callback is due" },
];

function NotificationsTab() {
  const queryClient = useQueryClient();

  const { data: extSettings } = useQuery({
    queryKey: ["extended-settings"],
    queryFn: () => api.get("/tenants/extended-settings").then((r) => r.data),
  });

  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    if (extSettings !== undefined && !prefs) {
      const defaults: any = { email_digest: "daily", in_app: true };
      NOTIF_EVENTS.forEach(({ key }) => { defaults[key] = true; });
      setPrefs({ ...defaults, ...(extSettings?.notification_prefs || {}) });
    }
  }, [extSettings]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/extended-settings", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extended-settings"] });
      toast.success("Notification preferences saved.");
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });

  if (!prefs) return <div className="text-gray-400 text-sm py-12 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Bell} title="Event Notifications" description="Choose which workspace events trigger a notification. These apply to all admins and managers." />
        <div className="space-y-2">
          {NOTIF_EVENTS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={!!prefs[key]} onChange={(v) => setPrefs({ ...prefs, [key]: v })} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Mail} title="Delivery Preferences" description="Configure how and when notifications are delivered." />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">In-app notifications</p>
              <p className="text-xs text-gray-400 mt-0.5">Show notification bell badge in the sidebar</p>
            </div>
            <Toggle checked={!!prefs.in_app} onChange={(v) => setPrefs({ ...prefs, in_app: v })} />
          </div>
          <Field label="Email digest frequency" hint="Receive a summary email of your notifications">
            <select value={prefs.email_digest || "daily"}
              onChange={(e) => setPrefs({ ...prefs, email_digest: e.target.value })}
              className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="off">Off — no email digest</option>
              <option value="immediate">Immediate — email per event</option>
              <option value="daily">Daily — morning summary</option>
              <option value="weekly">Weekly — Monday summary</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => mutation.mutate({ notification_prefs: prefs })} disabled={mutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {mutation.isPending ? "Saving…" : "Save Notification Preferences"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Lead Scoring
// ════════════════════════════════════════════════════════════════════════════
const DEFAULT_WEIGHTS: Record<string, number> = {
  email_open:          2,
  email_click:         5,
  email_reply:         15,
  call_answered:       10,
  call_not_answered:  -2,
  whatsapp_reply:      8,
  meeting_booked:      25,
  form_submitted:      20,
  link_clicked:        3,
  unsubscribed:       -30,
};

const WEIGHT_LABELS: Record<string, string> = {
  email_open:         "Email opened",
  email_click:        "Email link clicked",
  email_reply:        "Email replied",
  call_answered:      "Call answered",
  call_not_answered:  "Call not answered",
  whatsapp_reply:     "WhatsApp replied",
  meeting_booked:     "Meeting booked",
  form_submitted:     "Form submitted",
  link_clicked:       "Asset link clicked",
  unsubscribed:       "Unsubscribed",
};

function LeadScoringTab() {
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["scoring-profiles"],
    queryFn: () => api.get("/tenants/scoring-profiles").then((r) => r.data),
  });
  const { data: extSettings } = useQuery({
    queryKey: ["extended-settings"],
    queryFn: () => api.get("/tenants/extended-settings").then((r) => r.data),
  });

  const activeProfile = profiles?.find((p: any) => p.is_active) || profiles?.[0];

  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
  const [thresholds, setThresholds] = useState({ warm_min: 30, hot_min: 70 });
  const [decay, setDecay] = useState({ enabled: false, rate_per_day: 1 });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (activeProfile && extSettings !== undefined && !initialized) {
      const ew: any = activeProfile.event_weights || {};
      const tt: any = activeProfile.type_thresholds || {};
      setWeights({ ...DEFAULT_WEIGHTS, ...ew });
      setThresholds({
        warm_min: tt.warm_min ?? 30,
        hot_min:  tt.hot_min  ?? 70,
      });
      const scoringExt = extSettings?.scoring || {};
      setDecay({ enabled: !!scoringExt.decay_enabled, rate_per_day: scoringExt.decay_rate_per_day ?? 1 });
      setInitialized(true);
    }
  }, [activeProfile, extSettings, initialized]);

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/scoring-profiles", data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scoring-profiles"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });
  const extMutation = useMutation({
    mutationFn: (data: any) => api.put("/tenants/extended-settings", data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["extended-settings"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });

  const handleSave = async () => {
    if (thresholds.warm_min >= thresholds.hot_min) {
      toast.error("WARM min must be less than HOT min.");
      return;
    }
    await Promise.all([
      profileMutation.mutateAsync({ event_weights: weights, type_thresholds: thresholds }),
      extMutation.mutateAsync({ scoring: { decay_enabled: decay.enabled, decay_rate_per_day: decay.rate_per_day } }),
    ]);
    toast.success("Lead scoring settings saved.");
  };

  const isSaving = profileMutation.isPending || extMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Temperature thresholds */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={BarChart2} title="Temperature Thresholds" description="Define the score ranges that determine a lead's temperature. Scores are cumulative based on engagement events." />
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { color: "bg-blue-100 text-blue-700 border-blue-200",   label: "COLD",  desc: `Score 0 – ${thresholds.warm_min - 1}`,                                note: "auto" },
            { color: "bg-orange-100 text-orange-700 border-orange-200", label: "WARM", desc: `Score ${thresholds.warm_min} – ${thresholds.hot_min - 1}`,           note: "warm_min" },
            { color: "bg-red-100 text-red-700 border-red-200",      label: "HOT",   desc: `Score ${thresholds.hot_min}+`,                                          note: "hot_min" },
          ].map((t) => (
            <div key={t.label} className={`p-4 rounded-xl border ${t.color.split(" ")[2]}`}>
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${t.color.split(" ").slice(0,2).join(" ")}`}>{t.label}</span>
              <p className="text-xs text-gray-500">{t.desc}</p>
              {t.note !== "auto" && (
                <div className="mt-2">
                  <input type="number" min={1} max={999}
                    value={t.note === "warm_min" ? thresholds.warm_min : thresholds.hot_min}
                    onChange={(ev) => setThresholds((prev) => ({ ...prev, [t.note]: +ev.target.value }))}
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <span className="text-xs text-gray-400 ml-1">min score</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {thresholds.warm_min >= thresholds.hot_min && (
          <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> WARM min must be less than HOT min.</p>
        )}
      </div>

      {/* Event weights */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Key} title="Event Score Weights" description="Points added (or subtracted) when a lead performs each action. Positive = warmer, negative = penalise." />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {Object.keys(DEFAULT_WEIGHTS).map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-700 flex-1">{WEIGHT_LABELS[key] || key}</label>
              <div className="flex items-center gap-1.5">
                <input type="number" min={-100} max={100}
                  value={weights[key] ?? DEFAULT_WEIGHTS[key]}
                  onChange={(ev) => setWeights({ ...weights, [key]: +ev.target.value })}
                  className={`w-20 px-2 py-1.5 border rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                    (weights[key] ?? DEFAULT_WEIGHTS[key]) < 0 ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200"
                  }`} />
                <span className="text-xs text-gray-400 w-5">{(weights[key] ?? DEFAULT_WEIGHTS[key]) >= 0 ? "pts" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score decay */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Activity} title="Score Decay" description="Automatically reduce a lead's score over time if there is no recent engagement activity." />
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable score decay</p>
              <p className="text-xs text-gray-400 mt-0.5">Scores decrease automatically for inactive leads</p>
            </div>
            <Toggle checked={decay.enabled} onChange={(v) => setDecay({ ...decay, enabled: v })} />
          </div>
          {decay.enabled && (
            <Field label="Decay rate" hint="Points subtracted per day of inactivity (no email opens, clicks, or calls)">
              <div className="flex items-center gap-2">
                <input type="number" min={0.1} max={50} step={0.5} value={decay.rate_per_day}
                  onChange={(ev) => setDecay({ ...decay, rate_per_day: +ev.target.value })}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <span className="text-xs text-gray-400">points / day</span>
              </div>
            </Field>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving…" : "Save Lead Scoring Settings"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Tenant Management (super admin only)
// ════════════════════════════════════════════════════════════════════════════
function TenantManagementTab() {
  const queryClient = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get("/admin/analytics").then((r) => r.data),
  });
  const { data: health } = useQuery({
    queryKey: ["system-health"],
    queryFn: () => api.get("/admin/system/health").then((r) => r.data),
  });

  const tenants: any[] = analytics?.tenants || [];
  const overview = analytics?.overview;
  const dbOk = health?.database?.status === "connected";

  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [editTab, setEditTab] = useState<"company" | "contact" | "branding">("company");
  const [createForm, setCreateForm] = useState({
    name: "", subdomain: "", vertical_type: "general", plan_tier: "starter",
    admin_email: "", admin_password: "Welcome@123", admin_first_name: "", admin_last_name: "",
  });
  const [editForm, setEditForm] = useState({
    name: "", subdomain: "", vertical_type: "general", plan_tier: "starter", is_active: true,
    contact_email: "", contact_phone: "", website: "",
    address: "", city: "", state: "", country: "", postal_code: "",
    company_size: "", description: "", founded_year: "",
    primary_color: "#0891b2", logo_url: "", tagline: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/tenants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Tenant created!");
      setShowCreate(false);
      setCreateForm({ name: "", subdomain: "", vertical_type: "general", plan_tier: "starter", admin_email: "", admin_password: "Welcome@123", admin_first_name: "", admin_last_name: "" });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to create tenant"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/admin/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Tenant updated!");
      setEditingTenant(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to update"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/tenants/${id}/status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-analytics"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Tenant deleted.");
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to delete"),
  });

  const openEdit = (t: any) => {
    setEditingTenant(t);
    setEditTab("company");
    setEditForm({
      name: t.name || "", subdomain: t.subdomain || "",
      vertical_type: t.vertical_type || "general", plan_tier: t.plan_tier || "starter", is_active: t.is_active ?? true,
      contact_email: t.settings?.contact_email || "", contact_phone: t.settings?.contact_phone || "",
      website: t.settings?.website || "", address: t.settings?.address || "",
      city: t.settings?.city || "", state: t.settings?.state || "",
      country: t.settings?.country || "", postal_code: t.settings?.postal_code || "",
      company_size: t.settings?.company_size || "", description: t.settings?.description || "",
      founded_year: t.settings?.founded_year || "",
      primary_color: t.branding?.primary_color || "#0891b2",
      logo_url: t.branding?.logo_url || "", tagline: t.branding?.tagline || "",
    });
  };

  const handleUpdate = () => {
    if (!editingTenant) return;
    updateMutation.mutate({
      id: editingTenant.id,
      name: editForm.name, subdomain: editForm.subdomain,
      vertical_type: editForm.vertical_type, plan_tier: editForm.plan_tier, is_active: editForm.is_active,
      settings: {
        contact_email: editForm.contact_email, contact_phone: editForm.contact_phone,
        website: editForm.website, address: editForm.address, city: editForm.city,
        state: editForm.state, country: editForm.country, postal_code: editForm.postal_code,
        company_size: editForm.company_size, description: editForm.description, founded_year: editForm.founded_year,
      },
      branding: { primary_color: editForm.primary_color, logo_url: editForm.logo_url, tagline: editForm.tagline },
    });
  };

  // ── Plan Limits state ──────────────────────────────────────────────────────
  const PLAN_DEFAULTS = {
    starter:      { max_users: 5,   max_leads: 500,   max_sequences: 3,  email: true, whatsapp: false, bulk_import: false, analytics: false },
    professional: { max_users: 25,  max_leads: 5000,  max_sequences: 15, email: true, whatsapp: true,  bulk_import: true,  analytics: true  },
    enterprise:   { max_users: 999, max_leads: 99999, max_sequences: 99, email: true, whatsapp: true,  bulk_import: true,  analytics: true  },
  };
  const [planLimits, setPlanLimits] = useState(PLAN_DEFAULTS);

  // ── Platform Defaults state ─────────────────────────────────────────────────
  const SEND_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const [platformDefaults, setPlatformDefaults] = useState({
    cold_interval_days: 5,
    stale_reengagement_days: 14,
    call_failure_threshold: 6,
    send_window_start: "09:00",
    send_window_end: "18:00",
    allowed_send_days: ["Monday","Tuesday","Wednesday","Thursday","Friday"] as string[],
  });

  // ── Global Emergency Controls state ────────────────────────────────────────
  const [globalControls, setGlobalControls] = useState({
    platform_paused: false,
    maintenance_mode: false,
    announcement: "",
    announcement_active: false,
  });

  const setPlan = (plan: keyof typeof planLimits, key: string, val: any) =>
    setPlanLimits((p) => ({ ...p, [plan]: { ...p[plan], [key]: val } }));

  const toggleSendDay = (day: string) =>
    setPlatformDefaults((d) => ({
      ...d,
      allowed_send_days: d.allowed_send_days.includes(day)
        ? d.allowed_send_days.filter((x) => x !== day)
        : [...d.allowed_send_days, day],
    }));

  const planColors: Record<string, string> = {
    starter: "bg-gray-100 text-gray-700",
    professional: "bg-blue-100 text-blue-700",
    enterprise: "bg-purple-100 text-purple-700",
  };
  const verticalLabels: Record<string, string> = {
    education: "Education", real_estate: "Real Estate", construction: "Construction",
    saas: "SaaS", ecommerce: "E-commerce", manufacturing: "Manufacturing", general: "General",
  };

  return (
    <div className="space-y-6">
      {/* Platform stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader icon={Shield} title="Platform Overview" description="Live snapshot across all tenants on the platform." />
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Tenants",  value: overview?.total_tenants  ?? 0, sub: `${overview?.active_tenants ?? 0} active`, color: "bg-blue-50 text-blue-600",    icon: Building2 },
            { label: "Users",    value: overview?.total_users    ?? 0, sub: "across all tenants",                      color: "bg-indigo-50 text-indigo-600", icon: Users },
            { label: "Leads",    value: overview?.total_leads    ?? 0, sub: "platform-wide",                           color: "bg-emerald-50 text-emerald-600", icon: Database },
            { label: "Database", value: health?.database?.status || "—", sub: health?.database?.size || "",           color: dbOk ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600", icon: Activity },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-base font-bold text-gray-900 capitalize">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant list */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start gap-3 pb-4 border-b border-gray-100 mb-6">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Tenants</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create, configure and manage all organisations on the platform.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Tenant
          </button>
        </div>

        <div className="space-y-2">
          {tenants.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand-600">{t.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400">@{t.subdomain} · {verticalLabels[t.vertical_type] || t.vertical_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mx-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[t.plan_tier] || "bg-gray-100 text-gray-700"}`}>
                  {t.plan_tier}
                </span>
                <div className="text-center w-10">
                  <p className="text-sm font-semibold text-gray-900">{t.user_count ?? 0}</p>
                  <p className="text-xs text-gray-400">users</p>
                </div>
                <div className="text-center w-10">
                  <p className="text-sm font-semibold text-gray-900">{t.lead_count ?? 0}</p>
                  <p className="text-xs text-gray-400">leads</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {t.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4 text-brand-500" />
                </button>
                <button
                  onClick={() => toggleMutation.mutate(t.id)}
                  className={`p-1.5 rounded-lg transition-colors ${t.is_active ? "hover:bg-amber-50" : "hover:bg-green-50"}`}
                  title={t.is_active ? "Deactivate" : "Activate"}
                >
                  <Power className={`w-4 h-4 ${t.is_active ? "text-amber-500" : "text-green-500"}`} />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${t.name}"? This cannot be undone.`)) deleteMutation.mutate(t.id); }}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan Limits ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader
          icon={Layers}
          title="Plan Limits"
          description="Define feature caps and channel access for each plan tier. Applied to all tenants on that plan."
        />
        <div className="grid grid-cols-3 gap-4 mb-5">
          {(["starter", "professional", "enterprise"] as const).map((plan) => {
            const accent =
              plan === "enterprise" ? { border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-600", badge: "bg-purple-100 text-purple-700" }
              : plan === "professional" ? { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" }
              : { border: "border-gray-200", bg: "bg-gray-50", text: "text-gray-500", badge: "bg-gray-100 text-gray-600" };
            const lim = planLimits[plan];
            return (
              <div key={plan} className={`rounded-xl border ${accent.border} ${accent.bg} p-4`}>
                <span className={`text-xs font-bold uppercase tracking-widest ${accent.text} block mb-4`}>{plan}</span>
                <div className="space-y-3 mb-4">
                  {[
                    { key: "max_users",     label: "Max Users",     max: 9999 },
                    { key: "max_leads",     label: "Max Leads",     max: 999999 },
                    { key: "max_sequences", label: "Max Sequences", max: 999 },
                  ].map(({ key, label, max }) => (
                    <Field key={key} label={label}>
                      <input
                        type="number" min={1} max={max}
                        value={(lim as any)[key]}
                        onChange={(e) => setPlan(plan, key, +e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </Field>
                  ))}
                </div>
                <div className="pt-3 border-t border-gray-200 space-y-2.5">
                  {[
                    { key: "email",       label: "Email Outreach" },
                    { key: "whatsapp",    label: "WhatsApp" },
                    { key: "bulk_import", label: "Bulk Import" },
                    { key: "analytics",   label: "Analytics" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{label}</span>
                      <Toggle
                        checked={(lim as any)[key]}
                        onChange={(v) => setPlan(plan, key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => toast.success("Plan limits saved.")}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Save className="w-4 h-4" /> Save Plan Limits
          </button>
        </div>
      </div>

      {/* ── Platform Defaults ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader
          icon={SlidersHorizontal}
          title="Platform Defaults"
          description="Default nurturing settings applied to every new tenant at creation. Tenant admins can override these in their own settings."
        />
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Field label="Cold Interval (days)" hint="Days between automated outreach to COLD leads">
            <input
              type="number" min={1} max={30}
              value={platformDefaults.cold_interval_days}
              onChange={(e) => setPlatformDefaults({ ...platformDefaults, cold_interval_days: +e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Re-engagement (days)" hint="Re-engage STALE leads after N days">
            <input
              type="number" min={7} max={90}
              value={platformDefaults.stale_reengagement_days}
              onChange={(e) => setPlatformDefaults({ ...platformDefaults, stale_reengagement_days: +e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Call Failure Threshold" hint="Mark lead FAILED after N missed calls">
            <input
              type="number" min={1} max={20}
              value={platformDefaults.call_failure_threshold}
              onChange={(e) => setPlatformDefaults({ ...platformDefaults, call_failure_threshold: +e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Send Window Opens">
            <input
              type="time" value={platformDefaults.send_window_start}
              onChange={(e) => setPlatformDefaults({ ...platformDefaults, send_window_start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Send Window Closes">
            <input
              type="time" value={platformDefaults.send_window_end}
              onChange={(e) => setPlatformDefaults({ ...platformDefaults, send_window_end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
        </div>
        <Field label="Default Active Send Days" hint="Outreach runs only on these days">
          <div className="flex flex-wrap gap-2 mt-1">
            {SEND_DAYS.map((day) => {
              const active = platformDefaults.allowed_send_days.includes(day);
              return (
                <button key={day} type="button" onClick={() => toggleSendDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:border-brand-400"}`}>
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="flex justify-end mt-5">
          <button
            onClick={() => toast.success("Platform defaults saved.")}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Save className="w-4 h-4" /> Save Defaults
          </button>
        </div>
      </div>

      {/* ── Global Emergency Controls ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader
          icon={AlertOctagon}
          title="Global Emergency Controls"
          description="Platform-wide switches and broadcast tools. Use with care — these affect all tenants instantly."
        />

        {/* Warning banner when anything is active */}
        {(globalControls.platform_paused || globalControls.maintenance_mode) && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 mb-5">
            <AlertOctagon className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>
              {globalControls.platform_paused && <strong>Platform outreach is paused.</strong>}
              {globalControls.platform_paused && globalControls.maintenance_mode && " "}
              {globalControls.maintenance_mode && <strong>Maintenance mode is active.</strong>}
              {" "}All affected tenants see a notice on login.
            </span>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">Pause All Outreach (Platform-wide)</p>
              <p className="text-xs text-gray-500 mt-0.5">Stops all sequences, emails, and WhatsApp messages across every tenant. Manual calls still work.</p>
            </div>
            <Toggle
              checked={globalControls.platform_paused}
              onChange={(v) => setGlobalControls({ ...globalControls, platform_paused: v })}
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">Shows a maintenance banner to all users. New logins are blocked; active sessions are preserved.</p>
            </div>
            <Toggle
              checked={globalControls.maintenance_mode}
              onChange={(v) => setGlobalControls({ ...globalControls, maintenance_mode: v })}
            />
          </div>
        </div>

        {/* Broadcast announcement */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-brand-500" />
            <p className="text-sm font-medium text-gray-900">Broadcast Announcement</p>
            <div className="ml-auto">
              <Toggle
                checked={globalControls.announcement_active}
                onChange={(v) => setGlobalControls({ ...globalControls, announcement_active: v })}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">When active, this message is shown as a banner to all tenant admins when they log in.</p>
          <textarea
            value={globalControls.announcement}
            onChange={(e) => setGlobalControls({ ...globalControls, announcement: e.target.value })}
            rows={3}
            placeholder="e.g. Scheduled maintenance on Sunday 2am–4am UTC. WhatsApp sending will be unavailable during this window."
            disabled={!globalControls.announcement_active}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {globalControls.announcement_active && globalControls.announcement && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Megaphone className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">{globalControls.announcement}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={() => toast.success("Global controls updated.")}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Save className="w-4 h-4" /> Apply Controls
          </button>
        </div>
      </div>

      {/* Create Tenant Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Tenant" size="xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Set up a new organisation on the platform.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tenant Name">
              <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Acme Corp" />
            </Field>
            <Field label="Subdomain" hint="Lowercase letters, numbers, hyphens only.">
              <input value={createForm.subdomain} onChange={(e) => setCreateForm({ ...createForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="acme" />
            </Field>
            <Field label="Industry / Vertical">
              <select value={createForm.vertical_type} onChange={(e) => setCreateForm({ ...createForm, vertical_type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="general">General</option><option value="education">Education</option>
                <option value="real_estate">Real Estate</option><option value="construction">Construction</option>
                <option value="saas">SaaS</option><option value="ecommerce">E-commerce</option>
                <option value="manufacturing">Manufacturing</option>
              </select>
            </Field>
            <Field label="Plan Tier">
              <select value={createForm.plan_tier} onChange={(e) => setCreateForm({ ...createForm, plan_tier: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option>
              </select>
            </Field>
          </div>
          <hr className="border-gray-100" />
          <p className="text-sm font-medium text-gray-700">Admin User</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <input value={createForm.admin_first_name} onChange={(e) => setCreateForm({ ...createForm, admin_first_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
            <Field label="Last Name">
              <input value={createForm.admin_last_name} onChange={(e) => setCreateForm({ ...createForm, admin_last_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
            <Field label="Admin Email">
              <input type="email" value={createForm.admin_email} onChange={(e) => setCreateForm({ ...createForm, admin_email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
            <Field label="Password">
              <input type="password" value={createForm.admin_password} onChange={(e) => setCreateForm({ ...createForm, admin_password: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              <Plus className="w-4 h-4" />{createMutation.isPending ? "Creating…" : "Create Tenant"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal isOpen={!!editingTenant} onClose={() => setEditingTenant(null)} title={`Edit — ${editingTenant?.name || ""}`} size="xl">
        <div className="space-y-5">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["company", "contact", "branding"] as const).map((t) => (
              <button key={t} onClick={() => setEditTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${editTab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>

          {editTab === "company" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company Name">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
                <Field label="Subdomain">
                  <input value={editForm.subdomain} onChange={(e) => setEditForm({ ...editForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
                <Field label="Industry">
                  <select value={editForm.vertical_type} onChange={(e) => setEditForm({ ...editForm, vertical_type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="general">General</option><option value="education">Education</option>
                    <option value="real_estate">Real Estate</option><option value="construction">Construction</option>
                    <option value="saas">SaaS</option><option value="ecommerce">E-commerce</option><option value="manufacturing">Manufacturing</option>
                  </select>
                </Field>
                <Field label="Plan Tier">
                  <select value={editForm.plan_tier} onChange={(e) => setEditForm({ ...editForm, plan_tier: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option>
                  </select>
                </Field>
                <Field label="Company Size">
                  <select value={editForm.company_size} onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select…</option><option value="1-10">1–10</option><option value="11-50">11–50</option>
                    <option value="51-200">51–200</option><option value="201-500">201–500</option><option value="500+">500+</option>
                  </select>
                </Field>
                <Field label="Founded Year">
                  <input value={editForm.founded_year} onChange={(e) => setEditForm({ ...editForm, founded_year: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="2020" maxLength={4} />
                </Field>
              </div>
              <Field label="Description">
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </Field>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Active</p>
                  <p className="text-xs text-gray-400">Inactive tenants cannot log in</p>
                </div>
                <Toggle checked={editForm.is_active} onChange={(v) => setEditForm({ ...editForm, is_active: v })} />
              </div>
            </div>
          )}

          {editTab === "contact" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Email">
                  <input type="email" value={editForm.contact_email} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="hello@company.com" />
                </Field>
                <Field label="Contact Phone">
                  <input value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+91 XXXXXXXXXX" />
                </Field>
                <Field label="Website" hint="">
                  <input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://company.com" />
                </Field>
                <Field label="City">
                  <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
                <Field label="State">
                  <input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
                <Field label="Country">
                  <input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
              </div>
            </div>
          )}

          {editTab === "branding" && (
            <div className="space-y-4">
              <Field label="Tagline">
                <input value={editForm.tagline} onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Empowering your growth" />
              </Field>
              <Field label="Logo URL">
                <input value={editForm.logo_url} onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://cdn.company.com/logo.png" />
              </Field>
              <Field label="Primary Brand Color">
                <div className="flex items-center gap-3">
                  <input type="color" value={editForm.primary_color} onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <input value={editForm.primary_color} onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" maxLength={7} />
                  <div className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0" style={{ backgroundColor: editForm.primary_color }} />
                </div>
              </Field>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-mono">{editingTenant?.id}</p>
            <div className="flex gap-3">
              <button onClick={() => setEditingTenant(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                <Save className="w-4 h-4" />{updateMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Super Admin view — settings-style layout (kept as reference, no longer rendered)
// ════════════════════════════════════════════════════════════════════════════
function SuperAdminView({ analytics, health }: { analytics: any; health: any }) {
  const overview = analytics?.overview;
  const tenants: any[] = analytics?.tenants || [];
  const dbOk = health?.database?.status === "connected";

  return (
    <div className="space-y-6">
      {/* Platform overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader
          icon={Shield}
          title="Platform Overview"
          description="Real-time snapshot of tenants, users, leads, and system health across the entire platform."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tenants",  value: overview?.total_tenants ?? 0,  sub: `${overview?.active_tenants ?? 0} active`,  icon: Building2, color: "bg-blue-50 text-blue-600" },
            { label: "Total Users",    value: overview?.total_users   ?? 0,  sub: "across all tenants",                        icon: Users,     color: "bg-indigo-50 text-indigo-600" },
            { label: "Total Leads",    value: overview?.total_leads   ?? 0,  sub: "platform-wide",                             icon: Database,  color: "bg-emerald-50 text-emerald-600" },
            { label: "Outreach Sent",  value: overview?.total_outreach ?? 0, sub: `${overview?.total_events ?? 0} events`,    icon: Activity,  color: "bg-amber-50 text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System health */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <SectionHeader
          icon={Activity}
          title="System Health"
          description="Live database connectivity and storage metrics."
        />
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Database</p>
            <p className={`text-sm font-semibold capitalize flex items-center gap-1.5 ${dbOk ? "text-green-600" : "text-red-600"}`}>
              <span className={`w-2 h-2 rounded-full ${dbOk ? "bg-green-500" : "bg-red-500"}`} />
              {health?.database?.status || "—"}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">DB Size</p>
            <p className="text-sm font-semibold text-gray-900">{health?.database?.size || "—"}</p>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Last Checked</p>
            <p className="text-sm font-semibold text-gray-900">{health?.timestamp ? formatDate(health.timestamp) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Tenant snapshot */}
      {tenants.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <SectionHeader
            icon={Building2}
            title="Tenant Snapshot"
            description="Quick view of all organisations. Go to the Super Admin panel for full management."
          />
          <div className="space-y-2">
            {tenants.slice(0, 8).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{t.vertical_type} · {t.plan_tier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{t.user_count ?? 0}</p>
                    <p className="text-xs text-gray-400">Users</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{t.lead_count ?? 0}</p>
                    <p className="text-xs text-gray-400">Leads</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.is_active ? "Active" : "Suspended"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {tenants.length > 8 && (
            <p className="text-xs text-gray-400 mt-3 text-center">+{tenants.length - 8} more tenants — view all in Super Admin panel</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Open Super Admin Panel
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
