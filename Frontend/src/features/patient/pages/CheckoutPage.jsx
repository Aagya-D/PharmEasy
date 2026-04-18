import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Edit2,
  MapPin,
  Package,
  Minus,
  Plus,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import patientService from "../services/patient.service";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import AddressModal from "../components/AddressModal";

const DELIVERY_FEE = 40;
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5050/api").replace(/\/api\/?$/, "");

const formatCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const resolveMedicineImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return null;

  const normalized = imageUrl.trim();
  if (!normalized) return null;

  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return normalized;
  }

  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  return `${API_ORIGIN}/${path}`;
};

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
  const { refreshCart, updateCartItem } = useCart();

  const [placingOrder, setPlacingOrder] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [editableItems, setEditableItems] = useState([]);

  const { mode, medicineId, medicine, items: selectedItems } = location.state || {};

  const checkoutItems = useMemo(() => {
    // Cart checkout keeps the already selected items.
    if (Array.isArray(selectedItems) && selectedItems.length > 0) {
      return selectedItems;
    }

    // Buy-now flows pass a single medicine object, so we convert it into one line item.
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

    // Fall back to the cached medicine snapshot if the route state is missing.
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

  useEffect(() => {
    setEditableItems(checkoutItems);
  }, [checkoutItems]);

  const currentItems = editableItems.length > 0 ? editableItems : checkoutItems;

  const handleQuantityChange = async (item, nextQuantity) => {
    const quantity = Math.max(1, Number(nextQuantity || 1));
    const itemKey = item.id || item.cartItemId || item.medicineId;

    setEditableItems((currentItemsList) =>
      currentItemsList.map((currentItem) =>
        (currentItem.id || currentItem.cartItemId || currentItem.medicineId) === itemKey
          ? { ...currentItem, quantity }
          : currentItem
      )
    );

    if (mode === "cart" && itemKey) {
      try {
        await updateCartItem(itemKey, { quantity });
      } catch (error) {
        setEditableItems((currentItemsList) =>
          currentItemsList.map((currentItem) =>
            (currentItem.id || currentItem.cartItemId || currentItem.medicineId) === itemKey
              ? { ...currentItem, quantity: Number(item.quantity || 1) }
              : currentItem
          )
        );
        toast.error(error?.response?.data?.message || "Failed to update quantity.");
      }
    }
  };

  const subtotal = currentItems.reduce(
    (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const deliveryCharge = currentItems.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryCharge;
  const savedContactNumber = normalizePhoneNumber(savedAddress?.phone);

  const canConfirmOrder =
    !placingOrder &&
    currentItems.length > 0 &&
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
      // Save the address through auth so the user profile stays current everywhere.
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

    // Send only identifiers and quantities so the backend can validate the order itself.
    const selectedItemIds = currentItems
      .map((item) => item.id || item.cartItemId || item.medicineId)
      .filter(Boolean);
    const checkoutPayloadItems = currentItems.map((item) => ({
      id: item.id || null,
      cartItemId: item.id || item.cartItemId || null,
      inventoryId: item.medicineId || item.inventoryId || item.id,
      medicineId: item.medicineId || item.inventoryId || item.id,
      pharmacyId: item.pharmacyId || null,
      quantity: Number(item.quantity || 1),
    }));

    try {
      setPlacingOrder(true);
      // Build the exact payload expected by the checkout endpoint.
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

      const orders = Array.isArray(response?.data?.orders)
        ? response.data.orders
        : response?.data?.order
        ? [response.data.order]
        : [];
      const order = orders[0] || null;
      const payment = response?.data?.payment || null;

      if (paymentMethod === "KHALTI") {
        // Khalti redirects the browser, so stop once we receive the payment URL.
        const paymentUrl = payment?.paymentUrl;
        if (!paymentUrl) {
          throw new Error("Khalti payment link was not received from server");
        }

        toast.success("Redirecting to Khalti payment page...");
        window.location.href = paymentUrl;
        return;
      }

      await refreshCart();
      // Only move to the success page after the cart state has been refreshed.
      toast.success("Order placed successfully!");
      navigate("/patient/order-success", {
        state: {
          order,
          orders,
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

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Page title */}
          <div className="mt-5 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Checkout</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {mode === "buy-now"
                ? "Review and confirm your direct order."
                : "Review your cart items and confirm delivery details."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">

              {/* Shipping address */}
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

              {/* Package items */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package size={17} className="text-blue-600" />
                  Package Items
                  <span className="text-xs font-semibold text-slate-400 ml-1">
                    ({currentItems.length} item{currentItems.length !== 1 ? "s" : ""})
                  </span>
                </h2>

                {currentItems.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400 italic">No items selected for this order.</p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100">
                    {currentItems.map((item, idx) => (
                      <div
                        key={item.id || `${item.medicineName}-${idx}`}
                        className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {resolveMedicineImageUrl(item.imageUrl || item.medicine?.imageUrl) ? (
                              <img
                                src={resolveMedicineImageUrl(item.imageUrl || item.medicine?.imageUrl)}
                                alt={item.medicineName}
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                No image
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
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
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end sm:min-w-[280px]">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => handleQuantityChange(item, Number(item.quantity || 1) - 1)}
                              className="px-3 py-2 hover:bg-slate-100 text-slate-700"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={15} />
                            </button>
                            <span className="px-4 text-sm font-semibold text-slate-800">{item.quantity || 1}</span>
                            <button
                              onClick={() => handleQuantityChange(item, Number(item.quantity || 1) + 1)}
                              className="px-3 py-2 hover:bg-slate-100 text-slate-700"
                              aria-label="Increase quantity"
                            >
                              <Plus size={15} />
                            </button>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity || 1}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Payment method */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <Wallet size={17} className="text-blue-600" />
                  Payment Method
                </h2>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Cash on delivery */}
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

                  {/* Khalti */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("KHALTI")}
                    className={`flex-1 flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      paymentMethod === "KHALTI"
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                        paymentMethod === "KHALTI" ? "bg-emerald-600" : "bg-slate-200"
                      }`}
                    >
                      <Wallet
                        size={16}
                        className={paymentMethod === "KHALTI" ? "text-white" : "text-slate-500"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Khalti</p>
                      <p className="text-xs text-slate-500">Pay securely via Khalti Checkout</p>
                    </div>
                    {paymentMethod === "KHALTI" && (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    )}
                  </button>

                  {/* eSewa is not available yet. */}
                  <button
                    type="button"
                    disabled
                    className="flex-1 flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left opacity-55 cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0 flex items-center justify-center">
                      <Wallet size={16} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700">eSewa</p>
                      <p className="text-xs text-slate-400">Digital wallet</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0 whitespace-nowrap">
                      Coming Soon
                    </span>
                  </button>
                </div>
              </section>
            </div>

            {/* Right sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-4">

              {/* Invoice info */}
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

              {/* Order summary */}
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
