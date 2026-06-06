import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { formatDate } from "../../utils/dateUtils";
import Modal from "../../components/Modal";
import {
  Building2,
  Users,
  TrendingUp,
  Mail,
  Activity,
  Plus,
  Trash2,
  Power,
  Database,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tenants" | "analytics" | "leads">("overview");
  const [selectedTenantForLeads, setSelectedTenantForLeads] = useState<string | null>(null);
  const [leadsPage, setLeadsPage] = useState(1);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    vertical_type: "general",
    plan_tier: "starter",
    admin_email: "",
    admin_password: "Welcome@123",
    admin_first_name: "",
    admin_last_name: "",
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get("/admin/analytics").then((r) => r.data),
  });

  const { data: systemHealth } = useQuery({
    queryKey: ["system-health"],
    queryFn: () => api.get("/admin/system/health").then((r) => r.data),
  });

  const { data: tenantLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ["tenant-leads", selectedTenantForLeads, leadsPage],
    queryFn: () => 
      api.get(`/admin/tenants/${selectedTenantForLeads}/leads?page=${leadsPage}&limit=15`).then((r) => r.data),
    enabled: !!selectedTenantForLeads,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/tenants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Tenant created successfully!");
      setShowCreateTenant(false);
      setForm({
        name: "",
        subdomain: "",
        vertical_type: "general",
        plan_tier: "starter",
        admin_email: "",
        admin_password: "Welcome@123",
        admin_first_name: "",
        admin_last_name: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create tenant"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/tenants/${id}/status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Tenant status updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Tenant deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to delete tenant"),
  });

  const overview = analytics?.overview;
  const tenants = analytics?.tenants || [];

  const verticalLabels: Record<string, string> = {
    education: "Education",
    real_estate: "Real Estate",
    construction: "Construction",
    saas: "SaaS",
    ecommerce: "E-commerce",
    manufacturing: "Manufacturing",
    general: "General",
  };

  const planColors: Record<string, string> = {
    starter: "bg-gray-100 text-gray-700",
    professional: "bg-blue-100 text-blue-700",
    enterprise: "bg-purple-100 text-purple-700",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-orange-600">Super Admin Panel</h1>
        <p className="text-cyan-600 mt-1">Platform-wide management and analytics</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "tenants"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Tenants ({overview?.total_tenants || 0})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "analytics"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </div>
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "leads"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              All Leads ({overview?.total_leads || 0})
            </div>
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.total_tenants || 0}</p>
                  <p className="text-xs text-green-600 mt-1">{overview?.active_tenants || 0} active</p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.total_users || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Across all tenants</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.total_leads || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Platform-wide</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outreach Sent</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.total_outreach || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{overview?.total_events || 0} events</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          {systemHealth && (
            <div className="card">
              <h3 className="font-semibold text-orange-600 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                System Health
              </h3>
              <p className="text-sm text-cyan-600 mb-4">Real-time system metrics and database status</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Database Status</p>
                  <p className={`font-semibold ${
                    systemHealth.database.status === 'connected' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {systemHealth.database.status === 'connected' ? '✓ Connected' : '✗ Error'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Database Size</p>
                  <p className="font-semibold text-gray-900">{systemHealth.database.size || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="font-semibold text-gray-900">
                    {Object.values(systemHealth.tables || {}).reduce((a: any, b: any) => a + b, 0) as number}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Tenants */}
          <div className="card">
            <h3 className="font-semibold text-orange-600 mb-4">Top Tenants by Activity</h3>
            <p className="text-sm text-cyan-600 mb-4">Most active organizations on the platform</p>
            <div className="space-y-3">
              {[...tenants].sort((a: any, b: any) => (b.converted_count || 0) - (a.converted_count || 0)).slice(0, 5).map((tenant: any, index: number) => {
                const rank = index + 1;
                return (
                  <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-bold text-gray-400 w-5 text-center">{rank}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{tenant.name}</h4>
                        <p className="text-xs text-gray-500">{verticalLabels[tenant.vertical_type]}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{tenant.user_count}</p>
                        <p className="text-xs text-gray-500">Users</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{tenant.lead_count}</p>
                        <p className="text-xs text-gray-500">Leads</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-600">{tenant.converted_count}</p>
                        <p className="text-xs text-gray-500">Converted</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tenants Tab */}
      {activeTab === "tenants" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-orange-600">Tenant Management</h3>
              <p className="text-sm text-cyan-600 mt-1">Create and manage all platform tenants</p>
            </div>
            <button onClick={() => setShowCreateTenant(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Tenant
            </button>
          </div>

          {/* Modal for Create Tenant */}
          <Modal
            isOpen={showCreateTenant}
            onClose={() => setShowCreateTenant(false)}
            title="Create New Tenant"
            size="xl"
          >
            <div className="space-y-4">
              <p className="text-sm text-cyan-600">Set up a new organization on the platform</p>
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Tenant Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
                <div className="space-y-1">
                  <input
                    placeholder="Subdomain (e.g., acme)"
                    value={form.subdomain}
                    onChange={(e) => {
                      // Auto-sanitize: lowercase, replace spaces with hyphens, allow only alphanumeric and hyphens
                      const sanitized = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '');
                      setForm({ ...form, subdomain: sanitized });
                    }}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500">Only lowercase letters, numbers, and hyphens. No spaces.</p>
                </div>
                <select
                  value={form.vertical_type}
                  onChange={(e) => setForm({ ...form, vertical_type: e.target.value })}
                  className="input-field"
                >
                  <option value="general">General</option>
                  <option value="education">Education</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="construction">Construction</option>
                  <option value="saas">SaaS</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="manufacturing">Manufacturing</option>
                </select>
                <select
                  value={form.plan_tier}
                  onChange={(e) => setForm({ ...form, plan_tier: e.target.value })}
                  className="input-field"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <hr />
              <div>
                <h4 className="font-medium text-orange-600">Admin User</h4>
                <p className="text-sm text-cyan-600 mt-1">Primary administrator account details</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="First Name"
                  value={form.admin_first_name}
                  onChange={(e) => setForm({ ...form, admin_first_name: e.target.value })}
                  className="input-field"
                />
                <input
                  placeholder="Last Name"
                  value={form.admin_last_name}
                  onChange={(e) => setForm({ ...form, admin_last_name: e.target.value })}
                  className="input-field"
                />
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  className="input-field"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={form.admin_password}
                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => createMutation.mutate(form)} className="btn-primary">
                  Create Tenant
                </button>
                <button onClick={() => setShowCreateTenant(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </Modal>

          {/* Tenant Table */}
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Vertical</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Users</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Leads</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant: any) => (
                  <tr key={tenant.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-xs text-gray-500">@{tenant.subdomain}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {verticalLabels[tenant.vertical_type]}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${planColors[tenant.plan_tier]}`}>
                        {tenant.plan_tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-900">
                      {tenant.user_count}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-gray-900">
                      {tenant.lead_count}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tenant.is_active ? (
                        <span className="text-xs font-medium text-green-600">Active</span>
                      ) : (
                        <span className="text-xs font-medium text-red-600">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatusMutation.mutate(tenant.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title={tenant.is_active ? "Deactivate" : "Activate"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete tenant "${tenant.name}"? This cannot be undone!`)) {
                              deleteMutation.mutate(tenant.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-orange-600">Cross-Tenant Analytics</h3>
          <p className="text-sm text-cyan-600 mb-4">Compare performance metrics across all organizations</p>
          
          {/* Tenant Comparison */}
          <div className="card">
            <h4 className="font-semibold text-orange-600 mb-4">Tenant Performance Comparison</h4>
            <p className="text-sm text-cyan-600 mb-4">Lead conversion rates and activity metrics</p>
            <div className="space-y-4">
              {tenants.map((tenant: any) => {
                const conversionRate = tenant.lead_count > 0 
                  ? ((tenant.converted_count / tenant.lead_count) * 100).toFixed(1) 
                  : "0";
                
                return (
                  <div key={tenant.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-gray-900">{tenant.name}</h5>
                        <p className="text-xs text-gray-500">{verticalLabels[tenant.vertical_type]}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-cyan-600">{conversionRate}%</p>
                        <p className="text-xs text-gray-500">conversion</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-lg font-bold text-gray-900">{tenant.user_count}</p>
                        <p className="text-xs text-gray-500">Users</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-lg font-bold text-blue-600">{tenant.lead_count}</p>
                        <p className="text-xs text-gray-500">Leads</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-lg font-bold text-green-600">{tenant.converted_count}</p>
                        <p className="text-xs text-gray-500">Converted</p>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <p className="text-lg font-bold text-orange-600">{tenant.lead_count - tenant.converted_count}</p>
                        <p className="text-xs text-gray-500">Active</p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-orange-500 h-2 rounded-full"
                          style={{ width: `${conversionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-orange-600">All Platform Leads</h3>
            <p className="text-sm text-cyan-600 mt-1">View and manage leads across all tenants</p>
          </div>

          {/* Tenant Selection Tabs */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Tenant</h4>
            <div className="flex flex-wrap gap-2">
              {tenants.map((tenant: any) => (
                <button
                  key={tenant.id}
                  onClick={() => {
                    setSelectedTenantForLeads(tenant.id);
                    setLeadsPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    selectedTenantForLeads === tenant.id
                      ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tenant.name}
                  <span className="ml-2 text-xs opacity-75">
                    ({tenant.lead_count} leads)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Leads Table */}
          {selectedTenantForLeads && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h4 className="font-semibold text-orange-600">
                  Leads for {tenants.find((t: any) => t.id === selectedTenantForLeads)?.name}
                </h4>
                <p className="text-sm text-cyan-600 mt-1">
                  Total: {tenantLeads?.pagination?.total || 0} leads
                </p>
              </div>

              {leadsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="text-gray-500">Loading leads...</div>
                </div>
              ) : tenantLeads?.leads?.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Name</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Email</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Phone</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Company</th>
                          <th className="text-center py-3 px-4 text-xs font-bold text-gray-700 uppercase">Status</th>
                          <th className="text-center py-3 px-4 text-xs font-bold text-gray-700 uppercase">Type</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Assigned To</th>
                          <th className="text-center py-3 px-4 text-xs font-bold text-gray-700 uppercase">Score</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {tenantLeads.leads.map((lead: any) => (
                          <tr key={lead.id} className="hover:bg-cyan-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{lead.email}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{lead.phone || "-"}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{lead.company || "-"}</td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  lead.status === "NEW"
                                    ? "bg-blue-100 text-blue-700"
                                    : lead.status === "CONTACTED"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : lead.status === "QUALIFIED"
                                    ? "bg-purple-100 text-purple-700"
                                    : lead.status === "CONVERTED"
                                    ? "bg-green-100 text-green-700"
                                    : lead.status === "UNQUALIFIED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {lead.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  lead.lead_type === "HOT"
                                    ? "bg-red-100 text-red-700"
                                    : lead.lead_type === "WARM"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {lead.lead_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {lead.assignedRep
                                ? `${lead.assignedRep.first_name} ${lead.assignedRep.last_name}`
                                : "Unassigned"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-bold text-cyan-600">{lead.lead_score || 0}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatDate(lead.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {tenantLeads.pagination.totalPages > 1 && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Showing {(leadsPage - 1) * 50 + 1} to{" "}
                        {Math.min(leadsPage * 50, tenantLeads.pagination.total)} of{" "}
                        {tenantLeads.pagination.total} leads
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLeadsPage(leadsPage - 1)}
                          disabled={leadsPage === 1}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: tenantLeads.pagination.totalPages }, (_, i) => i + 1)
                            .filter(
                              (page) =>
                                page === 1 ||
                                page === tenantLeads.pagination.totalPages ||
                                (page >= leadsPage - 2 && page <= leadsPage + 2)
                            )
                            .map((page, idx, arr) => (
                              <div key={page}>
                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                  <span className="px-2 text-gray-400">...</span>
                                )}
                                <button
                                  onClick={() => setLeadsPage(page)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                    page === leadsPage
                                      ? "bg-cyan-600 text-white"
                                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  {page}
                                </button>
                              </div>
                            ))}
                        </div>
                        <button
                          onClick={() => setLeadsPage(leadsPage + 1)}
                          disabled={leadsPage === tenantLeads.pagination.totalPages}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                  <FileText className="w-12 h-12 mb-3 text-gray-300" />
                  <p>No leads found for this tenant</p>
                </div>
              )}
            </div>
          )}

          {!selectedTenantForLeads && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Select a Tenant</h4>
              <p className="text-gray-600">Choose a tenant from the tabs above to view their leads</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
