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
    <section
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
            marginBottom: "var(--spacing-2xl)",
            textAlign: "center",
          }}
        >
          Why Choose PharmEasy?
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--spacing-lg)",
          }}
        >
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                style={{
                  padding: "var(--spacing-xl)",
                  backgroundColor: "var(--color-bg-secondary)",
                  borderRadius: "var(--radius-lg)",
                  textAlign: "center",
                  border: "1px solid var(--color-border)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  e.currentTarget.style.borderColor = "var(--color-border)";
                }}
              >
                <Icon
                  size={48}
                  color="var(--color-primary)"
                  style={{ margin: "0 auto var(--spacing-md)" }}
                />
                <h3
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-text-primary)",
                    marginBottom: "var(--spacing-md)",
                  }}
                >
                  {benefit.title}
                </h3>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "var(--font-size-sm)",
                    lineHeight: "1.6",
                  }}
                >
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
