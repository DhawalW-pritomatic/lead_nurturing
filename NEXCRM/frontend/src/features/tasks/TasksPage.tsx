import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import { useAuthStore } from "../../store/authStore";
import {
  Plus, Phone, Mail, Calendar, RefreshCw, CheckSquare,
  Clock, AlertCircle, CheckCircle2, Trash2, Edit2, Zap,
} from "lucide-react";

// ─── Types & helpers ──────────────────────────────────────────────────────────

const TASK_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  call:       { label: "Call",       icon: Phone,       color: "text-blue-600"  },
  email:      { label: "Email",      icon: Mail,        color: "text-purple-600" },
  meeting:    { label: "Meeting",    icon: Calendar,    color: "text-cyan-600"  },
  follow_up:  { label: "Follow-up",  icon: RefreshCw,   color: "text-amber-600" },
  other:      { label: "Other",      icon: CheckSquare, color: "text-gray-500"  },
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-gray-100 text-gray-600",
};

const FILTERS = [
  { id: "all",       label: "All Tasks" },
  { id: "mine",      label: "My Tasks"  },
  { id: "today",     label: "Due Today" },
  { id: "overdue",   label: "Overdue"   },
  { id: "completed", label: "Completed" },
];

function isOverdue(task: any) {
  return (
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    !["completed", "cancelled"].includes(task.status)
  );
}

function formatDueDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)   return { text: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { text: "Due today",                        overdue: false, today: true };
  if (diffDays === 1) return { text: "Due tomorrow",                     overdue: false };
  return { text: `Due ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`, overdue: false };
}

// ─── Lead search dropdown (for create/edit modal) ─────────────────────────────

function LeadSearch({ value, onChange }: { value: any; onChange: (lead: any) => void }) {
  const [query, setQuery] = useState(value ? `${value.first_name} ${value.last_name}` : "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["lead-search", query],
    queryFn: () =>
      query.length >= 2
        ? api.get("/leads", { params: { search: query, limit: 8 } }).then((r) => r.data.leads)
        : Promise.resolve([]),
    enabled: query.length >= 2,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Search leads by name or email…"
        className="input-field"
      />
      {open && data && data.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {data.map((lead: any) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => {
                onChange(lead);
                setQuery(`${lead.first_name} ${lead.last_name}`);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            >
              <span className="font-medium">{lead.first_name} {lead.last_name}</span>
              {lead.company && <span className="text-gray-500 ml-1">— {lead.company}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task modal ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  task_type: "follow_up",
  priority: "medium",
  due_date: "",
  description: "",
  assigned_to_user_id: "",
  lead: null as any,
};

function TaskModal({
  isOpen,
  onClose,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  initial?: any;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (isOpen) {
      setForm(
        isEdit
          ? {
              title: initial.title ?? "",
              task_type: initial.task_type ?? "follow_up",
              priority: initial.priority ?? "medium",
              due_date: initial.due_date ? initial.due_date.split("T")[0] : "",
              description: initial.description ?? "",
              assigned_to_user_id: initial.assignedTo?.id ?? "",
              lead: initial.lead ?? null,
            }
          : { ...EMPTY_FORM }
      );
    }
  }, [isOpen, initial]);

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => api.get("/users").then((r) => r.data.users ?? r.data),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? api.put(`/tasks/${initial.id}`, payload)
        : api.post("/tasks", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success(isEdit ? "Task updated." : "Task created.");
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error ?? "Failed to save task."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    mutation.mutate({
      title: form.title.trim(),
      task_type: form.task_type,
      priority: form.priority,
      due_date: form.due_date || null,
      description: form.description || null,
      assigned_to_user_id: form.assigned_to_user_id || null,
      lead_id: form.lead?.id ?? null,
    });
  };

  const field = (key: keyof typeof EMPTY_FORM) => (val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Task" : "Create Task"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => field("title")(e.target.value)}
            placeholder="e.g. Call John about proposal"
            className="input-field"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.task_type} onChange={(e) => field("task_type")(e.target.value)} className="input-field">
              {Object.entries(TASK_TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={form.priority} onChange={(e) => field("priority")(e.target.value)} className="input-field">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => field("due_date")(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link to Lead (optional)</label>
          <LeadSearch value={form.lead} onChange={field("lead")} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
          <select value={form.assigned_to_user_id} onChange={(e) => field("assigned_to_user_id")(e.target.value)} className="input-field">
            <option value="">Auto-assign (round-robin)</option>
            {(usersData ?? []).map((u: any) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.description}
            onChange={(e) => field("description")(e.target.value)}
            rows={3}
            placeholder="Any additional context…"
            className="input-field resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Saving…" : isEdit ? "Update Task" : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onEdit }: { task: any; onEdit: (t: any) => void }) {
  const queryClient = useQueryClient();
  const TypeIcon = TASK_TYPE_META[task.task_type]?.icon ?? CheckSquare;
  const typeColor = TASK_TYPE_META[task.task_type]?.color ?? "text-gray-500";
  const due = formatDueDate(task.due_date);
  const overdue = isOverdue(task);
  const isDone = task.status === "completed";

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/tasks/${task.id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success("Task completed!");
    },
    onError: (err: any) => toast.error(err.response?.data?.error ?? "Failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
      toast.success("Task deleted.");
    },
    onError: (err: any) => toast.error(err.response?.data?.error ?? "Failed."),
  });

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      isDone ? "bg-gray-50 border-gray-100 opacity-60" : overdue ? "bg-red-50 border-red-100" : "bg-white border-gray-100 hover:border-gray-200"
    }`}>
      {/* Complete checkbox */}
      <button
        onClick={() => !isDone && completeMutation.mutate()}
        disabled={isDone || completeMutation.isPending}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isDone
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-green-500"
        }`}
      >
        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </button>

      {/* Type icon */}
      <TypeIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${typeColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>
                {task.title}
              </span>
              {task.is_auto_generated && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium">
                  <Zap className="w-3 h-3" /> Auto
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[task.priority]}`}>
                {task.priority}
              </span>
            </div>
            {task.lead && (
              <Link
                to={`/leads/${task.lead.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-brand-600 hover:text-brand-700 hover:underline mt-0.5 block truncate"
              >
                {task.lead.first_name} {task.lead.last_name}
                {task.lead.company ? ` — ${task.lead.company}` : ""}
              </Link>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isDone && (
              <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="p-1 text-gray-400 hover:text-red-500 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {task.assignedTo && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
                {task.assignedTo.first_name[0]}
              </div>
              {task.assignedTo.first_name} {task.assignedTo.last_name}
            </span>
          )}
          {due && (
            <span className={`text-xs flex items-center gap-1 ${due.overdue ? "text-red-600 font-medium" : (due as any).today ? "text-amber-600 font-medium" : "text-gray-500"}`}>
              {due.overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {due.text}
            </span>
          )}
          {task.description && (
            <span className="text-xs text-gray-400 truncate max-w-xs">{task.description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery({
    queryKey: ["task-stats"],
    queryFn: () => api.get("/tasks/stats").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: () =>
      api.get("/tasks", { params: { filter, limit: 100 } }).then((r) => r.data),
  });

  // Availability controls for the current user
  const { data: availData } = useQuery({
    queryKey: ["availability-today"],
    queryFn: () => api.get("/tasks/availability/today").then((r) => r.data),
  });

  const queryClient = useQueryClient();
  const availMutation = useMutation({
    mutationFn: (status: string) => api.post("/tasks/availability", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-today"] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast.success("Availability updated.");
    },
  });

  const myAvailability = availData?.find((a: any) => a.user?.id === user?.id)?.status ?? "available";
  const tasks: any[] = data?.tasks ?? [];

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">{data?.total ?? 0} tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {/* My availability today */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">My status:</span>
            <select
              value={myAvailability}
              onChange={(e) => availMutation.mutate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="available">Available</option>
              <option value="half_day_am">Half Day AM</option>
              <option value="half_day_pm">Half Day PM</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <button
            onClick={() => { setEditingTask(null); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Open",               value: stats.open,                icon: CheckSquare,  color: "text-blue-600",  bg: "bg-blue-50"  },
            { label: "Overdue",            value: stats.overdue,             icon: AlertCircle,  color: "text-red-600",   bg: "bg-red-50"   },
            { label: "Due Today",          value: stats.due_today,           icon: Clock,        color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Completed This Week",value: stats.completed_this_week, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`card flex items-center gap-3 ${bg} border-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === f.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label}
            {f.id === "overdue" && stats?.overdue > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {stats.overdue}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No tasks here</p>
            <p className="text-sm mt-1">Create a task or wait for auto-generated ones to appear.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow key={task.id} task={task} onEdit={handleEdit} />
          ))
        )}
      </div>

      <TaskModal isOpen={modalOpen} onClose={handleCloseModal} initial={editingTask} />
    </div>
  );
}
