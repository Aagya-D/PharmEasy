import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export function FinalCTASection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="px-6 py-20 bg-white text-center">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-8">
          Ready to Transform Your Healthcare Experience?
        </h2>

        <p className="text-base text-gray-600 mb-16 leading-relaxed">
          Join thousands of patients and pharmacy partners who are already using
          PharmEasy to streamline their medication access and pharmacy
          operations.
        </p>

        <div className="flex gap-8 justify-center flex-wrap mb-16">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => navigate("/register")}
                className="px-8 py-4 bg-blue-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-lg"
              >
                Get Started Now
              </button>

              <button
                onClick={() => navigate("/login")}
                className="px-8 py-4 bg-transparent text-blue-600 border-2 border-blue-600 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:text-white"
              >
                Sign In
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-8 py-4 bg-blue-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-lg"
            >
              Go to Dashboard
            </button>
          )}
        </div>

        <p className="text-sm text-gray-600">
          No credit card required. Start exploring PharmEasy instantly.
        </p>
      </div>
    </section>
  );
}
