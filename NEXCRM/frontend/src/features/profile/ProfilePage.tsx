import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { User, Lock, Mail, Phone, MapPin, Save } from "lucide-react";
import { formatDate } from "../../utils/dateUtils";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: currentUser, setAuth } = useAuthStore();
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.get("/users/me/profile").then((r) => r.data),
  });

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

  // Initialize form when profile loads
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

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) =>
      api.put("/users/me/profile", data).then((r) => r.data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      // Update auth store with new user data
      if (currentUser) {
        setAuth(
          { ...currentUser, ...updatedUser },
          localStorage.getItem("access_token") || "",
          localStorage.getItem("refresh_token") || ""
        );
      }
      toast.success("Profile updated successfully!");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Failed to update profile"),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: any) =>
      api.put("/users/me/profile", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setShowPasswordChange(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || "Failed to change password"),
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error("Password must be at least 8 characters long!");
      return;
    }
    updatePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded-xl"></div>
        <div className="h-96 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">
          Manage your personal information and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="card lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-orange-600 mb-4">
              Personal Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="input-field bg-gray-100 cursor-not-allowed"
                  title="Email cannot be changed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed. Contact your admin if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Territory
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Connected Gmail (for email tracking)
                </label>
                <input
                  type="email"
                  value={profileForm.connected_gmail}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      connected_gmail: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="your-email@gmail.com"
                />
              </div>

              <button
                onClick={handleUpdateProfile}
                disabled={updateProfileMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updateProfileMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-orange-600 mb-4">
              Security Settings
            </h2>
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        current_password: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        new_password: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 8 characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirm_password: e.target.value,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleChangePassword}
                    disabled={updatePasswordMutation.isPending}
                    className="btn-primary"
                  >
                    {updatePasswordMutation.isPending
                      ? "Changing..."
                      : "Change Password"}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordForm({
                        current_password: "",
                        new_password: "",
                        confirm_password: "",
                      });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Info Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-cyan-600 mb-3">
              Account Information
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Role</p>
                <p className="font-medium text-gray-900">
                  {profile.role?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Account Status</p>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    profile.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {profile.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              {(profile.last_login || profile.lastLogin) && (
                <div>
                  <p className="text-gray-500">Last Login</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(profile.last_login || profile.lastLogin)}
                  </p>
                </div>
              )}
              {profile.rep_tags && profile.rep_tags.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.rep_tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-blue-50 border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              💡 Profile Tips
            </h3>
            <ul className="text-xs text-blue-800 space-y-2">
              <li>• Keep your phone number updated for better communication</li>
              <li>• Set your territory to help with lead routing</li>
              <li>• Connect your Gmail for email tracking features</li>
              <li>• Use a strong password with at least 8 characters</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
