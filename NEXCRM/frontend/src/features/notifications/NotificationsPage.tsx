import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { formatDateTime } from "../../utils/dateUtils";
import {
  Bell,
  Mail,
  MailX,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MousePointerClick,
  Zap,
  Upload,
  UserX,
} from "lucide-react";

const typeIcons: Record<string, any> = {
  lead_added: UserPlus,
  lead_converted: CheckCircle,
  lead_lost: XCircle,
  lead_assigned: Users,
  lead_opted_out: UserX,
  mail_sent: Mail,
  mail_failed: MailX,
  mail_opened: Eye,
  mail_clicked: MousePointerClick,
  bulk_import_complete: Upload,
  sequence_started: Zap,
  sequence_completed: CheckCircle,
  scheduler_triggered: Clock,
};

const typeColors: Record<string, string> = {
  lead_added: "bg-green-100 text-green-600",
  lead_converted: "bg-emerald-100 text-emerald-600",
  lead_lost: "bg-red-100 text-red-600",
  lead_assigned: "bg-blue-100 text-blue-600",
  lead_opted_out: "bg-orange-100 text-orange-600",
  mail_sent: "bg-blue-100 text-blue-600",
  mail_failed: "bg-red-100 text-red-600",
  mail_opened: "bg-purple-100 text-purple-600",
  mail_clicked: "bg-indigo-100 text-indigo-600",
  bulk_import_complete: "bg-teal-100 text-teal-600",
  sequence_started: "bg-amber-100 text-amber-600",
  sequence_completed: "bg-green-100 text-green-600",
  scheduler_triggered: "bg-cyan-100 text-cyan-600",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((r) => r.data),
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api.get("/notifications/unread-count").then((r) => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      toast.success("All notifications marked as read.");
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = unreadData?.unread_count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6" /> Notifications
          </h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="btn-secondary text-sm"
          >
            Mark All Read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 rounded-lg animate-pulse"
            />
          ))
        ) : notifications.length === 0 ? (
          <div className="card text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((notif: any) => {
            const IconComponent = typeIcons[notif.type] || Bell;
            const colorClass =
              typeColors[notif.type] || "bg-gray-100 text-gray-600";
            return (
              <div
                key={notif.id}
                className={`card flex items-start gap-3 cursor-pointer hover:shadow-sm transition ${!notif.is_read ? "border-l-4 border-l-brand-500 bg-brand-50/30" : ""}`}
                onClick={() =>
                  !notif.is_read && markReadMutation.mutate(notif.id)
                }
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-sm font-medium ${!notif.is_read ? "text-gray-900" : "text-gray-600"}`}
                    >
                      {notif.title}
                    </h4>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDateTime(notif.created_at || notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {notif.message}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
