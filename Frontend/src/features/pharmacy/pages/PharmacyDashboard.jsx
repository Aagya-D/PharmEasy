import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  Filter,
  MoreVertical,
  X,
  Save,
  AlertCircle,
  Bell,
  ChevronDown,
  Eye,
  XCircle,
  Pill,
  Loader,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getDashboardStats } from "../../../core/services/pharmacy.service";
import { getMyInventory } from "../../../core/services/inventory.service";

/**
 * Pharmacy Admin Dashboard - Inventory Management
 * Real data integration - Fetches stats and inventory from backend API
 */
export default function PharmacyDashboard() {
  // Auth context
  const { user } = useAuth();

  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Data states
  const [stats, setStats] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  // Medicine categories
  const categories = [
    "General",
    "Antibiotics",
    "Analgesics",
    "Vitamins",
    "Antiseptics",
    "Cardiovascular",
    "Respiratory",
    "Gastrointestinal",
    "Dermatology",
    "Other"
  ];

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: "",
    genericName: "",
    category: "General",
    manufacturer: "",
    quantity: "",
    price: "",
    batchNumber: "",
    expiryDate: "",
  });

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [page]);

  /**
   * Fetch dashboard statistics and inventory data
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats (which includes inventory data)
      const statsResponse = await getDashboardStats();
      
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data.stats || []);
        
        // If getDashboardStats includes inventory preview, use it
        // Otherwise fetch full inventory
        if (statsResponse.data.inventory && statsResponse.data.inventory.length > 0) {
          setMedicines(statsResponse.data.inventory);
        } else {
          // Fetch full inventory
          const inventoryResponse = await getMyInventory(page, 100);
          if (inventoryResponse.data && Array.isArray(inventoryResponse.data)) {
            setMedicines(inventoryResponse.data);
          } else if (inventoryResponse.data && inventoryResponse.data.items) {
            setMedicines(inventoryResponse.data.items);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err.error?.message || 
        err.message || 
        "Failed to load dashboard data. Please try again."
      );
      // Set empty arrays on error
      setStats([]);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Determine stock status based on quantity
   */
  const getStockStatus = (quantity) => {
    if (quantity === 0) return "out-of-stock";
    if (quantity < 50) return "low-stock";
    return "in-stock";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "in-stock":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            In Stock
          </span>
        );
      case "low-stock":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
            Low Stock
          </span>
        );
      case "out-of-stock":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  const handleAddMedicine = () => {
    // Add medicine will be handled by PharmacyInventory component
    setShowAddModal(false);
    resetForm();
    // Refresh data
    fetchDashboardData();
  };

  const handleEditMedicine = () => {
    // Edit will be handled by PharmacyInventory component
    setShowEditModal(false);
    resetForm();
    // Refresh data
    fetchDashboardData();
  };

  const handleDeleteMedicine = () => {
    // Delete will be handled by PharmacyInventory component
    setShowDeleteModal(false);
    setSelectedMedicine(null);
    // Refresh data
    fetchDashboardData();
  };

  const openEditModal = (medicine) => {
    setSelectedMedicine(medicine);
    setFormData({
      name: medicine.name,
      genericName: medicine.genericName || "",
      category: medicine.category || "General",
      manufacturer: medicine.manufacturer || "",
      quantity: medicine.quantity.toString(),
      price: medicine.price.toString(),
      batchNumber: medicine.batchNumber || "",
      expiryDate: medicine.expiryDate || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      genericName: "",
      category: "General",
      manufacturer: "",
      quantity: "",
      price: "",
      batchNumber: "",
      expiryDate: "",
    });
    setSelectedMedicine(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500">
              Manage your pharmacy stock and medicines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Refresh data"
            >
              <Loader size={22} className={`text-gray-600 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/notifications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Notifications
            </Link>
          </div>
        </div>
      </header>

      <main className="p-6 overflow-y-auto">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="text-sm text-red-600 hover:text-red-700 font-medium mt-2 underline"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && stats.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
              <p className="text-gray-600 font-medium">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.length > 0 ? (
                stats.map((stat, index) => {
                  const IconComponent = stat.icon && typeof stat.icon === 'string' 
                    ? eval(stat.icon)
                    : stat.icon;
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                          <div
                            className={`flex items-center gap-1 mt-2 text-sm ${
                              stat.trend === "up" ? "text-green-600" : 
                              stat.trend === "down" ? "text-red-600" :
                              "text-yellow-600"
                            }`}
                          >
                            {stat.trend === "up" ? (
                              <TrendingUp size={16} />
                            ) : stat.trend === "down" ? (
                              <TrendingDown size={16} />
                            ) : (
                              <AlertTriangle size={16} />
                            )}
                            <span>{stat.change}</span>
                          </div>
                        </div>
                        <div
                          className={`p-3 rounded-xl ${stat.color}`}
                        >
                          {IconComponent && (
                            <IconComponent size={24} className="text-white" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <Package className="mx-auto mb-3 text-gray-300" size={40} />
                  <p className="text-gray-500">No inventory data available yet</p>
                </div>
              )}
            </div>

            {/* Table Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Table Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-col lg:flex-row gap-4 justify-between">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search medicines..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="in-stock">In Stock</option>
                        <option value="low-stock">Low Stock</option>
                        <option value="out-of-stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      to="/pharmacy/inventory"
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={18} />
                      <span>Manage Inventory</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="p-12 text-center">
                  <Loader className="animate-spin mx-auto mb-3 text-blue-600" size={32} />
                  <p className="text-gray-600">Loading inventory data...</p>
                </div>
              ) : medicines.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="mx-auto mb-3 text-gray-300" size={40} />
                  <p className="text-gray-600 font-medium">No medicines in inventory</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Add your first medicine using the Manage Inventory button
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Medicine Name
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Generic Name
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Expiry Date
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {medicines
                        .filter((medicine) => {
                          const matchesSearch = (medicine.name || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase());
                          const status = getStockStatus(medicine.quantity || 0);
                          const matchesStatus =
                            filterStatus === "all" || status === filterStatus;
                          return matchesSearch && matchesStatus;
                        })
                        .slice(0, 10)
                        .map((medicine, index) => (
                          <motion.tr
                            key={medicine.id || index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                  <Pill className="text-blue-600" size={18} />
                                </div>
                                <p className="font-medium text-gray-900">
                                  {medicine.name || "N/A"}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-600 text-sm">
                                {medicine.genericName || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`font-medium ${
                                  medicine.quantity === 0
                                    ? "text-red-600"
                                    : medicine.quantity < 50
                                    ? "text-yellow-600"
                                    : "text-gray-900"
                                }`}
                              >
                                {medicine.quantity || 0} units
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900">
                                ₹{(medicine.price || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-600 text-sm">
                                {medicine.expiryDate
                                  ? new Date(medicine.expiryDate).toLocaleDateString()
                                  : "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(getStockStatus(medicine.quantity || 0))}
                            </td>
                          </motion.tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer */}
              {medicines.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing up to 10 of {medicines.length} medicines
                  </p>
                  <Link
                    to="/pharmacy/inventory"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all →
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Add Medicine Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  Add New Medicine
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Paracetamol 500mg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manufacturer: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Cipla"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          batchNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., BAT001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="month"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMedicine}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save size={18} />
                  Add Medicine
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Medicine Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Medicine
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manufacturer: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          batchNumber: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="month"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditMedicine}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-600" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Delete Medicine
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to delete "{selectedMedicine?.name}"?
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMedicine}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  Bulk CSV Upload
                </h2>
                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="text-blue-600" size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Upload CSV File
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csvUpload"
                  />
                  <label
                    htmlFor="csvUpload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Select File
                  </label>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    CSV Format Requirements:
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>
                      • Columns: Name, Category, Quantity, Price, Manufacturer,
                      ExpiryDate, BatchNumber
                    </li>
                    <li>• First row should be header row</li>
                    <li>• Maximum 500 records per upload</li>
                  </ul>
                  <button className="text-blue-600 text-sm font-medium mt-2 hover:text-blue-700">
                    Download Sample Template
                  </button>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  <Upload size={18} />
                  Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
