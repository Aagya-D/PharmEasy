import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ArrowRight, LogIn } from "lucide-react";

/**
 * Hero Section - Primary Landing Page Entry Point
 * 
 * Architecture Rules:
 * 1. PRIMARY ACTION: Large "Get Started" button
 *    - Guest users → Redirect to /register
 *    - Logged-in users → Redirect to /dashboard (role-specific home)
 * 
 * 2. SECONDARY ACTION (Guests Only): "Sign In" button
 *    - Only visible when user is NOT logged in
 *    - Redirects to /login
 * 
 * 3. LOGGED-IN STATE:
 *    - "Get Started" button changes to "Go to Dashboard"
 *    - No "Sign In" button shown
 */
export function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // PRIMARY ACTION: Get Started / Go to Dashboard
  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      // Logged-in user: Redirect to their role-specific dashboard
      navigate("/dashboard");
    } else {
      // Guest: Redirect to Sign Up page
      navigate("/register");
    }
  };

  // Get button text based on authentication state
  const primaryButtonText = isAuthenticated ? "Go to Dashboard" : "Get Started";
  const primaryButtonIcon = isAuthenticated ? null : <ArrowRight size={20} />;

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
          {/* Badge */}
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

          {/* Main Headline */}
          <h1
            style={{
              fontSize: "clamp(2rem, 8vw, 3.5rem)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-lg)",
              lineHeight: "var(--line-height-tight)",
            }}
          >
            Find Medicine Instantly.
            <br />
            <span style={{ color: "var(--color-primary)" }}>
              Stop Searching Multiple Pharmacies.
            </span>
          </h1>

          {/* Description */}
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

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-md)",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* PRIMARY ACTION: Get Started / Go to Dashboard */}
            <button
              onClick={handlePrimaryAction}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-sm)",
                padding: "16px 32px",
                backgroundColor: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "18px",
                fontWeight: "var(--font-weight-semibold)",
                cursor: "pointer",
                transition: "all var(--transition-normal)",
                boxShadow: "0 4px 16px rgba(59, 130, 246, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "var(--color-primary-dark)";
                e.target.style.transform = "translateY(-3px)";
                e.target.style.boxShadow = "0 8px 24px rgba(59, 130, 246, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "var(--color-primary)";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 16px rgba(59, 130, 246, 0.3)";
              }}
            >
              <span>{primaryButtonText}</span>
              {primaryButtonIcon}
            </button>

            {/* SECONDARY ACTION: Sign In (Guests Only) */}
            {!isAuthenticated && (
              <button
                onClick={() => navigate("/login")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-sm)",
                  padding: "16px 32px",
                  backgroundColor: "transparent",
                  color: "var(--color-primary)",
                  border: "2px solid var(--color-primary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "18px",
                  fontWeight: "var(--font-weight-semibold)",
                  cursor: "pointer",
                  transition: "all var(--transition-normal)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--color-primary-bg)";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                <LogIn size={20} />
                <span>Sign In</span>
              </button>
            )}

            {/* Logged-in User Info */}
            {isAuthenticated && (
              <div
                style={{
                  padding: "12px 20px",
                  backgroundColor: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  border: "1px solid var(--color-success-light)",
                }}
              >
                ✓ Logged in as {user?.name || "User"}
              </div>
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
