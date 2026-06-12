import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import api from "../services/api";

const ASSIGNABLE_ROLES = new Set(["sales_rep", "senior_sales_rep", "sales_manager"]);

const dot = (n: number) =>
  n === 0 ? "bg-green-500" : n <= 3 ? "bg-yellow-400" : n <= 6 ? "bg-orange-400" : "bg-red-500";

const badge = (n: number) =>
  n === 0 ? "bg-green-50 text-green-700" : n <= 3 ? "bg-yellow-50 text-yellow-700" : n <= 6 ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700";

interface Props {
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (rep: { id: string; first_name: string; last_name: string }) => void;
  taskCounts?: Record<string, number>;
}

export default function RepPickerDropdown({ isOpen, anchorEl, onClose, onSelect, taskCounts }: Props) {
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all users — filter to assignable roles only on client
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-all-reps"],
    queryFn: () => api.get("/users").then((r) => r.data),
    enabled: isOpen,
    staleTime: 60_000,
  });

  // Always fetch tasks to get accurate live workload counts
  const { data: tasksData } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks").then((r) => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  });

  // Compute workload from live tasks (ignore passed taskCounts — they may be empty)
  const liveCounts = useMemo((): Record<string, number> => {
    // If caller passed explicit counts, use those; otherwise compute from fetched tasks
    if (taskCounts && Object.keys(taskCounts).length > 0) return taskCounts;
    const counts: Record<string, number> = {};
    const tasks: any[] = tasksData?.tasks || [];
    tasks.forEach((t) => {
      if (t.assignee?.id && t.status !== "done" && t.status !== "cancelled") {
        counts[t.assignee.id] = (counts[t.assignee.id] || 0) + 1;
      }
    });
    return counts;
  }, [tasksData, taskCounts]);

  const sorted = useMemo(() => {
    const all: any[] = (Array.isArray(usersData) ? usersData : [])
      .filter((r) => ASSIGNABLE_ROLES.has(r.role));
    const q = search.trim().toLowerCase();
    const filtered = q
      ? all.filter((r) => `${r.first_name} ${r.last_name}`.toLowerCase().includes(q))
      : all;
    return [...filtered].sort((a, b) => (liveCounts[a.id] || 0) - (liveCounts[b.id] || 0));
  }, [usersData, search, liveCounts]);

  // Position dropdown synchronously from anchor — no flash/jump
  const style = useMemo((): React.CSSProperties => {
    if (!anchorEl) return { position: "fixed", top: -9999, left: -9999, zIndex: 9999 };
    const rect = anchorEl.getBoundingClientRect();
    const DROPDOWN_H = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= DROPDOWN_H ? rect.bottom + 4 : rect.top - DROPDOWN_H - 4;
    const left = Math.min(rect.left, window.innerWidth - 264);
    return { position: "fixed", top, left, width: 260, zIndex: 9999 };
  }, [anchorEl]);

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 30);
    else setSearch("");
  }, [isOpen]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const down = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !anchorEl?.contains(e.target as Node)
      ) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", esc); };
  }, [isOpen, anchorEl, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} style={style} className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
      {/* Search */}
      <div className="p-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg border border-gray-200 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-300 transition-all">
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Free</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" /> 1–3</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> 4–6</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> 7+</span>
        <span className="ml-auto">workload ↑</span>
      </div>

      {/* List */}
      <div className="max-h-56 overflow-y-auto">
        {usersLoading ? (
          <p className="text-center text-sm text-gray-400 py-6">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">No reps found</p>
        ) : (
          sorted.map((rep) => {
            const count = liveCounts[rep.id] || 0;
            return (
              <button
                key={rep.id}
                onClick={() => { onSelect(rep); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-brand-50 transition-colors text-left group"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot(count)}`} />
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0 group-hover:bg-brand-200 transition-colors">
                  {rep.first_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{rep.first_name} {rep.last_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{rep.role?.replace(/_/g, " ")}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${badge(count)}`}>
                  {count === 0 ? "Free" : count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
