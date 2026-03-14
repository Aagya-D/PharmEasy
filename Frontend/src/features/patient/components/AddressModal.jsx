import React, { useState } from "react";
import { X, Navigation, Home, Briefcase } from "lucide-react";
import toast from "react-hot-toast";

const NEPAL_PROVINCES = [
  "Province 1 / Koshi",
  "Province 2 / Madhesh",
  "Bagmati Province",
  "Gandaki Province",
  "Lumbini Province",
  "Karnali Province",
  "Sudurpashchim Province",
];

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  region: "",
  city: "",
  area: "",
  street: "",
  landmark: "",
  label: "Home",
  _lat: null,
  _lng: null,
};

function inputCls(hasError) {
  return `w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition ${
    hasError
      ? "border-rose-400 focus:ring-rose-400"
      : "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
  }`;
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export default function AddressModal({ onClose, onSave, initialAddress }) {
  const [form, setForm] = useState(
    initialAddress
      ? { ...EMPTY_FORM, ...initialAddress }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required.";
    if (!/^9\d{9}$/.test(form.phone.trim()))
      errs.phone = "Enter a valid 10-digit number starting with 9.";
    if (!form.region) errs.region = "Please select a province.";
    if (!form.city.trim()) errs.city = "City / District is required.";
    if (!form.area.trim()) errs.area = "Area is required.";
    if (!form.street.trim()) errs.street = "Building / Street is required.";
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSave(form);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast.error("GPS is not supported in this browser.");
      return;
    }
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsFetchingGps(false);
        setForm((prev) => ({
          ...prev,
          _lat: pos.coords.latitude,
          _lng: pos.coords.longitude,
        }));
        toast.success(
          `GPS captured: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
        );
      },
      () => {
        setIsFetchingGps(false);
        toast.error("Unable to get location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold text-slate-900">
          {initialAddress ? "Edit Delivery Address" : "Add Delivery Address"}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          This address will be used for your order delivery.
        </p>

        <div className="mt-6 space-y-4">
          {/* Full Name */}
          <Field label="Full Name" error={errors.fullName}>
            <input
              type="text"
              value={form.fullName}
              onChange={set("fullName")}
              placeholder="e.g., Suman Sharma"
              className={inputCls(errors.fullName)}
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              maxLength={10}
              placeholder="98XXXXXXXX"
              className={inputCls(errors.phone)}
            />
          </Field>

          {/* Region */}
          <Field label="Region / Province" error={errors.region}>
            <select
              value={form.region}
              onChange={set("region")}
              className={inputCls(errors.region)}
            >
              <option value="">Select province</option>
              {NEPAL_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          {/* City + Area */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="City / District" error={errors.city}>
              <input
                type="text"
                value={form.city}
                onChange={set("city")}
                placeholder="e.g., Kathmandu"
                className={inputCls(errors.city)}
              />
            </Field>
            <Field label="Area / Ward" error={errors.area}>
              <input
                type="text"
                value={form.area}
                onChange={set("area")}
                placeholder="e.g., Putalisadak"
                className={inputCls(errors.area)}
              />
            </Field>
          </div>

          {/* Building / Street */}
          <Field label="Building / Street" error={errors.street}>
            <input
              type="text"
              value={form.street}
              onChange={set("street")}
              placeholder="e.g., House 12, Bagmati Marg"
              className={inputCls(errors.street)}
            />
          </Field>

          {/* Landmark (optional) */}
          <Field label="Colony / Landmark (Optional)">
            <input
              type="text"
              value={form.landmark}
              onChange={set("landmark")}
              placeholder="e.g., Near Bhatbhateni Superstore"
              className={inputCls(false)}
            />
          </Field>

          {/* GPS Button */}
          <button
            type="button"
            onClick={handleGPS}
            disabled={isFetchingGps}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold transition"
          >
            <Navigation size={15} />
            {isFetchingGps ? "Fetching GPS…" : "Use Current GPS Location"}
          </button>

          {form._lat && form._lng && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
              <span className="text-base">📍</span>
              GPS saved: {form._lat.toFixed(5)}, {form._lng.toFixed(5)}
            </div>
          )}

          {/* Label Selector */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Save As</p>
            <div className="flex gap-3">
              {[
                { key: "Home", Icon: Home },
                { key: "Office", Icon: Briefcase },
              ].map(({ key, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, label: key }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                    form.label === key
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon size={14} />
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
          >
            Save Address
          </button>
        </div>
      </div>
    </div>
  );
}
