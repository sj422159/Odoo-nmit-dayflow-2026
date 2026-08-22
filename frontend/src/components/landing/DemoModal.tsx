import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
  prefillEmail?: string
}

export default function DemoModal({ isOpen, onClose, prefillEmail = '' }: DemoModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(prefillEmail)
  const [phone, setPhone] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [primaryInterest, setPrimaryInterest] = useState('all')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setIsSubmitted(false)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setTimeout(() => {
        onClose()
        setFullName('')
        setEmail('')
        setPhone('')
        setCompanySize('')
        setIsSubmitted(false)
      }, 2000)
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zim-navy-dark/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-border-subtle z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 text-text-muted hover:bg-slate-200 hover:text-text-main flex items-center justify-center transition-colors cursor-pointer"
        >
          <Icon icon="mdi:close" className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-zim-teal-light text-zim-teal flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:check-circle" className="w-10 h-10" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-text-main mb-2">
              Demo Request Received!
            </h3>
            <p className="text-text-muted text-sm max-w-sm mx-auto">
              Our enterprise HR specialist will contact you at <strong>{email}</strong> within 15 minutes to demo the Dayflow HRMS platform.
            </p>
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-zim-primary-light px-3 py-1 text-xs font-bold text-zim-primary mb-3">
              <Icon icon="mdi:sparkles" className="w-3.5 h-3.5" />
              1-on-1 Interactive Walkthrough
            </div>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-text-main mb-2">
              Schedule a 1-on-1 Product Demo
            </h3>
            <p className="text-text-muted text-sm mb-6">
              See how Tecryst Dayflow streamlines attendance tracking, leave approval workflows, and transparent payroll.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditi Roy"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border-subtle px-3.5 text-sm outline-none focus:border-zim-primary focus:ring-2 focus:ring-zim-primary/20 transition-all placeholder:text-text-light"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aditi@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border-subtle px-3.5 text-sm outline-none focus:border-zim-primary focus:ring-2 focus:ring-zim-primary/20 transition-all placeholder:text-text-light"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phone / Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border-subtle px-3.5 text-sm outline-none focus:border-zim-primary focus:ring-2 focus:ring-zim-primary/20 transition-all placeholder:text-text-light"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Company Size *
                </label>
                <select
                  required
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border-subtle px-3.5 text-sm outline-none focus:border-zim-primary focus:ring-2 focus:ring-zim-primary/20 transition-all text-text-main bg-white"
                >
                  <option value="">Select Employee Headcount</option>
                  <option value="20-50">20 - 50 Employees</option>
                  <option value="51-200">51 - 200 Employees</option>
                  <option value="201-500">201 - 500 Employees</option>
                  <option value="501-2000">501 - 2,000 Employees</option>
                  <option value="2000+">2,000+ Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Interest
                </label>
                <select
                  value={primaryInterest}
                  onChange={(e) => setPrimaryInterest(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border-subtle px-3.5 text-sm outline-none focus:border-zim-primary focus:ring-2 focus:ring-zim-primary/20 transition-all text-text-main bg-white"
                >
                  <option value="all">Full Dayflow Suite (Attendance + Leaves + Profiles + Payroll)</option>
                  <option value="attendance">Daily &amp; Weekly Attendance Tracking (Check-In/Out)</option>
                  <option value="leave">Leave &amp; Time-Off Approval Workflows</option>
                  <option value="profile">Employee Profile Management &amp; Document Vault</option>
                  <option value="payroll">Payroll Transparency &amp; Admin Salary Control</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 mt-2 rounded-xl bg-zim-primary text-white font-bold text-sm shadow-lg shadow-zim-primary/30 hover:bg-zim-primary-hover active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Book Demo</span>
                    <Icon icon="mdi:arrow-right" className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
