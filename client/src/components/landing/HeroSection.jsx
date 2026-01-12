import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/register");
    }
  };

  return (
    <section
      style={{
        paddingTop: "var(--spacing-3xl)",
        paddingBottom: "var(--spacing-3xl)",
        paddingLeft: "var(--spacing-xl)",
        paddingRight: "var(--spacing-xl)",
        minHeight: "90vh",
        display: "flex",
        alignItems: "center",
        backgroundColor:
          "linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-bg-primary) 100%)",
        backgroundImage:
          "linear-gradient(135deg, rgba(8, 145, 178, 0.05) 0%, transparent 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ marginBottom: "var(--spacing-2xl)" }}>
          <div
            style={{
              display: "inline-block",
              padding: "var(--spacing-sm) var(--spacing-md)",
              backgroundColor: "var(--color-primary-bg)",
              borderRadius: "var(--radius-full)",
              marginBottom: "var(--spacing-lg)",
            }}
          >
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-primary)",
              }}
            >
              🏥 Real-time Medicine Availability Platform
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 8vw, 3.5rem)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-lg)",
              lineHeight: "var(--line-height-tight)",
            }}
          >
            Stop Searching Multiple Pharmacies.
            <br />
            Find Essential Medicines Instantly.
          </h1>

          <p
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--spacing-2xl)",
              maxWidth: "700px",
              lineHeight: "var(--line-height-relaxed)",
            }}
          >
            PharmEasy connects patients with real-time medicine availability at
            nearby pharmacies. No more pharmacy hopping. No more delays in
            critical moments. One platform. Instant access.
          </p>

          <div
            style={{
              display: "flex",
              gap: "var(--spacing-md)",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleGetStarted}
              style={{
                padding: "var(--spacing-md) var(--spacing-2xl)",
                backgroundColor: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-base)",
                fontWeight: "var(--font-weight-medium)",
                cursor: "pointer",
                transition: "all var(--transition-normal)",
                boxShadow: "var(--shadow-md)",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "var(--color-primary-dark)";
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "var(--color-primary)";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "var(--shadow-md)";
              }}
            >
              Get Started
            </button>

            {!isAuthenticated && (
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "var(--spacing-md) var(--spacing-2xl)",
                  backgroundColor: "transparent",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-border-dark)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-medium)",
                  cursor: "pointer",
                  transition: "all var(--transition-normal)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--color-bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Problem Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--spacing-lg)",
            marginTop: "var(--spacing-3xl)",
            paddingTop: "var(--spacing-2xl)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {[
            {
              stat: "67+",
              desc: "Health posts with medicine shortages in Nepal",
            },
            { stat: "∞", desc: "Pharmacy hops to find one medicine" },
            { stat: "24/7", desc: "Real-time inventory tracking" },
          ].map((item, idx) => (
            <div key={idx}>
              <div
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-primary)",
                  marginBottom: "var(--spacing-xs)",
                }}
              >
                {item.stat}
              </div>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
