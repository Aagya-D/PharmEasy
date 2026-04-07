import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CircleDollarSign,
  Package,
  Pencil,
  Route,
  ShieldAlert,
} from "lucide-react";
import Modal from "../../../shared/components/ui/Modal";
import { Input, TextArea } from "../../../shared/components/ui/Input";
import MedicineImage from "../../../shared/components/ui/MedicineImage";

const FALLBACK_VALUE = "Not specified";

const PRESET_MEDICINE_CATEGORIES = [
  { value: "fever", label: "Fever / Cold" },
  { value: "chronic", label: "Chronic Care" },
  { value: "baby", label: "Baby Care" },
  { value: "ayurvedic", label: "Ayurvedic" },
  { value: "firstaid", label: "First Aid" },
  { value: "surgical", label: "Surgical" },
  { value: "general", label: "General" },
];

const getInitialEditData = (source) => {
  if (!source) return null;

  return {
    name: source.name || "",
    genericName: source.genericName || "",
    category: source.category || "general",
    sideEffects: source.sideEffects || "",
    contraindications: source.contraindications || "",
    warnings: source.warnings || "",
    isPrescriptionRequired: Boolean(source.isPrescriptionRequired),
    dosageInstructions: source.dosageInstructions || "",
    route: source.route || "ORAL",
    timing: source.timing || "AFTER_FOOD",
    strength: source.strength || "",
    form: source.form || "",
    manufacturer: source.manufacturer || "",
    batchNumber: source.batchNumber || "",
    imageUrl: source.imageUrl || "",
    quantity:
      source.quantity !== null && source.quantity !== undefined ? String(source.quantity) : "",
    price: source.price !== null && source.price !== undefined ? String(source.price) : "",
    expiryDate: source.expiryDate ? new Date(source.expiryDate).toISOString().slice(0, 10) : "",
  };
};

function Value({ children }) {
  if (children === null || children === undefined || children === "") {
    return <p className="text-sm text-slate-400 italic">{FALLBACK_VALUE}</p>;
  }

  return <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{children}</p>;
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1">
        <Value>{value}</Value>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return FALLBACK_VALUE;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return FALLBACK_VALUE;
  return date.toLocaleDateString();
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return FALLBACK_VALUE;
  const num = Number(value);
  if (Number.isNaN(num)) return FALLBACK_VALUE;
  return `Rs. ${num.toFixed(2)}`;
}

export default function MedicineDetailModal({
  isOpen,
  onClose,
  medicine,
  onSave,
  submitting = false,
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewData, setViewData] = useState(() => medicine || null);
  const [editData, setEditData] = useState(() => getInitialEditData(medicine));
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(medicine?.imageUrl || "");
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const sections = useMemo(() => {
    const source = viewData || {};

    return [
      {
        id: "safety",
        title: "Safety",
        icon: ShieldAlert,
        fields: [
          { label: "Prescription Requirement", value: source.isPrescriptionRequired ? "Prescription Required" : "No Prescription Required" },
          { label: "Side Effects", value: source.sideEffects },
          { label: "Contraindications", value: source.contraindications },
          { label: "Warnings", value: source.warnings },
        ],
      },
      {
        id: "usage",
        title: "Usage",
        icon: Route,
        fields: [
          { label: "Dosage Instructions", value: source.dosageInstructions },
          { label: "Route", value: source.route },
          { label: "Timing", value: source.timing },
        ],
      },
      {
        id: "product",
        title: "Product Details",
        icon: Package,
        fields: [
          { label: "Medicine Name", value: source.name },
          { label: "Generic Name", value: source.genericName },
          { label: "Category", value: source.category ? String(source.category).replace(/_/g, " ") : FALLBACK_VALUE },
          { label: "Strength", value: source.strength },
          { label: "Form", value: source.form },
          { label: "Manufacturer", value: source.manufacturer },
          { label: "Batch Number", value: source.batchNumber },
        ],
      },
      {
        id: "purchase",
        title: "Purchase & Stock",
        icon: CircleDollarSign,
        fields: [
          { label: "Quantity", value: source.quantity },
          { label: "Price", value: formatPrice(source.price) },
          { label: "Expiry Date", value: formatDate(source.expiryDate) },
        ],
      },
    ];
  }, [viewData]);

  const updateEditField = (field, value) => {
    setEditData((prev) => ({ ...(prev || {}), [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateEditData = () => {
    const nextErrors = {};

    if (!editData?.name?.trim()) nextErrors.name = "Medicine name is required";
    if (!editData?.genericName?.trim()) nextErrors.genericName = "Generic name is required";
    if (!editData?.category?.trim()) nextErrors.category = "Category is required";
    if (!editData?.sideEffects?.trim()) nextErrors.sideEffects = "Side effects are required";
    if (!editData?.contraindications?.trim()) {
      nextErrors.contraindications = "Contraindications are required";
    }
    if (!editData?.warnings?.trim()) nextErrors.warnings = "Warnings are required";
    if (!editData?.dosageInstructions?.trim()) {
      nextErrors.dosageInstructions = "Dosage instructions are required";
    }
    if (!editData?.strength?.trim()) nextErrors.strength = "Strength is required";
    if (!editData?.form?.trim()) nextErrors.form = "Form is required";
    if (!editData?.manufacturer?.trim()) nextErrors.manufacturer = "Manufacturer is required";
    if (!editData?.batchNumber?.trim()) nextErrors.batchNumber = "Batch number is required";

    if (editData?.quantity === "" || Number(editData.quantity) < 0) {
      nextErrors.quantity = "Quantity must be 0 or greater";
    }

    if (editData?.price === "" || Number(editData.price) <= 0) {
      nextErrors.price = "Price must be greater than 0";
    }

    if (!editData?.expiryDate) {
      nextErrors.expiryDate = "Expiry date is required";
    } else {
      const expiryDate = new Date(editData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        nextErrors.expiryDate = "Expiry date must be in the future";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateEditData()) return;

    const payload = {
      name: editData.name.trim(),
      genericName: editData.genericName.trim(),
      category: editData.category.trim(),
      sideEffects: editData.sideEffects.trim(),
      contraindications: editData.contraindications.trim(),
      warnings: editData.warnings.trim(),
      isPrescriptionRequired: Boolean(editData.isPrescriptionRequired),
      dosageInstructions: editData.dosageInstructions.trim(),
      route: editData.route,
      timing: editData.timing,
      strength: editData.strength.trim(),
      form: editData.form.trim(),
      manufacturer: editData.manufacturer.trim(),
      batchNumber: editData.batchNumber.trim(),
      imageFile,
      removeImage,
      quantity: Number(editData.quantity),
      price: Number(editData.price),
      expiryDate: editData.expiryDate,
    };

    const updated = await onSave(payload);
    setViewData(updated || { ...(viewData || {}), ...payload });
    setEditData(getInitialEditData(updated || { ...(viewData || {}), ...payload }));
    setImageFile(null);
    setImagePreview(updated?.imageUrl || (removeImage ? "" : imagePreview));
    setRemoveImage(false);
    setImageError("");
    setIsEditMode(false);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image file.");
      return;
    }

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError("Image must be 4MB or smaller.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(preview);
    setRemoveImage(false);
    setImageError("");
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(true);
    setImageError("");
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setViewData(medicine || null);
    setEditData(getInitialEditData(medicine));
    setImageFile(null);
    setImagePreview(medicine?.imageUrl || "");
    setRemoveImage(false);
    setImageError("");
    setErrors({});
  };

  const title = viewData?.name || "Medicine Details";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      backdropClassName="bg-slate-900/20 backdrop-blur-sm"
      contentClassName="bg-white/80 backdrop-blur-lg border border-white/50 rounded-2xl"
      headerClassName="bg-transparent border-slate-200/80"
      headerActions={
        !isEditMode && (
          <button
            type="button"
            onClick={() => setIsEditMode(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Edit medicine"
            aria-label="Edit medicine"
          >
            <Pencil size={16} />
            Edit
          </button>
        )
      }
    >
      {isEditMode ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-900">
              Edit mode enabled. Update fields carefully, then save your changes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input
              label="Medicine Name"
              value={editData?.name || ""}
              onChange={(e) => updateEditField("name", e.target.value)}
              error={errors.name}
              required
            />
            <Input
              label="Generic Name"
              value={editData?.genericName || ""}
              onChange={(e) => updateEditField("genericName", e.target.value)}
              error={errors.genericName}
              required
            />
            <Input
              label="Category"
              value={editData?.category || ""}
              onChange={(e) => updateEditField("category", e.target.value)}
              error={errors.category}
              placeholder="e.g. fever, chronic, first_aid"
              required
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category (Dropdown)</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                value=""
                onChange={(e) => {
                  const selected = e.target.value;
                  if (!selected) return;
                  updateEditField("category", selected);
                  e.target.value = "";
                }}
              >
                <option value="">Select from presets...</option>
                {PRESET_MEDICINE_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Pick a preset, or keep typing manually in Category field above.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Current Category</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{(editData?.category || "general").replace(/_/g, " ")}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Safety</h4>
            <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-900">Prescription control</p>
              <button
                type="button"
                onClick={() => updateEditField("isPrescriptionRequired", !editData?.isPrescriptionRequired)}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  editData?.isPrescriptionRequired ? "bg-red-600 text-white" : "bg-green-600 text-white"
                }`}
              >
                {editData?.isPrescriptionRequired ? "Prescription Required" : "No Prescription"}
              </button>
            </div>
            <TextArea
              label="Side Effects"
              value={editData?.sideEffects || ""}
              onChange={(e) => updateEditField("sideEffects", e.target.value)}
              error={errors.sideEffects}
              required
              rows={3}
            />
            <TextArea
              label="Contraindications"
              value={editData?.contraindications || ""}
              onChange={(e) => updateEditField("contraindications", e.target.value)}
              error={errors.contraindications}
              required
              rows={3}
            />
            <TextArea
              label="Warnings"
              value={editData?.warnings || ""}
              onChange={(e) => updateEditField("warnings", e.target.value)}
              error={errors.warnings}
              required
              rows={3}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Usage</h4>
            <TextArea
              label="Dosage Instructions"
              value={editData?.dosageInstructions || ""}
              onChange={(e) => updateEditField("dosageInstructions", e.target.value)}
              error={errors.dosageInstructions}
              required
              rows={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Route</label>
                <select
                  value={editData?.route || "ORAL"}
                  onChange={(e) => updateEditField("route", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                >
                  <option value="ORAL">Oral</option>
                  <option value="TOPICAL">Topical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timing</label>
                <select
                  value={editData?.timing || "AFTER_FOOD"}
                  onChange={(e) => updateEditField("timing", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                >
                  <option value="BEFORE_FOOD">Before food</option>
                  <option value="AFTER_FOOD">After food</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Product Details</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="Strength"
                value={editData?.strength || ""}
                onChange={(e) => updateEditField("strength", e.target.value)}
                error={errors.strength}
                required
              />
              <Input
                label="Form"
                value={editData?.form || ""}
                onChange={(e) => updateEditField("form", e.target.value)}
                error={errors.form}
                required
              />
              <Input
                label="Manufacturer"
                value={editData?.manufacturer || ""}
                onChange={(e) => updateEditField("manufacturer", e.target.value)}
                error={errors.manufacturer}
                required
              />
              <Input
                label="Batch Number"
                value={editData?.batchNumber || ""}
                onChange={(e) => updateEditField("batchNumber", e.target.value)}
                error={errors.batchNumber}
                required
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Medicine Photo</p>
                  <p className="text-xs text-slate-500">Upload a new product image or remove the current one.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  Upload Photo
                </label>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <MedicineImage
                    src={imagePreview}
                    alt={editData?.name || "Medicine preview"}
                    className="object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    {imageFile
                      ? `${imageFile.name} selected`
                      : imagePreview
                      ? "Current medicine image"
                      : "No photo selected. Placeholder will be shown to patients."}
                  </p>
                  {(imageFile || imagePreview) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Remove Photo
                    </button>
                  )}
                  {imageError && <p className="text-xs text-red-600">{imageError}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Purchase & Stock</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Input
                label="Quantity"
                type="number"
                min="0"
                value={editData?.quantity || ""}
                onChange={(e) => updateEditField("quantity", e.target.value)}
                error={errors.quantity}
                required
              />
              <Input
                label="Price (Rs.)"
                type="number"
                min="0"
                step="0.01"
                value={editData?.price || ""}
                onChange={(e) => updateEditField("price", e.target.value)}
                error={errors.price}
                required
              />
              <Input
                label="Expiry Date"
                type="date"
                value={editData?.expiryDate || ""}
                onChange={(e) => updateEditField("expiryDate", e.target.value)}
                error={errors.expiryDate}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 text-emerald-600" size={18} />
              <p className="text-sm text-emerald-900">
                Secure View enabled. Review complete medicine details before entering edit mode.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon size={16} className="text-slate-700" />
                    <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>
                  </div>
                  <div className="space-y-2">
                    {section.fields.map((field) => (
                      <InfoRow key={`${section.id}-${field.label}`} label={field.label} value={field.value} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
