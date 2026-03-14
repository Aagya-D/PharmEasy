import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Edit2,
  MapPin,
  Package,
  Plus,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import patientService from "../services/patient.service";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import AddressModal from "../components/AddressModal";

const DELIVERY_FEE = 40;

const formatCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizePhoneNumber = (value) => String(value || "").replace(/\D/g, "").trim();

function composeAddressString(addr) {
  const parts = [addr.street, addr.area, addr.city, addr.region].filter(Boolean);
  let str = parts.join(", ");
  if (addr.landmark) str += `, near ${addr.landmark}`;
  return str;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateShippingAddress } = useAuth();
  const { refreshCart } = useCart();

  const [placingOrder, setPlacingOrder] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");

  const { mode, medicineId, medicine, items: selectedItems } = location.state || {};

  const checkoutItems = useMemo(() => {
    if (Array.isArray(selectedItems) && selectedItems.length > 0) {
      return selectedItems;
    }

    if (medicine) {
      return [
        {
          id: medicineId || medicine?.id,
          medicineId: medicineId || medicine?.id,
          pharmacyId: medicine?.pharmacy?.id || medicine?.pharmacyId || null,
          medicineName: medicine?.medicine || medicine?.brandName || "Selected Medicine",
          genericName: medicine?.genericName || null,
          quantity: 1,
          price: Number(medicine?.price || 0),
          pharmacyName: medicine?.pharmacy?.name || "Selected Pharmacy",
        },
      ];
    }

    if (!medicineId) return [];

    try {
      const cached = sessionStorage.getItem(`medicine_detail_${medicineId}`);
      const parsed = cached ? JSON.parse(cached) : null;
      if (!parsed) return [];
      return [
        {
          id: medicineId,
          medicineId,
          pharmacyId: parsed?.pharmacy?.id || parsed?.pharmacyId || null,
          medicineName: parsed?.medicine || parsed?.brandName || "Selected Medicine",
          genericName: parsed?.genericName || null,
          quantity: 1,
          price: Number(parsed?.price || 0),
          pharmacyName: parsed?.pharmacy?.name || "Selected Pharmacy",
        },
      ];
    } catch {
      return [];
    }
  }, [medicine, medicineId, selectedItems]);

  const subtotal = checkoutItems.reduce(
    (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const deliveryCharge = checkoutItems.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryCharge;
  const savedContactNumber = normalizePhoneNumber(savedAddress?.phone);

  const canConfirmOrder =
    !placingOrder &&
    checkoutItems.length > 0 &&
    savedAddress !== null &&
    /^9\d{9}$/.test(savedContactNumber) &&
    Boolean(paymentMethod);

  useEffect(() => {
    if (!savedAddress && user?.shippingAddress && typeof user.shippingAddress === "object") {
      setSavedAddress(user.shippingAddress);
    }
  }, [savedAddress, user?.shippingAddress]);

  const handleSaveAddress = async (addr) => {
    try {
      const result = await updateShippingAddress(addr);
      setSavedAddress(result?.user?.shippingAddress || addr);
      setShowAddressModal(false);
      toast.success("Address saved!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save address.");
    }
  };

  const handleConfirmOrder = async () => {
    if (!canConfirmOrder) return;

    const selectedItemIds = checkoutItems
      .map((item) => item.id || item.cartItemId || item.medicineId)
      .filter(Boolean);
    const checkoutPayloadItems = checkoutItems.map((item) => ({
      id: item.id || null,
      cartItemId: item.id || item.cartItemId || null,
      inventoryId: item.medicineId || item.inventoryId || item.id,
      medicineId: item.medicineId || item.inventoryId || item.id,
      pharmacyId: item.pharmacyId || null,
      quantity: Number(item.quantity || 1),
    }));

    try {
      setPlacingOrder(true);
      const response = await patientService.placeOrderFromCart({
        mode: mode || "cart",
        itemIds: selectedItemIds,
        items: checkoutPayloadItems,
        deliveryAddress: `${savedAddress.fullName}, ${savedContactNumber} - ${composeAddressString(savedAddress)}`,
        shippingAddress: {
          fullName: savedAddress.fullName,
          phone: savedContactNumber,
          region: savedAddress.region,
          city: savedAddress.city,
          area: savedAddress.area,
          street: savedAddress.street,
          landmark: savedAddress.landmark,
          label: savedAddress.label,
        },
        paymentMethod,
        contactNumber: savedContactNumber,
        summary: {
          itemsTotal: subtotal,
          deliveryFee: deliveryCharge,
          total,
        },
        latitude: savedAddress._lat ?? null,
        longitude: savedAddress._lng ?? null,
      });

      await refreshCart();
      toast.success("Order placed successfully!");
      navigate("/patient/order-success", {
        state: {
          order: response?.data?.order || null,
          placedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to place order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <>
      {showAddressModal && (
        <AddressModal
          onClose={() => setShowAddressModal(false)}
          onSave={handleSaveAddress}
          initialAddress={savedAddress}
        />
      )}

      <div className="min-h-screen bg-slate-50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Page Title */}
          <div className="mt-5 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Checkout</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {mode === "buy-now"
                ? "Review and confirm your direct order."
                : "Review your cart items and confirm delivery details."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* ── Left Column ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* 1. Shipping Address */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <MapPin size={17} className="text-blue-600" />
                    Shipping Address
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition"
                  >
                    {savedAddress ? (
                      <>
                        <Edit2 size={12} />
                        Edit
                      </>
                    ) : (
                      <>
                        <Plus size={12} />
                        Add
                      </>
                    )}
                  </button>
                </div>

                {savedAddress ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{savedAddress.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{savedAddress.phone}</p>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                          {composeAddressString(savedAddress)}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {savedAddress.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400 italic">
                    No address added yet. Click 'Add' to set your delivery address.
                  </p>
                )}
              </section>

              {/* 2. Package Items */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package size={17} className="text-blue-600" />
                  Package Items
                  <span className="text-xs font-semibold text-slate-400 ml-1">
                    ({checkoutItems.length} item{checkoutItems.length !== 1 ? "s" : ""})
                  </span>
                </h2>

                {checkoutItems.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400 italic">No items selected for this order.</p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {checkoutItems.map((item, idx) => (
                      <div
                        key={item.id || `${item.medicineName}-${idx}`}
                        className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        {/* Rx Icon */}
                        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-extrabold text-blue-600 tracking-tighter">Rx</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 leading-snug">
                            {item.medicineName}
                          </p>
                          {item.genericName && (
                            <p className="text-xs text-slate-500 mt-0.5">{item.genericName}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            Shipped by{" "}
                            <span className="font-semibold text-slate-600">
                              {item.pharmacyName || "Selected Pharmacy"}
                            </span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(
                              Number(item.price || 0) * Number(item.quantity || 1)
                            )}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity || 1}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 3. Payment Method */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <Wallet size={17} className="text-blue-600" />
                  Payment Method
                </h2>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Cash on Delivery */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH_ON_DELIVERY")}
                    className={`flex-1 flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      paymentMethod === "CASH_ON_DELIVERY"
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                        paymentMethod === "CASH_ON_DELIVERY" ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <CreditCard
                        size={16}
                        className={
                          paymentMethod === "CASH_ON_DELIVERY" ? "text-white" : "text-slate-500"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Cash on Delivery</p>
                      <p className="text-xs text-slate-500">Pay when you receive</p>
                    </div>
                    {paymentMethod === "CASH_ON_DELIVERY" && (
                      <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                    )}
                  </button>

                  {/* eSewa / Khalti — Coming Soon */}
                  <button
                    type="button"
                    disabled
                    className="flex-1 flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left opacity-55 cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0 flex items-center justify-center">
                      <Wallet size={16} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700">eSewa / Khalti</p>
                      <p className="text-xs text-slate-400">Digital wallet</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0 whitespace-nowrap">
                      Coming Soon
                    </span>
                  </button>
                </div>
              </section>
            </div>

            {/* ── Right Sidebar ── */}
            <aside className="lg:sticky lg:top-24 space-y-4">

              {/* Invoice Info */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Invoice Info
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 min-w-[40px] text-xs font-medium pt-0.5">Email</span>
                    <span className="text-slate-700 font-medium break-all">
                      {user?.email || "—"}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 min-w-[40px] text-xs font-medium pt-0.5">Ship to</span>
                    <span className="text-slate-700 leading-relaxed">
                      {savedAddress ? (
                        composeAddressString(savedAddress)
                      ) : (
                        <span className="italic text-slate-400 text-xs">Not set</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Detail */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-base font-bold text-slate-900 mb-4">Order Detail</p>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Total</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(deliveryCharge)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-base">
                    <span>Total</span>
                    <span className="text-blue-700">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmOrder}
                  disabled={!canConfirmOrder}
                  className="mt-5 w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold transition-colors inline-flex items-center justify-center gap-2 text-sm"
                >
                  <CreditCard size={16} />
                  {placingOrder ? "Placing Order…" : "Confirm Order"}
                </button>

                {!savedAddress && (
                  <p className="mt-2.5 text-xs text-center text-rose-500 font-medium">
                    Add a shipping address to enable checkout.
                  </p>
                )}

                {savedAddress && !/^9\d{9}$/.test(savedContactNumber) && (
                  <p className="mt-2.5 text-xs text-center text-rose-500 font-medium">
                    Enter a valid 10-digit Nepali phone number in the shipping address.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
