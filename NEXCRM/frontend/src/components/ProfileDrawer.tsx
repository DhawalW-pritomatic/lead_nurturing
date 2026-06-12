import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
} from "lucide-react";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const queryClient = useQueryClient();
  const { user: currentUser, setAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"info" | "security">("info");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    territory: "",
    connected_gmail: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.get("/users/me/profile").then((r) => r.data),
    enabled: isOpen,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        territory: profile.territory || "",
        connected_gmail: profile.connected_gmail || "",
      });
    }
  }, [profile]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.put("/users/me/profile", data).then((r) => r.data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      if (currentUser) {
        setAuth(
          { ...currentUser, ...updatedUser },
          localStorage.getItem("access_token") || "",
          localStorage.getItem("refresh_token") || ""
        );
      }
      toast.success("Profile updated!");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Failed to update profile"),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: any) => api.put("/users/me/profile", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Failed to change password"),
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error("Password must be at least 8 characters!");
      return;
    }
    updatePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : currentUser
    ? `${currentUser.first_name?.[0] || ""}${currentUser.last_name?.[0] || ""}`.toUpperCase()
    : "?";

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : `${currentUser?.first_name} ${currentUser?.last_name}`;

  const roleLabel = (role: string) =>
    role?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const newPwStrength = (() => {
    const pw = passwordForm.new_password;
    if (!pw) return null;
    if (pw.length < 6) return { label: "Weak", color: "bg-red-400", width: "w-1/4" };
    if (pw.length < 8) return { label: "Fair", color: "bg-amber-400", width: "w-2/4" };
    if (pw.length < 12) return { label: "Good", color: "bg-blue-400", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">My Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar + identity */}
        <div className="px-6 py-5 bg-gradient-to-br from-brand-50 to-cyan-50 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-sm text-brand-600 font-medium">
                {roleLabel(profile?.role || currentUser?.role || "")}
              </p>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {profile?.email || currentUser?.email}
              </p>
            </div>
          </div>

          {/* Account status badges */}
          <div className="flex items-center gap-2 mt-4">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                profile?.is_active !== false
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              {profile?.is_active !== false ? "Active" : "Inactive"}
            </span>
            {profile?.rep_tags?.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["info", "security"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "info" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <User className="w-4 h-4" /> Personal Info
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Shield className="w-4 h-4" /> Security
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-lg" />
              ))}
            </div>
          ) : activeTab === "info" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, first_name: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, last_name: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="input-field bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Contact your admin to change email.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  className="input-field"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Territory
                </label>
                <input
                  type="text"
                  value={profileForm.territory}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, territory: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., North Region, Mumbai"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Connected Gmail
                </label>
                <input
                  type="email"
                  value={profileForm.connected_gmail}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, connected_gmail: e.target.value })
                  }
                  className="input-field"
                  placeholder="your-email@gmail.com"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used for email tracking features.
                </p>
              </div>

              {/* Account info read-only */}
              {profile && (
                <div className="mt-2 p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Account Details
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Role</p>
                      <p className="font-medium text-gray-800 mt-0.5">
                        {roleLabel(profile.role)}
                      </p>
                    </div>
                    {profile.tenant?.name && (
                      <div>
                        <p className="text-xs text-gray-400">Organisation</p>
                        <p className="font-medium text-gray-800 mt-0.5 truncate">
                          {profile.tenant.name}
                        </p>
                      </div>
                    )}
                    {(profile.last_login || profile.lastLogin) && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Last Login</p>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {new Date(profile.last_login || profile.lastLogin).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Security tab */
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Change your account password. Use at least 8 characters.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, current_password: e.target.value })
                    }
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, new_password: e.target.value })
                    }
                    className="input-field pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPwStrength && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${newPwStrength.color} ${newPwStrength.width}`}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Strength: <span className="font-medium">{newPwStrength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                    }
                    className={`input-field pr-10 ${
                      passwordForm.confirm_password &&
                      passwordForm.new_password !== passwordForm.confirm_password
                        ? "border-red-300 focus:ring-red-200"
                        : ""
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.confirm_password &&
                  passwordForm.new_password !== passwordForm.confirm_password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white">
          {activeTab === "info" ? (
            <button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updateProfileMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          ) : (
            <button
              onClick={handleChangePassword}
              disabled={
                updatePasswordMutation.isPending ||
                !passwordForm.current_password ||
                !passwordForm.new_password ||
                passwordForm.new_password !== passwordForm.confirm_password
              }
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {updatePasswordMutation.isPending ? "Changing…" : "Change Password"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
