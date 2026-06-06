import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { formatChartDate } from "../../utils/dateUtils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  Target,
  Mail,
  Zap,
  MessageSquare,
} from "lucide-react";

const COLORS = [
  "#EF4444",
  "#F59E0B",
  "#3B82F6",
  "#6B7280",
  "#10B981",
  "#8B5CF6",
];

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => api.get("/dashboard/overview").then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: trends } = useQuery({
    queryKey: ["dashboard-trends"],
    queryFn: () => api.get("/dashboard/trends").then((r) => r.data),
  });

  const { data: sources } = useQuery({
    queryKey: ["dashboard-sources"],
    queryFn: () => api.get("/dashboard/sources").then((r) => r.data),
  });

  const { data: funnel } = useQuery({
    queryKey: ["dashboard-funnel"],
    queryFn: () => api.get("/dashboard/funnel").then((r) => r.data),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["dashboard-leaderboard"],
    queryFn: () => api.get("/dashboard/leaderboard").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const typeData = overview?.lead_types
    ? [
        { name: "Hot", value: overview.lead_types.hot, color: "#EF4444" },
        { name: "Warm", value: overview.lead_types.warm, color: "#F59E0B" },
        { name: "Cold", value: overview.lead_types.cold, color: "#3B82F6" },
        { name: "Stale", value: overview.lead_types.stale, color: "#6B7280" },
        {
          name: "Converted",
          value: overview.lead_types.converted,
          color: "#10B981",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Real-time overview of your CRM pipeline
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
        <KPICard
          title="Total Leads"
          value={overview?.total_leads || 0}
          icon={Users}
          trend={`+${overview?.new_this_week || 0} this week`}
          color="brand"
        />
        <KPICard
          title="Hot Leads"
          value={overview?.lead_types?.hot || 0}
          icon={Target}
          trend="Requires attention"
          color="red"
        />
        <KPICard
          title="Conversion Rate"
          value={`${overview?.conversion_rate || 0}%`}
          icon={TrendingUp}
          trend="Of all leads"
          color="green"
        />
        <KPICard
          title="Outreach Sent"
          value={overview?.total_outreach || 0}
          icon={Mail}
          trend={`${overview?.outreach_this_week || 0} this week`}
          color="purple"
        />
        <KPICard
          title="Active Sequences"
          value={overview?.active_sequences || 0}
          icon={Zap}
          trend="Nurturing leads"
          color="amber"
        />
        <KPICard
          title="Pending Queries"
          value={overview?.pending_queries || 0}
          icon={MessageSquare}
          trend={`${overview?.queries_this_week || 0} this week`}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Volume Trend */}
        <div className="card col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Lead Enrollment Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatChartDate(v)}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Type Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Lead Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {typeData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Attribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Lead Sources
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sources || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="source"
                width={100}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rep Leaderboard */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rep Leaderboard
          </h3>
          <div className="space-y-3">
            {(leaderboard || []).slice(0, 6).map((rep: any, i: number) => (
              <div
                key={rep.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-700" : "bg-orange-50 text-orange-600"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {rep.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">{rep.total} leads</span>
                  <span className="font-medium text-green-600">
                    {rep.converted} conversions
                  </span>
                  <span className="text-brand-600 font-semibold">
                    {rep.conversion_rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pipeline Funnel
        </h3>
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

function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: number | string;
  icon: any;
  trend: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{trend}</p>
    </div>
  );
}
