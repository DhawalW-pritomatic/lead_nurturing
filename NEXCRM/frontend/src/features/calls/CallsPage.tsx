import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PhoneCall, PhoneIncoming, PhoneOff, Clock, CheckCircle, X } from "lucide-react";
import api from "../../services/api";
import { formatDateTime } from "../../utils/dateUtils";

interface CallRecord {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  disposition?: string;
  from_number: string;
  to_number: string;
  duration_seconds?: number;
  notes?: string;
  created_at: string;
  lead?: { id: string; first_name: string; last_name: string; phone: string };
  rep?: { id: string; first_name: string; last_name: string };
}

interface Stats {
  total: number;
  completed: number;
  no_answer: number;
  interested: number;
  not_interested: number;
  callback_scheduled: number;
}

const DISPOSITIONS = [
  "Interested",
  "Not Interested",
  "No Answer",
  "Callback Scheduled",
  "Left Voicemail",
  "Wrong Number",
];

export default function CallsPage({ embedded }: { embedded?: boolean }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"history" | "callbacks">("history");
  const [dispModal, setDispModal] = useState<CallRecord | null>(null);
  const [dispForm, setDispForm] = useState({ disposition: "", notes: "", scheduled_at: "" });

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["call-stats"],
    queryFn: () => api.get("/calls/stats").then((r) => r.data),
  });

  const { data: callsData, isLoading } = useQuery<{ records: CallRecord[]; total: number }>({
    queryKey: ["calls-history"],
    queryFn: () => api.get("/calls").then((r) => r.data),
  });

  const { data: callbacks } = useQuery({
    queryKey: ["callbacks"],
    queryFn: () => api.get("/callbacks").then((r) => r.data),
    enabled: activeTab === "callbacks",
  });

  const dispMutation = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.patch(`/calls/${id}/disposition`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls-history"] });
      qc.invalidateQueries({ queryKey: ["call-stats"] });
      setDispModal(null);
    },
  });

  const callbackUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/callbacks/${id}`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callbacks"] }),
  });

  const stats = statsData || { total: 0, completed: 0, no_answer: 0, interested: 0, not_interested: 0, callback_scheduled: 0 };
  const records = callsData?.records || [];

  return (
    <div className={embedded ? "" : "space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
          <p className="text-gray-500 text-sm mt-1">Call history, dispositions, and callbacks</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, icon: PhoneCall, color: "text-gray-700" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600" },
          { label: "No Answer", value: stats.no_answer, icon: PhoneOff, color: "text-gray-500" },
          { label: "Interested", value: stats.interested, icon: PhoneIncoming, color: "text-blue-600" },
          { label: "Not Interested", value: stats.not_interested, icon: X, color: "text-red-500" },
          { label: "Callbacks", value: stats.callback_scheduled, icon: Clock, color: "text-orange-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["history", "callbacks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === t ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "history" ? "Call History" : "Scheduled Callbacks"}
          </button>
        ))}
      </div>

      {/* Call History */}
      {activeTab === "history" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Lead</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Direction</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Disposition</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Rep</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="py-3 px-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : records.map((call) => (
                    <tr key={call.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {call.lead ? (
                          <span className="font-medium text-gray-900">
                            {call.lead.first_name} {call.lead.last_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">{call.from_number}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          call.direction === "inbound" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        }`}>
                          {call.direction}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          call.status === "completed" ? "bg-green-50 text-green-700" :
                          call.status === "no-answer" ? "bg-gray-100 text-gray-600" :
                          call.status === "failed" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{call.disposition || "—"}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {call.rep ? `${call.rep.first_name} ${call.rep.last_name}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {formatDateTime(call.created_at)}
                        {call.duration_seconds ? ` · ${Math.round(call.duration_seconds / 60)}m` : ""}
                      </td>
                      <td className="py-3 px-4">
                        {!call.disposition && call.status === "completed" && (
                          <button
                            onClick={() => { setDispModal(call); setDispForm({ disposition: "", notes: "", scheduled_at: "" }); }}
                            className="text-xs text-brand-600 hover:underline font-medium"
                          >
                            Log Outcome
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              {!isLoading && records.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                    No calls recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Callbacks */}
      {activeTab === "callbacks" && (
        <div className="space-y-3">
          {(callbacks || []).map((cb: any) => (
            <div key={cb.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {cb.lead ? `${cb.lead.first_name} ${cb.lead.last_name}` : "Unknown Lead"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateTime(cb.scheduled_at)}
                  {cb.notes && ` · ${cb.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  cb.status === "pending" ? "bg-yellow-50 text-yellow-700" :
                  cb.status === "completed" ? "bg-green-50 text-green-700" :
                  cb.status === "missed" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                }`}>
                  {cb.status}
                </span>
                {cb.status === "pending" && (
                  <button
                    onClick={() => callbackUpdateMutation.mutate({ id: cb.id, status: "completed" })}
                    className="text-xs text-green-600 hover:underline font-medium"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          ))}
          {(!callbacks || callbacks.length === 0) && (
            <p className="text-center text-gray-400 py-12 text-sm">No callbacks scheduled</p>
          )}
        </div>
      )}

      {/* Disposition Modal */}
      {dispModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Log Call Outcome</h2>
              <button onClick={() => setDispModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disposition *</label>
                <select
                  value={dispForm.disposition}
                  onChange={(e) => setDispForm((p) => ({ ...p, disposition: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select outcome</option>
                  {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={dispForm.notes}
                  onChange={(e) => setDispForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Optional notes"
                />
              </div>
              {dispForm.disposition === "Callback Scheduled" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Callback Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={dispForm.scheduled_at}
                    onChange={(e) => setDispForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDispModal(null)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => dispMutation.mutate({ id: dispModal.id, ...dispForm })}
                disabled={!dispForm.disposition || dispMutation.isPending}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {dispMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
