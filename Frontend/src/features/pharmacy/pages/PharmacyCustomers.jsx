import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  Loader,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  ShoppingCart,
  Calendar,
  DollarSign,
  X,
  UserCheck,
} from "lucide-react";
import pharmacyService from "../../../core/services/pharmacy.service";

export default function PharmacyCustomers() {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const globalSearch = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(globalSearch);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    setSearchQuery((prev) => (prev === globalSearch ? prev : globalSearch));
  }, [globalSearch]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pharmacyService.getPharmacyCustomers(debouncedSearch);
      setCustomers(result.data?.customers || []);
      setStats(result.data?.stats || null);
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  /**
   * Format relative date
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const summaryStats = stats
    ? [
        {
          title: "Total Customers",
          value: stats.totalCustomers.toLocaleString(),
          change: `${customers.length} shown`,
          trend: "up",
          icon: Users,
        },
        {
          title: "Total Orders",
          value: stats.totalOrders.toLocaleString(),
          change: "All time",
          trend: "up",
          icon: ShoppingCart,
        },
        {
          title: "Total Revenue",
          value: `NPR ${stats.totalRevenue.toLocaleString()}`,
          change: "All time",
          trend: "up",
          icon: DollarSign,
        },
        {
          title: "Avg Orders/Customer",
          value: stats.totalCustomers > 0
            ? (stats.totalOrders / stats.totalCustomers).toFixed(1)
            : "0",
          change: "Per customer",
          trend: "up",
          icon: UserCheck,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500">Real customer data from your orders</p>
          </div>
          <button
            onClick={fetchCustomers}
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
        {loading && customers.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader size={40} className="animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-medium">Calculating Insights...</p>
            <p className="text-sm text-gray-400 mt-1">Analyzing your customer data</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <AlertCircle size={40} className="text-red-400 mb-4" />
            <p className="text-lg font-medium text-red-600">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Data Loaded */}
        {!error && (customers.length > 0 || stats) && (
          <>
            {/* Stat Cards */}
            {summaryStats.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {summaryStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                            <TrendingUp size={16} />
                            <span>{stat.change}</span>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-50">
                          <Icon size={24} className="text-blue-600" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search Bar + Customer Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Customer List
                  {customers.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({customers.length})</span>
                  )}
                </h2>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email or phone..."
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {customers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-500 border-b border-gray-100 bg-gray-50/50">
                      <tr>
                        <th className="text-left px-6 py-4 font-semibold">Customer</th>
                        <th className="text-left px-6 py-4 font-semibold">Contact</th>
                        <th className="text-left px-6 py-4 font-semibold">Orders</th>
                        <th className="text-left px-6 py-4 font-semibold">Total Spent</th>
                        <th className="text-left px-6 py-4 font-semibold">Last Purchase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{customer.name}</p>
                                <p className="text-xs text-gray-400">Since {formatDate(customer.memberSince)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-gray-700 flex items-center gap-1.5">
                                <Mail size={13} className="text-gray-400" />
                                {customer.email}
                              </p>
                              <p className="text-gray-500 flex items-center gap-1.5">
                                <Phone size={13} className="text-gray-400" />
                                {customer.phone}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold text-xs">
                              <ShoppingCart size={12} />
                              {customer.totalOrders}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            NPR {customer.totalSpent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-gray-600 flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400" />
                            {formatDate(customer.lastPurchase)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-16 text-center">
                  <Users size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700 font-semibold mb-1">
                    {searchQuery ? "No customers match your search" : "No customers yet"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {searchQuery
                      ? "Try a different name, email, or phone number"
                      : "Customers will appear here once they place orders"}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
