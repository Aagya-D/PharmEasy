import { User, Stethoscope, Settings } from "lucide-react";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
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
            marginBottom: "var(--spacing-2xl)",
            textAlign: "center",
          }}
        >
          How It Works
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "var(--spacing-xl)",
          }}
        >
          {/* Patient Flow */}
          <div
            style={{
              padding: "var(--spacing-xl)",
              backgroundColor: "var(--color-bg-primary)",
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--color-info-light)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-md)",
                marginBottom: "var(--spacing-lg)",
              }}
            >
              <User size={28} color="var(--color-info)" />
              <h3
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-info)",
                  margin: 0,
                }}
              >
                Patient Workflow
              </h3>
            </div>

            {[
              "Search Medicine",
              "View Nearby Pharmacies",
              "Check Real-Time Stock",
              "Get Directions or SOS",
              "Receive Notifications",
            ].map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "var(--spacing-md)",
                  marginBottom: idx < 4 ? "var(--spacing-lg)" : "0",
                }}
              >
                <div
                  style={{
                    minWidth: "32px",
                    height: "32px",
                    backgroundColor: "var(--color-info)",
                    color: "white",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "var(--font-weight-bold)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {idx + 1}
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-text-primary)",
                      marginBottom: "var(--spacing-xs)",
                    }}
                  >
                    {step}
                  </p>
                  {idx === 3 && (
                    <p
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Submit SOS if unavailable
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pharmacy Admin Flow */}
          <div
            style={{
              padding: "var(--spacing-xl)",
              backgroundColor: "var(--color-bg-primary)",
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--color-success-light)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-md)",
                marginBottom: "var(--spacing-lg)",
              }}
            >
              <Stethoscope size={28} color="var(--color-success)" />
              <h3
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-success)",
                  margin: 0,
                }}
              >
                Pharmacy Admin Workflow
              </h3>
            </div>

            {[
              "Register & Verify Pharmacy",
              "Upload/Manage Inventory",
              "Set Stock Thresholds",
              "Respond to SOS Requests",
              "View Demand Analytics",
            ].map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "var(--spacing-md)",
                  marginBottom: idx < 4 ? "var(--spacing-lg)" : "0",
                }}
              >
                <div
                  style={{
                    minWidth: "32px",
                    height: "32px",
                    backgroundColor: "var(--color-success)",
                    color: "white",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "var(--font-weight-bold)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {idx + 1}
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-text-primary)",
                      marginBottom: "var(--spacing-xs)",
                    }}
                  >
                    {step}
                  </p>
                  {idx === 3 && (
                    <p
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Real-time notifications
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* System Admin Flow */}
          <div
            style={{
              padding: "var(--spacing-xl)",
              backgroundColor: "var(--color-bg-primary)",
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--color-warning-light)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-md)",
                marginBottom: "var(--spacing-lg)",
              }}
            >
              <Settings size={28} color="var(--color-warning)" />
              <h3
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-warning)",
                  margin: 0,
                }}
              >
                System Admin Workflow
              </h3>
            </div>

            {[
              "Verify Pharmacies",
              "Monitor Platform",
              "View System Analytics",
              "Manage User Disputes",
              "Generate Reports",
            ].map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "var(--spacing-md)",
                  marginBottom: idx < 4 ? "var(--spacing-lg)" : "0",
                }}
              >
                <div
                  style={{
                    minWidth: "32px",
                    height: "32px",
                    backgroundColor: "var(--color-warning)",
                    color: "white",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "var(--font-weight-bold)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {idx + 1}
                </div>
                <p
                  style={{
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
