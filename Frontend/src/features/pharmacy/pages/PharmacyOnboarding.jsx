import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ChevronRight, FileText, MapPin, Navigation, ShieldCheck, Upload, CheckCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from "../../../context/AuthContext";
import Layout from "../../../shared/layouts/Layout";
import { Input, TextArea } from "../../../shared/components/ui/Input";
import { Button } from "../../../shared/components/ui/Button";
import { Alert } from "../../../shared/components/ui/Alert";
import { getMyPharmacy, submitPharmacyOnboarding } from "../../../core/services/pharmacy.service";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PHONE_REGEX = /^[+]?\d{7,15}$/;

// Nepal geographic boundaries for validation
const NEPAL_BOUNDS = {
  minLat: 26.3478,
  maxLat: 30.4469,
  minLng: 80.0586,
  maxLng: 88.2015,
};

// Major cities in Nepal for quick selection
const NEPAL_CITIES = [
  { name: "Kathmandu", lat: 27.7172, lng: 85.3240 },
  { name: "Pokhara", lat: 28.2096, lng: 83.9856 },
  { name: "Biratnagar", lat: 26.4525, lng: 87.2718 },
  { name: "Bharatpur", lat: 27.6782, lng: 84.4351 },
  { name: "Lalitpur", lat: 27.6667, lng: 85.3167 },
  { name: "Dharan", lat: 26.8089, lng: 87.2823 },
  { name: "Butwal", lat: 27.7000, lng: 83.4500 },
  { name: "Hetauda", lat: 27.4287, lng: 85.0327 },
  { name: "Nepalgunj", lat: 28.0500, lng: 81.6167 },
  { name: "Dhangadhi", lat: 28.6939, lng: 80.5963 },
];

// Map location picker component
function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      // Validate if within Nepal boundaries
      if (
        lat >= NEPAL_BOUNDS.minLat &&
        lat <= NEPAL_BOUNDS.maxLat &&
        lng >= NEPAL_BOUNDS.minLng &&
        lng <= NEPAL_BOUNDS.maxLng
      ) {
        setPosition([lat, lng]);
      } else {
        alert('Please select a location within Nepal');
      }
    },
  });

  return position ? <Marker position={position} /> : null;
}

const PharmacyOnboarding = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [licensePreview, setLicensePreview] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [licenseError, setLicenseError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [existingPharmacy, setExistingPharmacy] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [mapPosition, setMapPosition] = useState(null);
  const [showMap, setShowMap] = useState(false);

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
        if (err?.response?.status !== 404) {
          console.error("Failed to fetch pharmacy details", err);
        }
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
      setLicenseError("Unsupported file type. Please upload PDF, JPG, or PNG.");
      setNotice({
        type: "error",
        title: "Unsupported file",
        message: "Upload a PDF, JPG, or PNG file.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLicenseError("File size exceeds 5MB limit.");
      setNotice({
        type: "error",
        title: "File too large",
        message: "Maximum file size is 5MB.",
      });
      return;
    }

    setLicenseFile(file);
    setLicenseError(null);
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

  // Handle map location selection
  const handleMapLocationSelect = (position) => {
    setMapPosition(position);
    setValue("latitude", position[0].toFixed(6), { shouldValidate: true });
    setValue("longitude", position[1].toFixed(6), { shouldValidate: true });
    setNotice({
      type: "success",
      title: "Location selected",
      message: "Coordinates updated from map selection.",
    });
  };

  // Handle city quick selection
  const handleCitySelect = (city) => {
    const position = [city.lat, city.lng];
    setMapPosition(position);
    setValue("latitude", city.lat.toFixed(6), { shouldValidate: true });
    setValue("longitude", city.lng.toFixed(6), { shouldValidate: true });
    setNotice({
      type: "success",
      title: `Location set to ${city.name}`,
      message: "You can fine-tune by clicking on the map.",
    });
  };

  // Sync form fields with map position
  useEffect(() => {
    if (watchedLatitude && watchedLongitude) {
      const lat = parseFloat(watchedLatitude);
      const lng = parseFloat(watchedLongitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapPosition([lat, lng]);
      }
    }
  }, [watchedLatitude, watchedLongitude]);

  const onSubmit = async (values) => {
    if (submitGuardRef.current) return;
    
    // Validate license document is uploaded
    if (!licenseFile) {
      setLicenseError("Pharmacy License is required to proceed with onboarding.");
      setNotice({
        type: "error",
        title: "Missing License Document",
        message: "Please upload your pharmacy license to continue.",
      });
      return;
    }
    
    submitGuardRef.current = true;
    setNotice(null);
    setLicenseError(null);

    try {
      const formData = new FormData();
      formData.append("pharmacyName", values.pharmacyName.trim());
      formData.append("address", values.address.trim());
      formData.append("licenseNumber", values.licenseNumber.trim());
      formData.append("contactNumber", values.contactNumber.trim());

      if (values.latitude) formData.append("latitude", Number(values.latitude));
      if (values.longitude) formData.append("longitude", Number(values.longitude));
      if (values.email) formData.append("email", values.email.trim());

      // Append license document file (REQUIRED)
      if (licenseFile) {
        formData.append("licenseDocument", licenseFile);
        console.log('[ONBOARD] License file attached:', {
          name: licenseFile.name,
          type: licenseFile.type,
          size: licenseFile.size
        });
      } else {
        console.error('[ONBOARD] No license file - this should not happen!');
      }

      const response = await submitPharmacyOnboarding(formData);

      if (response?.success) {
        if (user) {
          updateUser({ ...user, status: "PENDING" });
        }
        navigate("/pharmacy/waiting-approval", { state: { pharmacy: response.data } });
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
      setLicenseError(null);
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

  const submitDisabled = !isValid || isSubmitting || !licenseFile;

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
                  placeholder="+977 9812345678"
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
                  placeholder="27.7172"
                  error={errors.latitude?.message}
                  {...registerField("latitude", {
                    validate: (value) => {
                      if (!value) return true;
                      const numeric = Number(value);
                      if (Number.isNaN(numeric)) return "Enter a valid latitude";
                      if (numeric < NEPAL_BOUNDS.minLat || numeric > NEPAL_BOUNDS.maxLat) 
                        return `Latitude must be within Nepal (${NEPAL_BOUNDS.minLat} to ${NEPAL_BOUNDS.maxLat})`;
                      return true;
                    },
                  })}
                />

                <Input
                  label="Longitude (optional)"
                  type="number"
                  placeholder="85.3240"
                  error={errors.longitude?.message}
                  {...registerField("longitude", {
                    validate: (value) => {
                      if (!value) return true;
                      const numeric = Number(value);
                      if (Number.isNaN(numeric)) return "Enter a valid longitude";
                      if (numeric < NEPAL_BOUNDS.minLng || numeric > NEPAL_BOUNDS.maxLng) 
                        return `Longitude must be within Nepal (${NEPAL_BOUNDS.minLng} to ${NEPAL_BOUNDS.maxLng})`;
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

              {/* Interactive Map for Location Selection */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Select Location on Map</h3>
                  <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    {showMap ? 'Hide Map' : 'Show Map'}
                  </button>
                </div>

                {/* City Quick Select */}
                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-2">Quick select major city:</p>
                  <div className="flex flex-wrap gap-2">
                    {NEPAL_CITIES.slice(0, 5).map((city) => (
                      <button
                        key={city.name}
                        type="button"
                        onClick={() => {
                          handleCitySelect(city);
                          setShowMap(true);
                        }}
                        className="px-3 py-1 text-sm bg-white border border-cyan-200 rounded-lg hover:bg-cyan-50 hover:border-cyan-400 transition-colors"
                      >
                        {city.name}
                      </button>
                    ))}
                  </div>
                </div>

                {showMap && (
                  <div className="rounded-lg overflow-hidden border-2 border-cyan-300 shadow-lg">
                    <MapContainer
                      center={mapPosition || [27.7172, 85.3240]}
                      zoom={mapPosition ? 13 : 7}
                      style={{ height: '400px', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationPicker 
                        position={mapPosition} 
                        setPosition={handleMapLocationSelect} 
                      />
                    </MapContainer>
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-3">
                  💡 Click anywhere on the map within Nepal to set your pharmacy's exact location. 
                  This helps patients find you more easily.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    License Document <span style={{ color: "#EF4444", fontWeight: "bold" }}>*</span>
                  </label>
                  <div className={`border ${licenseError ? 'border-red-500' : 'border-dashed border-slate-300'} rounded-xl p-4 ${licenseError ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      {licenseFile ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Upload className="w-5 h-5 text-slate-500" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${licenseFile ? 'text-green-700' : 'text-slate-700'}`}>
                          {licenseFile ? 'Document uploaded ✓' : 'Upload PDF or image'}
                        </p>
                        <p className="text-xs text-slate-500">Maximum size 5MB. Required field.</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="mt-3 block w-full text-sm text-slate-600"
                      required
                    />
                  </div>
                  {licenseError && (
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      {licenseError}
                    </p>
                  )}
                  {licensePreview && (
                    <div className="mt-3 p-3 border border-green-200 rounded-lg bg-green-50 flex items-center gap-3">
                      {licensePreview.type === "image" ? (
                        <img
                          src={licensePreview.url}
                          alt="License preview"
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-white">
                          <FileText className="w-6 h-6 text-red-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">{licensePreview.name}</p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Ready to upload
                        </p>
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
                      setLicenseError(null);
                      setNotice(null);
                    }}
                  >
                    Reset
                  </Button>
                  <Button type="submit" loading={isSubmitting} disabled={submitDisabled}>
                    {!licenseFile ? 'Upload License to Continue' : 'Submit for Verification'}
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
                    <strong className="text-slate-900">Upload a valid pharmacy license document (Required)</strong>
                  </li>
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


