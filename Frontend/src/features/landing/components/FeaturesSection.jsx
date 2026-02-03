import {
  MapPin,
  Zap,
  AlertCircle,
  Database,
  TrendingUp,
  Activity,
} from "lucide-react";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="px-6 py-20 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Powerful Features for Healthcare Access
        </h2>

        <p className="text-base text-gray-600 max-w-3xl mx-auto mb-16 text-center">
          PharmEasy brings transparency, speed, and intelligence to
          pharmaceutical logistics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="p-6 bg-gray-50 rounded-xl border border-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-600"
              >
                <Icon size={32} className="text-blue-600 mb-4" />
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-normal">
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
