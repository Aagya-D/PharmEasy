import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../shared/components/ui";
import { OrderCard } from "../../components/Dashboard/OrderCard";
import patientService from "../../services/patient.service";
import { motion } from "framer-motion";
import {
  Package,
  Search,
  AlertCircle,
  CalendarDays,
  ArrowUpDown,
} from "lucide-react";

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("latest");
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const moreFiltersRef = useRef(null);

  const statusPills = [
    {
      value: "all",
      label: "All",
      idle: "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700",
      active: "border-slate-600 bg-slate-600 text-white",
    },
    {
      value: "pending",
      label: "Pending",
      idle: "border-amber-300 text-amber-700 hover:border-amber-400 hover:text-amber-800",
      active: "border-amber-500 bg-amber-500 text-white",
    },
    {
      value: "accepted",
      label: "Accepted",
      idle: "border-blue-300 text-blue-700 hover:border-blue-400 hover:text-blue-800",
      active: "border-blue-600 bg-blue-600 text-white",
    },
    {
      value: "completed",
      label: "Completed",
      idle: "border-green-300 text-green-700 hover:border-green-400 hover:text-green-800",
      active: "border-green-600 bg-green-600 text-white",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      idle: "border-red-200 text-red-600 hover:border-red-300 hover:text-red-700",
      active: "bg-red-600 text-white",
    },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!moreFiltersRef.current?.contains(event.target)) {
        setIsMoreFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await patientService.getOrders();
      setOrders(response.data?.orders || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
      console.error("[ORDERS PAGE]", err);
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      pending: 0,
      accepted: 0,
      completed: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      const status = String(order.status || "").toLowerCase();
      if (status === "pending") counts.pending += 1;
      if (status === "accepted") counts.accepted += 1;
      if (status === "completed") counts.completed += 1;
      if (status === "cancelled") counts.cancelled += 1;
    });

    return counts;
  }, [orders]);

  const filteredResult = useMemo(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.pharmacy?.pharmacyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.items?.some((item) =>
            item.medicineName?.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.status?.toLowerCase() === statusFilter
      );
    }

    if (sortMode === "price-asc") {
      filtered = [...filtered].sort((a, b) => Number(a.totalAmount || 0) - Number(b.totalAmount || 0));
    } else if (sortMode === "price-desc") {
      filtered = [...filtered].sort((a, b) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0));
    } else if (sortMode === "oldest") {
      filtered = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filtered;
  }, [orders, searchTerm, statusFilter, sortMode]);

  useEffect(() => {
    setFilteredOrders(filteredResult);
  }, [filteredResult]);

  const applySortMode = (mode) => {
    setSortMode(mode);
    setIsMoreFiltersOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 mb-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Package size={32} />
              My Orders
            </h1>
            <p className="text-gray-600">Track and manage your medication orders</p>
          </div>
        </div>

        <div className="px-6 max-w-7xl mx-auto">
          {/* Search and Filter Bar */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={20}
                strokeWidth={2.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600"
              />
              <input
                type="text"
                placeholder="Search by order ID or pharmacy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/60 p-1">
              {statusPills.map((pill) => {
                const isActive = statusFilter === pill.value;
                const count = statusCounts[pill.value] || 0;

                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setStatusFilter(pill.value)}
                    className={`relative rounded-lg px-3.5 py-1.5 text-sm transition-all duration-200 ${
                      isActive ? "text-blue-700 font-semibold" : "text-slate-500 font-medium hover:text-slate-700"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="patient-orders-filter-active"
                        className="absolute inset-0 rounded-lg bg-white shadow-sm"
                        transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-2">
                      {pill.label}
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {count}
                      </span>
                    </span>
                  </button>
                );
              })}
              </div>

              <div className="relative" ref={moreFiltersRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreFiltersOpen((open) => !open)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
                >
                  More Filters
                </button>
                {isMoreFiltersOpen && (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => applySortMode("latest")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarDays size={14} />
                    Sort by Date (Latest)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySortMode("oldest")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarDays size={14} />
                    Sort by Date (Oldest)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySortMode("price-asc")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowUpDown size={14} />
                    Sort by Price (Low)
                  </button>
                  <button
                    type="button"
                    onClick={() => applySortMode("price-desc")}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowUpDown size={14} />
                    Sort by Price (High)
                  </button>
                </div>
                )}
              </div>

              {(searchTerm || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 text-sm font-medium transition-all duration-200"
                >
                  Clear Filters
                </button>
              )}
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

          {/* Orders List */}
          <div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-white rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={(id) => navigate(`/patient/orders/${id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg">
                {orders.length === 0 ? (
                  <>
                    <Package size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Orders Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Start shopping from pharmacies near you
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => navigate("/search")}
                    >
                      Search Pharmacies
                    </Button>
                  </>
                ) : (
                  <>
                    <Package size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Orders Found
                    </h3>
                    <p className="text-gray-600">
                      No orders match your search criteria
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default OrdersPage;
