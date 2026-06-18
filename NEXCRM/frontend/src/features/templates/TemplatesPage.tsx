import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Image, Paperclip } from "lucide-react";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [form, setForm] = useState({
    name: "",
    channel: "email",
    subject: "",
    body: "",
    category: "general",
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get("/templates").then((r) => r.data),
  });

  const { data: assets } = useQuery({
    queryKey: ["template-assets"],
    queryFn: () => api.get("/assets").then((r) => r.data),
  });

  const { data: s3Assets = [] } = useQuery<any[]>({
    queryKey: ["s3-assets"],
    queryFn: () => api.get("/uploads").then((r) => r.data),
  });

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

  const resetForm = () =>
    setForm({
      name: "",
      channel: "email",
      subject: "",
      body: "",
      category: "general",
    });

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      channel: template.channel,
      subject: template.subject || "",
      body: template.body,
      category: template.category,
    });
  };

  const handleSave = () => {
    if (editingTemplate)
      updateMutation.mutate({ id: editingTemplate.id, ...form });
    else createMutation.mutate(form);
  };

  const insertAsset = (asset: any) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const assetUrl = `${baseUrl}/uploads/assets/${asset.filename}`;
    const isImage = asset.mime_type?.startsWith("image/");
    const snippet = isImage
      ? `<img src="${assetUrl}" alt="${asset.original_name}" style="max-width:100%;height:auto;" />`
      : `<a href="${assetUrl}" target="_blank">${asset.original_name}</a>`;
    setForm((prev) => ({ ...prev, body: prev.body + "\n" + snippet }));
    setShowAssetPicker(false);
    toast.success(`Asset "${asset.original_name}" inserted.`);
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
  const categoryColors: Record<string, string> = {
    welcome: "bg-green-100 text-green-700",
    onboarding: "bg-blue-100 text-blue-700",
    follow_up: "bg-purple-100 text-purple-700",
    discount: "bg-amber-100 text-amber-700",
    post_purchase: "bg-teal-100 text-teal-700",
    reengagement: "bg-orange-100 text-orange-700",
    general: "bg-gray-100 text-gray-700",
  };

  const localAssets = Array.isArray(assets) ? assets : assets?.assets || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">
            Manage email templates for outreach and sequences
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingTemplate(null);
            resetForm();
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {(showCreate || editingTemplate) && (
        <div className="card space-y-4">
          <h3 className="font-semibold">
            {editingTemplate ? "Edit Template" : "Create Template"}
          </h3>
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

          {/* Asset picker */}
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
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-72 overflow-y-auto space-y-4">
              {/* Local Assets */}
              {localAssets.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Local Assets
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {localAssets.map((asset: any) => (
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
                    ))}
                  </div>
                </div>
              )}

              {/* S3 Library */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  S3 Library
                </h4>
                {s3Assets.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No S3 files uploaded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {s3Assets.map((asset: any) => {
                      const serveUrl = `${import.meta.env.VITE_API_URL}/api/uploads/serve/${asset.id}`;
                      const link = asset.mime_type?.startsWith("image/")
                        ? `<img src="${serveUrl}" alt="${asset.original_name}" style="max-width:100%;height:auto;" />`
                        : `<a href="${serveUrl}" target="_blank">${asset.original_name}</a>`;
                      return (
                        <button
                          key={asset.id}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              body: prev.body + "\n" + link,
                            }));
                            setShowAssetPicker(false);
                            toast.success(`"${asset.original_name}" inserted.`);
                          }}
                          className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded hover:border-brand-400 hover:bg-brand-50 transition text-left"
                        >
                          {asset.mime_type?.startsWith("image/") ? (
                            <Image className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          ) : (
                            <Paperclip className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          )}
                          <span className="text-xs text-gray-700 truncate">
                            {asset.original_name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {localAssets.length === 0 && s3Assets.length === 0 && (
                <p className="text-sm text-gray-500">
                  No assets available. Upload assets in the Assets section first.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary">
              {editingTemplate ? "Update" : "Create"}
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 bg-gray-200 rounded-xl animate-pulse"
              ></div>
            ))
          : (templates || []).map((t: any) => (
              <div
                key={t.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{t.name}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${categoryColors[t.category] || "bg-gray-100 text-gray-700"}`}
                    >
                      {t.category.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this template?"))
                          deleteMutation.mutate(t.id);
                      }}
                      className="p-1.5 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                {t.subject && (
                  <p className="text-sm text-gray-600 mb-2 truncate">
                    {t.subject}
                  </p>
                )}
                <p className="text-xs text-gray-400 line-clamp-2">
                  {t.body?.replace(/<[^>]*>/g, "").substring(0, 100)}
                </p>
              </div>
            ))}
      </div>
    </div>
  );
}
