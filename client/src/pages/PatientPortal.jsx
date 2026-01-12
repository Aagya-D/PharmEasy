import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  AlertTriangle,
  Clock,
  Shield,
  Smartphone,
  ChevronRight,
  Pill,
  Building2,
  Users,
  Zap,
  Heart,
  Phone,
  ArrowRight,
  Star,
  CheckCircle,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

/**
 * Global Landing Page - Patient Portal
 * Hero section with global search bar, Emergency SOS button, and How it Works section
 */
export default function PatientPortal() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSOSPopup, setShowSOSPopup] = useState(false);

  // Mock suggestions for autocomplete
  const suggestions = [
    { name: "Paracetamol 500mg", type: "brand", category: "Pain Relief" },
    { name: "Acetaminophen", type: "generic", category: "Pain Relief" },
    { name: "Amoxicillin 250mg", type: "brand", category: "Antibiotic" },
    { name: "Ibuprofen 400mg", type: "brand", category: "Anti-inflammatory" },
    { name: "Metformin 500mg", type: "brand", category: "Diabetes" },
    { name: "Omeprazole 20mg", type: "brand", category: "Gastric" },
  ];

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      searchQuery.length > 0
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSOSClick = () => {
    setShowSOSPopup(true);
  };

  const stats = [
    { icon: Building2, value: "500+", label: "Partner Pharmacies" },
    { icon: Users, value: "50,000+", label: "Active Patients" },
    { icon: Pill, value: "10,000+", label: "Medicines Listed" },
    { icon: Zap, value: "< 30min", label: "Average Response" },
  ];

  const howItWorks = [
    {
      step: 1,
      icon: Search,
      title: "Search Medicine",
      description:
        "Enter the medicine name (brand or generic) in our smart search bar",
    },
    {
      step: 2,
      icon: MapPin,
      title: "Find Nearby",
      description:
        "View real-time availability at pharmacies near your location",
    },
    {
      step: 3,
      icon: Smartphone,
      title: "Reserve & Collect",
      description: "Reserve your medicine and collect it within the hour",
    },
    {
      step: 4,
      icon: Shield,
      title: "Verified & Safe",
      description: "All pharmacies are verified and medicines are authentic",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-cyan-50 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full blur-3xl"
            style={{ animation: "pulse 4s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200 rounded-full blur-3xl"
            style={{ animation: "pulse 4s ease-in-out infinite 1s" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Heart size={16} className="text-red-500" />
              <span>Trusted by 50,000+ patients across India</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
            >
              Find Medicines
              <span className="text-blue-600"> Instantly</span>
              <br />
              <span className="text-gray-700">Near You</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
            >
              Stop pharmacy hopping. Search for any medicine and find real-time
              availability at verified pharmacies in your area.
            </motion.p>

            {/* Global Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative max-w-2xl mx-auto mb-8"
            >
              <form onSubmit={handleSearch}>
                <div
                  className={`relative flex items-center bg-white rounded-2xl shadow-xl transition-all duration-300 ${
                    searchFocused
                      ? "ring-2 ring-blue-500 shadow-2xl"
                      : "shadow-lg"
                  }`}
                >
                  <Search
                    className="absolute left-5 text-gray-400"
                    size={22}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    placeholder="Search by medicine name, brand, or generic..."
                    className="w-full pl-14 pr-36 py-5 text-lg rounded-2xl border-0 outline-none text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">Search</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>

              {/* Autocomplete Suggestions */}
              <AnimatePresence>
                {searchFocused && filteredSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(suggestion.name);
                          navigate(
                            `/search?q=${encodeURIComponent(suggestion.name)}`
                          );
                        }}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Pill className="text-blue-500" size={18} />
                          <div>
                            <p className="font-medium text-gray-900">
                              {suggestion.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {suggestion.category}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            suggestion.type === "brand"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {suggestion.type}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Emergency SOS Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-12"
            >
              <button
                onClick={handleSOSClick}
                className="group relative inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="absolute -inset-1 bg-red-400 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <AlertTriangle
                  className="relative animate-pulse"
                  size={24}
                />
                <span className="relative">Emergency SOS</span>
                <Phone className="relative" size={20} />
              </button>
              <p className="text-sm text-gray-500 mt-3">
                Need urgent medicine? Click for immediate assistance
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-100"
                >
                  <stat.icon className="text-blue-600 mx-auto mb-2" size={28} />
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How PharmEasy Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find and reserve your medicines in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                {/* Connector Line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-200 to-blue-100" />
                )}

                <div className="relative">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg mb-6">
                    <item.icon size={28} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose PharmEasy?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We're revolutionizing how patients find and access medicines
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="text-green-600" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Real-Time Availability
              </h3>
              <p className="text-gray-600">
                Get live updates on medicine stock levels at pharmacies near
                you. No more wasted trips.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Location-Based Search
              </h3>
              <p className="text-gray-600">
                Find the nearest pharmacies with your required medicines sorted
                by distance and price.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <AlertTriangle className="text-red-600" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Emergency SOS
              </h3>
              <p className="text-gray-600">
                Urgent medicine needs? Our SOS feature connects you with
                pharmacies that can help immediately.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Find Your Medicine?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of patients who save time and effort with PharmEasy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Get Started Free
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-400 transition-colors"
            >
              Search Medicines
              <Search size={20} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* SOS Popup Modal */}
      <AnimatePresence>
        {showSOSPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSOSPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-red-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Emergency SOS
                </h3>
                <p className="text-gray-600 mb-6">
                  This will send an urgent medicine request to all nearby
                  pharmacies. Use only for genuine emergencies.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowSOSPopup(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <Link
                    to="/sos"
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors text-center"
                  >
                    Continue
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
