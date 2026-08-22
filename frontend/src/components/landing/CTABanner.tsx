import { Icon } from '@iconify/react'

interface CTABannerProps {
  onOpenDemo?: () => void
}

export default function CTABanner({ onOpenDemo }: CTABannerProps) {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-zim-navy-dark via-zim-navy-mid to-zim-purple p-8 sm:p-12 lg:p-16 text-white shadow-2xl overflow-hidden">
          {/* Decorative background circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-zim-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-zim-teal/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            <div className="max-w-2xl text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-zim-teal mb-4 border border-white/10">
                Ready to Modernize?
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
                Take Control of All Your HR Operations — See the Difference!
              </h2>
              <p className="text-base sm:text-lg text-slate-300">
                Join 2,500+ businesses and 1,000,000+ employees managing payroll, performance, and attendance on Tecryst.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 shrink-0">
              <button
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zim-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-zim-primary/30 transition-all hover:bg-zim-primary-hover hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Schedule a Live Demo</span>
                <Icon icon="mdi:arrow-right" className="w-5 h-5" />
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Free 14-Day Pilot · No Credit Card Required
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
