import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  MapPin,
  Save,
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Building,
  Navigation,
  Crosshair,
  Key,
  ExternalLink,
  Camera,
  Upload,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAuth } from "../../../context/AuthContext";
import httpClient from "../../../core/services/httpClient";

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker component that updates position on drag
function DraggableMarker({ position, setPosition }) {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const pos = marker.getLatLng();
        setPosition([pos.lat, pos.lng]);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

// Map click handler component
function MapClickHandler({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Map Controller component to handle map centering when coordinates change
function MapController({ position, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, zoom);
  }, [position, zoom, map]);

  return null;
}

export default function PharmacySettings() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [geolocationLoading, setGeolocationLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState(13);

  // Map position state (default to Kathmandu, Nepal)
  const [mapPosition, setMapPosition] = useState([27.7172, 85.324]);

  // Location form state
  const [locationData, setLocationData] = useState({
    latitude: "",
    longitude: "",
    address: "",
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [khaltiLoading, setKhaltiLoading] = useState(false);
  const [editingKhalti, setEditingKhalti] = useState(false);
  const [showKhaltiSecret, setShowKhaltiSecret] = useState(false);
  const [khaltiSettings, setKhaltiSettings] = useState({
    status: "NOT_CONNECTED",
    isConnected: false,
    merchantSignupUrl: "https://merchant.khalti.com/",
    publicKey: "",
    hasSecretKey: false,
    secretKeyMasked: "",
  });
  const [khaltiForm, setKhaltiForm] = useState({
    publicKey: "",
    secretKey: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    setAvatarPreview(user?.avatarUrl || "");
  }, [user?.avatarUrl]);

  // Fetch pharmacy data on mount
  useEffect(() => {
    fetchPharmacyData();
    fetchKhaltiSettings();
  }, []);

  const fetchKhaltiSettings = async () => {
    try {
      const response = await httpClient.get("/pharmacy/settings/khalti");
      if (response.data?.success) {
        const data = response.data.data;
        setKhaltiSettings(data);
        setKhaltiForm({
          publicKey: data.publicKey || "",
          secretKey: "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch Khalti settings:", error);
    }
  };

  const fetchPharmacyData = async () => {
    try {
      const response = await httpClient.get("/pharmacy/my-pharmacy");
      if (response.data.success) {
        const pharmacyData = response.data.data;
        setPharmacy(pharmacyData);

        // Set location data if available
        if (pharmacyData.latitude && pharmacyData.longitude) {
          setLocationData({
            latitude: pharmacyData.latitude.toString(),
            longitude: pharmacyData.longitude.toString(),
            address: pharmacyData.address || "",
          });
          setMapPosition([pharmacyData.latitude, pharmacyData.longitude]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy data:", error);
    }
  };

  // Update location inputs when map position changes
  useEffect(() => {
    setLocationData((prev) => ({
      ...prev,
      latitude: mapPosition[0].toFixed(6),
      longitude: mapPosition[1].toFixed(6),
    }));
  }, [mapPosition]);

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Reverse geocoding function to get address from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "PharmEasy-App",
          },
        }
      );
      const data = await response.json();
      return data.address?.road || data.address?.village || data.address?.town || data.address?.city || "Address not found";
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "";
    }
  };

  // Handle location detection using browser's geolocation API
  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      showNotification("error", "Geolocation is not supported by your browser");
      return;
    }

    setGeolocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Validate location is within Nepal bounds
          // Nepal boundaries: ~26°N to 30.5°N latitude, ~80°E to 88.2°E longitude
          if (latitude < 26 || latitude > 30.5 || longitude < 80 || longitude > 88.2) {
            showNotification(
              "warning",
              "Location detected outside Nepal. Please ensure your location is within Nepal's boundaries."
            );
          }
          
          // Update map position with high zoom level for detailed view
          setMapPosition([latitude, longitude]);
          setMapZoom(18);

          // Get address via reverse geocoding
          const address = await reverseGeocode(latitude, longitude);

          // Update location data
          setLocationData({
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            address: address,
          });

          showNotification("success", "Location detected successfully!");
        } catch (error) {
          showNotification("error", "Failed to process location data");
        } finally {
          setGeolocationLoading(false);
        }
      },
      (error) => {
        setGeolocationLoading(false);
        
        // Handle specific geolocation errors
        switch (error.code) {
          case error.PERMISSION_DENIED:
            showNotification(
              "error",
              "Location permission denied. Please enable location access in your browser settings."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            showNotification(
              "error",
              "Location information is unavailable at the moment. Please try again."
            );
            break;
          case error.TIMEOUT:
            showNotification(
              "error",
              "Location request timed out. Please try again."
            );
            break;
          default:
            showNotification("error", "Failed to detect location");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle location update
  const handleLocationUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await httpClient.patch("/pharmacy/update-location", {
        latitude: parseFloat(locationData.latitude),
        longitude: parseFloat(locationData.longitude),
        address: locationData.address,
      });

      if (response.data.success) {
        showNotification(
          "success",
          `Location updated for ${pharmacy.pharmacyName} successfully!`
        );
        await fetchPharmacyData();
      }
    } catch (error) {
      showNotification(
        "error",
        error.response?.data?.message || "Failed to update location"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification("error", "New password and confirmation do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showNotification("error", "Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await httpClient.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      if (response.data.success) {
        showNotification("success", "Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      showNotification(
        "error",
        error.response?.data?.message || "Failed to change password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKhaltiSettings = async (e) => {
    e.preventDefault();

    if (!khaltiForm.publicKey.trim()) {
      showNotification("error", "Khalti Public Key is required");
      return;
    }

    setKhaltiLoading(true);
    try {
      const response = await httpClient.put("/pharmacy/settings/khalti", {
        publicKey: khaltiForm.publicKey.trim(),
        secretKey: khaltiForm.secretKey.trim() || undefined,
      });

      if (response.data?.success) {
        setKhaltiSettings(response.data.data);
        setKhaltiForm((prev) => ({
          ...prev,
          publicKey: response.data.data.publicKey || prev.publicKey,
          secretKey: "",
        }));
        setEditingKhalti(false);
        setShowKhaltiSecret(false);
        showNotification("success", "Khalti merchant settings saved successfully");
      }
    } catch (error) {
      showNotification(
        "error",
        error.response?.data?.message || "Failed to save Khalti merchant settings"
      );
    } finally {
      setKhaltiLoading(false);
    }
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showNotification("error", "Only JPG, PNG, or WEBP images are allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showNotification("error", "Profile photo must be under 2MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      showNotification("error", "Please choose an image first");
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const response = await httpClient.patch("/user/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success) {
        await refreshUser();
        setAvatarFile(null);
        showNotification("success", "Profile photo updated successfully");
      }
    } catch (error) {
      showNotification(
        "error",
        error.response?.data?.message || "Failed to upload profile photo"
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  // Password strength calculator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "None", color: "gray" };
    if (password.length < 6)
      return { strength: 25, label: "Weak", color: "red" };
    if (password.length < 8)
      return { strength: 50, label: "Fair", color: "orange" };
    if (password.length < 12)
      return { strength: 75, label: "Good", color: "blue" };
    return { strength: 100, label: "Strong", color: "green" };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your pharmacy settings and configuration
        </p>
      </header>

      {/* Notification Toast */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50"
        >
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </motion.div>
      )}

      <main className="p-6 max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "profile"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building size={20} />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "security"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Lock size={20} />
              Security
            </button>
            <button
              onClick={() => setActiveTab("location")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "location"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <MapPin size={20} />
              Location
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "payment"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Key size={20} />
              Payment
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Pharmacy Information
                </h2>
                <div className="space-y-6">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Profile Photo
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-blue-200 bg-white overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt={user?.name || "Profile"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Camera className="text-blue-500" size={26} />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            <Upload size={16} />
                            Upload New Photo
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={handleAvatarFileChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleAvatarUpload}
                            disabled={!avatarFile || avatarUploading}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {avatarUploading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                            Save Photo
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">JPG, PNG, WEBP up to 2MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Pharmacy Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pharmacy Name
                    </label>
                    <div className="relative">
                      <Building
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                      <input
                        type="text"
                        value={pharmacy?.pharmacyName || ""}
                        disabled
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Contact support to change pharmacy name
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={pharmacy?.licenseNumber || ""}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  {/* Verification Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Status
                    </label>
                    <span
                      className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${
                        pharmacy?.verificationStatus === "VERIFIED"
                          ? "bg-green-100 text-green-700"
                          : pharmacy?.verificationStatus === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {pharmacy?.verificationStatus || "Unknown"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Change Password
                </h2>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                      <input
                        type={showPassword.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword({
                            ...showPassword,
                            current: !showPassword.current,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.current ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                      <input
                        type={showPassword.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword({
                            ...showPassword,
                            new: !showPassword.new,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {/* Password Strength Meter */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">
                            Password Strength
                          </span>
                          <span
                            className={`text-xs font-medium text-${passwordStrength.color}-600`}
                          >
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${passwordStrength.color}-500 transition-all duration-300`}
                            style={{ width: `${passwordStrength.strength}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Re-enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword({
                            ...showPassword,
                            confirm: !showPassword.confirm,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.confirm ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader className="animate-spin" size={20} />
                      ) : (
                        <Lock size={20} />
                      )}
                      Change Password
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Location Tab */}
            {activeTab === "location" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Pharmacy Location
                </h2>
                <form onSubmit={handleLocationUpdate} className="space-y-6">
                  {/* Map */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Drag the marker to set your pharmacy location
                    </label>
                    <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
                      <MapContainer
                        center={mapPosition}
                        zoom={mapZoom}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapController position={mapPosition} zoom={mapZoom} />
                        <DraggableMarker
                          position={mapPosition}
                          setPosition={setMapPosition}
                        />
                        <MapClickHandler setPosition={setMapPosition} />
                      </MapContainer>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Click on the map or drag the marker to update your location
                    </p>
                  </div>

                  {/* Coordinates */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Coordinates
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={geolocationLoading}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {geolocationLoading ? (
                          <>
                            <Loader className="animate-spin" size={16} />
                            Detecting...
                          </>
                        ) : (
                          <>
                            <Crosshair size={16} />
                            Use Current Location
                          </>
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Latitude
                        </label>
                        <div className="relative">
                          <Navigation
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={20}
                          />
                          <input
                            type="text"
                            value={locationData.latitude}
                            onChange={(e) => {
                              setLocationData({
                                ...locationData,
                                latitude: e.target.value,
                              });
                              const lat = parseFloat(e.target.value);
                              if (!isNaN(lat)) {
                                setMapPosition([lat, mapPosition[1]]);
                              }
                            }}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="27.7172"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Longitude
                        </label>
                        <div className="relative">
                          <Navigation
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={20}
                          />
                          <input
                            type="text"
                            value={locationData.longitude}
                            onChange={(e) => {
                              setLocationData({
                                ...locationData,
                                longitude: e.target.value,
                              });
                              const lng = parseFloat(e.target.value);
                              if (!isNaN(lng)) {
                                setMapPosition([mapPosition[0], lng]);
                              }
                            }}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="85.324"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin
                        className="absolute left-3 top-3 text-gray-400"
                        size={20}
                      />
                      <textarea
                        value={locationData.address}
                        onChange={(e) =>
                          setLocationData({
                            ...locationData,
                            address: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter complete address"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader className="animate-spin" size={20} />
                      ) : (
                        <Save size={20} />
                      )}
                      Update Location
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Payment Tab */}
            {activeTab === "payment" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Connect Khalti Merchant</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure Khalti merchant keys for online wallet payments.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKhalti((prev) => !prev);
                      setKhaltiForm((prev) => ({ ...prev, secretKey: "" }));
                      setShowKhaltiSecret(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {editingKhalti ? "Cancel" : "Edit"}
                  </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        khaltiSettings.isConnected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {khaltiSettings.isConnected ? "CONNECTED" : "NOT CONNECTED"}
                    </span>
                  </div>
                </div>

                <a
                  href={khaltiSettings.merchantSignupUrl || "https://merchant.khalti.com/"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800 mb-6"
                >
                  Open Khalti Merchant Signup
                  <ExternalLink size={16} />
                </a>

                <form onSubmit={handleSaveKhaltiSettings} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Khalti Public Key
                    </label>
                    <input
                      type="text"
                      value={khaltiForm.publicKey}
                      onChange={(e) => setKhaltiForm((prev) => ({ ...prev, publicKey: e.target.value }))}
                      disabled={!editingKhalti || khaltiLoading}
                      placeholder="4179c2f390904c40a265a18a7f87d8cb"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Khalti Secret Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKhaltiSecret ? "text" : "password"}
                        value={khaltiForm.secretKey}
                        onChange={(e) => setKhaltiForm((prev) => ({ ...prev, secretKey: e.target.value }))}
                        disabled={!editingKhalti || khaltiLoading}
                        placeholder={khaltiSettings.hasSecretKey ? khaltiSettings.secretKeyMasked || "••••••••••••••••••••" : "Enter Khalti Secret Key"}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKhaltiSecret((prev) => !prev)}
                        disabled={!editingKhalti || khaltiLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        {showKhaltiSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Secret keys are encrypted at rest and are never returned by the API after save.
                    </p>
                  </div>

                  {editingKhalti && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={khaltiLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {khaltiLoading ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                        Save Khalti Settings
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
