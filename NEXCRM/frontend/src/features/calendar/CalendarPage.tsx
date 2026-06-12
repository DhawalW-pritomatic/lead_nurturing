import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, Clock,
  Video, Phone, Users, MapPin, FileText, Check, Trash2,
  MoreVertical, Link2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CalView = "week" | "month" | "day";

interface CalEvent {
  id: string;
  type: "meeting" | "callback" | "task";
  title: string;
  start: Date;
  durationMinutes: number;
  allDay: boolean;
  status: string;
  leadName?: string;
  repName?: string;
  color: string;       // Tailwind bg class
  textColor: string;   // Tailwind text class
  borderColor: string; // Tailwind border class
  data: any;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 64; // px
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const MEETING_TYPE_ICONS: Record<string, any> = {
  call: Phone,
  video: Video,
  in_person: Users,
  other: Calendar,
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  call: "Call", video: "Video", in_person: "In Person", other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled", completed: "Completed",
  cancelled: "Cancelled", no_show: "No Show", rescheduled: "Rescheduled",
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// ── Date Utilities ────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7; // Mon = 0
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfWeek(d: Date): Date {
  const r = startOfWeek(d);
  r.setDate(r.getDate() + 6);
  r.setHours(23, 59, 59, 999);
  return r;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function addWeeks(d: Date, n: number): Date { return addDays(d, n * 7); }
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isToday(d: Date): boolean { return isSameDay(d, new Date()); }
function fmt12h(d: Date): string {
  const h = d.getHours(); const m = d.getMinutes();
  const ampm = h < 12 ? "am" : "pm"; const hh = h % 12 || 12;
  return m === 0 ? `${hh}${ampm}` : `${hh}:${m.toString().padStart(2, "0")}${ampm}`;
}
function fmtDateLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
function toLocalDateTimeInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Normalize API data to CalEvent ────────────────────────────────────────────

function normalizeEvents(data: { meetings: any[]; callbacks: any[]; tasks: any[] }): CalEvent[] {
  const out: CalEvent[] = [];

  (data.meetings || []).forEach((m) => {
    out.push({
      id: m.id,
      type: "meeting",
      title: m.title,
      start: new Date(m.scheduled_at),
      durationMinutes: m.duration_minutes || 30,
      allDay: false,
      status: m.status,
      leadName: m.lead ? `${m.lead.first_name} ${m.lead.last_name}` : undefined,
      repName: m.assignedRep ? `${m.assignedRep.first_name} ${m.assignedRep.last_name}` : undefined,
      color: "bg-blue-500",
      textColor: "text-white",
      borderColor: "border-blue-600",
      data: m,
    });
  });

  (data.callbacks || []).forEach((c) => {
    out.push({
      id: c.id,
      type: "callback",
      title: c.lead ? `Callback: ${c.lead.first_name} ${c.lead.last_name}` : "Callback",
      start: new Date(c.scheduled_at),
      durationMinutes: 30,
      allDay: false,
      status: c.status,
      leadName: c.lead ? `${c.lead.first_name} ${c.lead.last_name}` : undefined,
      repName: c.rep ? `${c.rep.first_name} ${c.rep.last_name}` : undefined,
      color: "bg-amber-400",
      textColor: "text-white",
      borderColor: "border-amber-500",
      data: c,
    });
  });

  (data.tasks || []).forEach((t) => {
    out.push({
      id: t.id,
      type: "task",
      title: t.title,
      start: new Date(t.due_date),
      durationMinutes: 0,
      allDay: true,
      status: t.status,
      leadName: t.lead ? `${t.lead.first_name} ${t.lead.last_name}` : undefined,
      repName: t.assignee?.name,
      color: "bg-emerald-500",
      textColor: "text-white",
      borderColor: "border-emerald-600",
      data: t,
    });
  });

  return out;
}

// ── Event chip (timed — absolute positioned in grid) ─────────────────────────

function EventChip({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  const startH = event.start.getHours() + event.start.getMinutes() / 60;
  const top = Math.max(0, (startH - START_HOUR) * HOUR_HEIGHT);
  const height = Math.max(24, (event.durationMinutes / 60) * HOUR_HEIGHT);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ top, height, position: "absolute", left: 2, right: 2, zIndex: 10 }}
      className={`${event.color} ${event.textColor} rounded px-1.5 py-0.5 text-left overflow-hidden cursor-pointer hover:brightness-110 transition-all shadow-sm border-l-2 ${event.borderColor}`}
    >
      <p className="text-[11px] font-semibold leading-tight truncate">{event.title}</p>
      {height > 36 && (
        <p className="text-[10px] opacity-80 leading-tight">{fmt12h(event.start)}</p>
      )}
      {height > 52 && event.leadName && (
        <p className="text-[10px] opacity-70 leading-tight truncate">{event.leadName}</p>
      )}
    </button>
  );
}

// ── All-day chip (for tasks in day/week header row) ───────────────────────────

function AllDayChip({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium ${event.color} ${event.textColor} truncate mb-0.5 hover:brightness-110 transition-all`}
    >
      {event.title}
    </button>
  );
}

// ── Month event chip ──────────────────────────────────────────────────────────

function MonthChip({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium ${event.color} ${event.textColor} truncate hover:brightness-110 transition-all`}
    >
      {!event.allDay && <span className="opacity-80 mr-0.5">{fmt12h(event.start)}</span>}
      {event.title}
    </button>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  days, events, onSlotClick, onEventClick,
}: {
  days: Date[];
  events: CalEvent[];
  onSlotClick: (date: Date) => void;
  onEventClick: (e: CalEvent) => void;
}) {
  const timedEvents = events.filter((e) => !e.allDay);
  const allDayEvents = events.filter((e) => e.allDay);
  const totalH = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Day header row */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <div className="w-14 flex-shrink-0" />
        {days.map((day, i) => (
          <div key={i} className="flex-1 px-2 py-2 text-center border-l border-gray-100">
            <p className="text-xs text-gray-500 font-medium">{DAY_LABELS[i]}</p>
            <p className={`text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${isToday(day) ? "bg-brand-600 text-white" : "text-gray-900"}`}>
              {day.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* All-day row (tasks) */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-gray-100 flex-shrink-0 bg-gray-50">
          <div className="w-14 flex-shrink-0 text-[9px] text-gray-400 flex items-start justify-end pr-1 pt-1">ALL DAY</div>
          {days.map((day, i) => {
            const dayAD = allDayEvents.filter((e) => isSameDay(e.start, day));
            return (
              <div key={i} className="flex-1 border-l border-gray-100 p-0.5 min-h-[28px]">
                {dayAD.map((e) => <AllDayChip key={e.id} event={e} onClick={() => onEventClick(e)} />)}
              </div>
            );
          })}
        </div>
      )}

      {/* Timed grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Time column */}
        <div className="w-14 flex-shrink-0 relative" style={{ height: totalH }}>
          {HOURS.map((h, i) => (
            <div key={h} className="absolute right-0 pr-2 text-[10px] text-gray-400 leading-none" style={{ top: i * HOUR_HEIGHT - 6 }}>
              {h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1">
          {days.map((day, di) => {
            const dayEvents = timedEvents.filter((e) => isSameDay(e.start, day));
            return (
              <div key={di} className="flex-1 relative border-l border-gray-100" style={{ height: totalH }}>
                {/* Hour grid lines */}
                {HOURS.map((_, i) => (
                  <div key={i} className="absolute w-full border-t border-gray-100" style={{ top: i * HOUR_HEIGHT }} />
                ))}
                {/* Half-hour dashed lines */}
                {HOURS.map((_, i) => (
                  <div key={`h${i}`} className="absolute w-full border-t border-gray-50" style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                ))}
                {/* Click slots */}
                {HOURS.map((h, i) => (
                  <div
                    key={`s${i}`}
                    className="absolute w-full hover:bg-brand-50/50 cursor-pointer transition-colors"
                    style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0))}
                  />
                ))}
                {/* Events */}
                {dayEvents.map((e) => (
                  <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────

function MonthView({
  year, month, events, onDayClick, onEventClick,
}: {
  year: number;
  month: number;
  events: CalEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalEvent) => void;
}) {
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDow = (first.getDay() + 6) % 7;
    const days: Date[] = [];
    for (let i = startDow - 1; i >= 0; i--) days.push(new Date(year, month, -i));
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    let nd = 1;
    while (days.length < 42) days.push(new Date(year, month + 1, nd++));
    return days;
  }, [year, month]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {cells.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month;
          const dayEvts = events.filter((e) => isSameDay(e.start, day));
          const visible = dayEvts.slice(0, 3);
          const extra = dayEvts.length - 3;
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`border-b border-r border-gray-100 p-1 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors ${!isCurrentMonth ? "bg-gray-50/50" : ""}`}
            >
              <p className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? "bg-brand-600 text-white" : isCurrentMonth ? "text-gray-900" : "text-gray-300"}`}>
                {day.getDate()}
              </p>
              <div className="space-y-0.5">
                {visible.map((e) => <MonthChip key={e.id} event={e} onClick={() => onEventClick(e)} />)}
                {extra > 0 && (
                  <p className="text-[10px] text-gray-400 px-1">+{extra} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────

function DayView({
  day, events, onSlotClick, onEventClick,
}: {
  day: Date;
  events: CalEvent[];
  onSlotClick: (date: Date) => void;
  onEventClick: (e: CalEvent) => void;
}) {
  const timedEvents = events.filter((e) => !e.allDay && isSameDay(e.start, day));
  const allDayEvts = events.filter((e) => e.allDay && isSameDay(e.start, day));
  const totalH = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Day header */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <div className="w-14 flex-shrink-0" />
        <div className="flex-1 px-4 py-3 border-l border-gray-100">
          <p className="text-xs text-gray-500 font-medium">{DAY_LABELS[(day.getDay() + 6) % 7]}</p>
          <p className={`text-2xl font-bold mt-0.5 w-10 h-10 flex items-center justify-center rounded-full ${isToday(day) ? "bg-brand-600 text-white" : "text-gray-900"}`}>
            {day.getDate()}
          </p>
        </div>
      </div>

      {allDayEvts.length > 0 && (
        <div className="flex border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="w-14 flex-shrink-0 text-[9px] text-gray-400 flex items-center justify-end pr-1">ALL DAY</div>
          <div className="flex-1 border-l border-gray-100 p-1 space-y-0.5">
            {allDayEvts.map((e) => <AllDayChip key={e.id} event={e} onClick={() => onEventClick(e)} />)}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-y-auto">
        <div className="w-14 flex-shrink-0 relative" style={{ height: totalH }}>
          {HOURS.map((h, i) => (
            <div key={h} className="absolute right-0 pr-2 text-[10px] text-gray-400" style={{ top: i * HOUR_HEIGHT - 6 }}>
              {h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
            </div>
          ))}
        </div>
        <div className="flex-1 relative border-l border-gray-100" style={{ height: totalH }}>
          {HOURS.map((_, i) => (
            <div key={i} className="absolute w-full border-t border-gray-100" style={{ top: i * HOUR_HEIGHT }} />
          ))}
          {HOURS.map((_, i) => (
            <div key={`h${i}`} className="absolute w-full border-t border-gray-50" style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
          ))}
          {HOURS.map((h, i) => (
            <div
              key={`s${i}`}
              className="absolute w-full hover:bg-brand-50/50 cursor-pointer"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              onClick={() => onSlotClick(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h))}
            />
          ))}
          {timedEvents.map((e) => <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />)}
        </div>
      </div>
    </div>
  );
}

// ── Mini Calendar (sidebar) ───────────────────────────────────────────────────

function MiniCalendar({
  viewDate, selected, onSelect,
}: {
  viewDate: Date;
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const [mini, setMini] = useState(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));

  const cells = useMemo(() => {
    const yr = mini.getFullYear(); const mo = mini.getMonth();
    const first = new Date(yr, mo, 1);
    const last = new Date(yr, mo + 1, 0);
    const startDow = (first.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(yr, mo, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [mini]);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMini(addMonths(mini, -1))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {MONTH_NAMES[mini.getMonth()].slice(0, 3)} {mini.getFullYear()}
        </span>
        <button onClick={() => setMini(addMonths(mini, 1))} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center mb-1">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <span key={i} className="text-[9px] font-semibold text-gray-400">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-0.5">
        {cells.map((day, i) => (
          day ? (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`text-[11px] w-6 h-6 mx-auto flex items-center justify-center rounded-full transition-colors
                ${isToday(day) && !isSameDay(day, selected) ? "border border-brand-400 text-brand-600 font-bold" : ""}
                ${isSameDay(day, selected) ? "bg-brand-600 text-white font-bold" : "hover:bg-gray-100 text-gray-700"}`}
            >
              {day.getDate()}
            </button>
          ) : <span key={i} />
        ))}
      </div>
    </div>
  );
}

// ── Upcoming List (sidebar) ───────────────────────────────────────────────────

function UpcomingList({ events, onEventClick }: { events: CalEvent[]; onEventClick: (e: CalEvent) => void }) {
  const now = new Date();
  const upcoming = [...events]
    .filter((e) => e.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 8);

  if (upcoming.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">No upcoming events</p>;
  }

  return (
    <div className="space-y-1.5">
      {upcoming.map((e) => (
        <button
          key={e.id}
          onClick={() => onEventClick(e)}
          className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 text-left group"
        >
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${e.color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{e.title}</p>
            <p className="text-[10px] text-gray-400">
              {fmtDateLabel(e.start)}{!e.allDay ? ` · ${fmt12h(e.start)}` : ""}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Event Detail Popover ──────────────────────────────────────────────────────

function EventDetail({
  event, onClose, onEdit, onDelete,
}: {
  event: CalEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const TypeIcon = event.type === "meeting" ? (MEETING_TYPE_ICONS[event.data.meeting_type] || Calendar) : Calendar;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-lg ${event.color} flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 leading-tight">{event.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{event.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {event.type === "meeting" && (
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-7 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 text-sm" onMouseLeave={() => setMenuOpen(false)}>
                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700">
                      <FileText className="w-3.5 h-3.5 text-gray-400" /> Edit
                    </button>
                    <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              {fmtDateLabel(event.start)}
              {!event.allDay && ` · ${fmt12h(event.start)}`}
              {event.type === "meeting" && ` · ${event.durationMinutes} min`}
            </span>
          </div>
          {event.leadName && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{event.leadName}</span>
            </div>
          )}
          {event.repName && (
            <div className="flex items-center gap-2 text-gray-600">
              <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{event.repName}</span>
            </div>
          )}
          {event.type === "meeting" && event.data.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{event.data.location}</span>
            </div>
          )}
          {event.type === "meeting" && event.data.notes && (
            <div className="flex items-start gap-2 text-gray-600">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs">{event.data.notes}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.color} ${event.textColor}`}>
              {STATUS_LABELS[event.status] || event.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Meeting Modal (create / edit) ─────────────────────────────────────────────

function MeetingModal({
  initial,
  defaultDate,
  onClose,
  onSave,
  isPending,
}: {
  initial?: any;
  defaultDate?: Date;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const now = defaultDate || new Date();
  const defaultDT = new Date(now);
  defaultDT.setMinutes(0, 0, 0);

  const [form, setForm] = useState({
    title: initial?.title || "",
    meeting_type: initial?.meeting_type || "call",
    scheduled_at: initial?.scheduled_at
      ? toLocalDateTimeInput(new Date(initial.scheduled_at))
      : toLocalDateTimeInput(defaultDT),
    duration_minutes: initial?.duration_minutes || 30,
    lead_id: initial?.lead_id || "",
    assigned_to: initial?.assigned_to || "",
    location: initial?.location || "",
    notes: initial?.notes || "",
    status: initial?.status || "scheduled",
  });

  const { data: leadsData } = useQuery({
    queryKey: ["leads-cal"],
    queryFn: () => api.get("/leads?limit=200").then((r) => r.data?.leads || r.data),
    staleTime: 60_000,
  });
  const { data: usersData } = useQuery({
    queryKey: ["users-cal"],
    queryFn: () => api.get("/users").then((r) => r.data?.users || r.data),
    staleTime: 60_000,
  });

  const leads: any[] = Array.isArray(leadsData) ? leadsData : (leadsData?.leads || []);
  const users: any[] = Array.isArray(usersData) ? usersData : (usersData?.users || []);

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.scheduled_at) { toast.error("Date and time are required."); return; }
    onSave({
      ...form,
      lead_id: form.lead_id || undefined,
      assigned_to: form.assigned_to || undefined,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {initial ? "Edit Meeting" : "New Meeting"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Meeting title"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Meeting Type</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(MEETING_TYPE_LABELS).map(([val, label]) => {
                const Icon = MEETING_TYPE_ICONS[val];
                return (
                  <button
                    key={val}
                    onClick={() => setForm({ ...form, meeting_type: val })}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${form.meeting_type === val ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Duration</label>
              <select
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead + Rep */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Lead</label>
              <select
                value={form.lead_id}
                onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">None</option>
                {leads.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Assigned Rep</label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Zoom link, office address, etc."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Status (edit only) + Notes */}
          {initial && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Internal notes about this meeting"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !form.title.trim()}
            className="ml-auto flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? (initial ? "Saving…" : "Creating…") : (initial ? "Save Changes" : "Create Meeting")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CalendarPage ─────────────────────────────────────────────────────────

export default function CalendarPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<CalView>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<any>(null);
  const [defaultSlot, setDefaultSlot] = useState<Date | undefined>();

  // Date range for API query
  const { rangeStart, rangeEnd, label, days } = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(currentDate);
      const e = endOfWeek(currentDate);
      const d = Array.from({ length: 7 }, (_, i) => addDays(s, i));
      const label = `${fmtDateLabel(s)} – ${fmtDateLabel(e)}, ${s.getFullYear()}`;
      return { rangeStart: s, rangeEnd: e, label, days: d };
    } else if (view === "month") {
      const s = startOfMonth(currentDate);
      const e = endOfMonth(currentDate);
      // Extend to include padding days from adjacent months
      const s2 = startOfWeek(s);
      const e2 = endOfWeek(e);
      return { rangeStart: s2, rangeEnd: e2, label: `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`, days: [] };
    } else {
      const d = new Date(currentDate);
      d.setHours(0, 0, 0, 0);
      const e = new Date(d); e.setHours(23, 59, 59, 999);
      return { rangeStart: d, rangeEnd: e, label: `${DAY_LABELS[(d.getDay() + 6) % 7]}, ${fmtDateLabel(d)} ${d.getFullYear()}`, days: [d] };
    }
  }, [view, currentDate]);

  const { data: rawData, isFetching } = useQuery({
    queryKey: ["calendar", rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () => api.get("/calendar", { params: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() } }).then((r) => r.data),
    staleTime: 30_000,
  });

  const allEvents = useMemo(() =>
    rawData ? normalizeEvents(rawData) : [],
    [rawData],
  );

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = (dir: 1 | -1) => {
    if (view === "week") setCurrentDate(addWeeks(currentDate, dir));
    else if (view === "month") setCurrentDate(addMonths(currentDate, dir));
    else setCurrentDate(addDays(currentDate, dir));
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["meetings"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/meetings", data).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success("Meeting created."); setModalOpen(false); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to create."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/meetings/${id}`, data).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success("Meeting saved."); setModalOpen(false); setEditMeeting(null); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/meetings/${id}`).then((r) => r.data),
    onSuccess: () => { invalidate(); toast.success("Meeting deleted."); setSelectedEvent(null); },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed."),
  });

  const handleSlotClick = (date: Date) => {
    setDefaultSlot(date);
    setEditMeeting(null);
    setModalOpen(true);
  };

  const handleSave = (data: any) => {
    if (editMeeting) updateMutation.mutate({ id: editMeeting.id, ...data });
    else createMutation.mutate(data);
  };

  const handleDelete = (event: CalEvent) => {
    if (window.confirm("Delete this meeting?")) deleteMutation.mutate(event.id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-1 pb-4 flex-shrink-0">
        {/* Nav */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Date label */}
        <h2 className="text-sm font-semibold text-gray-900 flex-1">{label}</h2>

        {isFetching && (
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        )}

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {(["day", "week", "month"] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* New Meeting */}
        <button
          onClick={() => { setEditMeeting(null); setDefaultSlot(undefined); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Meeting
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <MiniCalendar
              viewDate={currentDate}
              selected={currentDate}
              onSelect={(d) => { setCurrentDate(d); if (view === "month") setView("day"); }}
            />
          </div>

          {/* Legend */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5">
            {[
              { label: "Meeting", color: "bg-blue-500" },
              { label: "Callback", color: "bg-amber-400" },
              { label: "Task due", color: "bg-emerald-500" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-xs text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Upcoming */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-y-auto">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming</h4>
            <UpcomingList events={allEvents} onEventClick={(e) => setSelectedEvent(e)} />
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-0">
          {view === "week" && (
            <WeekView
              days={days}
              events={allEvents}
              onSlotClick={handleSlotClick}
              onEventClick={(e) => setSelectedEvent(e)}
            />
          )}
          {view === "month" && (
            <MonthView
              year={currentDate.getFullYear()}
              month={currentDate.getMonth()}
              events={allEvents}
              onDayClick={(d) => { setCurrentDate(d); setView("day"); }}
              onEventClick={(e) => setSelectedEvent(e)}
            />
          )}
          {view === "day" && (
            <DayView
              day={currentDate}
              events={allEvents}
              onSlotClick={handleSlotClick}
              onEventClick={(e) => setSelectedEvent(e)}
            />
          )}
        </div>
      </div>

      {/* ── Event detail popover ── */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            if (selectedEvent.type === "meeting") {
              setEditMeeting(selectedEvent.data);
              setModalOpen(true);
              setSelectedEvent(null);
            }
          }}
          onDelete={() => {
            if (selectedEvent.type === "meeting") handleDelete(selectedEvent);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* ── Meeting modal ── */}
      {modalOpen && (
        <MeetingModal
          initial={editMeeting}
          defaultDate={defaultSlot}
          onClose={() => { setModalOpen(false); setEditMeeting(null); setDefaultSlot(undefined); }}
          onSave={handleSave}
          isPending={isPending}
        />
      )}
    </div>
  );
}
