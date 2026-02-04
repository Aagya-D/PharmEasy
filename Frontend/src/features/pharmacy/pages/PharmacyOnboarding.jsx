import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ChevronRight, FileText, MapPin, Navigation, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import Layout from "../../../shared/layouts/Layout";
import { Input, TextArea } from "../../../shared/components/ui/Input";
import { Button } from "../../../shared/components/ui/Button";
import { Alert } from "../../../shared/components/ui/Alert";
import { getMyPharmacy, submitPharmacyOnboarding } from "../../../core/services/pharmacy.service";

const PHONE_REGEX = /^[+]?\d{7,15}$/;

const PharmacyOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [licensePreview, setLicensePreview] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [existingPharmacy, setExistingPharmacy] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const submitGuardRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isValid, isSubmitting },
    watch,
  } = useForm({
    mode: "onChange",
    defaultValues: {
      pharmacyName: "",
      address: "",
      latitude: "",
      longitude: "",
      licenseNumber: "",
      contactNumber: "",
      email: "",
    },
  });

  const watchedLatitude = watch("latitude");
  const watchedLongitude = watch("longitude");

  const registerField = (name, options) => {
    const { ref, ...rest } = register(name, options);
    return { inputRef: ref, ...rest };
  };

  const existingStatus = existingPharmacy?.verificationStatus || "PENDING_VERIFICATION";

  const statusTone = useMemo(() => {
    switch (existingStatus) {
      case "VERIFIED":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "REJECTED":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-amber-700 bg-amber-50 border-amber-200";
    }
  }, [existingStatus]);

  useEffect(() => {
    let isMounted = true;

    const checkPharmacyStatus = async () => {
      try {
        const response = await getMyPharmacy();
        if (isMounted && response?.success && response?.data) {
          setExistingPharmacy(response.data);
        }
      } catch (err) {
        // No existing pharmacy found
      } finally {
        if (isMounted) {
          setCheckingStatus(false);
        }
      }
    };

    if (user?.roleId === 2) {
      checkPharmacyStatus();
    } else {
      setCheckingStatus(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!checkingStatus && user && user.roleId !== 2) {
      navigate("/dashboard");
    }
  }, [user, navigate, checkingStatus]);

  useEffect(() => {
    if (!licensePreview?.url) return;
    return () => URL.revokeObjectURL(licensePreview.url);
  }, [licensePreview]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setNotice({
        type: "error",
        title: "Unsupported file",
        message: "Upload a PDF, JPG, or PNG file.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotice({
        type: "error",
        title: "File too large",
        message: "Maximum file size is 5MB.",
      });
      return;
    }

    setLicenseFile(file);
    setNotice(null);

    if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setLicensePreview({ type: "image", url: previewUrl, name: file.name });
    } else {
      setLicensePreview({ type: "pdf", url: null, name: file.name });
    }
  };

  const handleGeoLocate = () => {
    if (!navigator.geolocation) {
      setNotice({
        type: "warning",
        title: "Geolocation not supported",
        message: "Your browser does not support geolocation.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("latitude", position.coords.latitude.toFixed(6), { shouldValidate: true });
        setValue("longitude", position.coords.longitude.toFixed(6), { shouldValidate: true });
        setNotice({
          type: "success",
          title: "Location captured",
          message: "Latitude and longitude populated from your device.",
        });
      },
      () => {
        setNotice({
          type: "error",
          title: "Location unavailable",
          message: "Unable to access your location. Please enter it manually.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const onSubmit = async (values) => {
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("pharmacyName", values.pharmacyName.trim());
      formData.append("address", values.address.trim());
      formData.append("licenseNumber", values.licenseNumber.trim());
      formData.append("contactNumber", values.contactNumber.trim());

      if (values.latitude) formData.append("latitude", Number(values.latitude));
      if (values.longitude) formData.append("longitude", Number(values.longitude));
      if (values.email) formData.append("email", values.email.trim());

      if (licenseFile) {
        formData.append("licenseDocument", licenseFile);
      }

      const response = await submitPharmacyOnboarding(formData);

      if (response?.success) {
        navigate("/pharmacy/pending-approval", { state: { pharmacy: response.data } });
        return;
      }

      setNotice({
        type: "success",
        title: "Onboarding submitted",
        message: "Your pharmacy details have been submitted for review.",
      });
      reset();
      setLicenseFile(null);
      setLicensePreview(null);
    } catch (error) {
      setNotice({
        type: "error",
        title: "Submission failed",
        message: error?.response?.data?.message || "Unable to submit onboarding details.",
      });
    } finally {
      submitGuardRef.current = false;
      setShowConfirm(false);
    }
  };

  const submitDisabled = !isValid || isSubmitting;

  if (checkingStatus) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-[var(--color-text-secondary)]">Checking pharmacy status...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (existingPharmacy) {
    if (existingStatus === "REJECTED") {
      return (
        <Layout>
          <div className="max-w-[800px] mx-auto p-6">
            <div className="bg-[#FEF2F2] rounded-xl p-6 border-2 border-[#FCA5A5]">
              <h1 className="text-2xl mb-4 text-[#991B1B]">Pharmacy Registration Rejected</h1>

              <p className="text-lg mb-6 text-[#7F1D1D]">
                Your pharmacy registration was rejected by the system administrator.
              </p>

              {existingPharmacy.rejectionReason && (
                <div className="bg-white p-4 rounded-lg mb-6">
                  <h3 className="text-base mb-2 text-[#991B1B] font-semibold">Rejection Reason:</h3>
                  <p className="text-[#7F1D1D]">{existingPharmacy.rejectionReason}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="danger" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
              </div>

              <div
                style={{
                  marginTop: "var(--spacing-lg)",
                  padding: "var(--spacing-md)",
                  backgroundColor: "white",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <p style={{ fontSize: "var(--font-size-sm)", color: "#7F1D1D" }}>
                  <strong>Note:</strong> You cannot re-submit your pharmacy registration after rejection. Please
                  contact support at <strong>admin@pharmeasy.com</strong> for assistance.
                </p>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="max-w-[800px] mx-auto p-6">
          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-6 border border-[var(--color-border)]">
            <h1 className="text-2xl mb-6 text-[var(--color-text-primary)]">Pharmacy Already Registered</h1>
            <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-semibold ${statusTone}`}>
              {existingStatus === "VERIFIED" && "Verified"}
              {existingStatus === "PENDING_VERIFICATION" && "Pending Verification"}
            </div>
            <p className="mt-4 text-[var(--color-text-secondary)]">
              You have already submitted your pharmacy details. You can review updates in your dashboard.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 mb-8">
            <div className="flex items-center text-sm text-slate-500">
              <span>Dashboard</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="text-slate-900 font-medium">Pharmacy Onboarding</span>
            </div>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Pharmacy Onboarding</h1>
                <p className="mt-2 text-slate-600 max-w-2xl">
                  Provide your pharmacy details for verification. Required fields are marked and submissions are
                  reviewed by the system administrator.
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full border text-sm font-semibold ${statusTone}`}>
                Pending Verification
              </div>
            </div>
          </div>

          {notice && (
            <div className="mb-6">
              <Alert
                type={notice.type}
                title={notice.title}
                message={notice.message}
                onDismiss={() => setNotice(null)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)] gap-8">
            <form
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6"
              onSubmit={handleSubmit(() => setShowConfirm(true))}
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Pharmacy Name"
                  placeholder="e.g., Good Health Pharmacy"
                  required
                  error={errors.pharmacyName?.message}
                  {...registerField("pharmacyName", {
                    required: "Pharmacy name is required",
                    minLength: { value: 3, message: "Minimum 3 characters" },
                  })}
                />

                <Input
                  label="License Number"
                  placeholder="License ID"
                  required
                  error={errors.licenseNumber?.message}
                  {...registerField("licenseNumber", {
                    required: "License number is required",
                    minLength: { value: 4, message: "Minimum 4 characters" },
                  })}
                />
              </div>

              <TextArea
                label="Address"
                placeholder="Street, city, and postal code"
                required
                error={errors.address?.message}
                {...registerField("address", {
                  required: "Address is required",
                  minLength: { value: 8, message: "Provide a full address" },
                })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Contact Number"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  required
                  error={errors.contactNumber?.message}
                  {...registerField("contactNumber", {
                    required: "Contact number is required",
                    pattern: {
                      value: PHONE_REGEX,
                      message: "Enter a valid phone number",
                    },
                  })}
                />

                <Input
                  label="Email (optional)"
                  type="email"
                  placeholder="contact@pharmacy.com"
                  error={errors.email?.message}
                  {...registerField("email", {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email",
                    },
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Latitude (optional)"
                  type="number"
                  placeholder="12.9716"
                  error={errors.latitude?.message}
                  {...registerField("latitude", {
                    validate: (value) => {
                      if (!value) return true;
                      const numeric = Number(value);
                      if (Number.isNaN(numeric)) return "Enter a valid latitude";
                      if (numeric < -90 || numeric > 90) return "Latitude must be between -90 and 90";
                      return true;
                    },
                  })}
                />

                <Input
                  label="Longitude (optional)"
                  type="number"
                  placeholder="77.5946"
                  error={errors.longitude?.message}
                  {...registerField("longitude", {
                    validate: (value) => {
                      if (!value) return true;
                      const numeric = Number(value);
                      if (Number.isNaN(numeric)) return "Enter a valid longitude";
                      if (numeric < -180 || numeric > 180) return "Longitude must be between -180 and 180";
                      return true;
                    },
                  })}
                />
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-500">
                <MapPin className="w-4 h-4 text-cyan-600" />
                <span>
                  {watchedLatitude && watchedLongitude
                    ? `Location set (${watchedLatitude}, ${watchedLongitude})`
                    : "Add coordinates to improve matching with patients."}
                </span>
                <button
                  type="button"
                  onClick={handleGeoLocate}
                  className="ml-auto inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  <Navigation className="w-4 h-4" />
                  Use my location
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    License Document (optional)
                  </label>
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-700 font-medium">Upload PDF or image</p>
                        <p className="text-xs text-slate-500">Maximum size 5MB.</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="mt-3 block w-full text-sm text-slate-600"
                    />
                  </div>
                  {licensePreview && (
                    <div className="mt-3 p-3 border border-slate-200 rounded-lg bg-white flex items-center gap-3">
                      {licensePreview.type === "image" ? (
                        <img
                          src={licensePreview.url}
                          alt="License preview"
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-slate-50">
                          <FileText className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-800">{licensePreview.name}</p>
                        <p className="text-xs text-slate-500">Ready to upload</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Verification Status</label>
                  <div className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-800 bg-slate-50">
                    PENDING_VERIFICATION
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Default is pending; status updates are managed by administrators.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 justify-between border-t border-slate-200 pt-6">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  Your data is encrypted and reviewed securely.
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset();
                      setLicenseFile(null);
                      setLicensePreview(null);
                      setNotice(null);
                    }}
                  >
                    Reset
                  </Button>
                  <Button type="submit" loading={isSubmitting} disabled={submitDisabled}>
                    Submit for Verification
                  </Button>
                </div>
              </div>
            </form>

            <aside className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Submission Checklist</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                    Ensure license number matches official records.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                    Provide a reachable phone number for verification calls.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                    Upload a clear license copy for faster approval.
                  </li>
                </ul>
              </div>
              <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-cyan-900">Need help?</h3>
                <p className="mt-2 text-sm text-cyan-800">
                  Contact our onboarding support team at
                  <span className="font-semibold"> support@pharmeasy.com</span>.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900">Confirm submission</h3>
            <p className="mt-2 text-sm text-slate-600">
              Submit the onboarding details for verification? You can track the status in your dashboard.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PharmacyOnboarding;


