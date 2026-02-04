import React from "react";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function PharmacySOSRequests() {
  const stats = [
    { title: "Open Requests", value: "6", change: "+2%", trend: "up" },
    { title: "Resolved Today", value: "14", change: "+10%", trend: "up" },
    { title: "Avg Response", value: "6 min", change: "-1%", trend: "down" },
    { title: "Escalations", value: "2", change: "+1%", trend: "up" },
  ];

  const requests = [
    { id: "SOS-204", patient: "Meera Iyer", status: "Open", location: "Indiranagar" },
    { id: "SOS-203", patient: "Amit Khanna", status: "In Progress", location: "Koramangala" },
    { id: "SOS-202", patient: "Sara Ali", status: "Resolved", location: "HSR Layout" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">SOS Requests</h1>
        <p className="text-sm text-gray-500">Respond quickly to urgent patient requests</p>
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
                <div className="p-3 rounded-xl bg-red-50">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Active Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4">Request ID</th>
                  <th className="text-left px-6 py-4">Patient</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Location</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{req.id}</td>
                    <td className="px-6 py-4 text-gray-600">{req.patient}</td>
                    <td className="px-6 py-4 text-gray-600">{req.status}</td>
                    <td className="px-6 py-4 text-gray-600">{req.location}</td>
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
