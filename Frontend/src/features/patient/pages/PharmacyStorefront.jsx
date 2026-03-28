import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  MapPin,
  PackageOpen,
  AlertCircle,
  Navigation,
  CalendarDays,
} from "lucide-react";
import { MapContainer as LeafletMap, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import StarRating from "../../../shared/components/StarRating";
import { useCart } from "../../../context/CartContext";
import { getPharmacyInventory } from "../../../core/services/pharmacy.service";

const formatCurrency = (price) =>
  `Rs. ${Number(price || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatExpiryDate = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-NP", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function PharmacyStorefront() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToCart, clearCart, isPharmacyMismatchError } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [pharmacy, setPharmacy] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const loadInventory = async () => {
      const storeId = String(id || "").trim();
      if (!storeId) {
        setError("Invalid pharmacy id in route.");
        setLoading(false);
        return;
      }

      console.log("Fetching store:", storeId);
      setLoading(true);
      setError("");
      setStoreNotFound(false);

      try {
        const res = await getPharmacyInventory(storeId);
        console.log("Store data received:", res);

        const payload = res?.data || {};
        setPharmacy(payload?.pharmacy || res?.pharmacy || null);

        const medicinesData =
          payload?.items ||
          payload?.medicines ||
          (Array.isArray(payload) ? payload : []) ||
          (Array.isArray(res?.data?.data) ? res.data.data : []);

        setMedicines(Array.isArray(medicinesData) ? medicinesData : []);
      } catch (err) {
        if (err?.response?.status === 404) {
          setStoreNotFound(true);
        } else {
          setError(err?.response?.data?.message || err?.message || "Failed to load pharmacy storefront");
        }
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, [id]);

  const filteredMedicines = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter((item) => {
      return (
        String(item?.name || "").toLowerCase().includes(q) ||
        String(item?.genericName || "").toLowerCase().includes(q) ||
        String(item?.strength || "").toLowerCase().includes(q)
      );
    });
  }, [medicines, searchText]);

  const mapCenter = useMemo(() => {
    const lat = Number(pharmacy?.location?.lat);
    const lng = Number(pharmacy?.location?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return [27.7172, 85.324];
  }, [pharmacy?.location?.lat, pharmacy?.location?.lng]);

  const getDirectionsUrl = () => {
    const lat = Number(pharmacy?.location?.lat);
    const lng = Number(pharmacy?.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "https://maps.google.com";
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  const toCartMedicineShape = (item) => ({
    id: item.id,
    medicine: item.name,
    genericName: item.genericName,
    price: item.price,
    quantity: item.quantity,
    inStock: item.quantity > 0,
    expiryDate: item.expiryDate,
    sideEffects: item.sideEffects,
    contraindications: item.contraindications,
    warnings: item.warnings,
    isPrescriptionRequired: item.isPrescriptionRequired,
    dosageInstructions: item.dosageInstructions,
    route: item.route,
    timing: item.timing,
    strength: item.strength,
    form: item.form,
    manufacturer: item.manufacturer,
    batchNumber: item.batchNumber,
    pharmacy: {
      id: pharmacy?.id,
      name: pharmacy?.name,
      address: pharmacy?.address,
      contactNumber: pharmacy?.contactNumber,
      location: {
        lat: pharmacy?.location?.lat,
        lng: pharmacy?.location?.lng,
      },
      averageRating: pharmacy?.averageRating || 0,
      totalReviews: pharmacy?.totalReviews || 0,
    },
  });

  const handleOpenMedicineDetail = (item) => {
    const medicinePayload = toCartMedicineShape(item);
    navigate(`/patient/medicine/${encodeURIComponent(item.id)}`, {
      state: { medicine: medicinePayload },
    });
  };

  const handleAddToCart = async (item) => {
    const payload = toCartMedicineShape(item);
    try {
      await addToCart(payload);
      toast.success("Added to cart");
    } catch (err) {
      if (isPharmacyMismatchError(err)) {
        const shouldReplace = window.confirm(
          "Your cart has items from another pharmacy. Clear cart and add this medicine instead?"
        );
        if (!shouldReplace) return;

        try {
          await clearCart();
          await addToCart(payload);
          toast.success("Added to cart");
        } catch {
          toast.error("Unable to replace cart items right now");
        }
        return;
      }
      toast.error("Failed to add item to cart");
    }
  };

  const handlePlaceOrder = (item) => {
    navigate("/patient/checkout", {
      state: {
        mode: "buy-now",
        items: [
          {
            id: item.id,
            medicineId: item.id,
            pharmacyId: pharmacy?.id || null,
            medicineName: item.name,
            genericName: item.genericName || null,
            quantity: 1,
            price: Number(item.price || 0),
            pharmacyName: pharmacy?.name || "Unknown Pharmacy",
            pharmacyAddress: pharmacy?.address || null,
            pharmacyContact: pharmacy?.contactNumber || null,
          },
        ],
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 px-4">
        <div className="max-w-7xl mx-auto text-center text-slate-600">Loading pharmacy storefront...</div>
      </div>
    );
  }

  if (storeNotFound) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle className="mx-auto text-rose-500" size={40} />
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Store Not Found</h1>
          <p className="mt-2 text-slate-600">
            This pharmacy does not exist or is not publicly available right now.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={() => navigate("/nearby-pharmacies")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Go back to map
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Nearby Pharmacies
          </button>
        </div>

        <section className="mt-4 bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <p className="text-xs tracking-widest uppercase text-slate-500">Pharmacy Storefront</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900">{pharmacy?.name || "Pharmacy"}</h1>
              <p className="mt-2 text-slate-600 inline-flex items-start gap-2">
                <MapPin size={16} className="mt-1" />
                <span>{pharmacy?.address || "Address not available"}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700 text-sm font-semibold">
                  <ShieldCheck size={14} />
                  Verified
                </span>
                <StarRating
                  rating={pharmacy?.averageRating || 0}
                  totalReviews={pharmacy?.totalReviews || 0}
                  size={14}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {pharmacy?.contactNumber && (
                <a
                  href={`tel:${pharmacy.contactNumber}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 font-semibold text-white transition-colors"
                >
                  <Phone size={18} />
                  Call Now
                </a>
              )}
              <a
                href={getDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-5 py-3 font-semibold text-blue-700 transition-colors"
              >
                <Navigation size={18} />
                Directions
              </a>
            </div>
          </div>
        </section>

        <section className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-72 w-full">
            <LeafletMap center={mapCenter} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={mapCenter}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">{pharmacy?.name}</p>
                    <p className="text-slate-600 mt-1">{pharmacy?.address}</p>
                  </div>
                </Popup>
              </Marker>
            </LeafletMap>
          </div>
        </section>

        <section className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Medicine Catalog</h2>
            <div className="relative w-full sm:w-96">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search medicines in this store..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {filteredMedicines.length === 0 ? (
            <div className="mt-8 py-12 text-center rounded-xl border border-slate-200 bg-slate-50">
              <PackageOpen size={44} className="mx-auto text-slate-300" />
              <p className="mt-3 text-lg font-semibold text-slate-800">
                This pharmacy currently has no medicines listed.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Please check back later or try another nearby pharmacy.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedicines.map((item) => {
                const inStock = Number(item?.quantity || 0) > 0;
                return (
                  <article
                    key={item.id}
                    onClick={() => handleOpenMedicineDetail(item)}
                    className="rounded-2xl border border-slate-200 p-4 bg-slate-50 hover:bg-white shadow-sm transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.name}</h3>
                        <p className="text-sm text-slate-600 mt-1">{item.genericName || "N/A"}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${
                          inStock
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {inStock ? `In Stock (${item.quantity})` : "Out of Stock"}
                      </span>
                    </div>

                    <p className="mt-3 text-blue-700 font-bold text-lg">{formatCurrency(item.price)}</p>
                    <p className="mt-2 text-sm text-slate-600 inline-flex items-center gap-2">
                      <CalendarDays size={15} className="text-slate-500" />
                      Expiry: {formatExpiryDate(item.expiryDate)}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddToCart(item);
                        }}
                        disabled={!inStock}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ShoppingCart size={16} />
                        Add to Cart
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePlaceOrder(item);
                        }}
                        disabled={!inStock}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Truck size={16} />
                        Order
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
