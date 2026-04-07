import {
  MapPin,
  Zap,
  AlertCircle,
  Database,
  TrendingUp,
  Activity,
  ArrowRight,
} from "lucide-react";
import pharmacyShowcase from "../../../assets/pharmacy.jpg";
import medicineShowcase from "../../../assets/medicine.jpg";
import serviceShowcase from "../../../assets/save.jpg";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="px-6 py-20 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-[#007f95]/80">
          CAPABILITIES
        </p>

        <h2 className="landing-display text-4xl text-gray-900 mb-4 text-center md:text-5xl">
          Powerful Features for Healthcare Access
        </h2>

        <p className="text-base text-slate-600 max-w-3xl mx-auto mb-14 text-center leading-8">
          PharmEasy brings transparency, speed, and intelligence to
          pharmaceutical logistics.
        </p>

        <div className="mb-14 grid gap-5 lg:grid-cols-3">
          {[
            {
              image: pharmacyShowcase,
              title: "Modern pharmacy",
              subtitle: "Clean inventory visibility",
              tone: "from-[#042b35]/80",
            },
            {
              image: medicineShowcase,
              title: "Medicine stock",
              subtitle: "Compact product focus",
              tone: "from-[#042b35]/76",
            },
            {
              image: serviceShowcase,
              title: "Support flow",
              subtitle: "Helpful service moments",
              tone: "from-[#042b35]/72",
            },
          ].map((card, idx) => (
            <div
              key={card.title}
              className={`group relative overflow-hidden rounded-[1.5rem] border border-cyan-900/10 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.07)] ${idx === 1 ? "lg:mt-8" : idx === 2 ? "lg:mt-4" : ""}`}
            >
              <img
                src={card.image}
                alt={card.title}
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${card.tone} via-transparent to-transparent`} />
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 p-4 text-white">
                <div>
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="text-xs text-cyan-50/80">{card.subtitle}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0097b2] text-white shadow-md transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight size={16} />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: MapPin,
              title: "Location-Based Search",
              desc: "Find the nearest pharmacy with your required medicine. Integrated with OpenStreetMap for accurate navigation.",
            },
            {
              icon: Zap,
              title: "Real-Time Availability",
              desc: "Instant, live updates on medicine stock across all partner pharmacies. No outdated information.",
            },
            {
              icon: AlertCircle,
              title: "Emergency SOS Requests",
              desc: "Submit urgent requests when medicines are unavailable. Nearby pharmacies get notified instantly.",
            },
            {
              icon: Database,
              title: "Inventory Dashboards",
              desc: "Pharmacy admins manage stock with real-time CRUD operations, thresholds, and automated alerts.",
            },
            {
              icon: TrendingUp,
              title: "Demand Analytics",
              desc: "Data visualization tools help pharmacies understand consumption patterns and optimize inventory.",
            },
            {
              icon: Activity,
              title: "Real-Time Notifications",
              desc: "WebSocket-powered alerts for availability updates, request status, and out-of-stock notifications.",
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl border border-cyan-900/10 bg-[#f5fcff] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#0097b2]/40 hover:shadow-[0_24px_40px_rgba(15,23,42,0.1)]"
              >
                <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-cyan-100/70 transition-colors duration-300 group-hover:bg-[#0097b2]/18" />
                <div className="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0097b2] text-white shadow-sm">
                  <Icon size={21} />
                </div>
                <h3 className="relative text-base font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="relative text-sm leading-7 text-slate-600">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
