import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { Users, Columns } from "lucide-react";
import LeadQuickView from "./LeadQuickView";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  NEW:               { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-400"   },
  ACTIVE:            { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-400" },
  ENGAGED:           { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-400" },
  MEETING_SCHEDULED: { bg: "bg-cyan-50",   border: "border-cyan-200",   text: "text-cyan-700",   dot: "bg-cyan-400"   },
  PROPOSAL_SENT:     { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700",   dot: "bg-teal-400"   },
  NEGOTIATION:       { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "bg-amber-400"  },
  CONVERTED:         { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  dot: "bg-green-400"  },
  LOST:              { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    dot: "bg-red-400"    },
};

const LEAD_TYPE_BADGE: Record<string, string> = {
  HOT:       "bg-red-100 text-red-700",
  WARM:      "bg-amber-100 text-amber-700",
  COLD:      "bg-blue-100 text-blue-700",
  STALE:     "bg-gray-100 text-gray-600",
  CONVERTED: "bg-green-100 text-green-700",
  LOST:      "bg-red-100 text-red-700",
};

const AVAIL_BADGE: Record<string, { label: string; cls: string }> = {
  available:    { label: "Available",   cls: "bg-green-100 text-green-700" },
  on_leave:     { label: "On Leave",    cls: "bg-red-100 text-red-700"     },
  half_day_am:  { label: "Half Day AM", cls: "bg-amber-100 text-amber-700" },
  half_day_pm:  { label: "Half Day PM", cls: "bg-amber-100 text-amber-700" },
};

// ─── Lead card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  groupBy,
  onDragStart,
  onCardClick,
}: {
  lead: any;
  groupBy: "status" | "rep";
  onDragStart: (leadId: string, currentCol: string) => void;
  onCardClick: (leadId: string) => void;
}) {
  const scoreColor =
    lead.score >= 80 ? "bg-red-500" : lead.score >= 40 ? "bg-amber-500" : "bg-blue-400";

  const colKey = groupBy === "status" ? lead.status : (lead.assigned_rep_id ?? "unassigned");

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(lead.id, colKey);
      }}
      onClick={() => onCardClick(lead.id)}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-brand-300 transition-all select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {lead.first_name} {lead.last_name}
          </p>
          {lead.company && (
            <p className="text-xs text-gray-500 truncate">{lead.company}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${LEAD_TYPE_BADGE[lead.lead_type] ?? "bg-gray-100 text-gray-600"}`}>
          {lead.lead_type}
        </span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${scoreColor}`}
            style={{ width: `${Math.min(100, (lead.score / 200) * 100)}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 font-medium w-6 text-right">{lead.score}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {groupBy === "status" && lead.assignedRep ? (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
              {lead.assignedRep.first_name[0]}
            </div>
            <span className="text-xs text-gray-500">
              {lead.assignedRep.first_name} {lead.assignedRep.last_name}
            </span>
          </div>
        ) : groupBy === "rep" ? (
          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[lead.status]?.bg ?? ""} ${STATUS_COLORS[lead.status]?.text ?? ""}`}>
            {lead.status.replace(/_/g, " ")}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}
        <span className="text-xs text-gray-400">
          {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  groupBy,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onCardClick,
}: {
  column: any;
  groupBy: "status" | "rep";
  isDragOver: boolean;
  onDragOver: (colId: string) => void;
  onDragLeave: () => void;
  onDrop: (colId: string) => void;
  onDragStart: (leadId: string, currentCol: string) => void;
  onCardClick: (leadId: string) => void;
}) {
  const colStyle =
    groupBy === "status"
      ? STATUS_COLORS[column.id] ?? { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400" }
      : { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400" };

  const avail = column.availability ? AVAIL_BADGE[column.availability] : null;

  return (
    <div className="flex-shrink-0 w-64 flex flex-col">
      {/* Column header */}
      <div className={`rounded-t-lg px-3 py-2.5 border ${colStyle.border} ${colStyle.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${colStyle.dot}`} />
          <span className={`text-xs font-semibold truncate ${colStyle.text}`}>
            {column.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {avail && column.availability !== "available" && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${avail.cls}`}>
              {avail.label}
            </span>
          )}
          <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded-full">
            {column.count}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 min-h-48 rounded-b-lg border-x border-b p-2 space-y-2 overflow-y-auto transition-colors ${
          isDragOver
            ? "bg-brand-50 border-brand-300 border-dashed"
            : `${colStyle.border} bg-white`
        }`}
        onDragOver={(e) => { e.preventDefault(); onDragOver(column.id); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); onDrop(column.id); }}
      >
        {column.leads.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400">
            No leads
          </div>
        ) : (
          column.leads.map((lead: any) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              groupBy={groupBy}
              onDragStart={onDragStart}
              onCardClick={onCardClick}
            />
          ))
        )}
        {column.count > column.leads.length && (
          <p className="text-center text-xs text-gray-400 pt-1">
            +{column.count - column.leads.length} more — use table view to see all
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KanbanView() {
  const [groupBy, setGroupBy] = useState<"status" | "rep">("status");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [draggedFromCol, setDraggedFromCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isManager = ["tenant_admin", "sales_manager", "super_admin"].includes(user?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["leads-kanban", groupBy],
    queryFn: () =>
      api.get("/leads/kanban", { params: { group_by: groupBy } }).then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  const statusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      api.patch(`/leads/${leadId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast.success("Lead status updated.");
    },
    onError: (err: any) => toast.error(err.response?.data?.error ?? "Could not update status."),
  });

  const assignMutation = useMutation({
    mutationFn: ({ leadId, repId }: { leadId: string; repId: string | null }) =>
      api.patch(`/leads/${leadId}/assign`, { rep_id: repId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast.success("Lead reassigned.");
    },
    onError: (err: any) => toast.error(err.response?.data?.error ?? "Could not reassign lead."),
  });

  const handleDragStart = (leadId: string, fromCol: string) => {
    setDraggedLeadId(leadId);
    setDraggedFromCol(fromCol);
  };

  const handleDragOver = (colId: string) => {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    dragLeaveTimer.current = setTimeout(() => setDragOverCol(null), 80);
  };

  const handleDrop = (targetColId: string) => {
    setDragOverCol(null);
    if (!draggedLeadId || targetColId === draggedFromCol) {
      setDraggedLeadId(null);
      setDraggedFromCol(null);
      return;
    }

    if (groupBy === "status") {
      statusMutation.mutate({ leadId: draggedLeadId, status: targetColId });
    } else {
      if (!isManager) {
        toast.error("Only managers can reassign leads.");
      } else {
        assignMutation.mutate({
          leadId: draggedLeadId,
          repId: targetColId === "unassigned" ? null : targetColId,
        });
      }
    }

    setDraggedLeadId(null);
    setDraggedFromCol(null);
  };

  const handleCardClick = (leadId: string) => setSelectedLeadId(leadId);

  const columns: any[] = data?.columns ?? [];

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setGroupBy("status")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            groupBy === "status"
              ? "bg-brand-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Columns className="w-4 h-4" />
          By Status
        </button>
        <button
          onClick={() => setGroupBy("rep")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            groupBy === "rep"
              ? "bg-brand-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Users className="w-4 h-4" />
          By Rep
        </button>
        {groupBy === "rep" && (
          <span className="text-xs text-gray-500 ml-1">
            {isManager ? "Drag cards to reassign leads." : "Contact a manager to reassign."}
          </span>
        )}
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64">
              <div className="h-8 bg-gray-200 rounded-t-lg animate-pulse" />
              <div className="border border-gray-200 rounded-b-lg p-2 space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
          {columns.map((col: any) => (
            <KanbanColumn
              key={col.id}
              column={col}
              groupBy={groupBy}
              isDragOver={dragOverCol === col.id}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      )}

      <LeadQuickView
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
}
