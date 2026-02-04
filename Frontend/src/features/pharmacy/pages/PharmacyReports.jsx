import React from "react";
import { FileText, TrendingUp, TrendingDown } from "lucide-react";

export default function PharmacyReports() {
  const stats = [
    { title: "Reports Generated", value: "24", change: "+6%", trend: "up" },
    { title: "Compliance Score", value: "98%", change: "+1%", trend: "up" },
    { title: "Pending Reviews", value: "3", change: "-2%", trend: "down" },
    { title: "Exports", value: "12", change: "+4%", trend: "up" },
  ];

  const reports = [
    { name: "Monthly Sales", period: "Jan 2026", status: "Ready" },
    { name: "Inventory Audit", period: "Week 05", status: "Processing" },
    { name: "Tax Summary", period: "FY 2025-26", status: "Ready" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Export and review operational reports</p>
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
                  <FileText size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
            <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium">
              Export Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4">Report</th>
                  <th className="text-left px-6 py-4">Period</th>
                  <th className="text-left px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.name} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{report.name}</td>
                    <td className="px-6 py-4 text-gray-600">{report.period}</td>
                    <td className="px-6 py-4 text-gray-600">{report.status}</td>
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
