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
  Phone,
} from "lucide-react";
import { useCart } from "../../../context/CartContext";
import StarRating from "../../../shared/components/StarRating";
import searchService from "../../../core/services/search.service";
import MedicineImage from "../../../shared/components/ui/MedicineImage";

const formatCurrency = (price) =>
  `Rs. ${Number(price || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDistance = (medicine) => {
  const distance = medicine?.distanceFormatted || medicine?.distance || medicine?.pharmacy?.distance;
  if (distance === undefined || distance === null || distance === "") return "Distance unavailable";

  if (typeof distance === "string") {
    return distance.includes("km") || distance.includes("m") ? distance : `${distance} away`;
  }

  const numericDistance = Number(distance);
  if (!Number.isFinite(numericDistance)) return "Distance unavailable";
  return numericDistance < 1
    ? `${Math.max(1, Math.round(numericDistance * 1000))}m away`
    : `${numericDistance.toFixed(1)}km away`;
};

const getDirectionsUrl = (medicine) => {
  const lat = medicine?.pharmacy?.location?.lat;
  const lng = medicine?.pharmacy?.location?.lng;

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};

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
  const { addToCart } = useCart();

  const [resolvedMedicine, setResolvedMedicine] = useState(null);

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

  const hasFullDetails = (item) =>
    Boolean(
      item &&
      item.sideEffects !== undefined &&
      item.contraindications !== undefined &&
      item.warnings !== undefined &&
      item.dosageInstructions !== undefined &&
      item.strength !== undefined &&
      item.form !== undefined &&
      item.manufacturer !== undefined &&
      item.batchNumber !== undefined &&
      item.expiryDate !== undefined
    );

  useEffect(() => {
    setResolvedMedicine(medicine);
  }, [medicine]);

  const activeMedicine = resolvedMedicine || medicine;

  const medicineId = String(activeMedicine?.id || id || "");
  const medicineName = activeMedicine?.medicine || activeMedicine?.brandName || activeMedicine?.name || "Medicine";

  const persistMedicineSnapshot = (item) => {
    try {
      const routeId = String(item?.id || item?.medicine || item?.name || "medicine");
      sessionStorage.setItem(`medicine_detail_${routeId}`, JSON.stringify(item));
    } catch {
      // Ignore storage failures
    }
  };

  useEffect(() => {
    const hydrateMedicine = async () => {
      if (!medicine || hasFullDetails(medicine)) return;

      try {
        const lat = Number(activeMedicine?.pharmacy?.location?.lat);
        const lng = Number(activeMedicine?.pharmacy?.location?.lng);
        const response = await searchService.searchMedicines(
          activeMedicine?.genericName || activeMedicine?.medicine || activeMedicine?.brandName || activeMedicine?.name || "",
          Number.isFinite(lat) ? lat : undefined,
          Number.isFinite(lng) ? lng : undefined,
          {
            includeOutOfStock: true,
            maxDistance: 80,
            limit: 20,
          }
        );

        const data = response?.data?.data || [];
        const normalized = Array.isArray(data) ? data : [];
        const matched =
          normalized.find((item) => String(item?.id) === String(activeMedicine?.id)) ||
          normalized[0] ||
          null;

        if (matched) {
          setResolvedMedicine(matched);
          persistMedicineSnapshot(matched);
        }
      } catch {
        // keep cached version
      }
    };

    hydrateMedicine();
  }, [medicine]);

  const handleAddToCart = async (item = activeMedicine) => {
    if (!item) return;

    try {
      await addToCart(item);
      persistMedicineSnapshot(item);
      toast.success("Added to cart");
    } catch {
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
            pharmacyId: activeMedicine?.pharmacy?.id || activeMedicine?.pharmacyId || null,
            medicineName,
            genericName: activeMedicine?.genericName || null,
            imageUrl: activeMedicine?.imageUrl || null,
            quantity: 1,
            price: Number(activeMedicine?.price || 0),
            pharmacyName: activeMedicine?.pharmacy?.name || "Unknown Pharmacy",
            pharmacyAddress: activeMedicine?.pharmacy?.address || null,
            pharmacyContact: activeMedicine?.pharmacy?.contactNumber || null,
          },
        ],
      },
    });
  };

  if (!activeMedicine) {
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

  const sideEffects = splitTextAsBullets(activeMedicine?.sideEffects);
  const contraindications = splitTextAsBullets(activeMedicine?.contraindications);
  const warnings = splitTextAsBullets(activeMedicine?.warnings);
  const directionsUrl = getDirectionsUrl(activeMedicine);
  const pharmacyPhone = activeMedicine?.pharmacy?.contactNumber;
  const pharmacyRating = activeMedicine?.pharmacy?.averageRating || 0;
  const pharmacyReviews = activeMedicine?.pharmacy?.totalReviews || 0;

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

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-3">
              <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-[4/3] lg:aspect-auto lg:min-h-[220px]">
                <MedicineImage src={activeMedicine?.imageUrl} alt={medicineName} className="object-cover" />
              </div>
            </div>

            <div className="lg:col-span-9 flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{medicineName}</h1>
                  <p className="text-sm text-slate-600">Generic Name: {activeMedicine?.genericName || "N/A"}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                      <CircleDollarSign size={16} />
                      {formatCurrency(activeMedicine?.price)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                        activeMedicine?.isPrescriptionRequired
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <ShieldAlert size={14} />
                      {activeMedicine?.isPrescriptionRequired ? "Prescription Required" : "OTC / No Prescription"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAddToCart(activeMedicine)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Truck size={16} />
                    Buy Now
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Pharmacy Info</p>
                    <p className="text-sm font-semibold text-slate-900">{activeMedicine?.pharmacy?.name || "Unknown Pharmacy"}</p>
                    <p className="text-xs text-slate-600">{activeMedicine?.pharmacy?.address || "Address unavailable"}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <StarRating rating={pharmacyRating} totalReviews={pharmacyReviews} size={14} />
                      <span className="text-xs text-slate-500">{pharmacyReviews > 0 ? `${pharmacyReviews} reviews` : "No reviews yet"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                      {formatDistance(activeMedicine)}
                    </span>
                    {pharmacyPhone && (
                      <a
                        href={`tel:${pharmacyPhone}`}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                      >
                        <Phone size={14} />
                        Call Now
                      </a>
                    )}
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
                      >
                        <Route size={14} />
                        Directions
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold">Safety center</p>
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
          <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold">Usage guide</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-sm text-slate-500">Step 1</p>
              <p className="mt-1 font-semibold text-slate-900 inline-flex items-center gap-2">
                <Route size={16} className="text-blue-600" />
                Route: {formatRoute(activeMedicine?.route)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-sm text-slate-500">Step 2</p>
              <p className="mt-1 font-semibold text-slate-900 inline-flex items-center gap-2">
                <Clock3 size={16} className="text-blue-600" />
                Timing: {formatTiming(activeMedicine?.timing)}
              </p>
            </div>
            <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-sm text-slate-500">Step 3</p>
              <p className="mt-1 font-semibold text-slate-900">Dosage Instructions</p>
              <p className="mt-2 text-slate-700 text-sm whitespace-pre-line">
                {activeMedicine?.dosageInstructions || "Dosage guidance not provided. Please consult a pharmacist before use."}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-purple-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-purple-700 font-semibold">Product specs</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Strength</p>
              <p className="mt-1 text-slate-900 font-semibold">{activeMedicine?.strength || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Form</p>
              <p className="mt-1 text-slate-900 font-semibold">{activeMedicine?.form || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Manufacturer</p>
              <p className="mt-1 text-slate-900 font-semibold inline-flex items-center gap-2">
                <Building2 size={15} className="text-purple-600" />
                {activeMedicine?.manufacturer || "N/A"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Batch Number</p>
              <p className="mt-1 text-slate-900 font-semibold">{activeMedicine?.batchNumber || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Expiry</p>
              <p className="mt-1 text-slate-900 font-semibold inline-flex items-center gap-2">
                <CalendarDays size={15} className="text-purple-600" />
                {formatExpiryDate(activeMedicine?.expiryDate || activeMedicine?.expiry)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase">Available Stock</p>
              <p className="mt-1 text-slate-900 font-semibold">{activeMedicine?.quantity ?? "N/A"}</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
