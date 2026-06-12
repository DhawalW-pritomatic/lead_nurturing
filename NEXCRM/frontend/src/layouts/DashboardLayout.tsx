import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import {
  LayoutDashboard,
  Users,
  FileText,
  GitBranch,
  FolderOpen,
  Settings,
  LogOut,
  Target,
  Zap,
  UserCircle,
  Upload,
  Bell,
  BookOpen,
  Shield,
  Heart,
  CheckSquare,
  X,
  AlertTriangle,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/leads", icon: Target, label: "Leads" },
  { to: "/nurturing", icon: Heart, label: "Nurturing" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/sequences", icon: Zap, label: "Sequences" },
  { to: "/bulk-import", icon: Upload, label: "Bulk Import" },
  { to: "/routing", icon: GitBranch, label: "Routing" },
  { to: "/assets", icon: FolderOpen, label: "Assets" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/users", icon: Users, label: "Users" },
  { to: "/guidelines", icon: BookOpen, label: "Guidelines" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const adminNavItems = [
  { to: "/admin", icon: Shield, label: "Super Admin", roles: ["super_admin"] },
];

interface FailedLeadEvent {
  lead_id: string;
  lead_name: string;
  call_attempt_count: number;
}

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [failedAlert, setFailedAlert] = useState<FailedLeadEvent | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // SSE for real-time events (lead_failed, temperature changes)
  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;
    const es = new EventSource(`http://localhost:5000/api/outreach/events?token=${token}`);
    sseRef.current = es;

    es.addEventListener("lead_failed", (e: MessageEvent) => {
      try {
        setFailedAlert(JSON.parse(e.data));
      } catch (_) {}
    });

    return () => { es.close(); sseRef.current = null; };
  }, []);

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api.get("/notifications/unread-count").then((r) => r.data),
    refetchInterval: 30000, // poll every 30s
  });

  const unreadCount = unreadData?.unread_count || 0;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Pritomatic" className="w-7 h-7" />
            <h1 className="text-2xl font-bold text-gray-900 ">Pritomatic</h1>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {user?.role === "super_admin" ? "Super Admin Panel" : (user?.tenant?.name || "Multi-Tenant CRM")}
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Regular navigation - visible for all users */}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.label === "Notifications" && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </NavLink>
          ))}

          {/* Super Admin Section - only visible for super_admin */}
          {user?.role === "super_admin" && (
            adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "text-purple-600 hover:bg-purple-50 hover:text-purple-700 border border-transparent"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))
          )}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 mb-3 w-full p-2 rounded-lg hover:bg-brand-50 transition-colors group"
          >
            <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center group-hover:bg-brand-200 transition-colors">
              <UserCircle className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-700">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors w-full px-3 py-2 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Lead FAILED alert popup */}
      {failedAlert && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border border-red-200 rounded-2xl shadow-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Call Threshold Reached</p>
              <p className="text-sm text-gray-600 mt-0.5">
                <span className="font-medium">{failedAlert.lead_name}</span> has been marked{" "}
                <span className="text-red-600 font-semibold">FAILED</span> after{" "}
                {failedAlert.call_attempt_count} unsuccessful call attempts.
              </p>
              <button
                onClick={() => { navigate(`/leads/${failedAlert.lead_id}`); setFailedAlert(null); }}
                className="mt-2 text-xs text-brand-600 hover:underline font-medium"
              >
                View Lead →
              </button>
            </div>
            <button onClick={() => setFailedAlert(null)} className="flex-shrink-0 mt-0.5">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
