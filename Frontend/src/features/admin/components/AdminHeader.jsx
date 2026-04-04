import React from "react";
import { useAuth } from "../../../context/AuthContext";
import NotificationDropdown from "../../../shared/components/NotificationDropdown";
import DashboardHeader from "../../../shared/components/dashboard/DashboardHeader";

const AdminHeader = ({ onOpenSidebar }) => {
  const { user } = useAuth();

  return (
    <DashboardHeader
      onOpenSidebar={onOpenSidebar}
      userName={user?.name || "System Admin"}
      title="Admin Intelligence Hub"
      subtitle="Platform overview"
      searchPlaceholder="Search users, pharmacies, reports..."
      notificationSlot={<NotificationDropdown mode="admin" />}
    />
  );
};

export default AdminHeader;
