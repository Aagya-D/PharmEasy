import React from "react";
import { Heart, MapPin, Package, Clock } from "lucide-react";

export function QuickStats({ stats }) {
  const defaultStats = [
    { label: "Active Prescriptions", value: "3", icon: Package, color: "#3B82F6" },
    { label: "Pending Orders", value: "2", icon: Clock, color: "#F59E0B" },
    { label: "Favorite Pharmacies", value: "5", icon: Heart, color: "#EF4444" },
    { label: "Nearby Pharmacies", value: "12", icon: MapPin, color: "#10B981" },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {displayStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="flex items-center gap-4 p-6 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            style={{ borderLeftColor: stat.color }}
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-md flex-shrink-0"
              style={{ backgroundColor: `${stat.color}20` }}
            >
              <Icon size={24} style={{ color: stat.color }} />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
