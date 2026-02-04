import React from "react";
import { TrendingUp, TrendingDown, ClipboardList } from "lucide-react";

export default function PharmacyOrders() {
  const stats = [
    { title: "Total Orders", value: "482", change: "+9%", trend: "up" },
    { title: "Pending", value: "18", change: "-4%", trend: "down" },
    { title: "Fulfilled", value: "438", change: "+12%", trend: "up" },
    { title: "Revenue", value: "₹1.2L", change: "+6%", trend: "up" },
  ];

  const orders = [
    { id: "ORD-1203", customer: "Aarav Mehta", status: "Pending", total: "₹560" },
    { id: "ORD-1202", customer: "Nia Sharma", status: "Delivered", total: "₹1,240" },
    { id: "ORD-1201", customer: "Rahul Verma", status: "Shipped", total: "₹420" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Track incoming and fulfilled orders</p>
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
                  <ClipboardList size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4">Order ID</th>
                  <th className="text-left px-6 py-4">Customer</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                    <td className="px-6 py-4 text-gray-600">{order.customer}</td>
                    <td className="px-6 py-4 text-gray-600">{order.status}</td>
                    <td className="px-6 py-4 text-gray-600">{order.total}</td>
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
