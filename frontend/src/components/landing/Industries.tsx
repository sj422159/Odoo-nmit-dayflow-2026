import React from 'react';
import { Icon } from '@iconify/react';

interface IndustryCard {
  icon: string;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  slug: string;
}

const industries: IndustryCard[] = [
  {
    icon: 'mdi:laptop',
    title: 'IT & SaaS',
    description:
      'Accelerate tech recruitment, manage remote talent, and streamline onboarding for distributed engineering teams.',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    slug: 'IT & SaaS',
  },
  {
    icon: 'mdi:factory',
    title: 'Manufacturing',
    description:
      'Sync workforce planning with production schedules, track shift compliance, and manage blue-collar attendance seamlessly.',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    slug: 'Manufacturing',
  },
  {
    icon: 'mdi:school',
    title: 'Education',
    description:
      'Streamline academic staff administration, automate payroll for teaching and non-teaching staff, and manage leave cycles.',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    slug: 'Education',
  },
  {
    icon: 'mdi:truck-delivery',
    title: 'Logistics & Supply Chain',
    description:
      'Coordinate mobile field drivers, automate route-based attendance, and manage multi-hub workforce operations.',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    slug: 'Logistics',
  },
  {
    icon: 'mdi:bank',
    title: 'BFSI & Fintech',
    description:
      'Compliance-first HRMS for regulated environments with audit trails, role-based access, and statutory reporting.',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    slug: 'BFSI & Fintech',
  },
  {
    icon: 'mdi:car',
    title: 'Automotive & Dealerships',
    description:
      'Multi-showroom workforce management with location-based attendance, sales incentive tracking, and service staff scheduling.',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    slug: 'Automotive',
  },
  {
    icon: 'mdi:shopping',
    title: 'Retail & Supermarkets',
    description:
      'Dynamic store staffing, seasonal workforce scaling, and real-time attendance tracking across multiple outlets.',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    slug: 'Retail',
  },
  {
    icon: 'mdi:silverware-fork-knife',
    title: 'Food & Beverage',
    description:
      'Shift rosters, tip distribution, kitchen and front-of-house scheduling with compliance-ready payroll.',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    slug: 'F&B',
  },
  {
    icon: 'mdi:bed',
    title: 'Hospitality & Hotels',
    description:
      '24/7 scheduling with zero service gaps, housekeeping roster management, and multi-property HR operations.',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    slug: 'Hospitality',
  },
];

const Industries: React.FC = () => {
  return (
    <section id="industries" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700">
            Industry Fit
          </span>
          <h2 className="font-heading mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            HR Software That Empowers Teams Across Industries
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-600">
            Every industry has unique workforce challenges. Our platform adapts to your
            sector&apos;s specific needs — from compliance requirements to shift patterns — so
            you can focus on growing your business.
          </p>
        </div>

        {/* Industry Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry) => (
            <div
              key={industry.title}
              className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {/* Card Content */}
              <div>
                {/* Icon Pill */}
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full ${industry.iconBg}`}
                >
                  <Icon
                    icon={industry.icon}
                    className={`h-6 w-6 ${industry.iconColor}`}
                  />
                </div>

                {/* Title */}
                <h3 className="font-heading text-lg font-semibold text-gray-900">
                  {industry.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {industry.description}
                </p>
              </div>

              {/* Bottom Link */}
              <a
                href={`#${industry.slug.toLowerCase().replace(/\s+/g, '-')}`}
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-colors duration-200 hover:text-blue-800"
              >
                Learn {industry.slug} Solutions
                <Icon icon="mdi:arrow-right" className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Industries;
