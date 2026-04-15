import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";

/**
 * Confirmation modal for actions that need a clear yes or no decision.
 */
export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Yes, Confirm",
  cancelLabel = "No, Cancel",
  isLoading = false,
  icon = "check",
}) {
  const getIcon = () => {
    switch (icon) {
      case "check":
        return <CheckCircle size={48} className="text-blue-600" />;
      case "warning":
        return <div className="text-5xl">⚠️</div>;
      case "info":
        return <div className="text-5xl">ℹ️</div>;
      default:
        return <CheckCircle size={48} className="text-blue-600" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
              disabled={isLoading}
            >
              <X size={18} className="text-slate-400" />
            </button>

            {/* Content */}
            <div className="px-6 py-8 text-center space-y-4">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                {getIcon()}
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-slate-900">{title}</h2>

              {/* Message */}
              <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
            </div>

            {/* Action buttons */}
            <div className="px-6 py-5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60 border border-transparent"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-white animate-spin" />
                    Processing...
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
