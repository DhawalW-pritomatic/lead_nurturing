import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Plus, Play, BarChart3, Zap } from "lucide-react";

export default function SequencesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [startForm, setStartForm] = useState({
    lead_id: "",
    sequence_id: "",
    force_restart: false,
  });
  const [form, setForm] = useState({
    name: "",
    application_type_id: "",
    trigger_type: "enrollment",
    lead_type_target: "COLD",
    cold_followup_until_days: 30,
    cold_followup_template_ids: "",
    steps: [
      { day: 0, channel: "email", template_category: "welcome", notes: "" },
    ],
  });

  const { data: sequences, isLoading } = useQuery({
    queryKey: ["sequences"],
    queryFn: () => api.get("/sequences").then((r) => r.data),
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => api.get("/sequences/enrollments").then((r) => r.data),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-list"],
    queryFn: () =>
      api.get("/leads?limit=200").then((r) => r.data?.leads || r.data),
  });

  const { data: analyticsOverview } = useQuery({
    queryKey: ["sequences-analytics-overview"],
    queryFn: () => api.get("/sequences/analytics/overview").then((r) => r.data),
  });

  const { data: selectedSequenceAnalytics, isFetching: isAnalyticsLoading } =
    useQuery({
      queryKey: ["sequence-analytics", selectedSequenceId],
      queryFn: () =>
        api
          .get(`/sequences/${selectedSequenceId}/analytics`)
          .then((r) => r.data),
      enabled: Boolean(selectedSequenceId),
    });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api
        .post("/sequences", {
          ...data,
          cold_followup_template_ids: data.cold_followup_template_ids
            .split(",")
            .map((v: string) => v.trim())
            .filter(Boolean),
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] });
      queryClient.invalidateQueries({
        queryKey: ["sequences-analytics-overview"],
      });
      toast.success("Sequence created.");
      setShowCreate(false);
    },
  });

  const startMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/sequences/start", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Sequence started with history-aware logic.");
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({
        queryKey: ["sequences-analytics-overview"],
      });
      if (selectedSequenceId) {
        queryClient.invalidateQueries({
          queryKey: ["sequence-analytics", selectedSequenceId],
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to start sequence.");
    },
  });

  const addStep = () => {
    const lastDay =
      form.steps.length > 0 ? form.steps[form.steps.length - 1].day + 2 : 0;
    setForm({
      ...form,
      steps: [
        ...form.steps,
        {
          day: lastDay,
          channel: "email",
          template_category: "follow_up",
          notes: "",
        },
      ],
    });
  };

  const removeStep = (index: number) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const steps = [...form.steps];
    (steps[index] as any)[field] = value;
    setForm({ ...form, steps });
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    archived: "bg-red-100 text-red-700",
  };

  const selectedLead = (Array.isArray(leads) ? leads : []).find(
    (lead: any) => lead.id === startForm.lead_id,
  );

  const startableSequences = (Array.isArray(sequences) ? sequences : []).filter(
    (sequence: any) => {
      if (!selectedLead) return true;
      if (!sequence.application_type_id) return true;
      return sequence.application_type_id === selectedLead.application_type_id;
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sequences</h1>
          <p className="text-gray-500 mt-1">
            Automated drip campaigns for lead nurturing
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Sequence
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500">Total Sequences</p>
          <p className="text-2xl font-bold text-gray-900">
            {analyticsOverview?.sequences?.total || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Active Sequences</p>
          <p className="text-2xl font-bold text-gray-900">
            {analyticsOverview?.sequences?.active || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Enrollments</p>
          <p className="text-2xl font-bold text-gray-900">
            {analyticsOverview?.enrollments?.total || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Converted Leads</p>
          <p className="text-2xl font-bold text-gray-900">
            {analyticsOverview?.enrollments?.converted_leads || 0}
          </p>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-900">
          Start Sequence (History-Aware)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="input-field"
            value={startForm.lead_id}
            onChange={(e) =>
              setStartForm({ ...startForm, lead_id: e.target.value })
            }
          >
            <option value="">Select lead by name...</option>
            {(Array.isArray(leads) ? leads : []).map((lead: any) => (
              <option key={lead.id} value={lead.id}>
                {lead.first_name} {lead.last_name} ({lead.email})
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={startForm.sequence_id}
            onChange={(e) =>
              setStartForm({ ...startForm, sequence_id: e.target.value })
            }
          >
            <option value="">Select sequence by name...</option>
            {startableSequences.map((sequence: any) => (
              <option key={sequence.id} value={sequence.id}>
                {sequence.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={startForm.force_restart}
              onChange={(e) =>
                setStartForm({ ...startForm, force_restart: e.target.checked })
              }
            />
            Force restart if active
          </label>
        </div>
        {selectedLead?.applicationType?.name && (
          <p className="text-xs text-gray-500">
            Showing sequences compatible with project:{" "}
            {selectedLead.applicationType.name}
          </p>
        )}
        <button
          onClick={() => startMutation.mutate(startForm)}
          className="btn-primary inline-flex items-center gap-2"
          disabled={
            !startForm.lead_id ||
            !startForm.sequence_id ||
            startMutation.isPending
          }
        >
          <Play className="w-4 h-4" /> Start Sequence
        </button>
      </div>

      {showCreate && (
        <div className="card space-y-4">
          <h3 className="font-semibold">Create Sequence</h3>
          <div className="grid grid-cols-3 gap-4">
            <input
              placeholder="Sequence name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Application Type ID (Project)"
              value={form.application_type_id}
              onChange={(e) =>
                setForm({ ...form, application_type_id: e.target.value })
              }
              className="input-field"
            />
            <select
              value={form.trigger_type}
              onChange={(e) =>
                setForm({ ...form, trigger_type: e.target.value })
              }
              className="input-field"
            >
              <option value="enrollment">On Enrollment</option>
              <option value="score_change">Score Change</option>
              <option value="stale">Stale Detection</option>
              <option value="conversion">On Conversion</option>
            </select>
            <select
              value={form.lead_type_target}
              onChange={(e) =>
                setForm({ ...form, lead_type_target: e.target.value })
              }
              className="input-field"
            >
              <option value="COLD">Cold Leads</option>
              <option value="WARM">Warm Leads</option>
              <option value="HOT">Hot Leads</option>
              <option value="STALE">Stale Leads</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              min={1}
              value={form.cold_followup_until_days}
              onChange={(e) =>
                setForm({
                  ...form,
                  cold_followup_until_days: parseInt(e.target.value || "30"),
                })
              }
              className="input-field"
              placeholder="Cold follow-up until days"
            />
            <input
              value={form.cold_followup_template_ids}
              onChange={(e) =>
                setForm({ ...form, cold_followup_template_ids: e.target.value })
              }
              className="input-field"
              placeholder="Cold follow-up template IDs (comma-separated)"
            />
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Steps</h4>
            {form.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-xs font-bold text-brand-600 w-8">
                  #{i + 1}
                </span>
                <input
                  type="number"
                  value={step.day}
                  onChange={(e) =>
                    updateStep(i, "day", parseInt(e.target.value))
                  }
                  className="input-field w-20"
                  min={0}
                />
                <span className="text-xs text-gray-500">day</span>
                <select
                  value={step.channel}
                  onChange={(e) => updateStep(i, "channel", e.target.value)}
                  className="input-field w-28"
                >
                  <option value="email">Email</option>
                </select>
                <select
                  value={step.template_category}
                  onChange={(e) =>
                    updateStep(i, "template_category", e.target.value)
                  }
                  className="input-field w-36"
                >
                  <option value="welcome">Welcome</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="discount">Discount</option>
                  <option value="post_purchase">Post-Purchase</option>
                  <option value="reengagement">Re-engagement</option>
                </select>
                <input
                  placeholder="Notes"
                  value={step.notes}
                  onChange={(e) => updateStep(i, "notes", e.target.value)}
                  className="input-field flex-1"
                />
                <button
                  onClick={() => removeStep(i)}
                  className="text-red-500 text-xs hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addStep}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              + Add Step
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate(form)}
              className="btn-primary"
            >
              Create Sequence
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

      {/* Existing Sequences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(sequences || []).map((seq: any) => (
          <div key={seq.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{seq.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${statusColors[seq.status]}`}
                  >
                    {seq.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {seq.trigger_type} • {seq.lead_type_target}
                  </span>
                </div>
              </div>
              <Zap className="w-5 h-5 text-brand-500" />
            </div>
            <div className="space-y-1.5">
              {(seq.steps || []).slice(0, 4).map((step: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-gray-600"
                >
                  <span className="w-14 font-medium">Day {step.day}</span>
                  <span className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700">
                    {step.channel}
                  </span>
                  <span className="text-gray-400">
                    {step.template_category}
                  </span>
                </div>
              ))}
              {(seq.steps || []).length > 4 && (
                <p className="text-xs text-gray-400">
                  +{seq.steps.length - 4} more steps
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {seq.enrollments?.length || 0} active enrollments
              </span>
              <button
                onClick={() => setSelectedSequenceId(seq.id)}
                className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1"
              >
                <BarChart3 className="w-3 h-3" /> Analytics
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedSequenceId && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Sequence Analytics</h3>
            <button
              onClick={() => setSelectedSequenceId("")}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          {isAnalyticsLoading && (
            <p className="text-sm text-gray-500">Loading analytics...</p>
          )}
          {selectedSequenceAnalytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Started</p>
                  <p className="font-semibold">
                    {selectedSequenceAnalytics.enrollment_funnel
                      ?.total_started || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active</p>
                  <p className="font-semibold">
                    {selectedSequenceAnalytics.enrollment_funnel?.active || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="font-semibold">
                    {selectedSequenceAnalytics.enrollment_funnel?.completed ||
                      0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Exited</p>
                  <p className="font-semibold">
                    {selectedSequenceAnalytics.enrollment_funnel?.exited || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Converted</p>
                  <p className="font-semibold">
                    {selectedSequenceAnalytics.enrollment_funnel?.converted ||
                      0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversion %</p>
                  <p className="font-semibold">
                    {selectedSequenceAnalytics.enrollment_funnel
                      ?.conversion_rate || "0.0"}
                    %
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Step</th>
                      <th className="text-left py-2">Track</th>
                      <th className="text-left py-2">Sent</th>
                      <th className="text-left py-2">Opened</th>
                      <th className="text-left py-2">Clicked</th>
                      <th className="text-left py-2">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSequenceAnalytics.step_performance || []).map(
                      (step: any) => (
                        <tr
                          key={step.step_index}
                          className="border-b border-gray-100"
                        >
                          <td className="py-2">
                            Step {step.step_index + 1} (Day{" "}
                            {step.day_offset ?? "-"})
                          </td>
                          <td className="py-2">{step.track}</td>
                          <td className="py-2">{step.sent}</td>
                          <td className="py-2">{step.opened}</td>
                          <td className="py-2">{step.clicked}</td>
                          <td className="py-2">{step.failed}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active Enrollments */}
      {enrollments && enrollments.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">
            Active Enrollments ({enrollments.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">
                    Lead
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">
                    Sequence
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">
                    Step
                  </th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrollments.slice(0, 10).map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="py-2 text-sm">
                      {e.lead?.first_name} {e.lead?.last_name}
                    </td>
                    <td className="py-2 text-sm text-gray-600">
                      {e.sequence?.name}
                    </td>
                    <td className="py-2 text-sm">Step {e.current_step}</td>
                    <td className="py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${e.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
