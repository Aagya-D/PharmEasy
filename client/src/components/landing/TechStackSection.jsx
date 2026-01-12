export function TechStackSection() {
  const techStack = {
    Frontend: [
      "React 18+",
      "Vite",
      "Tailwind CSS",
      "React Router DOM",
      "Axios",
      "Context API",
      "Lucide React Icons",
    ],
    Backend: [
      "Node.js",
      "Express.js",
      "Prisma ORM",
      "JWT Authentication",
      "Nodemailer",
      "Rate Limiting",
      "ES Modules",
    ],
    Database: [
      "PostgreSQL",
      "Prisma Migrations",
      "ACID Compliance",
      "Role-Based Access",
      "Data Encryption",
      "Backup Support",
      "Scalable Schema",
    ],
  };

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
            marginBottom: "var(--spacing-2xl)",
            textAlign: "center",
          }}
        >
          Technology Stack
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "var(--spacing-xl)",
          }}
        >
          {Object.entries(techStack).map(([category, technologies]) => (
            <div
              key={category}
              style={{
                padding: "var(--spacing-xl)",
                backgroundColor: "var(--color-bg-primary)",
                borderRadius: "var(--radius-lg)",
                border: "2px solid var(--color-border)",
                transition: "all 0.3s ease",
              }}
            >
              <h3
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "var(--color-primary)",
                  marginBottom: "var(--spacing-lg)",
                  paddingBottom: "var(--spacing-md)",
                  borderBottom: "2px solid var(--color-primary)",
                }}
              >
                {category}
              </h3>

              <ul
                style={{
                  listStyle: "none",
                  padding: "0",
                  margin: "0",
                }}
              >
                {technologies.map((tech, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-md)",
                      marginBottom: "var(--spacing-md)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--color-success)",
                        fontWeight: "var(--font-weight-bold)",
                        fontSize: "1.2rem",
                      }}
                    >
                      ✓
                    </span>
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
