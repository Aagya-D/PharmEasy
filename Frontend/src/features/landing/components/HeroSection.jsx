import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroPrimaryImage from "../../../assets/sa.jpg";
import heroCardImageOne from "../../../assets/c.jpg";
import heroCardImageTwo from "../../../assets/do.jpg";
import {
  fadeUp,
  floatingAnimation,
  floatingAnimationReverse,
  slideIn,
  staggerChildren,
} from "./landingMotion";

/**
 * Public hero section for the landing page.
 */
export function HeroSection() {
  const navigate = useNavigate();
  const stats = [
    {
      stat: "67+",
      desc: "Health posts with medicine shortages in Nepal",
    },
    { stat: "∞", desc: "Pharmacy hops to find one medicine" },
    { stat: "24/7", desc: "Real-time inventory tracking" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#042b35] px-6 py-12 lg:min-h-screen lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(0,151,178,0.28),transparent_38%),radial-gradient(circle_at_88%_6%,rgba(125,211,252,0.18),transparent_30%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[1fr_0.95fr]">
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerChildren(0.12)}
          className="rounded-[2rem] border border-cyan-100/15 bg-white/[0.04] p-6 shadow-[0_30px_70px_rgba(2,8,23,0.5)] backdrop-blur-sm md:p-8 lg:p-9"
        >
          <motion.div
            variants={fadeUp(18)}
            className="mb-4 inline-flex items-center rounded-full border border-[#8de6f5]/40 bg-[#0097b2]/22 px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#baf4ff]"
          >
            REAL-TIME MEDICINE AVAILABILITY PLATFORM
          </motion.div>

          <motion.h1
            variants={fadeUp(26)}
            className="landing-display text-4xl leading-[1.02] text-white sm:text-5xl md:text-6xl"
          >
            Find Medicine Instantly.
            <span className="mt-2 block text-[#73def4]">
              Stop Searching Multiple Pharmacies.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp(24)}
            className="mt-5 max-w-2xl text-[15px] leading-7 text-cyan-50/85 md:text-base"
          >
            PharmEasy connects patients with real-time medicine availability at
            nearby pharmacies. No more pharmacy hopping. No more delays in
            critical moments. One platform. Instant access.
          </motion.p>

          <motion.div
            variants={fadeUp(20)}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => navigate("/login")}
              className="group inline-flex items-center gap-2 rounded-xl bg-[#0097b2] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(0,151,178,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#007f95] md:px-7 md:py-3.5 md:text-base"
            >
              <span>Get Started</span>
              <ArrowRight
                size={19}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>

            <button
              onClick={() => {
                const featuresSection = document.getElementById("features");
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="rounded-xl border border-cyan-100/35 bg-white/5 px-6 py-3 text-sm font-semibold text-cyan-50 transition-all duration-300 hover:border-[#7dd3fc]/75 hover:bg-cyan-50/10 md:px-7 md:py-3.5 md:text-base"
            >
              Learn More
            </button>
          </motion.div>

          <motion.div
            variants={staggerChildren(0.1, 0.15)}
            className="mt-8 grid grid-cols-1 gap-4 border-t border-cyan-100/20 pt-6 sm:grid-cols-3"
          >
            {stats.map((item) => (
              <motion.div key={item.stat} variants={fadeUp(18)}>
                <div className="landing-display text-3xl text-[#78e3f8] md:text-4xl">
                  {item.stat}
                </div>
                <p className="mt-1 text-sm leading-6 text-cyan-50/75">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={slideIn("right", 48, 0.18)}
          className="relative hidden min-h-[560px] lg:block"
        >
          <div className="absolute inset-y-10 left-8 right-8 rounded-[2rem] bg-cyan-50/5 blur-2xl" />

          <motion.div
            animate={floatingAnimation}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative w-[76%] overflow-hidden rounded-[2rem] border border-cyan-100/20 shadow-[0_30px_70px_rgba(2,8,23,0.55)]">
              <img
                src={heroPrimaryImage}
                alt="Pharmacy interior"
                className="h-[420px] w-full object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            animate={floatingAnimationReverse}
            className="absolute right-0 top-10 z-20 w-[34%] overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-900/70 shadow-2xl backdrop-blur-sm"
          >
            <img
              src={heroCardImageOne}
              alt="Medicine service counter"
              className="h-40 w-full object-cover opacity-95"
            />
          </motion.div>

          <motion.div
            animate={floatingAnimation}
            className="absolute bottom-8 left-0 z-20 w-[34%] overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-900/70 shadow-2xl backdrop-blur-sm"
          >
            <img
              src={heroCardImageTwo}
              alt="Care consultation"
              className="h-40 w-full object-cover opacity-95"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
