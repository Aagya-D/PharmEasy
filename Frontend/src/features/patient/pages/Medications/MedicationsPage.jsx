import React, { useState, useEffect } from "react";
import Layout from "../../../../shared/layouts/Layout";
import { Button } from "../../../../shared/components/ui";
import patientService from "../../services/patient.service";
import {
  Pill,
  Search,
  Calendar,
  Trash2,
  AlertCircle,
  Plus,
  Heart,
} from "lucide-react";

export function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { id: "all", label: "All Medications" },
    { id: "active", label: "Active" },
    { id: "favorites", label: "Favorites" },
  ];

  useEffect(() => {
    loadMedications();
  }, []);

  useEffect(() => {
    filterMedications();
  }, [medications, searchTerm, activeTab]);

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
          med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          med.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          med.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeTab === "active") {
      filtered = filtered.filter((med) => med.isActive);
    } else if (activeTab === "favorites") {
      filtered = filtered.filter((med) => med.isFavorite);
    }

    setFilteredMedications(filtered);
  };

  const handleAddFavorite = async (medicationId) => {
    try {
      await patientService.addToFavorites(medicationId);
      setMedications((prev) =>
        prev.map((med) =>
          med.id === medicationId ? { ...med, isFavorite: true } : med
        )
      );
    } catch (err) {
      console.error("[ADD FAVORITE]", err);
    }
  };

  const handleRemoveMedication = async (medicationId) => {
    if (window.confirm("Are you sure you want to remove this medication?")) {
      try {
        await patientService.removeMedication(medicationId);
        setMedications((prev) =>
          prev.filter((med) => med.id !== medicationId)
        );
      } catch (err) {
        console.error("[REMOVE MEDICATION]", err);
      }
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6 mb-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Pill size={32} />
              My Medications
            </h1>
            <p className="text-gray-600">Track your medication history</p>
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
                placeholder="Search medications by name or generic name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-600 border-transparent hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {medication.name}
                        </h3>
                        {medication.genericName && (
                          <p className="text-sm text-gray-600">
                            {medication.genericName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddFavorite(medication.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          medication.isFavorite
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Heart
                          size={18}
                          fill={medication.isFavorite ? "currentColor" : "none"}
                        />
                      </button>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 mb-4 text-sm">
                      {medication.dosage && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dosage:</span>
                          <span className="font-medium text-gray-900">
                            {medication.dosage}
                          </span>
                        </div>
                      )}
                      {medication.frequency && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frequency:</span>
                          <span className="font-medium text-gray-900">
                            {medication.frequency}
                          </span>
                        </div>
                      )}
                      {medication.manufacturer && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Manufacturer:</span>
                          <span className="font-medium text-gray-900">
                            {medication.manufacturer}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="mb-4 flex gap-2">
                      {medication.isActive && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Active
                        </span>
                      )}
                      {medication.isPrescription && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Prescription
                        </span>
                      )}
                    </div>

                    {/* Added Date */}
                    {medication.dateAdded && (
                      <div className="mb-4 text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={14} />
                        Added {new Date(medication.dateAdded).toLocaleDateString()}
                      </div>
                    )}

                    {/* Actions */}
                    <button
                      onClick={() => handleRemoveMedication(medication.id)}
                      className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Trash2 size={16} />
                      Remove from List
                    </button>
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
                    ? "You haven't added any medications yet."
                    : "No medications match your search."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default MedicationsPage;
