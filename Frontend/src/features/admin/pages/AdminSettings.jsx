import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Moon,
  Sun,
  Smartphone,
  Key,
  Copy,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import adminService from "../../../core/services/admin.service";
import AdminLayout from "../components/AdminLayout";
import { useDarkMode } from "../../../context/DarkModeContext";

/**
 * Password Strength Meter Component
 * Displays visual indicator of password strength
 */
const PasswordStrengthMeter = ({ password }) => {
  const calculateStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "" };

    let score = 0;
    
    // Length check
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    // Map score to strength level
    if (score <= 2) return { score: 1, label: "Weak", color: "red" };
    if (score <= 4) return { score: 2, label: "Medium", color: "yellow" };
    return { score: 3, label: "Strong", color: "green" };
  };

  const strength = calculateStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">Password Strength:</span>
        <span
          className={`text-xs font-semibold ${
            strength.color === "green"
              ? "text-green-600"
              : strength.color === "yellow"
              ? "text-yellow-600"
              : "text-red-600"
          }`}
        >
          {strength.label}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              level <= strength.score
                ? strength.color === "green"
                  ? "bg-green-500"
                  : strength.color === "yellow"
                  ? "bg-yellow-500"
                  : "bg-red-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      {strength.score < 3 && (
        <p className="text-xs text-gray-500 mt-1">
          Use 8+ characters with uppercase, lowercase, numbers, and symbols
        </p>
      )}
    </div>
  );
};

/**
 * Toast Notification Component
 */
const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
        type === "success"
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="text-green-600" size={20} />
      ) : (
        <AlertCircle className="text-red-600" size={20} />
      )}
      <p
        className={`font-medium ${
          type === "success" ? "text-green-900" : "text-red-900"
        }`}
      >
        {message}
      </p>
      <button
        onClick={onClose}
        className={`ml-4 ${
          type === "success" ? "text-green-600 hover:text-green-800" : "text-red-600 hover:text-red-800"
        }`}
      >
        ×
      </button>
    </motion.div>
  );
};

/**
 * Admin Settings Page
 * Profile management and password change
 */
const AdminSettings = () => {
  const { user, updateUser } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [toast, setToast] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState("");

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    reset: resetProfile,
  } = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPassword,
    watch,
  } = useForm();

  const watchNewPassword = watch("newPassword");

  // Update form when user changes
  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
      // Fetch 2FA status
      fetch2FAStatus();
    }
  }, [user, resetProfile]);

  const fetch2FAStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/2fa/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTwoFAEnabled(data.data.enabled);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

  const enable2FA = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/2fa/enable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setQrCodeUrl(data.data.qrCode);
        setSecret(data.data.secret);
        setBackupCodes(data.data.backupCodes);
        setShowQRCode(true);
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      setToast({ type: 'error', message: 'Failed to enable 2FA' });
    }
  };

  const verify2FA = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await response.json();
      if (data.success) {
        setTwoFAEnabled(true);
        setShowQRCode(false);
        setVerificationCode('');
        setToast({ type: 'success', message: '2FA enabled successfully!' });
      } else {
        setToast({ type: 'error', message: 'Invalid verification code' });
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setToast({ type: 'error', message: 'Failed to verify 2FA' });
    }
  };

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/admin/2fa/disable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTwoFAEnabled(false);
        setToast({ type: 'success', message: '2FA disabled successfully' });
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setToast({ type: 'error', message: 'Failed to disable 2FA' });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ type: 'success', message: 'Copied to clipboard!' });
  };

  // Handle profile update
  const onProfileSubmit = async (data) => {
    try {
      const response = await adminService.updateProfile(data);

      if (response.success) {
        // Update user in AuthContext and localStorage
        const updatedUser = {
          ...user,
          ...response.data.user,
        };
        updateUser(updatedUser);

        setToast({
          type: "success",
          message: "Profile updated successfully!",
        });
      }
    } catch (error) {
      setToast({
        type: "error",
        message: error.response?.data?.error?.message || "Failed to update profile",
      });
    }
  };

  // Handle password change
  const onPasswordSubmit = async (data) => {
    try {
      const response = await adminService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.success) {
        setToast({
          type: "success",
          message: "Password changed successfully!",
        });
        resetPassword();
        setNewPasswordValue("");
      }
    } catch (error) {
      setToast({
        type: "error",
        message: error.response?.data?.error?.message || "Failed to change password",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Toast Notification */}
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account details and security settings
          </p>
        </div>

        {/* Last Updated Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Clock className="text-blue-600" size={20} />
          <div>
            <p className="text-sm font-medium text-blue-900">Last Profile Update</p>
            <p className="text-xs text-blue-700">
              {user?.updatedAt 
                ? new Date(user.updatedAt).toLocaleString()
                : "Never updated"}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* General Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center gap-3">
              <User className="text-white" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  General Profile
                </h2>
                <p className="text-blue-100 text-sm">
                  Update your account information
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="p-6 space-y-6">
              {/* Name Field */}
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
                    {...registerProfile("name", {
                      required: "Name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      profileErrors.name ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>
                {profileErrors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileErrors.name.message}
                  </p>
                )}
              </div>

              {/* Email Field */}
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
                    {...registerProfile("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      profileErrors.email ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="admin@pharmeasy.com"
                  />
                </div>
                {profileErrors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileErrors.email.message}
                  </p>
                )}
              </div>

              {/* Phone Field */}
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
                    {...registerProfile("phone", {
                      pattern: {
                        value: /^[0-9+\-\s()]+$/,
                        message: "Invalid phone number",
                      },
                    })}
                    className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      profileErrors.phone ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                {profileErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">
                    {profileErrors.phone.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProfileSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isProfileSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Security Settings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center gap-3">
              <Shield className="text-white" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Security Settings
                </h2>
                <p className="text-purple-100 text-sm">
                  Update your password to keep your account secure
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="p-6 space-y-6">
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
                    type={showCurrentPassword ? "text" : "password"}
                    {...registerPassword("currentPassword", {
                      required: "Current password is required",
                    })}
                    className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      passwordErrors.currentPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
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
                    type={showNewPassword ? "text" : "password"}
                    {...registerPassword("newPassword", {
                      required: "New password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      onChange: (e) => setNewPasswordValue(e.target.value),
                    })}
                    className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      passwordErrors.newPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPasswordValue} />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm New Password */}
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
                    type={showConfirmPassword ? "text" : "password"}
                    {...registerPassword("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === watchNewPassword || "Passwords do not match",
                    })}
                    className={`w-full pl-11 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      passwordErrors.confirmPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Security Tips */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-900 mb-2">
                  Password Security Tips:
                </p>
                <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                  <li>Use at least 8 characters</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Add numbers and special characters</li>
                  <li>Avoid common words or personal information</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPasswordSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isPasswordSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock size={20} />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Dark Mode Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center gap-3">
              {isDarkMode ? <Moon className="text-white" size={24} /> : <Sun className="text-white" size={24} />}
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Appearance Settings
                </h2>
                <p className="text-indigo-100 text-sm">
                  Customize your interface theme
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    {isDarkMode ? <Moon className="text-indigo-600" size={24} /> : <Sun className="text-indigo-600" size={24} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Dark Mode</h3>
                    <p className="text-sm text-gray-600">
                      {isDarkMode ? 'Switch to light theme' : 'Switch to dark theme for reduced eye strain'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-900">
                  <strong>Note:</strong> Dark mode helps reduce eye strain during extended use and saves battery on OLED displays.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Two-Factor Authentication Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center gap-3">
              <Smartphone className="text-white" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Two-Factor Authentication (2FA)
                </h2>
                <p className="text-green-100 text-sm">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 2FA Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    twoFAEnabled ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Key className={twoFAEnabled ? 'text-green-600' : 'text-gray-600'} size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Status: {twoFAEnabled ? 'Enabled' : 'Disabled'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {twoFAEnabled 
                        ? 'Your account is protected with 2FA' 
                        : 'Enable 2FA for enhanced security'}
                    </p>
                  </div>
                </div>
                {!showQRCode && (
                  <button
                    onClick={twoFAEnabled ? disable2FA : enable2FA}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      twoFAEnabled
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                )}
              </div>

              {/* QR Code Setup */}
              {showQRCode && !twoFAEnabled && (
                <div className="border border-gray-200 rounded-lg p-6 space-y-6">
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Scan QR Code with Your Authenticator App
                    </h4>
                    {qrCodeUrl && (
                      <div className="inline-block bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-4">
                      Use apps like Google Authenticator, Authy, or Microsoft Authenticator
                    </p>
                  </div>

                  {/* Manual Secret */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or enter this secret manually:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={secret}
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(secret)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Verification Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter 6-digit verification code:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest"
                      />
                      <button
                        onClick={verify2FA}
                        disabled={verificationCode.length !== 6}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Verify
                      </button>
                    </div>
                  </div>

                  {/* Backup Codes */}
                  {backupCodes.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                        <AlertCircle size={18} />
                        Save Your Backup Codes
                      </h5>
                      <p className="text-sm text-yellow-800 mb-3">
                        Store these codes in a safe place. Each code can be used once if you lose access to your authenticator.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="font-mono text-sm bg-white px-3 py-2 rounded border border-yellow-300">
                            {code}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => copyToClipboard(backupCodes.join('\n'))}
                        className="mt-3 flex items-center gap-2 text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                      >
                        <Copy size={16} />
                        Copy All Codes
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowQRCode(false);
                      setVerificationCode('');
                    }}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* 2FA Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 mb-2">
                  Why Enable 2FA?
                </p>
                <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                  <li>Protects against unauthorized access even if your password is compromised</li>
                  <li>Required for admins managing sensitive data</li>
                  <li>Provides backup codes for emergency access</li>
                  <li>Works with popular authenticator apps</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
