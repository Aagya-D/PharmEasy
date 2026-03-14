import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "../../../context/CartContext";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatExpiry = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, isLoadingCart, updateCartItem, removeFromCart } = useCart();
  const isCartEmpty = !isLoadingCart && cartItems.length === 0;

  const groupedItems = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const key = item.pharmacyName || "Other Pharmacy";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [cartItems]);

  const { subtotal, shipping, total, selectedItems } = useMemo(() => {
    const selected = cartItems.filter((item) => item.selected);
    const sum = selected.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const shippingAmount = selected.length > 0 ? 40 : 0;
    return {
      selectedItems: selected,
      subtotal: sum,
      shipping: shippingAmount,
      total: sum + shippingAmount,
    };
  }, [cartItems]);

  const handleProceedToPayment = () => {
    if (!selectedItems.length) return;

    navigate("/patient/checkout", {
      state: {
        mode: "cart",
        items: selectedItems,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={() => navigate("/medicine-search")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Search
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Shopping Cart</h1>
          <p className="text-slate-600 mt-1">Manage your medicines before payment.</p>
        </div>

        {isCartEmpty ? (
          <section className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
            <div className="mx-auto w-56 sm:w-64 mb-6">
              <svg
                viewBox="0 0 220 180"
                className="w-full h-auto"
                role="img"
                aria-label="Empty shopping bag"
              >
                <defs>
                  <linearGradient id="bagFill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#dbeafe" />
                    <stop offset="100%" stopColor="#bfdbfe" />
                  </linearGradient>
                </defs>
                <ellipse cx="110" cy="160" rx="70" ry="12" fill="#e2e8f0" />
                <path d="M60 62h100l-10 84a10 10 0 0 1-10 9H80a10 10 0 0 1-10-9L60 62z" fill="url(#bagFill)" stroke="#93c5fd" strokeWidth="3" />
                <path d="M82 62c0-16 12-28 28-28s28 12 28 28" fill="none" stroke="#60a5fa" strokeWidth="5" strokeLinecap="round" />
                <circle cx="93" cy="99" r="4" fill="#1e3a8a" />
                <circle cx="127" cy="99" r="4" fill="#1e3a8a" />
                <path d="M94 119c8 8 24 8 32 0" fill="none" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900">Your cart is empty</h2>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">
              No medicines added yet. Search by brand or generic name and build your order in minutes.
            </p>
            <button
              onClick={() => navigate("/medicine-search")}
              className="mt-7 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Search Medicines
            </button>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <section className="lg:col-span-2 space-y-4">
              {isLoadingCart && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-600">
                  Loading your cart...
                </div>
              )}

              {!isLoadingCart &&
                Object.entries(groupedItems).map(([pharmacyName, items]) => (
                  <article key={pharmacyName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <header className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                      <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">{pharmacyName}</h2>
                      <p className="text-xs text-slate-500 mt-1">{items[0]?.pharmacyAddress || "Address unavailable"}</p>
                    </header>

                    <div className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={Boolean(item.selected)}
                              onChange={(event) => updateCartItem(item.id, { selected: event.target.checked })}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />

                            <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                              Rx
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-base font-semibold text-slate-900 truncate">{item.medicineName}</h3>
                              <p className="text-sm text-slate-600 truncate">Generic: {item.genericName || "N/A"}</p>
                              <p className="text-xs text-slate-500 mt-1">Expiry: {formatExpiry(item.expiryDate)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 justify-between sm:justify-end sm:min-w-[250px]">
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => updateCartItem(item.id, { quantity: Math.max(1, Number(item.quantity || 1) - 1) })}
                                className="px-3 py-2 hover:bg-slate-100 text-slate-700"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={15} />
                              </button>
                              <span className="px-4 text-sm font-semibold text-slate-800">{item.quantity}</span>
                              <button
                                onClick={() => updateCartItem(item.id, { quantity: Number(item.quantity || 1) + 1 })}
                                className="px-3 py-2 hover:bg-slate-100 text-slate-700"
                                aria-label="Increase quantity"
                              >
                                <Plus size={15} />
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-slate-500">Unit</p>
                              <p className="font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"
                              aria-label="Remove item"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
            </section>

            <aside className="lg:sticky lg:top-24 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Order Summary</h3>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Estimated Shipping</span>
                  <span>{formatCurrency(shipping)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!selectedItems.length}
                className="mt-6 w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                Proceed to Payment
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
