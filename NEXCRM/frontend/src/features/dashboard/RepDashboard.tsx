import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";
import { getRelativeTime } from "../../utils/dateUtils";
import {
  CheckCircle2,
  Sun,
  Clock,
  Plane,
  Flame,
  Users,
  TrendingUp,
  Mail,
  Target,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

type AvailStatus = "available" | "half_day_am" | "half_day_pm" | "on_leave";

const AVAIL_OPTIONS: {
  value: AvailStatus;
  label: string;
  icon: any;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
  dotClass: string;
  cardClass: string;
}[] = [
  {
    value: "available",
    label: "Available",
    icon: CheckCircle2,
    activeClass: "bg-green-600 text-white border-green-600 shadow-sm",
    inactiveClass: "bg-white text-green-700 border-green-300 hover:bg-green-50",
    badgeClass: "bg-green-100 text-green-700",
    dotClass: "bg-green-500",
    cardClass: "border-green-200 bg-green-50/30",
  },
  {
    value: "half_day_am",
    label: "Half Day AM",
    icon: Sun,
    activeClass: "bg-amber-500 text-white border-amber-500 shadow-sm",
    inactiveClass: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
    badgeClass: "bg-amber-100 text-amber-700",
    dotClass: "bg-amber-500",
    cardClass: "border-amber-200 bg-amber-50/30",
  },
  {
    value: "half_day_pm",
    label: "Half Day PM",
    icon: Clock,
    activeClass: "bg-amber-500 text-white border-amber-500 shadow-sm",
    inactiveClass: "bg-white text-amber-700 border-amber-300 hover:bg-amber-50",
    badgeClass: "bg-amber-100 text-amber-700",
    dotClass: "bg-amber-500",
    cardClass: "border-amber-200 bg-amber-50/30",
  },
  {
    value: "on_leave",
    label: "On Leave",
    icon: Plane,
    activeClass: "bg-red-600 text-white border-red-600 shadow-sm",
    inactiveClass: "bg-white text-red-700 border-red-300 hover:bg-red-50",
    badgeClass: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
    cardClass: "border-red-200 bg-red-50/30",
  },
];

const STATUS_ORDER = [
  "NEW", "ACTIVE", "ENGAGED", "MEETING_SCHEDULED",
  "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "STALE",
];

const STATUS_BAR_COLOR: Record<string, string> = {
  NEW: "bg-blue-400",
  ACTIVE: "bg-indigo-400",
  ENGAGED: "bg-purple-400",
  MEETING_SCHEDULED: "bg-cyan-400",
  PROPOSAL_SENT: "bg-teal-400",
  NEGOTIATION: "bg-amber-400",
  CONVERTED: "bg-green-500",
  LOST: "bg-red-400",
  STALE: "bg-gray-300",
};

const STATUS_CHIP: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  ACTIVE: "bg-indigo-50 text-indigo-700",
  ENGAGED: "bg-purple-50 text-purple-700",
  MEETING_SCHEDULED: "bg-cyan-50 text-cyan-700",
  PROPOSAL_SENT: "bg-teal-50 text-teal-700",
  NEGOTIATION: "bg-amber-50 text-amber-700",
  CONVERTED: "bg-green-50 text-green-700",
  LOST: "bg-red-50 text-red-700",
  STALE: "bg-gray-50 text-gray-500",
};

const EVENT_LABELS: Record<string, string> = {
  email_opened: "Opened your email",
  email_cta_clicked: "Clicked email CTA",
  website_visit: "Visited website",
  website_visit_high_intent: "High-intent website visit",
  asset_downloaded: "Downloaded an asset",
  whatsapp_replied: "Replied on WhatsApp",
  whatsapp_link_clicked: "Clicked WhatsApp link",
  call_booked: "Booked a call",
  form_resubmitted: "Resubmitted form",
  no_activity_7_days: "No activity (7d decay)",
  no_activity_30_days: "No activity (30d decay)",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RepDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Availability state ──
  const [selectedStatus, setSelectedStatus] = useState<AvailStatus>("available");
  const [note, setNote] = useState("");

  const { data: repData, isLoading } = useQuery({
    queryKey: ["rep-dashboard"],
    queryFn: () => api.get("/dashboard/rep").then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: todayAvail, isLoading: availLoading } = useQuery({
    queryKey: ["rep-availability-today"],
    queryFn: () => api.get("/dashboard/availability/today").then((r) => r.data),
    staleTime: 0,
  });

  useEffect(() => {
    if (todayAvail?.status) {
      setSelectedStatus(todayAvail.status as AvailStatus);
      setNote(todayAvail.notes || "");
    }
  }, [todayAvail]);

  const isCheckedIn = !!todayAvail?.id;
  const isDirty =
    selectedStatus !== (todayAvail?.status || "available") ||
    note !== (todayAvail?.notes || "");

  const saveAvail = useMutation({
    mutationFn: () =>
      api.put("/dashboard/availability/today", {
        status: selectedStatus,
        notes: note || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rep-availability-today"] });
      toast.success(isCheckedIn ? "Attendance updated!" : "Checked in!");
    },
    onError: () => toast.error("Could not save attendance."),
  });

  // ── Derived data ──
  const stats = repData?.stats || {};
  const hotLeads: any[] = repData?.hot_leads || [];
  const recentActivity: any[] = repData?.recent_activity || [];

  const pipelineMap: Record<string, number> = {};
  (repData?.pipeline || []).forEach((p: any) => {
    pipelineMap[p.status] = parseInt(p.count, 10);
  });
  const activePipeline = STATUS_ORDER.filter((s) => (pipelineMap[s] ?? 0) > 0);
  const maxPipeline = Math.max(1, ...activePipeline.map((s) => pipelineMap[s]));

  const currentOption =
    AVAIL_OPTIONS.find((o) => o.value === selectedStatus) ?? AVAIL_OPTIONS[0];

  const convRate =
    stats.total > 0
      ? ((stats.converted / stats.total) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {user?.first_name}!
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{todayLabel}</p>
        </div>
        <span className="hidden sm:block text-xs font-medium text-gray-400 uppercase tracking-wide mt-1">
          {user?.role?.replace(/_/g, " ")}
        </span>
      </div>

      {/* ── Attendance / Check-in Card ────────────────────────────────────── */}
      <div
        className={`rounded-xl border-2 p-5 transition-all duration-300 ${
          availLoading
            ? "border-gray-200 bg-gray-50"
            : !isCheckedIn
            ? "border-amber-300 bg-amber-50/60"
            : currentOption.cardClass
        }`}
      >
        {/* Card header row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="text-sm font-semibold text-gray-800">
            Today's Attendance
          </span>

          {availLoading ? (
            <div className="h-5 w-32 bg-gray-200 rounded-full animate-pulse" />
          ) : isCheckedIn && !isDirty ? (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${currentOption.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentOption.dotClass}`} />
              {currentOption.label} — Checked in
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <AlertCircle className="w-3 h-3" />
              {isCheckedIn ? "Unsaved changes" : "Not checked in yet"}
            </span>
          )}
        </div>

        {/* Status toggle buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {AVAIL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = selectedStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  isActive ? opt.activeClass : opt.inactiveClass
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Note + Save row */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (e.g. WFH, doctor appointment)…"
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder:text-gray-400"
          />
          {(!isCheckedIn || isDirty) && (
            <button
              onClick={() => saveAvail.mutate()}
              disabled={saveAvail.isPending}
              className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isCheckedIn ? "Update" : "Check In"}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="My Leads"
          value={isLoading ? "—" : stats.total ?? 0}
          sub={`${stats.warm ?? 0} warm · ${stats.cold ?? 0} cold`}
          icon={Users}
          iconClass="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Hot Leads"
          value={isLoading ? "—" : stats.hot ?? 0}
          sub="Need attention now"
          icon={Flame}
          iconClass="bg-red-50 text-red-500"
          valueClass="text-red-600"
        />
        <StatCard
          label="Conversions"
          value={isLoading ? "—" : stats.converted ?? 0}
          sub={`${convRate}% conversion rate`}
          icon={TrendingUp}
          iconClass="bg-green-50 text-green-600"
          valueClass="text-green-600"
        />
        <StatCard
          label="Today's Outreach"
          value={isLoading ? "—" : stats.todays_outreach ?? 0}
          sub="Emails sent today"
          icon={Mail}
          iconClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ── Middle Row: Hot Leads + Pipeline ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Hot Leads list */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              My Hot Leads
            </h3>
            <button
              onClick={() => navigate("/leads")}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : hotLeads.length === 0 ? (
            <div className="text-center py-10">
              <Flame className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No hot leads right now.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {hotLeads.map((lead: any, i: number) => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer group border border-transparent hover:border-gray-200 transition-all"
                >
                  {/* Rank */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : i === 1
                        ? "bg-gray-100 text-gray-600"
                        : i === 2
                        ? "bg-orange-50 text-orange-600"
                        : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-sm font-bold shrink-0">
                    {lead.first_name?.[0]}
                  </div>

                  {/* Name + company */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {lead.first_name} {lead.last_name}
                    </p>
                    {lead.company && (
                      <p className="text-xs text-gray-400 truncate">{lead.company}</p>
                    )}
                  </div>

                  {/* Status chip + score */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded hidden sm:inline ${
                        STATUS_CHIP[lead.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {lead.status?.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-xs font-bold w-8 text-right ${
                        lead.score >= 80 ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {lead.score}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline by status */}
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-500" />
            My Pipeline
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : activePipeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No leads in pipeline.</p>
          ) : (
            <div className="space-y-3">
              {activePipeline.map((status) => {
                const count = pipelineMap[status];
                const pct = Math.max(6, (count / maxPipeline) * 100);
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 truncate shrink-0">
                      {status.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${STATUS_BAR_COLOR[status] ?? "bg-gray-300"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-5 text-right shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}

              {/* Total */}
              <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Total assigned</span>
                <span className="text-xs font-bold text-gray-900">{stats.total ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity on My Leads</h3>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No recent activity on your leads yet.
          </p>
        ) : (
          <div>
            {recentActivity.map((event: any) => (
              <div
                key={event.id}
                onClick={() => event.lead?.id && navigate(`/leads/${event.lead.id}`)}
                className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded cursor-pointer transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {event.lead
                      ? `${event.lead.first_name} ${event.lead.last_name}`
                      : "A lead"}
                  </span>
                  <span className="text-sm text-gray-500 ml-1.5">
                    {EVENT_LABELS[event.event_type] ?? event.event_type?.replace(/_/g, " ")}
                  </span>
                </div>

                <span className="text-xs text-gray-400 shrink-0">
                  {getRelativeTime(event.created_at)}
                </span>

                <span
                  className={`text-xs font-bold w-8 text-right shrink-0 ${
                    (event.score_delta ?? 0) >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {(event.score_delta ?? 0) >= 0 ? "+" : ""}
                  {event.score_delta ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  valueClass = "text-gray-900",
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: any;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
