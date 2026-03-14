import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  const order = location.state?.order || null;
  const orderId = order?.id || "Pending ID";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-emerald-100 rounded-3xl shadow-sm p-8 sm:p-10 text-center">
          <div className="mx-auto w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse">
            <CheckCircle2 size={48} className="text-emerald-600" />
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-slate-900">Order Confirmed</h1>
          <p className="mt-3 text-slate-600">
            Your order has been placed successfully. Pharmacy will now prepare your medicines.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Order ID</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 break-all">#{orderId}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/patient/orders")}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold inline-flex items-center justify-center gap-2"
            >
              <Package size={18} />
              Track Order
            </button>
            <button
              onClick={() => navigate("/medicine-search")}
              className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center justify-center gap-2"
            >
              Continue Shopping
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
