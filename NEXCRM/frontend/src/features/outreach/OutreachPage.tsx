import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import {
  Send,
  Mail,
  Eye,
  MousePointer,
  Clock,
  MessageSquare,
  X,
  CornerUpRight,
} from "lucide-react";

export default function OutreachPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  // Real-time: refresh counts the moment a tracking pixel fires on the backend.
  // Connect directly to localhost:5000 to bypass the Vite proxy, which buffers
  // chunked streaming responses and breaks SSE delivery.
  useEffect(() => {
    if (!token) return;
    const backendUrl = "http://localhost:5000";
    const es = new EventSource(
      `${backendUrl}/api/outreach/events?token=${encodeURIComponent(token)}`
    );
    es.addEventListener("email_opened", () => {
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
      queryClient.invalidateQueries({ queryKey: ["outreach-stats"] });
    });
    es.onerror = () => es.close();
    return () => es.close();
  }, [token, queryClient]);

  const [selectedLead, setSelectedLead] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [queryStatusFilter, setQueryStatusFilter] = useState<
    "all" | "pending" | "answered"
  >("all");
  const [answeringQuery, setAnsweringQuery] = useState<any>(null);
  const [answerText, setAnswerText] = useState("");

  const { data: outreach = [], isLoading } = useQuery({
    queryKey: ["outreach"],
    queryFn: () =>
      api.get("/outreach/history").then((r) => r.data?.records || []),
    refetchInterval: 30 * 1000,
  });

  const {
    data: stats = {
      total: 0,
      opened: 0,
      clicked: 0,
      open_rate: "0",
      click_rate: "0",
    },
  } = useQuery({
    queryKey: ["outreach-stats"],
    queryFn: () => api.get("/outreach/stats").then((r) => r.data),
    refetchInterval: 30 * 1000,
  });

  const {
    data: queryStats = {
      total: 0,
      pending: 0,
      answered: 0,
      inbound_email_queries: 0,
    },
  } = useQuery({
    queryKey: ["query-stats"],
    queryFn: () => api.get("/track/queries/stats").then((r) => r.data),
    refetchInterval: 2 * 60 * 1000,
  });

  const {
    data: queryHistory = { rows: [] },
    isLoading: isQueryHistoryLoading,
  } = useQuery({
    queryKey: ["query-history", queryStatusFilter],
    queryFn: () =>
      api
        .get("/track/queries/history", {
          params: {
            limit: 50,
            status: queryStatusFilter === "all" ? undefined : queryStatusFilter,
          },
        })
        .then((r) => r.data),
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-list"],
    queryFn: () =>
      api.get("/leads?limit=200").then((r) => r.data?.leads || r.data),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get("/templates").then((r) => r.data),
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/outreach/send", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach"] });
      queryClient.invalidateQueries({ queryKey: ["outreach-stats"] });
      toast.success("Email sent successfully!");
      setSelectedLead("");
      setSelectedTemplate("");
      setSubject("");
    },
    onError: () => toast.error("Failed to send email"),
  });

  const answerMutation = useMutation({
    mutationFn: ({ id, answer_text }: { id: string; answer_text: string }) =>
      api
        .patch(`/track/queries/${id}/answer`, { answer_text })
        .then((r) => r.data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["query-history"] });
      queryClient.invalidateQueries({ queryKey: ["query-stats"] });
      if (data?.metadata?.email_sent === false) {
        toast.error(
          "Reply saved but email was NOT delivered — check your SMTP credentials in the backend .env file.",
          { duration: 8000 }
        );
      } else {
        toast.success("Reply sent and email delivered to lead!");
      }
      setAnsweringQuery(null);
      setAnswerText("");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to send reply"),
  });

  const handleSend = () => {
    if (!selectedLead || !selectedTemplate) {
      toast.error("Select lead and template");
      return;
    }
    sendMutation.mutate({
      lead_id: selectedLead,
      template_id: selectedTemplate,
      subject: subject || undefined,
    });
  };

  const handleAnswer = () => {
    if (!answerText.trim()) {
      toast.error("Please enter a reply");
      return;
    }
    answerMutation.mutate({
      id: answeringQuery.id,
      answer_text: answerText.trim(),
    });
  };

  const openAnswerModal = (q: any) => {
    setAnsweringQuery(q);
    setAnswerText("");
  };

  const closeAnswerModal = () => {
    setAnsweringQuery(null);
    setAnswerText("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
        <p className="text-gray-500 mt-1">Send emails and track engagement</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <Mail className="w-8 h-8 text-brand-600" />
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Sent</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Eye className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold">{stats.opened}</p>
            <p className="text-xs text-gray-500">Opened</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <MousePointer className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-2xl font-bold">{stats.clicked}</p>
            <p className="text-xs text-gray-500">Clicked</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-600" />
          <div>
            <p className="text-2xl font-bold">{stats.open_rate}%</p>
            <p className="text-xs text-gray-500">Open Rate</p>
          </div>
        </div>
      </div>

      {/* Send Form */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Send Email</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Lead
            </label>
            <select
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
              className="input-field"
            >
              <option value="">Select lead...</option>
              {(Array.isArray(leads) ? leads : []).map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.first_name} {l.last_name} ({l.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="input-field"
            >
              <option value="">Select template...</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Subject (optional override)
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
              placeholder="Custom subject..."
            />
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={sendMutation.isPending}
          className="btn-primary mt-4 flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Send Email
        </button>
      </div>

      {/* History */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Outreach History</h3>
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Recipient</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">Sent At</th>
                  <th className="table-header">Opened</th>
                  <th className="table-header">Clicked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {outreach.slice(0, 50).map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">
                      {o.lead?.email || o.recipient_email || "—"}
                    </td>
                    <td className="table-cell">{o.subject || "—"}</td>
                    <td className="table-cell text-sm text-gray-500">
                      {formatDateTime(o.sent_at || o.sentAt)}
                    </td>
                    <td className="table-cell">
                      {o.opened_at || o.openedAt ? (
                        <span className="text-green-600 text-sm">
                          ✓ {formatDate(o.opened_at || o.openedAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {o.clicked_at || o.clickedAt ? (
                        <span className="text-blue-600 text-sm">
                          ✓ {formatDate(o.clicked_at || o.clickedAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {outreach.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No outreach records yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Inbound Email Query Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-indigo-600" />
          <div>
            <p className="text-2xl font-bold">
              {queryStats.inbound_email_queries || 0}
            </p>
            <p className="text-xs text-gray-500">Inbound Email Queries</p>
          </div>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-gray-900">
            {queryStats.total || 0}
          </p>
          <p className="text-xs text-gray-500">Total Queries</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-amber-700">
            {queryStats.pending || 0}
          </p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-green-700">
            {queryStats.answered || 0}
          </p>
          <p className="text-xs text-green-600">Answered</p>
        </div>
      </div>

      {/* Inbound Email Query History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Inbound Query History (Email Replies)
          </h3>
          <select
            value={queryStatusFilter}
            onChange={(e) => setQueryStatusFilter(e.target.value as any)}
            className="input-field w-auto"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="answered">Answered</option>
          </select>
        </div>

        {isQueryHistoryLoading ? (
          <p className="text-gray-500">Loading query history...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Lead</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">Lead Reply</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Admin Answer</th>
                  <th className="table-header">Owner</th>
                  <th className="table-header">Answered By</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Answered At</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(queryHistory.rows || []).map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">
                      {q.lead?.first_name} {q.lead?.last_name}
                      <div className="text-xs text-gray-500">
                        {q.lead?.email || "—"}
                      </div>
                    </td>
                    <td className="table-cell">
                      {q.subject || "(no subject)"}
                    </td>
                    <td className="table-cell max-w-md">
                      <div className="whitespace-pre-wrap break-words text-sm text-gray-700">
                        {q.metadata?.lead_reply_text ||
                          q.metadata?.raw_inbound_text ||
                          q.body ||
                          "-"}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${q.status === "answered" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="table-cell max-w-md">
                      <div className="whitespace-pre-wrap break-words text-sm text-gray-700">
                        {q.metadata?.answer_text ||
                          q.metadata?.answer_body ||
                          q.metadata?.response ||
                          q.metadata?.admin_reply ||
                          (q.status === "answered"
                            ? "Answered (text not captured)"
                            : "-")}
                      </div>
                      {q.status === "answered" &&
                        q.metadata?.email_sent === false && (
                          <span className="mt-1 inline-block text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            Email not delivered — check SMTP config
                          </span>
                        )}
                      {q.status === "answered" &&
                        q.metadata?.email_sent === true && (
                          <span className="mt-1 inline-block text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            Email delivered
                          </span>
                        )}
                    </td>
                    <td className="table-cell">
                      {q.owner
                        ? `${q.owner.first_name} ${q.owner.last_name}`
                        : "—"}
                    </td>
                    <td className="table-cell">
                      {q.answeredBy
                        ? `${q.answeredBy.first_name} ${q.answeredBy.last_name}`
                        : "—"}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {formatDateTime(q.created_at || q.createdAt)}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {formatDateTime(q.answered_at || q.answeredAt)}
                    </td>
                    <td className="table-cell">
                      {q.status === "pending" ? (
                        <button
                          onClick={() => openAnswerModal(q)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
                        >
                          <CornerUpRight className="w-3.5 h-3.5" /> Reply
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(queryHistory.rows || []).length === 0 && (
              <p className="text-center text-gray-400 py-8">
                No inbound query history found.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {answeringQuery && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Reply to Lead</h3>
              <button
                onClick={closeAnswerModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Lead:</span>{" "}
                {answeringQuery.lead?.first_name} {answeringQuery.lead?.last_name}{" "}
                <span className="text-gray-400">
                  ({answeringQuery.lead?.email})
                </span>
              </p>
              <p>
                <span className="font-medium">Subject:</span>{" "}
                {answeringQuery.subject || "(no subject)"}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Lead's message
              </p>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto border border-gray-200">
                {answeringQuery.metadata?.lead_reply_text ||
                  answeringQuery.metadata?.raw_inbound_text ||
                  answeringQuery.body ||
                  "—"}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Your Reply
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={5}
                className="input-field w-full"
                placeholder="Type your reply to the lead..."
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={closeAnswerModal} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAnswer}
                disabled={answerMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {answerMutation.isPending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
