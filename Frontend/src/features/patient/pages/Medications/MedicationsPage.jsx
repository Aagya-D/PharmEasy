import React, { useState, useEffect } from "react";
import patientService from "../../services/patient.service";
import {
  Pill,
  Search,
  Calendar,
  AlertCircle,
  ShoppingBag,
  Wallet,
} from "lucide-react";

export function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 mb-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Pill size={32} />
              Purchased Medicines
            </h1>
            <p className="text-gray-600">All medicines you have ordered so far</p>
          </div>
        </div>

        <div className="px-6 max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search purchased medicines by name, generic name, or pharmacy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-64 bg-white rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredMedications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMedications.map((medication) => (
                  <div
                    key={medication.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {medication.medicineName}
                        </h3>
                        {medication.genericName && (
                          <p className="text-sm text-gray-600">
                            {medication.genericName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 flex items-center gap-1">
                          <ShoppingBag size={14} /> Purchases:
                        </span>
                        <span className="font-medium text-gray-900">
                          {medication.purchaseCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Quantity:</span>
                        <span className="font-medium text-gray-900">
                          {medication.totalQuantity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Wallet size={14} /> Total Spend:
                        </span>
                        <span className="font-medium text-gray-900">
                          Rs. {Number(medication.totalSpent || 0).toFixed(2)}
                        </span>
                      </div>
                      {medication.lastPharmacyName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Pharmacy:</span>
                          <span className="font-medium text-gray-900">
                            {medication.lastPharmacyName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Added Date */}
                    {medication.lastPurchasedAt && (
                      <div className="mb-4 text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={14} />
                        Last purchased {new Date(medication.lastPurchasedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg">
                <Pill size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Medications Found
                </h3>
                <p className="text-gray-600">
                  {medications.length === 0
                    ? "You have not purchased any medicines yet."
                    : "No medications match your search."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default MedicationsPage;
