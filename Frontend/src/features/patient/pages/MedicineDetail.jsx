import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CircleDollarSign,
  ShoppingCart,
  Truck,
  AlertTriangle,
  ShieldAlert,
  Ban,
  Pill,
  Clock3,
  Route,
  Building2,
  CalendarDays,
  PackageSearch,
  Phone,
} from "lucide-react";
import { useCart } from "../../../context/CartContext";
import StarRating from "../../../shared/components/StarRating";
import searchService from "../../../core/services/search.service";

const formatCurrency = (price) =>
  `Rs. ${Number(price || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatExpiryDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatRoute = (value) => {
  if (!value) return "Not specified";
  return value === "TOPICAL" ? "Topical" : "Oral";
};

const formatTiming = (value) => {
  if (!value) return "Not specified";
  return value === "BEFORE_FOOD" ? "Before food" : "After food";
};

const splitTextAsBullets = (value) => {
  if (!value) return ["Not provided"];
  const normalized = String(value).replace(/\r/g, "\n").trim();
  if (!normalized) return ["Not provided"];

  const byLine = normalized
    .split(/\n|\.|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  return byLine.length > 0 ? byLine : [normalized];
};

export default function MedicineDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { addToCart, clearCart, isPharmacyMismatchError } = useCart();

  const [similarSubstitutes, setSimilarSubstitutes] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

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
  const medicineName = medicine?.medicine || medicine?.brandName || medicine?.name || "Medicine";

  const persistMedicineSnapshot = (item) => {
    try {
      const routeId = String(item?.id || item?.medicine || item?.name || "medicine");
      sessionStorage.setItem(`medicine_detail_${routeId}`, JSON.stringify(item));
    } catch {
      // Ignore storage failures
    }
  };

  useEffect(() => {
    const loadAlternatives = async () => {
      if (!medicine?.genericName && !medicineName) {
        setSimilarSubstitutes([]);
        return;
      }

      try {
        setLoadingAlternatives(true);
        const lat = Number(medicine?.pharmacy?.location?.lat);
        const lng = Number(medicine?.pharmacy?.location?.lng);

        const response = await searchService.searchMedicines(
          medicine?.genericName || medicineName,
          Number.isFinite(lat) ? lat : undefined,
          Number.isFinite(lng) ? lng : undefined,
          {
            includeOutOfStock: true,
            maxDistance: 80,
            limit: 12,
          }
        );

        const data = response?.data?.data || [];
        const normalized = Array.isArray(data) ? data : [];

        const alternatives = normalized
          .filter((item) => String(item?.id || "") !== medicineId)
          .slice(0, 10);

        setSimilarSubstitutes(alternatives);
      } catch {
        setSimilarSubstitutes([]);
      } finally {
        setLoadingAlternatives(false);
      }
    };

    loadAlternatives();
  }, [medicine?.genericName, medicine?.pharmacy?.location?.lat, medicine?.pharmacy?.location?.lng, medicineId, medicineName]);

  const handleAddToCart = async (item = medicine) => {
    if (!item) return;

    try {
      await addToCart(item);
      persistMedicineSnapshot(item);
      toast.success("Added to cart");
    } catch (error) {
      if (isPharmacyMismatchError(error)) {
        const shouldReplace = window.confirm(
          "Your cart has items from another pharmacy. Clear cart and add this medicine instead?"
        );

        if (!shouldReplace) return;

        try {
          await clearCart();
          await addToCart(item);
          persistMedicineSnapshot(item);
          toast.success("Added to cart");
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

  const handleOpenAlternative = (item) => {
    const routeId = String(item?.id || item?.medicine || item?.name || "medicine");
    persistMedicineSnapshot(item);
    navigate(`/patient/medicine/${encodeURIComponent(routeId)}`, { state: { medicine: item } });
  };

  if (!medicine) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <p className="mt-2 text-slate-600">Please return to search and open this medicine again.</p>
          </div>
        </div>
      </div>
    );
  }

  const sideEffects = splitTextAsBullets(medicine?.sideEffects);
  const contraindications = splitTextAsBullets(medicine?.contraindications);
  const warnings = splitTextAsBullets(medicine?.warnings);

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Search
        </button>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-700 font-semibold">Section 1 · Hero Card</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">{medicineName}</h1>
              <p className="text-slate-600 mt-2 text-lg">Generic Name: {medicine?.genericName || "N/A"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold">
                  <CircleDollarSign size={16} />
                  {formatCurrency(medicine?.price)}
                </span>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold border ${
                    medicine?.isPrescriptionRequired
                      ? "bg-red-50 text-red-700 border-red-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-300"
                  }`}
                >
                  <ShieldAlert size={16} />
                  {medicine?.isPrescriptionRequired ? "Prescription Required" : "OTC / No Prescription"}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAddToCart(medicine)}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors inline-flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                Add to Cart
              </button>
              <button
                onClick={handlePlaceOrder}
                className="px-6 py-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-semibold transition-colors inline-flex items-center justify-center gap-2"
              >
                <Truck size={18} />
                Buy Now
              </button>
            </div>
          </div>
        </section>

        <section className="bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold">Section 2 · Safety Center</p>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <article className="rounded-xl border border-red-300 bg-white p-4">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <AlertTriangle size={16} />
                Side Effects
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {sideEffects.map((effect) => (
                  <li key={effect} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span>{effect}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-red-400 bg-white p-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold">
                <Ban size={16} />
                Contraindications
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {contraindications.map((warning) => (
                  <li key={warning} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-600" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-amber-400 bg-white p-4">
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <ShieldAlert size={16} />
                Clinical Warnings
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {warnings.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="bg-white border border-blue-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold">Section 3 · Usage Guide</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-sm text-slate-500">Step 1</p>
              <p className="mt-1 font-semibold text-slate-900 inline-flex items-center gap-2">
                <Route size={16} className="text-blue-600" />
                Route: {formatRoute(medicine?.route)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-sm text-slate-500">Step 2</p>
              <p className="mt-1 font-semibold text-slate-900 inline-flex items-center gap-2">
                <Clock3 size={16} className="text-blue-600" />
                Timing: {formatTiming(medicine?.timing)}
              </p>
            </div>
            <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-sm text-slate-500">Step 3</p>
              <p className="mt-1 font-semibold text-slate-900">Dosage Instructions</p>
              <p className="mt-2 text-slate-700 text-sm whitespace-pre-line">
                {medicine?.dosageInstructions || "Dosage guidance not provided. Please consult a pharmacist before use."}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-purple-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-purple-700 font-semibold">Section 4 · Product Specs</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Strength</p>
              <p className="mt-1 text-slate-900 font-semibold">{medicine?.strength || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Form</p>
              <p className="mt-1 text-slate-900 font-semibold">{medicine?.form || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Manufacturer</p>
              <p className="mt-1 text-slate-900 font-semibold inline-flex items-center gap-2">
                <Building2 size={15} className="text-purple-600" />
                {medicine?.manufacturer || "N/A"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Batch Number</p>
              <p className="mt-1 text-slate-900 font-semibold">{medicine?.batchNumber || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Expiry</p>
              <p className="mt-1 text-slate-900 font-semibold inline-flex items-center gap-2">
                <CalendarDays size={15} className="text-purple-600" />
                {formatExpiryDate(medicine?.expiryDate || medicine?.expiry)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Available Stock</p>
              <p className="mt-1 text-slate-900 font-semibold">{medicine?.quantity ?? "N/A"}</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-orange-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-orange-700 font-semibold">Section 5 · Social & Alternatives</p>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <article className="lg:col-span-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Pharmacy Reviews</h3>
              <p className="mt-1 text-sm text-slate-600">{medicine?.pharmacy?.name || "Unknown Pharmacy"}</p>
              <div className="mt-3">
                <StarRating
                  rating={medicine?.pharmacy?.averageRating || 0}
                  totalReviews={medicine?.pharmacy?.totalReviews || 0}
                  size={15}
                />
              </div>
              {medicine?.pharmacy?.contactNumber && (
                <a
                  href={`tel:${medicine.pharmacy.contactNumber}`}
                  className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  <Phone size={16} />
                  Call Pharmacy
                </a>
              )}
            </article>

            <article className="lg:col-span-2 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
                  <PackageSearch size={18} className="text-orange-600" />
                  Similar Substitutes
                </h3>
              </div>

              {loadingAlternatives ? (
                <p className="mt-4 text-sm text-slate-500">Loading alternatives...</p>
              ) : similarSubstitutes.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No similar substitutes found nearby.</p>
              ) : (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {similarSubstitutes.map((item) => (
                    <div
                      key={String(item?.id || item?.medicine || item?.name)}
                      className="min-w-[220px] max-w-[220px] rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="font-semibold text-slate-900 line-clamp-2">{item?.medicine || item?.name}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item?.genericName || "N/A"}</p>
                      <p className="text-sm text-blue-700 font-bold mt-2">{formatCurrency(item?.price)}</p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{item?.pharmacy?.name || "Unknown Pharmacy"}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAlternative(item)}
                          className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-300 hover:bg-white transition-colors"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="flex-1 px-3 py-2 text-xs rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
