import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

/**
 * ConfirmModal — A classy, medical-themed confirmation dialog.
 * Replaces native window.confirm() with a non-blocking modal.
 *
 * @param {boolean}  isOpen        - Controls visibility
 * @param {function} onClose       - Called when user cancels
 * @param {function} onConfirm     - Called when user confirms
 * @param {string}   title         - Dialog heading
 * @param {string}   message       - Supporting description text
 * @param {string}   confirmLabel  - Label for the destructive button (default: "Delete")
 * @param {string}   variant       - "danger" | "warning" (default: "danger")
 * @param {boolean}  isLoading     - Disables buttons while processing
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  confirmLabel = "Delete",
  variant = "danger",
  isLoading = false,
  backdropClassName = "bg-black/50 backdrop-blur-sm",
}) {
  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handleEscape = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  const accentColor = isDanger
    ? { bg: "bg-red-50", border: "border-red-100", icon: "text-red-500", iconBg: "bg-red-100", btn: "bg-red-600 hover:bg-red-700 focus:ring-red-500" }
    : { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-500", iconBg: "bg-amber-100", btn: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-400" };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${backdropClassName}`}
        onClick={!isLoading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        style={{ animation: "confirmModalIn 0.2s ease-out" }}
      >
        {/* Top accent strip */}
        <div className={`h-1 w-full ${isDanger ? "bg-gradient-to-r from-red-500 to-rose-400" : "bg-gradient-to-r from-amber-400 to-yellow-300"}`} />

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Body */}
        <div className="px-6 pt-6 pb-8">
          {/* Icon */}
          <div className={`flex items-center justify-center w-14 h-14 rounded-full ${accentColor.iconBg} mb-5 mx-auto`}>
            {isDanger
              ? <Trash2 className={accentColor.icon} size={24} />
              : <AlertTriangle className={accentColor.icon} size={24} />
            }
          </div>

          {/* Text */}
          <h2
            id="confirm-modal-title"
            className="text-center text-gray-900 font-bold text-lg mb-2"
          >
            {title}
          </h2>
          <p
            id="confirm-modal-desc"
            className="text-center text-gray-500 text-sm leading-relaxed"
          >
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3 mt-7">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-1 ${accentColor.btn}`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Processing…
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confirmModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
