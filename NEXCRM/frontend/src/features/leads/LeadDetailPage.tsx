import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { formatDate, formatDateTime, formatChartDate } from "../../utils/dateUtils";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  Pencil,
  X,
  Check,
  PhoneCall,
  AlertTriangle,
  PhoneOff,
} from "lucide-react";
import LogCallModal from "../../components/LogCallModal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  const { data: callHistory } = useQuery({
    queryKey: ["call-history", id],
    queryFn: () => api.get("/calls", { params: { lead_id: id } }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.get(`/leads/${id}`).then((r) => r.data),
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
    mutationFn: (status: string) =>
      api.patch(`/leads/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      toast.success("Status updated.");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      api.put(`/leads/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      setEditMode(false);
      setEditForm(null);
      toast.success("Lead updated.");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Failed to update lead"),
  });

  const handleEditOpen = () => {
    setEditForm({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone || "",
      company: lead.company || "",
      city: lead.city || "",
      source: lead.source || "Field Visit",
      application_type_id: lead.application_type_id || "",
      notes: lead.notes || "",
    });
    setEditMode(true);
  };

  const handleEditCancel = () => {
    setEditMode(false);
    setEditForm(null);
  };

  const handleEditSave = () => {
    if (!editForm.first_name || !editForm.last_name || !editForm.email) {
      toast.error("First name, last name, and email are required.");
      return;
    }
    updateMutation.mutate({
      ...editForm,
      application_type_id: editForm.application_type_id || null,
    });
  };

  if (isLoading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded-xl"></div>
        <div className="h-96 bg-gray-200 rounded-xl"></div>
      </div>
    );
  if (!lead)
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Lead not found.</p>
      </div>
    );

  const typeBadgeClass: Record<string, string> = {
    HOT: "badge-hot",
    WARM: "badge-warm",
    COLD: "badge-cold",
    STALE: "badge-stale",
    FAILED: "bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-semibold",
    CONVERTED: "badge-converted",
    LOST: "bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/leads")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.first_name} {lead.last_name}
          </h1>
          <p className="text-gray-500">{lead.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={typeBadgeClass[lead.lead_type] || "badge-cold"}>
            {lead.lead_type}
          </span>
          {lead.do_not_call && (
            <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
              <PhoneOff className="w-3 h-3" /> DNC
            </span>
          )}
          {!lead.do_not_call && lead.phone && (
            <button
              onClick={() => setShowCallModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-full transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Call Lead
            </button>
          )}
        </div>
      </div>

      {/* FAILED warning banner */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Contact Information</h3>
            {!editMode ? (
              <button
                onClick={handleEditOpen}
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Save
                </button>
                <button
                  onClick={handleEditCancel}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            )}
          </div>

          {!editMode ? (
            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow icon={Phone} label="Phone" value={lead.phone || "—"} />
              <InfoRow
                icon={Building2}
                label="Company"
                value={lead.company || "—"}
              />
              <InfoRow icon={MapPin} label="City" value={lead.city || "—"} />
              <InfoRow
                icon={Calendar}
                label="Enrolled"
                value={formatDate(lead.created_at || lead.createdAt)}
              />
              <InfoRow
                icon={TrendingUp}
                label="Score"
                value={`${lead.score} / 200`}
              />
              {lead.source && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20">Source</span>
                  <span className="text-sm font-medium text-gray-900">{lead.source}</span>
                </div>
              )}
              {lead.ApplicationType && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20">App Type</span>
                  <span className="text-sm font-medium text-gray-900">{lead.ApplicationType.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">First Name *</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Last Name *</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone / WhatsApp</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input-field text-sm"
                  placeholder="+91-9876543210"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Company</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">City</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Lead Source</label>
                <select
                  value={editForm.source}
                  onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                  className="input-field text-sm"
                >
                  <option>Field Visit</option>
                  <option>Cold Call</option>
                  <option>Referral</option>
                  <option>Event/Expo</option>
                  <option>Website</option>
                  <option>Ad Campaign</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Application Type</label>
                <select
                  value={editForm.application_type_id}
                  onChange={(e) => setEditForm({ ...editForm, application_type_id: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="">None</option>
                  {(appTypes || []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="input-field text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Enrolled (read-only)</label>
                  <input
                    type="text"
                    value={formatDate(lead.created_at || lead.createdAt)}
                    disabled
                    className="input-field text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Score (read-only)</label>
                  <input
                    type="text"
                    value={`${lead.score} / 200`}
                    disabled
                    className="input-field text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          <hr />
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={lead.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              className="input-field mt-1"
            >
              <option value="NEW">New</option>
              <option value="ACTIVE">Active</option>
              <option value="ENGAGED">Engaged</option>
              <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
          {!editMode && lead.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
              <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                {lead.notes}
              </p>
            </div>
          )}
          {lead.assignedRep && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Assigned Rep
              </h4>
              <p className="text-sm text-gray-600">
                {lead.assignedRep.first_name} {lead.assignedRep.last_name} (
                {lead.assignedRep.email})
              </p>
            </div>
          )}
        </div>

        {/* Score History & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Chart */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Score Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={scoreHistory || []}>
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => formatChartDate(v)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v) => formatDateTime(v)} />
                <Line
                  type="monotone"
                  dataKey="total_score"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Timeline */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">
              Activity Timeline
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(lead.engagementEvents || []).map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {event.event_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {event.channel} •{" "}
                      {formatDateTime(event.created_at || event.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold ${event.score_delta > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {event.score_delta > 0 ? "+" : ""}
                    {event.score_delta}
                  </span>
                </div>
              ))}
              {(!lead.engagementEvents ||
                lead.engagementEvents.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No engagement events yet.
                </p>
              )}
            </div>
          </div>

          {/* Call History */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Call History</h3>
              {lead.call_attempt_count > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  {lead.call_attempt_count} attempt{lead.call_attempt_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(callHistory?.records || []).map((call: any) => (
                <div key={call.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                      {call.direction === "inbound" ? "↙ Inbound" : "↗ Outbound"}
                      {call.disposition && (
                        <span className="text-xs text-gray-500">· {call.disposition}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {call.rep ? `${call.rep.first_name} ${call.rep.last_name} · ` : ""}
                      {formatDateTime(call.created_at)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    call.status === "completed" ? "bg-green-50 text-green-700" :
                    call.status === "no-answer" ? "bg-gray-100 text-gray-600" :
                    call.status === "failed" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  }`}>
                    {call.status}
                  </span>
                </div>
              ))}
              {(!callHistory?.records || callHistory.records.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No calls yet.</p>
              )}
            </div>
          </div>

          {/* Outreach History */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">
              Outreach History
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(lead.outreachRecords || []).map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {record.subject_line || "Email sent"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(record.created_at || record.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${record.status === "sent" ? "bg-green-50 text-green-700" : record.status === "opened" ? "bg-blue-50 text-blue-700" : record.status === "failed" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"}`}
                  >
                    {record.status}
                  </span>
                </div>
              ))}
              {(!lead.outreachRecords || lead.outreachRecords.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No outreach sent yet.
                </p>
              )}
            </div>
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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-500 w-20">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
