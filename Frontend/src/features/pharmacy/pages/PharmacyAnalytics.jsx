import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Pill,
  Siren,
  Loader,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import pharmacyService from "../../../core/services/pharmacy.service";

/**
 * Custom tooltip for the revenue chart
 */
const RevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        <p className="text-blue-600">
          Revenue: <span className="font-bold">NPR {payload[0]?.value?.toLocaleString()}</span>
        </p>
        {payload[1] && (
          <p className="text-emerald-600">
            Orders: <span className="font-bold">{payload[1]?.value}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function PharmacyAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pharmacyService.getAnalyticsData();
      setAnalytics(result.data);
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const stats = analytics
    ? [
        {
          title: "Monthly Revenue",
          value: `NPR ${analytics.stats.monthlyRevenue.toLocaleString()}`,
          change: `${analytics.stats.revenueGrowth >= 0 ? "+" : ""}${analytics.stats.revenueGrowth}%`,
          trend: analytics.stats.revenueGrowth >= 0 ? "up" : "down",
          icon: DollarSign,
          color: "blue",
        },
        {
          title: "Total Orders",
          value: analytics.stats.totalOrders.toLocaleString(),
          change: `${analytics.stats.currentMonthOrders} this month`,
          trend: "up",
          icon: ShoppingCart,
          color: "emerald",
        },
        {
          title: "Top Medicine",
          value: analytics.stats.topMedicine.name,
          change: analytics.stats.topMedicine.genericName,
          trend: "up",
          icon: Pill,
          color: "purple",
        },
        {
          title: "SOS Response Rate",
          value: `${analytics.stats.sosResponseRate}%`,
          change: `${analytics.stats.sosAccepted}/${analytics.stats.sosTotal} accepted`,
          trend: analytics.stats.sosResponseRate >= 50 ? "up" : "down",
          icon: Siren,
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">Track performance and business trends</p>
          </div>
          <button
            onClick={fetchAnalytics}
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
        {loading && !analytics && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader size={40} className="animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-medium">Calculating Insights...</p>
            <p className="text-sm text-gray-400 mt-1">Analyzing your sales data</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <AlertCircle size={40} className="text-red-400 mb-4" />
            <p className="text-lg font-medium text-red-600">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Data Loaded */}
        {analytics && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                const colors = colorMap[stat.color];
                return (
                  <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                        <div
                          className={`flex items-center gap-1 mt-2 text-sm ${
                            stat.trend === "up" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {stat.trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          <span className="truncate">{stat.change}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl ${colors.bg} flex-shrink-0`}>
                        <Icon size={24} className={colors.text} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Revenue Over Time</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Daily revenue for the last 30 days</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    Revenue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    Orders
                  </span>
                </div>
              </div>

              {analytics.dailyRevenue && analytics.dailyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={analytics.dailyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₨${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      dot={false}
                      activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      fill="transparent"
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <div className="text-center">
                    <BarChart3 size={40} className="mx-auto mb-2 text-gray-300" />
                    <p>No revenue data yet. Orders will appear here.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Orders Bar Chart (last 7 days) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Orders This Week</h2>
              <p className="text-sm text-gray-500 mb-6">Daily order count for the last 7 days</p>
              {analytics.dailyRevenue && analytics.dailyRevenue.length >= 7 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={analytics.dailyRevenue.slice(-7)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                      formatter={(value) => [`${value} orders`, 'Orders']}
                    />
                    <Bar dataKey="orders" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  Not enough data for weekly chart
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
