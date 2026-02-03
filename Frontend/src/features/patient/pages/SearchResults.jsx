import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Filter,
  List,
  Map as MapIcon,
  Phone,
  Clock,
  Navigation,
  Star,
  ChevronDown,
  X,
  Pill,
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import Layout from "../../../shared/layouts/Layout";

/**
 * Medicine Search Results Page
 * Split-screen view with pharmacy list and map placeholder
 */
export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [viewMode, setViewMode] = useState("split"); // 'split', 'list', 'map'
  const [searchQuery, setSearchQuery] = useState(query);
  const [sortBy, setSortBy] = useState("distance");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [filters, setFilters] = useState({
    inStock: true,
    limited: true,
    outOfStock: false,
    maxDistance: 10,
    maxPrice: 500,
  });

  // Mock pharmacy data
  const mockPharmacies = [
    {
      id: 1,
      name: "Apollo Pharmacy",
      address: "123 MG Road, Koramangala",
      distance: 0.8,
      rating: 4.8,
      reviews: 234,
      phone: "+91 98765 43210",
      hours: "Open 24 hours",
      medicine: {
        name: query || "Paracetamol 500mg",
        price: 45,
        originalPrice: 55,
        quantity: 50,
        status: "in-stock",
      },
      isOpen: true,
    },
    {
      id: 2,
      name: "MedPlus",
      address: "456 Brigade Road, Bangalore",
      distance: 1.2,
      rating: 4.5,
      reviews: 189,
      phone: "+91 98765 43211",
      hours: "8 AM - 11 PM",
      medicine: {
        name: query || "Paracetamol 500mg",
        price: 48,
        originalPrice: 55,
        quantity: 5,
        status: "limited",
      },
      isOpen: true,
    },
    {
      id: 3,
      name: "Wellness Forever",
      address: "789 Indiranagar, Bangalore",
      distance: 2.1,
      rating: 4.6,
      reviews: 156,
      phone: "+91 98765 43212",
      hours: "7 AM - 10 PM",
      medicine: {
        name: query || "Paracetamol 500mg",
        price: 42,
        originalPrice: 55,
        quantity: 100,
        status: "in-stock",
      },
      isOpen: true,
    },
    {
      id: 4,
      name: "Netmeds Store",
      address: "101 HSR Layout, Bangalore",
      distance: 3.5,
      rating: 4.3,
      reviews: 98,
      phone: "+91 98765 43213",
      hours: "9 AM - 9 PM",
      medicine: {
        name: query || "Paracetamol 500mg",
        price: 50,
        originalPrice: 55,
        quantity: 0,
        status: "out-of-stock",
      },
      isOpen: false,
    },
    {
      id: 5,
      name: "HealthKart Pharmacy",
      address: "202 Whitefield, Bangalore",
      distance: 4.2,
      rating: 4.7,
      reviews: 312,
      phone: "+91 98765 43214",
      hours: "Open 24 hours",
      medicine: {
        name: query || "Paracetamol 500mg",
        price: 44,
        originalPrice: 55,
        quantity: 25,
        status: "in-stock",
      },
      isOpen: true,
    },
    {
      id: 6,
      name: "PharmaCare Plus",
      address: "303 Electronic City, Bangalore",
      distance: 5.8,
      rating: 4.4,
      reviews: 145,
      phone: "+91 98765 43215",
      hours: "8 AM - 10 PM",
      medicine: {
        name: query || "Paracetamol 500mg",
        price: 46,
        originalPrice: 55,
        quantity: 3,
        status: "limited",
      },
      isOpen: true,
    },
  ];

  // Filter and sort pharmacies
  const filteredPharmacies = mockPharmacies
    .filter((pharmacy) => {
      if (!filters.inStock && pharmacy.medicine.status === "in-stock")
        return false;
      if (!filters.limited && pharmacy.medicine.status === "limited")
        return false;
      if (!filters.outOfStock && pharmacy.medicine.status === "out-of-stock")
        return false;
      if (pharmacy.distance > filters.maxDistance) return false;
      if (pharmacy.medicine.price > filters.maxPrice) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "distance") return a.distance - b.distance;
      if (sortBy === "price") return a.medicine.price - b.medicine.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });

  const getStatusBadge = (status) => {
    switch (status) {
      case "in-stock":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle size={14} />
            In Stock
          </span>
        );
      case "limited":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            <AlertCircle size={14} />
            Limited Stock
          </span>
        );
      case "out-of-stock":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <AlertTriangle size={14} />
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">

      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Back and Search */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </Link>
              <div className="relative flex-1 md:w-96">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicines..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="distance">Sort by Distance</option>
                  <option value="price">Sort by Price</option>
                  <option value="rating">Sort by Rating</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  filterOpen
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>

              {/* View Toggle */}
              <div className="hidden md:flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode("split")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "split"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex gap-0.5">
                    <div className="w-2 h-4 bg-current rounded-sm" />
                    <div className="w-2 h-4 bg-current rounded-sm opacity-50" />
                  </div>
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "map"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <MapIcon size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-2 border-t border-gray-100 mt-4">
                  <div className="flex flex-wrap gap-6">
                    {/* Stock Status */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Stock Status
                      </p>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.inStock}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                inStock: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">
                            In Stock
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.limited}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                limited: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Limited</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.outOfStock}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                outOfStock: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">
                            Out of Stock
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Max Distance */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Max Distance: {filters.maxDistance} km
                      </p>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={filters.maxDistance}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxDistance: parseInt(e.target.value),
                          })
                        }
                        className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Max Price */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Max Price: ₹{filters.maxPrice}
                      </p>
                      <input
                        type="range"
                        min="10"
                        max="1000"
                        step="10"
                        value={filters.maxPrice}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxPrice: parseInt(e.target.value),
                          })
                        }
                        className="w-40 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-gray-600">
          <span className="font-semibold text-gray-900">
            {filteredPharmacies.length} pharmacies
          </span>{" "}
          found for "{query || "Paracetamol"}"
        </p>
      </div>

      {/* Main Content - Split View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div
          className={`flex gap-6 ${
            viewMode === "map" ? "flex-row-reverse" : ""
          }`}
        >
          {/* Pharmacy List */}
          {(viewMode === "list" || viewMode === "split") && (
            <div
              className={`${
                viewMode === "split" ? "w-full lg:w-1/2" : "w-full"
              } space-y-4`}
            >
              {filteredPharmacies.map((pharmacy) => (
                <motion.div
                  key={pharmacy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                    selectedPharmacy?.id === pharmacy.id
                      ? "border-blue-500 shadow-lg"
                      : "border-transparent shadow-sm hover:shadow-md hover:border-blue-200"
                  }`}
                  onClick={() => setSelectedPharmacy(pharmacy)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {pharmacy.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={14} />
                        {pharmacy.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={16} fill="currentColor" />
                        <span className="font-medium text-gray-900">
                          {pharmacy.rating}
                        </span>
                        <span className="text-gray-400 text-sm">
                          ({pharmacy.reviews})
                        </span>
                      </div>
                      <p className="text-sm text-blue-600 font-medium mt-1">
                        {pharmacy.distance} km away
                      </p>
                    </div>
                  </div>

                  {/* Medicine Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Pill className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {pharmacy.medicine.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {pharmacy.medicine.quantity} units available
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          ₹{pharmacy.medicine.price}
                        </p>
                        {pharmacy.medicine.originalPrice >
                          pharmacy.medicine.price && (
                          <p className="text-sm text-gray-400 line-through">
                            ₹{pharmacy.medicine.originalPrice}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(pharmacy.medicine.status)}
                      <span
                        className={`text-sm ${
                          pharmacy.isOpen ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        <Clock size={14} className="inline mr-1" />
                        {pharmacy.hours}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`tel:${pharmacy.phone}`}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Phone size={18} className="text-gray-600" />
                      </a>
                      <button className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors">
                        <Navigation size={18} className="text-blue-600" />
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          pharmacy.medicine.status === "out-of-stock"
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        disabled={pharmacy.medicine.status === "out-of-stock"}
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Map Placeholder */}
          {(viewMode === "map" || viewMode === "split") && (
            <div
              className={`${
                viewMode === "split" ? "hidden lg:block lg:w-1/2" : "w-full"
              } sticky top-32`}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px]">
                {/* Map Header */}
                <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapIcon size={20} />
                    <span className="font-medium">Pharmacy Locations</span>
                  </div>
                  <button className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors">
                    Expand
                  </button>
                </div>

                {/* Map Placeholder Content */}
                <div className="relative h-[calc(100%-52px)] bg-gradient-to-br from-blue-50 to-cyan-50">
                  {/* Decorative map elements */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-blue-200 rounded-full" />
                    <div className="absolute top-1/2 right-1/3 w-48 h-48 border-2 border-blue-200 rounded-full" />
                    <div className="absolute bottom-1/4 left-1/2 w-24 h-24 border-2 border-blue-200 rounded-full" />
                  </div>

                  {/* Road lines */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-gray-300" />
                    <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-gray-300" />
                    <div className="absolute left-1/3 top-0 bottom-0 w-0.5 bg-gray-300" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-0.5 bg-gray-300" />
                  </div>

                  {/* Pharmacy markers */}
                  {filteredPharmacies.slice(0, 5).map((pharmacy, index) => {
                    const positions = [
                      { top: "25%", left: "30%" },
                      { top: "40%", left: "55%" },
                      { top: "55%", left: "25%" },
                      { top: "35%", left: "70%" },
                      { top: "65%", left: "60%" },
                    ];
                    const pos = positions[index];
                    return (
                      <motion.div
                        key={pharmacy.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
                          selectedPharmacy?.id === pharmacy.id
                            ? "z-20"
                            : "z-10"
                        }`}
                        style={{ top: pos.top, left: pos.left }}
                        onClick={() => setSelectedPharmacy(pharmacy)}
                      >
                        <div
                          className={`relative ${
                            selectedPharmacy?.id === pharmacy.id
                              ? "scale-125"
                              : ""
                          } transition-transform`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                              pharmacy.medicine.status === "in-stock"
                                ? "bg-green-500"
                                : pharmacy.medicine.status === "limited"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          >
                            <Pill className="text-white" size={18} />
                          </div>
                          {selectedPharmacy?.id === pharmacy.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                            >
                              <p className="font-medium text-sm text-gray-900">
                                {pharmacy.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                ₹{pharmacy.medicine.price} •{" "}
                                {pharmacy.distance}km
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* User location marker */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg" />
                      <div className="absolute -inset-3 bg-blue-400 rounded-full animate-ping opacity-30" />
                    </div>
                  </div>

                  {/* Map attribution placeholder */}
                  <div className="absolute bottom-2 right-2 bg-white/80 px-2 py-1 rounded text-xs text-gray-500">
                    Leaflet.js Map Placeholder
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Map Toggle */}
      <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <button
          onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          {viewMode === "list" ? (
            <>
              <MapIcon size={20} />
              <span className="font-medium">View Map</span>
            </>
          ) : (
            <>
              <List size={20} />
              <span className="font-medium">View List</span>
            </>
          )}
        </button>
      </div>
      </div>
    </Layout>
  );
}

