import React from "react";
import { TrendingUp, TrendingDown, Package, AlertTriangle, CheckCircle, Search } from "lucide-react";

export default function PharmacyInventory() {
  const stats = [
    { title: "Total Items", value: "1,248", change: "+12%", trend: "up", icon: Package },
    { title: "Low Stock", value: "23", change: "-5%", trend: "down", icon: AlertTriangle },
    { title: "Fulfilled SOS", value: "156", change: "+28%", trend: "up", icon: CheckCircle },
    { title: "Revenue Today", value: "₹45,230", change: "+8%", trend: "up", icon: TrendingUp },
  ];

  const items = [
    { name: "Paracetamol 500mg", category: "Pain Relief", quantity: "250 units", price: "₹45", status: "In Stock" },
    { name: "Amoxicillin 250mg", category: "Antibiotic", quantity: "8 units", price: "₹120", status: "Low Stock" },
    { name: "Omeprazole 20mg", category: "Gastric", quantity: "0 units", price: "₹85", status: "Out of Stock" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-sm text-gray-500">Manage your pharmacy stock and medicines</p>
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
                  <stat.icon size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search medicines..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium">
              Add Medicine
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4">Medicine Name</th>
                  <th className="text-left px-6 py-4">Category</th>
                  <th className="text-left px-6 py-4">Quantity</th>
                  <th className="text-left px-6 py-4">Price</th>
                  <th className="text-left px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.name} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-gray-600">{item.price}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-600">
                        {item.status}
                      </span>
                    </td>
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
