import { Icon } from '@iconify/react'

interface Testimonial {
  quote: string
  name: string
  role: string
  company: string
  avatarText: string
  avatarBg: string
  rating: number
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      '“Tecryst reduced our monthly payroll processing time from 4 days down to literally 3 hours. The statutory compliance automation alone saved us from countless manual audit headaches.”',
    name: 'Rajesh Khattar',
    role: 'VP - People & Culture',
    company: 'Bajaj Capital',
    avatarText: 'BC',
    avatarBg: 'bg-zim-primary',
    rating: 5,
  },
  {
    quote:
      '“With 40+ hotel properties and thousands of staff on rotating shifts, Tecryst’s mobile attendance and ESS app gave our distributed workforce total self-service visibility.”',
    name: 'Sunita Menon',
    role: 'Head of HR',
    company: 'The Fern Hotels & Resorts',
    avatarText: 'FH',
    avatarBg: 'bg-zim-teal',
    rating: 5,
  },
  {
    quote:
      '“The candidate ATS pipeline and digital onboarding in Tecryst 3.0 cut our engineering time-to-hire by 55%. New joiners complete compliance before day one.”',
    name: 'Vikas Deshmukh',
    role: 'Chief Human Resources Officer',
    company: 'Shree Maruti',
    avatarText: 'ML',
    avatarBg: 'bg-zim-purple',
    rating: 5,
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 lg:py-28 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-zim-primary/20 bg-zim-primary-light px-4 py-1.5 mb-4">
            <span className="text-xs sm:text-sm font-semibold text-zim-primary">
              Customer Stories
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main tracking-tight mb-4">
            Loved by HR Leaders Across the Globe
          </h2>
          <p className="text-base sm:text-lg text-text-muted">
            Discover how high-growth organizations transformed their employee lifecycle with Tecryst.
          </p>
        </div>

        {/* 3 Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="bg-bg-alt rounded-2xl p-8 border border-border-subtle shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* 5 Stars */}
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Icon key={i} icon="mdi:star" className="w-5 h-5 text-zim-amber" />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-text-main text-sm sm:text-base leading-relaxed italic mb-8">
                  {t.quote}
                </p>
              </div>

              {/* Client Profile */}
              <div className="flex items-center gap-3.5 pt-6 border-t border-border-subtle">
                <div
                  className={`w-11 h-11 rounded-full ${t.avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0`}
                >
                  {t.avatarText}
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-text-main">
                    {t.name}
                  </h4>
                  <p className="text-xs text-text-muted">
                    {t.role}, <span className="font-medium text-text-main">{t.company}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
