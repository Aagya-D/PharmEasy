import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CircleDollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  Siren,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { AnnouncementBanner } from "../../../shared/components/AnnouncementBanner";
import { getDashboardStats, getAnalyticsData } from "../../../core/services/pharmacy.service";
import httpClient from "../../../core/services/httpClient";

const STATUS_TABS = [
  { label: "All Orders", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Ready", value: "READY" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const DONUT_COLORS = ["#4f46e5", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#64748b"];

const STATUS_PILL = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-indigo-100 text-indigo-700",
  READY: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function StatCard({ title, value, subtitle, icon: Icon, iconClass, loading }) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-20 rounded bg-slate-300" />
        <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-2 ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function PharmacyDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats, recent orders, and analytics together so the dashboard updates in one pass.
      const [dashboardRes, ordersRes, analyticsRes] = await Promise.allSettled([
        getDashboardStats(),
        httpClient.get("/pharmacy/orders", { params: { page: 1, limit: 40 } }),
        getAnalyticsData(),
      ]);

      if (dashboardRes.status === "fulfilled" && dashboardRes.value?.success) {
        const payload = dashboardRes.value.data || {};
        setStats(payload.stats || null);
        setInventory(Array.isArray(payload.inventory) ? payload.inventory : []);
      } else {
        setStats(null);
        setInventory([]);
      }

      if (ordersRes.status === "fulfilled") {
        const list = ordersRes.value?.data?.data?.orders || [];
        setOrders(Array.isArray(list) ? list : []);
      } else {
        setOrders([]);
      }

      if (analyticsRes.status === "fulfilled" && analyticsRes.value?.success) {
        const series = analyticsRes.value?.data?.dailyRevenue;
        setDailyRevenue(Array.isArray(series) ? series : []);
      } else {
        setDailyRevenue([]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const id = window.setInterval(loadDashboard, 30000);
    return () => window.clearInterval(id);
  }, []);

  const data = useMemo(() => {
    // Normalize the raw API payload into the exact cards and charts this page renders.
    const pendingOrders = Number(stats?.pendingOrders || 0);
    const fulfilledOrders = Number(stats?.fulfilledOrders || 0);
    const outOfStock = Number(stats?.outOfStock || 0);
    const lowStock = Number(stats?.lowStock || 0);
    const pendingSOS = Number(stats?.pendingSOS || 0);

    const cards = [
      {
        title: "Orders",
        value: Number(stats?.totalOrders || 0).toLocaleString(),
        subtitle: `${pendingOrders} pending, ${fulfilledOrders} fulfilled`,
        icon: ShoppingCart,
        iconClass: "bg-blue-50 text-blue-600",
      },
      {
        title: "Stock Units",
        value: Number(stats?.totalItems || 0).toLocaleString(),
        subtitle: `${Number(stats?.totalMedicines || 0)} medicine lines`,
        icon: Package,
        iconClass: "bg-violet-50 text-violet-600",
      },
      {
        title: "Inventory Value",
        value: `Rs. ${Number(stats?.totalValue || 0).toLocaleString()}`,
        subtitle: "Live valuation from inventory",
        icon: CircleDollarSign,
        iconClass: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "Urgent Alerts",
        value: pendingSOS.toLocaleString(),
        subtitle: `${outOfStock} out of stock, ${lowStock} low stock`,
        icon: Siren,
        iconClass: "bg-red-50 text-red-600",
      },
    ];

    // The table only shows the currently selected status bucket.
    const filteredOrders = activeTab === "ALL"
      ? orders
      : orders.filter((order) => String(order.status || "").toUpperCase() === activeTab);

    const orderRows = filteredOrders.map((order) => ({
      id: order.id,
      patient: order.patient?.name || "Unknown",
      amount: Number(order.totalAmount || 0),
      status: String(order.status || "PENDING").toUpperCase(),
      paymentMethod: String(order.paymentMethod || "N/A").replaceAll("_", " "),
      createdAt: order.createdAt,
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
    }));

    // Count payment methods so the side panel reflects actual order volume.
    const paymentMap = orders.reduce(
      (acc, order) => {
        const key = String(order.paymentMethod || "UNKNOWN").toUpperCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    const paymentChannels = Object.entries(paymentMap)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    // Build the status split from the full order list, not just the filtered table rows.
    const statusMap = orders.reduce(
      (acc, order) => {
        const key = String(order.status || "PENDING").toUpperCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    const statusDonut = Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Lowest-stock items are surfaced first so the most urgent issues stay visible.
    const stockAlerts = [...inventory]
      .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        qty: Number(item.quantity || 0),
        expiry: item.expiryDate,
      }));

    // Keep a short live feed focused on the actions the pharmacy needs to react to.
    const recentActivity = [
      orders[0]
        ? {
            id: "oa",
            title: "Latest order received",
            detail: `${orders[0].patient?.name || "Patient"} placed order ${orders[0].id.slice(0, 10)}...`,
            when: new Date(orders[0].createdAt).toLocaleString(),
          }
        : null,
      pendingSOS > 0
        ? {
            id: "sos",
            title: "Pending SOS queue",
            detail: `${pendingSOS} SOS requests need response from your pharmacy.`,
            when: "Live",
          }
        : null,
      lowStock > 0
        ? {
            id: "low",
            title: "Low stock warning",
            detail: `${lowStock} medicines are at low quantity.`,
            when: "Live",
          }
        : null,
    ].filter(Boolean);

    return {
      cards,
      orderRows,
      paymentChannels,
      statusDonut,
      stockAlerts,
      recentActivity,
      trendSeries: dailyRevenue,
    };
  }, [activeTab, dailyRevenue, inventory, orders, stats]);

  return (
    <div className="min-h-screen bg-[#eef2f7] px-4 py-5 sm:px-6">
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle size={18} className="mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mb-4">
        <AnnouncementBanner targetRole="PHARMACY" />
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Real-time operations overview for your pharmacy</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:flex">
              <CalendarClock size={14} />
              {lastUpdated
                ? `${lastUpdated.toLocaleDateString()} ${lastUpdated.toLocaleTimeString()}`
                : "Waiting for sync"}
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            iconClass={card.iconClass}
            loading={loading}
          />
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Order History</h2>
                <div className="flex flex-wrap gap-2">
                  {STATUS_TABS.map((tab) => {
                    const active = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-[15px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading live orders...</td>
                    </tr>
                  ) : data.orderRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No orders found for this filter.</td>
                    </tr>
                  ) : (
                    data.orderRows.slice(0, 5).map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3.5 font-medium text-slate-900">#{row.id.slice(0, 10)}...</td>
                        <td className="px-4 py-3.5 text-slate-700">{row.patient}</td>
                        <td className="px-4 py-3.5 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[row.status] || "bg-slate-100 text-slate-700"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-900">Rs. {row.amount.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-slate-600">{row.paymentMethod}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Revenue Trend</h2>
            </div>
            <div className="h-[280px]">
              {data.trendSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trendSeries}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenueFill)" strokeWidth={2} />
                    <Area type="monotone" dataKey="orders" stroke="#0ea5e9" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                  No trend data available yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-semibold text-slate-900">Live Activity</h3>
            <div className="mt-3 space-y-3">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">No live activities yet.</p>
              ) : (
                data.recentActivity.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-400">{item.when}</p>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-semibold text-slate-900">Payment Channels</h3>
            <div className="mt-3 space-y-2">
              {data.paymentChannels.length === 0 ? (
                <p className="text-sm text-slate-500">No payment data yet.</p>
              ) : (
                data.paymentChannels.map((item) => (
                  <div key={item.method} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-700">{item.method.replaceAll("_", " ")}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-semibold text-slate-900">Order Status Split</h3>
            <div className="mt-3 h-[220px]">
              {data.statusDonut.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.statusDonut} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                      {data.statusDonut.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No status data yet.</div>
              )}
            </div>
            <div className="mt-1 space-y-1">
              {data.statusDonut.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                    {item.name}
                  </div>
                  <span className="font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <TriangleAlert size={16} className="text-amber-600" />
              <h3 className="text-base font-semibold text-slate-900">Inventory Alerts</h3>
            </div>
            <div className="space-y-2">
              {data.stockAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">No inventory alerts right now.</p>
              ) : (
                data.stockAlerts.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Qty: {item.qty} | Exp: {item.expiry ? new Date(item.expiry).toLocaleDateString() : "N/A"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
