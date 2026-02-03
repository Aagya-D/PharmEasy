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
    <section className="px-6 py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">
          Technology Stack
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.entries(techStack).map(([category, technologies]) => (
            <div
              key={category}
              className="p-8 bg-white rounded-xl border-2 border-gray-200 transition-all duration-300"
            >
              <h3 className="text-lg font-bold text-blue-600 mb-8 pb-4 border-b-2 border-blue-600">
                {category}
              </h3>

              <ul className="list-none p-0 m-0">
                {technologies.map((tech, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-4 mb-4 text-gray-900 text-sm"
                  >
                    <span className="text-green-600 font-bold text-xl">
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
