import { useState } from 'react'
import { Icon } from '@iconify/react'

interface FAQItem {
  question: string
  answer: string
}

const FAQS: FAQItem[] = [
  {
    question: 'How does Role-Based Access Control (RBAC) work in Dayflow?',
    answer:
      'Dayflow provides strict role separation between Admin/HR Officers and Employees. Employees access a self-service portal to check-in/out, apply for leave, and view their personal profile & payslips. Admins/HR Officers get a centralized command center to manage all employee records, approve leave requests with comments, switch employee views, and configure salary structures.',
  },
  {
    question: 'What leave categories and approval workflows are supported?',
    answer:
      'Employees can apply for Paid Leave, Sick Leave, or Unpaid Leave by selecting date ranges and adding remarks. The request moves through Pending, Approved, or Rejected status. HR Officers can review all pending requests, approve or reject in one click, and add reviewer comments that reflect immediately in the employee\'s records.',
  },
  {
    question: 'Can employees edit their profile and view their salary structure?',
    answer:
      'Yes, with strict field-level permissions. Employees can view their personal details, job role, documents, and read-only salary structure. They can edit limited personal fields (phone number, residential address, profile picture), while Admins maintain full authority to edit job details, documents, and compensation formulas.',
  },
  {
    question: 'How does daily and weekly attendance tracking function?',
    answer:
      'Employees can check-in and check-out daily with a single click. Dayflow logs timestamps and categorizes attendance into four standard states: Present, Absent, Half-day, or On Leave. Employees can view their personal daily/weekly history, while HR Admins have real-time company-wide visibility and downloadable Excel/CSV attendance logs.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <section id="faq" className="py-20 lg:py-28 bg-bg-alt relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-zim-primary/20 bg-zim-primary-light px-4 py-1.5 mb-4">
            <span className="text-xs sm:text-sm font-bold text-zim-primary">
              Dayflow HRMS FAQ
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Learn how Dayflow streamlines authentication, profile management, attendance, and leave workflows.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-border-subtle overflow-hidden transition-all shadow-xs hover:shadow-sm"
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors cursor-pointer gap-4"
                >
                  <span className="font-heading font-bold text-base sm:text-lg text-slate-900">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                      isOpen ? 'bg-zim-primary text-white rotate-180' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon icon={isOpen ? 'mdi:minus' : 'mdi:plus'} className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-border-subtle/50 mt-2 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
