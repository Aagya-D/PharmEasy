import React from "react";
import { Heart, MapPin, Package, Clock, Pill, FileText } from "lucide-react";

export function QuickStats({ stats }) {
  const defaultStats = [
    { label: "Active Prescriptions", value: "3", icon: FileText, color: "#2563eb", bgColor: "#dbeafe" },
    { label: "Pending Orders", value: "2", icon: Clock, color: "#f59e0b", bgColor: "#fef3c7" },
    { label: "Medications", value: "8", icon: Pill, color: "#0d9488", bgColor: "#ccfbf1" },
    { label: "Nearby Pharmacies", value: "12", icon: MapPin, color: "#10b981", bgColor: "#d1fae5" },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {displayStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-slate-200"
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 shadow-sm"
              style={{ backgroundColor: stat.bgColor || `${stat.color}20` }}
            >
              <Icon size={24} style={{ color: stat.color }} />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
