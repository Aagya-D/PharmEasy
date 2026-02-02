import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pill, Sparkles } from "lucide-react";

/**
 * Shared authentication page layout
 * Minimal, modern split-screen design with professional spacing
 * Fully responsive for mobile, tablet, and desktop
 */
export function AuthLayout({
  children,
  title,
  subtitle,
  heroImage,
  slogan,
  sloganIcon = "pill",
  accentColor = "#3B82F6",
}) {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      {/* Left side - Hero section with image background */}
      <div
        style={{
          flex: isMobile ? "0 0 auto" : "1",
          display: isMobile ? "none" : "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          padding: isMobile ? "20px" : "40px",
          minHeight: isMobile ? "auto" : "100vh",
          height: isMobile ? "auto" : "100vh",
          position: "relative",
          backgroundImage: heroImage ? `url(${heroImage})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          overflow: "hidden",
        }}
      >
        {/* Dark overlay for better text contrast */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            zIndex: 0,
          }}
        />

        {/* Back button - Top left */}
        <Link
          to="/"
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: "0px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            color: "white",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "13px",
            borderRadius: "8px",
            transition: "all 200ms ease",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(10px)",
            width: "fit-content",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
          }}
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Slogan section - Bottom left */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: "auto",
            paddingBottom: "40px",
            width: "100%",
            maxWidth: "500px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Sparkles size={18} color={accentColor} />
            <span
              style={{
                fontSize: "12px",
                color: accentColor,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Our Mission
            </span>
          </div>
          <p
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "rgba(255, 255, 255, 0.98)",
              lineHeight: 1.8,
              margin: 0,
              letterSpacing: "0.3px",
            }}
          >
            {slogan || "Empowering Pharmacy Care, One Click at a Time"}
          </p>

          {/* Bottom stats */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "24px",
              fontSize: "12px",
            }}
          >
            <div>
              <div
                style={{
                  color: accentColor,
                  fontWeight: "700",
                  fontSize: "18px",
                }}
              >
                100%
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                Secure
              </div>
            </div>
            <div>
              <div
                style={{
                  color: accentColor,
                  fontWeight: "700",
                  fontSize: "18px",
                }}
              >
                24/7
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                Available
              </div>
            </div>
            <div>
              <div
                style={{
                  color: accentColor,
                  fontWeight: "700",
                  fontSize: "18px",
                }}
              >
                Fast
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                Processing
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form container with scrollable content */}
      <div
        style={{
          flex: isMobile ? "0 0 auto" : "1",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? "20px 16px" : "40px",
          height: isMobile ? "auto" : "100vh",
          minHeight: isMobile ? "auto" : "100vh",
          position: "relative",
          overflow: isMobile ? "visible" : "hidden",
          width: isMobile ? "100%" : "auto",
        }}
      >
        {/* Form container */}
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            height: isMobile ? "auto" : "100%",
            display: "flex",
            flexDirection: "column",
            overflow: isMobile ? "visible" : "hidden",
          }}
        >
          {/* Header with Welcome message - Fixed */}
          <div
            style={{
              marginBottom: "36px",
              marginTop: isMobile ? "20px" : "0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--color-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <Pill size={20} />
              PharmEasy
            </div>

            {title && (
              <h1
                style={{
                  fontSize: isMobile ? "24px" : "28px",
                  fontWeight: "700",
                  color: "var(--color-text-primary)",
                  margin: 0,
                  letterSpacing: "-0.2px",
                }}
              >
                {title}
              </h1>
            )}

            {subtitle && (
              <p
                style={{
                  fontSize: isMobile ? "13px" : "14px",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  fontWeight: "400",
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Scrollable form content */}
          <div
            style={{
              flex: isMobile ? "0 0 auto" : "1",
              overflowY: isMobile ? "visible" : "auto",
              overflowX: "hidden",
              paddingRight: isMobile ? "0" : "8px",
              marginTop: isMobile ? "12px" : "0",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
