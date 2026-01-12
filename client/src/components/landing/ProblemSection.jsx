import { AlertCircle, Eye, TrendingUp, LogIn } from "lucide-react";

export function ProblemSection() {
  return (
    <section
      style={{
        padding: "var(--spacing-3xl) var(--spacing-xl)",
        backgroundColor: "var(--color-bg-secondary)",
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
          The Healthcare Gap We're Solving
        </h2>

        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-secondary)",
            maxWidth: "800px",
            margin: "0 auto var(--spacing-2xl)",
            textAlign: "center",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          Fragmented pharmaceutical supply chains create information asymmetry.
          Patients waste time and resources searching for medicines across
          multiple locations, while pharmacies lack visibility into demand and
          inventory optimization.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "var(--spacing-xl)",
          }}
        >
          {[
            {
              icon: AlertCircle,
              title: "Pharmacy Hopping",
              desc: "Patients visit multiple locations to find a single medicine, especially critical during emergencies",
            },
            {
              icon: Eye,
              title: "Lack of Visibility",
              desc: "No centralized system to track inventory across pharmacies. Stock-outs go unnoticed until too late",
            },
            {
              icon: TrendingUp,
              title: "Reactive Not Proactive",
              desc: "Pharmacies cannot anticipate demand, leading to wastage or shortages without warning",
            },
            {
              icon: LogIn,
              title: "Information Asymmetry",
              desc: "Patients have no way to know which pharmacy has their required medicine in stock",
            },
          ].map((problem, idx) => {
            const Icon = problem.icon;
            return (
              <div
                key={idx}
                style={{
                  padding: "var(--spacing-xl)",
                  backgroundColor: "var(--color-bg-primary)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Icon
                  size={40}
                  color="var(--color-error)"
                  style={{ marginBottom: "var(--spacing-md)" }}
                />
                <h3
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-text-primary)",
                    marginBottom: "var(--spacing-sm)",
                  }}
                >
                  {problem.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {problem.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
