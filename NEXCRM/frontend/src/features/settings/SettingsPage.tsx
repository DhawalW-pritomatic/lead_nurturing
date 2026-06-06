import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useState } from "react";
import {
  Save,
  Shield,
  Building2,
  Users,
  Database,
  Activity,
  ExternalLink,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { formatDate } from "../../utils/dateUtils";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";

  // Super admin: load platform-level data instead of tenant-specific
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

  const { data: tenant } = useQuery({
    queryKey: ["tenant-current"],
    queryFn: () => api.get("/tenants/current").then((r) => r.data),
    enabled: !isSuperAdmin,
  });

  const { data: nurturing } = useQuery({
    queryKey: ["nurturing-settings"],
    queryFn: () => api.get("/tenants/nurturing-settings").then((r) => r.data),
    enabled: !isSuperAdmin,
  });

  const [nurturingForm, setNurturingForm] = useState<any>(null);

  const nurturingMutation = useMutation({
    mutationFn: (data: any) =>
      api.put("/tenants/nurturing-settings", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nurturing-settings"] });
      toast.success("Nurturing settings saved.");
    },
  });

  const currentNurturing = nurturingForm || nurturing;

  // Super Admin view: platform-wide settings & system health
  if (isSuperAdmin) {
    const overview = platformAnalytics?.overview;
    const totalTenants = overview?.totalTenants ?? 0;
    const activeTenants = overview?.activeTenants ?? 0;
    const totalUsers = overview?.totalUsers ?? 0;
    const totalLeads = overview?.totalLeads ?? 0;

    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Platform Settings
            </h1>
            <span className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            Manage tenants, monitor system health, and configure platform-wide
            defaults.
          </p>
        </div>

        {/* Platform Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Tenants
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalTenants}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {activeTenants} active
                </p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Users
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalUsers}
                </p>
              </div>
              <Users className="w-8 h-8 text-indigo-500 opacity-50" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Leads
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalLeads}
                </p>
              </div>
              <Database className="w-8 h-8 text-emerald-500 opacity-50" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  System
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">
                  {systemHealth?.database?.status || "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {systemHealth?.database?.size
                    ? `DB ${systemHealth.database.size}`
                    : ""}
                </p>
              </div>
              <Activity
                className={`w-8 h-8 opacity-50 ${systemHealth?.database?.status === "connected" ? "text-green-500" : "text-amber-500"}`}
              />
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              to="/admin"
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Tenant Management</p>
                  <p className="text-xs text-gray-500">
                    Create, edit, suspend tenants
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              to="/admin"
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Users className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">User Directory</p>
                  <p className="text-xs text-gray-500">
                    All users across tenants
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* System Health */}
        {systemHealth && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">System Health</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Database Status</p>
                <p
                  className={`font-medium capitalize ${systemHealth.database?.status === "connected" ? "text-green-600" : "text-red-600"}`}
                >
                  {systemHealth.database?.status || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Database Size</p>
                <p className="font-medium text-gray-900">
                  {systemHealth.database?.size || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Server Time</p>
                <p className="font-medium text-gray-900">
                  {systemHealth.timestamp
                    ? formatDate(systemHealth.timestamp)
                    : "—"}
                </p>
              </div>
              {systemHealth.tables &&
                Object.entries(systemHealth.tables).map(([table, count]) => (
                  <div key={table}>
                    <p className="text-gray-500 text-xs capitalize">
                      {table.replace(/_/g, " ")}
                    </p>
                    <p className="font-medium text-gray-900">
                      {String(count)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tenant Snapshot */}
        {platformAnalytics?.tenants && platformAnalytics.tenants.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Tenant Snapshot</h3>
              <Link
                to="/admin"
                className="text-sm text-purple-600 hover:underline flex items-center gap-1"
              >
                Manage all <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Plan</th>
                    <th className="text-right py-2">Users</th>
                    <th className="text-right py-2">Leads</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {platformAnalytics.tenants
                    .slice(0, 8)
                    .map((t: any) => (
                      <tr key={t.id}>
                        <td className="py-2 font-medium text-gray-900">
                          {t.name}
                        </td>
                        <td className="py-2 capitalize text-gray-700">
                          {t.plan_tier || "—"}
                        </td>
                        <td className="py-2 text-right text-gray-700">
                          {t.user_count ?? 0}
                        </td>
                        <td className="py-2 text-right text-gray-700">
                          {t.lead_count ?? 0}
                        </td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${t.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                          >
                            {t.is_active ? "active" : "suspended"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <SettingsIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">
                Tenant-specific settings are not shown here.
              </p>
              <p className="text-amber-700 mt-1">
                Nurturing intervals, lead-scoring weights and SMTP credentials
                are scoped to each tenant. Open a tenant from{" "}
                <Link to="/admin" className="underline font-medium">
                  Tenant Management
                </Link>{" "}
                to configure those.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Configure tenant settings, scoring, and nurturing
        </p>
      </div>

      {/* Tenant Info */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Tenant Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Company Name
            </label>
            <p className="text-gray-900 font-medium">{tenant?.name || "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Vertical
            </label>
            <p className="text-gray-900 font-medium">
              {tenant?.vertical_type?.replace("_", " ") || "—"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Subdomain
            </label>
            <p className="text-gray-900 font-medium">
              {tenant?.subdomain}.nexcrm.io
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Plan</label>
            <p className="text-gray-900 font-medium capitalize">
              {tenant?.plan_tier || "Standard"}
            </p>
          </div>
        </div>
      </div>

      {/* Nurturing Settings */}
      {currentNurturing && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Nurturing Settings</h3>
            <button
              onClick={() => nurturingMutation.mutate(currentNurturing)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Cold Outreach Interval (days)
              </label>
              <input
                type="number"
                value={currentNurturing.cold_outreach_interval_days || 5}
                onChange={(e) =>
                  setNurturingForm({
                    ...currentNurturing,
                    cold_outreach_interval_days: parseInt(e.target.value),
                  })
                }
                className="input-field"
                min={1}
                max={30}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Warm Sequence Interval (days)
              </label>
              <input
                type="number"
                value={currentNurturing.warm_sequence_interval_days || 2}
                onChange={(e) =>
                  setNurturingForm({
                    ...currentNurturing,
                    warm_sequence_interval_days: parseInt(e.target.value),
                  })
                }
                className="input-field"
                min={1}
                max={14}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Max Cold Attempts
              </label>
              <input
                type="number"
                value={currentNurturing.max_cold_attempts || 6}
                onChange={(e) =>
                  setNurturingForm({
                    ...currentNurturing,
                    max_cold_attempts: parseInt(e.target.value),
                  })
                }
                className="input-field"
                min={2}
                max={12}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Send Window Start
              </label>
              <input
                type="time"
                value={currentNurturing.daily_send_window_start || "09:00"}
                onChange={(e) =>
                  setNurturingForm({
                    ...currentNurturing,
                    daily_send_window_start: e.target.value,
                  })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Send Window End
              </label>
              <input
                type="time"
                value={currentNurturing.daily_send_window_end || "18:00"}
                onChange={(e) =>
                  setNurturingForm({
                    ...currentNurturing,
                    daily_send_window_end: e.target.value,
                  })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Max Messages / Week
              </label>
              <input
                type="number"
                value={currentNurturing.max_messages_per_week || 3}
                onChange={(e) =>
                  setNurturingForm({
                    ...currentNurturing,
                    max_messages_per_week: parseInt(e.target.value),
                  })
                }
                className="input-field"
                min={1}
                max={7}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentNurturing.global_pause || false}
                onChange={(e) =>
                  setNurturingForm({
                    ...currentNurturing,
                    global_pause: e.target.checked,
                  })
                }
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span className="text-sm text-gray-700">
                Pause all automated outreach globally
              </span>
            </label>
          </div>
        </div>
      )}

    </div>
  );
}
