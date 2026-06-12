import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { formatDate, formatDateTime, formatChartDate } from "../../utils/dateUtils";
import {
  ArrowLeft, Mail, Phone, Building2, MapPin, Calendar, TrendingUp,
  Pencil, X, Check, PhoneCall, AlertTriangle, PhoneOff, Plus,
  MessageSquare, FileText, Activity, CheckSquare, Clock, StickyNote,
  MailOpen,
} from "lucide-react";
import LogCallModal from "../../components/LogCallModal";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuthStore } from "../../store/authStore";

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(ts);
}

type ActivityFilter = "all" | "call" | "email" | "whatsapp" | "task" | "note" | "event";

const FILTER_LABELS: Record<ActivityFilter, string> = {
  all: "All", call: "Calls", email: "Emails", whatsapp: "WhatsApp",
  task: "Tasks", note: "Notes", event: "Events",
};

function timelineConfig(type: string, data: any): { icon: any; color: string; title: string; subtitle: string; badge?: string; badgeColor?: string } {
  if (type === "call") {
    const isPositive = data.disposition === "Answered" || data.disposition === "Interested" || data.disposition === "Callback Scheduled";
    return {
      icon: PhoneCall,
      color: isPositive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600",
      title: `${data.direction === "inbound" ? "↙ Inbound" : "↗ Outbound"} Call — ${data.disposition || data.status}`,
      subtitle: [data.rep ? `${data.rep.first_name} ${data.rep.last_name}` : "", data.duration_seconds ? `${Math.floor(data.duration_seconds / 60)}m ${data.duration_seconds % 60}s` : "", data.notes || ""].filter(Boolean).join(" · "),
      badge: data.status,
      badgeColor: data.status === "completed" ? "bg-green-50 text-green-700" : data.status === "no-answer" ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-700",
    };
  }
  if (type === "email") {
    return {
      icon: MailOpen,
      color: "bg-blue-100 text-blue-600",
      title: data.subject_line || data.template?.name || "Email sent",
      subtitle: data.sequence?.name ? `Sequence: ${data.sequence.name}` : "",
      badge: data.status,
      badgeColor: data.status === "opened" ? "bg-blue-50 text-blue-700" : data.status === "clicked" ? "bg-purple-50 text-purple-700" : data.status === "failed" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600",
    };
  }
  if (type === "whatsapp") {
    return {
      icon: MessageSquare,
      color: "bg-emerald-100 text-emerald-600",
      title: data.direction === "inbound" ? "WhatsApp received" : "WhatsApp sent",
      subtitle: (data.body || "").slice(0, 120) + ((data.body || "").length > 120 ? "…" : ""),
      badge: data.status,
      badgeColor: data.status === "read" ? "bg-blue-50 text-blue-700" : data.status === "delivered" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600",
    };
  }
  if (type === "task") {
    return {
      icon: CheckSquare,
      color: data.status === "done" ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600",
      title: data.title,
      subtitle: [data.assignee ? `Assigned to ${data.assignee.first_name}` : "", data.due_date ? `Due ${formatDate(data.due_date)}` : ""].filter(Boolean).join(" · "),
      badge: data.status?.replace("_", " "),
      badgeColor: data.status === "done" ? "bg-green-50 text-green-700" : data.status === "in_progress" ? "bg-blue-50 text-blue-700" : data.status === "cancelled" ? "bg-gray-100 text-gray-400" : "bg-orange-50 text-orange-700",
    };
  }
  if (type === "note") {
    return {
      icon: StickyNote,
      color: "bg-yellow-100 text-yellow-600",
      title: "Note added",
      subtitle: (data.metadata?.text || "").slice(0, 150) + ((data.metadata?.text || "").length > 150 ? "…" : ""),
    };
  }
  return {
    icon: Activity,
    color: "bg-gray-100 text-gray-500",
    title: (data.event_type || "Event").replace(/_/g, " "),
    subtitle: data.channel || "",
    badge: data.score_delta > 0 ? `+${data.score_delta}` : data.score_delta < 0 ? `${data.score_delta}` : undefined,
    badgeColor: data.score_delta > 0 ? "bg-green-50 text-green-700" : data.score_delta < 0 ? "bg-red-50 text-red-700" : undefined,
  };
}

function TimelineItem({ item }: { item: any }) {
  const cfg = timelineConfig(item.type, item.data);
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={`w-8 h-8 rounded-full ${cfg.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{cfg.title}</p>
        {cfg.subtitle && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cfg.subtitle}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
        {cfg.badge && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.badgeColor || "bg-gray-100 text-gray-600"}`}>
            {cfg.badge}
          </span>
        )}
        <span className="text-xs text-gray-400 whitespace-nowrap">{relativeTime(item.timestamp)}</span>
      </div>
    </div>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

function TaskCard({ task, onUpdate }: { task: any; onUpdate: (args: { taskId: string; data: any }) => void }) {
  const isDone = task.status === "done" || task.status === "cancelled";
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isDone ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200 hover:border-gray-300"}`}>
      <button
        onClick={() => onUpdate({ taskId: task.id, data: { status: isDone ? "todo" : "done" } })}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-brand-400"}`}
      >
        {isDone && <Check className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.due_date && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              <Clock className="w-3 h-3" />{formatDate(task.due_date)}
            </span>
          )}
          {task.assignee && <span className="text-xs text-gray-400">{task.assignee.first_name} {task.assignee.last_name}</span>}
        </div>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${PRIORITY_COLOR[task.priority] || "bg-gray-100 text-gray-600"}`}>
        {task.priority}
      </span>
    </div>
  );
}

const TYPE_BADGE: Record<string, string> = {
  HOT: "badge-hot", WARM: "badge-warm", COLD: "badge-cold",
  FAILED: "badge-stale",
  CONVERTED: "badge-converted",
  LOST: "bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium",
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<"activity" | "tasks" | "score">("activity");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", due_date: "" });

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.get(`/leads/${id}`).then((r) => r.data),
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["lead-timeline", id],
    queryFn: () => api.get(`/leads/${id}/timeline`).then((r) => r.data),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", { lead_id: id }],
    queryFn: () => api.get("/tasks", { params: { lead_id: id } }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: scoreHistory } = useQuery({
    queryKey: ["score-history", id],
    queryFn: () => api.get(`/scoring/history/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: appTypes } = useQuery({
    queryKey: ["application-types"],
    queryFn: () => api.get("/tenants/application-types").then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/leads/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lead", id] }); toast.success("Status updated."); },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/leads/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      setEditMode(false); setEditForm(null);
      toast.success("Lead updated.");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update lead"),
  });

  const noteMutation = useMutation({
    mutationFn: (text: string) => api.post(`/leads/${id}/notes`, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-timeline", id] });
      setNoteText(""); setShowNoteForm(false);
      toast.success("Note added.");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to add note"),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.post("/tasks", { ...data, lead_id: id, assigned_to: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { lead_id: id }] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lead-timeline", id] });
      setShowTaskForm(false); setTaskForm({ title: "", priority: "medium", due_date: "" });
      toast.success("Task created.");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create task"),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) => api.patch(`/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { lead_id: id }] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lead-timeline", id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  const handleEditOpen = () => {
    setEditForm({
      first_name: lead.first_name, last_name: lead.last_name, email: lead.email,
      phone: lead.phone || "", company: lead.company || "", city: lead.city || "",
      source: lead.source || "Field Visit", application_type_id: lead.application_type_id || "",
      notes: lead.notes || "",
    });
    setEditMode(true);
  };

  const handleEditSave = () => {
    if (!editForm.first_name || !editForm.last_name || !editForm.email) {
      toast.error("First name, last name, and email are required.");
      return;
    }
    updateMutation.mutate({ ...editForm, application_type_id: editForm.application_type_id || null });
  };

  const filteredTimeline = useMemo(() => {
    const items: any[] = timelineData?.timeline || [];
    if (activityFilter === "all") return items;
    return items.filter((item) => item.type === activityFilter);
  }, [timelineData, activityFilter]);

  const tasks: any[] = tasksData?.tasks || [];
  const activeTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const doneTasks = tasks.filter((t) => t.status === "done" || t.status === "cancelled");

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-20 bg-gray-200 rounded-xl" />
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  );
  if (!lead) return <div className="text-center py-20"><p className="text-gray-500">Lead not found.</p></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/leads")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{lead.first_name} {lead.last_name}</h1>
          <p className="text-sm text-gray-500">{lead.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={TYPE_BADGE[lead.lead_type] || "badge-cold"}>{lead.lead_type}</span>
          {lead.do_not_call && (
            <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
              <PhoneOff className="w-3 h-3" /> DNC
            </span>
          )}
        </div>
      </div>

      {/* FAILED banner */}
      {lead.lead_type === "FAILED" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">This lead is marked FAILED</p>
            <p className="text-red-700 mt-0.5">
              {lead.call_attempt_count
                ? `${lead.call_attempt_count} unsuccessful call attempts. Consider a different outreach channel.`
                : "This lead has been inactive for 30+ days with no engagement."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Contact Info */}
        <div className="space-y-4">
          {/* Contact card */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Contact Info</h3>
              {!editMode ? (
                <button onClick={handleEditOpen} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleEditSave} disabled={updateMutation.isPending} className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50">
                    <Check className="w-4 h-4" /> Save
                  </button>
                  <button onClick={() => { setEditMode(false); setEditForm(null); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}
            </div>

            {!editMode ? (
              <div className="space-y-3">
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Phone} label="Phone" value={lead.phone || "—"} />
                <InfoRow icon={Building2} label="Company" value={lead.company || "—"} />
                <InfoRow icon={MapPin} label="City" value={lead.city || "—"} />
                <InfoRow icon={Calendar} label="Enrolled" value={formatDate(lead.created_at || lead.createdAt)} />
                <InfoRow icon={TrendingUp} label="Score" value={`${lead.score} / 200`} />
                {lead.source && <InfoRow icon={Activity} label="Source" value={lead.source} />}
                {lead.ApplicationType && <InfoRow icon={FileText} label="App Type" value={lead.ApplicationType.name} />}
                {!editMode && lead.notes && (
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2">{lead.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">First Name *</label>
                    <input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Last Name *</label>
                    <input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="input-field text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                  <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field text-sm" placeholder="+91-9876543210" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Company</label>
                  <input type="text" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">City</label>
                  <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Source</label>
                  <select value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} className="input-field text-sm">
                    {["Field Visit", "Cold Call", "Referral", "Event/Expo", "Website", "Ad Campaign", "Other"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">App Type</label>
                  <select value={editForm.application_type_id} onChange={(e) => setEditForm({ ...editForm, application_type_id: e.target.value })} className="input-field text-sm">
                    <option value="">None</option>
                    {(appTypes || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="input-field text-sm" rows={2} />
                </div>
              </div>
            )}
          </div>

          {/* Status + actions */}
          <div className="card space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Pipeline Status</label>
              <select value={lead.status} onChange={(e) => statusMutation.mutate(e.target.value)} className="input-field text-sm">
                {["NEW","ACTIVE","ENGAGED","MEETING_SCHEDULED","PROPOSAL_SENT","NEGOTIATION","CONVERTED","LOST"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            {lead.assignedRep && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Assigned Rep</label>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                    {lead.assignedRep.first_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.assignedRep.first_name} {lead.assignedRep.last_name}</p>
                    <p className="text-xs text-gray-400">{lead.assignedRep.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quick Actions</p>
            {!lead.do_not_call && lead.phone && (
              <button onClick={() => setShowCallModal(true)} className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">
                <PhoneCall className="w-4 h-4" /> Log / Make Call
              </button>
            )}
            <button
              onClick={() => { setShowNoteForm(true); setTab("activity"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <StickyNote className="w-4 h-4 text-yellow-500" /> Add Note
            </button>
            <button
              onClick={() => { setShowTaskForm(true); setTab("tasks"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckSquare className="w-4 h-4 text-purple-500" /> Create Task
            </button>
          </div>
        </div>

        {/* Right: Tabbed area */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              {(["activity", "tasks", "score"] as const).map((t) => {
                const labels: Record<string, string> = {
                  activity: `Activity${timelineData ? ` (${timelineData.total})` : ""}`,
                  tasks: `Tasks${tasks.length ? ` (${tasks.length})` : ""}`,
                  score: "Score Trend",
                };
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-brand-600 text-brand-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* Activity Tab */}
            {tab === "activity" && (
              <div className="p-4 space-y-3">
                {/* Note form */}
                {showNoteForm && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Add Note</span>
                    </div>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Type your note here..."
                      rows={3}
                      className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => noteMutation.mutate(noteText)}
                        disabled={!noteText.trim() || noteMutation.isPending}
                        className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {noteMutation.isPending ? "Saving…" : "Save Note"}
                      </button>
                      <button onClick={() => { setShowNoteForm(false); setNoteText(""); }} className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter pills */}
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(FILTER_LABELS) as ActivityFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setActivityFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activityFilter === f ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {FILTER_LABELS[f]}
                    </button>
                  ))}
                </div>

                {/* Timeline */}
                <div className="max-h-[520px] overflow-y-auto -mx-1 px-1">
                  {timelineLoading ? (
                    <div className="space-y-3 py-4">
                      {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
                    </div>
                  ) : filteredTimeline.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No {activityFilter === "all" ? "activity" : FILTER_LABELS[activityFilter].toLowerCase()} yet</p>
                    </div>
                  ) : (
                    filteredTimeline.map((item: any, idx: number) => (
                      <TimelineItem key={`${item.type}-${item.data.id || idx}`} item={item} />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {tab === "tasks" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{activeTasks.length} open · {doneTasks.length} completed</span>
                  <button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Task
                  </button>
                </div>

                {showTaskForm && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">New Task</span>
                    </div>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="Task title..."
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => createTaskMutation.mutate(taskForm)}
                        disabled={!taskForm.title.trim() || createTaskMutation.isPending}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {createTaskMutation.isPending ? "Creating…" : "Create Task"}
                      </button>
                      <button onClick={() => { setShowTaskForm(false); setTaskForm({ title: "", priority: "medium", due_date: "" }); }} className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {activeTasks.map((t: any) => (
                    <TaskCard key={t.id} task={t} onUpdate={updateTaskMutation.mutate} />
                  ))}
                  {doneTasks.length > 0 && (
                    <>
                      <p className="text-xs text-gray-400 pt-2 pb-1">Completed</p>
                      {doneTasks.map((t: any) => (
                        <TaskCard key={t.id} task={t} onUpdate={updateTaskMutation.mutate} />
                      ))}
                    </>
                  )}
                  {tasks.length === 0 && !showTaskForm && (
                    <div className="text-center py-12">
                      <CheckSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No tasks for this lead yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Score Tab */}
            {tab === "score" && (
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-4">
                  Current score: <span className="font-bold text-gray-900">{lead.score} / 200</span>
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={scoreHistory || []}>
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={(v) => formatChartDate(v)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => formatDateTime(v)} />
                    <Line type="monotone" dataKey="total_score" stroke="#4F46E5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                {(!scoreHistory || scoreHistory.length === 0) && (
                  <p className="text-sm text-gray-400 text-center mt-4">No score history yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <LogCallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        lead={{ id: lead.id, first_name: lead.first_name, last_name: lead.last_name, phone: lead.phone }}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 truncate">{value}</span>
    </div>
  );
}
