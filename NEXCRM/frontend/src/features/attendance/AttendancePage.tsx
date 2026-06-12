import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sun,
  Clock,
  Plane,
  X,
  Calendar,
  Users,
  AlertCircle,
  Pencil,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailStatus = "available" | "half_day_am" | "half_day_pm" | "on_leave";

interface AvailOption {
  value: AvailStatus;
  label: string;
  icon: any;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
  dotClass: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVAIL_OPTIONS: AvailOption[] = [
  { value: "available",   label: "Available",   icon: CheckCircle2,
    activeClass: "bg-green-600 text-white border-green-600",
    inactiveClass: "bg-white text-green-700 border-green-300 hover:bg-green-50",
    badgeClass: "bg-green-100 text-green-700", dotClass: "bg-green-500" },
  { value: "half_day_am", label: "Half Day AM", icon: Sun,
    activeClass: "bg-amber-500 text-white border-amber-500",
    inactiveClass: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
    badgeClass: "bg-amber-100 text-amber-700", dotClass: "bg-amber-400" },
  { value: "half_day_pm", label: "Half Day PM", icon: Clock,
    activeClass: "bg-amber-500 text-white border-amber-500",
    inactiveClass: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
    badgeClass: "bg-amber-100 text-amber-700", dotClass: "bg-amber-400" },
  { value: "on_leave",    label: "On Leave",    icon: Plane,
    activeClass: "bg-red-600 text-white border-red-600",
    inactiveClass: "bg-white text-red-700 border-red-300 hover:bg-red-50",
    badgeClass: "bg-red-100 text-red-700", dotClass: "bg-red-500" },
];

const ROLE_LABEL: Record<string, string> = {
  sales_rep:         "Sales Rep",
  senior_sales_rep:  "Senior Rep",
  sales_manager:     "Manager",
  tenant_admin:      "Admin",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split("T")[0];

const shiftDate = (dateStr: string, days: number) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const fmtDate = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

const fmtTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const fmtHistoryDate = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full border border-gray-300 inline-block" />
        Not checked in
      </span>
    );
  }
  const opt = AVAIL_OPTIONS.find((o) => o.value === status);
  if (!opt) return <span className="text-xs text-gray-500">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${opt.badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${opt.dotClass}`} />
      {opt.label}
    </span>
  );
}

function SummaryCard({
  label, count, colorClass, icon: Icon,
}: { label: string; count: number; colorClass: string; icon: any }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorClass}`}>
      <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{count}</p>
        <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.role === "super_admin";
  const isManager    = ["tenant_admin", "sales_manager"].includes(user?.role ?? "");
  const canEdit      = isSuperAdmin || isManager;

  // ── State ──
  const [tab, setTab]                     = useState<"overview" | "history">("overview");
  const [selectedDate, setSelectedDate]   = useState(todayStr());
  const [tenantFilter, setTenantFilter]   = useState("");
  const [historyFrom, setHistoryFrom]     = useState(shiftDate(todayStr(), -30));
  const [historyTo, setHistoryTo]         = useState(todayStr());
  const [historyUserFilter, setHistoryUserFilter] = useState("");
  const [historyTenantFilter, setHistoryTenantFilter] = useState("");

  // Edit modal state
  const [editTarget, setEditTarget] = useState<{ userId: string; name: string; currentRecord: any } | null>(null);
  const [editStatus, setEditStatus] = useState<AvailStatus>("available");
  const [editNote,   setEditNote]   = useState("");

  // ── Queries ──
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ["attendance-daily", selectedDate, tenantFilter],
    queryFn: () =>
      api.get("/attendance", {
        params: { date: selectedDate, ...(tenantFilter ? { tenant_id: tenantFilter } : {}) },
      }).then((r) => r.data),
    staleTime: 0,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["attendance-history", historyFrom, historyTo, historyUserFilter, historyTenantFilter],
    queryFn: () =>
      api.get("/attendance/history", {
        params: {
          from: historyFrom,
          to:   historyTo,
          ...(historyUserFilter   ? { user_id:   historyUserFilter   } : {}),
          ...(historyTenantFilter ? { tenant_id: historyTenantFilter } : {}),
        },
      }).then((r) => r.data),
    enabled: tab === "history",
    staleTime: 0,
  });

  // ── Edit mutation ──
  const editMutation = useMutation({
    mutationFn: () =>
      api.put(`/attendance/${editTarget!.userId}/${selectedDate}`, {
        status: editStatus,
        notes:  editNote || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-daily"] });
      setEditTarget(null);
      toast.success("Attendance updated!");
    },
    onError: () => toast.error("Could not update attendance."),
  });

  // ── Derived ──
  const summary  = dailyData?.summary  || {};
  const records: any[] = dailyData?.records || [];
  const history: any[] = historyData || [];

  // Unique tenants from daily records (super admin filter)
  const uniqueTenants = isSuperAdmin
    ? Array.from(
        new Map(
          records
            .filter((r: any) => r.user.tenant)
            .map((r: any) => [r.user.tenant.id, r.user.tenant])
        ).values()
      )
    : [];

  // Client-side history search by rep name
  const filteredHistory = historyUserFilter
    ? history.filter((r: any) =>
        `${r.user?.first_name} ${r.user?.last_name}`.toLowerCase().includes(historyUserFilter.toLowerCase())
      )
    : history;

  const openEdit = (userId: string, name: string, record: any) => {
    setEditTarget({ userId, name, currentRecord: record });
    setEditStatus((record?.status as AvailStatus) || "available");
    setEditNote(record?.notes || "");
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isSuperAdmin ? "All tenants · Track check-ins across the platform"
              : isManager  ? "Your team's daily check-in status"
              : "Your attendance history"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["overview", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Date nav + optional tenant filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                className="p-2 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-800 min-w-40 text-center">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {fmtDate(selectedDate)}
              </div>
              <button
                onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                disabled={selectedDate >= todayStr()}
                className="p-2 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {selectedDate !== todayStr() && (
              <button
                onClick={() => setSelectedDate(todayStr())}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
              >
                Back to Today
              </button>
            )}

            {/* Tenant filter — super admin only */}
            {isSuperAdmin && uniqueTenants.length > 0 && (
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="input-field text-sm py-1.5 w-52"
              >
                <option value="">All Tenants</option>
                {uniqueTenants.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Summary Cards */}
          {(isManager || isSuperAdmin) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryCard label="Available"     count={summary.available       ?? 0} colorClass="border-green-200 bg-green-50 text-green-700"   icon={CheckCircle2} />
              <SummaryCard label="Half Day AM"   count={summary.half_day_am    ?? 0} colorClass="border-amber-200 bg-amber-50 text-amber-700"   icon={Sun}          />
              <SummaryCard label="Half Day PM"   count={summary.half_day_pm    ?? 0} colorClass="border-amber-200 bg-amber-50 text-amber-700"   icon={Clock}        />
              <SummaryCard label="On Leave"      count={summary.on_leave       ?? 0} colorClass="border-red-200 bg-red-50 text-red-700"         icon={Plane}        />
              <SummaryCard label="Not Checked In" count={summary.not_checked_in ?? 0} colorClass="border-gray-200 bg-gray-50 text-gray-600"     icon={AlertCircle}  />
            </div>
          )}

          {/* Overview Table */}
          <div className="card overflow-hidden p-0">
            {dailyLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                No records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {isSuperAdmin && (
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                      )}
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Note</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Checked In</th>
                      {canEdit && (
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((row: any) => (
                      <tr key={row.user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        {isSuperAdmin && (
                          <td className="py-3 px-4 text-xs text-gray-500 font-medium">
                            {row.user.tenant?.name ?? "—"}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              row.record?.status === "available" ? "bg-green-100 text-green-700"
                              : row.record?.status === "on_leave" ? "bg-red-100 text-red-700"
                              : row.record ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                            }`}>
                              {row.user.first_name?.[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {row.user.first_name} {row.user.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {ROLE_LABEL[row.user.role] ?? row.user.role}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={row.record?.status} />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 max-w-40 truncate">
                          {row.record?.notes || "—"}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                          {fmtTime(row.record?.checked_in_at)}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openEdit(
                                row.user.id,
                                `${row.user.first_name} ${row.user.last_name}`,
                                row.record
                              )}
                              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium px-2.5 py-1 rounded-lg hover:bg-brand-50 transition-colors border border-brand-200"
                            >
                              <Pencil className="w-3 h-3" />
                              {row.record ? "Edit" : "Mark"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ HISTORY TAB ═══════════════════════════════════════ */}
      {tab === "history" && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                value={historyFrom}
                max={historyTo}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="input-field text-sm py-1.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                value={historyTo}
                max={todayStr()}
                min={historyFrom}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="input-field text-sm py-1.5"
              />
            </div>

            {/* Rep name search (admin/manager/super admin) */}
            {(isManager || isSuperAdmin) && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Search Rep</label>
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={historyUserFilter}
                  onChange={(e) => setHistoryUserFilter(e.target.value)}
                  className="input-field text-sm py-1.5 w-44"
                />
              </div>
            )}

            {/* Tenant filter (super admin) */}
            {isSuperAdmin && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tenant</label>
                <input
                  type="text"
                  placeholder="Tenant filter..."
                  value={historyTenantFilter}
                  onChange={(e) => setHistoryTenantFilter(e.target.value)}
                  className="input-field text-sm py-1.5 w-44"
                />
              </div>
            )}

            <button
              onClick={() => {
                setHistoryFrom(shiftDate(todayStr(), -30));
                setHistoryTo(todayStr());
                setHistoryUserFilter("");
                setHistoryTenantFilter("");
              }}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* History Table */}
          <div className="card overflow-hidden p-0">
            {historyLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                No attendance records found for this range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      {(isManager || isSuperAdmin) && (
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Rep</th>
                      )}
                      {isSuperAdmin && (
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                      )}
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((rec: any) => (
                      <tr key={rec.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700 font-medium whitespace-nowrap">
                          {fmtHistoryDate(rec.date)}
                        </td>
                        {(isManager || isSuperAdmin) && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                                {rec.user?.first_name?.[0]}
                              </div>
                              <span className="text-sm text-gray-900">
                                {rec.user?.first_name} {rec.user?.last_name}
                              </span>
                            </div>
                          </td>
                        )}
                        {isSuperAdmin && (
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {rec.user?.tenant?.name ?? "—"}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <StatusBadge status={rec.status} />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {rec.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                  {filteredHistory.length} record{filteredHistory.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ EDIT MODAL ════════════════════════════════════════ */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">{editTarget.currentRecord ? "Edit Attendance" : "Mark Attendance"}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {editTarget.name} · {fmtDate(selectedDate)}
                </p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Status buttons */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAIL_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setEditStatus(opt.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          editStatus === opt.value ? opt.activeClass : opt.inactiveClass
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. WFH, doctor visit, training…"
                  className="input-field text-sm w-full"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 px-5 pb-5">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending}
                className="flex-1 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {editMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
