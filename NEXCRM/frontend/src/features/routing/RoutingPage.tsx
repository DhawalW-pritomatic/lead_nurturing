import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Plus, GitBranch, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

export default function RoutingPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    priority: 1,
    condition_expression: {
      operator: "AND",
      conditions: [{ field: "score", op: ">=", value: 80 }],
    },
    action_config: { action: "assign_senior_rep", notify_manager: true },
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ["routing-rules"],
    queryFn: () => api.get("/routing").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/routing", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success("Rule created.");
      setShowCreate(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/routing/${id}/toggle`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success("Rule toggled.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/routing/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success("Rule deleted.");
    },
  });

  const actionLabels: Record<string, string> = {
    assign_senior_rep: "Assign Senior Rep",
    assign_round_robin: "Round Robin Assignment",
    enroll_sequence: "Enroll in Sequence",
    mark_stale: "Mark as Stale",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routing Rules</h1>
          <p className="text-gray-500 mt-1">
            Configure lead routing based on score and behavior
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {showCreate && (
        <div className="card space-y-4">
          <h3 className="font-semibold">Create Routing Rule</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Rule name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
            />
            <input
              type="number"
              placeholder="Priority (1=highest)"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: parseInt(e.target.value) })
              }
              className="input-field"
              min={1}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Condition
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">If score</span>
              <select
                value={form.condition_expression.conditions[0].op}
                onChange={(e) =>
                  setForm({
                    ...form,
                    condition_expression: {
                      ...form.condition_expression,
                      conditions: [
                        {
                          ...form.condition_expression.conditions[0],
                          op: e.target.value,
                        },
                      ],
                    },
                  })
                }
                className="input-field w-24"
              >
                <option value=">=">≥</option>
                <option value="<=">≤</option>
                <option value=">">{">"}</option>
                <option value="<">{"<"}</option>
                <option value="==">==</option>
              </select>
              <input
                type="number"
                value={form.condition_expression.conditions[0].value as number}
                onChange={(e) =>
                  setForm({
                    ...form,
                    condition_expression: {
                      ...form.condition_expression,
                      conditions: [
                        {
                          ...form.condition_expression.conditions[0],
                          value: parseInt(e.target.value),
                        },
                      ],
                    },
                  })
                }
                className="input-field w-20"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Action
            </label>
            <select
              value={form.action_config.action}
              onChange={(e) =>
                setForm({
                  ...form,
                  action_config: {
                    ...form.action_config,
                    action: e.target.value,
                  },
                })
              }
              className="input-field"
            >
              <option value="assign_senior_rep">Assign Senior Rep</option>
              <option value="assign_round_robin">Round Robin</option>
              <option value="enroll_sequence">Enroll in Sequence</option>
              <option value="mark_stale">Mark Stale</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate(form)}
              className="btn-primary"
            >
              Create Rule
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

      <div className="card">
        <div className="space-y-3">
          {(rules || []).map((rule: any) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${rule.is_active ? "border-green-200 bg-green-50/50" : "border-gray-200 bg-gray-50"}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-brand-600 w-8">
                  #{rule.priority}
                </span>
                <GitBranch className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {rule.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Condition:{" "}
                    {JSON.stringify(
                      rule.condition_expression?.conditions?.[0] || {},
                    )}{" "}
                    →{" "}
                    {actionLabels[rule.action_config?.action] ||
                      rule.action_config?.action}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleMutation.mutate(rule.id)}
                  className="p-1.5 hover:bg-white rounded"
                >
                  {rule.is_active ? (
                    <ToggleRight className="w-6 h-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete rule?")) deleteMutation.mutate(rule.id);
                  }}
                  className="p-1.5 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
