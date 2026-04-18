import { motion } from "framer-motion";
import { AlertCircle, Eye, TrendingUp, LogIn } from "lucide-react";
import { fadeUp, landingViewport, staggerChildren } from "./landingMotion";

export function ProblemSection() {
  const problems = [
    {
      icon: AlertCircle,
      title: "Pharmacy Hopping",
      desc: "Patients visit multiple locations to find a single medicine, especially critical during emergencies",
    },
    {
      icon: Eye,
      title: "Lack of Visibility",
      desc: "No centralized system to track inventory across pharmacies. Stock-outs go unnoticed until too late",
    },
    {
      icon: TrendingUp,
      title: "Reactive Not Proactive",
      desc: "Pharmacies cannot anticipate demand, leading to wastage or shortages without warning",
    },
    {
      icon: LogIn,
      title: "Information Asymmetry",
      desc: "Patients have no way to know which pharmacy has their required medicine in stock",
    },
  ];

  return (
    <section className="px-6 py-20 bg-[#f7f6f3]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={landingViewport}
          variants={staggerChildren(0.12)}
        >
          <motion.p
            variants={fadeUp(14)}
            className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-[#007f95]/80"
          >
            THE HEALTHCARE GAP
          </motion.p>

          <motion.h2
            variants={fadeUp(24)}
            className="landing-display text-4xl text-slate-900 mb-4 text-center md:text-5xl"
          >
            The Healthcare Gap We're Solving
          </motion.h2>

          <motion.p
            variants={fadeUp(18)}
            className="text-base text-slate-600 max-w-4xl mx-auto mb-14 text-center leading-8"
          >
            Fragmented pharmaceutical supply chains create information
            asymmetry. Patients waste time and resources searching for
            medicines across multiple locations, while pharmacies lack
            visibility into demand and inventory optimization.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={landingViewport}
          variants={staggerChildren(0.12, 0.08)}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                variants={fadeUp(24)}
                className="group rounded-2xl border border-cyan-900/10 bg-white p-7 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0097b2]/40 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#e0f7fb] text-[#0097b2] transition-colors duration-300 group-hover:bg-[#c8f0f8]">
                  <Icon size={24} />
                </div>
                <h3 className="mb-3 text-lg font-semibold text-slate-900">
                  {problem.title}
                </h3>
                <p className="text-sm leading-7 text-slate-600">
                  {problem.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
