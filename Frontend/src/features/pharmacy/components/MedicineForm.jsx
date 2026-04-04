import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
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
  { id: 1, title: "Core Identification" },
  { id: 2, title: "Safety Information" },
  { id: 3, title: "Dosage & Usage" },
  { id: 4, title: "Product Details" },
  { id: 5, title: "Review & Publish" },
];

const STEP_FIELDS = {
  1: ["name", "genericName"],
  2: ["sideEffects", "contraindications", "warnings"],
  3: ["dosageInstructions"],
  4: ["strength", "form", "manufacturer", "batchNumber", "quantity", "price", "expiryDate"],
};

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

function isFutureDate(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function FloatingField({ label, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <div className="relative">{children}<label className="pointer-events-none absolute -top-2 left-2.5 bg-white/70 px-1 text-[10px] font-medium text-slate-500">{label}</label></div>
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function MedicineForm({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const isEditMode = Boolean(initialData?.id);
  const [currentStep, setCurrentStep] = useState(1);
  const [filteredGenericNames, setFilteredGenericNames] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    register,
    control,
    reset,
    setValue,
    trigger,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: mapInitialData(initialData),
    mode: "onChange",
  });

  const values = useWatch({ control });

  useEffect(() => {
    reset(mapInitialData(initialData));
    setCurrentStep(1);
    setFilteredGenericNames([]);
    setShowSuggestions(false);
  }, [initialData, reset]);

  useEffect(() => {
    const generic = values?.genericName || "";
    if (!generic.trim()) {
      setFilteredGenericNames([]);
      return;
    }
    const list = COMMON_GENERIC_NAMES.filter((name) =>
      name.toLowerCase().includes(generic.toLowerCase())
    );
    setFilteredGenericNames(list);
  }, [values?.genericName]);

  const isStepComplete = (stepId) => {
    const v = getValues();

    if (stepId === 1) return Boolean(v.name?.trim() && v.genericName?.trim());
    if (stepId === 2) return Boolean(v.sideEffects?.trim() && v.contraindications?.trim() && v.warnings?.trim());
    if (stepId === 3) return Boolean(v.dosageInstructions?.trim());
    if (stepId === 4) {
      return Boolean(
        v.strength?.trim() &&
          v.form?.trim() &&
          v.manufacturer?.trim() &&
          v.batchNumber?.trim() &&
          v.quantity !== "" &&
          Number(v.quantity) >= 0 &&
          v.price !== "" &&
          Number(v.price) > 0 &&
          isFutureDate(v.expiryDate)
      );
    }

    return false;
  };

  const canGoNext = useMemo(() => {
    if (currentStep >= 5) return false;
    const fields = STEP_FIELDS[currentStep] || [];
    if (fields.length === 0) return true;
    return isStepComplete(currentStep) && fields.every((name) => !errors[name]);
  }, [currentStep, errors, values]);

  const title = isEditMode ? "Edit Medicine" : "Add New Medicine";

  const navigateToStep = async (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    const valid = await trigger(STEP_FIELDS[currentStep], { shouldFocus: true });
    if (valid) setCurrentStep(targetStep);
  };

  const goNext = async () => {
    if (currentStep >= 5) return;
    const valid = await trigger(STEP_FIELDS[currentStep], { shouldFocus: true });
    if (!valid) return;
    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const goBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const submitForm = (formData) => {
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

  const renderCoreIdentification = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="md:col-span-1">
        <FloatingField label="Brand Name" error={errors.name?.message}>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Cetamol 500mg"
            {...register("name", { required: "Brand name is required" })}
          />
        </FloatingField>
      </div>

      <div className="relative md:col-span-1">
        <FloatingField label="Generic Name" error={errors.genericName?.message}>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Paracetamol"
            {...register("genericName", { required: "Generic name is required" })}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
        </FloatingField>

        {showSuggestions && filteredGenericNames.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {filteredGenericNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setValue("genericName", name, { shouldValidate: true, shouldDirty: true });
                  setShowSuggestions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSafety = () => (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-emerald-700">PRESCRIPTION CONTROL</p>
            <p className="text-sm text-emerald-800">Use this toggle to enforce prescription-only dispensing.</p>
          </div>
          <button
            type="button"
            onClick={() => setValue("isPrescriptionRequired", !values?.isPrescriptionRequired, { shouldDirty: true })}
            className={`rounded-full px-4 py-2 text-xs font-semibold text-white ${
              values?.isPrescriptionRequired ? "bg-emerald-600" : "bg-slate-500"
            }`}
          >
            {values?.isPrescriptionRequired ? "Prescription Required" : "No Prescription"}
          </button>
        </div>
      </div>

      <FloatingField label="Side Effects" error={errors.sideEffects?.message}>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="List common and severe side effects"
          {...register("sideEffects", { required: "Side effects are required" })}
        />
      </FloatingField>

      <FloatingField label="Contraindications" error={errors.contraindications?.message}>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Who should avoid this medicine?"
          {...register("contraindications", { required: "Contraindications are required" })}
        />
      </FloatingField>

      <FloatingField label="Warnings" error={errors.warnings?.message}>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Pregnancy, organ-risk, and interaction warnings"
          {...register("warnings", { required: "Warnings are required" })}
        />
      </FloatingField>
    </div>
  );

  const renderDosage = () => (
    <div className="space-y-3">
      <FloatingField label="Dosage Instructions" error={errors.dosageInstructions?.message}>
        <textarea
          rows={4}
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 1 tablet twice daily for 5 days"
          {...register("dosageInstructions", { required: "Dosage instructions are required" })}
        />
      </FloatingField>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FloatingField label="Route" error={errors.route?.message}>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register("route")}
          >
            <option value="ORAL">Oral</option>
            <option value="TOPICAL">Topical</option>
          </select>
        </FloatingField>

        <FloatingField label="Timing" error={errors.timing?.message}>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register("timing")}
          >
            <option value="BEFORE_FOOD">Before Food</option>
            <option value="AFTER_FOOD">After Food</option>
          </select>
        </FloatingField>
      </div>
    </div>
  );

  const renderProductDetails = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <FloatingField label="Strength" error={errors.strength?.message}>
        <input
          type="text"
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 500mg"
          {...register("strength", { required: "Strength is required" })}
        />
      </FloatingField>

      <FloatingField label="Form" error={errors.form?.message}>
        <input
          type="text"
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Tablet"
          {...register("form", { required: "Form is required" })}
        />
      </FloatingField>

      <FloatingField label="Manufacturer" error={errors.manufacturer?.message}>
        <input
          type="text"
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., ABC Pharma"
          {...register("manufacturer", { required: "Manufacturer is required" })}
        />
      </FloatingField>

      <FloatingField label="Batch Number" error={errors.batchNumber?.message}>
        <input
          type="text"
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., BT-2044"
          {...register("batchNumber", { required: "Batch number is required" })}
        />
      </FloatingField>

      <FloatingField label="Quantity" error={errors.quantity?.message}>
        <input
          type="number"
          min="0"
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 100"
          {...register("quantity", {
            required: "Quantity is required",
            validate: (value) => Number(value) >= 0 || "Quantity must be 0 or greater",
          })}
        />
      </FloatingField>

      <FloatingField label="Price (Rs.)" error={errors.price?.message}>
        <input
          type="number"
          min="0"
          step="0.01"
          className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 5.99"
          {...register("price", {
            required: "Price is required",
            validate: (value) => Number(value) > 0 || "Price must be greater than 0",
          })}
        />
      </FloatingField>

      <div className="md:col-span-2">
        <FloatingField label="Expiry Date" error={errors.expiryDate?.message} hint="Must be today or a future date.">
          <input
            type="date"
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register("expiryDate", {
              required: "Expiry date is required",
              validate: (value) => isFutureDate(value) || "Expiry date must be in the future",
            })}
          />
        </FloatingField>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Review Before Publish</h3>
        <p className="mt-1 text-xs text-slate-500">Confirm all values below before publishing to inventory.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          ["Brand Name", values?.name],
          ["Generic Name", values?.genericName],
          ["Prescription", values?.isPrescriptionRequired ? "Required" : "Not Required"],
          ["Route", values?.route],
          ["Timing", values?.timing],
          ["Strength", values?.strength],
          ["Form", values?.form],
          ["Manufacturer", values?.manufacturer],
          ["Batch Number", values?.batchNumber],
          ["Quantity", values?.quantity],
          ["Price", values?.price],
          ["Expiry Date", values?.expiryDate],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-xs font-medium text-slate-500">Safety Notes</p>
        <p className="mt-1 text-sm text-slate-800">{values?.warnings || "-"}</p>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submitForm)} className="rounded-2xl border border-white/50 bg-white/70 shadow-none backdrop-blur-md">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <aside className="border-b border-slate-200/80 bg-slate-50/80 p-4 lg:col-span-3 lg:min-h-[620px] lg:border-b-0 lg:border-r">
          <div className="lg:sticky lg:top-6">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">Systematic medicine onboarding workflow.</p>

            <div className="mt-5 space-y-2.5">
              {STEPS.map((step, index) => {
                const completed = isStepComplete(step.id) && currentStep > step.id;
                const active = currentStep === step.id;
                const inactive = !completed && !active;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => navigateToStep(step.id)}
                    className="group flex w-full items-start gap-3 text-left"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                          completed
                            ? "bg-emerald-500 text-white"
                            : active
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {completed ? <Check size={14} /> : step.id}
                      </div>
                      {index < STEPS.length - 1 && <div className="mt-1 h-6 w-[1px] bg-slate-300" />}
                    </div>

                    <div className="pt-1">
                      <p className={`text-xs font-medium ${active ? "text-blue-700" : inactive ? "text-slate-500" : "text-emerald-700"}`}>
                        {step.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="max-h-[78vh] overflow-y-auto p-4 lg:col-span-9 lg:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="space-y-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{STEPS[currentStep - 1].title}</h3>
                <p className="text-xs font-medium text-slate-500">Step {currentStep} of {STEPS.length}</p>
              </div>

              {currentStep === 1 && renderCoreIdentification()}
              {currentStep === 2 && renderSafety()}
              {currentStep === 3 && renderDosage()}
              {currentStep === 4 && renderProductDetails()}
              {currentStep === 5 && renderReview()}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            {currentStep > 1 && (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting || !canGoNext}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner />
                    Saving...
                  </>
                ) : isEditMode ? (
                  "Update Medicine"
                ) : (
                  "Publish to Inventory"
                )}
              </button>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
