import React from "react";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

export default function PharmacyAnalytics() {
  const stats = [
    { title: "Monthly Revenue", value: "₹9.6L", change: "+11%", trend: "up" },
    { title: "Order Growth", value: "18%", change: "+3%", trend: "up" },
    { title: "Top Category", value: "Pain Relief", change: "+2%", trend: "up" },
    { title: "Refund Rate", value: "1.4%", change: "-0.2%", trend: "down" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Track performance and business trends</p>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div
                    className={`flex items-center gap-1 mt-2 text-sm ${
                      stat.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stat.trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{stat.change} from last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50">
                  <BarChart3 size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
          <div className="mt-4 h-64 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400">
            Chart placeholder (integrate analytics chart)
          </div>
        </div>
      </main>
    </div>
  );
}
