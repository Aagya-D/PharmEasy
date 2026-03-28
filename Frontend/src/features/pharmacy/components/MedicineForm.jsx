import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  ShieldAlert,
  Route,
  Package,
  CircleDollarSign,
} from "lucide-react";
import { Input, TextArea } from "../../../shared/components/ui/Input";
import LoadingSpinner from "../../../shared/components/ui/LoadingSpinner";

const COMMON_GENERIC_NAMES = [
  "Paracetamol",
  "Ibuprofen",
  "Acetylsalicylic Acid",
  "Amoxicillin",
  "Azithromycin",
  "Ciprofloxacin",
  "Metformin",
  "Omeprazole",
  "Atorvastatin",
  "Amlodipine",
  "Losartan",
  "Lisinopril",
  "Metoprolol",
  "Levothyroxine",
  "Albuterol",
  "Cetirizine",
  "Loratadine",
  "Ranitidine",
  "Pantoprazole",
  "Diclofenac",
];

const STEPS = [
  { id: 1, title: "Core Info", icon: BookOpenText },
  { id: 2, title: "Safety", icon: ShieldAlert },
  { id: 3, title: "Usage", icon: Route },
  { id: 4, title: "Product Specs", icon: Package },
  { id: 5, title: "Purchase Info", icon: CircleDollarSign },
];

const getDefaultFormData = () => ({
  id: "",
  name: "",
  genericName: "",
  sideEffects: "",
  contraindications: "",
  warnings: "",
  isPrescriptionRequired: false,
  dosageInstructions: "",
  route: "ORAL",
  timing: "AFTER_FOOD",
  strength: "",
  form: "",
  manufacturer: "",
  batchNumber: "",
  quantity: "",
  price: "",
  expiryDate: "",
});

const mapInitialData = (initialData) => {
  if (!initialData) return getDefaultFormData();

  const expiryDate = initialData.expiryDate
    ? new Date(initialData.expiryDate).toISOString().slice(0, 10)
    : "";

  return {
    id: initialData.id || "",
    name: initialData.name || "",
    genericName: initialData.genericName || "",
    sideEffects: initialData.sideEffects || "",
    contraindications: initialData.contraindications || "",
    warnings: initialData.warnings || "",
    isPrescriptionRequired: Boolean(initialData.isPrescriptionRequired),
    dosageInstructions: initialData.dosageInstructions || "",
    route: initialData.route || "ORAL",
    timing: initialData.timing || "AFTER_FOOD",
    strength: initialData.strength || "",
    form: initialData.form || "",
    manufacturer: initialData.manufacturer || "",
    batchNumber: initialData.batchNumber || "",
    quantity:
      initialData.quantity !== undefined && initialData.quantity !== null
        ? String(initialData.quantity)
        : "",
    price:
      initialData.price !== undefined && initialData.price !== null
        ? String(initialData.price)
        : "",
    expiryDate,
  };
};

export default function MedicineForm({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const isEditMode = Boolean(initialData?.id);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(getDefaultFormData());
  const [errors, setErrors] = useState({});
  const [filteredGenericNames, setFilteredGenericNames] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setFormData(mapInitialData(initialData));
    setCurrentStep(1);
    setErrors({});
    setShowSuggestions(false);
    setFilteredGenericNames([]);
  }, [initialData]);

  const title = isEditMode ? "Edit Medicine Details" : "Add New Medicine";

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, submit: undefined }));
  };

  const handleGenericNameChange = (value) => {
    updateField("genericName", value);

    if (value.length > 0) {
      const filtered = COMMON_GENERIC_NAMES.filter((name) =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredGenericNames(filtered);
      setShowSuggestions(true);
      return;
    }

    setFilteredGenericNames([]);
    setShowSuggestions(false);
  };

  const validateStep = (step = currentStep) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = "Medicine name is required";
      if (!formData.genericName.trim()) newErrors.genericName = "Generic name is required";
    }

    if (step === 2) {
      if (!formData.sideEffects.trim()) newErrors.sideEffects = "Side effects are required";
      if (!formData.contraindications.trim()) {
        newErrors.contraindications = "Contraindications are required";
      }
      if (!formData.warnings.trim()) newErrors.warnings = "Warnings are required";
    }

    if (step === 3) {
      if (!formData.dosageInstructions.trim()) {
        newErrors.dosageInstructions = "Dosage instructions are required";
      }
    }

    if (step === 4) {
      if (!formData.strength.trim()) newErrors.strength = "Strength is required";
      if (!formData.form.trim()) newErrors.form = "Form is required";
      if (!formData.manufacturer.trim()) newErrors.manufacturer = "Manufacturer is required";
      if (!formData.batchNumber.trim()) newErrors.batchNumber = "Batch number is required";
    }

    if (step === 5) {
      if (formData.quantity === "" || Number(formData.quantity) < 0) {
        newErrors.quantity = "Quantity must be 0 or greater";
      }

      if (formData.price === "" || Number(formData.price) <= 0) {
        newErrors.price = "Price must be greater than 0";
      }

      if (!formData.expiryDate) {
        newErrors.expiryDate = "Expiry date is required";
      } else {
        const expiryDate = new Date(formData.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          newErrors.expiryDate = "Expiry date must be in the future";
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAllSteps = () => {
    for (const step of STEPS) {
      if (!validateStep(step.id)) {
        setCurrentStep(step.id);
        return false;
      }
    }
    return true;
  };

  const safetyComplete =
    formData.sideEffects.trim() &&
    formData.contraindications.trim() &&
    formData.warnings.trim();

  const canPublish = useMemo(() => {
    return (
      !submitting &&
      formData.name.trim() &&
      formData.genericName.trim() &&
      formData.sideEffects.trim() &&
      formData.contraindications.trim() &&
      formData.warnings.trim() &&
      formData.dosageInstructions.trim() &&
      formData.strength.trim() &&
      formData.form.trim() &&
      formData.manufacturer.trim() &&
      formData.batchNumber.trim() &&
      formData.quantity !== "" &&
      Number(formData.quantity) >= 0 &&
      formData.price !== "" &&
      Number(formData.price) > 0 &&
      Boolean(formData.expiryDate)
    );
  }, [formData, submitting]);

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateAllSteps()) return;

    onSubmit({
      name: formData.name.trim(),
      genericName: formData.genericName.trim(),
      sideEffects: formData.sideEffects.trim(),
      contraindications: formData.contraindications.trim(),
      warnings: formData.warnings.trim(),
      isPrescriptionRequired: Boolean(formData.isPrescriptionRequired),
      dosageInstructions: formData.dosageInstructions.trim(),
      route: formData.route,
      timing: formData.timing,
      strength: formData.strength.trim(),
      form: formData.form.trim(),
      manufacturer: formData.manufacturer.trim(),
      batchNumber: formData.batchNumber.trim(),
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      expiryDate: formData.expiryDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600 mt-1">
          Safety-first medicine lifecycle with complete clinical and purchase details.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {STEPS.map((step) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "border-blue-600 bg-blue-50"
                    : isCompleted
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <StepIcon size={14} className={isActive ? "text-blue-700" : "text-slate-600"} />
                  <span className="text-xs font-semibold text-slate-800">{step.id}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{step.title}</p>
              </button>
            );
          })}
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      {currentStep === 1 && (
        <>
          <Input
            label="Medicine Name"
            placeholder="e.g., Cetamol 500mg"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            error={errors.name}
            required
          />

          <div className="relative">
            <Input
              label="Generic Name"
              placeholder="e.g., Paracetamol"
              value={formData.genericName}
              onChange={(e) => handleGenericNameChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              error={errors.genericName}
              required
            />
            {showSuggestions && filteredGenericNames.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredGenericNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      updateField("genericName", name);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {currentStep === 2 && (
        <>
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wider text-red-700">PRESCRIPTION CONTROL</p>
                <p className="mt-1 text-sm text-red-800">
                  High-visibility switch to communicate prescription requirement to patients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateField("isPrescriptionRequired", !formData.isPrescriptionRequired)}
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  formData.isPrescriptionRequired
                    ? "bg-red-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {formData.isPrescriptionRequired ? "Prescription Required" : "No Prescription"}
              </button>
            </div>
          </div>

          <TextArea
            label="Side Effects"
            placeholder="List common and serious side effects"
            value={formData.sideEffects}
            onChange={(e) => updateField("sideEffects", e.target.value)}
            error={errors.sideEffects}
            required
            rows={3}
          />

          <TextArea
            label="Contraindications"
            placeholder="Who should avoid this medicine?"
            value={formData.contraindications}
            onChange={(e) => updateField("contraindications", e.target.value)}
            error={errors.contraindications}
            required
            rows={3}
          />

          <TextArea
            label="Warnings"
            placeholder="Pregnancy, organ risks, severe interaction warnings"
            value={formData.warnings}
            onChange={(e) => updateField("warnings", e.target.value)}
            error={errors.warnings}
            required
            rows={3}
          />
        </>
      )}

      {currentStep === 3 && (
        <>
          <TextArea
            label="Dosage Instructions"
            placeholder="e.g., 1 tablet twice daily for 5 days"
            value={formData.dosageInstructions}
            onChange={(e) => updateField("dosageInstructions", e.target.value)}
            error={errors.dosageInstructions}
            required
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Route</label>
              <select
                value={formData.route}
                onChange={(e) => updateField("route", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
              >
                <option value="ORAL">Oral</option>
                <option value="TOPICAL">Topical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Timing</label>
              <select
                value={formData.timing}
                onChange={(e) => updateField("timing", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
              >
                <option value="BEFORE_FOOD">Before food</option>
                <option value="AFTER_FOOD">After food</option>
              </select>
            </div>
          </div>
        </>
      )}

      {currentStep === 4 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Strength"
            placeholder="e.g., 500mg"
            value={formData.strength}
            onChange={(e) => updateField("strength", e.target.value)}
            error={errors.strength}
            required
          />
          <Input
            label="Form"
            placeholder="e.g., Tablet / Syrup"
            value={formData.form}
            onChange={(e) => updateField("form", e.target.value)}
            error={errors.form}
            required
          />
          <Input
            label="Manufacturer"
            placeholder="e.g., ABC Pharma"
            value={formData.manufacturer}
            onChange={(e) => updateField("manufacturer", e.target.value)}
            error={errors.manufacturer}
            required
          />
          <Input
            label="Batch Number"
            placeholder="e.g., BT-2044"
            value={formData.batchNumber}
            onChange={(e) => updateField("batchNumber", e.target.value)}
            error={errors.batchNumber}
            required
          />
        </div>
      )}

      {currentStep === 5 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="0"
              placeholder="e.g., 100"
              value={formData.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
              error={errors.quantity}
              required
            />

            <Input
              label="Price (Rs.)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 5.99"
              value={formData.price}
              onChange={(e) => updateField("price", e.target.value)}
              error={errors.price}
              required
            />
          </div>

          <Input
            label="Expiry Date"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => updateField("expiryDate", e.target.value)}
            error={errors.expiryDate}
            required
          />

          {!safetyComplete && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">Complete Safety section before publishing changes.</p>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        {currentStep > 1 && (
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Previous
          </button>
        )}

        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canPublish}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <LoadingSpinner />
                Saving...
              </>
            ) : isEditMode ? (
              "Update Medicine"
            ) : (
              "Publish Medicine"
            )}
          </button>
        )}
      </div>
    </form>
  );
}
