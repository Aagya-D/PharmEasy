import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function FinalCTASection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section
      style={{
        padding: "var(--spacing-3xl) var(--spacing-xl)",
        backgroundColor: "var(--color-bg-primary)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          Ready to Transform Your Healthcare Experience?
        </h2>

        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--spacing-2xl)",
            lineHeight: "1.8",
          }}
        >
          Join thousands of patients and pharmacy partners who are already using
          PharmEasy to streamline their medication access and pharmacy
          operations.
        </p>

        <div
          style={{
            display: "flex",
            gap: "var(--spacing-lg)",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: "var(--spacing-2xl)",
          }}
        >
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => navigate("/register")}
                style={{
                  padding: "var(--spacing-md) var(--spacing-2xl)",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "var(--shadow-md)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
              >
                Get Started Now
              </button>

              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "var(--spacing-md) var(--spacing-2xl)",
                  backgroundColor: "transparent",
                  color: "var(--color-primary)",
                  border: "2px solid var(--color-primary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-primary)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--color-primary)";
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "var(--spacing-md) var(--spacing-2xl)",
                backgroundColor: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-base)",
                fontWeight: "var(--font-weight-semibold)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "var(--shadow-md)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
            >
              Go to Dashboard
            </button>
          )}
        </div>

        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          No credit card required. Start exploring PharmEasy instantly.
        </p>
      </div>
    </section>
  );
}
