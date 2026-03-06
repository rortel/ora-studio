import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Send,
  Check,
  FileText,
  MoreHorizontal,
  Calendar,
  Linkedin,
  Mail,
  MessageSquare,
  Image,
} from "lucide-react";

type ContentStatus = "draft" | "scheduled" | "published" | "review";

interface CalendarEvent {
  id: number;
  title: string;
  channel: string;
  channelIcon: typeof Linkedin;
  time: string;
  status: ContentStatus;
  score: number;
  color: string;
}

const statusConfig: Record<ContentStatus, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "rgba(107,107,123,0.08)", text: "var(--muted-foreground)" },
  scheduled: { label: "Scheduled", bg: "var(--ora-signal-light)", text: "var(--ora-signal)" },
  published: { label: "Published", bg: "rgba(22,163,74,0.08)", text: "#16a34a" },
  review: { label: "In review", bg: "rgba(245,158,11,0.08)", text: "#f59e0b" },
};

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Mock events for March 2026
const mockEvents: Record<number, CalendarEvent[]> = {
  2: [
    { id: 1, title: "Q2 Kickoff Announcement", channel: "LinkedIn", channelIcon: Linkedin, time: "09:00", status: "published", score: 96, color: "#0077b5" },
  ],
  3: [
    { id: 2, title: "Product Update Newsletter", channel: "Email", channelIcon: Mail, time: "10:00", status: "scheduled", score: 94, color: "#ea4335" },
    { id: 3, title: "Behind the scenes Story", channel: "Instagram", channelIcon: Image, time: "14:00", status: "scheduled", score: 91, color: "#e1306c" },
  ],
  4: [
    { id: 4, title: "AI Industry Insights Post", channel: "LinkedIn", channelIcon: Linkedin, time: "08:30", status: "draft", score: 88, color: "#0077b5" },
    { id: 5, title: "Weekly Tips Thread", channel: "Twitter/X", channelIcon: MessageSquare, time: "12:00", status: "review", score: 92, color: "#1da1f2" },
  ],
  5: [
    { id: 6, title: "Customer Story: Nortem", channel: "Email", channelIcon: Mail, time: "09:00", status: "draft", score: 0, color: "#ea4335" },
  ],
  9: [
    { id: 7, title: "Feature Comparison Guide", channel: "LinkedIn", channelIcon: Linkedin, time: "10:00", status: "draft", score: 0, color: "#0077b5" },
  ],
  10: [
    { id: 8, title: "Team Culture Post", channel: "Instagram", channelIcon: Image, time: "15:00", status: "scheduled", score: 93, color: "#e1306c" },
  ],
  11: [
    { id: 9, title: "Webinar Invitation", channel: "Email", channelIcon: Mail, time: "08:00", status: "scheduled", score: 97, color: "#ea4335" },
    { id: 10, title: "Webinar Promo", channel: "LinkedIn", channelIcon: Linkedin, time: "09:00", status: "scheduled", score: 95, color: "#0077b5" },
  ],
  16: [
    { id: 11, title: "How-to Tutorial", channel: "LinkedIn", channelIcon: Linkedin, time: "10:00", status: "draft", score: 0, color: "#0077b5" },
  ],
  17: [
    { id: 12, title: "Monthly Recap Newsletter", channel: "Email", channelIcon: Mail, time: "09:00", status: "draft", score: 0, color: "#ea4335" },
  ],
  18: [
    { id: 13, title: "Industry Report Teaser", channel: "Twitter/X", channelIcon: MessageSquare, time: "11:00", status: "review", score: 89, color: "#1da1f2" },
  ],
  23: [
    { id: 14, title: "Partnership Announcement", channel: "LinkedIn", channelIcon: Linkedin, time: "09:00", status: "draft", score: 0, color: "#0077b5" },
    { id: 15, title: "Partner Story", channel: "Instagram", channelIcon: Image, time: "14:00", status: "draft", score: 0, color: "#e1306c" },
  ],
  25: [
    { id: 16, title: "End of Month Promo", channel: "Email", channelIcon: Mail, time: "08:00", status: "draft", score: 0, color: "#ea4335" },
  ],
};

// Upcoming list
const upcomingEvents = [
  { id: 2, title: "Product Update Newsletter", channel: "Email", time: "Mar 3, 10:00", status: "scheduled" as ContentStatus, score: 94 },
  { id: 3, title: "Behind the scenes Story", channel: "Instagram", time: "Mar 3, 14:00", status: "scheduled" as ContentStatus, score: 91 },
  { id: 4, title: "AI Industry Insights Post", channel: "LinkedIn", time: "Mar 4, 08:30", status: "draft" as ContentStatus, score: 88 },
  { id: 5, title: "Weekly Tips Thread", channel: "Twitter/X", time: "Mar 4, 12:00", status: "review" as ContentStatus, score: 92 },
  { id: 6, title: "Customer Story: Nortem", channel: "Email", time: "Mar 5, 09:00", status: "draft" as ContentStatus, score: 0 },
  { id: 9, title: "Webinar Invitation", channel: "Email", time: "Mar 11, 08:00", status: "scheduled" as ContentStatus, score: 97 },
];

export function CalendarPage() {
  const [currentMonth] = useState(2); // March (0-indexed)
  const [currentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState<number | null>(4);

  // Generate calendar days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday start

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const selectedEvents = selectedDay ? (mockEvents[selectedDay] || []) : [];
  const today = 4; // March 4, 2026

  const stats = {
    total: Object.values(mockEvents).flat().length,
    scheduled: Object.values(mockEvents).flat().filter((e) => e.status === "scheduled").length,
    drafts: Object.values(mockEvents).flat().filter((e) => e.status === "draft").length,
    published: Object.values(mockEvents).flat().filter((e) => e.status === "published").length,
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
            style={{ fontSize: "13px" }}
          >
            <ArrowLeft size={14} />
            Back to Studio
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1
                  className="text-foreground"
                  style={{
                    fontSize: "28px",
                    fontWeight: 500,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Content Calendar
                </h1>
                <span
                  className="px-2.5 py-0.5 rounded-full"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--ora-signal)",
                    background: "var(--ora-signal-light)",
                  }}
                >
                  {stats.total} pieces
                </span>
              </div>
              <p
                className="text-muted-foreground"
                style={{ fontSize: "15px" }}
              >
                Plan, schedule, and publish across all channels.
              </p>
            </div>
            <Link
              to="/studio"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ fontSize: "14px", fontWeight: 500 }}
            >
              <Plus size={15} />
              New Content
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total this month", value: stats.total, icon: Calendar },
            { label: "Scheduled", value: stats.scheduled, icon: Clock },
            { label: "Drafts", value: stats.drafts, icon: FileText },
            { label: "Published", value: stats.published, icon: Check },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-xl p-4"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} className="text-muted-foreground" />
                  <span
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  >
                    {stat.label}
                  </span>
                </div>
                <span
                  className="text-foreground"
                  style={{
                    fontSize: "24px",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Calendar grid */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-5"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
          >
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-foreground"
                style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.02em" }}
              >
                {months[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-muted-foreground">
                  <ChevronLeft size={16} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-muted-foreground">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-2">
              {daysOfWeek.map((d) => (
                <div
                  key={d}
                  className="text-center py-2"
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-0">
              {calendarDays.map((day, idx) => {
                const events = day ? mockEvents[day] || [] : [];
                const isToday = day === today;
                const isSelected = day === selectedDay;
                return (
                  <button
                    key={idx}
                    onClick={() => day && setSelectedDay(day)}
                    disabled={!day}
                    className={`relative min-h-[72px] p-1.5 border-t transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-ora-signal-light"
                        : day
                        ? "hover:bg-secondary/50"
                        : ""
                    }`}
                    style={{
                      borderColor: "var(--border)",
                    }}
                  >
                    {day && (
                      <>
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday ? "bg-ora-signal text-white" : ""
                          }`}
                          style={{
                            fontSize: "12px",
                            fontWeight: isToday ? 600 : 400,
                            color: isToday ? "#ffffff" : "var(--foreground)",
                          }}
                        >
                          {day}
                        </span>
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {events.slice(0, 3).map((e) => (
                            <div
                              key={e.id}
                              className="w-full rounded px-1 py-0.5 truncate"
                              style={{
                                fontSize: "9px",
                                fontWeight: 500,
                                background: e.color + "12",
                                color: e.color,
                              }}
                            >
                              {e.title.length > 16
                                ? e.title.slice(0, 16) + "..."
                                : e.title}
                            </div>
                          ))}
                          {events.length > 3 && (
                            <span
                              style={{
                                fontSize: "9px",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              +{events.length - 3} more
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Selected day detail */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-xl p-5"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
            >
              <h3
                className="text-foreground mb-4"
                style={{ fontSize: "15px", fontWeight: 500 }}
              >
                {selectedDay
                  ? `${months[currentMonth]} ${selectedDay}`
                  : "Select a day"}
              </h3>

              {selectedEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedEvents.map((event) => {
                    const Icon = event.channelIcon;
                    const status = statusConfig[event.status];
                    return (
                      <div
                        key={event.id}
                        className="border border-border rounded-lg p-3.5 hover:border-border-strong transition-colors group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center"
                              style={{ background: event.color + "14" }}
                            >
                              <Icon size={12} style={{ color: event.color }} />
                            </div>
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {event.channel}
                            </span>
                          </div>
                          <button className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                        <p
                          className="text-foreground mb-2"
                          style={{ fontSize: "13px", fontWeight: 500 }}
                        >
                          {event.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded"
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                color: status.text,
                                background: status.bg,
                              }}
                            >
                              {status.label}
                            </span>
                            <span
                              className="flex items-center gap-1 text-muted-foreground"
                              style={{ fontSize: "11px" }}
                            >
                              <Clock size={10} />
                              {event.time}
                            </span>
                          </div>
                          {event.score > 0 && (
                            <span
                              className="text-ora-signal"
                              style={{ fontSize: "12px", fontWeight: 600 }}
                            >
                              {event.score}/100
                            </span>
                          )}
                        </div>
                        {event.status === "scheduled" && (
                          <button
                            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity cursor-pointer"
                            style={{
                              background: "#16a34a",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            <Send size={11} />
                            Publish now
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar
                    size={24}
                    className="mx-auto mb-3 text-muted-foreground/30"
                  />
                  <p
                    className="text-muted-foreground"
                    style={{ fontSize: "13px" }}
                  >
                    Nothing scheduled for this day.
                  </p>
                  <Link
                    to="/studio"
                    className="inline-flex items-center gap-1.5 mt-3 text-ora-signal hover:opacity-80 transition-opacity"
                    style={{ fontSize: "13px", fontWeight: 500 }}
                  >
                    <Plus size={13} />
                    Create content
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Upcoming list */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-5"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
            >
              <h3
                className="text-foreground mb-4"
                style={{ fontSize: "15px", fontWeight: 500 }}
              >
                Upcoming
              </h3>
              <div className="space-y-2.5">
                {upcomingEvents.map((event) => {
                  const status = statusConfig[event.status];
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-foreground truncate"
                          style={{ fontSize: "13px", fontWeight: 450 }}
                        >
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-muted-foreground"
                            style={{ fontSize: "11px" }}
                          >
                            {event.channel}
                          </span>
                          <span
                            className="text-muted-foreground"
                            style={{ fontSize: "11px" }}
                          >
                            {event.time}
                          </span>
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          fontSize: "9px",
                          fontWeight: 600,
                          color: status.text,
                          background: status.bg,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
