import React from "react";
import { Settings } from "lucide-react";

export default function PharmacySettings() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your pharmacy configuration</p>
      </header>

      <main className="p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50">
              <Settings size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Business Profile</h2>
              <p className="text-sm text-gray-500">Update pharmacy name, address, and contact details.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="px-4 py-2.5 border border-gray-200 rounded-lg" placeholder="Pharmacy Name" />
            <input className="px-4 py-2.5 border border-gray-200 rounded-lg" placeholder="Contact Number" />
            <input className="px-4 py-2.5 border border-gray-200 rounded-lg" placeholder="Email" />
            <input className="px-4 py-2.5 border border-gray-200 rounded-lg" placeholder="Address" />
          </div>
          <button className="mt-4 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium">
            Save Changes
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-sm text-gray-500">Control alerts for low stock and SOS requests.</p>
          <div className="mt-4 flex items-center gap-3">
            <input type="checkbox" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-gray-700">Enable low stock alerts</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input type="checkbox" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-gray-700">Enable SOS notifications</span>
          </div>
        </div>
      </main>
    </div>
  );
}
