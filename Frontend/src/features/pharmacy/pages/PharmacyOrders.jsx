import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ClipboardList, Loader, Package, RefreshCw } from "lucide-react";
import httpClient from "../../../core/services/httpClient";

// Skeleton Pulse for loading
function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
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
    <tr className="border-b border-gray-50 animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    </tr>
  );
}

export default function PharmacyOrders() {
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

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
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status?.replaceAll("_", " ")}
      </span>
    );
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      setUpdatingOrderId(orderId);
      await httpClient.patch(`/pharmacy/orders/${orderId}/status`, { status });
      await fetchOrders();
    } catch (err) {
      console.error("Failed to update order status", err);
      setError(err.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const renderActionButton = (order) => {
    if (order.status === "PENDING") {
      return (
        <button
          onClick={() => updateOrderStatus(order.id, "ACCEPTED")}
          disabled={updatingOrderId === order.id}
          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold"
        >
          Accept
        </button>
      );
    }

    if (order.status === "ACCEPTED" || order.status === "PREPARING") {
      return (
        <button
          onClick={() => updateOrderStatus(order.id, "READY")}
          disabled={updatingOrderId === order.id}
          className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold"
        >
          Mark as Ready
        </button>
      );
    }

    if (order.status === "READY") {
      return (
        <button
          onClick={() => updateOrderStatus(order.id, "COMPLETED")}
          disabled={updatingOrderId === order.id}
          className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-semibold"
        >
          Complete
        </button>
      );
    }

    return <span className="text-xs text-gray-400">No actions</span>;
  };

  const statCards = orderStats ? [
    { title: "Total Orders", value: orderStats.total.toString() },
    { title: "Pending", value: orderStats.pending.toString() },
    { title: "Fulfilled", value: orderStats.fulfilled.toString() },
    { title: "Revenue", value: `Rs. ${orderStats.revenue.toLocaleString()}` },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500">Track incoming and fulfilled orders</p>
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
              <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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
              <p className="text-gray-500">No order data yet</p>
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

        {/* Filter */}
        <div className="mb-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
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
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <Package className="mx-auto mb-3 text-gray-300" size={48} />
                      <p className="text-gray-700 font-semibold text-lg">No orders yet</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Orders from patients will appear here once they start purchasing.
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{order.id.slice(0, 12)}...</td>
                      <td className="px-6 py-4 text-gray-600">{order.patient?.name || "Unknown"}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {order.totalAmount ? `Rs. ${order.totalAmount.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {order.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {renderActionButton(order)}
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
