import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { formatDate } from "../../utils/dateUtils";
import {
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  ExternalLink,
  User,
} from "lucide-react";

const TYPE_BADGE: Record<string, string> = {
  HOT:       "bg-red-100 text-red-700",
  WARM:      "bg-amber-100 text-amber-700",
  COLD:      "bg-blue-100 text-blue-700",
  STALE:     "bg-gray-100 text-gray-600",
  CONVERTED: "bg-green-100 text-green-700",
  LOST:      "bg-red-100 text-red-700",
};

const STATUS_BADGE: Record<string, string> = {
  NEW:               "bg-blue-50 text-blue-700",
  ACTIVE:            "bg-indigo-50 text-indigo-700",
  ENGAGED:           "bg-purple-50 text-purple-700",
  MEETING_SCHEDULED: "bg-cyan-50 text-cyan-700",
  PROPOSAL_SENT:     "bg-teal-50 text-teal-700",
  NEGOTIATION:       "bg-amber-50 text-amber-700",
  CONVERTED:         "bg-green-50 text-green-700",
  LOST:              "bg-red-50 text-red-700",
};

interface Props {
  leadId: string | null;
  onClose: () => void;
}

export default function LeadQuickView({ leadId, onClose }: Props) {
  const navigate = useNavigate();

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => api.get(`/leads/${leadId}`).then((r) => r.data),
    enabled: !!leadId,
  });

  const isOpen = !!leadId;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200 shrink-0">
          <div className="flex-1 min-w-0">
            {isLoading || !lead ? (
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {lead.first_name} {lead.last_name}
                </h2>
                {lead.company && (
                  <p className="text-sm text-gray-500 truncate">{lead.company}</p>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {isLoading || !lead ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[lead.lead_type] ?? "bg-gray-100 text-gray-600"}`}>
                  {lead.lead_type}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_BADGE[lead.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {lead.status?.replace(/_/g, " ")}
                </span>
              </div>

              {/* Score */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Score
                  </span>
                  <span className="text-xs font-bold text-gray-700">{lead.score} / 200</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      lead.score >= 80 ? "bg-red-500" : lead.score >= 40 ? "bg-amber-500" : "bg-blue-400"
                    }`}
                    style={{ width: `${Math.min(100, (lead.score / 200) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</h3>
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Phone} label="Phone" value={lead.phone || "—"} />
                <InfoRow icon={Building2} label="Company" value={lead.company || "—"} />
                <InfoRow icon={MapPin} label="City" value={lead.city || "—"} />
                <InfoRow icon={Calendar} label="Enrolled" value={formatDate(lead.created_at || lead.createdAt)} />
                {lead.source && (
                  <InfoRow icon={ExternalLink} label="Source" value={lead.source} />
                )}
              </div>

              {/* Assigned Rep */}
              {lead.assignedRep && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Assigned Rep</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                      {lead.assignedRep.first_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {lead.assignedRep.first_name} {lead.assignedRep.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{lead.assignedRep.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {lead.notes && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">
                    {lead.notes}
                  </p>
                </div>
              )}

              {/* Application Type */}
              {lead.ApplicationType && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Application Type</h3>
                  <p className="text-sm font-medium text-gray-900">{lead.ApplicationType.name}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 p-4 border-t border-gray-200">
          <button
            onClick={() => navigate(`/leads/${leadId}`)}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            <User className="w-4 h-4" />
            View Full Details
            <ExternalLink className="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium truncate">{value}</span>
    </div>
  );
}
