import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import Layout from "../../../../shared/layouts/Layout";
import { QuickStats } from "../../components/Dashboard/QuickStats";
import { OrderCard } from "../../components/Dashboard/OrderCard";
import patientService from "../../services/patient.service";
import { Package, MapPin, AlertCircle } from "lucide-react";

export function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await patientService.getOrders({ limit: 5 });
      setOrders(response.data?.orders || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
      console.error("[PATIENT DASHBOARD]", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="text-gray-600 mt-2">Here's your health overview for today</p>
          </div>

          {/* Quick Stats */}
          <div className="mb-8">
            <QuickStats />
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Orders - Main Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
                      <p className="text-sm text-gray-500">Track your medication orders</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/patient/orders")}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  >
                    View All →
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-24 bg-gray-200 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onViewDetails={(id) => navigate(`/patient/orders/${id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium mb-4">No orders yet</p>
                    <button
                      onClick={() => navigate("/search")}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Search Pharmacies
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions Card */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 text-lg mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate("/search")}
                    className="w-full p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-600 font-semibold rounded-lg transition-all flex items-center gap-2 text-left"
                  >
                    <MapPin size={18} />
                    Find Pharmacies
                  </button>
                  <button
                    onClick={() => navigate("/patient/prescriptions")}
                    className="w-full p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-600 font-semibold rounded-lg transition-all"
                  >
                    📋 My Prescriptions
                  </button>
                  <button
                    onClick={() => navigate("/patient/medications")}
                    className="w-full p-3 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 font-semibold rounded-lg transition-all"
                  >
                    💊 Medication History
                  </button>
                </div>
              </div>

              {/* Health Tips Card */}
              <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-cyan-50 rounded-lg shadow-md p-6 border border-emerald-100">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Health Tip</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Take your medications at the same time daily for better effectiveness. Use phone reminders!
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency SOS Button */}
              <button
                onClick={() => navigate("/sos")}
                className="w-full p-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <AlertCircle size={20} />
                Emergency SOS
              </button>

              {/* Profile Card */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Profile</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900 font-medium truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => navigate("/patient/profile")}
                    className="w-full p-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default PatientDashboard;
