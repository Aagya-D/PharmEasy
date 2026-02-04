import React from "react";
import { Users, TrendingUp, TrendingDown } from "lucide-react";

export default function PharmacyCustomers() {
  const stats = [
    { title: "Total Customers", value: "1,284", change: "+5%", trend: "up" },
    { title: "Repeat Visits", value: "62%", change: "+2%", trend: "up" },
    { title: "New This Week", value: "84", change: "+8%", trend: "up" },
    { title: "Avg Rating", value: "4.8", change: "+0.1", trend: "up" },
  ];

  const customers = [
    { name: "Neha Rao", lastVisit: "2 days ago", orders: "12" },
    { name: "Vikram Singh", lastVisit: "5 days ago", orders: "8" },
    { name: "Ishita Kapoor", lastVisit: "1 week ago", orders: "5" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500">Manage your customer relationships</p>
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
                    <span>{stat.change} from last week</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50">
                  <Users size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4">Customer</th>
                  <th className="text-left px-6 py-4">Last Visit</th>
                  <th className="text-left px-6 py-4">Orders</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.name} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-gray-600">{customer.lastVisit}</td>
                    <td className="px-6 py-4 text-gray-600">{customer.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
