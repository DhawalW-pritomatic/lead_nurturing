import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Save, Shield, Building2, Users, Database, Activity, ExternalLink,
  User, Lock, Bell, Phone, MessageSquare, Clock, Zap,
  ToggleLeft, ChevronRight, CheckCircle, AlertTriangle,
} from "lucide-react";
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

type Tab = "profile" | "workspace" | "nurturing" | "scheduler";

const NAV: { key: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
  { key: "profile",   label: "My Profile",          icon: User },
  { key: "workspace", label: "Workspace",            icon: Building2, adminOnly: true },
  { key: "nurturing", label: "Nurturing Settings",   icon: Zap,       adminOnly: true },
  { key: "scheduler", label: "Scheduler & Calls",    icon: Phone,     adminOnly: true },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "tenant_admin" || isSuperAdmin;
  const [tab, setTab] = useState<Tab>("profile");

  // ── Super admin keeps its own view ──────────────────────────────────────────
  const { data: platformAnalytics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get("/admin/analytics").then((r) => r.data),
    enabled: isSuperAdmin,
  });
  const { data: systemHealth } = useQuery({
    queryKey: ["system-health"],
    queryFn: () => api.get("/admin/system/health").then((r) => r.data),
    enabled: isSuperAdmin,
  });

  if (isSuperAdmin) return <SuperAdminView analytics={platformAnalytics} health={systemHealth} />;

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      {/* ── Left nav sidebar ── */}
      <aside className="w-52 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</p>
          </div>
          <nav className="p-2">
            {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => (
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
        {tab === "profile"   && <ProfileTab user={user} />}
        {tab === "workspace" && <WorkspaceTab />}
        {tab === "nurturing" && <NurturingTab />}
        {tab === "scheduler" && <SchedulerTab />}
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
        <SectionHeader icon={Zap} title="Outreach Intervals" description="Control how often COLD and STALE leads are contacted. WARM and HOT leads have no automated cap — reps work them directly." />

        <div className="grid grid-cols-3 gap-4 mb-2">
          <Field label="Cold Interval (days)" hint="Days between automated outreach to COLD leads">
            <input type="number" min={1} max={30} value={f.cold_outreach_interval_days || 5}
              onChange={(e) => setForm({ ...f, cold_outreach_interval_days: +e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </Field>
          <Field label="Stale Re-engagement (days)" hint="Re-engage STALE leads after N days of inactivity">
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
// Super Admin view (unchanged, just wrapped)
// ════════════════════════════════════════════════════════════════════════════
function SuperAdminView({ analytics, health }: { analytics: any; health: any }) {
  const overview = analytics?.overview;
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <span className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded">SUPER ADMIN</span>
        </div>
        <p className="text-gray-500 mt-1">Manage tenants, monitor system health, and configure platform-wide defaults.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tenants", value: overview?.totalTenants ?? 0, sub: `${overview?.activeTenants ?? 0} active`, icon: Building2, color: "text-blue-500" },
          { label: "Users",   value: overview?.totalUsers  ?? 0, sub: "",                                          icon: Users,    color: "text-indigo-500" },
          { label: "Leads",   value: overview?.totalLeads  ?? 0, sub: "",                                          icon: Database, color: "text-emerald-500" },
          { label: "System",  value: health?.database?.status || "—", sub: health?.database?.size || "", icon: Activity, color: health?.database?.status === "connected" ? "text-green-500" : "text-amber-500" },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">{s.value}</p>
                {s.sub && <p className="text-xs text-green-600 mt-1">{s.sub}</p>}
              </div>
              <s.icon className={`w-8 h-8 opacity-50 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Management</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: "/admin", icon: Building2, label: "Tenant Management", desc: "Create, edit, suspend tenants", color: "bg-purple-100 text-purple-700" },
            { to: "/admin", icon: Users,    label: "User Directory",     desc: "All users across tenants",    color: "bg-indigo-100 text-indigo-700" },
          ].map((l) => (
            <Link key={l.label} to={l.to} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${l.color}`}><l.icon className="w-5 h-5" /></div>
                <div><p className="font-medium text-gray-900">{l.label}</p><p className="text-xs text-gray-500">{l.desc}</p></div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>

      {health && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500 text-xs">Database</p><p className={`font-medium capitalize ${health.database?.status === "connected" ? "text-green-600" : "text-red-600"}`}>{health.database?.status}</p></div>
            <div><p className="text-gray-500 text-xs">DB Size</p><p className="font-medium text-gray-900">{health.database?.size || "—"}</p></div>
            <div><p className="text-gray-500 text-xs">Server Time</p><p className="font-medium text-gray-900">{health.timestamp ? formatDate(health.timestamp) : "—"}</p></div>
          </div>
        </div>
      )}

      {analytics?.tenants?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Tenant Snapshot</h3>
            <Link to="/admin" className="text-sm text-purple-600 hover:underline flex items-center gap-1">Manage all <ExternalLink className="w-3 h-3" /></Link>
          </div>
          <table className="min-w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left py-2">Name</th><th className="text-left py-2">Plan</th>
                <th className="text-right py-2">Users</th><th className="text-right py-2">Leads</th><th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.tenants.slice(0, 8).map((t: any) => (
                <tr key={t.id}>
                  <td className="py-2 font-medium text-gray-900">{t.name}</td>
                  <td className="py-2 capitalize text-gray-700">{t.plan_tier || "—"}</td>
                  <td className="py-2 text-right text-gray-700">{t.user_count ?? 0}</td>
                  <td className="py-2 text-right text-gray-700">{t.lead_count ?? 0}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 text-xs rounded ${t.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t.is_active ? "active" : "suspended"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
