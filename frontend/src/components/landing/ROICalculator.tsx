import { useState } from 'react';
import { Icon } from '@iconify/react';

function formatINR(amount: number): string {
  if (amount >= 10000000) {
    const crValue = amount / 10000000;
    const formatted = crValue % 1 === 0 ? crValue.toFixed(0) : crValue.toFixed(2).replace(/\.?0+$/, '');
    return `₹${formatted} Cr`;
  }
  if (amount >= 100000) {
    const lakhValue = amount / 100000;
    const formatted = lakhValue % 1 === 0 ? lakhValue.toFixed(0) : lakhValue.toFixed(2).replace(/\.?0+$/, '');
    return `₹${formatted} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

interface ROICalculatorProps {
  onOpenDemo?: () => void;
}

export default function ROICalculator({ onOpenDemo }: ROICalculatorProps) {
  const [employeeCount, setEmployeeCount] = useState(250);

  const hoursSaved = Math.round(employeeCount * 0.58);
  const annualSavings = Math.round(employeeCount * 7400);
  const formattedSavings = `${formatINR(annualSavings)} / yr`;

  const sliderPercent = ((employeeCount - 20) / (2500 - 20)) * 100;

  return (
    <section id="roi-calculator" className="bg-bg-alt py-16 md:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-border-subtle overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Column - Controls */}
            <div className="p-8 md:p-10 lg:p-12 flex flex-col gap-6">
              <span className="inline-flex items-center gap-2 bg-zim-primary-light text-zim-primary text-sm font-semibold px-3.5 py-1.5 rounded-full w-fit">
                <Icon icon="mdi:calculator" className="text-base" />
                ROI Estimator
              </span>

              <h2 className="font-heading text-2xl md:text-3xl font-bold text-zim-navy-dark leading-tight">
                See How Much Time & Cost Tecryst Saves Your Team
              </h2>

              <p className="text-text-muted text-base leading-relaxed">
                Drag the slider to match your team size and instantly see the projected impact on
                administrative efficiency, cost savings, and payroll accuracy.
              </p>

              {/* Slider Section */}
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <label className="text-sm font-semibold text-zim-navy-dark">
                    Total Employee Headcount:
                  </label>
                  <span className="text-zim-primary font-bold text-lg tabular-nums">
                    {employeeCount.toLocaleString('en-IN')} Employees
                  </span>
                </div>

                <div className="relative pt-1">
                  <input
                    type="range"
                    min={20}
                    max={2500}
                    step={10}
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-zim-primary bg-gray-200
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zim-primary
                      [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                      [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-zim-primary [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-zim-primary) 0%, var(--color-zim-primary) ${sliderPercent}%, #e5e7eb ${sliderPercent}%, #e5e7eb 100%)`,
                    }}
                  />
                </div>

                {/* Scale Markers */}
                <div className="flex justify-between text-xs text-text-muted mt-0.5">
                  <span>20 Team</span>
                  <span>500</span>
                  <span>1,000</span>
                  <span>2,500+ Enterprise</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                onClick={onOpenDemo}
                className="mt-4 inline-flex items-center justify-center gap-2 bg-zim-primary hover:bg-zim-primary-hover
                  text-zim-primary font-semibold text-base px-7 py-3.5 rounded-xl transition-colors duration-200 w-fit
                  shadow-md hover:shadow-lg cursor-pointer"
              >
                Get Full Custom ROI Report
                <Icon icon="mdi:arrow-right" className="text-lg" />
              </button>
            </div>

            {/* Right Column - Results */}
            <div className="bg-gradient-to-br from-zim-navy-dark to-zim-navy-deep p-8 md:p-10 lg:p-12 flex flex-col gap-8 justify-center">
              <h3 className="font-heading text-xl md:text-2xl font-bold text-zim-primary-light">
                Estimated Annual Impact
              </h3>

              {/* Stat Block 1: Hours Saved */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 flex items-start gap-4 border border-white/10">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-zim-teal/20 flex items-center justify-center">
                  <Icon icon="mdi:clock-outline" className="text-zim-teal-light text-2xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zim-primary-light/80 text-sm font-medium">
                    HR Administrative Hours Saved / Month
                  </span>
                  <span className="text-zim-primary-light font-bold text-2xl md:text-3xl tabular-nums font-heading">
                    {hoursSaved.toLocaleString('en-IN')} Hours
                  </span>
                </div>
              </div>

              {/* Stat Block 2: Annual Savings */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 flex items-start gap-4 border border-white/10">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-zim-amber/20 flex items-center justify-center">
                  <Icon icon="mdi:currency-inr" className="text-zim-amber-light text-2xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zim-primary-light/80 text-sm font-medium">
                    Estimated Annual Operational Savings
                  </span>
                  <span className="text-zim-primary-light font-bold text-2xl md:text-3xl tabular-nums font-heading">
                    {formattedSavings}
                  </span>
                </div>
              </div>

              {/* Stat Block 3: Accuracy */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 flex items-start gap-4 border border-white/10">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Icon icon="mdi:check-decagram" className="text-emerald-400 text-2xl" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-zim-primary-light/80 text-sm font-medium">
                    Payroll Accuracy & Compliance Rate
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-zim-primary-light font-bold text-2xl md:text-3xl font-heading">
                      99.9%
                    </span>
                    <span className="text-emerald-400 text-sm font-semibold bg-emerald-400/10 px-2.5 py-0.5 rounded-full">
                      Zero Error
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
