import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

const CHART_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

function TileSkeleton({ className = "h-36" }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-8 w-16 rounded bg-slate-300" />
      <div className="mt-4 h-3 w-32 rounded bg-slate-200" />
    </div>
  );
}

function StatCard({ item }) {
  const Icon = item.icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg || "bg-blue-50"}`}>
          <Icon size={22} className={item.iconColor || "text-blue-600"} />
        </div>
        <div>
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="text-2xl font-bold text-slate-900">{item.value}</p>
          {item.subtext && <p className="text-xs text-slate-400">{item.subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function EmptyTile({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-xs">{description}</p>
    </div>
  );
}

export default function DashboardHome({
  loading = false,
  quickStats = [],
  usersSummary,
  pieTitle = "Inventory/Pharmacy Values",
  pieData = [],
  barTitle = "Top Performance",
  barData = [],
  trendTitle = "Expense vs Profit",
  trendData = [],
}) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <TileSkeleton />
            <TileSkeleton />
            <TileSkeleton />
            <TileSkeleton />
          </>
        ) : (
          quickStats.map((item) => <StatCard key={item.label} item={item} />)
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
          {loading ? (
            <TileSkeleton className="h-[300px]" />
          ) : usersSummary ? (
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">No. of Users</p>
              <p className="mt-3 text-4xl font-bold text-slate-900">{usersSummary.value}</p>
              <p className="mt-2 text-sm text-slate-500">{usersSummary.hint}</p>
              {usersSummary.delta && (
                <span className="mt-4 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {usersSummary.delta}
                </span>
              )}
            </div>
          ) : (
            <EmptyTile title="No. of Users" description="User summary will appear once data is available." />
          )}
        </div>

        <div className="xl:col-span-5">
          {loading ? (
            <TileSkeleton className="h-[300px]" />
          ) : pieData.length > 0 ? (
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">{pieTitle}</p>
              <div className="mt-3 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                      {pieData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyTile title={pieTitle} description="Pie chart will render when values are available." />
          )}
        </div>

        <div className="xl:col-span-4">
          {loading ? (
            <TileSkeleton className="h-[300px]" />
          ) : barData.length > 0 ? (
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">{barTitle}</p>
              <div className="mt-3 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    <Bar dataKey="value" fill="#2563EB" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyTile title={barTitle} description="Performance data will appear here." />
          )}
        </div>
      </section>

      <section>
        {loading ? (
          <TileSkeleton className="h-[340px]" />
        ) : trendData.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{trendTitle}</p>
            <div className="mt-3 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                  <Legend />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyTile title={trendTitle} description="Trend chart will appear when historical data is available." />
        )}
      </section>
    </div>
  );
}
