import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LogOut, Mail } from "lucide-react";
import Layout from "../../../shared/layouts/Layout";
import { useAuth } from "../../../context/AuthContext";

export default function ApplicationRejected() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const rejectionReason =
    user?.pharmacy?.rejectionReason ||
    "Your application did not meet our verification requirements.";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Application Rejected</h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            We reviewed your pharmacy onboarding submission and, unfortunately, it was not approved.
          </p>

          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-left">
            <p className="text-sm text-red-700 font-semibold mb-2">Reason</p>
            <p className="text-sm text-red-700">{rejectionReason}</p>
          </div>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-sm text-slate-500">Need help?</p>
            <a
              href="mailto:support@pharmeasy.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Mail size={16} />
              support@pharmeasy.com
            </a>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
