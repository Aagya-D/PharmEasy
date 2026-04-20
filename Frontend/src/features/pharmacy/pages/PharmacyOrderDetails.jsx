import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  Pill,
  Receipt,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import pharmacyService from "../../../core/services/pharmacy.service";

const STATUS_STEPS = ["PENDING", "ACCEPTED", "PREPARING", "READY", "COMPLETED"];

const STATUS_THEME = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-blue-100 text-blue-700 border-blue-200",
  PREPARING: "bg-indigo-100 text-indigo-700 border-indigo-200",
  READY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const ORDER_ITEM_STATUS_THEME = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-indigo-100 text-indigo-700",
  READY: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
};

const getOrderItemStatusLabel = (status) => {
  const normalizedStatus = String(status || "PENDING").toUpperCase();

  if (normalizedStatus === "CANCELLED") {
    return "DECLINED";
  }

  return normalizedStatus;
};

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "UNKNOWN").toUpperCase();
  const displayStatus = normalizedStatus === "CANCELLED" ? "DECLINED" : normalizedStatus;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        STATUS_THEME[normalizedStatus] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {displayStatus.replaceAll("_", " ")}
    </span>
  );
}

export default function PharmacyOrderDetails() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState(null);
  const [summary, setSummary] = useState(null);
  const [process, setProcess] = useState(null);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await pharmacyService.getPharmacyOrderDetails(orderId);
      setOrder(response?.data?.order || null);
      setSummary(response?.data?.summary || null);
      setProcess(response?.data?.process || null);
    } catch (err) {
      console.error("[PHARMACY ORDER DETAILS] failed to load", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load order details");
      setOrder(null);
      setSummary(null);
      setProcess(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const currentStatus = order?.status || "PENDING";
  const orderItemStatusLabel = getOrderItemStatusLabel(currentStatus);
  const currentStepIndex = STATUS_STEPS.indexOf(currentStatus);
  const nextAllowedStatuses = process?.nextAllowedStatuses || [];
  const canCancel = currentStatus === "PENDING" && nextAllowedStatuses.includes("CANCELLED");
  const hasTimelineTransition = nextAllowedStatuses.some((status) =>
    STATUS_STEPS.includes(status)
  );
  const isKhaltiPending =
    order?.paymentMethod === "KHALTI" && order?.paymentStatus !== "COMPLETED";

  const amountSummary = useMemo(() => {
    if (summary) {
      return {
        subtotal: Number(summary.subtotal || 0),
        deliveryFee: Number(summary.deliveryFee || 0),
        total: Number(summary.total || 0),
        medicineCount: Number(summary.medicineCount || 0),
        itemCount: Number(summary.itemCount || 0),
      };
    }

    const items = order?.items || [];
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const total = Number(order?.totalAmount || 0);
    return {
      subtotal,
      deliveryFee: Math.max(total - subtotal, 0),
      total,
      medicineCount: items.length,
      itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    };
  }, [summary, order]);

  const handleStatusUpdate = async (status) => {
    if (!order?.id || !status) return;

    try {
      setUpdating(true);
      const response = await pharmacyService.updatePharmacyOrderStatus(order.id, status);
      const updatedOrder = response?.data?.order || response?.order || null;

      if (updatedOrder?.id) {
        setOrder((currentOrder) => ({
          ...(currentOrder || {}),
          ...updatedOrder,
        }));

        const updatedStatus = String(updatedOrder.status || "").toUpperCase();
        const updatedAllowed =
          updatedStatus === "PENDING"
            ? ["ACCEPTED", "CANCELLED"]
            : updatedStatus === "ACCEPTED"
            ? ["PREPARING", "READY", "CANCELLED"]
            : updatedStatus === "PREPARING"
            ? ["READY", "CANCELLED"]
            : updatedStatus === "READY"
            ? ["COMPLETED", "CANCELLED"]
            : [];

        setProcess((currentProcess) => ({
          ...(currentProcess || {}),
          nextAllowedStatuses: updatedAllowed,
        }));
      }

      toast.success("Order updated. Patient has been notified.");
      loadOrder();
    } catch (err) {
      console.error("[PHARMACY ORDER DETAILS] status update failed", err);
      toast.error(err?.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
          <div className="h-36 rounded-2xl bg-white border border-slate-200" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 rounded-2xl bg-white border border-slate-200" />
            <div className="h-96 rounded-2xl bg-white border border-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto mb-3 text-red-500" size={36} />
          <p className="text-lg font-semibold text-red-700">{error || "Order not found"}</p>
          <button
            type="button"
            onClick={() => navigate("/pharmacy/orders")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            <ArrowLeft size={16} />
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe,_#f8fafc_40%,_#f8fafc)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 px-5 py-6 sm:px-7 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => navigate("/pharmacy/orders")}
                  className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
                >
                  <ArrowLeft size={14} />
                  Back to Orders
                </button>
                <h1 className="text-2xl font-extrabold tracking-tight">Order {order.id.slice(0, 12)}...</h1>
                <p className="mt-1 text-sm text-blue-100">
                  Created on {new Date(order.createdAt).toLocaleString()} and auto-tracked in real time.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={currentStatus} />
                <p className="text-xs text-blue-100">Payment: {String(order.paymentStatus || "UNKNOWN").replaceAll("_", " ")}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:p-6 bg-slate-50">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Medicines</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{amountSummary.medicineCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Total Units</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{amountSummary.itemCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Order Value</p>
              <p className="mt-1 text-xl font-bold text-slate-900">Rs. {amountSummary.total.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Payment Method</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{String(order.paymentMethod || "CASH").replaceAll("_", " ")}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock3 size={18} className="text-blue-600" />
                Processing Timeline
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Click a highlighted process step to move the order forward. Each update sends an instant notification.
              </p>

              <div className="mt-6 space-y-4">
                {STATUS_STEPS.map((step, index) => {
                  const isComplete = currentStepIndex > index;
                  const isActive = currentStepIndex === index;
                  const isPending = currentStepIndex < index;
                  const nextTimelineStatus = nextAllowedStatuses.find((status) =>
                    STATUS_STEPS.includes(status)
                  );
                  const targetStatus = nextAllowedStatuses.includes(step)
                    ? step
                    : isActive && nextTimelineStatus
                    ? nextTimelineStatus
                    : null;
                  const isClickable = !updating && Boolean(targetStatus);

                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => {
                        if (targetStatus) {
                          handleStatusUpdate(targetStatus);
                        }
                      }}
                      disabled={!isClickable}
                      title={
                        isClickable
                          ? `Update order to ${(targetStatus || step).replaceAll("_", " ")}`
                          : undefined
                      }
                      className={`w-full rounded-xl text-left transition-colors ${
                        isClickable ? "cursor-pointer hover:bg-blue-50/60" : "cursor-default"
                      }`}
                    >
                      <div className="flex items-start gap-3 p-2">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                              isComplete
                                ? "border-green-500 bg-green-500 text-white"
                                : isActive
                                ? "border-blue-500 bg-blue-500 text-white"
                                : isClickable
                                ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                                : "border-slate-300 bg-white text-slate-500"
                            }`}
                          >
                            {isComplete ? <CheckCircle2 size={14} /> : index + 1}
                          </div>
                          {index < STATUS_STEPS.length - 1 && (
                            <div className={`mt-1 h-8 w-px ${isComplete ? "bg-green-400" : "bg-slate-200"}`} />
                          )}
                        </div>

                        <div className="pt-1">
                          <p className={`text-sm font-semibold ${isPending ? "text-slate-400" : "text-slate-900"}`}>
                            {step.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {step === "PENDING" && "Order received"}
                            {step === "ACCEPTED" && "Medicines accepted and queued for processing"}
                            {step === "PREPARING" && "Pharmacy is packing and validating medicines"}
                            {step === "READY" && "Ready/out for delivery"}
                            {step === "COMPLETED" && "Delivered and closed"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  {hasTimelineTransition
                    ? "Tap any highlighted process row (or its round) to progress this order."
                    : canCancel
                    ? isKhaltiPending
                      ? "Payment is not completed yet, so processing steps are locked. You can reject/cancel this order."
                      : "Processing steps are locked for this status. You can reject/cancel this order."
                    : currentStatus === "ACCEPTED" || currentStatus === "PREPARING" || currentStatus === "READY"
                    ? "Order is already in fulfillment. Use Admin intervention (Danger Zone) for forced cancellation after acceptance."
                    : "No further processing actions are available for this order."}
                </p>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate("CANCELLED")}
                    disabled={updating}
                    className="mt-3 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject / Cancel Order
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pill size={18} className="text-emerald-600" />
                Medicines in this Order
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Paid orders are auto-accepted. COD orders require manual accept/reject from the timeline.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 text-left font-semibold">Medicine</th>
                      <th className="px-3 py-3 text-left font-semibold">Quantity</th>
                      <th className="px-3 py-3 text-left font-semibold">Unit Price</th>
                      <th className="px-3 py-3 text-left font-semibold">Line Total</th>
                      <th className="px-3 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{item.medicineName}</p>
                          <p className="text-xs text-slate-500">{item.genericName || "Generic name not provided"}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{item.quantity}</td>
                        <td className="px-3 py-3 text-slate-700">Rs. {Number(item.unitPrice || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">Rs. {Number(item.lineTotal || 0).toLocaleString()}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_ITEM_STATUS_THEME[orderItemStatusLabel] || "bg-slate-100 text-slate-700"}`}>
                            {orderItemStatusLabel.replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserRound size={16} className="text-blue-600" />
                Patient Details
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="font-semibold text-slate-900">{order.patient?.name || "Unknown"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 flex items-center gap-2">
                  <Mail size={14} className="text-slate-500" />
                  <p className="text-slate-700">{order.patient?.email || "N/A"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 flex items-center gap-2">
                  <Phone size={14} className="text-slate-500" />
                  <p className="text-slate-700">{order.contactNumber || order.patient?.phone || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck size={16} className="text-emerald-600" />
                Delivery and Payment
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2 flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 text-slate-500" />
                  <p className="text-slate-700">{order.deliveryAddress || "No address"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 flex items-center gap-2">
                  <CreditCard size={14} className="text-slate-500" />
                  <p className="text-slate-700">{String(order.paymentMethod || "CASH").replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 flex items-center gap-2">
                  <CalendarDays size={14} className="text-slate-500" />
                  <p className="text-slate-700">Updated {new Date(order.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt size={16} className="text-purple-600" />
                Billing Snapshot
              </h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">Rs. {amountSummary.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Delivery Fee</span>
                  <span className="font-medium text-slate-900">Rs. {amountSummary.deliveryFee.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-extrabold text-slate-900">Rs. {amountSummary.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                <Package size={16} />
                Smart Acceptance Logic
              </p>
              <p className="mt-1 text-xs text-green-700">
                Paid orders are automatically accepted, while COD orders remain pending until you accept or reject.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
