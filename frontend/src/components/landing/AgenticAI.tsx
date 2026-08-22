import { useState } from 'react'
import { Icon } from '@iconify/react'

interface AgentCard {
  icon: string
  iconGradient: string
  title: string
  description: string
  metricIcon: string
  metricText: string
}

const AGENTS: AgentCard[] = [
  {
    icon: 'mdi:clock-alert-outline',
    iconGradient: 'from-[#0085FF] to-[#335AFF]',
    title: 'Attendance & Check-in Sentinel',
    description:
      'Continuously tracks daily and weekly employee check-in/out timestamps, auto-categorizing Present, Absent, Half-day, and Leave states with zero manual auditing.',
    metricIcon: 'mdi:flash',
    metricText: '99.4% Attendance Accuracy',
  },
  {
    icon: 'mdi:calendar-check-outline',
    iconGradient: 'from-[#00CD37] to-[#0FB88A]',
    title: 'Leave & Approval Copilot',
    description:
      'Instantly audits employee leave quotas across Paid, Sick, and Unpaid categories, drafting 1-click approval summaries with reviewer comments for HR officers.',
    metricIcon: 'mdi:lightning-bolt',
    metricText: '85% Faster Leave Processing',
  },
  {
    icon: 'mdi:shield-account-outline',
    iconGradient: 'from-[#335AFF] to-[#6366F1]',
    title: 'RBAC & Profile Auditor',
    description:
      'Enforces strict role-based access rules between Admin/HR Officer and Employee views, ensuring document privacy and secure field-level profile edits.',
    metricIcon: 'mdi:lock-check',
    metricText: '100% RBAC Compliance',
  },
  {
    icon: 'mdi:cash-check',
    iconGradient: 'from-[#DD4F24] to-[#F5A623]',
    title: 'Salary & Payroll Sentinel',
    description:
      'Audits salary structure adjustments, basic pay formulas, and statutory deductions before monthly payslip generation and distribution.',
    metricIcon: 'mdi:check-decagram',
    metricText: 'Zero Calculation Errors',
  },
]

type PromptKey = 'attendance' | 'leaves' | 'payroll'

const PROMPT_RESPONSES: Record<PromptKey, { title: string; html: string }> = {
  attendance: {
    title: 'Tecryst Attendance Sentinel',
    html: `I audited company-wide attendance logs for today (318 employees).<br/><br/>
    ✅ <strong>Present:</strong> 313 checked in on-time via self-service portal.<br/>
    ⚠️ <strong>Pending Review:</strong> 2 employees logged half-day, and 3 have approved leaves today. Auto-synced with weekly attendance summary.`,
  },
  leaves: {
    title: 'Tecryst Leave Copilot',
    html: `Audit run on pending leave approval queue (3 requests pending).<br/><br/>
    🏖️ <strong>Priya Sharma:</strong> Applied 3 days Paid Leave (Balance: 12 days left). <em>Status: Ready to Approve.</em><br/>
    🏥 <strong>Arjun Kapoor:</strong> Applied 1 day Sick Leave (Balance: 5 days left). Attached medical note verified.`,
  },
  payroll: {
    title: 'Tecryst Salary Sentinel',
    html: `According to Dayflow HRMS Salary Governance rules:<br/><br/>
    💰 <strong>Employee Transparency:</strong> Read-only salary breakdown and PDF payslips are prepared for August cycle.<br/>
    🔒 <strong>Admin Control:</strong> All basic, HRA, and tax deductions have been validated for 100% statutory precision.`,
  },
}

export default function AgenticAI() {
  const [activePrompt, setActivePrompt] = useState<PromptKey>('attendance')
  const [isThinking, setIsThinking] = useState(false)

  const handleSelectPrompt = (key: PromptKey) => {
    if (key === activePrompt) return
    setIsThinking(true)
    setActivePrompt(key)
    setTimeout(() => {
      setIsThinking(false)
    }, 280)
  }

  const currentResponse = PROMPT_RESPONSES[activePrompt]

  return (
    <section id="ai-agents" className="py-20 lg:py-28 bg-bg-alt relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-zim-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-48 w-96 h-96 bg-zim-teal/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Proactive AI Intelligence for Core HR Operations
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Dayflow combines robust role-based workflows with intelligent automation agents to eliminate attendance discrepancies, streamline approvals, and safeguard salary calculations.
          </p>
        </div>

        {/* 4 Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {AGENTS.map((agent) => (
            <div
              key={agent.title}
              className="bg-white rounded-2xl p-7 border border-border-subtle shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.iconGradient} flex items-center justify-center text-white mb-5 shadow-sm group-hover:scale-105 transition-transform`}
                >
                  <Icon icon={agent.icon} className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-slate-900 mb-2">
                  {agent.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  {agent.description}
                </p>
              </div>

              <div className="pt-4 border-t border-border-subtle/60 flex items-center gap-2 text-xs font-bold text-zim-primary">
                <Icon icon={agent.metricIcon} className="w-4 h-4 text-zim-primary" />
                <span>{agent.metricText}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive AI Copilot Live Demo Box */}
        <div className="rounded-3xl bg-zim-navy-dark border border-slate-700/60 p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/80 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zim-primary/20 flex items-center justify-center text-zim-primary border border-zim-primary/30">
                <Icon icon="mdi:creation" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading text-lg font-bold text-white">
                  Interactive Dayflow HR Copilot Preview
                </h4>
                <p className="text-xs sm:text-sm text-slate-400">
                  Click a sample HR workflow prompt below to see real-time analysis:
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center px-3 py-1 rounded-full bg-zim-primary/15 border border-zim-primary/40 text-zim-primary text-xs font-mono font-semibold">
              Dayflow AI Engine
            </span>
          </div>

          {/* Prompt Buttons */}
          <div className="flex flex-wrap gap-2.5 mb-6">
            <button
              onClick={() => handleSelectPrompt('attendance')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activePrompt === 'attendance'
                  ? 'bg-zim-primary text-white shadow-md shadow-zim-primary/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
              }`}
            >
              "Audit daily check-in anomalies &amp; half-day statuses"
            </button>
            <button
              onClick={() => handleSelectPrompt('leaves')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activePrompt === 'leaves'
                  ? 'bg-zim-primary text-white shadow-md shadow-zim-primary/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
              }`}
            >
              "Check pending leave requests (Paid vs Sick Leave)"
            </button>
            <button
              onClick={() => handleSelectPrompt('payroll')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activePrompt === 'payroll'
                  ? 'bg-zim-primary text-white shadow-md shadow-zim-primary/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
              }`}
            >
              "Verify monthly salary breakdown &amp; payslip exports"
            </button>
          </div>

          {/* Live Chat Bubble */}
          <div className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 flex gap-4 min-h-[140px] items-start">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zim-primary to-zim-purple flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md">
              T
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm text-zim-primary font-heading">
                  {currentResponse.title}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Dayflow Agent Live</span>
              </div>
              {isThinking ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin text-zim-primary" />
                  <span className="font-mono text-xs">Analyzing Dayflow HRMS data records...</span>
                </div>
              ) : (
                <div
                  className="text-slate-200 text-xs sm:text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentResponse.html }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
