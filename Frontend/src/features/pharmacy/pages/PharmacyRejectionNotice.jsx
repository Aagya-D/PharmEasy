import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { XCircle, AlertTriangle, RefreshCw, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Pharmacy Rejection Notice Page
 * Displays when pharmacy application is rejected by admin
 * Allows user to re-apply with corrected information
 */
export default function PharmacyRejectionNotice() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const rejectionReason = user?.pharmacy?.rejectionReason || "Your application did not meet our verification standards.";
  const rejectedAt = user?.pharmacy?.rejectedAt;

  const handleReapply = () => {
    navigate("/pharmacy/onboarding");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <XCircle size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Application Rejected</h1>
                <p className="text-red-100 text-sm mt-1">
                  Your pharmacy registration was not approved
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Rejection Alert */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Reason for Rejection</h3>
                  <p className="text-red-700 leading-relaxed">{rejectionReason}</p>
                  {rejectedAt && (
                    <p className="text-red-600 text-sm mt-3">
                      Rejected on: {new Date(rejectedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* What to do next */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">Review the rejection reason</span> carefully and understand what needs to be corrected.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">Gather correct documentation</span> including valid pharmacy license, business registration, and ownership proof.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">Click 'Re-apply' below</span> to submit a new application with corrected information.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Common Reasons */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Common Rejection Reasons</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Invalid or expired pharmacy license
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Incomplete business registration documents
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Mismatch in pharmacy name or address
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Insufficient proof of ownership or authorization
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Unverifiable contact information
                </li>
              </ul>
            </div>

            {/* Contact Support */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">Need Help?</h3>
              <p className="text-blue-700 text-sm mb-4">
                If you believe this rejection was made in error or need clarification, please contact our support team:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:support@pharmeasy.com"
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  <Mail size={16} />
                  support@pharmeasy.com
                </a>
                <a
                  href="tel:+11234567890"
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  <Phone size={16} />
                  +1 (123) 456-7890
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReapply}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30"
              >
                <RefreshCw size={20} />
                Re-apply Now
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Applications are typically reviewed within 24-48 hours
        </p>
      </motion.div>
    </div>
  );
}
