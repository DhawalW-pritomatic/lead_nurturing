import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import KanbanView from "./KanbanView";
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight, LayoutList, Trello,
} from "lucide-react";

export default function LeadsPage() {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, search, filters],
    queryFn: () =>
      api
        .get("/leads", { params: { page, limit: 25, search, ...filters } })
        .then((r) => r.data),
  });

  const leadTypeBadge = (type: string) => {
    const classes: Record<string, string> = {
      HOT: "badge-hot",
      WARM: "badge-warm",
      COLD: "badge-cold",
      STALE: "badge-stale",
      CONVERTED: "badge-converted",
      LOST: "bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium",
    };
    return <span className={classes[type] || "badge-cold"}>{type}</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-50 text-blue-700",
      ACTIVE: "bg-indigo-50 text-indigo-700",
      ENGAGED: "bg-purple-50 text-purple-700",
      MEETING_SCHEDULED: "bg-cyan-50 text-cyan-700",
      PROPOSAL_SENT: "bg-teal-50 text-teal-700",
      NEGOTIATION: "bg-yellow-50 text-yellow-700",
      CONVERTED: "bg-green-50 text-green-700",
      LOST: "bg-red-50 text-red-700",
      OPTED_OUT: "bg-gray-50 text-gray-700",
      STALE: "bg-gray-50 text-gray-600",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">
            {data?.total || 0} total leads in pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "table" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LayoutList className="w-4 h-4" /> Table
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "kanban" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Trello className="w-4 h-4" /> Kanban
            </button>
          </div>
          <Link to="/leads/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Enroll Lead
          </Link>
        </div>
      </div>

      {/* Kanban view */}
      {view === "kanban" && <KanbanView />}

      {/* Table view */}
      {view === "table" && <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search leads by name, email, phone, company..."
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <select
              value={filters.lead_type || ""}
              onChange={(e) => {
                setFilters({ ...filters, lead_type: e.target.value });
                setPage(1);
              }}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
              <option value="STALE">Stale</option>
              <option value="CONVERTED">Converted</option>
            </select>
            <select
              value={filters.status || ""}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
              className="input-field"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="ACTIVE">Active</option>
              <option value="ENGAGED">Engaged</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
              <option value="STALE">Stale</option>
            </select>
            <select
              value={filters.source || ""}
              onChange={(e) => {
                setFilters({ ...filters, source: e.target.value });
                setPage(1);
              }}
              className="input-field"
            >
              <option value="">All Sources</option>
              <option>Field Visit</option>
              <option>Cold Call</option>
              <option>Referral</option>
              <option>Event/Expo</option>
              <option>Website</option>
              <option>Ad Campaign</option>
              <option>CSV Import</option>
            </select>
            <button
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Lead
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Company
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Score
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Source
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Assigned Rep
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="py-3 px-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                : (data?.leads || []).map((lead: any) => (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {lead.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {lead.company || "—"}
                      </td>
                      <td className="py-3 px-4">
                        {leadTypeBadge(lead.lead_type)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${lead.score >= 80 ? "bg-red-500" : lead.score >= 40 ? "bg-amber-500" : "bg-blue-500"}`}
                              style={{
                                width: `${Math.min(100, lead.score / 2)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {lead.score}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{statusBadge(lead.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {lead.source}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {lead.assignedRep
                          ? `${lead.assignedRep.first_name} ${lead.assignedRep.last_name}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} of{" "}
              {data.total} leads
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-3">
                Page {page} of {data.total_pages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.total_pages, p + 1))
                }
                disabled={page >= data.total_pages}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>}

    </div>
  );
}
