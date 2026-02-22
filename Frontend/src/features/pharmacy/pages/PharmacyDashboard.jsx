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
  ShoppingCart,
  Siren,
  DollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { AnnouncementBanner } from "../../../shared/components/AnnouncementBanner";
import { getDashboardStats } from "../../../core/services/pharmacy.service";
import PharmacyNotificationBell from "../components/PharmacyNotificationBell";

// Skeleton Pulse component for loading state
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 rounded-lg" /><div className="h-4 bg-gray-200 rounded w-28" /></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
    </tr>
  );
}

/**
 * Pharmacy Admin Dashboard - Real-time data from backend
 * No hardcoded demo data - all stats computed server-side
 */
export default function PharmacyDashboard() {
  const { user } = useAuth();

  // Real stats from backend
  const [stats, setStats] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getDashboardStats();
      
      if (response.success && response.data) {
        setStats(response.data.stats);
        setMedicines(response.data.inventory || []);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err.error?.message || 
        err.message || 
        "Failed to load dashboard data. Please try again."
      );
      setStats(null);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  // Build stat cards from real backend data
  const statCards = stats ? [
    {
      title: "Total Stock",
      value: stats.totalItems.toLocaleString(),
      subtitle: `${stats.totalMedicines} unique medicines`,
      icon: Package,
      color: "bg-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Low Stock",
      value: stats.lowStock.toString(),
      subtitle: stats.outOfStock > 0 ? `${stats.outOfStock} out of stock` : "All items stocked",
      icon: AlertTriangle,
      color: "bg-yellow-500",
      iconBg: stats.lowStock > 0 ? "bg-yellow-50" : "bg-green-50",
      iconColor: stats.lowStock > 0 ? "text-yellow-600" : "text-green-600",
      alert: stats.lowStock > 0,
    },
    {
      title: "Pending SOS",
      value: stats.pendingSOS.toString(),
      subtitle: "Nearby emergencies",
      icon: Siren,
      color: "bg-red-500",
      iconBg: stats.pendingSOS > 0 ? "bg-red-50" : "bg-gray-50",
      iconColor: stats.pendingSOS > 0 ? "text-red-600" : "text-gray-400",
      alert: stats.pendingSOS > 0,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      subtitle: `${stats.pendingOrders} pending · ${stats.fulfilledOrders} fulfilled`,
      icon: ShoppingCart,
      color: "bg-green-500",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
  ] : [];

  const getStockStatus = (quantity) => {
    if (quantity === 0) return "out-of-stock";
    if (quantity < 10) return "low-stock";
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
            <PharmacyNotificationBell />
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      <div className="px-6 pt-6">
        <AnnouncementBanner targetRole="PHARMACY" />
      </div>

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

        {/* Stats Cards - Skeleton or Real */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : statCards.length > 0 ? (
            statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={`bg-white rounded-xl p-6 shadow-sm border ${stat.alert ? 'border-yellow-200' : 'border-gray-100'}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                      <Icon size={24} className={stat.iconColor} />
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : !error ? (
            <div className="col-span-full text-center py-12">
              <Package className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="text-gray-500 font-medium">No inventory data available yet</p>
              <p className="text-sm text-gray-400 mt-1">Add medicines to your inventory to see live stats</p>
              <Link
                to="/pharmacy/inventory"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add Medicine
              </Link>
            </div>
          ) : null}
        </div>

        {/* Stock Value Banner */}
        {stats && stats.totalValue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Stock Value</p>
                <p className="text-xl font-bold text-blue-900">Rs. {stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            {stats.expiringSoon > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-lg">
                <Calendar size={16} className="text-orange-600" />
                <span className="text-sm text-orange-700 font-medium">{stats.expiringSoon} expiring soon</span>
              </div>
            )}
          </motion.div>
        )}

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
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Medicine Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Generic Name</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <SkeletonTableRow />
                    <SkeletonTableRow />
                    <SkeletonTableRow />
                    <SkeletonTableRow />
                    <SkeletonTableRow />
                  </tbody>
                </table>
              ) : medicines.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="mx-auto mb-3 text-gray-300" size={48} />
                  <p className="text-gray-700 font-semibold text-lg">No stock added yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Your inventory is empty. Add your first medicine to start tracking stock.
                  </p>
                  <Link
                    to="/pharmacy/inventory"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} />
                    Add Medicine
                  </Link>
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
                                    : medicine.quantity < 10
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
      </main>
    </div>
  );
}
