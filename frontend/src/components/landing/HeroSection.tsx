import { useState } from "react";
import { Icon } from "@iconify/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const weeklyAttendanceData = [
  { day: "Mon", present: 96, label: "Present: 96%" },
  { day: "Tue", present: 98, label: "Present: 98%" },
  { day: "Wed", present: 99, label: "Present: 99%" },
  { day: "Thu", present: 97, label: "Present: 97%" },
  { day: "Fri", present: 98, label: "Present: 98%" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon
          key={i}
          icon="mdi:star"
          className={`h-3.5 w-3.5 ${
            i < Math.floor(rating) ? "text-zim-amber" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewBadges() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* G2 Leader */}
      <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-white px-3 py-1.5 shadow-sm">
        <Icon icon="mdi:trophy" className="h-4 w-4 text-zim-orange" />
        <span className="text-xs font-semibold text-text-main">
          G2 Leader
        </span>
        <StarRating rating={4.6} />
        <span className="text-xs font-medium text-text-muted">4.6/5</span>
      </div>

      {/* Capterra Shortlist */}
      <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-white px-3 py-1.5 shadow-sm">
        <Icon icon="mdi:trophy" className="h-4 w-4 text-zim-primary" />
        <span className="text-xs font-semibold text-text-main">
          Capterra Shortlist
        </span>
      </div>

      {/* App Store */}
      <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-white px-3 py-1.5 shadow-sm">
        <Icon icon="mdi:cellphone" className="h-4 w-4 text-zim-teal" />
        <span className="text-xs font-semibold text-text-main">
          4.8 ★ Mobile App
        </span>
      </div>
    </div>
  );
}

function StatsRow() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <p className="font-heading text-2xl font-bold text-text-main">
          2,500+
        </p>
        <p className="text-xs text-text-muted">Global Organizations</p>
      </div>
      <div>
        <p className="font-heading text-2xl font-bold text-text-main">
          100%
        </p>
        <p className="text-xs text-text-muted">Role-Based Access (RBAC)</p>
      </div>
      <div>
        <p className="font-heading text-2xl font-bold text-zim-primary">
          98.4%
        </p>
        <p className="text-xs text-text-muted">Attendance Accuracy</p>
      </div>
      <div>
        <p className="font-heading text-2xl font-bold text-zim-teal">
          1-Click
        </p>
        <p className="text-xs text-text-muted">Leave Approvals</p>
      </div>
    </div>
  );
}

function InteractiveDashboardMockup() {
  const [role, setRole] = useState<"employee" | "admin">("admin");
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [leaveStatus, setLeaveStatus] = useState<"pending" | "approved" | "rejected">("pending");

  return (
    <div className="relative">
      {/* Main Dashboard Card */}
      <div className="rounded-3xl border border-blue-100 bg-white/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl transition-all">
        {/* Role Toggle Switch Bar */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zim-primary to-zim-purple font-heading text-sm font-bold text-white shadow-sm">
              T
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                Tecryst Dayflow HRMS
              </p>
              <p className="text-[11px] text-slate-400">
                {role === "admin" ? "Admin / HR Officer View" : "Employee Self-Service View"}
              </p>
            </div>
          </div>

          {/* Role Switcher Pill */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-border-subtle self-start sm:self-center">
            <button
              onClick={() => setRole("admin")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "admin"
                  ? "bg-white text-zim-primary shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon icon="mdi:shield-crown" className="text-sm" />
              HR Admin
            </button>
            <button
              onClick={() => setRole("employee")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "employee"
                  ? "bg-white text-zim-primary shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon icon="mdi:account" className="text-sm" />
              Employee
            </button>
          </div>
        </div>

        {/* Dynamic View Content Based on Role */}
        {role === "admin" ? (
          /* ============================================================
             ADMIN / HR OFFICER VIEW
             ============================================================ */
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-border-subtle bg-slate-50/70 p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Total Staff
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-heading text-lg font-bold text-slate-900">
                    318
                  </span>
                  <span className="text-[10px] font-bold text-zim-teal">+12 Active</span>
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-slate-50/70 p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Attendance Today
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-heading text-lg font-bold text-zim-primary">
                    98.4%
                  </span>
                  <span className="text-[10px] font-bold text-zim-teal">Present</span>
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-slate-50/70 p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Pending Leaves
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="font-heading text-lg font-bold text-zim-orange">
                    {leaveStatus === "pending" ? "3 Queue" : "2 Queue"}
                  </span>
                  <span className="text-[10px] font-bold text-zim-orange">Review</span>
                </div>
              </div>
            </div>

            {/* Weekly Attendance Recharts */}
            <div className="rounded-xl border border-border-subtle bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Icon icon="mdi:calendar-week" className="text-zim-primary text-sm" />
                  Weekly Company Attendance Overview
                </p>
                <span className="text-[10px] font-mono text-zim-teal font-semibold">
                  Live Sync ✓
                </span>
              </div>
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                  <BarChart data={weeklyAttendanceData} margin={{ top: 2, right: 2, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748B" }} />
                    <YAxis domain={[90, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748B" }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }}
                      formatter={(val: number) => [`${val}% Present`, "Attendance"]}
                    />
                    <Bar dataKey="present" radius={[4, 4, 0, 0]} barSize={24} fill="#0085FF" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Admin Interactive Action: Leave Approval Card */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                  <Icon icon="mdi:clock-alert-outline" className="text-zim-orange text-sm" />
                  Leave Request Approval Queue
                </span>
                <span className="text-[10px] font-bold text-zim-primary uppercase">
                  Sick Leave
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-zim-primary/10 text-zim-primary flex items-center justify-center font-bold text-xs">
                    AK
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      Arjun Kapoor (EMP-1104)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      24 Aug · Medical Checkup · 1 Day
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {leaveStatus === "pending" ? (
                    <>
                      <button
                        onClick={() => setLeaveStatus("approved")}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-zim-teal hover:bg-zim-teal/90 rounded-md transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setLeaveStatus("rejected")}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  ) : leaveStatus === "approved" ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-zim-teal-light text-zim-teal rounded-md flex items-center gap-1">
                      <Icon icon="mdi:check" /> Approved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 rounded-md flex items-center gap-1">
                      <Icon icon="mdi:close" /> Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             EMPLOYEE PORTAL VIEW
             ============================================================ */
          <div className="space-y-4">
            {/* Employee Header & Live Check-in Card */}
            <div className="rounded-xl border border-border-subtle bg-slate-50/80 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zim-primary to-zim-purple text-white flex items-center justify-center font-bold text-sm">
                  PS
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Priya Sharma (EMP-1092)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    UX Lead · Engineering Dept
                  </p>
                </div>
              </div>

              {/* Interactive Check-In/Out Button */}
              <button
                onClick={() => setIsCheckedIn(!isCheckedIn)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCheckedIn
                    ? "bg-zim-teal-light text-zim-teal border border-zim-teal/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    : "bg-zim-primary text-white hover:bg-zim-primary-hover shadow-sm"
                }`}
              >
                <Icon icon={isCheckedIn ? "mdi:check-circle" : "mdi:login"} className="text-sm" />
                {isCheckedIn ? "Checked In (09:15 AM)" : "Check In Now"}
              </button>
            </div>

            {/* Quick Access Tiles */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white rounded-xl p-2.5 border border-border-subtle text-center shadow-xs">
                <Icon icon="mdi:account-outline" className="text-zim-primary text-lg mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-700 block">My Profile</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-border-subtle text-center shadow-xs">
                <Icon icon="mdi:clock-outline" className="text-zim-purple text-lg mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-700 block">Attendance</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-border-subtle text-center shadow-xs">
                <Icon icon="mdi:calendar-blank-outline" className="text-zim-orange text-lg mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-700 block">Apply Leave</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-border-subtle text-center shadow-xs">
                <Icon icon="mdi:file-document-outline" className="text-zim-teal text-lg mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-700 block">My Payslip</span>
              </div>
            </div>

            {/* Leave Balance Counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50/60 rounded-xl p-2.5 border border-blue-100">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Paid Leave</span>
                <p className="font-heading text-base font-bold text-zim-primary">12 Days</p>
              </div>
              <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-100">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Sick Leave</span>
                <p className="font-heading text-base font-bold text-zim-orange">5 Days</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-2.5 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Unpaid</span>
                <p className="font-heading text-base font-bold text-slate-700">0 Used</p>
              </div>
            </div>

            {/* Salary Breakdown (Read-Only) */}
            <div className="rounded-xl border border-border-subtle bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Monthly Net Salary (Read-Only)</span>
                <span className="font-bold font-mono text-zim-teal">₹1,45,000</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div className="bg-zim-primary h-full w-[65%]" title="Basic Pay" />
                <div className="bg-zim-teal h-full w-[20%]" title="HRA & Allowances" />
                <div className="bg-zim-orange h-full w-[15%]" title="Tax & PF Deductions" />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>Basic (65%)</span>
                <span>Allowances (20%)</span>
                <span>Deductions (15%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Badges */}
      <div className="absolute -left-6 top-8 z-10 animate-float rounded-xl border border-zim-primary/30 bg-zim-primary px-3.5 py-2.5 shadow-xl hidden sm:block">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 text-slate-900">
            <Icon icon="mdi:shield-check" className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-900">
              Role-Based Access Control
            </p>
            <p className="text-[9px] text-slate-900/75">
              Admin &amp; Employee Views
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 bottom-8 z-10 animate-float-delayed rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 shadow-xl hidden sm:block">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zim-teal-light text-zim-teal">
            <Icon icon="mdi:clock-check" className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-main">
              Daily Check-in / Out
            </p>
            <p className="text-[9px] text-text-muted">
              Live Attendance Verified
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HeroSectionProps {
  onOpenDemo?: (email?: string) => void;
}

export default function HeroSection({ onOpenDemo }: HeroSectionProps) {
  const [email, setEmail] = useState("");

  return (
    <section className="relative overflow-hidden bg-bg-page pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-zim-primary/5 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-zim-purple/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ===== Left Column: Hero Content ===== */}
          <div className="max-w-xl lg:max-w-none">
            {/* H1 Title */}
            <h1 className="mb-5 font-heading text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
              Human Resource Management System Built for{" "}
              <em className="not-italic text-slate-900">
                Admins &amp; Employees
              </em>
            </h1>

            {/* Subtitle */}
            <p className="mb-8 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              Digitize employee profiles, 1-click attendance check-ins, multi-tier leave approval workflows (Paid, Sick, Unpaid), and transparent salary management with <strong>Tecryst Dayflow HRMS</strong>.
            </p>

            {/* CTA Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onOpenDemo?.(email);
              }}
              className="mb-8 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                placeholder="Enter your work email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 flex-1 rounded-xl border border-border-subtle bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-zim-primary focus:ring-2 focus:ring-zim-primary/20"
              />
              <button
                type="submit"
                className="group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-zim-primary px-6 text-sm font-bold text-slate-900 shadow-lg shadow-zim-primary/25 transition-all hover:bg-zim-primary-hover hover:shadow-xl hover:shadow-zim-primary/30 active:scale-[0.98] cursor-pointer"
              >
                Schedule Demo
                <Icon
                  icon="mdi:arrow-right"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </form>

            {/* Review Badges */}
            <div className="mb-8">
              <ReviewBadges />
            </div>

            {/* Stats Row */}
            <div className="border-t border-border-subtle pt-6">
              <StatsRow />
            </div>
          </div>

          {/* ===== Right Column: Interactive Dashboard Mockup ===== */}
          <div className="hidden lg:block">
            <InteractiveDashboardMockup />
          </div>
        </div>

        {/* Mobile Dashboard */}
        <div className="mt-12 lg:hidden">
          <InteractiveDashboardMockup />
        </div>
      </div>
    </section>
  );
}
