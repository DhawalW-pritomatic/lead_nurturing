import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import LeadsPage from "./features/leads/LeadsPage";
import LeadDetailPage from "./features/leads/LeadDetailPage";
import LeadCreatePage from "./features/leads/LeadCreatePage";
import TemplatesPage from "./features/templates/TemplatesPage";
import SequencesPage from "./features/sequences/SequencesPage";
import RoutingPage from "./features/routing/RoutingPage";
import AssetsPage from "./features/assets/AssetsPage";
import UsersPage from "./features/users/UsersPage";
import SettingsPage from "./features/settings/SettingsPage";
import GuidelinesPage from "./features/settings/GuidelinesPage";
import OutreachPage from "./features/outreach/OutreachPage";
import SchedulerPage from "./features/scheduler/SchedulerPage";
import BulkImportPage from "./features/bulk-import/BulkImportPage";
import NotificationsPage from "./features/notifications/NotificationsPage";
import AdminPage from "./features/admin/AdminPage";
import ProfilePage from "./features/profile/ProfilePage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Redirect super_admin to admin panel
function DashboardRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === "super_admin") {
    return <Navigate to="/admin" replace />;
  }
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardRedirect />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/new" element={<LeadCreatePage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="sequences" element={<SequencesPage />} />
        <Route path="routing" element={<RoutingPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="outreach" element={<OutreachPage />} />
        <Route path="scheduler" element={<SchedulerPage />} />
        <Route path="bulk-import" element={<BulkImportPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="guidelines" element={<GuidelinesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
