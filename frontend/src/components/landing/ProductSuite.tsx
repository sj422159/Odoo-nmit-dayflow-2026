import React, { useState } from 'react';
import { Icon } from '@iconify/react';

export interface ProductModule {
  id: string;
  label: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  ctaText?: string;
  component?: React.ReactNode;
}

// We will add products here one by one as we build each module
export const productModules: ProductModule[] = [];

interface ProductSuiteProps {
  onOpenDemo?: () => void;
}

export default function ProductSuite({ onOpenDemo }: ProductSuiteProps) {
  const [activeModuleId, setActiveModuleId] = useState<string>(
    productModules[0]?.id || ''
  );

  const activeModule = productModules.find((m) => m.id === activeModuleId);

  // If no modules have been added yet, show a clean, ready foundation
  if (productModules.length === 0) {
    return (
      <section id="product-suite" className="py-16 md:py-24 bg-bg-page border-t border-border-subtle/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Products &amp; Core Modules
            </h2>
            <p className="text-slate-600 text-base leading-relaxed mb-6">
              Our modular HRMS architecture is ready. Which product module would you like to build and add first?
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-zim-primary text-xs font-semibold border border-blue-200">
              <Icon icon="mdi:plus-circle-outline" className="text-base" />
              Ready to add modules one by one (e.g. Employee Profile, Attendance, Leave Management, Payroll)
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="product-suite" className="py-20 md:py-28 bg-bg-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Module Tabs */}
        <div className="mb-10 md:mb-14 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 sm:gap-3 w-max mx-auto">
            {productModules.map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveModuleId(module.id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  activeModuleId === module.id
                    ? 'bg-zim-primary text-white shadow-md shadow-zim-primary/25'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-zim-primary/30 hover:shadow-xs'
                }`}
              >
                <Icon icon={module.icon} className="text-lg" />
                {module.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Module Panel */}
        {activeModule && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-zim-primary mb-3 block">
                {activeModule.eyebrow}
              </span>
              <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                {activeModule.title}
              </h3>
              <p className="text-slate-600 text-base leading-relaxed mb-8">
                {activeModule.description}
              </p>
              <ul className="space-y-3.5 mb-8">
                {activeModule.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-3">
                    <Icon icon="mdi:check-circle" className="text-zim-primary text-xl flex-shrink-0" />
                    <span className="text-slate-800 font-semibold text-sm sm:text-base">{feat}</span>
                  </li>
                ))}
              </ul>
              {activeModule.ctaText && (
                <button
                  onClick={onOpenDemo}
                  className="inline-flex items-center gap-2 bg-zim-primary hover:bg-zim-primary-hover text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm sm:text-base shadow-md shadow-zim-primary/20 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {activeModule.ctaText}
                </button>
              )}
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                {activeModule.component}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
