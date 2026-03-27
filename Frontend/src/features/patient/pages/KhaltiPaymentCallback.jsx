import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import patientService from "../services/patient.service";

const getSearchParams = (search) => {
  const params = new URLSearchParams(search);
  return {
    pidx: params.get("pidx") || "",
    status: params.get("status") || "",
    transactionId: params.get("transaction_id") || params.get("tidx") || "",
    purchaseOrderId: params.get("purchase_order_id") || "",
  };
};

export default function KhaltiPaymentCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({
    success: false,
    title: "Verifying payment",
    message: "Please wait while we confirm your Khalti transaction.",
  });

  const query = useMemo(() => getSearchParams(location.search), [location.search]);

  useEffect(() => {
    const verify = async () => {
      if (!query.pidx) {
        setResult({
          success: false,
          title: "Payment verification failed",
          message: "Missing Khalti payment reference (pidx). Please try checkout again.",
        });
        setLoading(false);
        return;
      }

      try {
        const response = await patientService.verifyKhaltiCallbackPayment({
          pidx: query.pidx,
          purchaseOrderId: query.purchaseOrderId,
        });
        const paymentStatus = response?.data?.payment?.status || query.status || "Unknown";

        if (response?.success) {
          setResult({
            success: true,
            title: "Payment completed",
            message: `Your Khalti payment has been verified as ${paymentStatus}.`,
          });
          toast.success("Payment verified successfully");
        } else {
          setResult({
            success: false,
            title: "Payment is not completed",
            message: `Current Khalti status is ${paymentStatus}. Your order will stay on hold until payment is completed.`,
          });
        }
      } catch (error) {
        const serverMessage = error?.response?.data?.message;
        setResult({
          success: false,
          title: "Verification error",
          message:
            serverMessage ||
            "We could not verify payment with Khalti. Please check your order and retry verification.",
        });
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [query.pidx, query.purchaseOrderId, query.status]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {loading ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
              <h1 className="mt-4 text-2xl font-bold text-slate-900">Verifying your payment</h1>
              <p className="mt-2 text-slate-600">Checking Khalti lookup status using your payment reference.</p>
            </div>
          ) : (
            <div className="text-center">
              {result.success ? (
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
              ) : (
                <AlertTriangle className="w-14 h-14 text-amber-600 mx-auto" />
              )}

              <h1 className="mt-4 text-2xl font-bold text-slate-900">{result.title}</h1>
              <p className="mt-2 text-slate-600">{result.message}</p>

              {(query.transactionId || query.pidx) && (
                <div className="mt-4 inline-flex flex-col gap-1 rounded-xl bg-slate-100 px-4 py-3 text-left text-xs text-slate-600">
                  <span>pidx: {query.pidx}</span>
                  {query.transactionId && <span>transaction: {query.transactionId}</span>}
                </div>
              )}

              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/patient/orders")}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                >
                  View Orders
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/patient")}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
