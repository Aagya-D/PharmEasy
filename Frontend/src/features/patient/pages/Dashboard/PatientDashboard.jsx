import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import { OrderCard } from "../../components/Dashboard/OrderCard";
import { AnnouncementBanner } from "../../../../shared/components/AnnouncementBanner";
import patientService from "../../services/patient.service";
import contentService from "../../../../core/services/content.service";
import { 
  Package, 
  MapPin, 
  FileText, 
  Pill, 
  Lightbulb, 
  Heart, 
  Clock, 
  Activity,
  TrendingUp,
  ShoppingBag,
  Sparkles
} from "lucide-react";

export function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State Management
  const [dashboardData, setDashboardData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [healthTip, setHealthTip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [tipLoading, setTipLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadOrders();
    loadHealthTip();
  }, []);

  const loadDashboardData = async () => {
    try {
      setStatsLoading(true);
      const response = await patientService.getDashboard();
      setDashboardData(response?.data || null);
    } catch (err) {
      console.error("[PATIENT DASHBOARD] Dashboard stats error:", err);
      setDashboardData(null);
    } finally {
      setStatsLoading(false);
      setIsLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await patientService.getOrders({ limit: 5 });
      setOrders(response?.data?.orders || []);
    } catch (err) {
      console.error("[PATIENT DASHBOARD] Load orders error:", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadHealthTip = async () => {
    try {
      setTipLoading(true);
      const response = await contentService.getLatestHealthTip();
      if (response?.success && response?.data) {
        setHealthTip(response.data);
      }
    } catch (err) {
      console.error("[PATIENT DASHBOARD] Error loading health tip:", err);
      setHealthTip(null);
    } finally {
      setTipLoading(false);
    }
  };

  // Extract stats from dashboard data
  const stats = {
    activePrescriptions: dashboardData?.stats?.prescriptions || 0,
    pendingOrders: orders?.filter(order => order?.status === 'PENDING')?.length || 0,
    medications: dashboardData?.stats?.medications || 0,
    totalOrders: dashboardData?.stats?.totalOrders || 0,
  };

  // Get user first name with null safety
  const firstName = user?.name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'Patient';

  // Skeleton Loader Component
  const StatCardSkeleton = () => (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-slate-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header - Premium Design */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-blue-500" size={28} />
            <h1 className="text-4xl font-bold text-slate-900">
              Welcome back, {firstName}!
            </h1>
          </div>
          <p className="text-slate-600 text-lg font-medium ml-11">
            Your health journey continues today
          </p>
        </div>

        {/* Announcement Banner */}
        <AnnouncementBanner targetRole="PATIENT" className="mb-6" />

        {/* Classy Stats Cards - Soft UI with Gradients */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Active Prescriptions */}
              <div className="group bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-sm hover:shadow-lg border border-blue-100 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md group-hover:shadow-xl transition-all">
                    <FileText className="text-white" size={28} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm text-slate-600 font-semibold mb-1">Active Prescriptions</p>
                    <p className="text-4xl font-bold text-slate-900">{stats.activePrescriptions}</p>
                  </div>
                </div>
              </div>

              {/* Pending Orders */}
              <div className="group bg-gradient-to-br from-amber-50 to-white rounded-2xl shadow-sm hover:shadow-lg border border-amber-100 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-md group-hover:shadow-xl transition-all">
                    <Clock className="text-white" size={28} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm text-slate-600 font-semibold mb-1">Pending Orders</p>
                    <p className="text-4xl font-bold text-slate-900">{stats.pendingOrders}</p>
                  </div>
                </div>
              </div>

              {/* Active Medications */}
              <div className="group bg-gradient-to-br from-teal-50 to-white rounded-2xl shadow-sm hover:shadow-lg border border-teal-100 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-md group-hover:shadow-xl transition-all">
                    <Pill className="text-white" size={28} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm text-slate-600 font-semibold mb-1">Medications</p>
                    <p className="text-4xl font-bold text-slate-900">{stats.medications}</p>
                  </div>
                </div>
              </div>

              {/* Total Orders */}
              <div className="group bg-gradient-to-br from-emerald-50 to-white rounded-2xl shadow-sm hover:shadow-lg border border-emerald-100 p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-md group-hover:shadow-xl transition-all">
                    <Activity className="text-white" size={28} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm text-slate-600 font-semibold mb-1">Total Orders</p>
                    <p className="text-4xl font-bold text-slate-900">{stats.totalOrders}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders - Main Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                    <ShoppingBag className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Recent Orders</h2>
                    <p className="text-sm text-slate-500">Track your medication orders</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/patient/orders")}
                  className="px-5 py-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl font-semibold transition-all border border-blue-200 hover:border-blue-300"
                >
                  View All →
                </button>
              </div>

              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-slate-100 rounded-2xl">
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders?.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order?.id}
                      order={order}
                      onViewDetails={(id) => navigate(`/patient/orders/${id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-slate-300">
                  <div className="relative inline-block mb-4">
                    <Package size={80} className="text-slate-300" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Sparkles className="text-white" size={16} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">No orders yet</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Start your healthcare journey by finding pharmacies near you and ordering your medications
                  </p>
                  <button
                    onClick={() => navigate("/search")}
                    className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Search Pharmacies
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions Card - Mobile-First Grid Design */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-lg mb-5 flex items-center gap-2">
                <TrendingUp size={22} className="text-blue-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => navigate("/medicine-search")}
                  className="group w-full p-5 bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 font-semibold rounded-2xl transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                    <Pill size={24} className="text-blue-600" />
                  </div>
                  <span className="text-base">Find Medicines</span>
                </button>
                
                <button
                  onClick={() => navigate("/search")}
                  className="group w-full p-5 bg-gradient-to-br from-teal-50 via-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 text-teal-700 font-semibold rounded-2xl transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                    <MapPin size={24} className="text-teal-600" />
                  </div>
                  <span className="text-base">Search Medicine</span>
                </button>
                
                <button
                  onClick={() => navigate("/nearby-pharmacies")}
                  className="group w-full p-5 bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-700 font-semibold rounded-2xl transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                    <MapPin size={24} className="text-orange-600" />
                  </div>
                  <span className="text-base">Nearby Pharmacies</span>
                </button>
                
                <button
                  onClick={() => navigate("/patient/prescriptions")}
                  className="group w-full p-5 bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700 font-semibold rounded-2xl transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                    <FileText size={24} className="text-purple-600" />
                  </div>
                  <span className="text-base">My Prescriptions</span>
                </button>
                
                <button
                  onClick={() => navigate("/patient/medications")}
                  className="group w-full p-5 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 text-emerald-700 font-semibold rounded-2xl transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                    <Package size={24} className="text-emerald-600" />
                  </div>
                  <span className="text-base">Medication History</span>
                </button>
              </div>
            </div>

            {/* Featured Health Insight - CMS Integration */}
            <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-2xl shadow-sm p-6 border-2 border-amber-200 overflow-hidden">
              {/* Decorative Background Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-2xl"></div>
              
              <div className="relative flex items-start gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-md">
                  <Lightbulb className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  {tipLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-6 bg-amber-200 rounded w-2/3"></div>
                      <div className="h-4 bg-amber-100 rounded"></div>
                      <div className="h-4 bg-amber-100 rounded w-5/6"></div>
                    </div>
                  ) : healthTip ? (
                    <>
                      <h3 className="font-bold text-slate-900 mb-3 text-xl flex items-center gap-2">
                        <Sparkles className="text-amber-600" size={20} />
                        {healthTip?.title || 'Health Tip'}
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed mb-4">
                        {healthTip?.content}
                      </p>
                      {healthTip?.category && (
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-block px-3 py-1.5 bg-white/80 backdrop-blur-sm text-amber-700 text-xs font-bold rounded-full border border-amber-200 shadow-sm">
                            {healthTip.category}
                          </span>
                        </div>
                      )}
                      <button 
                        className="mt-4 text-sm font-semibold text-amber-700 hover:text-amber-800 underline decoration-2 underline-offset-4"
                      >
                        Read More →
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-slate-900 mb-3 text-xl flex items-center gap-2">
                        <Sparkles className="text-amber-600" size={20} />
                        Health Tip of the Day
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed mb-4">
                        Take your medications at the same time daily for better effectiveness. Set phone reminders to help maintain consistency and improve treatment outcomes.
                      </p>
                      <span className="inline-block px-3 py-1.5 bg-white/80 backdrop-blur-sm text-amber-700 text-xs font-bold rounded-full border border-amber-200 shadow-sm">
                        💊 Medication Tips
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Card - Premium Gradient Design */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white border border-slate-700">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-xl font-bold">
                    {firstName?.[0]?.toUpperCase() || 'P'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">My Profile</h3>
                  <p className="text-xs text-slate-400">Patient Information</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <p className="text-xs text-slate-300 mb-1 font-medium">Full Name</p>
                  <p className="text-white font-semibold truncate">{user?.name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <p className="text-xs text-slate-300 mb-1 font-medium">Email Address</p>
                  <p className="text-white font-medium truncate text-sm">{user?.email || 'N/A'}</p>
                </div>
                <button
                  onClick={() => navigate("/patient/profile")}
                  className="w-full p-4 text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  View Full Profile →
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
