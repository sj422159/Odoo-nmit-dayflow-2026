import { useState, useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'

interface Message {
  id: string
  role: 'ai' | 'user'
  text: string
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: '👋 Hi! I’m Dayflow Assistant by Tecryst. Ask me about role-based access, attendance check-in/out, leave approvals, or salary governance!',
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, isTyping])

  const getBotResponse = (userText: string): string => {
    const text = userText.toLowerCase()
    if (text.includes('attendance') || text.includes('check-in') || text.includes('check in') || text.includes('checkout') || text.includes('status')) {
      return 'Dayflow tracks daily and weekly attendance with 1-click Check-In/Check-Out buttons. It categorizes statuses into Present, Absent, Half-day, and On Leave with real-time sync for HR Admins.'
    } else if (text.includes('leave') || text.includes('sick') || text.includes('paid') || text.includes('time-off') || text.includes('unpaid')) {
      return 'Employees can apply for Paid, Sick, and Unpaid leave with custom date ranges and remarks. HR Officers can view the pending queue, add review comments, and approve/reject with 1 click.'
    } else if (text.includes('role') || text.includes('admin') || text.includes('employee') || text.includes('rbac') || text.includes('permission')) {
      return 'Dayflow enforces strict Role-Based Access Control (RBAC). Admins manage all employees, approve leaves, and control salary structures. Employees have self-service access to check-in, apply for leave, and view their payslips.'
    } else if (text.includes('profile') || text.includes('edit') || text.includes('document') || text.includes('salary')) {
      return 'Employees can view their full profile, job details, and read-only salary structure. They can edit contact details (phone, address, avatar), while Admins have full master control over compensation and job data.'
    } else if (text.includes('payroll') || text.includes('payslip') || text.includes('salary')) {
      return 'Payroll is completely transparent: employees have read-only payslip access and downloadable PDFs, while HR Admins control salary structures, basic pay, allowances, and tax compliance.'
    } else {
      return 'Dayflow HRMS delivers: "Every workday, perfectly aligned." Click "Schedule a Demo" at the top to see a 1-on-1 walkthrough tailored to your team!'
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    setTimeout(() => {
      const reply = getBotResponse(trimmed)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: reply,
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, 600)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Floating Chat Card */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[calc(100vw-3rem)] sm:w-96 rounded-2xl bg-white shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[500px] animate-fade-in z-50">
          {/* Header */}
          <div className="bg-zim-navy-dark p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zim-primary to-zim-purple flex items-center justify-center text-white text-sm font-bold">
                <Icon icon="mdi:robot-outline" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm leading-tight">
                  Dayflow AI Assistant
                </h4>
                <span className="flex items-center gap-1.5 text-[11px] text-zim-teal">
                  <span className="h-1.5 w-1.5 rounded-full bg-zim-teal animate-pulse" />
                  Online · Ask about Dayflow HRMS
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Icon icon="mdi:close" className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="p-4 overflow-y-auto space-y-3.5 flex-1 min-h-[220px] max-h-[320px] bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-zim-primary/10 text-zim-primary flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    T
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-zim-primary text-white rounded-br-none shadow-sm'
                      : 'bg-white text-text-main border border-border-subtle rounded-bl-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-text-muted text-xs">
                <div className="w-7 h-7 rounded-full bg-zim-primary/10 text-zim-primary flex items-center justify-center shrink-0 text-xs">
                  <Icon icon="mdi:loading" className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span className="italic font-mono text-[11px]">Dayflow is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-border-subtle flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about attendance, leaves, RBAC..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 h-10 px-3.5 text-xs sm:text-sm rounded-xl border border-border-subtle outline-none focus:border-zim-primary focus:ring-1 focus:ring-zim-primary/20 transition-all placeholder:text-text-light"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-10 w-10 rounded-xl bg-zim-primary text-white flex items-center justify-center transition-colors hover:bg-zim-primary-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Icon icon="mdi:send" className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-zim-primary to-zim-purple text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Open AI Assistant"
      >
        <Icon icon={isOpen ? 'mdi:close' : 'mdi:chat-processing-outline'} className="w-7 h-7" />
      </button>
    </div>
  )
}
