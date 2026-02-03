import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
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
            {/* PRIMARY ACTION: Get Started / Go to Dashboard */}
            <button
              onClick={handlePrimaryAction}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold shadow-lg hover:bg-blue-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <span>{primaryButtonText}</span>
              {primaryButtonIcon}
            </button>

            {/* SECONDARY ACTION: Sign In (Guests Only) */}
            {!isAuthenticated && (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 px-8 py-4 bg-transparent text-blue-600 border-2 border-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-300"
              >
                <LogIn size={20} />
                <span>Sign In</span>
              </button>
            )}

            {/* Logged-in User Info */}
            {isAuthenticated && (
              <div className="px-5 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                ✓ Logged in as {user?.name || "User"}
              </div>
            )}
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
