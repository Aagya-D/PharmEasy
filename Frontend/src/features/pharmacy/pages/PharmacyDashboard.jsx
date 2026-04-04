import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Package,
  ShoppingCart,
  Siren,
  AlertTriangle,
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
  Legend,
  LineChart,
  Line,
} from "recharts";
import { AnnouncementBanner } from "../../../shared/components/AnnouncementBanner";
import { getDashboardStats } from "../../../core/services/pharmacy.service";
import httpClient from "../../../core/services/httpClient";

const PIE_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"];

function MiniSparkline({ data, color }) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildSparkline(seed, multiplier = 1) {
  return [1, 2, 3, 4, 5, 6, 7].map((n, index) => ({
    name: `D${n}`,
    value: Math.max(seed + (index - 3) * multiplier + (index % 2 === 0 ? multiplier : -multiplier), 1),
  }));
}

export default function PharmacyDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, ordersRes] = await Promise.allSettled([
          getDashboardStats(),
          httpClient.get("/pharmacy/orders", { params: { page: 1, limit: 8 } }),
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
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const dashboard = useMemo(() => {
    const totalStock = stats?.totalItems || 0;
    const totalOrders = stats?.totalOrders || 0;
    const pendingSOS = stats?.pendingSOS || 0;
    const outOfStock = stats?.outOfStock || 0;
    const lowStock = stats?.lowStock || 0;

    const topInventory = [...inventory]
      .sort((a, b) => (b?.quantity || 0) - (a?.quantity || 0))
      .slice(0, 5)
      .map((item) => ({
        name: item?.name || item?.medicine || "Medicine",
        value: item?.quantity || 0,
      }));

    const trendData = (stats?.monthlyTrend || []).map((entry, index) => ({
      name: entry?.label || entry?.month || `M${index + 1}`,
      revenue: Number(entry?.fulfilled || 0) * 120,
      orders: Number(entry?.orders || 0),
    }));

    const revenueOrderTrend = trendData.length
      ? trendData
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => ({
          name: month,
          revenue: 250 + index * 45 + (index % 2 ? 20 : -10),
          orders: 10 + index * 2,
        }));

    const distribution = [
      { name: "In Stock", value: Math.max((stats?.totalMedicines || 0) - lowStock - outOfStock, 0) },
      { name: "Low Stock", value: lowStock },
      { name: "Out of Stock", value: outOfStock },
      { name: "Pending SOS", value: pendingSOS },
    ].filter((item) => item.value > 0);

    const recentActivities = [
      {
        id: "a1",
        title: "Inventory synced",
        detail: `${inventory.length} products refreshed from latest stock.`,
        when: "Just now",
        color: "bg-blue-500",
      },
      {
        id: "a2",
        title: "Order pipeline updated",
        detail: `${stats?.pendingOrders || 0} orders pending action.`,
        when: "15 min ago",
        color: "bg-violet-500",
      },
      {
        id: "a3",
        title: "SOS queue reviewed",
        detail: `${pendingSOS} urgent requests currently open.`,
        when: "1 hr ago",
        color: "bg-red-500",
      },
      {
        id: "a4",
        title: "Stock alert generated",
        detail: `${outOfStock} medicines out of stock and ${lowStock} low stock.`,
        when: "Today",
        color: "bg-amber-500",
      },
    ];

    const orderRows = orders.map((order) => ({
      id: order.id,
      patient: order.patient?.name || "Unknown",
      amount: order.totalAmount || 0,
      status: order.status || "PENDING",
      country: "Nepal",
    }));

    return {
      cards: [
        {
          title: "Total Stock",
          value: totalStock.toLocaleString(),
          subtitle: `${stats?.totalMedicines || 0} medicine lines`,
          icon: Package,
          color: "#3B82F6",
          spark: buildSparkline(Math.max(totalStock / 20, 3), 1),
        },
        {
          title: "Orders",
          value: totalOrders.toLocaleString(),
          subtitle: `${stats?.pendingOrders || 0} pending`,
          icon: ShoppingCart,
          color: "#8B5CF6",
          spark: buildSparkline(Math.max(totalOrders / 4, 4), 1),
        },
        {
          title: "Pending SOS",
          value: pendingSOS.toLocaleString(),
          subtitle: "Needs immediate response",
          icon: Siren,
          color: "#EF4444",
          spark: buildSparkline(Math.max(pendingSOS + 3, 3), 0.8),
        },
        {
          title: "Out of Stock",
          value: outOfStock.toLocaleString(),
          subtitle: `${lowStock} low stock warnings`,
          icon: AlertTriangle,
          color: "#F59E0B",
          spark: buildSparkline(Math.max(outOfStock + 2, 3), 0.7),
        },
      ],
      revenueOrderTrend,
      distribution,
      topInventory,
      recentActivities,
      orderRows,
    };
  }, [inventory, orders, stats]);

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-6 py-6">
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle size={18} className="mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mb-5">
        <AnnouncementBanner targetRole="PHARMACY" />
      </div>

      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(loading ? [1, 2, 3, 4] : dashboard.cards).map((card, idx) => {
            if (loading) {
              return (
                <div key={`s-${idx}`} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="mt-3 h-8 w-16 rounded bg-slate-300" />
                  <div className="mt-2 h-3 w-28 rounded bg-slate-200" />
                  <div className="mt-3 h-12 rounded bg-slate-100" />
                </div>
              );
            }

            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{card.title}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                    <p className="text-xs text-slate-400">{card.subtitle}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2" style={{ color: card.color }}>
                    <Icon size={18} />
                  </div>
                </div>
                <div className="mt-3">
                  <MiniSparkline data={card.spark} color={card.color} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
            <p className="text-sm font-semibold text-slate-700">Revenue / Order Trend</p>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.revenueOrderTrend}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ordFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" fill="url(#revFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="orders" stroke="#3B82F6" fill="url(#ordFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <p className="text-sm font-semibold text-slate-700">Pharmacy Distribution</p>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {dashboard.distribution.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Recent Activities</p>
            </div>
            <div className="mt-4 space-y-4">
              {dashboard.recentActivities.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span className="mt-1 h-full w-px bg-slate-200" />
                  </div>
                  <div className="pb-2">
                    <p className="text-xs text-slate-400">{item.when}</p>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
            <p className="text-sm font-semibold text-slate-700">Live Order Status</p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-xs uppercase tracking-wide text-slate-100">
                    <th className="px-3 py-2 text-left">Invoice</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">Price</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.orderRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                        No live orders yet.
                      </td>
                    </tr>
                  ) : (
                    dashboard.orderRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{row.id.slice(0, 10)}...</td>
                        <td className="px-3 py-2 text-slate-700">{row.patient}</td>
                        <td className="px-3 py-2 text-slate-500">{row.country}</td>
                        <td className="px-3 py-2 font-medium text-slate-700">Rs. {Number(row.amount).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            row.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : row.status === "ACCEPTED" || row.status === "READY"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {dashboard.topInventory.length > 0 && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Inventory (By Quantity)</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {dashboard.topInventory.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                      <span className="truncate pr-2 text-slate-700">{item.name}</span>
                      <span className="font-semibold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
