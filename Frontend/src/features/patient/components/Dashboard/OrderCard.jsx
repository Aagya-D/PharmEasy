import React from "react";
import { ShoppingBag, Clock, CheckCircle, AlertCircle } from "lucide-react";

export function OrderCard({ order, onViewDetails }) {
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return { 
          bg: "bg-yellow-50", 
          text: "text-yellow-800", 
          textColor: "#92400E",
          icon: Clock 
        };
      case "CONFIRMED":
        return { 
          bg: "bg-blue-50", 
          text: "text-blue-800", 
          textColor: "#1E40AF",
          icon: CheckCircle 
        };
      case "DELIVERED":
        return { 
          bg: "bg-green-50", 
          text: "text-green-800", 
          textColor: "#166534",
          icon: CheckCircle 
        };
      case "CANCELLED":
        return { 
          bg: "bg-red-50", 
          text: "text-red-800", 
          textColor: "#991B1B",
          icon: AlertCircle 
        };
      default:
        return { 
          bg: "bg-gray-50", 
          text: "text-gray-800", 
          textColor: "#374151",
          icon: ShoppingBag 
        };
    }
  };

  const statusInfo = getStatusColor(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div 
      className="p-4 bg-white border border-gray-200 rounded-lg transition-all duration-300 cursor-pointer hover:border-blue-500 hover:shadow-lg"
      onClick={() => onViewDetails?.(order.id)}
    >
      {/* Order Header */}
      <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <ShoppingBag size={20} />
          <span>Order #{order.id?.slice(-8)}</span>
        </div>
        <div className="text-sm text-gray-500">
          {new Date(order.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Order Content */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500">{order.items?.length || 1} items</p>
          <p className="font-medium text-gray-900 mt-1">{order.pharmacy?.name}</p>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}>
          <StatusIcon size={16} />
          <span>{order.status}</span>
        </div>
      </div>

      {/* Order Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium">Amount:</p>
          <p className="text-xl font-bold text-blue-600 mt-0.5">₹{order.total?.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
