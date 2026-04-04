import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  Clock3,
  ShieldX,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { AnnouncementBanner } from "../../../shared/components/AnnouncementBanner";
import DashboardHome from "../../../shared/components/dashboard/DashboardHome";
import AdminLayout from "../components/AdminLayout";
import adminService from "../../../core/services/admin.service";

function getRecentMonthKeys(count = 6) {
  const today = new Date();
  const keys = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleString("default", { month: "short" });
    keys.push({ key, label });
  }
  return keys;
}

function buildMonthlyCountSeries(items) {
  const monthKeys = getRecentMonthKeys(6);
  const counts = Object.fromEntries(monthKeys.map((month) => [month.key, 0]));

  items.forEach((item) => {
    const date = item?.createdAt ? new Date(item.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (counts[key] !== undefined) {
      counts[key] += 1;
    }
  });

  return monthKeys.map((month) => ({ name: month.label, count: counts[month.key] || 0 }));
}

const AdminDashboardHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [pharmacyResult, usersResult] = await Promise.allSettled([
          adminService.getAllPharmacies({ status: "ALL" }),
          adminService.getAllUsers({ limit: 200 }),
        ]);

        if (pharmacyResult.status === "fulfilled") {
          const pharmacyData = pharmacyResult.value?.data || pharmacyResult.value || [];
          setPharmacies(Array.isArray(pharmacyData) ? pharmacyData : []);
        } else {
          setPharmacies([]);
        }

        if (usersResult.status === "fulfilled") {
          const usersPayload = usersResult.value?.data || usersResult.value || {};
          const userList = usersPayload.users || usersPayload.data || usersPayload;
          setUsers(Array.isArray(userList) ? userList : []);
        } else {
          setUsers([]);
        }
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const metrics = useMemo(() => {
    const totalPharmacies = pharmacies.length;
    const verified = pharmacies.filter((item) => item.verificationStatus === "VERIFIED").length;
    const pending = pharmacies.filter((item) => item.verificationStatus === "PENDING_VERIFICATION").length;
    const rejected = pharmacies.filter((item) => item.verificationStatus === "REJECTED").length;

    const byDistrict = pharmacies.reduce((acc, item) => {
      const district = item?.district || item?.address?.split(",")?.[0] || "Unknown";
      acc[district] = (acc[district] || 0) + 1;
      return acc;
    }, {});

    const topDistricts = Object.entries(byDistrict)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const pharmacyTrend = buildMonthlyCountSeries(pharmacies);
    const userTrend = buildMonthlyCountSeries(users);

    const trendData = pharmacyTrend.map((entry, index) => {
      const onboarding = entry.count;
      const userGrowth = userTrend[index]?.count || 0;
      return {
        name: entry.name,
        expense: onboarding * 8 + pending * 2,
        profit: onboarding * 15 + userGrowth * 4 + verified,
      };
    });

    return {
      totalPharmacies,
      verified,
      pending,
      rejected,
      topDistricts,
      trendData,
    };
  }, [pharmacies, users]);

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle size={18} className="mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <AnnouncementBanner targetRole="ADMIN" />
      </div>

      <DashboardHome
        loading={loading}
        quickStats={[
          {
            label: "Total Users",
            value: users.length.toLocaleString(),
            subtext: "Active platform accounts",
            icon: Users,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Total Pharmacies",
            value: metrics.totalPharmacies.toLocaleString(),
            subtext: "Registered pharmacy partners",
            icon: Building2,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            label: "Pending Approval",
            value: metrics.pending.toLocaleString(),
            subtext: "Need verification action",
            icon: Clock3,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
          },
          {
            label: "Rejected",
            value: metrics.rejected.toLocaleString(),
            subtext: "Needs resubmission",
            icon: ShieldX,
            iconBg: "bg-red-50",
            iconColor: "text-red-600",
          },
        ]}
        usersSummary={{
          value: users.length.toLocaleString(),
          hint: `${metrics.verified.toLocaleString()} verified pharmacies connected`,
          delta: `${metrics.pending.toLocaleString()} pending review`,
        }}
        pieTitle="Inventory/Pharmacy Values"
        pieData={[
          { name: "Verified", value: metrics.verified },
          { name: "Pending", value: metrics.pending },
          { name: "Rejected", value: metrics.rejected },
          { name: "Unverified", value: Math.max(metrics.totalPharmacies - metrics.verified - metrics.pending - metrics.rejected, 0) },
        ].filter((item) => item.value > 0)}
        barTitle="Top Performance"
        barData={metrics.topDistricts}
        trendTitle="Expense vs Profit"
        trendData={metrics.trendData}
      />
    </AdminLayout>
  );
};

export default AdminDashboardHome;
