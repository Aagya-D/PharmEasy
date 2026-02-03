import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import Layout from "../../../../shared/layouts/Layout";
import { Button } from "../../../../shared/components/ui";
import patientService from "../../services/patient.service";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  LogOut,
  Save,
  AlertCircle,
  Loader,
} from "lucide-react";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    dateOfBirth: user?.dateOfBirth || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zipCode: user?.zipCode || "",
    emergencyContact: user?.emergencyContact || "",
    emergencyContactPhone: user?.emergencyContactPhone || "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await patientService.updateProfile(formData);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      // Refresh user data
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
      console.error("[PROFILE UPDATE]", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-6 mb-6 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <User size={32} />
              My Profile
            </h1>
            <p className="text-gray-600">Manage your account information</p>
          </div>
        </div>

        <div className="px-6 max-w-4xl mx-auto">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <div className="text-green-600 flex-shrink-0 mt-0.5">✓</div>
              <div>
                <p className="font-semibold text-green-900">{success}</p>
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            {/* Profile Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                  <User size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {formData.name}
                  </h2>
                  <p className="text-gray-600 flex items-center gap-1 mt-1">
                    <Mail size={16} />
                    {formData.email}
                  </p>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Form */}
            <div className={`${isEditing ? "block" : "hidden md:grid md:grid-cols-2"} gap-6`}>
              {/* Personal Information */}
              <div className={isEditing ? "md:col-span-2" : ""}>
                <h3 className="font-bold text-gray-900 mb-4 text-lg">
                  Personal Information
                </h3>
                <div className={`space-y-4 ${isEditing ? "md:grid md:grid-cols-2 md:gap-4 md:space-y-0" : ""}`}>
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        isEditing
                          ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          : "bg-gray-50"
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Enter phone number"
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        isEditing
                          ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          : "bg-gray-50"
                      }`}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        isEditing
                          ? "focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          : "bg-gray-50"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {isEditing && (
                <div className="md:col-span-2">
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">
                    Address Information
                  </h3>
                  <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter street address"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Enter city"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Enter state"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Zip Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="Enter zip code"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Contact Information */}
              {isEditing && (
                <div className="md:col-span-2">
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">
                    Emergency Contact
                  </h3>
                  <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                    {/* Emergency Contact Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleInputChange}
                        placeholder="Enter emergency contact name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Emergency Contact Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        name="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={handleInputChange}
                        placeholder="Enter emergency contact phone"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="mt-8 flex gap-4 justify-end border-t border-gray-200 pt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full p-4 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-200"
          >
            <LogOut size={20} />
            Logout from Account
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ProfilePage;
