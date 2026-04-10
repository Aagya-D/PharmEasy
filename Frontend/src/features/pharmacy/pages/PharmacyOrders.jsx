import React, { useState, useEffect } from "react";
import { ClipboardList, Package, RefreshCw, Search, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import httpClient from "../../../core/services/httpClient";

// Skeleton Pulse for loading
function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-14 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    </tr>
  );
}

export default function PharmacyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await httpClient.get("/pharmacy/orders", {
        params: { page: 1, limit: 50, status: filterStatus }
      });

      if (response.data.success && response.data.data) {
        setOrders(response.data.data.orders || []);
        setOrderStats(response.data.data.stats || null);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load orders."
      );
      setOrders([]);
      setOrderStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-700",
      ACCEPTED: "bg-blue-100 text-blue-700",
      PREPARING: "bg-indigo-100 text-indigo-700",
      READY: "bg-emerald-100 text-emerald-700",
      COMPLETED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-slate-700"}`}>
        {status?.replaceAll("_", " ")}
      </span>
    );
  };

  const statCards = orderStats ? [
    { title: "Total Orders", value: orderStats.total.toString() },
    { title: "Pending", value: orderStats.pending.toString() },
    { title: "Fulfilled", value: orderStats.fulfilled.toString() },
    { title: "Revenue", value: `Rs. ${orderStats.revenue.toLocaleString()}` },
  ] : [];

  const normalizedQuery = orderSearch.trim().toLowerCase();
  const filteredOrders = normalizedQuery
    ? orders.filter((order) => {
        const orderId = String(order.id || "").toLowerCase();
        const patientName = String(order.patient?.name || "").toLowerCase();
        const status = String(order.status || "").toLowerCase();
        return orderId.includes(normalizedQuery) || patientName.includes(normalizedQuery) || status.includes(normalizedQuery);
      })
    : orders;

  const isStatusFilterActive = filterStatus !== "all";
  const statusFilterPills = [
    {
      label: "All",
      value: "all",
      idle: "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700",
      active: "border-slate-600 bg-slate-600 text-white",
    },
    {
      label: "Pending",
      value: "PENDING",
      idle: "border-amber-300 text-amber-700 hover:border-amber-400 hover:text-amber-800",
      active: "border-amber-500 bg-amber-500 text-white",
    },
    {
      label: "Accepted",
      value: "ACCEPTED",
      idle: "border-blue-300 text-blue-700 hover:border-blue-400 hover:text-blue-800",
      active: "border-blue-600 bg-blue-600 text-white",
    },
    {
      label: "Completed",
      value: "COMPLETED",
      idle: "border-green-300 text-green-700 hover:border-green-400 hover:text-green-800",
      active: "border-green-600 bg-green-600 text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
            <p className="text-sm text-slate-500">Track incoming and fulfilled orders</p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading && !orderStats ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : statCards.length > 0 ? (
            statCards.map((stat) => (
              <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50">
                    <ClipboardList size={24} className="text-blue-600" />
                  </div>
                </div>
              </div>
            ))
          ) : !error ? (
            <div className="col-span-full text-center py-8">
              <ClipboardList className="mx-auto mb-2 text-gray-300" size={36} />
              <p className="text-slate-500">No order data yet</p>
            </div>
          ) : null}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p>{error}</p>
            <button onClick={fetchOrders} className="text-sm underline mt-1">Try Again</button>
          </div>
        )}

        {/* Filter and Search */}
        <div className="mb-4 flex flex-col gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Search by order ID, customer, or status"
              className="w-full rounded-lg bg-white border border-slate-200 pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {statusFilterPills.map((pill) => {
              const isActive = filterStatus === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setFilterStatus(pill.value)}
                  className={`px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-200 ${isActive ? pill.active : pill.idle}`}
                >
                  {pill.label}
                </button>
              );
            })}

            {isStatusFilterActive && (
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className="px-3.5 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 text-sm font-medium transition-all duration-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4">Order ID</th>
                  <th className="text-left px-6 py-4">Customer</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Total</th>
                  <th className="text-left px-6 py-4">Items</th>
                  <th className="text-left px-6 py-4">Date</th>
                  <th className="text-left px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <Package className="mx-auto mb-3 text-gray-300" size={48} />
                      <p className="text-slate-700 font-semibold text-lg">No matching orders found</p>
                      <p className="text-slate-500 text-sm mt-1">
                        Try a different keyword or adjust the status filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{order.id.slice(0, 12)}...</td>
                      <td className="px-6 py-4 text-slate-600">{order.patient?.name || "Unknown"}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {order.totalAmount ? `Rs. ${order.totalAmount.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {order.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/pharmacy/orders/${order.id}`)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          title="View order details"
                          aria-label="View order details"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

