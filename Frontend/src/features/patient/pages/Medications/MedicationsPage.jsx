import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import patientService from "../../services/patient.service";
import {
  Pill,
  Search,
  Calendar,
  AlertCircle,
  ShoppingBag,
  Wallet,
  Store,
  ArrowRight,
} from "lucide-react";

export function MedicationsPage() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `Rs. ${amount.toLocaleString("en-NP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getMedicineDetailId = (medication) => {
    const candidate = medication?.medicineId || medication?.inventoryId || medication?.id;
    if (!candidate) return null;

    const value = String(candidate);
    // Backend currently uses a grouped composite key (contains "|") for summary rows.
    if (value.includes("|")) return null;
    return value;
  };

  const openMedication = (medication) => {
    const detailId = getMedicineDetailId(medication);

    if (detailId) {
      navigate(`/patient/medicine/${encodeURIComponent(detailId)}`);
      return;
    }

    navigate(`/medicine-search?q=${encodeURIComponent(medication?.medicineName || "")}`);
  };

  const handleBuyAgain = (medication) => {
    const medicineId = String(medication.medicineId || medication.inventoryId || medication.id);
    
    navigate("/patient/checkout", {
      state: {
        mode: "buy-now",
        items: [
          {
            id: medicineId,
            medicineId: medicineId,
            pharmacyId: medication.lastPharmacyId || null,
            medicineName: medication.medicineName,
            genericName: medication.genericName || null,
            imageUrl: medication.imageUrl || null,
            quantity: 1,
            price: Number(medication.lastPrice || medication.price || 0),
            pharmacyName: medication.lastPharmacyName || "Unknown Pharmacy",
            pharmacyAddress: medication.lastPharmacyAddress || null,
            pharmacyContact: medication.lastPharmacyContact || null,
          },
        ],
      },
    });
  };

  useEffect(() => {
    loadMedications();
  }, []);

  useEffect(() => {
    filterMedications();
  }, [medications, searchTerm]);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const response = await patientService.getMedications();
      setMedications(response.data?.medications || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load medications");
      console.error("[MEDICATIONS PAGE]", err);
    } finally {
      setLoading(false);
    }
  };

  const filterMedications = () => {
    let filtered = medications;

    if (searchTerm) {
      filtered = filtered.filter(
        (med) =>
          med.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          med.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          med.lastPharmacyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMedications(filtered);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 mb-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Pill size={32} />
              Medication Vault
            </h1>
            <p className="text-slate-600">Your complete purchase history in a professional medical record format</p>
          </div>
        </div>

        <div className="px-6 max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search purchased medicines by name, generic name, or pharmacy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Medications List */}
          <div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-36 bg-white rounded-2xl border border-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredMedications.length > 0 ? (
              <div className="space-y-4">
                {filteredMedications.map((medication) => (
                  <div
                    key={medication.id}
                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-4 lg:p-5 transition-all hover:shadow-md hover:border-blue-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Left: Image */}
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
                        {medication.imageUrl ? (
                          <img
                            src={medication.imageUrl}
                            alt={medication.medicineName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-500">
                            <Pill size={42} />
                          </div>
                        )}
                      </div>

                      {/* Middle: Core info */}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openMedication(medication)}
                          className="text-left text-lg font-bold text-slate-900 hover:text-blue-700 transition-colors"
                        >
                          {medication.medicineName}
                        </button>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                          {medication.genericName || "Generic name unavailable"}
                        </p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          <Store size={13} className="text-slate-500" />
                          {medication.lastPharmacyName || "Pharmacy not available"}
                        </div>
                      </div>

                      {/* Right: Stats summary */}
                      <div className="w-full lg:w-72 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <ShoppingBag size={14} />
                            Total Quantity Purchased
                          </span>
                          <span className="font-bold text-slate-900">{medication.totalQuantity || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <Wallet size={14} />
                            Total Amount Spent
                          </span>
                          <span className="font-bold text-blue-700">{formatCurrency(medication.totalSpent)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <Calendar size={14} />
                            Last Purchased
                          </span>
                          <span className="font-semibold text-slate-700">{formatDate(medication.lastPurchasedAt)}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="w-full lg:w-auto lg:self-center">
                        <button
                          type="button"
                          onClick={() => handleBuyAgain(medication)}
                          className="w-full lg:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                          Buy Again
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                  <Pill size={42} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {medications.length === 0 ? "No Purchase History" : "No Medications Found"}
                </h3>
                <p className="text-slate-600">
                  {medications.length === 0
                    ? "You have not purchased any medicines yet."
                    : "No medications match your search."}
                </p>
                {medications.length === 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/medicine-search")}
                    className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Find Medicines
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default MedicationsPage;
