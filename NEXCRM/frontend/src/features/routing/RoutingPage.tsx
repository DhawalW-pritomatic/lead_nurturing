import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Plus, GitBranch, ToggleLeft, ToggleRight, Trash2, Edit3, Copy,
  ChevronUp, ChevronDown, X, Search, Play, Activity, AlertCircle,
  CheckCircle2, ArrowRight, Zap, Users, UserCheck, List,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Condition {
  field: string;
  op: string;
  value: string | number;
}

interface ConditionExpression {
  operator: "AND" | "OR";
  conditions: Condition[];
}

interface ActionConfig {
  action: string;
  rep_id?: string;
  pool_rep_ids?: string[];
  last_assigned_index?: number;
  sequence_id?: string;
  create_task?: boolean;
  task_title?: string;
}

interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  condition_expression: ConditionExpression;
  action_config: ActionConfig;
  priority: number;
  is_active: boolean;
  match_count: number;
  created_at: string;
}

interface RoutingLog {
  id: string;
  action_taken: string;
  triggered_by: string;
  created_at: string;
  lead: { id: string; first_name: string; last_name: string; email: string };
  rule: { id: string; name: string };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CONDITION_FIELDS = [
  { value: "score", label: "Score", type: "number" },
  { value: "lead_type", label: "Lead Type", type: "select", options: ["COLD", "WARM", "HOT", "FAILED", "CONVERTED", "LOST"] },
  { value: "status", label: "Status", type: "select", options: ["NEW", "ACTIVE", "ENGAGED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "FAILED"] },
  { value: "source", label: "Source", type: "text" },
  { value: "days_inactive", label: "Days Inactive", type: "number" },
  { value: "days_since_created", label: "Days Since Created", type: "number" },
];

const NUM_OPS = [
  { value: ">=", label: "≥" },
  { value: "<=", label: "≤" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
];

const STR_OPS = [
  { value: "==", label: "equals" },
  { value: "!=", label: "not equals" },
  { value: "contains", label: "contains" },
];

const SEL_OPS = [
  { value: "==", label: "is" },
  { value: "!=", label: "is not" },
];

const FIELD_LABELS: Record<string, string> = {
  score: "Score",
  lead_type: "Lead Type",
  status: "Status",
  source: "Source",
  days_inactive: "Days Inactive",
  days_since_created: "Days Since Created",
};

const OP_LABELS: Record<string, string> = {
  ">=": "≥", "<=": "≤", ">": ">", "<": "<", "==": "is", "!=": "≠", "contains": "contains",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function conditionSummary(expr: ConditionExpression): string {
  if (!expr.conditions || expr.conditions.length === 0) return "All leads";
  const parts = expr.conditions.map(
    c => `${FIELD_LABELS[c.field] || c.field} ${OP_LABELS[c.op] || c.op} ${c.value}`
  );
  return parts.join(` ${expr.operator} `);
}

function actionSummary(cfg: ActionConfig, reps: any[], sequences: any[]): string {
  switch (cfg.action) {
    case "assign_rep": {
      const rep = reps.find(r => r.id === cfg.rep_id);
      return rep ? `Assign to ${rep.first_name} ${rep.last_name}` : "Assign to rep";
    }
    case "assign_round_robin": {
      const names = (cfg.pool_rep_ids || [])
        .map(id => { const r = reps.find(u => u.id === id); return r ? r.first_name : "?"; })
        .join(", ");
      return `Round-Robin: ${names || "empty pool"}`;
    }
    case "enroll_sequence": {
      const seq = sequences.find(s => s.id === cfg.sequence_id);
      return seq ? `Enroll in "${seq.name}"` : "Enroll in sequence";
    }
    case "mark_failed": return "Mark as Failed";
    case "create_task": return `Create Task${cfg.task_title ? `: "${cfg.task_title}"` : ""}`;
    default: return cfg.action;
  }
}

function actionIcon(action: string) {
  switch (action) {
    case "assign_rep": return <UserCheck className="w-4 h-4 text-blue-500" />;
    case "assign_round_robin": return <Users className="w-4 h-4 text-purple-500" />;
    case "enroll_sequence": return <Zap className="w-4 h-4 text-amber-500" />;
    case "mark_failed": return <AlertCircle className="w-4 h-4 text-red-500" />;
    case "create_task": return <List className="w-4 h-4 text-green-500" />;
    default: return <GitBranch className="w-4 h-4 text-gray-400" />;
  }
}

function defaultCondition(): Condition {
  return { field: "score", op: ">=", value: 80 };
}

function defaultForm() {
  return {
    name: "",
    description: "",
    priority: 1,
    condition_expression: { operator: "AND" as "AND" | "OR", conditions: [defaultCondition()] },
    action_config: { action: "assign_rep", rep_id: "", pool_rep_ids: [] as string[], sequence_id: "", create_task: false, task_title: "" } as ActionConfig,
  };
}

// ── Condition Row Component ────────────────────────────────────────────────────

function ConditionRow({
  condition, index, onUpdate, onRemove, canRemove,
}: {
  condition: Condition;
  index: number;
  onUpdate: (idx: number, c: Condition) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
}) {
  const fieldDef = CONDITION_FIELDS.find(f => f.value === condition.field);
  const ops = fieldDef?.type === "number" ? NUM_OPS
    : fieldDef?.type === "select" ? SEL_OPS
    : STR_OPS;

  const update = (patch: Partial<Condition>) => onUpdate(index, { ...condition, ...patch });

  // Reset op when field type changes
  const changeField = (field: string) => {
    const def = CONDITION_FIELDS.find(f => f.value === field);
    const op = def?.type === "number" ? ">=" : "==";
    const value = def?.type === "number" ? 0 : def?.type === "select" ? (def.options?.[0] || "") : "";
    onUpdate(index, { field, op, value });
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <select
        value={condition.field}
        onChange={e => changeField(e.target.value)}
        className="input-field text-sm flex-1 min-w-0"
      >
        {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select
        value={condition.op}
        onChange={e => update({ op: e.target.value })}
        className="input-field text-sm w-28"
      >
        {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {fieldDef?.type === "select" ? (
        <select
          value={condition.value as string}
          onChange={e => update({ value: e.target.value })}
          className="input-field text-sm flex-1 min-w-0"
        >
          {(fieldDef.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : fieldDef?.type === "number" ? (
        <input
          type="number"
          value={condition.value as number}
          onChange={e => update({ value: Number(e.target.value) })}
          className="input-field text-sm w-24"
        />
      ) : (
        <input
          type="text"
          value={condition.value as string}
          onChange={e => update({ value: e.target.value })}
          placeholder="value"
          className="input-field text-sm flex-1 min-w-0"
        />
      )}

      {canRemove && (
        <button onClick={() => onRemove(index)} className="p-1 hover:bg-red-100 rounded text-red-400">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Action Config Component ────────────────────────────────────────────────────

function ActionConfigPanel({
  config, onChange, reps, sequences,
}: {
  config: ActionConfig;
  onChange: (c: ActionConfig) => void;
  reps: any[];
  sequences: any[];
}) {
  const set = (patch: Partial<ActionConfig>) => onChange({ ...config, ...patch });

  const togglePoolRep = (id: string) => {
    const pool = config.pool_rep_ids || [];
    set({ pool_rep_ids: pool.includes(id) ? pool.filter(r => r !== id) : [...pool, id] });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Action Type</label>
        <select
          value={config.action}
          onChange={e => set({ action: e.target.value, rep_id: "", pool_rep_ids: [], sequence_id: "" })}
          className="input-field mt-1"
        >
          <option value="assign_rep">Assign to Specific Rep</option>
          <option value="assign_round_robin">Round-Robin Assignment</option>
          <option value="enroll_sequence">Enroll in Sequence</option>
          <option value="mark_failed">Mark as Failed</option>
          <option value="create_task">Create Task</option>
        </select>
      </div>

      {config.action === "assign_rep" && (
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Assign to Rep</label>
          <select
            value={config.rep_id || ""}
            onChange={e => set({ rep_id: e.target.value })}
            className="input-field mt-1"
          >
            <option value="">— Select rep —</option>
            {reps.map(r => (
              <option key={r.id} value={r.id}>{r.first_name} {r.last_name} ({r.email})</option>
            ))}
          </select>
        </div>
      )}

      {config.action === "assign_round_robin" && (
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Rep Pool ({(config.pool_rep_ids || []).length} selected)
          </label>
          <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
            {reps.map(r => (
              <label key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(config.pool_rep_ids || []).includes(r.id)}
                  onChange={() => togglePoolRep(r.id)}
                  className="rounded"
                />
                <span className="text-sm">{r.first_name} {r.last_name}</span>
                <span className="text-xs text-gray-400">{r.email}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {config.action === "enroll_sequence" && (
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sequence</label>
          <select
            value={config.sequence_id || ""}
            onChange={e => set({ sequence_id: e.target.value })}
            className="input-field mt-1"
          >
            <option value="">— Select sequence —</option>
            {sequences.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {(config.action === "assign_rep" || config.action === "assign_round_robin") && (
        <div className="flex items-center gap-3 pt-1">
          <input
            id="create_task"
            type="checkbox"
            checked={!!config.create_task}
            onChange={e => set({ create_task: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="create_task" className="text-sm text-gray-700 cursor-pointer">Create follow-up task for assigned rep</label>
        </div>
      )}

      {(config.action === "create_task" || config.create_task) && (
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Task Title</label>
          <input
            type="text"
            value={config.task_title || ""}
            onChange={e => set({ task_title: e.target.value })}
            placeholder="e.g. Follow up with lead"
            className="input-field mt-1"
          />
        </div>
      )}
    </div>
  );
}

// ── Rule Builder Modal ─────────────────────────────────────────────────────────

function RuleBuilderModal({
  open,
  editing,
  onClose,
  reps,
  sequences,
}: {
  open: boolean;
  editing?: RoutingRule | null;
  onClose: () => void;
  reps: any[];
  sequences: any[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm());

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description || "",
        priority: editing.priority,
        condition_expression: {
          operator: editing.condition_expression.operator,
          conditions: editing.condition_expression.conditions.map(c => ({ ...c })),
        },
        action_config: { ...editing.action_config } as ActionConfig,
      });
    } else {
      setForm(defaultForm());
    }
  }, [editing, open]);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editing
        ? api.put(`/routing/${editing.id}`, data).then(r => r.data)
        : api.post("/routing", data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success(editing ? "Rule updated." : "Rule created.");
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Save failed"),
  });

  const updateCondition = (idx: number, c: Condition) => {
    const conditions = [...form.condition_expression.conditions];
    conditions[idx] = c;
    setForm(f => ({ ...f, condition_expression: { ...f.condition_expression, conditions } }));
  };

  const removeCondition = (idx: number) => {
    const conditions = form.condition_expression.conditions.filter((_, i) => i !== idx);
    setForm(f => ({ ...f, condition_expression: { ...f.condition_expression, conditions } }));
  };

  const addCondition = () => {
    setForm(f => ({
      ...f,
      condition_expression: {
        ...f.condition_expression,
        conditions: [...f.condition_expression.conditions, defaultCondition()],
      },
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Rule name is required."); return; }
    saveMutation.mutate(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? "Edit Rule" : "New Routing Rule"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name + Priority */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Rule Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Hot Lead Fast Track"
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                min={1}
                className="input-field mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What does this rule do?"
              className="input-field mt-1"
            />
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Conditions</label>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(["AND", "OR"] as const).map(op => (
                  <button
                    key={op}
                    onClick={() => setForm(f => ({ ...f, condition_expression: { ...f.condition_expression, operator: op } }))}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      form.condition_expression.operator === op
                        ? "bg-white text-brand-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {form.condition_expression.conditions.map((c, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-medium text-gray-400 px-2">
                        {form.condition_expression.operator}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <ConditionRow
                    condition={c}
                    index={i}
                    onUpdate={updateCondition}
                    onRemove={removeCondition}
                    canRemove={form.condition_expression.conditions.length > 1}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addCondition}
              className="mt-2 text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add condition
            </button>
          </div>

          {/* Action */}
          <div>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-3">Action</label>
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <ActionConfigPanel
                config={form.action_config}
                onChange={c => setForm(f => ({ ...f, action_config: c }))}
                reps={reps}
                sequences={sequences}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="btn-primary"
          >
            {saveMutation.isPending ? "Saving…" : editing ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Simulate Modal ─────────────────────────────────────────────────────────────

function SimulateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [leadId, setLeadId] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [running, setRunning] = useState(false);

  const { data: leads } = useQuery({
    queryKey: ["leads-for-routing-sim", search],
    queryFn: () => api.get("/leads", { params: { search, limit: 20 } }).then(r => r.data.leads || r.data),
    enabled: open,
  });

  const simulate = async () => {
    if (!leadId) { toast.error("Select a lead first."); return; }
    setRunning(true);
    try {
      const r = await api.post("/routing/simulate", { lead_id: leadId });
      setResults(r.data);
    } catch {
      toast.error("Simulation failed.");
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Test Routing Rules</h2>
          <button onClick={() => { onClose(); setResults(null); setLeadId(""); }} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Select a lead to see which active rules would match (no actions are executed).</p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="input-field pl-9"
            />
          </div>

          <select
            value={leadId}
            onChange={e => { setLeadId(e.target.value); setResults(null); }}
            className="input-field"
          >
            <option value="">— Select a lead —</option>
            {(Array.isArray(leads) ? leads : leads?.data || []).map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.first_name} {l.last_name} — {l.lead_type} / Score {l.score}
              </option>
            ))}
          </select>

          <button onClick={simulate} disabled={!leadId || running} className="btn-primary w-full">
            {running ? "Simulating…" : "Run Simulation"}
          </button>

          {results && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No active rules found.</p>
              )}
              {results.map((r: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${r.matches ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-100"}`}>
                  {r.matches
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${r.matches ? "text-green-800" : "text-gray-500"}`}>
                      #{r.rule.priority} {r.rule.name}
                    </p>
                    {r.matches && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Would execute: {r.rule.action_config?.action}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.matches ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                    {r.matches ? "MATCH" : "skip"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RoutingPage() {
  const queryClient = useQueryClient();
  const [ruleModal, setRuleModal] = useState<{ open: boolean; editing?: RoutingRule | null }>({ open: false });
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery<RoutingRule[]>({
    queryKey: ["routing-rules"],
    queryFn: () => api.get("/routing").then(r => r.data),
  });

  const { data: logsData } = useQuery({
    queryKey: ["routing-logs"],
    queryFn: () => api.get("/routing/logs", { params: { limit: 30 } }).then(r => r.data),
    enabled: logsOpen,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then(r => r.data),
  });

  const { data: sequencesData } = useQuery({
    queryKey: ["sequences"],
    queryFn: () => api.get("/sequences").then(r => r.data),
  });

  const reps = useMemo(() => {
    const all = Array.isArray(usersData) ? usersData : usersData?.users || [];
    return all.filter((u: any) => u.is_active !== false);
  }, [usersData]);

  const sequences = useMemo(() => {
    const all = Array.isArray(sequencesData) ? sequencesData : sequencesData?.sequences || [];
    return all.filter((s: any) => s.status === "active");
  }, [sequencesData]);

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/routing/${id}/toggle`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routing-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/routing/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success("Rule deleted.");
    },
  });

<<<<<<< Updated upstream
  const actionLabels: Record<string, string> = {
    assign_senior_rep: "Assign Senior Rep",
    assign_round_robin: "Round Robin Assignment",
    enroll_sequence: "Enroll in Sequence",
    mark_stale: "Mark as Stale",
=======
  const cloneMutation = useMutation({
    mutationFn: (id: string) => api.post(`/routing/${id}/clone`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success("Rule cloned.");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => api.put("/routing/reorder", { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routing-rules"] }),
  });

  const moveRule = (id: string, direction: "up" | "down") => {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(r => r.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    reorderMutation.mutate(sorted.map(r => r.id));
>>>>>>> Stashed changes
  };

  const logs: RoutingLog[] = logsData?.logs || [];
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routing Rules</h1>
          <p className="text-gray-500 mt-1">
            {rules.length} rule{rules.length !== 1 ? "s" : ""} — automatically assign and enroll leads as they arrive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSimulateOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Test Rules
          </button>
          <button
            onClick={() => setLogsOpen(v => !v)}
            className={`btn-secondary flex items-center gap-2 ${logsOpen ? "bg-gray-100" : ""}`}
          >
            <Activity className="w-4 h-4" /> Activity
          </button>
          <button
            onClick={() => setRuleModal({ open: true })}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Rule
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className="card divide-y divide-gray-100">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400">Loading rules…</div>
        )}
        {!isLoading && sortedRules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GitBranch className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No routing rules yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first rule to automatically assign leads.</p>
            <button onClick={() => setRuleModal({ open: true })} className="btn-primary mt-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        )}
        {sortedRules.map((rule, idx) => (
          <div key={rule.id} className={`p-4 ${!rule.is_active ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-4">
              {/* Priority controls */}
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <button
                  onClick={() => moveRule(rule.id, "up")}
                  disabled={idx === 0}
                  className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </button>
                <span className="text-xs font-bold text-brand-600 w-5 text-center">{rule.priority}</span>
                <button
                  onClick={() => moveRule(rule.id, "down")}
                  disabled={idx === sortedRules.length - 1}
                  className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-900">{rule.name}</h4>
                      {rule.match_count > 0 && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                          {rule.match_count} match{rule.match_count !== 1 ? "es" : ""}
                        </span>
                      )}
                      {!rule.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">disabled</span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                    )}

                    {/* Conditions + Action summary */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-mono">
                        IF {conditionSummary(rule.condition_expression)}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                        {actionIcon(rule.action_config.action)}
                        {actionSummary(rule.action_config, reps, sequences)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate(rule.id)}
                      title={rule.is_active ? "Disable" : "Enable"}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      {rule.is_active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />
                      }
                    </button>
                    <button
                      onClick={() => setRuleModal({ open: true, editing: rule })}
                      title="Edit"
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => cloneMutation.mutate(rule.id)}
                      title="Clone"
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${rule.name}"?`)) deleteMutation.mutate(rule.id); }}
                      title="Delete"
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
<<<<<<< Updated upstream
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Action
            </label>
            <select
              value={form.action_config.action}
              onChange={(e) =>
                setForm({
                  ...form,
                  action_config: {
                    ...form.action_config,
                    action: e.target.value,
                  },
                })
              }
              className="input-field"
            >
              <option value="assign_senior_rep">Assign Senior Rep</option>
              <option value="assign_round_robin">Round Robin</option>
              <option value="enroll_sequence">Enroll in Sequence</option>
              <option value="mark_stale">Mark Stale</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate(form)}
              className="btn-primary"
            >
              Create Rule
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
=======
        ))}
      </div>

      {/* Routing Activity Log */}
      {logsOpen && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" />
              Recent Routing Activity
            </h3>
            <span className="text-sm text-gray-400">{logsData?.total || 0} total events</span>
>>>>>>> Stashed changes
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No routing activity yet.</div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-4 py-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900">
                      {log.lead?.first_name} {log.lead?.last_name}
                    </span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-gray-600">{log.rule?.name}</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-brand-600">{log.action_taken}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      {log.triggered_by}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RuleBuilderModal
        open={ruleModal.open}
        editing={ruleModal.editing}
        onClose={() => setRuleModal({ open: false })}
        reps={reps}
        sequences={sequences}
      />
      <SimulateModal open={simulateOpen} onClose={() => setSimulateOpen(false)} />
    </div>
  );
}

