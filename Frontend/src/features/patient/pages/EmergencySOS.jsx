import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  MapPin,
  Phone,
  Pill,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  Navigation,
  Clock,
  Info,
  X,
  Shield,
  Heart,
  Plus,
  Minus,
} from "lucide-react";
import Layout from "../../../shared/layouts/Layout";

/**
 * Emergency SOS Request Form
 * Urgent medicine request form with location and disclaimer
 */
export default function EmergencySOS()
{
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [formData, setFormData] = useState({
    medicineName: "",
    genericName: "",
    quantity: 1,
    urgencyLevel: "high",
    patientName: "",
    contactNumber: "",
    address: "",
    latitude: null,
    longitude: null,
    additionalNotes: "",
    prescriptionRequired: false,
  });

  const urgencyLevels = [
    {
      value: "critical",
      label: "Critical",
      desc: "Life-threatening, need within 1 hour",
      color: "red",
    },
    {
      value: "high",
      label: "High",
      desc: "Urgent, need within 2-4 hours",
      color: "orange",
    },
    {
      value: "medium",
      label: "Medium",
      desc: "Important, need within 24 hours",
      color: "yellow",
    },
  ];

  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        setLocationError(
          "Unable to get location. Please enter address manually."
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleQuantityChange = (delta) => {
    setFormData({
      ...formData,
      quantity: Math.max(1, formData.quantity + delta),
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="text-green-600" size={40} />
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            SOS Request Submitted!
          </h1>
          <p className="text-gray-600 mb-6">
            Your urgent medicine request has been sent to nearby pharmacies.
            You'll receive a response within minutes.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Request ID</span>
              <span className="font-mono font-semibold text-gray-900">
                SOS-{Date.now().toString(36).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                Finding pharmacies...
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to="/"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Go Home
            </Link>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  medicineName: "",
                  genericName: "",
                  quantity: 1,
                  urgencyLevel: "high",
                  patientName: "",
                  contactNumber: "",
                  address: "",
                  latitude: null,
                  longitude: null,
                  additionalNotes: "",
                  prescriptionRequired: false,
                });
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              New Request
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        {/* Disclaimer Modal */}
        <AnimatePresence>
          {showDisclaimer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Shield className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Emergency SOS - Disclaimer
                    </h2>
                    <p className="text-sm text-gray-500">
                      Please read before proceeding
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertTriangle
                      className="text-red-600 flex-shrink-0 mt-0.5"
                      size={20}
                    />
                    <div>
                      <h3 className="font-semibold text-red-800 mb-1">
                        For Genuine Emergencies Only
                      </h3>
                      <p className="text-sm text-red-700">
                        This service is intended for urgent medical needs. Misuse
                        may result in account suspension.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <Info className="text-blue-600 flex-shrink-0" size={18} />
                    <p className="text-sm text-gray-700">
                      <strong>PharmEasy is a medicine locator service</strong>,
                      not a medical consultation platform. Always consult a
                      healthcare professional for medical advice.
                    </p>
                  </div>

                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <Heart className="text-red-500 flex-shrink-0" size={18} />
                    <p className="text-sm text-gray-700">
                      <strong>For life-threatening emergencies</strong>, please
                      call emergency services (102/108) immediately before using
                      this service.
                    </p>
                  </div>

                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <Pill className="text-green-600 flex-shrink-0" size={18} />
                    <p className="text-sm text-gray-700">
                      <strong>Prescription medicines</strong> require a valid
                      prescription. Pharmacies may verify your prescription
                      before fulfilling the request.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I understand and agree that this is a medicine locator
                    service and I will use the Emergency SOS feature
                    responsibly for genuine urgent medical needs only.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100">
                <Link
                  to="/"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  Go Back
                </Link>
                <button
                  onClick={() => setShowDisclaimer(false)}
                  disabled={!disclaimerAccepted}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                    disclaimerAccepted
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  I Understand, Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

      {/* Main Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="text-red-600 animate-pulse" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Emergency SOS Request
              </h1>
              <p className="text-gray-600">
                Submit an urgent medicine request to nearby pharmacies
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Medicine Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pill className="text-blue-600" size={20} />
              Medicine Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.medicineName}
                  onChange={(e) =>
                    setFormData({ ...formData, medicineName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Paracetamol 500mg, Insulin, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generic Name (if known)
                </label>
                <input
                  type="text"
                  value={formData.genericName}
                  onChange={(e) =>
                    setFormData({ ...formData, genericName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Acetaminophen"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Required <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-20 px-4 py-2 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                    <span className="text-sm text-gray-500">units/strips</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 h-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.prescriptionRequired}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prescriptionRequired: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      This medicine requires prescription
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Urgency Level */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="text-orange-600" size={20} />
              Urgency Level
            </h2>

            <div className="grid gap-3">
              {urgencyLevels.map((level) => (
                <label
                  key={level.value}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.urgencyLevel === level.value
                      ? level.color === "red"
                        ? "border-red-500 bg-red-50"
                        : level.color === "orange"
                        ? "border-orange-500 bg-orange-50"
                        : "border-yellow-500 bg-yellow-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="urgencyLevel"
                    value={level.value}
                    checked={formData.urgencyLevel === level.value}
                    onChange={(e) =>
                      setFormData({ ...formData, urgencyLevel: e.target.value })
                    }
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.urgencyLevel === level.value
                        ? level.color === "red"
                          ? "border-red-500"
                          : level.color === "orange"
                          ? "border-orange-500"
                          : "border-yellow-500"
                        : "border-gray-300"
                    }`}
                  >
                    {formData.urgencyLevel === level.value && (
                      <div
                        className={`w-2 h-2 rounded-full ${
                          level.color === "red"
                            ? "bg-red-500"
                            : level.color === "orange"
                            ? "bg-orange-500"
                            : "bg-yellow-500"
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <p
                      className={`font-semibold ${
                        level.color === "red"
                          ? "text-red-700"
                          : level.color === "orange"
                          ? "text-orange-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {level.label}
                    </p>
                    <p className="text-sm text-gray-500">{level.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Contact & Location */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="text-green-600" size={20} />
              Contact & Location
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patientName}
                    onChange={(e) =>
                      setFormData({ ...formData, patientName: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  placeholder="Enter complete address with landmarks"
                />
              </div>

              {/* GPS Location */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                >
                  {locationLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Navigation size={18} />
                  )}
                  {locationLoading ? "Getting location..." : "Use Current GPS"}
                </button>

                {formData.latitude && formData.longitude && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle size={16} />
                    Location captured
                  </span>
                )}

                {locationError && (
                  <span className="text-sm text-red-500">{locationError}</span>
                )}
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Additional Notes
            </h2>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) =>
                setFormData({ ...formData, additionalNotes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Any additional information for the pharmacy (allergies, alternatives accepted, etc.)"
            />
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Submitting Request...
              </>
            ) : (
              <>
                <Send size={24} />
                Submit Urgent Request
              </>
            )}
          </motion.button>

          <p className="text-center text-sm text-gray-500">
            By submitting, you agree to share your contact and location details
            with nearby pharmacies
          </p>
        </motion.form>
      </div>
      </div>
    </Layout>
  );
}

