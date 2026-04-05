import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
  Heart,
} from "lucide-react";
import searchService from "../../../core/services/search.service";
import patientService from "../services/patient.service";
import useGeoLocation from "../../../shared/hooks/useGeoLocation";
import { useLocation } from "../../../context/LocationContext";
import { useCart } from "../../../context/CartContext";
import StarRating from "../../../shared/components/StarRating";
import MedicineImage from "../../../shared/components/ui/MedicineImage";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Medicine Search & Discovery Page
 * Real-time search with pharmacy availability and filters
 */
export default function MedicineSearch() {
  const navigate = useNavigate();
  const { addToCart, clearCart, isPharmacyMismatchError } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [filters, setFilters] = useState({
    nearbyOnly: false,
    inStock: true,
    priceRange: [0, 1000],
    searchRadius: 50, // Default search radius in km
  });

  // Favorites state - set of medicine names that are favorited
  const [favoritedNames, setFavoritedNames] = useState(new Set());
  const [togglingFav, setTogglingFav] = useState(null);

  // Load existing favorites on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await patientService.getFavorites();
        const names = new Set((res?.data?.favorites || []).map((f) => f.medicineName));
        setFavoritedNames(names);
      } catch {
        // ignore
      }
    })();
  }, []);

  const toggleFavorite = async (medicine) => {
    const name = medicine.medicine || medicine.brandName;
    setTogglingFav(name);
    try {
      if (favoritedNames.has(name)) {
        // Find the favorite ID first
        const res = await patientService.getFavorites();
        const fav = (res?.data?.favorites || []).find((f) => f.medicineName === name);
        if (fav) await patientService.removeFromFavorites(fav.id);
        setFavoritedNames((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      } else {
        await patientService.addToFavorites({
          medicineName: name,
          genericName: medicine.genericName || null,
          lastPrice: medicine.price || null,
          lastPharmacy: medicine.pharmacy?.name || null,
        });
        setFavoritedNames((prev) => new Set(prev).add(name));
      }
    } catch {
      // ignore
    } finally {
      setTogglingFav(null);
    }
  };

  // Use custom geolocation hook
  const { location, loading: locationLoading, error: geoError, getLocation } = useGeoLocation(false);

  // Location context - user's selected search location
  const { selectedLocation } = useLocation();

  const getMedicineRouteId = (medicine) => {
    return String(medicine?.id || `${medicine?.medicine || medicine?.brandName || "medicine"}`);
  };

  const persistMedicineSnapshot = (medicine) => {
    try {
      const routeId = getMedicineRouteId(medicine);
      sessionStorage.setItem(`medicine_detail_${routeId}`, JSON.stringify(medicine));
    } catch {
      // ignore storage failures
    }
  };

  const handleOpenDetail = (medicine) => {
    const routeId = getMedicineRouteId(medicine);
    persistMedicineSnapshot(medicine);

    navigate(`/patient/medicine/${encodeURIComponent(routeId)}`, {
      state: { medicine },
    });
  };

  const handleOpenStore = (pharmacyId) => {
    if (!pharmacyId) return;
    navigate(`/patient/pharmacy/${encodeURIComponent(pharmacyId)}`);
  };

  const handleAddToCart = (medicine) => {
    addToCart(medicine)
      .then(() => {
        persistMedicineSnapshot(medicine);
        toast.success("✅ Added to cart!");
      })
      .catch(async (error) => {
        if (!isPharmacyMismatchError(error)) {
          toast.error("Failed to add item to cart");
          return;
        }

        const shouldReplace = window.confirm(
          "Your cart has items from another pharmacy. Clear current cart and add this medicine instead?"
        );

        if (!shouldReplace) return;

        try {
          await clearCart();
          await addToCart(medicine);
          persistMedicineSnapshot(medicine);
          toast.success("✅ Added to cart!");
        } catch {
          toast.error("Unable to replace cart items right now");
        }
      });
  };

  const handlePlaceOrder = (medicine) => {
    const routeId = getMedicineRouteId(medicine);
    persistMedicineSnapshot(medicine);
    navigate("/patient/checkout", {
      state: {
        mode: "buy-now",
        items: [
          {
            id: routeId,
            medicineId: routeId,
            pharmacyId: medicine?.pharmacy?.id || medicine?.pharmacyId || null,
            medicineName: medicine?.medicine || medicine?.brandName || "Medicine",
            genericName: medicine?.genericName || null,
            quantity: 1,
            price: Number(medicine?.price || 0),
            pharmacyName: medicine?.pharmacy?.name || "Unknown Pharmacy",
            pharmacyAddress: medicine?.pharmacy?.address || null,
            pharmacyContact: medicine?.pharmacy?.contactNumber || null,
          },
        ],
      },
    });
  };

  // Get user's location on mount (with fallback to Kathmandu)
  useEffect(() => {
    getLocation();
  }, []);

  // Handle geolocation errors with fallback
  useEffect(() => {
    if (geoError) {
      setLocationError(geoError);
      // Fallback location (Kathmandu, Nepal)
      console.warn("Using default location: Kathmandu");
    }
  }, [geoError]);

  // Auto-search when user selects a new location from the location selector
  useEffect(() => {
    if (searchQuery.trim() && selectedLocation) {
      console.log("[MEDICINE SEARCH] Location changed to:", selectedLocation.name);
      // Trigger search after a brief delay to ensure state updates
      const timer = setTimeout(() => {
        const formEvent = new Event("submit", { bubbles: true });
        document.querySelector("form")?.dispatchEvent(formEvent);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedLocation]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter a medicine name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use selected location from context (user's chosen location or detected geolocation)
      // Fallback to selectedLocation context coordinates
      const lat = selectedLocation?.lat || location?.latitude || 27.7172;
      const lng = selectedLocation?.lng || location?.longitude || 85.3240;

      console.log("[MEDICINE SEARCH] Searching with:", {
        query: searchQuery,
        lat,
        lng,
        location: selectedLocation?.name || "Geolocation",
        nearbyOnly: filters.nearbyOnly,
      });

      const response = await searchService.universalSearch(
        searchQuery,
        lat,
        lng,
        {
          includeOutOfStock: !filters.inStock,
          medicineLimit: 50,
          pharmacyLimit: 20,
        }
      );

      const categorized = response?.data?.data || {};
      const medicineResults = Array.isArray(categorized.medicines)
        ? categorized.medicines
        : [];
      const pharmacyResults = Array.isArray(categorized.pharmacies)
        ? categorized.pharmacies
        : [];
      
      console.log("[MEDICINE SEARCH] Results received:", {
        medicineCount: medicineResults.length,
        pharmacyCount: pharmacyResults.length,
        location: selectedLocation?.name,
        nearestPharmacy: pharmacyResults.length > 0 ? pharmacyResults[0].name : 'N/A',
      });
      
      setMedicines(medicineResults);
      setPharmacies(pharmacyResults);

      if (medicineResults.length === 0 && pharmacyResults.length === 0) {
        setError(`❌ No pharmacies found with "${searchQuery}" in ${selectedLocation?.name || "your area"}. Try a different medicine name or expand your search location.`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Search failed";
      setError(`⚠️ ${errorMsg}`);
      console.error("[MEDICINE SEARCH]", err);
      setMedicines([]);
      setPharmacies([]);
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

        {/* Location Alert */}
        {locationError && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-blue-900">Using Default Location</p>
              <p className="text-blue-700 text-sm">Showing results for Kathmandu, Nepal. Click "My Location" to use your current position.</p>
            </div>
          </div>
        )}

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8 rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by medicine name, composition, or condition..."
                className="w-full rounded-xl border border-slate-200 bg-white/95 pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
              onClick={getLocation}
              disabled={locationLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <Navigation size={18} />
              {locationLoading ? "Locating..." : "My Location"}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-500" />
              <label className="text-sm font-medium text-slate-700 mr-2">Search Radius:</label>
              <select
                value={filters.searchRadius}
                onChange={(e) =>
                  setFilters({ ...filters, searchRadius: parseInt(e.target.value) })
                }
                className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-2">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) =>
                  setFilters({ ...filters, inStock: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
              />
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm font-medium text-slate-700">In stock only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-full border border-slate-200 bg-white/80 px-3 py-2">
              <input
                type="checkbox"
                checked={filters.nearbyOnly}
                onChange={(e) =>
                  setFilters({ ...filters, nearbyOnly: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              <MapPin size={16} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Strict radius only</span>
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
        {(medicines.length > 0 || pharmacies.length > 0) && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Found {medicines.length} medicines and {pharmacies.length} pharmacies
            </h2>

            {medicines.length > 0 && (
              <>
                <h3 className="text-xl font-semibold text-gray-800">Medicines</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {medicines.map((medicine) => (
                <div
                  key={getMedicineRouteId(medicine)}
                  onClick={() => handleOpenDetail(medicine)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenDetail(medicine);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="mx-auto w-full max-w-xs rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)] relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {/* Favorite Heart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(medicine);
                    }}
                    disabled={togglingFav === (medicine.medicine || medicine.brandName)}
                    className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-pink-50 transition-colors z-10"
                    title={favoritedNames.has(medicine.medicine || medicine.brandName) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      size={20}
                      className={`transition-colors ${
                        favoritedNames.has(medicine.medicine || medicine.brandName)
                          ? "text-pink-500 fill-pink-500"
                          : "text-gray-300 hover:text-pink-400"
                      }`}
                    />
                  </button>

                  <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-[4/3]">
                    <MedicineImage
                      src={medicine?.imageUrl}
                      alt={medicine?.medicine || medicine?.brandName || "Medicine"}
                      className="object-cover"
                    />
                  </div>

                  {/* Medicine Name */}
                  <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                    {medicine.medicine || medicine.brandName}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                    {medicine.genericName && `Generic: ${medicine.genericName}`}
                  </p>

                  {/* Price & Availability */}
                  <div className="mt-3 mb-3 space-y-1.5 rounded-2xl bg-slate-50/90 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Price</span>
                      <span className="text-sm font-black text-blue-700">
                        {formatCurrency(medicine.price)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Stock</span>
                      <span className={`text-sm font-medium ${medicine.inStock ? 'text-green-600' : 'text-red-600'}`}>
                        {medicine.quantity > 0 ? `${medicine.quantity} available` : 'Out of stock'}
                      </span>
                    </div>
                  </div>

                  {/* Top Pharmacy */}
                  {medicine.pharmacy && (
                    <div
                      className="mb-3 rounded-2xl border border-slate-200 bg-white/80 p-3 cursor-pointer hover:bg-blue-50/80 transition-colors"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenStore(medicine?.pharmacy?.id);
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Available at</p>
                      <p
                        className="text-sm font-semibold text-gray-900 hover:text-blue-700 hover:underline underline-offset-2 leading-tight"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenStore(medicine?.pharmacy?.id);
                        }}
                      >
                        {medicine.pharmacy.name}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{medicine.pharmacy.address}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                          {medicine.distanceFormatted || (medicine.distance ? `${parseFloat(medicine.distance).toFixed(1)} km` : 'Distance unavailable')} away
                        </span>
                        <span className="text-[11px] font-medium text-blue-600 truncate">
                          {medicine.pharmacy.contactNumber}
                        </span>
                      </div>
                      {(medicine.pharmacy.averageRating > 0 || medicine.pharmacy.totalReviews > 0) && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <StarRating
                            rating={medicine.pharmacy.averageRating || 0}
                            totalReviews={medicine.pharmacy.totalReviews}
                            size={12}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Failsafe Warning */}
                  {medicine.failsafeNote && (
                    <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-700 flex items-start gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>{medicine.failsafeNote}</span>
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAddToCart(medicine);
                      }}
                      className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePlaceOrder(medicine);
                      }}
                      className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              ))}
                </div>
              </>
            )}

            {pharmacies.length > 0 && (
              <>
                <h3 className="text-xl font-semibold text-gray-800 mt-8">Pharmacies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pharmacies.map((pharmacy) => (
                    <button
                      key={pharmacy.id}
                      onClick={() => handleOpenStore(pharmacy.id)}
                      className="text-left rounded-2xl bg-white/90 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)] transition-shadow"
                    >
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{pharmacy.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{pharmacy.address}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 font-medium">
                          {pharmacy.distanceFormatted || "Distance unavailable"}
                        </span>
                        <span className="text-gray-500">
                          {pharmacy.medicinesInStock || 0} in stock
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader
              size={48}
              className="mx-auto text-blue-500 mb-4 animate-spin"
            />
            <p className="text-gray-600 font-medium mb-2">
              Searching for medicines near you...
            </p>
            <p className="text-sm text-gray-400">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && searchQuery && medicines.length === 0 && pharmacies.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-lg">
            <AlertCircle
              size={48}
              className="mx-auto text-gray-300 mb-4"
            />
            <p className="text-gray-700 font-semibold mb-2">
              No medicines found for "{searchQuery}"
            </p>
            <p className="text-sm text-gray-600 mb-6">
              This medicine might not be available in {selectedLocation?.name || "your area"}. Try:
              <br />
              • Searching by generic name (e.g., "Paracetamol" instead of "Cetamol")
              <br />
              • Selecting a different location
              <br />
              • Checking nearby pharmacies for available medicines
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setSearchQuery("")}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Clear Search
              </button>
              <button
                onClick={() => navigate("/nearby-pharmacies")}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
              >
                View All Pharmacies
              </button>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!loading && !searchQuery && medicines.length === 0 && pharmacies.length === 0 && (
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
