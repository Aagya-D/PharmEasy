import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { SOSProvider, useSOSContext } from "../../context/SOSContext";
import Sidebar from "../components/Sidebar";
import httpClient from "../../core/services/httpClient";
import PharmacyNotificationBell from "../../features/pharmacy/components/PharmacyNotificationBell";
import PharmacyChatDrawer from "../../features/pharmacy/components/PharmacyChatDrawer";
import { MessageSquare } from "lucide-react";
import { connectSocket } from "../../core/services/socket";
import DashboardHeader from "../components/dashboard/DashboardHeader";

/**
 * Inner component to initialize SOS count
 */
function ProtectedPharmacyLayoutInner({ children, isApprovedPharmacy }) {
  const { user } = useAuth();
  const { fetchSOSRequests } = useSOSContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatBadge, setChatBadge] = useState(0);

  // Get currentUser for chat drawer
  const currentUser = user
    ? { id: user.id, name: user.name || user.email, roleId: user.roleId }
    : null;

  // Initialize SOS count on mount for approved pharmacies
  useEffect(() => {
    if (isApprovedPharmacy) {
      fetchSOSRequests(httpClient);
    }
  }, [isApprovedPharmacy, fetchSOSRequests]);

  // Socket.IO: listen for NEW_CHAT_MESSAGE to bump the badge
  useEffect(() => {
    if (!isApprovedPharmacy) return;
    const socket = connectSocket();
    const onNewChat = () => setChatBadge((c) => c + 1);
    socket.on("NEW_CHAT_MESSAGE", onNewChat);
    return () => socket.off("NEW_CHAT_MESSAGE", onNewChat);
  }, [isApprovedPharmacy]);

  const handleOpenChat = useCallback(() => {
    setChatBadge(0);
    setChatOpen(true);
  }, []);

  if (!isApprovedPharmacy) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader
            onOpenSidebar={() => setSidebarOpen(true)}
            userName={user?.name || user?.email || "Pharmacy User"}
            title="Pharmacy Intelligence Hub"
            subtitle="Operations and inventory control"
            searchPlaceholder="Search medicines, customers, SOS records..."
            notificationSlot={(
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenChat}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600"
                  title="Messages"
                >
                  <MessageSquare size={18} />
                  {chatBadge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {chatBadge > 9 ? "9+" : chatBadge}
                    </span>
                  )}
                </button>
                <PharmacyNotificationBell />
              </div>
            )}
          />

          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>

      {/* Chat Drawer */}
      <PharmacyChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}

/**
 * Protected Pharmacy Layout
 * - Renders Sidebar only for approved pharmacy users
 * - Wraps all pharmacy routes with SOSProvider for dynamic badge
 * - Ensures onboarding/pending/rejected pages stay full-width
 */
export function ProtectedPharmacyLayout({ children }) {
  const { user } = useAuth();
  const isApprovedPharmacy = user?.roleId === 2 && user?.status === "APPROVED";

  return (
    <SOSProvider>
      <ProtectedPharmacyLayoutInner isApprovedPharmacy={isApprovedPharmacy}>
        {children}
      </ProtectedPharmacyLayoutInner>
    </SOSProvider>
  );
}

export default ProtectedPharmacyLayout;
