import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Plus, Play, BarChart3, Zap, Mail, Copy, Trash2, Edit3, X,
  Clock, PauseCircle, PlayCircle, UserMinus, Search, Users,
  FileText, MoreVertical,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BuilderStep {
  day: number;
  channel: string;
  template_id?: string;
  template_name?: string; // display-only, stripped before save
  template_category?: string;
  notes: string;
  track: "all" | "new" | "post_purchase";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  enrollment: "On Enrollment",
  score_change: "Score Change",
  failed: "Failed Lead",
  conversion: "On Conversion",
  lead_created: "Lead Created",
  status_change: "Status Change",
  score_threshold: "Score Threshold",
};

const LEAD_TYPE_COLORS: Record<string, string> = {
  COLD: "bg-blue-100 text-blue-700",
  WARM: "bg-orange-100 text-orange-700",
  HOT: "bg-red-100 text-red-700",
  CONVERTED: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  archived: "bg-red-100 text-red-700",
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-600",
  exited: "bg-gray-100 text-gray-500",
};

const TEMPLATE_CATEGORIES = [
  "welcome", "onboarding", "follow_up", "discount", "post_purchase", "reengagement",
];

// ── Template Picker (inline search) ──────────────────────────────────────────

function TemplatePicker({
  value,
  valueName,
  onSelect,
  onClear,
}: {
  value?: string;
  valueName?: string;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: tData } = useQuery({
    queryKey: ["templates-picker", search],
    queryFn: () => api.get("/templates", { params: { search, limit: 8, is_active: true } }).then((r) => r.data),
    enabled: open,
    staleTime: 30_000,
  });

  const templates: any[] = tData?.templates || (Array.isArray(tData) ? tData : []);

  if (value && valueName) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs min-w-0">
          <FileText className="w-3 h-3 text-blue-500 flex-shrink-0" />
          <span className="text-blue-800 font-medium truncate">{valueName}</span>
        </div>
        <button onClick={onClear} title="Remove template" className="text-gray-400 hover:text-red-500 flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg focus-within:ring-1 focus-within:ring-brand-400 focus-within:border-brand-400 bg-white">
        <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search templates…"
          className="flex-1 text-xs text-gray-700 placeholder-gray-400 outline-none bg-transparent min-w-0"
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {templates.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-3 text-center">
              {search ? "No templates found" : "Start typing to search…"}
            </p>
          ) : (
            templates.map((t: any) => (
              <button
                key={t.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(t.id, t.name); setSearch(""); setOpen(false); }}
                className="w-full flex items-start gap-2 px-3 py-2 hover:bg-brand-50 text-left"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{t.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{t.subject || t.category || "Email template"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Step Row (visual timeline) ────────────────────────────────────────────────

function StepRow({
  step,
  index,
  totalSteps,
  onChange,
  onRemove,
}: {
  step: BuilderStep;
  index: number;
  totalSteps: number;
  onChange: (field: keyof BuilderStep, value: any) => void;
  onRemove: () => void;
}) {
  const [categoryMode, setCategoryMode] = useState(!step.template_id);

  return (
    <div className="flex gap-3">
      {/* Spine */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold z-10">
          {index + 1}
        </div>
        {index < totalSteps - 1 && (
          <div className="w-px flex-1 bg-brand-200 mt-1" style={{ minHeight: 20 }} />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          {/* Row 1: day · channel · toggle · remove */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-brand-50 border border-brand-100 rounded-lg">
              <Clock className="w-3 h-3 text-brand-500" />
              <span className="text-xs text-gray-500">Day</span>
              <input
                type="number"
                value={step.day}
                min={0}
                onChange={(e) => onChange("day", Math.max(0, +e.target.value))}
                className="w-9 text-xs font-bold text-brand-700 bg-transparent outline-none text-center"
              />
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg">
              <Mail className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-700 font-medium">Email</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setCategoryMode(!categoryMode);
                  if (!categoryMode) onChange("template_id", undefined);
                  else onChange("template_category", undefined);
                }}
                className="text-[10px] text-gray-400 hover:text-brand-600 underline whitespace-nowrap"
              >
                {categoryMode ? "Pick template" : "Use category"}
              </button>
              <button onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: template */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-14 flex-shrink-0">Template</span>
            {categoryMode ? (
              <select
                value={step.template_category || "follow_up"}
                onChange={(e) => onChange("template_category", e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            ) : (
              <TemplatePicker
                value={step.template_id}
                valueName={step.template_name}
                onSelect={(id, name) => {
                  onChange("template_id", id);
                  onChange("template_name", name);
                  onChange("template_category", undefined);
                }}
                onClear={() => {
                  onChange("template_id", undefined);
                  onChange("template_name", undefined);
                }}
              />
            )}
          </div>

          {/* Row 3: track + notes */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-14 flex-shrink-0">Track</span>
            <select
              value={step.track || "all"}
              onChange={(e) => onChange("track", e.target.value as BuilderStep["track"])}
              className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 w-36"
            >
              <option value="all">All leads</option>
              <option value="new">New leads only</option>
              <option value="post_purchase">Post-purchase only</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-14 flex-shrink-0">Note</span>
            <input
              type="text"
              value={step.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              placeholder="Internal note (not sent to lead)"
              className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sequence Builder Modal ────────────────────────────────────────────────────

function SequenceBuilder({
  initial,
  onClose,
  onSave,
  isPending,
}: {
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const isEdit = !!initial;

  const normaliseSteps = (raw: any[]): BuilderStep[] =>
    (raw || []).map((s: any) => ({
      day: s.day ?? s.day_offset ?? 0,
      channel: s.channel || "email",
      template_id: s.template_id,
      template_name: s.template_name,
      template_category: s.template_category || "follow_up",
      notes: s.notes || "",
      track: (["new", "post_purchase"].includes(s.track) ? s.track : "all") as BuilderStep["track"],
    }));

  const [form, setForm] = useState({
    name: initial?.name || "",
    trigger_type: initial?.trigger_type || "enrollment",
    lead_type_target: initial?.lead_type_target || "COLD",
    cold_followup_until_days: initial?.cold_followup_until_days || 30,
    cold_followup_template_ids: (initial?.cold_followup_template_ids || []).join(", "),
  });

  const [steps, setSteps] = useState<BuilderStep[]>(
    normaliseSteps(initial?.steps?.length ? initial.steps : [{ day: 0, channel: "email", template_category: "welcome", notes: "", track: "all" }])
  );

  const addStep = () => {
    const lastDay = steps.length > 0 ? (steps[steps.length - 1].day + 2) : 0;
    setSteps((p) => [...p, { day: lastDay, channel: "email", template_category: "follow_up", notes: "", track: "all" }]);
  };

  const updateStep = (i: number, field: keyof BuilderStep, value: any) => {
    setSteps((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Sequence name is required."); return; }
    if (steps.length === 0) { toast.error("Add at least one step."); return; }
    // Strip template_name (display-only) before sending to backend
    const cleanSteps = steps.map(({ template_name: _tn, ...s }) => s);
    onSave({
      ...form,
      cold_followup_template_ids: form.cold_followup_template_ids
        .split(",").map((v: string) => v.trim()).filter(Boolean),
      steps: cleanSteps,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? `Edit Sequence — ${initial.name}` : "New Sequence"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sequence Name *</label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. New Lead Welcome Series"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Trigger</label>
              <select
                value={form.trigger_type}
                onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Target Lead Type</label>
              <select
                value={form.lead_type_target}
                onChange={(e) => setForm({ ...form, lead_type_target: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {["COLD", "WARM", "HOT", "FAILED", "CONVERTED"].map((v) => (
                  <option key={v} value={v}>
                    {v === "FAILED" ? "Failed" : v.charAt(0) + v.slice(1).toLowerCase()} leads
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Steps timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800">Steps</h3>
              <span className="text-xs text-gray-400">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
                <Mail className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No steps yet. Add your first email step below.</p>
              </div>
            ) : (
              <div>
                {steps.map((step, i) => (
                  <StepRow
                    key={i}
                    step={step}
                    index={i}
                    totalSteps={steps.length}
                    onChange={(field, value) => updateStep(i, field, value)}
                    onRemove={() => setSteps((p) => p.filter((_, idx) => idx !== i))}
                  />
                ))}
              </div>
            )}

            <button
              onClick={addStep}
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium mt-1"
            >
              <Plus className="w-4 h-4" /> Add Step
            </button>
          </div>

          {/* Cold follow-up loop */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Cold Follow-up Loop</h3>
            <p className="text-xs text-gray-400 mb-3">
              After all steps complete for COLD leads, rotate through these templates until the time limit.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Continue for (days)</label>
                <input
                  type="number"
                  min={1}
                  value={form.cold_followup_until_days}
                  onChange={(e) => setForm({ ...form, cold_followup_until_days: +e.target.value || 30 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Template IDs (comma-sep)</label>
                <input
                  value={form.cold_followup_template_ids}
                  onChange={(e) => setForm({ ...form, cold_followup_template_ids: e.target.value })}
                  placeholder="uuid1, uuid2, …"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !form.name.trim() || steps.length === 0}
            className="ml-auto flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPending
              ? (isEdit ? "Saving…" : "Creating…")
              : (isEdit ? "Save Changes" : "Create Sequence")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Analytics Panel ───────────────────────────────────────────────────────────

function AnalyticsPanel({ sequenceId, onClose }: { sequenceId: string; onClose: () => void }) {
  const { data, isFetching } = useQuery({
    queryKey: ["sequence-analytics", sequenceId],
    queryFn: () => api.get(`/sequences/${sequenceId}/analytics`).then((r) => r.data),
    staleTime: 60_000,
  });

  const funnel = data?.enrollment_funnel || {};

  return (
    <div className="bg-white border border-brand-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-500" />
          <h3 className="font-bold text-gray-900">{data?.sequence?.name || "Sequence Analytics"}</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isFetching ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : (
        <>
          {/* Funnel */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: "Enrolled",  value: funnel.total_started || 0,     cls: "text-gray-900" },
              { label: "Active",    value: funnel.active || 0,            cls: "text-blue-600" },
              { label: "Completed", value: funnel.completed || 0,         cls: "text-green-600" },
              { label: "Exited",    value: funnel.exited || 0,            cls: "text-gray-500" },
              { label: "Converted", value: funnel.converted || 0,         cls: "text-green-700 font-bold" },
              { label: "Conv. %",   value: `${funnel.conversion_rate || "0.0"}%`, cls: "text-brand-600 font-bold" },
            ].map((s) => (
              <div key={s.label} className="text-center p-2 bg-gray-50 rounded-xl">
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Step performance table */}
          {(data?.step_performance || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Step", "Sent", "Opened", "Clicked", "Open %", "Click %"].map((h) => (
                      <th key={h} className={`py-2 font-semibold text-gray-400 ${h === "Step" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.step_performance as any[]).map((step) => (
                    <tr key={step.step_index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 font-medium text-gray-900">
                        Step {step.step_index + 1}
                        <span className="text-gray-400 font-normal ml-1">(Day {step.day_offset ?? "—"})</span>
                      </td>
                      <td className="py-1.5 text-right">{step.sent}</td>
                      <td className="py-1.5 text-right">{step.opened}</td>
                      <td className="py-1.5 text-right">{step.clicked}</td>
                      <td className="py-1.5 text-right text-green-600 font-semibold">
                        {step.sent > 0 ? `${Math.round((step.opened / step.sent) * 100)}%` : "—"}
                      </td>
                      <td className="py-1.5 text-right text-blue-600 font-semibold">
                        {step.sent > 0 ? `${Math.round((step.clicked / step.sent) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Exit reasons */}
          {data?.exit_reasons && Object.keys(data.exit_reasons).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Exit Reasons</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.exit_reasons as Record<string, number>).map(([reason, count]) => (
                  <span key={reason} className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg text-gray-600">
                    {reason.replace(/_/g, " ")}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sequence Card ─────────────────────────────────────────────────────────────

function SequenceCard({
  seq,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  onViewAnalytics,
  isAnalyticsActive,
}: {
  seq: any;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onViewAnalytics: () => void;
  isAnalyticsActive: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md ${isAnalyticsActive ? "border-brand-300 ring-1 ring-brand-200" : "border-gray-200"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{seq.name}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[seq.status] || STATUS_COLORS.draft}`}>
              {seq.status}
            </span>
            <span className="text-xs text-gray-400">{TRIGGER_LABELS[seq.trigger_type] || seq.trigger_type}</span>
            {seq.lead_type_target && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${LEAD_TYPE_COLORS[seq.lead_type_target] || "bg-gray-100 text-gray-600"}`}>
                {seq.lead_type_target}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 w-44 bg-white border border-gray-200 rounded-xl shadow-2xl z-20 py-1 text-sm"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
                <Edit3 className="w-3.5 h-3.5 text-gray-400" /> Edit
              </button>
              <button onClick={() => { onClone(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
                <Copy className="w-3.5 h-3.5 text-gray-400" /> Clone
              </button>
              <button onClick={() => { onToggleStatus(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
                {seq.status === "active"
                  ? <><PauseCircle className="w-3.5 h-3.5 text-yellow-500" /> Set to Draft</>
                  : <><PlayCircle className="w-3.5 h-3.5 text-green-500" /> Activate</>
                }
              </button>
              <hr className="my-1 border-gray-100" />
              <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Steps preview (visual dots) */}
      <div className="space-y-1.5 mb-4 min-h-[3.5rem]">
        {(seq.steps || []).length === 0 ? (
          <p className="text-xs text-gray-300 italic">No steps configured</p>
        ) : (
          (seq.steps as any[]).slice(0, 5).map((step: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-[9px] font-bold text-brand-600 flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-gray-400 w-10 flex-shrink-0">Day {step.day ?? step.day_offset ?? "?"}</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium flex-shrink-0">email</span>
              <span className="text-gray-500 truncate">
                {step.template_name || (step.template_category ? step.template_category.replace(/_/g, " ") : step.template_id?.slice(0, 8) || "—")}
              </span>
            </div>
          ))
        )}
        {(seq.steps || []).length > 5 && (
          <p className="text-xs text-gray-400 pl-7">+{seq.steps.length - 5} more steps</p>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Users className="w-3 h-3" />
          <span>{seq.enrollments?.length || 0} enrolled</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Zap className="w-3 h-3" />
          <span>{(seq.steps || []).length} steps</span>
        </div>
        <button
          onClick={onViewAnalytics}
          className={`ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            isAnalyticsActive
              ? "bg-brand-600 text-white"
              : "bg-brand-50 text-brand-600 hover:bg-brand-100"
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          Analytics
        </button>
      </div>
    </div>
  );
}

// ── Enrollments Section ───────────────────────────────────────────────────────

function EnrollmentsSection({ sequences }: { sequences: any[] }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"active" | "paused" | "completed" | "all">("active");

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => api.get("/sequences/enrollments").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const seqStepCount = useMemo(() => {
    const map: Record<string, number> = {};
    sequences.forEach((s: any) => { map[s.id] = (s.steps || []).length; });
    return map;
  }, [sequences]);

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sequences/enrollments/${id}/pause`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enrollments"] }); toast.success("Paused."); },
  });
  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sequences/enrollments/${id}/resume`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enrollments"] }); toast.success("Resumed."); },
  });
  const unenrollMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sequences/enrollments/${id}/unenroll`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enrollments"] }); toast.success("Lead unenrolled."); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to unenroll."),
  });

  const allEnrollments: any[] = enrollments || [];
  if (allEnrollments.length === 0) return null;

  const filtered = statusFilter === "all"
    ? allEnrollments
    : allEnrollments.filter((e: any) => e.status === statusFilter);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-500" />
          Enrollments
          <span className="text-sm font-normal text-gray-400">({allEnrollments.length})</span>
        </h3>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {(["active", "paused", "completed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Lead", "Sequence", "Progress", "Next Step", "Status", ""].map((h, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide ${i === 5 ? "text-right pr-5" : "text-left"} ${i === 0 ? "pl-5" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.slice(0, 25).map((e: any) => {
              const totalSteps = seqStepCount[e.sequence_id] || 0;
              const progress = totalSteps > 0 ? Math.min(100, (e.current_step / totalSteps) * 100) : 0;
              const nextAt = e.next_step_at ? new Date(e.next_step_at) : null;
              const isOverdue = nextAt && nextAt < new Date() && e.status === "active";

              return (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="pl-5 pr-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{e.lead?.first_name} {e.lead?.last_name}</p>
                    <p className="text-xs text-gray-400">{e.lead?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 font-medium">{e.sequence?.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {e.current_step}/{totalSteps || "?"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {nextAt ? (
                      <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-500"}`}>
                        {nextAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {" "}{nextAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {isOverdue && <span className="ml-1 text-red-400">(overdue)</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENROLLMENT_STATUS_COLORS[e.status] || "bg-gray-100 text-gray-500"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="pr-5 pl-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {e.status === "active" && (
                        <button
                          onClick={() => pauseMutation.mutate(e.id)}
                          disabled={pauseMutation.isPending}
                          title="Pause enrollment"
                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      )}
                      {e.status === "paused" && (
                        <button
                          onClick={() => resumeMutation.mutate(e.id)}
                          disabled={resumeMutation.isPending}
                          title="Resume enrollment"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}
                      {(e.status === "active" || e.status === "paused") && (
                        <button
                          onClick={() => unenrollMutation.mutate(e.id)}
                          disabled={unenrollMutation.isPending}
                          title="Unenroll lead"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">
            No {statusFilter === "all" ? "" : statusFilter + " "}enrollments
          </p>
        )}
        {filtered.length > 25 && (
          <p className="text-center text-xs text-gray-400 py-3 border-t border-gray-50">
            Showing 25 of {filtered.length} — filter by status to narrow down
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SequencesPage() {
  const qc = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<any>(null);
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [enrollForm, setEnrollForm] = useState({ lead_id: "", sequence_id: "", force_restart: false });

  const { data: sequences, isLoading } = useQuery({
    queryKey: ["sequences"],
    queryFn: () => api.get("/sequences").then((r) => r.data),
  });

  const { data: analyticsOverview } = useQuery({
    queryKey: ["sequences-analytics-overview"],
    queryFn: () => api.get("/sequences/analytics/overview").then((r) => r.data),
  });

  const { data: leadsData } = useQuery({
    queryKey: ["leads-list-seq"],
    queryFn: () => api.get("/leads?limit=200").then((r) => r.data?.leads || r.data),
    staleTime: 60_000,
  });

  const allLeads: any[] = Array.isArray(leadsData) ? leadsData : (leadsData?.leads || []);
  const seqList: any[] = Array.isArray(sequences) ? sequences : [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/sequences", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      qc.invalidateQueries({ queryKey: ["sequences-analytics-overview"] });
      toast.success("Sequence created.");
      setBuilderOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to create."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/sequences/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequence saved.");
      setBuilderOpen(false);
      setEditingSequence(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sequences/${id}/clone`).then((r) => r.data),
    onSuccess: (cloned: any) => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success(`Cloned as "${cloned.name}".`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to clone."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sequences/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sequences"] }); toast.success("Deleted."); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to delete."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/sequences/${id}`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed."),
  });

  const startMutation = useMutation({
    mutationFn: (data: any) => api.post("/sequences/start", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Enrolled successfully.");
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["sequences-analytics-overview"] });
      setEnrollForm({ lead_id: "", sequence_id: "", force_restart: false });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to enroll."),
  });

  const handleSave = (data: any) => {
    if (editingSequence) {
      updateMutation.mutate({ id: editingSequence.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this sequence? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (seq: any) => {
    const newStatus = seq.status === "active" ? "draft" : "active";
    statusMutation.mutate({ id: seq.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sequences</h1>
          <p className="text-sm text-gray-500 mt-1">Automated multi-step drip campaigns for lead nurturing</p>
        </div>
        <button
          onClick={() => { setEditingSequence(null); setBuilderOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Sequence
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sequences",    value: analyticsOverview?.sequences?.total || 0 },
          { label: "Active",             value: analyticsOverview?.sequences?.active || 0 },
          { label: "Total Enrollments",  value: analyticsOverview?.enrollments?.total || 0 },
          { label: "Leads Converted",    value: analyticsOverview?.enrollments?.converted_leads || 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Enroll a lead */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Play className="w-4 h-4 text-brand-500" /> Enroll a Lead
        </h3>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-44">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Lead</label>
            <select
              value={enrollForm.lead_id}
              onChange={(e) => setEnrollForm((p) => ({ ...p, lead_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select lead…</option>
              {allLeads.map((lead: any) => (
                <option key={lead.id} value={lead.id}>
                  {lead.first_name} {lead.last_name} ({lead.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-44">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Sequence</label>
            <select
              value={enrollForm.sequence_id}
              onChange={(e) => setEnrollForm((p) => ({ ...p, sequence_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select sequence…</option>
              {seqList.filter((s) => s.status === "active").map((seq) => (
                <option key={seq.id} value={seq.id}>{seq.name}</option>
              ))}
            </select>
          </div>
          <div className="pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enrollForm.force_restart}
                onChange={(e) => setEnrollForm((p) => ({ ...p, force_restart: e.target.checked }))}
                className="rounded"
              />
              Force restart if active
            </label>
          </div>
          <button
            onClick={() => startMutation.mutate(enrollForm)}
            disabled={!enrollForm.lead_id || !enrollForm.sequence_id || startMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Play className="w-4 h-4" />
            {startMutation.isPending ? "Enrolling…" : "Enroll"}
          </button>
        </div>
      </div>

      {/* Sequence cards */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading sequences…</div>
      ) : seqList.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-xl">
          <Zap className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No sequences yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Create your first sequence to start automating lead nurturing.</p>
          <button
            onClick={() => { setEditingSequence(null); setBuilderOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" /> New Sequence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {seqList.map((seq) => (
            <SequenceCard
              key={seq.id}
              seq={seq}
              onEdit={() => { setEditingSequence(seq); setBuilderOpen(true); }}
              onClone={() => cloneMutation.mutate(seq.id)}
              onDelete={() => handleDelete(seq.id)}
              onToggleStatus={() => handleToggleStatus(seq)}
              onViewAnalytics={() => setAnalyticsId(analyticsId === seq.id ? null : seq.id)}
              isAnalyticsActive={analyticsId === seq.id}
            />
          ))}
        </div>
      )}

      {/* Analytics panel */}
      {analyticsId && (
        <AnalyticsPanel sequenceId={analyticsId} onClose={() => setAnalyticsId(null)} />
      )}

      {/* Enrollments */}
      <EnrollmentsSection sequences={seqList} />

      {/* Builder modal */}
      {builderOpen && (
        <SequenceBuilder
          initial={editingSequence}
          onClose={() => { setBuilderOpen(false); setEditingSequence(null); }}
          onSave={handleSave}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
