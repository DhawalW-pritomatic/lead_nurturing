import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";
import { PhoneCall, X, CalendarClock } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const DISPOSITIONS = [
  "Answered",
  "No Answer",
  "Busy",
  "Left Voicemail",
  "Interested",
  "Not Interested",
  "Callback Scheduled",
  "Wrong Number",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: { id: string; first_name: string; last_name: string; phone?: string };
}

export default function LogCallModal({ isOpen, onClose, lead }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
  const [disposition, setDisposition] = useState("Answered");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [nextCallAt, setNextCallAt] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      // Log the call
      await api.post("/calls/log", {
        lead_id: lead.id,
        direction,
        disposition,
        notes: notes || undefined,
        duration_seconds: duration ? parseInt(duration) : undefined,
        scheduled_at: scheduledAt || undefined,
      });

      // Auto-create a task + callback schedule if next call is scheduled
      if (nextCallAt) {
        await Promise.all([
          api.post("/tasks", {
            title: `Call - ${lead.first_name} ${lead.last_name}`,
            description: "",
            priority: "medium",
            due_date: nextCallAt,
            lead_id: lead.id,
            assigned_to: user?.id,
          }),
          api.post("/callbacks", {
            lead_id: lead.id,
            scheduled_at: nextCallAt,
            notes: notes || undefined,
          }),
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-history", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["call-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["callbacks"] });
      if (nextCallAt) {
        toast.success(`Call logged & task "Call - ${lead.first_name} ${lead.last_name}" created.`);
      } else {
        toast.success("Call logged successfully.");
      }
      handleClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to log call"),
  });

  const handleClose = () => {
    setDirection("outbound");
    setDisposition("Answered");
    setNotes("");
    setDuration("");
    setScheduledAt("");
    setNextCallAt("");
    onClose();
  };

  if (!isOpen) return null;

  const canSubmit = !mutation.isPending &&
    !(disposition === "Callback Scheduled" && !scheduledAt);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Log Call</h2>
              <p className="text-xs text-gray-500">
                {lead.first_name} {lead.last_name}{lead.phone ? ` · ${lead.phone}` : ""}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Direction */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Call Direction</label>
            <div className="flex gap-2">
              {(["outbound", "inbound"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    direction === d
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {d === "outbound" ? "↗ Outbound" : "↙ Inbound"}
                </button>
              ))}
            </div>
          </div>

          {/* Disposition */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Disposition</label>
            <select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {DISPOSITIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Callback datetime — only when Callback Scheduled */}
          {disposition === "Callback Scheduled" && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Callback Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Duration (seconds, optional)</label>
            <input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 120"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="What was discussed?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Schedule next call */}
          <div className="border border-dashed border-brand-200 rounded-xl p-3 bg-brand-50/40">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="w-4 h-4 text-brand-600" />
              <label className="text-xs font-semibold text-brand-700">Schedule Next Call (optional)</label>
            </div>
            <input
              type="datetime-local"
              value={nextCallAt}
              onChange={(e) => setNextCallAt(e.target.value)}
              className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
            {nextCallAt && (
              <p className="text-xs text-brand-600 mt-1.5">
                Creates task: <span className="font-medium">"Call - {lead.first_name} {lead.last_name}"</span> assigned to you
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Saving…" : "Log Call"}
          </button>
        </div>
      </div>
    </div>
  );
}
