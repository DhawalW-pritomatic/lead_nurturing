import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import { UserPlus, Edit2, Ban, CheckCircle, Save } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "sales_rep",
    phone: "",
    territory: "",
    password: "Welcome@123",
  });
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "sales_rep",
    phone: "",
    territory: "",
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const { data: performance } = useQuery({
    queryKey: ["rep-performance"],
    queryFn: () => api.get("/users/performance").then((r) => r.data),
  });

  const resetCreateForm = () =>
    setForm({ first_name: "", last_name: "", email: "", role: "sales_rep", phone: "", territory: "", password: "Welcome@123" });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/users", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created.");
      setShowCreate(false);
      resetCreateForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: any) =>
      api.put(`/users/${id}`, { is_active }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Updated.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated.");
      setEditUser(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update"),
  });

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role: user.role || "sales_rep",
      phone: user.phone || "",
      territory: user.territory || "",
    });
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    tenant_admin: "Tenant Admin",
    sales_manager: "Sales Manager",
    senior_sales_rep: "Senior Rep",
    sales_rep: "Sales Rep",
    read_only_analyst: "Analyst",
  };
  const roleColors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    tenant_admin: "bg-purple-100 text-purple-700",
    sales_manager: "bg-blue-100 text-blue-700",
    senior_sales_rep: "bg-cyan-100 text-cyan-700",
    sales_rep: "bg-green-100 text-green-700",
    read_only_analyst: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Reps</h1>
          <p className="text-gray-500 mt-1">
            Manage team members and sales representatives
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm(); }}
        title="Add New User"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input
                placeholder="John"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="input-field"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input
                placeholder="Doe"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              placeholder="john@company.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input-field"
            >
              <option value="sales_rep">Sales Rep</option>
              <option value="senior_sales_rep">Senior Sales Rep</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="tenant_admin">Tenant Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
              <input
                placeholder="+1 (555) 123-4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Territory <span className="text-gray-400">(optional)</span></label>
              <input
                placeholder="e.g. North Region"
                value={form.territory}
                onChange={(e) => setForm({ ...form, territory: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
            Default password: <span className="font-mono font-semibold">Welcome@123</span> — user should change on first login.
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.first_name.trim() || !form.email.trim() || createMutation.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {createMutation.isPending ? "Creating…" : "Create User"}
            </button>
            <button onClick={() => { setShowCreate(false); resetCreateForm(); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title={editUser ? `Edit — ${editUser.first_name} ${editUser.last_name}` : "Edit User"}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
              <input
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="input-field"
            >
              <option value="sales_rep">Sales Rep</option>
              <option value="senior_sales_rep">Senior Sales Rep</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="tenant_admin">Tenant Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Territory</label>
              <input
                value={editForm.territory}
                onChange={(e) => setEditForm({ ...editForm, territory: e.target.value })}
                className="input-field"
                placeholder="e.g. North Region"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => updateMutation.mutate({ id: editUser?.id, data: editForm })}
              disabled={updateMutation.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditUser(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* User list */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                {isSuperAdmin && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                )}
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Territory
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((user: any) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  {isSuperAdmin && (
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {user.tenant?.name || "—"}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${roleColors[user.role]}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {user.territory || "—"}
                  </td>
                  <td className="py-3 px-4">
                    {user.is_active ? (
                      <span className="text-xs text-green-600 font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 font-medium">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: user.id,
                            is_active: !user.is_active,
                          })
                        }
                        className="text-gray-400 hover:text-gray-700"
                        title={user.is_active ? "Deactivate" : "Activate"}
                      >
                        {user.is_active ? (
                          <Ban className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance */}
      {performance && performance.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Rep Performance</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {performance.length} active reps across all tenants
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {performance.map((p: any) => {
              const rate = parseFloat(p.conversion_rate || "0");
              const rateColor =
                rate >= 15
                  ? "text-green-600 bg-green-50"
                  : rate >= 8
                    ? "text-amber-600 bg-amber-50"
                    : "text-gray-500 bg-gray-50";
              const initials = (p.rep.name || "?")
                .split(" ")
                .map((s: string) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div
                  key={`${p.rep.id}-${p.tenant?.id || ""}`}
                  className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-brand-200 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {p.rep.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.rep.email}
                      </p>
                      {p.tenant?.name && (
                        <span className="inline-block mt-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                          {p.tenant.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Total
                      </p>
                      <p className="text-lg font-bold text-gray-900 mt-0.5">
                        {p.total_leads}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Hot
                      </p>
                      <p className="text-lg font-bold text-red-600 mt-0.5">
                        {p.hot_leads}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Converted
                      </p>
                      <p className="text-lg font-bold text-green-600 mt-0.5">
                        {p.converted_leads}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`mt-3 inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${rateColor}`}
                  >
                    {p.conversion_rate}% conversion
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
