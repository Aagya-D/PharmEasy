import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { SOSProvider, useSOSContext } from "../../context/SOSContext";
import Sidebar from "../components/Sidebar";
import httpClient from "../../core/services/httpClient";
import PharmacyNotificationBell from "../../features/pharmacy/components/PharmacyNotificationBell";
import PharmacyChatDrawer from "../../features/pharmacy/components/PharmacyChatDrawer";
import { MessageSquare } from "lucide-react";
import { connectSocket } from "../../core/services/socket";

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
          {/* ─── Top Header Bar ─── */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 py-3 border-b border-slate-200 bg-white/80 backdrop-blur">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              ☰ Menu
            </button>
            <div className="hidden lg:block" /> {/* spacer */}

            {/* Right icons */}
            <div className="flex items-center gap-2">
              {/* Chat / Message icon */}
              <button
                onClick={handleOpenChat}
                className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                title="Messages"
              >
                <MessageSquare size={20} />
                {chatBadge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full animate-bounce">
                    {chatBadge > 9 ? "9+" : chatBadge}
                  </span>
                )}
              </button>

              {/* Notification Bell */}
              <PharmacyNotificationBell />
            </div>
          </header>

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
