import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { formatChartDate } from "../../utils/dateUtils";
import { useAuthStore } from "../../store/authStore";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Users, Target, Mail, Zap, MessageSquare,
  CheckCircle, AlertCircle, ChevronRight, Flame, Star,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// Entry point — routes to rep or admin dashboard based on role
// ════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user } = useAuthStore();
  const isRep = user?.role === "sales_rep" || user?.role === "senior_sales_rep";
  if (isRep) return <RepDashboard user={user} />;
  return <AdminDashboard />;
}

// ════════════════════════════════════════════════════════════════════════════
// REP DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function RepDashboard({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [taskFilter, setTaskFilter] = useState<"mine" | "all">("mine");

  const { data: myLeadsData } = useQuery({
    queryKey: ["my-leads", user?.id],
    queryFn: () => api.get(`/leads?assigned_rep_id=${user?.id}&limit=200`).then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["dashboard-leaderboard"],
    queryFn: () => api.get("/dashboard/leaderboard").then((r) => r.data),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}`, { status: "done" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks-all"] }),
  });

  // My leads
  const myLeads: any[] = myLeadsData?.leads || [];
  const hotLeads  = myLeads.filter((l) => l.lead_type === "HOT");
  const warmLeads = myLeads.filter((l) => l.lead_type === "WARM");
  const converted = myLeads.filter((l) => l.lead_type === "CONVERTED");
  const convRate  = myLeads.length > 0 ? ((converted.length / myLeads.length) * 100).toFixed(1) : "0";

  // Tasks
  const allTasks: any[] = tasksData?.tasks || [];
  const displayTasks = taskFilter === "mine"
    ? allTasks.filter((t) => t.assigned_to === user?.id)
    : allTasks;

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const active   = displayTasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const overdue  = active.filter((t) => t.due_date && new Date(t.due_date) < todayStart);
  const dueToday = active.filter((t) => t.due_date && new Date(t.due_date) >= todayStart && new Date(t.due_date) <= todayEnd);
  const upcoming = active.filter((t) => !t.due_date || new Date(t.due_date) > todayEnd).slice(0, 8);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // My rank in leaderboard
  const myRank = (leaderboard || []).findIndex((r: any) => r.id === user?.id) + 1;

  const priorityDot: Record<string, string> = {
    urgent: "bg-red-500", high: "bg-orange-400", medium: "bg-amber-400", low: "bg-gray-300",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.first_name}!</h1>
          <p className="text-gray-500 mt-0.5">{todayStr}{user?.tenant?.name ? ` · ${user.tenant.name}` : ""}</p>
        </div>
        {(overdue.length > 0 || hotLeads.length > 0) && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {overdue.length > 0 && <span>{overdue.length} overdue task{overdue.length > 1 ? "s" : ""}</span>}
            {overdue.length > 0 && hotLeads.length > 0 && <span>·</span>}
            {hotLeads.length > 0 && <span>{hotLeads.length} hot lead{hotLeads.length > 1 ? "s" : ""} need action</span>}
          </div>
        )}
      </div>

      {/* My Pipeline KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "My Leads",   value: myLeads.length,   color: "bg-brand-50 text-brand-600",   icon: Users,       sub: "assigned to me" },
          { label: "Hot",        value: hotLeads.length,  color: "bg-red-50 text-red-600",        icon: Flame,       sub: "need follow-up" },
          { label: "Warm",       value: warmLeads.length, color: "bg-amber-50 text-amber-600",    icon: TrendingUp,  sub: "nurturing" },
          { label: "Converted",  value: converted.length, color: "bg-green-50 text-green-600",    icon: CheckCircle, sub: "all time" },
          { label: "My Rate",    value: `${convRate}%`,   color: "bg-indigo-50 text-indigo-600",  icon: Target,      sub: "conversion" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{k.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}>
                <k.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tasks + Hot Leads */}
      <div className="grid grid-cols-3 gap-6">

        {/* Tasks — 2/3 */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Tasks</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {active.length} active · {overdue.length} overdue
              </p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["mine", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${taskFilter === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {f === "mine" ? "Mine" : "All"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-0.5">
            {overdue.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest px-3 py-1.5">Overdue</p>
                {overdue.map((t) => (
                  <TaskRow key={t.id} task={t} onDone={() => completeMutation.mutate(t.id)} userId={user?.id} priorityDot={priorityDot} />
                ))}
              </>
            )}

            {dueToday.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-3 py-1.5 mt-1">Due Today</p>
                {dueToday.map((t) => (
                  <TaskRow key={t.id} task={t} onDone={() => completeMutation.mutate(t.id)} userId={user?.id} priorityDot={priorityDot} />
                ))}
              </>
            )}

            {upcoming.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1.5 mt-1">Upcoming</p>
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} onDone={() => completeMutation.mutate(t.id)} userId={user?.id} priorityDot={priorityDot} />
                ))}
              </>
            )}

            {active.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">
                <CheckCircle className="w-9 h-9 mx-auto text-green-400 mb-2" />
                {taskFilter === "mine" ? "You're all caught up!" : "No active tasks."}
              </div>
            )}
          </div>

          {active.length > 0 && (
            <Link to="/tasks" className="mt-3 flex items-center justify-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium pt-3 border-t border-gray-100">
              View all in Tasks <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Hot + Warm Leads — 1/3 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">My Hot Leads</h2>
              <p className="text-xs text-gray-500 mt-0.5">{hotLeads.length} need follow-up</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Flame className="w-4 h-4 text-red-500" />
            </div>
          </div>

          {hotLeads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-sm text-gray-400">
              <Flame className="w-9 h-9 text-gray-200 mb-2" />
              No hot leads right now.
            </div>
          ) : (
            <div className="space-y-1">
              {hotLeads.slice(0, 7).map((lead: any) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{lead.first_name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-gray-400 truncate">{lead.company || lead.phone || lead.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-red-500">{lead.score}</p>
                    <p className="text-[10px] text-gray-400">score</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 flex-shrink-0" />
                </Link>
              ))}
              {hotLeads.length > 7 && (
                <Link to="/leads" className="block text-xs text-brand-600 hover:text-brand-700 font-medium text-center pt-1">
                  +{hotLeads.length - 7} more hot leads
                </Link>
              )}
            </div>
          )}

          {warmLeads.length > 0 && (
            <>
              <div className="my-3 border-t border-gray-100" />
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Warm</p>
              <div className="space-y-1">
                {warmLeads.slice(0, 4).map((lead: any) => (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-amber-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-amber-600">{lead.first_name?.[0]?.toUpperCase()}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate flex-1">{lead.first_name} {lead.last_name}</p>
                    <span className="text-xs font-semibold text-amber-600 flex-shrink-0">{lead.score}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team Leaderboard */}
      {(leaderboard || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Team Leaderboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {myRank > 0 ? `You are ranked #${myRank} on your team` : "Your team's performance"}
              </p>
            </div>
            <Star className="w-5 h-5 text-amber-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(leaderboard as any[]).slice(0, 8).map((rep, i) => {
              const isMe = rep.id === user?.id;
              const rate = parseFloat(rep.conversion_rate || "0");
              return (
                <div
                  key={rep.id}
                  className={`p-3 rounded-xl border transition-all ${isMe ? "border-brand-300 bg-brand-50 ring-1 ring-brand-200" : "border-gray-100 bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-200 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                      {i + 1}
                    </span>
                    <p className={`text-xs font-semibold truncate ${isMe ? "text-brand-700" : "text-gray-900"}`}>
                      {isMe ? "You" : rep.name.split(" ")[0]}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500">{rep.total} leads</span>
                    <span className={`font-bold ${rate >= 15 ? "text-green-600" : rate >= 8 ? "text-amber-600" : "text-gray-500"}`}>
                      {rep.conversion_rate}%
                    </span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isMe ? "bg-brand-500" : "bg-gray-400"}`}
                      style={{ width: `${Math.min(rate * 4, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onDone, userId, priorityDot }: { task: any; onDone: () => void; userId: string; priorityDot: Record<string, string> }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group transition-colors ${isOverdue ? "bg-red-50/60" : ""}`}>
      <button
        onClick={onDone}
        className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 hover:border-green-500 hover:bg-green-50 transition-colors"
        title="Mark done"
      />
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority] || "bg-gray-300"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{task.title}</p>
        {task.lead && (
          <p className="text-xs text-gray-400 truncate">{task.lead.first_name} {task.lead.last_name}</p>
        )}
      </div>
      {task.assigned_to !== userId && task.assignee && (
        <span className="text-xs text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.assignee.first_name}
        </span>
      )}
      {task.due_date && (
        <span className={`text-xs flex-shrink-0 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN / MANAGER DASHBOARD  (original, unchanged)
// ════════════════════════════════════════════════════════════════════════════
function AdminDashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => api.get("/dashboard/overview").then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: trends }      = useQuery({ queryKey: ["dashboard-trends"],      queryFn: () => api.get("/dashboard/trends").then((r) => r.data) });
  const { data: sources }     = useQuery({ queryKey: ["dashboard-sources"],     queryFn: () => api.get("/dashboard/sources").then((r) => r.data) });
  const { data: funnel }      = useQuery({ queryKey: ["dashboard-funnel"],      queryFn: () => api.get("/dashboard/funnel").then((r) => r.data) });
  const { data: leaderboard } = useQuery({ queryKey: ["dashboard-leaderboard"], queryFn: () => api.get("/dashboard/leaderboard").then((r) => r.data) });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const typeData = overview?.lead_types
    ? [
        { name: "Hot",       value: overview.lead_types.hot,       color: "#EF4444" },
        { name: "Warm",      value: overview.lead_types.warm,      color: "#F59E0B" },
        { name: "Cold",      value: overview.lead_types.cold,      color: "#3B82F6" },
        { name: "Failed",    value: overview.lead_types.failed,    color: "#EF4444" },
        { name: "Converted", value: overview.lead_types.converted, color: "#10B981" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time overview of your CRM pipeline</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
        <KPICard title="Total Leads"       value={overview?.total_leads || 0}          icon={Users}         trend={`+${overview?.new_this_week || 0} this week`} color="brand" />
        <KPICard title="Hot Leads"         value={overview?.lead_types?.hot || 0}      icon={Target}        trend="Requires attention"                            color="red" />
        <KPICard title="Conversion Rate"   value={`${overview?.conversion_rate || 0}%`} icon={TrendingUp}   trend="Of all leads"                                  color="green" />
        <KPICard title="Outreach Sent"     value={overview?.total_outreach || 0}        icon={Mail}         trend={`${overview?.outreach_this_week || 0} this week`} color="purple" />
        <KPICard title="Active Sequences"  value={overview?.active_sequences || 0}      icon={Zap}          trend="Nurturing leads"                               color="amber" />
        <KPICard title="Pending Queries"   value={overview?.pending_queries || 0}       icon={MessageSquare} trend={`${overview?.queries_this_week || 0} this week`} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Enrollment Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => formatChartDate(v)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {typeData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sources || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="source" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rep Leaderboard</h3>
          <div className="space-y-3">
            {(leaderboard || []).slice(0, 6).map((rep: any, i: number) => (
              <div key={rep.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-700" : "bg-orange-50 text-orange-600"}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{rep.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">{rep.total} leads</span>
                  <span className="font-medium text-green-600">{rep.converted} conversions</span>
                  <span className="text-brand-600 font-semibold">{rep.conversion_rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Funnel</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={funnel || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="status" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── KPI card (admin dashboard) ────────────────────────────────────────────────
function KPICard({ title, value, icon: Icon, trend, color }: { title: string; value: number | string; icon: any; trend: string; color: string }) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600", red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{trend}</p>
    </div>
  );
}
