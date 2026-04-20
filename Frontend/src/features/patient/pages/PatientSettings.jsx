import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Save,
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Camera,
  Upload,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import httpClient from "../../../core/services/httpClient";
import patientService from "../../patient/services/patient.service";

export default function PatientSettings() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || "");
  const [notification, setNotification] = useState(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
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

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await httpClient.put("/patient/profile", profileData);

      if (response.data.success) {
        // Refresh user context
        await refreshUser();
        showNotification("success", "Profile updated successfully!");
      }
    } catch (error) {
      showNotification(
        "error",
        error.response?.data?.message || "Failed to update profile"
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

  // Handle avatar file change
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

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      showNotification("error", "Please choose an image first");
      return;
    }

    setAvatarUploading(true);
    try {
      await patientService.uploadAvatar(avatarFile);
      await refreshUser();
      setAvatarFile(null);
      showNotification("success", "Profile photo updated successfully");
    } catch (error) {
      showNotification(
        "error",
        error.response?.data?.message || "Failed to upload profile photo"
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle avatar removal
  const handleAvatarRemove = async () => {
    if (!user?.avatarUrl) {
      showNotification("error", "No profile photo to remove");
      return;
    }

    setAvatarUploading(true);
    try {
      await patientService.removeAvatar();
      await refreshUser();
      setAvatarFile(null);
      setAvatarPreview("");
      showNotification("success", "Profile photo removed successfully");
    } catch (error) {
      showNotification(
        "error",
        error.response?.data?.message || "Failed to remove profile photo"
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
          Manage your account settings and preferences
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

      <main className="p-6 max-w-5xl mx-auto">
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
              <User size={20} />
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
                  Personal Information
                </h2>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* Email (Read-only) */}
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

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  {/* Profile Photo */}
                  <div className="border-t pt-6 mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Profile Photo
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Upload JPG, PNG, or WEBP up to 2MB.</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <Upload size={16} />
                        Choose Photo
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
                        {avatarUploading ? <Loader className="animate-spin" size={16} /> : <Camera size={16} />}
                        Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={handleAvatarRemove}
                        disabled={!user?.avatarUrl || avatarUploading}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove Photo
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
                        <Save size={20} />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
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
          </div>
        </div>
      </main>
    </div>
  );
}
