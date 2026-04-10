import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
  BadgeCheck,
  Baby,
  Bandage,
  CircleGauge,
  Clock3,
  Megaphone,
  HeartPulse,
  Leaf,
  LocateFixed,
  Pill,
  ShieldCheck,
  Store,
  Stethoscope,
  Syringe,
  Thermometer,
  Timer,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { useLocation as useLocationContext } from "../../../../context/LocationContext";
import { useCart } from "../../../../context/CartContext";
import { AnnouncementBanner } from "../../../../shared/components/AnnouncementBanner";
import StarRating from "../../../../shared/components/StarRating";
import patientService from "../../services/patient.service";
import contentService from "../../../../core/services/content.service";
import searchService from "../../../../core/services/search.service";
import heroVisual from "../../../../assets/do.jpg";
import network1 from "../../../../assets/save.jpg";
import network2 from "../../../../assets/medicine.jpg";
import network3 from "../../../../assets/i.jpg";
import network4 from "../../../../assets/ph.jpg";
import network5 from "../../../../assets/sa.jpg";
import network6 from "../../../../assets/image.png";

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDistance = (medicine) => {
  const value = medicine?.distanceFormatted || medicine?.distance;
  if (value === null || value === undefined || value === "") {
    return "Distance unavailable";
  }

  if (typeof value === "string") {
    return value.includes("away") ? value : `${value} away`;
  }

  const distance = Number(value);
  if (!Number.isFinite(distance)) return "Distance unavailable";
  if (distance < 1) return `${Math.max(1, Math.round(distance * 1000))}m away`;
  return `${distance.toFixed(1)}km away`;
};

const categoryItems = [
  {
    id: "fever",
    label: "Fever/Cold",
    icon: Thermometer,
    accent: "from-rose-500 to-orange-500",
  },
  {
    id: "chronic",
    label: "Chronic Care",
    icon: HeartPulse,
    accent: "from-blue-600 to-cyan-500",
  },
  {
    id: "baby",
    label: "Baby Care",
    icon: Baby,
    accent: "from-pink-500 to-fuchsia-500",
  },
  {
    id: "ayurvedic",
    label: "Ayurvedic",
    icon: Leaf,
    accent: "from-emerald-600 to-lime-500",
  },
  {
    id: "firstaid",
    label: "First Aid",
    icon: Bandage,
    accent: "from-red-600 to-rose-500",
  },
  {
    id: "surgical",
    label: "Surgical",
    icon: Syringe,
    accent: "from-violet-600 to-indigo-500",
  },
];

const promiseItems = [
  {
    title: "Live Medicine Search",
    description: "Search medicines across nearby pharmacies with real-time stock snapshots.",
    icon: BadgeCheck,
  },
  {
    title: "Nearby Pharmacy Finder",
    description: "See which pharmacy can fulfill your order near your current location.",
    icon: LocateFixed,
  },
  {
    title: "Emergency SOS",
    description: "Raise urgent medicine requests and track the response flow.",
    icon: Timer,
  },
  {
    title: "Secure Orders",
    description: "Add to cart, place orders, and keep checkout data protected.",
    icon: ShieldCheck,
  },
  {
    title: "Fast Support",
    description: "Move urgent medicine needs into SOS flow without waiting in long queues.",
    icon: Clock3,
  },
  {
    title: "Health Guidance",
    description: "See CMS health tips and practical guidance posted for patients.",
    icon: HeartPulse,
  },
  {
    title: "Safe Experience",
    description: "Work with verified partners and a consistent, protected patient flow.",
    icon: Stethoscope,
  },
];

const networkTiles = [
  { src: network1, alt: "Modern pharmacy interior" },
  { src: network2, alt: "Patient receiving guidance" },
  { src: network3, alt: "Medicine shelf network" },
  { src: network4, alt: "Digital healthcare support" },
  { src: network5, alt: "Verified partner ecosystem" },
  { src: network6, alt: "Community care in Nepal" },
];

function ActiveSOSCard({ sos, ttlMinutes, navigate }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const ttlMs = ttlMinutes * 60 * 1000;
    const created = new Date(sos.createdAt).getTime();
    const update = () => setRemaining(Math.max(0, created + ttlMs - Date.now()));

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sos.createdAt, ttlMinutes]);

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isLow = mins < 5;

  return (
    <button
      type="button"
      onClick={() => navigate(`/sos/${sos.id}`)}
      className={`mb-5 w-full rounded-2xl border px-5 py-4 text-left transition-all hover:shadow-lg ${
        isLow
          ? "border-red-300 bg-red-50/90 text-red-800"
          : "border-orange-200 bg-orange-50/90 text-orange-800"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">Active SOS Request</p>
          <p className="mt-1 text-sm">
            {sos.medicineName} - Qty {sos.quantity}
          </p>
        </div>
        <div className="font-mono text-2xl font-bold tabular-nums">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>
    </button>
  );
}

export function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedLocation } = useLocationContext();
  const { addToCart, clearCart, isPharmacyMismatchError } = useCart();

  const [activeCategory, setActiveCategory] = useState("all");
  const [topMedicines, setTopMedicines] = useState([]);
  const [medicinesLoading, setMedicinesLoading] = useState(true);
  const [healthTip, setHealthTip] = useState(null);
  const [tipLoading, setTipLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [activeSOS, setActiveSOS] = useState(null);
  const [sosTTL, setSosTTL] = useState(30);

  const districtLabel =
    selectedLocation?.district || selectedLocation?.name || "your district";

  useEffect(() => {
    const loadActiveSOS = async () => {
      try {
        const response = await patientService.getActiveSOS();
        setActiveSOS(response?.data?.activeSOS || null);
        setSosTTL(response?.data?.ttlMinutes || 30);
      } catch {
        setActiveSOS(null);
      }
    };

    loadActiveSOS();
  }, []);

  useEffect(() => {
    const loadHealthTip = async () => {
      try {
        setTipLoading(true);
        const response = await contentService.getLatestHealthTip();
        if (response?.success && response?.data) {
          setHealthTip(response.data);
          return;
        }
      } catch {
        // fallback below
      } finally {
        setTipLoading(false);
      }

      setHealthTip({
        title: "Hydration + Timing Improves Outcomes",
        content:
          "Take daily medicines at consistent times and maintain hydration. A steady routine improves response, especially for blood pressure and sugar control.",
        category: "Medication Routine",
      });
    };

    loadHealthTip();
  }, []);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const response = await contentService.getAnnouncements("PATIENT");
        const list = Array.isArray(response?.data) ? response.data : [];
        const sorted = [...list].sort(
          (a, b) => new Date(b.publishDate || b.createdAt || 0) - new Date(a.publishDate || a.createdAt || 0)
        );
        setAnnouncements(sorted.slice(0, 3));
      } catch {
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  useEffect(() => {
    const loadTopMedicines = async () => {
      try {
        setMedicinesLoading(true);
        const response = await searchService.getTopMedicines({
          lat: selectedLocation?.lat,
          lng: selectedLocation?.lng,
          limit: 8,
          category: activeCategory === "all" ? undefined : activeCategory,
        });

        setTopMedicines(Array.isArray(response?.data?.data) ? response.data.data : []);
      } catch {
        setTopMedicines([]);
      } finally {
        setMedicinesLoading(false);
      }
    };

    loadTopMedicines();
  }, [activeCategory, selectedLocation?.lat, selectedLocation?.lng]);

  const firstName = useMemo(() => {
    return user?.name?.split(" ")?.[0] || user?.email?.split("@")?.[0] || "Patient";
  }, [user?.email, user?.name]);

  const bestSellingPharmacies = useMemo(() => {
    const grouped = new Map();

    topMedicines.forEach((medicine) => {
      const pharmacy = medicine?.pharmacy;
      if (!pharmacy?.id) return;

      const key = String(pharmacy.id);
      const current = grouped.get(key) || {
        id: pharmacy.id,
        name: pharmacy.name || "Unknown Pharmacy",
        address: pharmacy.address || "Address unavailable",
        averageRating: Number(pharmacy.averageRating || 0),
        totalReviews: Number(pharmacy.totalReviews || 0),
        featuredMedicines: 0,
        distanceFormatted: formatDistance(medicine),
      };

      current.featuredMedicines += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .sort((a, b) => {
        if (b.featuredMedicines !== a.featuredMedicines) {
          return b.featuredMedicines - a.featuredMedicines;
        }
        return b.averageRating - a.averageRating;
      })
      .slice(0, 4);
  }, [topMedicines]);

  const handleAddToCart = async (medicine) => {
    try {
      await addToCart(medicine);
      toast.success("Added to cart");
    } catch (error) {
      if (!isPharmacyMismatchError(error)) {
        toast.error("Unable to add medicine right now");
        return;
      }

      const shouldReplace = window.confirm(
        "Your cart has items from another pharmacy. Clear cart and add this medicine instead?"
      );

      if (!shouldReplace) return;

      try {
        await clearCart();
        await addToCart(medicine);
        toast.success("Added to cart");
      } catch {
        toast.error("Unable to replace cart items right now");
      }
    }
  };

  const handleBuyNow = (medicine) => {
    const medicineId = String(medicine?.id || medicine?.medicine || "medicine");

    navigate("/patient/checkout", {
      state: {
        mode: "buy-now",
        items: [
          {
            id: medicineId,
            medicineId,
            pharmacyId: medicine?.pharmacy?.id || medicine?.pharmacyId || null,
            medicineName: medicine?.medicine || medicine?.name || "Medicine",
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

  return (
    <div className="min-h-screen bg-slate-50 py-4" style={{ fontFamily: "Nunito, Poppins, ui-sans-serif, system-ui" }}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnnouncementBanner targetRole="PATIENT" className="mb-4 rounded-2xl" />

        {activeSOS && <ActiveSOSCard sos={activeSOS} ttlMinutes={sosTTL} navigate={navigate} />}

        <section className="overflow-hidden rounded-[28px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-4 sm:p-6">
          <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
            <div className="order-2 lg:order-1 lg:col-span-3">
              <div className="mx-auto h-44 w-44 overflow-hidden rounded-full border-[6px] border-white/90 shadow-2xl sm:h-52 sm:w-52">
                <img src={heroVisual} alt="Healthcare essentials" className="h-full w-full object-cover" />
              </div>
            </div>

            <div className="order-3 text-white lg:order-2 lg:col-span-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/90">Your Health, Simplified</p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">YOUR HEALTH, PRIORITIZED.</h1>
              <p className="mt-2 text-sm text-white/90 sm:text-base">
                Real-time medicine access across Nepal for {districtLabel}. Welcome back, {firstName}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/medicine-search")}
                  className="rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
                >
                  Explore Medicines
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/sos")}
                  className="rounded-full border border-white/70 bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800"
                >
                  Emergency SOS
                </button>
              </div>
            </div>

            <div className="order-1 grid grid-cols-3 gap-2 lg:order-3 lg:col-span-3 lg:grid-cols-2">
              {networkTiles.map((tile) => (
                <div
                  key={tile.src}
                  className="overflow-hidden rounded-xl border-2 border-white/70 bg-white/20 shadow-md"
                >
                  <img src={tile.src} alt={tile.alt} className="h-16 w-full object-cover sm:h-20" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="-mt-3 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Medication Types</h2>
              <p className="text-sm font-semibold text-slate-600">Choose a type to filter nearby bestsellers.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-black uppercase ${
                activeCategory === "all"
                  ? "bg-blue-700 text-white"
                  : "bg-blue-100 text-slate-900"
              }`}
            >
              All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categoryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveCategory(item.id)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    isActive
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <span
                    className={`mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${item.accent} text-white shadow`}
                  >
                    <Icon size={18} />
                  </span>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-900">{item.label}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Bestsellers Near You</h2>
              <p className="text-sm font-semibold text-slate-600">Frequently needed in {districtLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/medicine-search")}
              className="rounded-full bg-blue-700 px-5 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-blue-800"
            >
              View All
            </button>
          </div>

          {medicinesLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : topMedicines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-bold text-slate-900">No medicine records were found for this category nearby.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {topMedicines.slice(0, 8).map((medicine) => (
                <article
                  key={medicine.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={medicine?.imageUrl || heroVisual} alt={medicine.medicine} className="h-28 w-full object-cover" />
                  </div>

                  <h3 className="text-sm font-black text-slate-900 line-clamp-2">{medicine.medicine}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500 line-clamp-1">
                    {medicine.genericName || "Generic data unavailable"}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">{formatCurrency(medicine.price)}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-slate-900">
                      {formatDistance(medicine)}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] font-semibold text-slate-600 line-clamp-1">
                    {medicine?.pharmacy?.name || "Unknown Pharmacy"}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(medicine)}
                      className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-blue-800"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBuyNow(medicine)}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-slate-900 transition-colors hover:bg-blue-100"
                    >
                      Buy
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Best Selling Pharmacies</h2>
              <p className="text-sm font-semibold text-slate-600">Pharmacies showing the strongest nearby medicine demand.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/nearby-pharmacies")}
              className="rounded-full bg-blue-700 px-5 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-blue-800"
            >
              View All
            </button>
          </div>

          {bestSellingPharmacies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-bold text-slate-900">Pharmacy rankings will appear once nearby stock data is available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {bestSellingPharmacies.map((pharmacy) => (
                <button
                  key={pharmacy.id}
                  type="button"
                  onClick={() => navigate(`/patient/pharmacy/${encodeURIComponent(pharmacy.id)}`)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                >
                  <p className="line-clamp-1 text-sm font-black text-slate-900">{pharmacy.name}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-500">{pharmacy.address}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      {pharmacy.featuredMedicines} top medicines
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">{pharmacy.distanceFormatted}</span>
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <StarRating rating={pharmacy.averageRating || 0} totalReviews={pharmacy.totalReviews || 0} size={12} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-4xl font-black text-slate-900">Our Promises</h2>
          <p className="text-sm font-semibold text-slate-600">What the project provides for patients, pharmacies, and urgent requests.</p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {promiseItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-slate-900">
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-900">{item.title}</p>
                          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Megaphone size={17} className="text-blue-700" />
                  <h3 className="text-lg font-black text-slate-900">Notice with Care</h3>
                </div>
                <p className="mb-3 text-sm font-semibold text-slate-600">
                  CMS notices and admin announcements posted for patients will appear here.
                </p>

                <div className="mb-4 rounded-xl border border-blue-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">Latest Health Tip</p>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                      CMS Tip
                    </span>
                  </div>
                  {tipLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded bg-blue-100" />
                      <div className="h-4 w-5/6 animate-pulse rounded bg-blue-100" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-blue-100" />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {healthTip?.category || "Health Tip"}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">
                        {healthTip?.title || "Daily care reminder"}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {healthTip?.content || "CMS health guidance will appear here when published by the admin team."}
                      </p>
                    </>
                  )}
                </div>

                {announcementsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                    ))}
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-600">No CMS notices or admin announcements have been posted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-black text-slate-900">{announcement.title}</p>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                            {announcement.priority || "normal"}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs font-semibold text-slate-600">{announcement.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-blue-700 px-5 py-3 text-center text-white shadow-lg">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide sm:text-sm">
            <Stethoscope size={14} />
            <span>District-aware medicine visibility</span>
            <span className="opacity-60">|</span>
            <CircleGauge size={14} />
            <span>Live stock snapshots</span>
            <span className="opacity-60">|</span>
            <Clock3 size={14} />
            <span>Emergency workflow continuity</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PatientDashboard;


