import { Zap, MapPin, Lock, BarChart3, AlertCircle, Bell } from "lucide-react";

export function BenefitsSection() {
  const benefits = [
    {
      icon: Zap,
      title: "Instant Access",
      description:
        "Real-time medicine availability across nearby pharmacies in seconds",
    },
    {
      icon: MapPin,
      title: "Smart Location",
      description:
        "Find pharmacies near you with precise distance and directions",
    },
    {
      icon: Lock,
      title: "Secure & Private",
      description:
        "Your health data is encrypted and never shared without consent",
    },
    {
      icon: BarChart3,
      title: "Data Insights",
      description:
        "Pharmacies gain valuable demand analytics to optimize stock",
    },
    {
      icon: AlertCircle,
      title: "Emergency SOS",
      description:
        "Quickly reach open pharmacies even during off-hours with SOS",
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Get notifications when medicines are back in stock",
    },
  ];

  return (
    <section className="px-6 py-20 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Intro label */}
        <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-[#007f95]/80">
          VALUE DELIVERED
        </p>

        <h2 className="landing-display text-4xl text-gray-900 mb-14 text-center md:text-5xl">
          Why Choose PharmEasy?
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl border border-cyan-900/10 bg-[#f5fcff] p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#0097b2]/45 hover:shadow-[0_22px_45px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0097b2] text-white shadow-md transition-colors duration-300 group-hover:bg-[#007f95]">
                  <Icon size={22} />
                </div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  {benefit.title}
                </h3>
                <p className="text-sm leading-7 text-slate-600">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
