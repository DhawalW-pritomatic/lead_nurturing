import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Play, Pause, Clock, Zap } from "lucide-react";
import { formatDate } from "../../utils/dateUtils";

export default function SchedulerPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    template_id: "",
    day_offset: 0,
    target_lead_type: "",
    target_lead_status: "",
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => api.get("/scheduler").then((r) => r.data),
  });

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get("/templates").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/scheduler", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule created.");
      setShowCreate(false);
      setForm({
        name: "",
        template_id: "",
        day_offset: 0,
        target_lead_type: "",
        target_lead_status: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/scheduler/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule deleted.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/scheduler/${id}/toggle`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule toggled.");
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/scheduler/${id}/run`).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success(`Executed: ${data.sent} sent, ${data.failed} failed.`);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Scheduler</h1>
          <p className="text-gray-500 mt-1">
            Configure automated emails based on lead age (days since creation)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">How it works</h4>
            <p className="text-sm text-blue-700 mt-1">
              Schedules run automatically every day at 9 AM. For each schedule,
              leads created exactly
              <strong> N days ago</strong> (the day offset) will receive the
              configured template. Each tenant&apos;s nurturing settings (pause,
              allowed days, send window) are respected.
            </p>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="card space-y-4">
          <h3 className="font-semibold">Create Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Schedule name (e.g., Day 1 Welcome)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
            />
            <select
              value={form.template_id}
              onChange={(e) =>
                setForm({ ...form, template_id: e.target.value })
              }
              className="input-field"
            >
              <option value="">Select Template</option>
              {(templates || []).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Day Offset (days after lead creation)
              </label>
              <input
                type="number"
                value={form.day_offset}
                onChange={(e) =>
                  setForm({
                    ...form,
                    day_offset: parseInt(e.target.value) || 0,
                  })
                }
                className="input-field"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Target Lead Type (optional)
              </label>
              <select
                value={form.target_lead_type}
                onChange={(e) =>
                  setForm({ ...form, target_lead_type: e.target.value })
                }
                className="input-field"
              >
                <option value="">All Types</option>
                <option value="COLD">Cold</option>
                <option value="WARM">Warm</option>
                <option value="HOT">Hot</option>
                <option value="STALE">Stale</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">
                Target Lead Status (optional)
              </label>
              <select
                value={form.target_lead_status}
                onChange={(e) =>
                  setForm({ ...form, target_lead_status: e.target.value })
                }
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="ACTIVE">Active</option>
                <option value="ENGAGED">Engaged</option>
                <option value="STALE">Stale</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate(form)}
              className="btn-primary"
            >
              Create Schedule
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule List */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 rounded-xl animate-pulse"
            />
          ))
        ) : !schedules || schedules.length === 0 ? (
          <div className="card text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No schedules configured yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a schedule to automatically send emails to leads on
              specific days.
            </p>
          </div>
        ) : (
          schedules.map((schedule: any) => (
            <div
              key={schedule.id}
              className={`card flex items-center justify-between ${!schedule.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${schedule.is_active ? "bg-green-100" : "bg-gray-100"}`}
                >
                  <Zap
                    className={`w-5 h-5 ${schedule.is_active ? "text-green-600" : "text-gray-400"}`}
                  />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{schedule.name}</h4>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500">
                      Day {schedule.day_offset}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {schedule.template?.name || "Template"}
                    </span>
                    {schedule.target_lead_type && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {schedule.target_lead_type}
                      </span>
                    )}
                    {(schedule.last_run_at || schedule.lastRunAt) && (
                      <span className="text-xs text-gray-400">
                        Last run:{" "}
                        {formatDate(schedule.last_run_at || schedule.lastRunAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runNowMutation.mutate(schedule.id)}
                  className="p-2 hover:bg-blue-50 rounded text-blue-600"
                  title="Run Now"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleMutation.mutate(schedule.id)}
                  className={`p-2 rounded ${schedule.is_active ? "hover:bg-amber-50 text-amber-600" : "hover:bg-green-50 text-green-600"}`}
                  title={schedule.is_active ? "Pause" : "Activate"}
                >
                  {schedule.is_active ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this schedule?"))
                      deleteMutation.mutate(schedule.id);
                  }}
                  className="p-2 hover:bg-red-50 rounded text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
