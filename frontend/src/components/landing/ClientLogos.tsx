import { Icon } from "@iconify/react";

interface CustomerBrand {
  name: string;
  subname?: string;
  icon?: string;
  iconColor?: string;
  customRender?: () => React.ReactNode;
}

const ROW_1: CustomerBrand[] = [
  {
    name: "BAJAJ CAPITAL",
    icon: "mdi:lightning-bolt",
    iconColor: "#E65100",
  },
  {
    name: "THE FERN",
    subname: "HOTELS & RESORTS",
    icon: "mdi:pine-tree",
    iconColor: "#2E7D32",
  },
  {
    name: "MANAPPURAM",
    subname: "ASSET FINANCE LIMITED",
    icon: "mdi:bank",
    iconColor: "#D32F2F",
  },
  {
    name: "SOHO HOUSE",
    icon: "mdi:grid",
    iconColor: "#374151",
  },
  {
    name: "PREM MOTORS",
    subname: "Caring for you. Always!",
    icon: "mdi:car-sports",
    iconColor: "#DC2626",
  },
  {
    name: "YRF STUDIOS",
    subname: "YASH RAJ FILMS",
    icon: "mdi:filmstrip",
    iconColor: "#C62828",
  },
];

const ROW_2: CustomerBrand[] = [
  {
    name: "MASSIVE",
    subname: "RESTAURANTS PRIVATE LIMITED",
    icon: "mdi:silverware-fork-knife",
    iconColor: "#8D6E63",
  },
  {
    name: "PETROCHEM",
    icon: "mdi:flask-outline",
    iconColor: "#C62828",
  },
  {
    name: "eduvanz",
    subname: "Making Education Accessible",
    icon: "mdi:school-outline",
    iconColor: "#0284C7",
  },
  {
    name: "SEAHAWK",
    subname: "SECURITY SERVICES",
    icon: "mdi:shield-airplane-outline",
    iconColor: "#CA8A04",
  },
  {
    name: "YOUWECAN",
    icon: "mdi:heart-flash",
    iconColor: "#0284C7",
  },
  {
    name: "virgin active",
    icon: "mdi:run-fast",
    iconColor: "#DC2626",
  },
];

const ROW_3: CustomerBrand[] = [
  {
    name: "PARAS",
    subname: "BUILDTECH",
    icon: "mdi:office-building",
    iconColor: "#1E3A8A",
  },
  {
    name: "RBIC HOME",
    icon: "mdi:home-variant-outline",
    iconColor: "#F59E0B",
  },
  {
    name: "OKL",
    subname: "ENTERPRISES",
    icon: "mdi:cog-outline",
    iconColor: "#B91C1C",
  },
  {
    name: "SAROVAR",
    subname: "HOTELS & RESORTS",
    icon: "mdi:infinity",
    iconColor: "#1E40AF",
  },
  {
    name: "MUMUSO",
    icon: "mdi:shopping-outline",
    iconColor: "#059669",
  },
  {
    name: "asianpaints",
    subname: "BERGER",
    icon: "mdi:brush-variant",
    iconColor: "#EA580C",
  },
  {
    name: "THE HOUSE OF RARE",
    icon: "mdi:hanger",
    iconColor: "#1F2937",
  },
  {
    name: "CAPITAL MOTION",
    icon: "mdi:chart-timeline-variant",
    iconColor: "#0F172A",
  },
];

function BrandCard({ brand }: { brand: CustomerBrand }) {
  return (
    <div className="bg-white rounded-xl border border-blue-100/90 shadow-[0_2px_10px_rgba(0,133,255,0.04)] hover:shadow-lg hover:border-zim-primary/50 transition-all duration-300 px-6 py-4 flex items-center justify-center gap-3 min-w-[210px] h-[78px] shrink-0 group">
      {brand.icon && (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${brand.iconColor || "#0085FF"}14` }}
        >
          <Icon
            icon={brand.icon}
            className="text-xl"
            style={{ color: brand.iconColor || "#0085FF" }}
          />
        </div>
      )}
      <div className="flex flex-col text-left">
        <span className="font-heading font-bold text-xs tracking-wider text-slate-800 group-hover:text-zim-primary transition-colors">
          {brand.name}
        </span>
        {brand.subname && (
          <span className="text-[9px] font-medium tracking-tight text-slate-400 uppercase">
            {brand.subname}
          </span>
        )}
      </div>
    </div>
  );
}

function MarqueeRow({
  brands,
  reverse = false,
  speedClass = "animate-marquee",
}: {
  brands: CustomerBrand[];
  reverse?: boolean;
  speedClass?: string;
}) {
  const anim = reverse ? "animate-marquee-reverse" : speedClass;

  return (
    <div className="group relative overflow-hidden py-1">
      <div className={`flex gap-5 ${anim} group-hover:[animation-play-state:paused]`}>
        {brands.map((brand, idx) => (
          <BrandCard key={`a-${idx}`} brand={brand} />
        ))}
        {brands.map((brand, idx) => (
          <BrandCard key={`b-${idx}`} brand={brand} />
        ))}
      </div>
    </div>
  );
}

export default function ClientLogos() {
  return (
    <section className="relative bg-[#F4F9FD] py-20 lg:py-24 overflow-hidden border-y border-blue-50/80">
      {/* Background soft grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#0085FF_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header exactly matching reference image */}
        <div className="text-center mb-14">
          <div className="inline-block mb-3">
            <span className="bg-[#D8EDFF] text-zim-primary font-heading font-extrabold text-sm sm:text-base px-4 py-1.5 rounded-lg shadow-xs tracking-wide">
              Our Customers
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#0A1629] tracking-tight">
            Businesses that trust us worldwide!
          </h2>
        </div>

        {/* Marquee rows container with gradient edge masks */}
        <div className="relative space-y-4">
          {/* Left fade mask */}
          <div className="absolute left-0 top-0 bottom-0 w-28 sm:w-48 z-20 pointer-events-none bg-gradient-to-r from-[#F4F9FD] via-[#F4F9FD]/80 to-transparent" />
          {/* Right fade mask */}
          <div className="absolute right-0 top-0 bottom-0 w-28 sm:w-48 z-20 pointer-events-none bg-gradient-to-l from-[#F4F9FD] via-[#F4F9FD]/80 to-transparent" />

          {/* Row 1 — Left Scroll */}
          <MarqueeRow brands={ROW_1} reverse={false} />

          {/* Row 2 — Right Scroll */}
          <MarqueeRow brands={ROW_2} reverse={true} />

          {/* Row 3 — Left Scroll */}
          <MarqueeRow brands={ROW_3} reverse={false} />
        </div>
      </div>
    </section>
  );
}
