import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@edu.nexcrm.io");
  const [password, setPassword] = useState("Admin@123");
  const [tenantSubdomain, setTenantSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { email, password };
      if (tenantSubdomain.trim()) {
        payload.tenant_subdomain = tenantSubdomain.trim();
      }
      const { data } = await api.post("/auth/login", payload);
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success(`Welcome back, ${data.user.first_name}!`);
      // Redirect super_admin to admin panel, others to dashboard
      navigate(data.user.role === "super_admin" ? "/admin" : "/");
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Login failed";
      toast.error(errorMessage, { duration: 5000 }); // Show for 5 seconds if it contains tenant list
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500 via-cyan-600 to-orange-500">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/logo.jpeg" alt="Pritomatic" className="w-8 h-8" />
              <h1 className="text-3xl font-bold text-gray-900">Pritomatic</h1>
            </div>
            <p className="text-gray-500 mt-2">Multi-Tenant CRM Platform</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="your-email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          {/* <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Demo Credentials:
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-medium">Super Admin:</span> superadmin@nexcrm.io / Admin@123
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-medium">Tenant Admin:</span> admin@edu.nexcrm.io / Admin@123
            </p>
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Sales Rep:</span> rep1@edu.nexcrm.io / Rep@123
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}
