import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Calendar, User, X, ChevronDown, ExternalLink, UserCheck,
} from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import RepPickerDropdown from "../../components/RepPickerDropdown";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  lead?: { id: string; first_name: string; last_name: string; lead_type: string };
  assignee?: { id: string; first_name: string; last_name: string };
  createdBy?: { id: string; first_name: string; last_name: string };
  created_at?: string;
}

interface GroupedTasks {
  todo: Task[];
  in_progress: Task[];
  done: Task[];
  cancelled: Task[];
}

const COLUMNS: { key: TaskStatus; label: string; color: string; bg: string }[] = [
  { key: "todo", label: "To Do", color: "text-gray-700", bg: "bg-gray-100" },
  { key: "in_progress", label: "In Progress", color: "text-blue-700", bg: "bg-blue-50" },
  { key: "done", label: "Done", color: "text-green-700", bg: "bg-green-50" },
  { key: "cancelled", label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
];

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const TYPE_BADGE: Record<string, string> = {
  COLD: "bg-blue-100 text-blue-700",
  WARM: "bg-orange-100 text-orange-700",
  HOT: "bg-red-100 text-red-700",
  FAILED: "bg-gray-200 text-gray-600",
  CONVERTED: "bg-green-100 text-green-700",
};

export default function TasksPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" as TaskPriority, due_date: "", lead_id: "" });
  const [leadSearch, setLeadSearch] = useState("");
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const { data, isLoading } = useQuery<{ tasks: Task[]; grouped: GroupedTasks }>({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: leadsData } = useQuery({
    queryKey: ["leads-search-task", leadSearch],
    queryFn: () => api.get("/leads", { params: { search: leadSearch, limit: 10 } }).then((r) => r.data),
    enabled: leadSearch.length > 1,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/tasks", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowCreate(false);
      setNewTask({ title: "", description: "", priority: "medium", due_date: "", lead_id: "" });
      toast.success("Task created.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/tasks/${id}`, data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (openTask && updated?.id === openTask.id) setOpenTask(updated);
      toast.success("Task updated.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setOpenTask(null);
      toast.success("Task deleted.");
    },
  });

  const grouped = data?.grouped || { todo: [], in_progress: [], done: [], cancelled: [] };
  const leads = leadsData?.leads || [];

  // Count active (non-done, non-cancelled) tasks per rep for workload indicator
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (data?.tasks || []).forEach((t) => {
      if (t.assignee?.id && t.status !== "done" && t.status !== "cancelled") {
        counts[t.assignee.id] = (counts[t.assignee.id] || 0) + 1;
      }
    });
    return counts;
  }, [data?.tasks]);

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    const id = e.dataTransfer.getData("task_id");
    if (id) updateMutation.mutate({ id, status });
    setDragOver(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">Kanban board for team tasks and lead follow-ups</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">New Task</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Lead</label>
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search lead by name..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {leads.length > 0 && (
                  <div className="border border-gray-200 rounded-lg mt-1 max-h-36 overflow-y-auto bg-white shadow-sm">
                    {leads.map((lead: any) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setNewTask((p) => ({ ...p, lead_id: lead.id }));
                          setLeadSearch(`${lead.first_name} ${lead.last_name}`);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[lead.lead_type] || "bg-gray-100"}`}>
                          {lead.lead_type}
                        </span>
                        {lead.first_name} {lead.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(newTask)}
                disabled={!newTask.title.trim() || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50 font-medium"
              >
                {createMutation.isPending ? "Creating…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          taskCounts={taskCounts}
          onClose={() => setOpenTask(null)}
          onUpdate={(fields) => updateMutation.mutate({ id: openTask.id, ...fields })}
          onDelete={() => deleteMutation.mutate(openTask.id)}
          isPending={updateMutation.isPending}
        />
      )}

      {/* Kanban board */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Loading tasks…</div>
      ) : (
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-220px)] min-h-96">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`flex flex-col rounded-xl border border-gray-200 overflow-hidden transition-colors ${
                dragOver === col.key ? "border-brand-400 bg-brand-50" : "bg-gray-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className={`px-4 py-3 flex items-center gap-2 border-b border-gray-100 ${col.bg}`}>
                <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bg} ${col.color} border`}>
                  {grouped[col.key].length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {grouped[col.key].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onOpen={() => setOpenTask(task)}
                    onStatusChange={(status) => updateMutation.mutate({ id: task.id, status })}
                    onDelete={() => deleteMutation.mutate(task.id)}
                  />
                ))}
                {grouped[col.key].length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-8">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Task Detail Modal ─────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDatetime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function TaskDetailModal({
  task, taskCounts, onClose, onUpdate, onDelete, isPending,
}: {
  task: Task;
  taskCounts: Record<string, number>;
  onClose: () => void;
  onUpdate: (fields: any) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(
    task.due_date ? toLocalDatetime(task.due_date) : ""
  );
  const [reassignAnchor, setReassignAnchor] = useState<HTMLElement | null>(null);

  const isDirty =
    title !== task.title ||
    description !== (task.description || "") ||
    priority !== task.priority ||
    status !== task.status ||
    dueDate !== (task.due_date ? toLocalDatetime(task.due_date) : "");

  const handleSave = () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    onUpdate({ title, description: description || undefined, priority, status, due_date: dueDate || undefined });
  };

  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "done";

  const activeCount = task.assignee ? (taskCounts[task.assignee.id] || 0) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Task Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Add description…"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Due Date & Time</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                isOverdue ? "border-red-300 text-red-600" : "border-gray-200"
              }`}
            />
            {isOverdue && <p className="text-xs text-red-500 mt-0.5">This task is overdue</p>}
          </div>

          {/* Linked lead */}
          {task.lead && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Linked Lead</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[task.lead.lead_type] || "bg-gray-100 text-gray-600"}`}>
                  {task.lead.lead_type}
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {task.lead.first_name} {task.lead.last_name}
                </span>
                <a
                  href={`/leads/${task.lead.id}`}
                  className="ml-auto text-brand-600 hover:text-brand-700"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Assignee / Reassign */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Assigned To</label>
            {task.assignee ? (
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                  {task.assignee.first_name[0]}
                </div>
                <div>
                  <p className="text-sm text-gray-800">{task.assignee.first_name} {task.assignee.last_name}</p>
                  <p className="text-xs text-gray-400">
                    {activeCount === 0 ? "No active tasks" : `${activeCount} active task${activeCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={(e) => setReassignAnchor(e.currentTarget as HTMLElement)}
                  className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Reassign
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => setReassignAnchor(e.currentTarget as HTMLElement)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                Assign to someone…
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onDelete}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || isPending || !title.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Rep picker dropdown — fixed-position, renders above modal overlay */}
      <RepPickerDropdown
        isOpen={!!reassignAnchor}
        anchorEl={reassignAnchor}
        onClose={() => setReassignAnchor(null)}
        onSelect={(rep) => { onUpdate({ assigned_to: rep.id }); }}
        taskCounts={taskCounts}
      />
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, onOpen, onStatusChange, onDelete,
}: {
  task: Task;
  onOpen: () => void;
  onStatusChange: (s: TaskStatus) => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("task_id", task.id)}
      className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onOpen}
          className="text-sm font-medium text-gray-900 leading-snug flex-1 text-left hover:text-brand-600 transition-colors"
        >
          {task.title}
        </button>
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu((p) => !p); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100"
          >
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-7 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={() => { onOpen(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <ExternalLink className="w-3 h-3" /> Open / Edit
              </button>
              <hr className="my-1 border-gray-100" />
              {(["todo", "in_progress", "done", "cancelled"] as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(s); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 capitalize"
                >
                  Move → {s.replace("_", " ")}
                </button>
              ))}
              <hr className="my-1 border-gray-100" />
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_BADGE[task.priority]}`}>
          {task.priority}
        </span>
        {task.lead && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[task.lead.lead_type] || "bg-gray-100 text-gray-600"}`}>
            {task.lead.first_name} {task.lead.last_name}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        {task.assignee ? (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" />
            {task.assignee.first_name}
          </div>
        ) : <span />}
        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            <Calendar className="w-3 h-3" />
            {new Date(task.due_date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
