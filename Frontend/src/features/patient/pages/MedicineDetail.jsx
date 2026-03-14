import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Phone,
  CheckCircle2,
  CircleDollarSign,
  Pill,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import { MapContainer as LeafletMap, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useCart } from "../../../context/CartContext";
import StarRating from "../../../shared/components/StarRating";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const pharmacyBlueIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#2563EB" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const formatCurrency = (price) => `Rs. ${Number(price || 0).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatExpiryDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function MedicineDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { addToCart, clearCart, isPharmacyMismatchError } = useCart();

  const medicine = useMemo(() => {
    if (location.state?.medicine) {
      return location.state.medicine;
    }

    try {
      const cached = sessionStorage.getItem(`medicine_detail_${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, [id, location.state]);

  const medicineId = String(medicine?.id || id || "");
  const medicineName = medicine?.medicine || medicine?.brandName || "Medicine";
  const pharmacyLat = Number(medicine?.pharmacy?.location?.lat);
  const pharmacyLng = Number(medicine?.pharmacy?.location?.lng);
  const hasPharmacyCoordinates = Number.isFinite(pharmacyLat) && Number.isFinite(pharmacyLng);
  const mapCenter = hasPharmacyCoordinates ? [pharmacyLat, pharmacyLng] : [27.7172, 85.3240];

  const handleAddToCart = async () => {
    if (!medicine) return;
    try {
      await addToCart(medicine);
      toast.success("✅ Added to cart!");
    } catch (error) {
      if (isPharmacyMismatchError(error)) {
        const shouldReplace = window.confirm(
          "Your cart has items from another pharmacy. Clear cart and add this medicine instead?"
        );

        if (!shouldReplace) return;

        try {
          await clearCart();
          await addToCart(medicine);
          toast.success("✅ Added to cart!");
          return;
        } catch {
          toast.error("Unable to replace cart items right now");
          return;
        }
      }
      toast.error("Failed to add item to cart");
    }
  };

  const handlePlaceOrder = () => {
    navigate("/patient/checkout", {
      state: {
        mode: "buy-now",
        items: [
          {
            id: medicineId,
            medicineId,
            pharmacyId: medicine?.pharmacy?.id || medicine?.pharmacyId || null,
            medicineName,
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

  if (!medicine) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Search
          </button>

          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <Pill size={36} className="mx-auto text-slate-300 mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">Medicine details unavailable</h1>
            <p className="mt-2 text-slate-600">
              Please return to medicine search and open this item again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inStock = medicine?.quantity > 0 && medicine?.inStock;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Search
        </button>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm max-h-[calc(100vh-140px)] overflow-y-auto">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Medicine Detail</p>
                  <h1 className="text-3xl font-bold text-slate-900 mt-2">{medicineName}</h1>
                  <p className="text-slate-600 mt-1">Generic: {medicine?.genericName || "N/A"}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-slate-700">
                    <CircleDollarSign size={18} className="text-blue-600" />
                    <span className="font-medium">Price</span>
                  </div>
                  <span className="font-bold text-blue-700 text-lg">{formatCurrency(medicine?.price)}</span>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-slate-700">
                    <CalendarDays size={18} className="text-amber-600" />
                    <span className="font-medium">Expiry Date</span>
                  </div>
                  <span className="font-semibold text-slate-900">{formatExpiryDate(medicine?.expiryDate || medicine?.expiry)}</span>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                  <span className="font-medium text-slate-700">Stock Status</span>
                  <span className={`inline-flex items-center gap-2 font-semibold ${inStock ? "text-emerald-600" : "text-rose-600"}`}>
                    {inStock ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {inStock ? `${medicine?.quantity} available` : "Out of stock"}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Pharmacy Details</h2>
                <p className="mt-3 text-slate-800 font-medium">{medicine?.pharmacy?.name || "Unknown Pharmacy"}</p>
                <p className="mt-1 text-sm text-slate-600">{medicine?.pharmacy?.address || "Address not available"}</p>

                {(medicine?.pharmacy?.averageRating > 0 || medicine?.pharmacy?.totalReviews > 0) && (
                  <div className="mt-3">
                    <StarRating
                      rating={medicine.pharmacy.averageRating || 0}
                      totalReviews={medicine.pharmacy.totalReviews}
                      size={14}
                    />
                  </div>
                )}

                {medicine?.pharmacy?.contactNumber && (
                  <a
                    href={`tel:${medicine.pharmacy.contactNumber}`}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Phone size={16} />
                    Call Now
                  </a>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-colors inline-flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} />
                Add to Cart
              </button>
              <button
                onClick={handlePlaceOrder}
                className="flex-1 px-6 py-4 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-semibold text-base transition-colors inline-flex items-center justify-center gap-2"
              >
                <Truck size={20} />
                Place Order
              </button>
            </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 h-[calc(100vh-140px)]">
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm h-full overflow-hidden">
              <div className="h-full w-full">
                <LeafletMap center={mapCenter} zoom={hasPharmacyCoordinates ? 14 : 7} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {hasPharmacyCoordinates && (
                    <Marker position={[pharmacyLat, pharmacyLng]} icon={pharmacyBlueIcon}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold text-slate-900">{medicine?.pharmacy?.name || "Pharmacy"}</p>
                          <p className="text-slate-600 mt-1 inline-flex items-start gap-1">
                            <MapPin size={14} className="mt-0.5" />
                            <span>{medicine?.pharmacy?.address || "Address unavailable"}</span>
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </LeafletMap>
                {!hasPharmacyCoordinates && (
                  <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur border-t border-slate-200 p-3 text-xs text-slate-600 text-center">
                    Pharmacy coordinates are unavailable. Showing Nepal map center.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
