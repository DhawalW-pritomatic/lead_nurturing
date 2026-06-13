import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import Modal from "../../components/Modal";
import TemplateMetricsModal from "./TemplateMetricsModal";
import TemplatePreviewModal from "./TemplatePreviewModal";
import {
  Plus, Edit2, Trash2, Image, Paperclip, ChevronDown,
  Building2, X, BarChart2, Search, Mail, MessageCircle,
} from "lucide-react";

interface AssignedTenant { id: string; name: string; }

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

interface TenantOption { id: string; name: string; }

const categoryColors: Record<string, string> = {
  welcome:       "bg-green-100 text-green-700",
  onboarding:    "bg-blue-100 text-blue-700",
  follow_up:     "bg-purple-100 text-purple-700",
  discount:      "bg-amber-100 text-amber-700",
  post_purchase: "bg-teal-100 text-teal-700",
  reengagement:  "bg-orange-100 text-orange-700",
  general:       "bg-gray-100 text-gray-700",
};

const categories = [
  "welcome", "onboarding", "follow_up", "discount",
  "post_purchase", "reengagement", "general",
];

const WA_VARIABLES = [
  "{{lead.first_name}}", "{{lead.last_name}}", "{{lead.phone}}",
  "{{lead.company}}", "{{rep.name}}", "{{rep.phone}}",
];

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";

  const [activeChannelTab, setActiveChannelTab] = useState<"email" | "whatsapp">("email");
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [metricsTemplate, setMetricsTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [selectedTenantTab, setSelectedTenantTab] = useState<string>("all");
  const [openAssignDropdown, setOpenAssignDropdown] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", channel: "email", subject: "", body: "", category: "general",
  });

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
    onError: (err: any) => toast.error(err.response?.data?.error || "Assignment failed."),
  });

  const resetForm = () =>
    setForm({ name: "", channel: activeChannelTab, subject: "", body: "", category: "general" });

  const handleEdit = (t: Template) => {
    setEditingTemplate(t);
    setForm({
      name: t.name, channel: t.channel,
      subject: t.subject || "", body: t.body, category: t.category,
    });
  };

  const handleSave = () => {
    if (editingTemplate) updateMutation.mutate({ id: editingTemplate.id, ...form });
    else createMutation.mutate({ ...form, channel: activeChannelTab });
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

  const tenantTabs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of templates) {
      if (t.tenant && !seen.has(t.tenant.id)) seen.set(t.tenant.id, t.tenant.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [templates]);

  const visibleTemplates = useMemo(() => {
    let list = templates.filter((t) => t.channel === activeChannelTab);
    if (isSuperAdmin) {
      if (selectedTenantTab === "all") list = list.filter((t) => !t.assigned_from_id);
      else list = list.filter((t) => t.tenant_id === selectedTenantTab);
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
  }, [templates, isSuperAdmin, selectedTenantTab, searchQuery, activeChannelTab]);

  const assignableTenants = (template: Template) =>
    allTenants.filter(
      (t) =>
        t.id !== template.tenant_id &&
        !(template.assignedTenants || []).some((at) => at.id === t.id)
    );

  const isWhatsApp = activeChannelTab === "whatsapp";
  const modalChannel = editingTemplate ? editingTemplate.channel : activeChannelTab;

  return (
    <div className="space-y-6" onClick={() => setOpenAssignDropdown(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">
            {isWhatsApp
              ? "Manage WhatsApp message templates for outreach"
              : "Manage email templates for outreach and sequences"}
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
            onClick={() => { setShowCreate(true); setEditingTemplate(null); resetForm(); }}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {isWhatsApp ? "New WA Template" : "New Template"}
          </button>
        </div>
      </div>

      {/* Channel tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveChannelTab("email")}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeChannelTab === "email"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Templates
            <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {templates.filter((t) => t.channel === "email" && !t.assigned_from_id).length}
            </span>
          </button>
          <button
            onClick={() => setActiveChannelTab("whatsapp")}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeChannelTab === "whatsapp"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Templates
            <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {templates.filter((t) => t.channel === "whatsapp" && !t.assigned_from_id).length}
            </span>
          </button>
        </nav>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showCreate || !!editingTemplate}
        onClose={() => { setShowCreate(false); setEditingTemplate(null); resetForm(); }}
        title={
          editingTemplate
            ? `Edit ${modalChannel === "whatsapp" ? "WhatsApp" : "Email"} Template`
            : `Create ${isWhatsApp ? "WhatsApp" : "Email"} Template`
        }
        size="lg"
      >
        <div className="space-y-4">
          {/* Channel badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            modalChannel === "whatsapp"
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {modalChannel === "whatsapp"
              ? <><MessageCircle className="w-3.5 h-3.5" /> WhatsApp Channel</>
              : <><Mail className="w-3.5 h-3.5" /> Email Channel</>
            }
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Subject — email only */}
          {modalChannel !== "whatsapp" && (
            <input
              placeholder="Subject line (supports {{variables}})"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="input-field"
            />
          )}

          {/* WhatsApp variable chips */}
          {modalChannel === "whatsapp" && (
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Quick-insert variables:</p>
              <div className="flex flex-wrap gap-1.5">
                {WA_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, body: form.body + v })}
                    className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full hover:bg-green-100 transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <textarea
              placeholder={
                modalChannel === "whatsapp"
                  ? "Hi {{lead.first_name}}, this is {{rep.name}} from {{lead.company}}. Use plain text only — no HTML."
                  : "Email body (HTML supported, use {{lead.first_name}}, {{rep.name}}, {{company.name}}, {{tracking.cta_url}} etc.)"
              }
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="input-field w-full"
              rows={modalChannel === "whatsapp" ? 6 : 8}
            />
            {modalChannel === "whatsapp" && (
              <span className={`absolute bottom-2 right-3 text-xs ${form.body.length > 1024 ? "text-red-500" : "text-gray-400"}`}>
                {form.body.length}/1024
              </span>
            )}
          </div>

          {/* Asset picker — email only */}
          {modalChannel !== "whatsapp" && (
            <>
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
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Select an Asset</h4>
                  {!assets || assets.length === 0 ? (
                    <p className="text-sm text-gray-500">No assets available.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(Array.isArray(assets) ? assets : assets.assets || []).map((asset: any) => (
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
                          <span className="text-xs text-gray-700 truncate">{asset.original_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className={`disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                modalChannel === "whatsapp"
                  ? "bg-green-600 hover:bg-green-700"
                  : "btn-primary"
              }`}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving…"
                : editingTemplate ? "Update" : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setEditingTemplate(null); resetForm(); }}
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
              <div
                key={t.id}
                className={`card hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
                  t.channel === "whatsapp" ? "border-l-green-500" : "border-l-brand-500"
                }`}
                onClick={() => setPreviewTemplate(t)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      {t.channel === "whatsapp"
                        ? <MessageCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        : <Mail className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                      }
                      <h4 className="font-medium text-gray-900 truncate">{t.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[t.category] || "bg-gray-100 text-gray-700"}`}>
                        {t.category.replace(/_/g, " ")}
                      </span>
                      {isSuperAdmin && t.tenant && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {t.tenant.name}
                        </span>
                      )}
                      {isSuperAdmin && selectedTenantTab === "all" &&
                        (t.assignedTenants || []).map((at) => (
                          <span key={at.id} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {at.name}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {t.channel !== "whatsapp" && (
                      <button
                        onClick={() => setMetricsTemplate(t)}
                        className="p-1.5 hover:bg-brand-50 rounded"
                        title="View metrics"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-brand-500" />
                      </button>
                    )}
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

                    {isSuperAdmin && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenAssignDropdown(openAssignDropdown === t.id ? null : t.id);
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
                              <p className="text-xs font-semibold text-gray-600 uppercase">Assign to Tenant</p>
                              <button onClick={() => setOpenAssignDropdown(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {assignableTenants(t).length === 0 ? (
                              <p className="text-xs text-gray-400 px-3 py-2">Assigned to all tenants</p>
                            ) : (
                              assignableTenants(t).map((tenant) => (
                                <button
                                  key={tenant.id}
                                  onClick={() => assignMutation.mutate({ id: t.id, tenant_id: tenant.id })}
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

                {/* Subject (email) */}
                {t.subject && t.channel !== "whatsapp" && (
                  <p className="text-sm text-gray-600 mb-2 truncate">{t.subject}</p>
                )}

                {/* Body preview */}
                {t.channel === "whatsapp" ? (
                  <div className="bg-green-50 rounded-lg p-2.5 mt-1">
                    <p className="text-xs text-gray-700 line-clamp-3 font-mono whitespace-pre-wrap">
                      {t.body?.substring(0, 120)}{t.body?.length > 120 ? "…" : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {t.body?.replace(/<[^>]*>/g, "").substring(0, 100)}
                  </p>
                )}
              </div>
            ))}
      </div>

      {!isLoading && visibleTemplates.length === 0 && (
        <div className="card text-center py-12">
          {isWhatsApp ? (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <MessageCircle className="w-12 h-12 text-gray-200" />
              <p className="text-base font-medium">No WhatsApp templates yet</p>
              <p className="text-sm">Create your first WhatsApp message template to send via the outreach module.</p>
              <button
                onClick={() => { setShowCreate(true); setEditingTemplate(null); resetForm(); }}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create WhatsApp Template
              </button>
            </div>
          ) : (
            <p className="text-gray-400">No email templates found.</p>
          )}
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
