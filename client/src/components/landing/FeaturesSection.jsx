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
      style={{
        padding: "var(--spacing-3xl) var(--spacing-xl)",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--spacing-md)",
            textAlign: "center",
          }}
        >
          Powerful Features for Healthcare Access
        </h2>

        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-secondary)",
            maxWidth: "700px",
            margin: "0 auto var(--spacing-2xl)",
            textAlign: "center",
          }}
        >
          PharmEasy brings transparency, speed, and intelligence to
          pharmaceutical logistics.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--spacing-lg)",
          }}
        >
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
                style={{
                  padding: "var(--spacing-lg)",
                  backgroundColor: "var(--color-bg-secondary)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                  transition: "all var(--transition-normal)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "var(--color-border)";
                }}
              >
                <Icon
                  size={32}
                  color="var(--color-primary)"
                  style={{ marginBottom: "var(--spacing-md)" }}
                />
                <h3
                  style={{
                    fontSize: "var(--font-size-base)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-text-primary)",
                    marginBottom: "var(--spacing-sm)",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    lineHeight: "var(--line-height-normal)",
                  }}
                >
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
