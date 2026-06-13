import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Search, X, CheckSquare, FileText, ArrowRight, Loader2 } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const TEMP_COLOR: Record<string, string> = {
  HOT: "bg-red-100 text-red-700",
  WARM: "bg-orange-100 text-orange-700",
  COLD: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700",
  CONVERTED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-800",
};

const TASK_STATUS_COLOR: Record<string, string> = {
  todo: "bg-orange-50 text-orange-700",
  in_progress: "bg-blue-50 text-blue-700",
  done: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

interface SearchResult {
  type: "lead" | "task" | "template";
  id: string;
  href: string;
  data: any;
}

function flatten(data: any): SearchResult[] {
  if (!data) return [];
  return [
    ...(data.leads || []).map((l: any) => ({ type: "lead" as const, id: l.id, href: `/leads/${l.id}`, data: l })),
    ...(data.tasks || []).map((t: any) => ({ type: "task" as const, id: t.id, href: `/tasks`, data: t })),
    ...(data.templates || []).map((t: any) => ({ type: "template" as const, id: t.id, href: `/templates`, data: t })),
  ];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 250);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => api.get("/search", { params: { q: debouncedQuery, limit: 6 } }).then((r) => r.data),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 15_000,
  });

  const results = useMemo(() => flatten(data), [data]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIndex(0); }, [results]);

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.href);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && results[selectedIndex]) { handleSelect(results[selectedIndex]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, results, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  const hasLeads = (data?.leads || []).length > 0;
  const hasTasks = (data?.tasks || []).length > 0;
  const hasTemplates = (data?.templates || []).length > 0;
  const hasResults = hasLeads || hasTasks || hasTemplates;
  const searched = debouncedQuery.trim().length >= 2;

  let ri = 0; // running result index for keyboard selection

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "72vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          {isFetching
            ? <Loader2 className="w-5 h-5 text-brand-500 animate-spin flex-shrink-0" />
            : <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, tasks, templates…"
            className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:block text-xs text-gray-400 bg-gray-100 border border-gray-200 px-2 py-1 rounded font-mono">ESC</kbd>
        </div>

        {/* Results body */}
        <div className="overflow-y-auto flex-1">
          {!searched ? (
            <div className="py-14 text-center space-y-2">
              <Search className="w-9 h-9 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400">Search across leads, tasks, and templates</p>
              <p className="text-xs text-gray-300">Type at least 2 characters</p>
            </div>
          ) : !hasResults && !isFetching ? (
            <div className="py-14 text-center">
              <p className="text-sm text-gray-400">No results for <span className="font-semibold text-gray-600">"{debouncedQuery}"</span></p>
              <p className="text-xs text-gray-300 mt-1">Try a different name, email, or keyword</p>
            </div>
          ) : (
            <div className="py-1.5">

              {/* Leads */}
              {hasLeads && (
                <section>
                  <p className="px-5 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Leads</p>
                  {data.leads.map((lead: any) => {
                    const idx = ri++;
                    const active = idx === selectedIndex;
                    return (
                      <button
                        key={lead.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect({ type: "lead", id: lead.id, href: `/leads/${lead.id}`, data: lead })}
                        className={`w-full flex items-center gap-3 px-5 py-3 transition-colors text-left ${active ? "bg-brand-50" : "hover:bg-gray-50"}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                          {lead.first_name[0]}{lead.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {lead.email}{lead.company ? ` · ${lead.company}` : ""}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${TEMP_COLOR[lead.lead_type] || "bg-gray-100 text-gray-600"}`}>
                          {lead.lead_type}
                        </span>
                        {active && <ArrowRight className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </section>
              )}

              {/* Tasks */}
              {hasTasks && (
                <section>
                  <p className="px-5 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Tasks</p>
                  {data.tasks.map((task: any) => {
                    const idx = ri++;
                    const active = idx === selectedIndex;
                    const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                    return (
                      <button
                        key={task.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect({ type: "task", id: task.id, href: `/tasks`, data: task })}
                        className={`w-full flex items-center gap-3 px-5 py-3 transition-colors text-left ${active ? "bg-brand-50" : "hover:bg-gray-50"}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {task.lead ? `${task.lead.first_name} ${task.lead.last_name} · ` : ""}
                            {task.due_date
                              ? <span className={overdue ? "text-red-500 font-medium" : ""}>{new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                              : "No due date"
                            }
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${TASK_STATUS_COLOR[task.status] || "bg-gray-100"}`}>
                          {task.status?.replace("_", " ")}
                        </span>
                        {active && <ArrowRight className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </section>
              )}

              {/* Templates */}
              {hasTemplates && (
                <section>
                  <p className="px-5 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Templates</p>
                  {data.templates.map((template: any) => {
                    const idx = ri++;
                    const active = idx === selectedIndex;
                    return (
                      <button
                        key={template.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect({ type: "template", id: template.id, href: `/templates`, data: template })}
                        className={`w-full flex items-center gap-3 px-5 py-3 transition-colors text-left ${active ? "bg-brand-50" : "hover:bg-gray-50"}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{template.name}</p>
                          <p className="text-xs text-gray-400 truncate">{template.subject || template.category || "Email template"}</p>
                        </div>
                        {active && <ArrowRight className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </section>
              )}

            </div>
          )}
        </div>

        {/* Footer hints */}
        {hasResults && (
          <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-4">
            {[["↑↓", "navigate"], ["↵", "open"], ["ESC", "close"]].map(([key, label]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono text-gray-500">{key}</kbd>
                {label}
              </span>
            ))}
            <span className="ml-auto text-xs text-gray-400">{results.length} result{results.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
