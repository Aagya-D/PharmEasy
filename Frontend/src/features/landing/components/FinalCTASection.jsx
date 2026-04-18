import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  fadeUp,
  landingViewport,
  softScale,
  staggerChildren,
} from "./landingMotion";

export function FinalCTASection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative overflow-hidden px-6 py-20 text-center bg-[#042b35]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,151,178,0.28),transparent_35%),radial-gradient(circle_at_80%_85%,rgba(125,211,252,0.2),transparent_35%)]" />

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={landingViewport}
        variants={softScale()}
        className="relative max-w-4xl mx-auto rounded-[2rem] border border-cyan-100/20 bg-white/[0.05] px-6 py-12 shadow-[0_30px_70px_rgba(2,8,23,0.5)] backdrop-blur-sm md:px-10"
      >
        <motion.div variants={staggerChildren(0.12)}>
          <motion.h2
            variants={fadeUp(24)}
            className="landing-display text-4xl text-white mb-6 md:text-5xl"
          >
            Ready to Transform Your Healthcare Experience?
          </motion.h2>

          <motion.p
            variants={fadeUp(18)}
            className="mx-auto max-w-3xl text-base leading-8 text-cyan-50/85 mb-12"
          >
            Join thousands of patients and pharmacy partners who are already
            using PharmEasy to streamline their medication access and pharmacy
            operations.
          </motion.p>

          <motion.div
            variants={fadeUp(16)}
            className="mb-10 flex flex-wrap justify-center gap-4"
          >
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/register")}
                  className="rounded-xl bg-[#0097b2] px-8 py-3.5 text-base font-semibold text-white shadow-[0_14px_32px_rgba(0,151,178,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#007f95]"
                >
                  Get Started Now
                </button>

                <button
                  onClick={() => navigate("/login")}
                  className="rounded-xl border border-cyan-100/35 bg-white/5 px-8 py-3.5 text-base font-semibold text-cyan-50 transition-all duration-300 hover:border-[#7dd3fc]/75 hover:bg-cyan-50/10"
                >
                  Sign In
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-xl bg-[#0097b2] px-8 py-3.5 text-base font-semibold text-white shadow-[0_14px_32px_rgba(0,151,178,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#007f95]"
              >
                Go to Dashboard
              </button>
            )}
          </motion.div>

          <motion.p variants={fadeUp(14)} className="text-sm text-cyan-50/70">
            No credit card required. Start exploring PharmEasy instantly.
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
}
