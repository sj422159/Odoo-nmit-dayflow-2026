/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dayflow palette — cool "shift plan" ink with an electric indigo signal.
        ink: {
          DEFAULT: '#0F1A2B',
          800: '#16243A',
          700: '#1E3149',
          600: '#2C4260',
          400: '#5C6F8C',
        },
        slate: {
          150: '#E9EDF4',
        },
        paper: '#F1F4F9',
        flow: {
          50: '#EEF0FE',
          100: '#DDE1FD',
          200: '#BCC3FB',
          300: '#8E99F6',
          400: '#616FEE',
          500: '#3B4CE0',
          600: '#2C39BC',
          700: '#232D95',
          800: '#1B2373',
        },
        present: { DEFAULT: '#1F9D6B', soft: '#E4F5ED' },
        pending: { DEFAULT: '#C97A0C', soft: '#FDF0DC' },
        absent: { DEFAULT: '#D6455B', soft: '#FCE7EA' },
        away: { DEFAULT: '#6B7A99', soft: '#EDF0F6' },

        // Brand & Landing palette
        'zim-primary': '#0085FF',
        'zim-primary-hover': '#0070D6',
        'zim-primary-light': '#EBF5FF',
        'zim-navy-dark': '#0E1726',
        'zim-navy-mid': '#1A2744',
        'zim-navy-light': '#243456',
        'zim-teal': '#0FB88A',
        'zim-teal-light': '#E6F8F3',
        'zim-purple': '#4E5BA6',
        'zim-purple-soft': '#6C5DD3',
        'zim-orange': '#FF6B35',
        'zim-orange-light': '#FFF0EB',
        'zim-amber': '#F5A623',
        'zim-amber-light': '#FEF6E9',
        'text-main': '#1E293B',
        'text-muted': '#64748B',
        'text-light': '#94A3B8',
        'bg-page': '#FFFFFF',
        'bg-alt': '#F8FAFC',
        'border-subtle': '#E2E8F0',
      },
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['"Inter var"', 'Inter', 'Poppins', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-lg': ['2.5rem', { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '700' }],
        display: ['1.875rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
        eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.12em', fontWeight: '600' }],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        card: '0 1px 2px rgba(15, 26, 43, 0.04), 0 8px 24px -12px rgba(15, 26, 43, 0.16)',
        lift: '0 12px 32px -12px rgba(15, 26, 43, 0.28)',
      },
      keyframes: {
        'ribbon-in': { '0%': { transform: 'scaleX(0)' }, '100%': { transform: 'scaleX(1)' } },
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
        'pulse-ring': { '0%': { transform: 'scale(.8)', opacity: '.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(8px)' },
        },
      },
      animation: {
        'ribbon-in': 'ribbon-in .6s cubic-bezier(.22,1,.36,1) both',
        'fade-up': 'fade-up .35s ease-out both',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        marquee: 'marquee 35s linear infinite',
        'marquee-reverse': 'marquee-reverse 35s linear infinite',
        float: 'float 4s ease-in-out infinite',
        'float-delayed': 'float-delayed 4.5s ease-in-out infinite 1s',
      },
    },
  },
  plugins: [],
}
