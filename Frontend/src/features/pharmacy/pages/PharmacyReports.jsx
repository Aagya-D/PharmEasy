import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  TrendingUp,
  Download,
  Loader,
  AlertCircle,
  RefreshCw,
  Package,
  ShoppingCart,
  DollarSign,
  Pill,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";
import pharmacyService from "../../../core/services/pharmacy.service";

export default function PharmacyReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingInventory, setExportingInventory] = useState(false);
  const [exportingSales, setExportingSales] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pharmacyService.getDashboardStats();
      setStats(result.data?.stats || null);
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  /**
   * Download a CSV blob from the API
   */
  const downloadCSV = async (type) => {
    const setExporting = type === "inventory" ? setExportingInventory : setExportingSales;
    setExporting(true);
    setExportSuccess(null);
    try {
      const response =
        type === "inventory"
          ? await pharmacyService.exportInventoryCSV()
          : await pharmacyService.exportSalesCSV();

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      // Extract filename from Content-Disposition header or use default
      const disposition = response.headers?.["content-disposition"];
      let filename = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportSuccess(type);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error(`Export ${type} failed:`, err);
      toast.error(`❌ Failed to export ${type} report. Please check your connection and try again.`);
    } finally {
      setExporting(false);
    }
  };

  const summaryStats = stats
    ? [
        {
          title: "Total Medicines",
          value: stats.totalMedicines?.toLocaleString() || "0",
          sub: `${stats.lowStock || 0} low stock`,
          icon: Pill,
          color: "blue",
        },
        {
          title: "Stock Value",
          value: `NPR ${(stats.totalValue || 0).toLocaleString()}`,
          sub: `${stats.totalItems || 0} total items`,
          icon: Package,
          color: "emerald",
        },
        {
          title: "Total Orders",
          value: stats.totalOrders?.toLocaleString() || "0",
          sub: `${stats.fulfilledOrders || 0} fulfilled`,
          icon: ShoppingCart,
          color: "purple",
        },
        {
          title: "Expiring Soon",
          value: stats.expiringSoon?.toLocaleString() || "0",
          sub: "Within 30 days",
          icon: AlertCircle,
          color: "orange",
        },
      ]
    : [];

  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-600" },
    orange: { bg: "bg-orange-50", text: "text-orange-600" },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            <p className="text-sm text-slate-500">Export data and review operational summary</p>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Loading State */}
        {loading && !stats && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Loader size={40} className="animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-medium">Calculating Insights...</p>
            <p className="text-sm text-slate-400 mt-1">Preparing your reports</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <AlertCircle size={40} className="text-red-400 mb-4" />
            <p className="text-lg font-medium text-red-600">{error}</p>
            <button
              onClick={fetchDashboard}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Data Loaded */}
        {stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {summaryStats.map((stat) => {
                const Icon = stat.icon;
                const colors = colorMap[stat.color];
                return (
                  <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                        <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
                          <TrendingUp size={14} className="text-green-500" />
                          <span>{stat.sub}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl ${colors.bg}`}>
                        <Icon size={24} className={colors.text} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Export Data Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-blue-600" />
                  Export Data
                </h2>
                <p className="text-sm text-slate-500 mt-1">Download your business data as CSV files for accounting and analysis</p>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Inventory Card */}
                <div className="border border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                      <Package size={28} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-base">Export Inventory</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-4">
                        Download your current medicine stock as CSV. Includes name, generic name, quantity, price, and expiry date.
                      </p>
                      <button
                        onClick={() => downloadCSV("inventory")}
                        disabled={exportingInventory}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                      >
                        {exportingInventory ? (
                          <>
                            <Loader size={16} className="animate-spin" />
                            Generating...
                          </>
                        ) : exportSuccess === "inventory" ? (
                          <>
                            <CheckCircle size={16} />
                            Downloaded!
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            Download Inventory CSV
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Export Sales Card */}
                <div className="border border-slate-200 rounded-xl p-6 hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl flex-shrink-0">
                      <DollarSign size={28} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-base">Export Sales</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-4">
                        Download all completed orders as CSV. Includes patient info, order status, amounts, and dates.
                      </p>
                      <button
                        onClick={() => downloadCSV("sales")}
                        disabled={exportingSales}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm"
                      >
                        {exportingSales ? (
                          <>
                            <Loader size={16} className="animate-spin" />
                            Generating...
                          </>
                        ) : exportSuccess === "sales" ? (
                          <>
                            <CheckCircle size={16} />
                            Downloaded!
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            Download Sales CSV
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-slate-600" />
                Quick Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Pending Orders</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{stats.pendingOrders || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Out of Stock</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{stats.outOfStock || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Pending SOS</p>
                  <p className="text-xl font-bold text-orange-600 mt-1">{stats.pendingSOS || 0}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

