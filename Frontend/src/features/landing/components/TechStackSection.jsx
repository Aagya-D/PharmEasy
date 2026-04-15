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
    <section className="px-6 py-20 bg-[#f7f6f3]">
      <div className="max-w-7xl mx-auto">
        {/* Intro label */}
        <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-[#007f95]/80">
          ENGINEERING FOUNDATION
        </p>

        <h2 className="landing-display text-4xl text-gray-900 mb-14 text-center md:text-5xl">
          Technology Stack
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Object.entries(techStack).map(([category, technologies]) => (
            <div
              key={category}
              className="rounded-2xl border border-cyan-900/15 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
            >
              <h3 className="mb-6 inline-flex rounded-full bg-cyan-50 px-4 py-1.5 text-sm font-bold tracking-[0.14em] text-[#007f95]">
                {category}
              </h3>

              <ul className="m-0 list-none p-0">
                {technologies.map((tech, idx) => (
                  <li
                    key={idx}
                    className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm text-gray-900"
                  >
                    <span className="text-[#0097b2] font-bold text-base">
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
