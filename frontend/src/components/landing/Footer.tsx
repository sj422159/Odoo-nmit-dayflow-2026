import { Icon } from "@iconify/react";

const policyLinks = [
  "Privacy Policy",
  "Terms of Service",
  "Security & Compliance",
  "Data Protection & GDPR",
  "Acceptable Use Policy",
  "Cookie Policy",
];

const governanceLinks = [
  "Role-Based Access (RBAC)",
  "256-Bit SSL Encryption",
  "ISO 27001 Standards",
  "SOC 2 Type II Compliance",
  "System Status & SLA",
];

const companyLinks = [
  { label: "About TeCryst", badge: null },
  { label: "Careers", badge: "We're Hiring!" },
  { label: "Partner Network", badge: null },
  { label: "Contact Support", badge: null },
  { label: "Schedule a Demo", badge: null },
];

const offices = [
  {
    name: "India HQ (Gurugram)",
    address: "Plot No. 108, Sector 44, Gurugram, Haryana 122003",
  },
  {
    name: "India Tech Hub (Bengaluru)",
    address: "Indiranagar 100 Feet Rd, HAL 2nd Stage, Bengaluru 560038",
  },
  {
    name: "Middle East (Dubai)",
    address: "DIFC Gate Precinct 4, Level 5, Dubai, UAE",
  },
  {
    name: "United States (Delaware)",
    address: "16192 Coastal Highway, Lewes, DE 19958, USA",
  },
];

const socialLinks = [
  { icon: "mdi:linkedin", label: "LinkedIn" },
  { icon: "mdi:twitter", label: "Twitter" },
  { icon: "mdi:youtube", label: "YouTube" },
  { icon: "mdi:instagram", label: "Instagram" },
  { icon: "mdi:facebook", label: "Facebook" },
];

export default function Footer() {
  return (
    <footer className="bg-zim-navy-dark text-white">
      {/* ── Top Grid ── */}
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="#" className="inline-block">
              <img
                src="/tecryst-logo-white.png"
                alt="Tecryst"
                className="h-11 w-auto object-contain"
              />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              Modern workforce technology powering seamless employee experiences, transparent governance, and enterprise security.
            </p>

            {/* App Badges */}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm transition hover:border-gray-400"
              >
                <Icon icon="mdi:apple" className="text-xl" />
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] text-gray-400">App Store</span>
                  <span className="font-semibold">4.8 ★</span>
                </span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm transition hover:border-gray-400"
              >
                <Icon icon="mdi:google-play" className="text-xl" />
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] text-gray-400">Google Play</span>
                  <span className="font-semibold">4.7 ★</span>
                </span>
              </a>
            </div>
          </div>

          {/* Governance & Trust */}
          <div>
            <h5 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
              Trust &amp; Governance
            </h5>
            <ul className="space-y-2.5">
              {governanceLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-gray-400 transition hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies & Compliance */}
          <div>
            <h5 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
              Policies &amp; Legal
            </h5>
            <ul className="space-y-2.5">
              {policyLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-gray-400 transition hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h5 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
              Company
            </h5>
            <ul className="space-y-2.5">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-zim-primary/20 px-2 py-0.5 text-[10px] font-semibold text-zim-primary">
                        {item.badge}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Global Office Locations ── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h5 className="mb-6 font-heading text-sm font-semibold uppercase tracking-wider text-white">
          Global Office Locations
        </h5>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {offices.map(({ name, address }) => (
            <div key={name} className="flex items-start gap-3">
              <Icon
                icon="mdi:map-marker"
                className="mt-0.5 shrink-0 text-lg text-zim-primary"
              />
              <div>
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">
                  {address}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-t border-gray-700/60" />
      </div>

      {/* ── Bottom Bar ── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-gray-500">
            © 2026 TeCryst Consulting Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map(({ icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="text-gray-500 transition hover:text-white"
              >
                <Icon icon={icon} className="text-xl" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
