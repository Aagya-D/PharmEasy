import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../shared/components/ui";
import { OrderCard } from "../../components/Dashboard/OrderCard";
import patientService from "../../services/patient.service";
import {
  Package,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  Loader,
} from "lucide-react";

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const statuses = ["all", "pending", "confirmed", "delivered", "cancelled"];

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

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

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.pharmacyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.status?.toLowerCase() === statusFilter
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: "bg-yellow-50", text: "text-yellow-800", badge: "bg-yellow-100" },
      confirmed: { bg: "bg-blue-50", text: "text-blue-800", badge: "bg-blue-100" },
      delivered: { bg: "bg-green-50", text: "text-green-800", badge: "bg-green-100" },
      cancelled: { bg: "bg-red-50", text: "text-red-800", badge: "bg-red-100" },
    };
    return colors[status?.toLowerCase()] || colors.pending;
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by order ID or pharmacy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Filter size={18} />
                  Status Filter
                  <ChevronDown size={16} />
                </button>

                {showFilterMenu && (
                  <div className="absolute top-full mt-2 left-0 bg-white border border-gray-300 rounded-lg shadow-lg z-20 min-w-48">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 capitalize transition ${
                          statusFilter === status
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(searchTerm || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                  <div key={order.id} onClick={() => navigate(`/patient/orders/${order.id}`)}>
                    <OrderCard
                      order={order}
                      onViewDetails={(id) => navigate(`/patient/orders/${id}`)}
                    />
                  </div>
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
