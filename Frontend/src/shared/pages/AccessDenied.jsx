import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function getDashboardPathByRole(roleId) {
  const normalizedRoleId = Number(roleId);

  if (normalizedRoleId === 1) return "/admin/dashboard";
  if (normalizedRoleId === 2) return "/pharmacy/dashboard";
  if (normalizedRoleId === 3) return "/patient/dashboard";

  return "/dashboard";
}

function getDashboardLabelByRole(roleId) {
  const normalizedRoleId = Number(roleId);

  if (normalizedRoleId === 1) return "Return to Admin Dashboard";
  if (normalizedRoleId === 2) return "Return to Pharmacy Dashboard";
  if (normalizedRoleId === 3) return "Return to Patient Dashboard";

  return "Return to My Dashboard";
}

export default function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const returnPath = getDashboardPathByRole(user?.roleId);
  const buttonLabel = getDashboardLabelByRole(user?.roleId);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm text-center">
        <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
          <Lock className="text-rose-600" size={28} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-3 text-slate-600">
          Access Denied. You do not have the required permissions to view this section.
        </p>

        <button
          type="button"
          onClick={() => navigate(returnPath, { replace: true })}
          className="mt-7 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
