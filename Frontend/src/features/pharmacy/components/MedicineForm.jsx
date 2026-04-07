import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import LoadingSpinner from "../../../shared/components/ui/LoadingSpinner";
import MedicineImage from "../../../shared/components/ui/MedicineImage";

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
  1: ["name", "genericName", "category"],
  2: ["sideEffects", "contraindications", "warnings"],
  3: ["dosageInstructions"],
  4: ["strength", "form", "manufacturer", "batchNumber", "quantity", "price", "expiryDate"],
};

const PRESET_MEDICINE_CATEGORIES = [
  { value: "fever", label: "Fever / Cold" },
  { value: "chronic", label: "Chronic Care" },
  { value: "baby", label: "Baby Care" },
  { value: "ayurvedic", label: "Ayurvedic" },
  { value: "firstaid", label: "First Aid" },
  { value: "surgical", label: "Surgical" },
  { value: "general", label: "General" },
];

const getDefaultFormData = () => ({
  id: "",
  name: "",
  genericName: "",
  category: "",
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
  imageUrl: "",
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
    category: initialData.category || "",
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
    imageUrl: initialData.imageUrl || "",
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

function ReadOnlyField({ label, value, hint }) {
  const display = value === null || value === undefined || value === "" ? "Not specified" : value;
  return (
    <div className="space-y-1.5">
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-900 whitespace-pre-wrap">{display}</p>
      </div>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function MedicineForm({
  initialData,
  onSubmit,
  onCancel,
  mode = "ADD",
  submitting = false,
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  const isViewMode = currentMode === "VIEW";
  const isEditMode = currentMode === "EDIT" || (currentMode === "ADD" && Boolean(initialData?.id));
  const [currentStep, setCurrentStep] = useState(1);
  const [filteredGenericNames, setFilteredGenericNames] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || "");
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState("");

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
    setCurrentMode(mode);
    reset(mapInitialData(initialData));
    setCurrentStep(1);
    setFilteredGenericNames([]);
    setShowSuggestions(false);
    setImageFile(null);
    setImagePreview(initialData?.imageUrl || "");
    setRemoveImage(false);
    setImageError("");
  }, [initialData, mode, reset]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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

    if (stepId === 1) return Boolean(v.name?.trim() && v.genericName?.trim() && v.category?.trim());
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

  const title = currentMode === "VIEW" ? "View Medicine" : isEditMode ? "Edit Medicine" : "Add New Medicine";

  const navigateToStep = async (targetStep) => {
    if (isViewMode) {
      setCurrentStep(targetStep);
      return;
    }

    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    const valid = await trigger(STEP_FIELDS[currentStep], { shouldFocus: true });
    if (valid) setCurrentStep(targetStep);
  };

  const goNext = async () => {
    if (currentStep >= 5) return;
    if (isViewMode) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
      return;
    }

    const valid = await trigger(STEP_FIELDS[currentStep], { shouldFocus: true });
    if (!valid) return;
    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const goBack = () => setCurrentStep((prev) => Math.max(1, prev - 1));

  const submitForm = (formData) => {
    if (isViewMode) return;

    onSubmit({
      name: formData.name.trim(),
      genericName: formData.genericName.trim(),
      category: formData.category.trim(),
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
      imageFile,
      removeImage,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      expiryDate: formData.expiryDate,
    });
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

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const preview = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(preview);
    setRemoveImage(false);
    setImageError("");
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(true);
    setImageError("");
  };

  const renderCoreIdentification = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="md:col-span-1">
        {isViewMode ? (
          <ReadOnlyField label="Brand Name" value={values?.name} />
        ) : (
          <FloatingField label="Brand Name" error={errors.name?.message}>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Cetamol 500mg"
              {...register("name", { required: "Brand name is required" })}
            />
          </FloatingField>
        )}
      </div>

      <div className="relative md:col-span-1">
        {isViewMode ? (
          <ReadOnlyField label="Generic Name" value={values?.genericName} />
        ) : (
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
        )}

        {!isViewMode && showSuggestions && filteredGenericNames.length > 0 && (
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

      <div className="md:col-span-1">
        {isViewMode ? (
          <ReadOnlyField label="Category" value={values?.category} hint="Used for dashboard medication type results." />
        ) : (
          <FloatingField label="Category (Dropdown)" error={errors.category?.message} hint="Pick a preset, or type your own in manual field below.">
            <select
              className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              value=""
              onChange={(e) => {
                const selected = e.target.value;
                if (!selected) return;
                setValue("category", selected, { shouldValidate: true, shouldDirty: true });
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
          </FloatingField>
        )}
      </div>

      <div className="md:col-span-1">
        {isViewMode ? null : (
          <FloatingField label="Category (Manual Entry)" error={errors.category?.message} hint="Example: fever, chronic, baby, firstaid">
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type category (e.g., fever)"
              {...register("category", { required: "Category is required" })}
            />
          </FloatingField>
        )}
      </div>

      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Medicine Photo</p>
            <p className="text-xs text-slate-500">Upload a clear product image for patient search and detail pages.</p>
          </div>
          {!isViewMode && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
              Upload Photo
            </label>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <MedicineImage
              src={imagePreview}
              alt={values?.name || "Medicine preview"}
              className="object-cover"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              {imageFile
                ? `${imageFile.name} selected`
                : imagePreview
                ? "Current medicine image"
                : "No photo selected. A medical placeholder will be shown to patients."}
            </p>
            {!isViewMode && (imageFile || imagePreview) && (
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
  );

  const renderSafety = () => (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-emerald-700">PRESCRIPTION CONTROL</p>
            <p className="text-sm text-emerald-800">Use this toggle to enforce prescription-only dispensing.</p>
          </div>
          {isViewMode ? (
            <span className={`rounded-full px-4 py-2 text-xs font-semibold text-white ${
              values?.isPrescriptionRequired ? "bg-emerald-600" : "bg-slate-500"
            }`}>
              {values?.isPrescriptionRequired ? "Prescription Required" : "No Prescription"}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setValue("isPrescriptionRequired", !values?.isPrescriptionRequired, { shouldDirty: true })}
              className={`rounded-full px-4 py-2 text-xs font-semibold text-white ${
                values?.isPrescriptionRequired ? "bg-emerald-600" : "bg-slate-500"
              }`}
            >
              {values?.isPrescriptionRequired ? "Prescription Required" : "No Prescription"}
            </button>
          )}
        </div>
      </div>

      {isViewMode ? (
        <ReadOnlyField label="Side Effects" value={values?.sideEffects} />
      ) : (
        <FloatingField label="Side Effects" error={errors.sideEffects?.message}>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List common and severe side effects"
            {...register("sideEffects", { required: "Side effects are required" })}
          />
        </FloatingField>
      )}

      {isViewMode ? (
        <ReadOnlyField label="Contraindications" value={values?.contraindications} />
      ) : (
        <FloatingField label="Contraindications" error={errors.contraindications?.message}>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Who should avoid this medicine?"
            {...register("contraindications", { required: "Contraindications are required" })}
          />
        </FloatingField>
      )}

      {isViewMode ? (
        <ReadOnlyField label="Warnings" value={values?.warnings} />
      ) : (
        <FloatingField label="Warnings" error={errors.warnings?.message}>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Pregnancy, organ-risk, and interaction warnings"
            {...register("warnings", { required: "Warnings are required" })}
          />
        </FloatingField>
      )}
    </div>
  );

  const renderDosage = () => (
    <div className="space-y-3">
      {isViewMode ? (
        <ReadOnlyField label="Dosage Instructions" value={values?.dosageInstructions} />
      ) : (
        <FloatingField label="Dosage Instructions" error={errors.dosageInstructions?.message}>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 1 tablet twice daily for 5 days"
            {...register("dosageInstructions", { required: "Dosage instructions are required" })}
          />
        </FloatingField>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {isViewMode ? (
          <ReadOnlyField label="Route" value={values?.route === "TOPICAL" ? "Topical" : "Oral"} />
        ) : (
          <FloatingField label="Route" error={errors.route?.message}>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("route")}
            >
              <option value="ORAL">Oral</option>
              <option value="TOPICAL">Topical</option>
            </select>
          </FloatingField>
        )}

        {isViewMode ? (
          <ReadOnlyField label="Timing" value={values?.timing === "BEFORE_FOOD" ? "Before Food" : "After Food"} />
        ) : (
          <FloatingField label="Timing" error={errors.timing?.message}>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("timing")}
            >
              <option value="BEFORE_FOOD">Before Food</option>
              <option value="AFTER_FOOD">After Food</option>
            </select>
          </FloatingField>
        )}
      </div>
    </div>
  );

  const renderProductDetails = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {isViewMode ? (
        <ReadOnlyField label="Strength" value={values?.strength} />
      ) : (
        <FloatingField label="Strength" error={errors.strength?.message}>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 500mg"
            {...register("strength", { required: "Strength is required" })}
          />
        </FloatingField>
      )}

      {isViewMode ? (
        <ReadOnlyField label="Form" value={values?.form} />
      ) : (
        <FloatingField label="Form" error={errors.form?.message}>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Tablet"
            {...register("form", { required: "Form is required" })}
          />
        </FloatingField>
      )}

      {isViewMode ? (
        <ReadOnlyField label="Manufacturer" value={values?.manufacturer} />
      ) : (
        <FloatingField label="Manufacturer" error={errors.manufacturer?.message}>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., ABC Pharma"
            {...register("manufacturer", { required: "Manufacturer is required" })}
          />
        </FloatingField>
      )}

      {isViewMode ? (
        <ReadOnlyField label="Batch Number" value={values?.batchNumber} />
      ) : (
        <FloatingField label="Batch Number" error={errors.batchNumber?.message}>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., BT-2044"
            {...register("batchNumber", { required: "Batch number is required" })}
          />
        </FloatingField>
      )}

      {isViewMode ? (
        <ReadOnlyField label="Quantity" value={values?.quantity} />
      ) : (
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
      )}

      {isViewMode ? (
        <ReadOnlyField label="Price (Rs.)" value={values?.price} />
      ) : (
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
      )}

      <div className="md:col-span-2">
        {isViewMode ? (
          <ReadOnlyField label="Expiry Date" value={values?.expiryDate} hint="Must be today or a future date." />
        ) : (
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
        )}
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
          ["Category", values?.category],
          ["Prescription", values?.isPrescriptionRequired ? "Required" : "Not Required"],
          ["Route", values?.route],
          ["Timing", values?.timing],
          ["Strength", values?.strength],
          ["Form", values?.form],
          ["Manufacturer", values?.manufacturer],
          ["Batch Number", values?.batchNumber],
          ["Image", imagePreview ? "Attached" : "Placeholder will be used"],
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
              key={`${currentMode}-${currentStep}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0, scale: currentMode === "EDIT" ? 1 : 0.995 }}
              exit={{ opacity: 0, x: -10, scale: 0.99 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{STEPS[currentStep - 1].title}</h3>
                <div className="flex items-center gap-2">
                  {isViewMode && (
                    <button
                      type="button"
                      onClick={() => setCurrentMode("EDIT")}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  )}
                  <p className="text-xs font-medium text-slate-500">Step {currentStep} of {STEPS.length}</p>
                </div>
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
                disabled={submitting || (!isViewMode && !canGoNext)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              !isViewMode && (
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
              )
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
