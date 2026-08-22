import { Icon } from "@iconify/react";

const policyLinks = [
  "Privacy Policy",
  "Terms of Service",
  "Security & Compliance",
  "Data Protection & GDPR",
  "Acceptable Use Policy",
  "Cookie Policy",
];

const companyLinks = [
  { label: "About TeCryst", badge: null },
  { label: "Careers", badge: "We're Hiring!" },
  { label: "Partner Network", badge: null },
  { label: "Contact Support", badge: null },
  { label: "Schedule a Demo", badge: null },
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
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand Column */}
          <div className="lg:pr-8">
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
