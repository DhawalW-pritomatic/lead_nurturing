import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import Modal from "../../components/Modal";
import { BarChart2, Send, Eye, MousePointerClick, AlertTriangle, Calendar, TrendingUp } from "lucide-react";

interface Props {
  template: { id: string; name: string; category: string } | null;
  onClose: () => void;
}

interface Metrics {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_failed: number;
  open_rate: number;
  click_rate: number;
  last_used: string | null;
  daily_sends: { date: string; count: number }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RateBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{rate}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

function SparkBar({ sends }: { sends: { date: string; count: number }[] }) {
  if (!sends.length) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        No sends in the last 30 days.
      </p>
    );
  }

  // Fill missing days with 0 so the chart spans a full 30-day window
  const filled: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = sends.find((s) => s.date === key);
    filled.push({ date: key, count: found?.count ?? 0 });
  }

  const max = Math.max(...filled.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 h-16">
      {filled.map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${day.count} email${day.count !== 1 ? "s" : ""}`}
          className="flex-1 bg-brand-500 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-default"
          style={{ height: `${Math.max((day.count / max) * 100, day.count > 0 ? 10 : 0)}%` }}
        />
      ))}
    </div>
  );
}

export default function TemplateMetricsModal({ template, onClose }: Props) {
  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ["template-metrics", template?.id],
    queryFn: () =>
      api.get(`/templates/${template!.id}/metrics`).then((r) => r.data),
    enabled: !!template,
  });

  const rateColor = (rate: number) => {
    if (rate >= 30) return "text-green-600";
    if (rate >= 15) return "text-amber-600";
    return "text-red-500";
  };

  return (
    <Modal
      isOpen={!!template}
      onClose={onClose}
      title=""
      size="lg"
    >
      {/* Custom header */}
      <div className="flex items-center gap-3 mb-5 -mt-1">
        <div className="p-2 bg-brand-100 rounded-lg">
          <BarChart2 className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {template?.name}
          </h2>
          <p className="text-xs text-gray-400 capitalize mt-0.5">
            {template?.category?.replace(/_/g, " ")} · Performance metrics
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      ) : metrics ? (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Send}
              label="Total Sent"
              value={metrics.total_sent.toLocaleString()}
              sub={
                metrics.last_used
                  ? `Last: ${new Date(metrics.last_used).toLocaleDateString()}`
                  : "Never used"
              }
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              icon={Eye}
              label="Opened"
              value={metrics.total_opened.toLocaleString()}
              sub={`${metrics.open_rate}% open rate`}
              color={`${metrics.open_rate >= 20 ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}
            />
            <StatCard
              icon={MousePointerClick}
              label="Clicked"
              value={metrics.total_clicked.toLocaleString()}
              sub={`${metrics.click_rate}% click rate`}
              color={`${metrics.click_rate >= 5 ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"}`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Failed"
              value={metrics.total_failed.toLocaleString()}
              sub={
                metrics.total_sent > 0
                  ? `${((metrics.total_failed / metrics.total_sent) * 100).toFixed(1)}% failure rate`
                  : undefined
              }
              color={`${metrics.total_failed > 0 ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"}`}
            />
          </div>

          {/* Engagement rates */}
          {metrics.total_sent > 0 && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Engagement Rates
              </p>
              <RateBar
                label="Open Rate"
                rate={metrics.open_rate}
                color={
                  metrics.open_rate >= 30
                    ? "bg-green-500"
                    : metrics.open_rate >= 15
                    ? "bg-amber-400"
                    : "bg-red-400"
                }
              />
              <RateBar
                label="Click-Through Rate"
                rate={metrics.click_rate}
                color={
                  metrics.click_rate >= 10
                    ? "bg-brand-500"
                    : metrics.click_rate >= 4
                    ? "bg-blue-400"
                    : "bg-gray-400"
                }
              />
              <div className="flex gap-4 pt-1 text-xs text-gray-500">
                <span>
                  Open:{" "}
                  <span className={`font-semibold ${rateColor(metrics.open_rate)}`}>
                    {metrics.open_rate >= 30 ? "Great" : metrics.open_rate >= 15 ? "Average" : "Low"}
                  </span>
                </span>
                <span>
                  CTR:{" "}
                  <span className={`font-semibold ${rateColor(metrics.click_rate * 3)}`}>
                    {metrics.click_rate >= 10 ? "Excellent" : metrics.click_rate >= 4 ? "Average" : "Low"}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Daily sends chart */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Sends — Last 30 Days
              </p>
              <span className="text-xs text-gray-400">
                {metrics.daily_sends.reduce((s, d) => s + d.count, 0)} total
              </span>
            </div>
            <SparkBar sends={metrics.daily_sends} />
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>30d ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Zero-state nudge */}
          {metrics.total_sent === 0 && (
            <div className="text-center py-4 text-sm text-gray-400">
              This template hasn't been used in any outreach yet.
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
