import React from 'react';
import { Icon } from '@iconify/react';

interface PillarCard {
  eyebrow: string;
  title: string;
  description: string;
}

const pillarCards: PillarCard[] = [
  {
    eyebrow: '01 / ROLE-BASED ACCESS',
    title: 'Strict RBAC Architecture',
    description:
      'Clear separation between Admin/HR Officer and Employee privileges. Secure sign-up/sign-in with Employee IDs and role-based route guards.',
  },
  {
    eyebrow: '02 / ATTENDANCE & LEAVES',
    title: '1-Click Attendance & Approvals',
    description:
      'Daily/weekly check-in tracking with status categorization (Present, Absent, Half-day, Leave) and instant HR approvals with reviewer feedback.',
  },
  {
    eyebrow: '03 / SALARY TRANSPARENCY',
    title: 'Governed Payroll Visibility',
    description:
      'Employees receive read-only access to salary breakdowns and payslip PDFs, while HR Admins maintain master control over salary structures and formulas.',
  },
  {
    eyebrow: '04 / UNIFIED PROFILES',
    title: '360° Employee Records',
    description:
      'Centralized repository for personal info, job details, salary records, and document vaults with field-level edit permission controls.',
  },
];

interface Certification {
  icon: string;
  label: string;
}

const certifications: Certification[] = [
  { icon: 'mdi:shield-account', label: 'Role-Based Access Control' },
  { icon: 'mdi:lock', label: 'ISO 27001 Certified' },
  { icon: 'mdi:shield-check', label: 'AICPA SOC 2 Type II' },
  { icon: 'mdi:file-certificate-outline', label: 'GDPR & Privacy Aligned' },
  { icon: 'mdi:flash', label: '99.98% SLA Uptime' },
  { icon: 'mdi:bank', label: '256-Bit SSL Encryption' },
];

const WhyZimyo: React.FC = () => {
  return (
    <section className="bg-bg-alt py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-zim-primary/10 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-zim-primary">
            Why Dayflow HRMS
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Built to Eliminate Operational Bottlenecks in Daily HR
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            Dayflow is purpose-engineered to bridge the gap between employee self-service simplicity and administrative control — keeping every workday perfectly aligned.
          </p>
        </div>

        {/* Pillar Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillarCards.map((card) => (
            <div
              key={card.eyebrow}
              className="rounded-2xl border border-border-subtle bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-zim-primary/40 flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-zim-primary">
                  {card.eyebrow}
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Security & Governance Banner */}
        <div className="mt-12 rounded-2xl bg-zim-navy-dark p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {certifications.map((cert) => (
              <div key={cert.label} className="flex items-center gap-3">
                <div className="rounded-xl bg-zim-primary/20 p-2 text-zim-primary">
                  <Icon icon={cert.icon} className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-white">{cert.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyZimyo;
