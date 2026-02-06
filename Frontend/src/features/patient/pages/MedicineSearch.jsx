import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Filter,
  Navigation,
  Star,
  Clock,
  AlertCircle,
  Loader,
  CheckCircle,
} from "lucide-react";
import patientService from "../services/patient.service";

/**
 * Medicine Search & Discovery Page
 * Real-time search with pharmacy availability and filters
 */
export default function MedicineSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    nearbyOnly: false,
    inStock: true,
    priceRange: [0, 1000],
  });

  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Get user's location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (error) => {
        console.error("Location error:", error);
        setGettingLocation(false);
      }
    );
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await patientService.searchMedicinesWithAvailability(
        searchQuery,
        userLocation?.latitude,
        userLocation?.longitude
      );

      setMedicines(response.data?.medicines || []);
    } catch (err) {
      setError(err.response?.data?.message || "Search failed");
      console.error("[MEDICINE SEARCH]", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Find Medicines
          </h1>
          <p className="text-gray-600">
            Search for medicines and check availability at nearby pharmacies
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-4 top-3 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by medicine name, composition, or condition..."
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Search
                </>
              )}
            </button>

            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Navigation size={18} />
              {gettingLocation ? "Locating..." : "My Location"}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.nearbyOnly}
                onChange={(e) =>
                  setFilters({ ...filters, nearbyOnly: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <MapPin size={16} className="text-gray-600" />
              <span className="text-sm text-gray-700">Nearby only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) =>
                  setFilters({ ...filters, inStock: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-gray-700">In stock only</span>
            </label>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-900">Search Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {medicines.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Found {medicines.length} medicines
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {medicines.map((medicine) => (
                <div
                  key={medicine.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Medicine Name */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {medicine.brandName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {medicine.composition}
                  </p>

                  {/* Price & Availability */}
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="text-lg font-bold text-blue-600">
                        ₹{medicine.price}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available At</span>
                      <span className="text-sm font-medium text-green-600">
                        {medicine.pharmaciesCount} pharmacies
                      </span>
                    </div>
                  </div>

                  {/* Top Pharmacy */}
                  {medicine.nearestPharmacy && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-600 mb-1">Nearest</p>
                      <p className="text-sm font-medium text-gray-900">
                        {medicine.nearestPharmacy.name}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-600">
                          {medicine.nearestPharmacy.distance} km away
                        </span>
                        <div className="flex items-center gap-1">
                          <Star
                            size={14}
                            className="text-yellow-500 fill-yellow-500"
                          />
                          <span className="text-xs font-medium">
                            {medicine.nearestPharmacy.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        navigate(`/search?q=${encodeURIComponent(medicine.brandName)}`)
                      }
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      View All Stores
                    </button>
                    <button
                      className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && searchQuery && medicines.length === 0 && !error && (
          <div className="text-center py-16">
            <AlertCircle
              size={48}
              className="mx-auto text-gray-300 mb-4"
            />
            <p className="text-gray-500 font-medium mb-4">
              No medicines found for "{searchQuery}"
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Try searching with a different name or composition
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Initial State */}
        {!loading && !searchQuery && medicines.length === 0 && (
          <div className="text-center py-16">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-2">
              Search for medicines to get started
            </p>
            <p className="text-sm text-gray-400">
              Enter medicine name, composition, or health condition
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
