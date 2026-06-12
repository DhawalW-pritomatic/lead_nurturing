import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import Modal from "../../components/Modal";
import TemplateMetricsModal from "./TemplateMetricsModal";
import TemplatePreviewModal from "./TemplatePreviewModal";
import { Plus, Edit2, Trash2, Image, Paperclip, ChevronDown, Building2, X, BarChart2, Search } from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────
interface AssignedTenant {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  body: string;
  category: string;
  tenant_id: string;
  assigned_from_id?: string | null;
  tenant?: { id: string; name: string };
  assignedTenants?: AssignedTenant[];
}

interface TenantOption {
  id: string;
  name: string;
}

const categoryColors: Record<string, string> = {
  welcome: "bg-green-100 text-green-700",
  onboarding: "bg-blue-100 text-blue-700",
  follow_up: "bg-purple-100 text-purple-700",
  discount: "bg-amber-100 text-amber-700",
  post_purchase: "bg-teal-100 text-teal-700",
  reengagement: "bg-orange-100 text-orange-700",
  general: "bg-gray-100 text-gray-700",
};

const categories = [
  "welcome",
  "onboarding",
  "follow_up",
  "discount",
  "post_purchase",
  "reengagement",
  "general",
];

// ── component ─────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";

  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [metricsTemplate, setMetricsTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [selectedTenantTab, setSelectedTenantTab] = useState<string>("all");
  const [openAssignDropdown, setOpenAssignDropdown] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    channel: "email",
    subject: "",
    body: "",
    category: "general",
  });

  // ── queries ──────────────────────────────────────────────────────────────────
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["templates", user?.tenant_id],
    queryFn: () => api.get("/templates").then((r) => r.data),
  });

  const { data: assets } = useQuery({
    queryKey: ["template-assets", user?.tenant_id],
    queryFn: () => api.get("/assets").then((r) => r.data),
  });

  const { data: adminAnalytics } = useQuery({
    queryKey: ["admin-analytics", user?.tenant_id],
    queryFn: () => api.get("/admin/analytics").then((r) => r.data),
    enabled: isSuperAdmin,
  });

  const allTenants: TenantOption[] = adminAnalytics?.tenants || [];

  // ── mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/templates", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template created.");
      setShowCreate(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.put(`/templates/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template updated.");
      setEditingTemplate(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, tenant_id }: { id: string; tenant_id: string }) =>
      api.post(`/templates/${id}/assign`, { tenant_id }).then((r) => r.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      const tenantName = allTenants.find((t) => t.id === vars.tenant_id)?.name || "tenant";
      toast.success(`Template assigned to ${tenantName}.`);
      setOpenAssignDropdown(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Assignment failed."),
  });

  // ── helpers ───────────────────────────────────────────────────────────────────
  const resetForm = () =>
    setForm({ name: "", channel: "email", subject: "", body: "", category: "general" });

  const handleEdit = (t: Template) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      channel: t.channel,
      subject: t.subject || "",
      body: t.body,
      category: t.category,
    });
  };

  const handleSave = () => {
    if (editingTemplate) updateMutation.mutate({ id: editingTemplate.id, ...form });
    else createMutation.mutate(form);
  };

  const insertAsset = (asset: any) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const assetUrl = `${baseUrl}/uploads/assets/${asset.filename}`;
    const isImage = asset.mime_type?.startsWith("image/");
    const snippet = isImage
      ? `<img src="${assetUrl}" alt="${asset.original_name}" style="max-width:100%;height:auto;" />`
      : `<a href="${assetUrl}" target="_blank">${asset.original_name}</a>`;
    setForm({ ...form, body: form.body + "\n" + snippet });
    setShowAssetPicker(false);
    toast.success(`Asset "${asset.original_name}" inserted.`);
  };

  // ── derived data ─────────────────────────────────────────────────────────────
  // Unique tenants from templates (for super admin tabs)
  const tenantTabs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of templates) {
      if (t.tenant && !seen.has(t.tenant.id)) {
        seen.set(t.tenant.id, t.tenant.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [templates]);

  const visibleTemplates = useMemo(() => {
    let list = templates;
    if (isSuperAdmin) {
      if (selectedTenantTab === "all") {
        list = list.filter((t) => !t.assigned_from_id);
      } else {
        list = list.filter((t) => t.tenant_id === selectedTenantTab);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.subject ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, isSuperAdmin, selectedTenantTab, searchQuery]);

  // Tenants available to assign to (excludes the template's own tenant)
  const assignableTenants = (template: Template) =>
    allTenants.filter(
      (t) =>
        t.id !== template.tenant_id &&
        !(template.assignedTenants || []).some((at) => at.id === t.id)
    );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" onClick={() => setOpenAssignDropdown(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">
            Manage email templates for outreach and sequences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 w-56 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setShowCreate(true);
              setEditingTemplate(null);
              resetForm();
            }}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showCreate || !!editingTemplate}
        onClose={() => {
          setShowCreate(false);
          setEditingTemplate(null);
          resetForm();
        }}
        title={editingTemplate ? "Edit Template" : "Create New Template"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <input
              placeholder="Template name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-field"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className="input-field"
            >
              <option value="email">Email</option>
            </select>
          </div>
          <input
            placeholder="Subject line (supports {{variables}})"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="input-field"
          />
          <textarea
            placeholder="Email body (HTML supported, use {{lead.first_name}}, {{rep.name}}, {{company.name}}, {{tracking.cta_url}} etc.)"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="input-field"
            rows={8}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAssetPicker(!showAssetPicker)}
              className="btn-secondary flex items-center gap-1 text-sm"
            >
              <Paperclip className="w-4 h-4" /> Insert Asset
            </button>
            <span className="text-xs text-gray-400">
              Insert images or file links from your asset library
            </span>
          </div>
          {showAssetPicker && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Select an Asset
              </h4>
              {!assets || assets.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No assets available. Upload assets in the Assets section first.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(Array.isArray(assets) ? assets : assets.assets || []).map(
                    (asset: any) => (
                      <button
                        key={asset.id}
                        onClick={() => insertAsset(asset)}
                        className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:border-brand-400 hover:bg-brand-50 transition text-left"
                      >
                        {asset.mime_type?.startsWith("image/") ? (
                          <Image className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-700 truncate">
                          {asset.original_name}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving…"
                : editingTemplate
                ? "Update"
                : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setEditingTemplate(null);
                resetForm();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Super Admin — tenant tabs */}
      {isSuperAdmin && tenantTabs.length > 0 && (
        <div className="flex gap-2 border-b overflow-x-auto">
          <button
            onClick={() => setSelectedTenantTab("all")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedTenantTab === "all"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            All Tenants
          </button>
          {tenantTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTenantTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedTenantTab === tab.id
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
            ))
          : visibleTemplates.map((t) => (
              <div key={t.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPreviewTemplate(t)}>
                {/* Card header row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-medium text-gray-900 truncate">{t.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${categoryColors[t.category] || "bg-gray-100 text-gray-700"}`}
                      >
                        {t.category.replace("_", " ")}
                      </span>
                      {/* Owner tenant label */}
                      {isSuperAdmin && t.tenant && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {t.tenant.name}
                        </span>
                      )}
                      {/* Assigned-to tenant labels — shown inline beside the owner */}
                      {isSuperAdmin && selectedTenantTab === "all" &&
                        (t.assignedTenants || []).map((at) => (
                          <span
                            key={at.id}
                            className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"
                          >
                            <Building2 className="w-3 h-3" />
                            {at.name}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMetricsTemplate(t)}
                      className="p-1.5 hover:bg-brand-50 rounded"
                      title="View metrics"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-brand-500" />
                    </button>
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this template?")) deleteMutation.mutate(t.id);
                      }}
                      className="p-1.5 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>

                    {/* Assign dropdown — super admin only */}
                    {isSuperAdmin && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenAssignDropdown(
                              openAssignDropdown === t.id ? null : t.id
                            );
                          }}
                          className="p-1.5 hover:bg-blue-50 rounded flex items-center gap-0.5 text-brand-600"
                          title="Assign to tenant"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {openAssignDropdown === t.id && (
                          <div
                            className="absolute right-0 top-8 z-20 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                              <p className="text-xs font-semibold text-gray-600 uppercase">
                                Assign to Tenant
                              </p>
                              <button
                                onClick={() => setOpenAssignDropdown(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {assignableTenants(t).length === 0 ? (
                              <p className="text-xs text-gray-400 px-3 py-2">
                                Assigned to all tenants
                              </p>
                            ) : (
                              assignableTenants(t).map((tenant) => (
                                <button
                                  key={tenant.id}
                                  onClick={() =>
                                    assignMutation.mutate({
                                      id: t.id,
                                      tenant_id: tenant.id,
                                    })
                                  }
                                  disabled={assignMutation.isPending}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                  {tenant.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject */}
                {t.subject && (
                  <p className="text-sm text-gray-600 mb-2 truncate">{t.subject}</p>
                )}

                {/* Body preview */}
                <p className="text-xs text-gray-400 line-clamp-2">
                  {t.body?.replace(/<[^>]*>/g, "").substring(0, 100)}
                </p>

              </div>
            ))}
      </div>

      {!isLoading && visibleTemplates.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          No templates found.
        </div>
      )}

      <TemplateMetricsModal
        template={metricsTemplate}
        onClose={() => setMetricsTemplate(null)}
      />

      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onEdit={(t) => { setPreviewTemplate(null); handleEdit(t); }}
      />
    </div>
  );
}
