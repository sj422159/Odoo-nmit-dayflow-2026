import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: number): TimeLeft {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="inline-flex min-w-[28px] items-center justify-center rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-xs font-semibold leading-none text-white backdrop-blur-sm">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase leading-none tracking-wider text-white/50">
        {label}
      </span>
    </div>
  );
}

export default function AnnouncementBar() {
  const [targetDate] = useState(() => Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(targetDate)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-zim-navy-dark to-zim-navy-mid">
      {/* Subtle animated glow accent */}
      <div className="pointer-events-none absolute -left-20 top-1/2 h-32 w-64 -translate-y-1/2 rounded-full bg-zim-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/2 h-32 w-64 -translate-y-1/2 rounded-full bg-zim-purple/15 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:gap-4 sm:px-6">
        {/* Left section: badge + text */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* Glowing badge */}
          <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zim-primary px-3 py-1 text-xs font-bold text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]">
            <Icon icon="mdi:rocket-launch" className="h-3.5 w-3.5" />
            Zimyo 3.0
            {/* Glow ring */}
            <span className="absolute inset-0 animate-pulse-glow rounded-full border border-zim-primary/60" />
          </span>

          {/* Text — shorter on mobile */}
          <p className="truncate text-sm leading-snug text-white">
            <span className="hidden sm:inline">
              The future of HR is here! Launching Zimyo 3.0 (powered by Agentic
              AI)
            </span>
            <span className="sm:hidden">The future of HR is here!</span>
          </p>
        </div>

        {/* Countdown timer — hidden on mobile */}
        <div className="hidden items-center gap-1.5 md:flex">
          <Digit value={timeLeft.days} label="days" />
          <span className="mt-[-10px] text-xs font-bold text-white/40">:</span>
          <Digit value={timeLeft.hours} label="hrs" />
          <span className="mt-[-10px] text-xs font-bold text-white/40">:</span>
          <Digit value={timeLeft.minutes} label="min" />
          <span className="mt-[-10px] text-xs font-bold text-white/40">:</span>
          <Digit value={timeLeft.seconds} label="sec" />
        </div>

        {/* CTA link */}
        <a
          href="#agentic-ai"
          className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-zim-primary-light transition-colors hover:text-white"
        >
          <span className="hidden sm:inline">Explore Agentic AI</span>
          <span className="sm:hidden">Explore</span>
          <Icon
            icon="mdi:arrow-right"
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </div>
    </div>
  );
}
