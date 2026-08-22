import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface NavSubItem {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  badge?: string;
}

export interface NavColumn {
  heading: string;
  items: NavSubItem[];
}

export interface NavItem {
  label: string;
  href?: string;
  columns?: NavColumn[];
  featured?: {
    badge: string;
    title: string;
    description: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Data — Clean Foundation for Products (Add 1-by-1)                 */
/* ------------------------------------------------------------------ */
const NAV_ITEMS: NavItem[] = [
  {
    label: "Product",
    href: "#product-suite",
    // We will populate columns here one by one as each module is built
  },
];

/* ------------------------------------------------------------------ */
/*  Navbar Component                                                   */
/* ------------------------------------------------------------------ */
interface NavbarProps {
  onOpenDemo?: () => void;
  onLogin?: () => void;
}

export default function Navbar({ onOpenDemo, onLogin }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- scroll detection ---- */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ---- lock body scroll when mobile menu open ---- */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* ---- close dropdown on outside click ---- */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openDropdown = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveDropdown(label);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        className={`sticky top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-xl shadow-md border-b border-border-subtle"
            : "bg-white border-b border-border-subtle/60"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ---- Brand: transparent tecryst logo ---- */}
          <a href="#" className="flex items-center shrink-0 group py-1">
            <img
              src="/tecryst-logo-dark.png"
              alt="Tecryst"
              className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </a>

          {/* ---- Desktop Nav: Product ---- */}
          <ul className="hidden lg:flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const hasDropdown = !!item.columns && item.columns.length > 0;
              const isActive = activeDropdown === item.label;

              if (!hasDropdown) {
                return (
                  <li key={item.label}>
                    <a
                      href={item.href || "#product-suite"}
                      className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:text-zim-primary hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {item.label}
                    </a>
                  </li>
                );
              }

              return (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => openDropdown(item.label)}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? "text-zim-primary bg-zim-primary-light"
                        : "text-slate-700 hover:text-zim-primary hover:bg-slate-50"
                    }`}
                    onClick={() =>
                      setActiveDropdown(isActive ? null : item.label)
                    }
                  >
                    {item.label}
                    <Icon
                      icon="mdi:chevron-down"
                      className={`text-base transition-transform duration-200 ${
                        isActive ? "rotate-180 text-zim-primary" : "text-slate-400"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ---- Actions: Login and Schedule a Demo ---- */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => (onLogin ? onLogin() : onOpenDemo?.())}
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 border border-border-subtle transition-all hover:border-zim-primary hover:text-zim-primary hover:bg-slate-50 cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={onOpenDemo}
              className="inline-flex items-center rounded-xl bg-zim-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-zim-primary/20 transition-all hover:bg-zim-primary-hover hover:shadow-lg hover:shadow-zim-primary/30 active:scale-98 cursor-pointer"
            >
              Schedule a Demo
            </button>

            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
              aria-label="Toggle menu"
            >
              <Icon
                icon={mobileOpen ? "mdi:close" : "mdi:menu"}
                className="text-2xl"
              />
            </button>
          </div>
        </div>
      </nav>

      {/* ---- Mobile drawer overlay ---- */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ---- Mobile drawer ---- */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col justify-between ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div>
          {/* Drawer header */}
          <div className="flex h-20 items-center justify-between border-b border-border-subtle px-6">
            <a href="#" className="flex items-center">
              <img
                src="/tecryst-logo-dark.png"
                alt="Tecryst"
                className="h-9 w-auto object-contain"
              />
            </a>
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <Icon icon="mdi:close" className="text-2xl" />
            </button>
          </div>

          {/* Drawer body */}
          <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-4 space-y-1">
            <a
              href="#product-suite"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-sm font-bold text-slate-800 hover:text-zim-primary hover:bg-slate-50 rounded-xl transition-colors"
            >
              Product
            </a>
          </div>
        </div>

        {/* Mobile CTA buttons */}
        <div className="p-6 border-t border-border-subtle bg-slate-50 space-y-3">
          <button
            onClick={() => {
              setMobileOpen(false);
              if (onLogin) onLogin();
              else onOpenDemo?.();
            }}
            className="w-full flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-slate-800 border border-border-subtle bg-white transition-colors hover:border-zim-primary hover:text-zim-primary cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={() => {
              setMobileOpen(false);
              onOpenDemo?.();
            }}
            className="w-full flex items-center justify-center rounded-xl bg-zim-primary px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-zim-primary-hover cursor-pointer"
          >
            Schedule a Demo
          </button>
        </div>
      </aside>
    </>
  );
}
