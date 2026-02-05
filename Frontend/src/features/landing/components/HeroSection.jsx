import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Hero Section - Primary Landing Page Entry Point
 * 
 * Architecture Rules:
 * 1. ALWAYS PUBLIC: This page shows the same for everyone
 *    - No login detection
 *    - No auth-specific UI
 *    - Clean, professional landing page
 * 
 * 2. PRIMARY ACTION: "Get Started" button
 *    - Redirects to /login
 *    - Login page handles auth logic and role-based routing
 * 
 * 3. SECONDARY ACTION: "Learn More" button
 *    - Scrolls to features section
 */
export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="px-6 py-20 min-h-[90vh] flex items-center bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-5xl mx-auto w-full">
        <div className="mb-12">
          {/* Badge */}
          <div className="inline-block px-4 py-2 bg-blue-50 rounded-full mb-6">
            <span className="text-sm font-medium text-blue-600">
              🏥 Real-time Medicine Availability Platform
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Find Medicine Instantly.
            <br />
            <span className="text-blue-600">
              Stop Searching Multiple Pharmacies.
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-12 max-w-3xl leading-relaxed">
            PharmEasy connects patients with real-time medicine availability at
            nearby pharmacies. No more pharmacy hopping. No more delays in
            critical moments. One platform. Instant access.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-4 flex-wrap items-center">
            {/* PRIMARY ACTION: Get Started */}
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold shadow-lg hover:bg-blue-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <span>Get Started</span>
              <ArrowRight size={20} />
            </button>

            {/* SECONDARY ACTION: Learn More */}
            <button
              onClick={() => {
                // Scroll to features section or navigate to docs
                const featuresSection = document.getElementById('features');
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2 px-8 py-4 bg-transparent text-blue-600 border-2 border-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <span>Learn More</span>
            </button>
          </div>
        </div>

        {/* Problem Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 pt-12 border-t border-gray-200">
          {[
            {
              stat: "67+",
              desc: "Health posts with medicine shortages in Nepal",
            },
            { stat: "∞", desc: "Pharmacy hops to find one medicine" },
            { stat: "24/7", desc: "Real-time inventory tracking" },
          ].map((item, idx) => (
            <div key={idx}>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {item.stat}
              </div>
              <p className="text-sm text-gray-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
