import React, { useMemo, useState } from "react";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  MapPin,
  Store,
  Package,
  Truck,
} from "lucide-react";

export function OrderCard({ order, onViewDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-NP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) => {
    if (!value) return "Unknown date";
    return new Date(value).toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const shortOrderId = useMemo(() => {
    const token = String(order?.id || "").slice(-4).toUpperCase();
    const suffix = String(order?.id || "").slice(-8, -4).toUpperCase();
    return `#VNPO-${suffix || "0000"}${token ? `-${token}` : ""}`;
  }, [order?.id]);

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return { 
          bg: "bg-amber-50", 
          text: "text-amber-800", 
          icon: Clock 
        };
      case "ACCEPTED":
        return { 
          bg: "bg-emerald-50", 
          text: "text-emerald-800", 
          icon: CheckCircle2 
        };
      case "PREPARING":
        return { 
          bg: "bg-blue-50", 
          text: "text-blue-800", 
          icon: Package 
        };
      case "READY":
        return {
          bg: "bg-cyan-50",
          text: "text-cyan-800",
          icon: Truck,
        };
      case "COMPLETED":
        return { 
          bg: "bg-green-50", 
          text: "text-green-800", 
          icon: CheckCircle2 
        };
      case "CANCELLED":
        return { 
          bg: "bg-red-50", 
          text: "text-red-800", 
          icon: AlertCircle 
        };
      default:
        return { 
          bg: "bg-gray-50", 
          text: "text-gray-800", 
          icon: ShoppingBag 
        };
    }
  };

  const timeline = ["PENDING", "ACCEPTED", "PREPARING", "READY", "COMPLETED"];
  const statusInfo = getStatusColor(order.status);
  const StatusIcon = statusInfo.icon;
  const currentStatusIndex = timeline.indexOf(String(order?.status || "").toUpperCase());
  const items = Array.isArray(order?.items) ? order.items : [];
  const pharmacyName = order?.pharmacy?.pharmacyName || "Pharmacy pending";
  const deliveryAddress = order?.deliveryAddress || "Address unavailable";
  const totalAmount = Number(order?.totalAmount || 0);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <ShoppingBag size={18} className="text-blue-600" />
              <span>{shortOrderId}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Placed on {formatDate(order?.createdAt)}</p>
          </div>
          <div className={`inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
            <StatusIcon size={14} />
            <span>{String(order?.status || "PENDING").replaceAll("_", " ")}</span>
          </div>
        </div>

        <div className="py-4 space-y-3 border-b border-slate-100">
          {items.length > 0 ? items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {item.medicineName || item.inventory?.name || "Medicine"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.medicineName || item.inventory?.name || "Medicine"} x {item.quantity || 1}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-700">
                {formatCurrency(item.unitPrice || item.lineTotal || 0)}
              </p>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No order items available.</p>
          )}
        </div>

        <div className="pt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <Store size={15} className="mt-0.5 text-slate-400" />
              <span>{pharmacyName}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700">
              <MapPin size={15} className="mt-0.5 text-slate-400" />
              <span className="leading-6">{deliveryAddress}</span>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total Amount</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Track Order
            <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`} />
          </button>
          {typeof onViewDetails === "function" && (
            <button
              type="button"
              onClick={() => onViewDetails(order.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View Details
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery Timeline</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {timeline.map((step, index) => {
                const isCompleted = currentStatusIndex >= index && currentStatusIndex !== -1;
                const isCurrent = String(order?.status || "").toUpperCase() === step;

                return (
                  <div key={step} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-slate-400"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isCurrent ? "text-slate-900" : "text-slate-500"}`}>
                        {step.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {isCurrent ? "Current stage" : isCompleted ? "Completed" : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
