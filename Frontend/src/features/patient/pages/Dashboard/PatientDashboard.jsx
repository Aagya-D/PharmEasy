import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import { QuickStats } from "../../components/Dashboard/QuickStats";
import { OrderCard } from "../../components/Dashboard/OrderCard";
import { AnnouncementBanner } from "../../../../shared/components/AnnouncementBanner";
import patientService from "../../services/patient.service";
import contentService from "../../../../core/services/content.service";
import { Package, MapPin, FileText, Pill, Lightbulb, Heart } from "lucide-react";

export function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [healthTip, setHealthTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tipLoading, setTipLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadHealthTip();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await patientService.getOrders({ limit: 5 });
      setOrders(response.data?.orders || []);
    } catch (err) {
      // Handle error gracefully - log but don't break UI
      console.error("[PATIENT DASHBOARD] Load error:", err);
      
      // Set empty orders array to show the "No orders yet" message
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthTip = async () => {
    try {
      setTipLoading(true);
      const response = await contentService.getLatestHealthTip();
      if (response.success && response.data) {
        setHealthTip(response.data);
      }
    } catch (err) {
      console.error("[PATIENT DASHBOARD] Error loading health tip:", err);
      // Use fallback tip if API fails
      setHealthTip(null);
    } finally {
      setTipLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'Patient'}! 👋
          </h1>
          <p className="text-slate-600 text-lg">Here's your health overview for today</p>
        </div>

        {/* Announcement Banner */}
        <AnnouncementBanner targetRole="PATIENT" className="mb-6" />

        {/* Quick Stats */}
        <div className="mb-8">
          <QuickStats />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders - Main Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Package className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Recent Orders</h2>
                    <p className="text-sm text-slate-500">Track your medication orders</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/patient/orders")}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-semibold transition-colors"
                >
                  View All →
                </button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-slate-100 rounded-xl">
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
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
                <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Package size={64} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No orders yet</h3>
                  <p className="text-slate-600 mb-6">Start your healthcare journey by finding pharmacies near you</p>
                  <button
                    onClick={() => navigate("/search")}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
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
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                <Heart size={20} className="text-teal-600" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/medicine-search")}
                  className="w-full p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 font-semibold rounded-xl transition-all flex items-center gap-3 text-left shadow-sm hover:shadow-md"
                >
                  <Pill size={20} />
                  <span>Find Medicines</span>
                </button>
                <button
                  onClick={() => navigate("/search")}
                  className="w-full p-4 bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 text-teal-700 font-semibold rounded-xl transition-all flex items-center gap-3 text-left shadow-sm hover:shadow-md"
                >
                  <MapPin size={20} />
                  <span>Find Pharmacies</span>
                </button>
                <button
                  onClick={() => navigate("/patient/prescriptions")}
                  className="w-full p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700 font-semibold rounded-xl transition-all flex items-center gap-3 text-left shadow-sm hover:shadow-md"
                >
                  <FileText size={20} />
                  <span>My Prescriptions</span>
                </button>
                <button
                  onClick={() => navigate("/patient/medications")}
                  className="w-full p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 text-emerald-700 font-semibold rounded-xl transition-all flex items-center gap-3 text-left shadow-sm hover:shadow-md"
                >
                  <Package size={20} />
                  <span>Medication History</span>
                </button>
              </div>
            </div>

            {/* Health Tips Card */}
            <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Lightbulb className="text-yellow-600" size={24} />
                </div>
                <div className="flex-1">
                  {tipLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  ) : healthTip ? (
                    <>
                      <h3 className="font-bold text-slate-900 mb-2 text-lg">
                        💡 {healthTip.title}
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {healthTip.content}
                      </p>
                      {healthTip.category && (
                        <span className="inline-block mt-3 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {healthTip.category}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-slate-900 mb-2 text-lg">💡 Health Tip of the Day</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Take your medications at the same time daily for better effectiveness. Set phone reminders to help maintain consistency and improve treatment outcomes.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4">Profile</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Patient Name</p>
                  <p className="text-slate-900 font-semibold">{user?.name || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Email</p>
                  <p className="text-slate-900 font-medium truncate text-sm">{user?.email || 'N/A'}</p>
                </div>
                <button
                  onClick={() => navigate("/patient/profile")}
                  className="w-full p-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                >
                  View Full Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;
