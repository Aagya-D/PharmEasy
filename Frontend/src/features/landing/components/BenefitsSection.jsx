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
        <h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">
          Why Choose PharmEasy?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="p-8 bg-gray-50 rounded-xl text-center border border-gray-200 transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-lg hover:border-blue-600"
              >
                <Icon
                  size={48}
                  className="text-blue-600 mx-auto mb-4"
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
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
