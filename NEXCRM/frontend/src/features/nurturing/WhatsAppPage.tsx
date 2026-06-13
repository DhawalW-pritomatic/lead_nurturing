import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, User } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface WaMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  is_opt_out: boolean;
  created_at: string;
  lead?: { id: string; first_name: string; last_name: string; phone: string };
  rep?: { id: string; first_name: string; last_name: string };
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp_opted_out?: boolean;
}

export default function WhatsAppPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [body, setBody] = useState("");
  const [leadSearch, setLeadSearch] = useState("");

  const { data: messages = [], isLoading } = useQuery<WaMessage[]>({
    queryKey: ["whatsapp-history", selectedLead?.id],
    queryFn: () =>
      api
        .get("/whatsapp/history", { params: selectedLead ? { lead_id: selectedLead.id } : {} })
        .then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: leadsData } = useQuery({
    queryKey: ["leads-search-wa", leadSearch],
    queryFn: () =>
      api.get("/leads", { params: { search: leadSearch, limit: 10 } }).then((r) => r.data),
    enabled: leadSearch.length > 1,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { lead_id: string; body: string }) =>
      api.post("/whatsapp/send", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-history"] });
      setBody("");
    },
  });

  const handleSend = () => {
    if (!selectedLead || !body.trim()) return;
    sendMutation.mutate({ lead_id: selectedLead.id, body: body.trim() });
  };

  const leads: Lead[] = leadsData?.leads || [];

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-96">
      {/* Lead list */}
      <div className="col-span-1 border border-gray-200 rounded-xl overflow-hidden flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search leads..."
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads.length === 0 && leadSearch.length > 1 && (
            <p className="text-center text-sm text-gray-400 py-8">No leads found</p>
          )}
          {leadSearch.length <= 1 && (
            <p className="text-center text-sm text-gray-400 py-8">Type to search leads</p>
          )}
          {leads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                selectedLead?.id === lead.id ? "bg-brand-50" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {lead.first_name} {lead.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{lead.phone || "No phone"}</p>
              </div>
              {lead.whatsapp_opted_out && (
                <span className="text-xs text-red-500 font-medium">Opted out</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="col-span-2 border border-gray-200 rounded-xl overflow-hidden flex flex-col bg-white">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Select a lead to view messages</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedLead.first_name} {selectedLead.last_name}
                </p>
                <p className="text-xs text-gray-500">{selectedLead.phone}</p>
              </div>
              {selectedLead.whatsapp_opted_out && (
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  Opted Out
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading && <p className="text-center text-sm text-gray-400">Loading...</p>}
              {messages
                .filter((m) => m.lead?.id === selectedLead.id)
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl text-sm ${
                        msg.direction === "outbound"
                          ? "bg-green-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      <p>{msg.body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.direction === "outbound" ? "text-green-100" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {msg.direction === "outbound" && ` · ${msg.status}`}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Compose */}
            <div className="p-3 border-t border-gray-100">
              {selectedLead.whatsapp_opted_out ? (
                <p className="text-center text-sm text-red-500 py-2">
                  This lead has opted out of WhatsApp messages.
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!body.trim() || sendMutation.isPending}
                    className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-50 flex items-center justify-center transition-colors"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              {sendMutation.isError && (
                <p className="text-xs text-red-500 mt-1 text-center">
                  {(sendMutation.error as any)?.response?.data?.error || "Failed to send"}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
