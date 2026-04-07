import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Pill, ShieldCheck, Sparkles } from "lucide-react";

/**
 * Shared authentication page layout
 * Centered floating card over a medical background image with teal overlay.
 * Keeps auth pages visually isolated and strictly light-themed.
 */
export function AuthLayout({
  children,
  title,
  subtitle,
  heroImage,
  slogan,
  accentColor = "#0097b2",
  cardClassName = "max-w-[460px]",
}) {
  const location = useLocation();

  const backgroundStyle = heroImage
    ? { backgroundImage: `url(${heroImage})` }
    : {
        backgroundImage:
          "linear-gradient(135deg, rgba(8, 47, 73, 0.95), rgba(13, 148, 136, 0.7)), radial-gradient(circle at top, rgba(255, 255, 255, 0.16), transparent 52%)",
      };

  return (
    <div
      className="auth-light relative min-h-screen overflow-hidden text-slate-900"
      style={{ colorScheme: "light", backgroundColor: "#f8fafc" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          ...backgroundStyle,
          backgroundSize: "cover",
          filter: "saturate(1) contrast(1.02)",
        }}
      />

      {/* Keep the right side image readable while maintaining card contrast */}
      <div className="absolute inset-0 bg-slate-950/30" />

      {/* Diagonal split with blurred background on the left */}
      <div
        className="absolute inset-y-0 left-0 hidden w-[62%] overflow-hidden md:block"
        style={{ clipPath: "polygon(0 0, 84% 0, 61% 100%, 0 100%)" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            ...backgroundStyle,
            filter: "blur(8px) brightness(0.97)",
          }}
        />
      </div>

      {/* Delicate seam highlight where split meets the image side */}
      <div
        className="absolute inset-y-0 left-[52.5%] hidden w-[2px] bg-white/25 blur-[0.6px] md:block"
        style={{ transform: "skewX(-14deg)" }}
      />

      {/* Mobile fallback: full subtle teal wash */}
      <div className="absolute inset-0 bg-teal-700/45 md:hidden" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_32%)]" />

      <Link
        to="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-lg backdrop-blur-md transition hover:bg-white/18 hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft size={16} />
        Back home
      </Link>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`w-full rounded-3xl bg-white/96 shadow-2xl shadow-slate-950/25 ring-1 ring-slate-200/80 backdrop-blur-xl ${cardClassName}`}
        >
          <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  <Pill size={24} className="text-white" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">
                    <ShieldCheck size={12} />
                    Secure Access
                  </div>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 sm:inline-flex">
                <Sparkles size={14} className="text-teal-600" />
                PharmEasy
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {title || "Welcome"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-[15px]">
                  {subtitle || "Sign in to continue"}
                </p>
                {slogan ? (
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {slogan}
                  </p>
                ) : null}

                <div className="mt-7 space-y-6">{children}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default AuthLayout;
