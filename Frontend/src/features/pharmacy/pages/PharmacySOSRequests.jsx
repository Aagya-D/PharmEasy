import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader,
  Navigation,
  Phone,
  Pill,
  Search,
  User,
  XCircle,
} from "lucide-react";
import httpClient from "../../../core/services/httpClient";
import { connectSocket } from "../../../core/services/socket";
import { playNotificationSound } from "../../../utils/notificationSound";
import { useSOSContext } from "../../../context/SOSContext";
import ChatWindow from "../../chat/components/ChatWindow";
import ConfirmationModal from "../components/ConfirmationModal";

export default function PharmacySOSRequests() {
  const { updateSOSCount } = useSOSContext();
  const [sosRequests, setSosRequests] = useState([]);
  const [caseRooms, setCaseRooms] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState("active");
  const [highlightedRoomId, setHighlightedRoomId] = useState(null);
  const [activeChatSOS, setActiveChatSOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [completingCaseId, setCompletingCaseId] = useState(null);
  const [rejectingCaseId, setRejectingCaseId] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, sosId: null, patientName: "" });
  const [rejectionNote, setRejectionNote] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [caseToComplete, setCaseToComplete] = useState(null);
  const [isCompletingConfirmed, setIsCompletingConfirmed] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser({
          id: parsed.userId || parsed.id,
          name: parsed.name || parsed.pharmacyName || "Pharmacy",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      await fetchSOSRequests();
      await fetchCaseRooms();
    };

    loadAll();

    const interval = setInterval(() => {
      fetchSOSRequests(true);
      fetchCaseRooms();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = connectSocket();

    const onNewSosAlert = () => {
      fetchSOSRequests(true);
      playNotificationSound("urgent");
      toast.success("🚨 New SOS request received.");
    };

    const onChatAvailability = () => {
      fetchCaseRooms();
    };

    const onNewMessage = (payload = {}) => {
      const recipientId = payload?.recipientId;
      if (recipientId && currentUser?.id && recipientId !== currentUser.id) return;
      fetchCaseRooms();
      playNotificationSound("urgent");
      toast.success("💬 New message received in SOS chat.");
    };

    const onCaseStatusUpdated = (payload = {}) => {
      const status = String(payload?.status || "").toUpperCase();
      const sosId = payload?.sosRequestId;
      const roomId = payload?.chatRoomId;

      if (!status || (!sosId && !roomId)) return;

      setCaseRooms((prev) =>
        prev.map((room) => {
          const shouldUpdate = (roomId && room.id === roomId)
            || (sosId && room.sosRequestId === sosId);
          if (!shouldUpdate) return room;

          return {
            ...room,
            sosRequest: {
              ...(room.sosRequest || {}),
              status,
            },
          };
        })
      );

      if (status === "COMPLETED") {
        setActiveFilterTab("completed");
      }
    };

    socket.on("NEW_SOS_ALERT", onNewSosAlert);
    socket.on("new_chat_available", onChatAvailability);
    socket.on("NEW_MESSAGE", onNewMessage);
    socket.on("new_message_notification", onNewMessage);
    socket.on("sos_case_status_updated", onCaseStatusUpdated);

    return () => {
      socket.off("NEW_SOS_ALERT", onNewSosAlert);
      socket.off("new_chat_available", onChatAvailability);
      socket.off("NEW_MESSAGE", onNewMessage);
      socket.off("new_message_notification", onNewMessage);
      socket.off("sos_case_status_updated", onCaseStatusUpdated);
    };
  }, [currentUser?.id]);

  const fetchSOSRequests = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await httpClient.get("/pharmacy/sos/nearby", {
        params: { radius: 50 },
      });

      if (response.data.success) {
        const sosData = response.data.data.sosRequests || [];
        setSosRequests(sosData);
        updateSOSCount(sosData);

      }
    } catch (err) {
      console.error("Error fetching SOS requests:", err);
      if (!silent) {
        setError(
          err.response?.data?.error?.message ||
          "Failed to load SOS requests. Please try again."
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchCaseRooms = async () => {
    try {
      const [activeResponse, archivedResponse] = await Promise.all([
        httpClient.get("/chat/rooms", { params: { status: "active" } }),
        httpClient.get("/chat/rooms", { params: { status: "completed" } }),
      ]);

      const activeRooms = activeResponse.data?.data?.chatRooms || [];
      const archivedRooms = archivedResponse.data?.data?.chatRooms || [];
      const merged = [...activeRooms, ...archivedRooms];
      const deduped = Array.from(new Map(merged.map((room) => [room.id, room])).values());
      setCaseRooms(deduped);
    } catch (err) {
      console.error("Error fetching SOS case rooms:", err);
    }
  };

  const handleRespond = async (sosId, response, note = "") => {
    setRespondingTo(sosId);

    try {
      await httpClient.post(`/pharmacy/sos/${sosId}/respond`, { response, note });

      await fetchSOSRequests(true);
      await fetchCaseRooms();

      if (response === "accepted") {
        setActiveFilterTab("active");
        playNotificationSound("standard");
        toast.success("✅ SOS request accepted! The patient has been notified.");
      }
    } catch (err) {
      console.error("Error responding to SOS:", err);
      toast.error(
        err.response?.data?.error?.message ||
          "❌ Failed to respond to SOS request. Please check your connection."
      );
    } finally {
      setRespondingTo(null);
    }
  };

  const handleCompleteCase = (room) => {
    setCaseToComplete(room);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmCompletion = async () => {
    if (!caseToComplete) return;

    const sosId = caseToComplete.sosRequestId;
    setIsCompletingConfirmed(true);
    setCompletingCaseId(sosId);

    try {
      await httpClient.patch(`/pharmacy/sos/${sosId}/complete`);

      let movedCase = null;
      setCaseRooms((prev) => {
        const updated = prev.map((entry) =>
          entry.sosRequestId === sosId
            ? {
                ...entry,
                sosRequest: {
                  ...entry.sosRequest,
                  status: "COMPLETED",
                },
              }
            : entry
        );

        movedCase = updated.find((entry) => entry.sosRequestId === sosId) || null;
        return updated;
      });

      if (movedCase) {
        setActiveFilterTab("completed");
        setHighlightedRoomId(movedCase.id);
      }

      playNotificationSound("standard");
      toast.success(`✅ SOS Case #${sosId} has been successfully completed and archived.`);
      setIsConfirmModalOpen(false);
      setCaseToComplete(null);
    } catch (err) {
      console.error("Error completing SOS case:", err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          "❌ Failed to complete case. Please try again."
      );
    } finally {
      setIsCompletingConfirmed(false);
      setCompletingCaseId(null);
    }
  };

  const handleCancelCompletion = () => {
    setIsConfirmModalOpen(false);
    setCaseToComplete(null);
  };

  const openRejectModal = (request) => {
    setRejectModal({
      open: true,
      sosId: request.id,
      patientName: request.patient?.name || request.patientName || "Patient",
    });
    setRejectionNote("");
  };

  const closeRejectModal = () => {
    setRejectModal({ open: false, sosId: null, patientName: "" });
    setRejectionNote("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.sosId) return;

    setRejectingCaseId(rejectModal.sosId);
    try {
      await httpClient.patch(`/pharmacy/sos/${rejectModal.sosId}/reject`, {
        note: rejectionNote.trim(),
      });

      await fetchSOSRequests(true);
      await fetchCaseRooms();

      playNotificationSound("urgent");
      toast.success("❌ Request has been declined.");
      closeRejectModal();
    } catch (err) {
      console.error("Error rejecting SOS:", err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          "❌ Failed to reject SOS request. Please try again."
      );
    } finally {
      setRejectingCaseId(null);
    }
  };

  const formatRelativeTime = (date) => {
    if (!date) return "now";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return `${Math.max(seconds, 1)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const getInitials = (name) => {
    if (!name) return "PT";
    const words = String(name).trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  };

  const getStatusSnippet = (room) => {
    const lastMessage = room?.lastMessage?.content;
    if (lastMessage) return lastMessage;

    const status = String(room?.sosRequest?.status || "").toUpperCase();
    if (status === "ACCEPTED") return "Awaiting response...";
    if (status === "COMPLETED") return "Case completed successfully.";
    return "Emergency coordination in progress.";
  };

  const normalizeStatus = (value) => String(value || "").toUpperCase();
  const isArchivedStatus = (value) => {
    const status = normalizeStatus(value);
    return status === "COMPLETED" || status === "EXPIRED" || status === "REJECTED" || status === "DECLINED";
  };

  const pendingCount = useMemo(
    () => (Array.isArray(sosRequests) ? sosRequests : []).filter((r) => normalizeStatus(r.status) === "PENDING").length,
    [sosRequests]
  );

  const pendingRequests = useMemo(
    () => (Array.isArray(sosRequests) ? sosRequests : []).filter((r) => normalizeStatus(r.status) === "PENDING"),
    [sosRequests]
  );

  const activeCases = useMemo(
    () => (Array.isArray(caseRooms) ? caseRooms : []).filter((room) => {
      const status = normalizeStatus(room?.sosRequest?.status);
      return status === "ACCEPTED" || status === "PENDING";
    }),
    [caseRooms]
  );

  const completedCases = useMemo(
    () => (Array.isArray(caseRooms) ? caseRooms : []).filter((room) => isArchivedStatus(room?.sosRequest?.status)),
    [caseRooms]
  );

  const currentList = useMemo(() => {
    const source = activeFilterTab === "active" ? activeCases : completedCases;
    const query = caseSearch.trim().toLowerCase();
    if (!query) return source;

    return source.filter((room) => {
      const patientName = String(room?.patient?.name || room?.sosRequest?.patientName || "").toLowerCase();
      const medicineName = String(room?.sosRequest?.medicineName || "").toLowerCase();
      const lastMessage = String(room?.lastMessage?.content || "").toLowerCase();
      return patientName.includes(query) || medicineName.includes(query) || lastMessage.includes(query);
    });
  }, [activeFilterTab, activeCases, completedCases, caseSearch]);

  const activeChatCase = useMemo(
    () => (Array.isArray(caseRooms) ? caseRooms : []).find((room) => room?.sosRequestId === activeChatSOS) || null,
    [caseRooms, activeChatSOS]
  );

  const getUrgencyBadgeClasses = (rawUrgency) => {
    const urgency = String(rawUrgency || "").toLowerCase();
    if (urgency === "critical") {
      return "bg-red-100 text-red-700 border-red-200";
    }
    if (urgency === "medium") {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    return "bg-orange-100 text-orange-700 border-orange-200";
  };

  if (loading && !caseRooms.length) {
    return (
      <div className="h-[calc(100vh-80px)] bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-slate-700 mx-auto mb-3" size={34} />
          <p className="text-slate-500 text-sm">Loading communication center...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">SOS Requests</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Requests Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Pending Requests</p>
              <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
            </div>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-50">
              <AlertCircle size={32} className="text-amber-600" />
            </div>
          </div>
        </div>

        {/* Active Cases Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Active Cases</p>
              <p className="text-3xl font-bold text-slate-900">{activeCases.length}</p>
            </div>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50">
              <Activity size={32} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Completed Cases Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Completed Cases</p>
              <p className="text-3xl font-bold text-slate-900">{completedCases.length}</p>
            </div>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-600" />
            New SOS Requests ({pendingRequests.length})
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No pending SOS requests right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      {request.patient?.name || request.patientName || "Anonymous Patient"}
                    </p>
                    <p className="text-sm font-bold text-slate-800 truncate mt-2 flex items-center gap-2">
                      <Pill size={14} className="text-blue-600" />
                      {request.medicineName || "Medicine"}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white dark:bg-slate-900 text-slate-700">
                        Qty: {request.quantity || 1} units
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${getUrgencyBadgeClasses(request.urgency || request.urgencyLevel)}`}>
                        {String(request.urgency || request.urgencyLevel || "high").toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <Clock size={12} /> {formatRelativeTime(request.createdAt)} ago
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Phone size={12} /> {request.contactNumber || request.patient?.phone || "No contact"}
                    </p>

                    <div className="mt-3 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1 inline-flex items-center gap-1">
                        <FileText size={12} /> Additional Notes
                      </p>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                        {request.description || request.additionalNotes || "No additional notes provided."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-40">
                    <button
                      onClick={() => handleRespond(request.id, "accepted")}
                      disabled={respondingTo === request.id}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                    >
                      {respondingTo === request.id ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => openRejectModal(request)}
                      disabled={respondingTo === request.id}
                      className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 disabled:opacity-60"
                    >
                      Reject
                    </button>
                    {(request.prescription || request.prescriptionUrl) && (
                      <button
                        onClick={() => {
                          const rawPrescription = request.prescription || request.prescriptionUrl;
                          const prescriptionUrl = rawPrescription.startsWith("http")
                            ? rawPrescription
                            : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${rawPrescription}`;
                          setSelectedPrescription(prescriptionUrl);
                        }}
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 inline-flex items-center justify-center gap-1"
                      >
                        <Eye size={14} />
                        View Prescription
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Communication Command Center</h2>
          <span className="text-xs text-slate-500 inline-flex items-center gap-1">
            <Navigation size={12} /> Messaging workflow
          </span>
        </div>

        <div className="h-[calc(100vh-430px)] min-h-[520px] flex">
      {/* Left Panel */}
      <aside className="w-[360px] border-r border-slate-200 flex flex-col bg-white dark:bg-slate-900">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-slate-900">Direct</h1>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200">
            <button
              onClick={() => setActiveFilterTab("active")}
              className={`px-2 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeFilterTab === "active"
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              Active ({activeCases.length})
            </button>
            <button
              onClick={() => setActiveFilterTab("completed")}
              className={`px-2 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeFilterTab === "completed"
                  ? "text-slate-900 border-slate-900"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              Archive ({completedCases.length})
            </button>
          </div>

          <div className="mt-3 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              placeholder={activeFilterTab === "active" ? "Search active cases" : "Search archive"}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300/50 focus:border-slate-400"
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Incoming pending alerts: <span className="font-semibold text-slate-700">{pendingCount}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!currentList.length ? (
            <div className="h-full px-6 py-12 text-center text-slate-500 text-sm">
              {activeFilterTab === "active" ? "No active conversations" : "Your archive is empty"}
            </div>
          ) : (
            <ul className="py-2">
              {currentList.map((room) => {
                const patientName =
                  room.patient?.name ||
                  room.sosRequest?.patientName ||
                  "Patient";
                const medicineName = room.sosRequest?.medicineName || "Medicine";
                const timestamp = room.lastMessage?.createdAt || room.sosRequest?.updatedAt || room.sosRequest?.createdAt;
                const isSelected = highlightedRoomId === room.id;

                return (
                  <li key={room.id} className="px-2">
                    <button
                      onClick={() => {
                        setHighlightedRoomId(room.id);
                        setActiveChatSOS(room.sosRequestId);
                      }}
                      className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-slate-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                          {getInitials(patientName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900 truncate">{patientName}</p>
                            <span className="text-xs text-slate-400 flex-shrink-0">{formatRelativeTime(timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 min-w-0">
                            <Pill size={12} className="text-blue-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-slate-700 truncate">{medicineName}</p>
                            {room?.sosRequest?.urgency && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getUrgencyBadgeClasses(room.sosRequest.urgency)}`}>
                                {String(room.sosRequest.urgency).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{getStatusSnippet(room)}</p>
                        </div>

                        {normalizeStatus(room?.sosRequest?.status) === "ACCEPTED" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteCase(room);
                            }}
                            disabled={completingCaseId === room.sosRequestId}
                            className="text-[11px] px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right Panel */}
      <section className="flex-1 min-w-0 flex flex-col bg-slate-50">
        {activeChatSOS && currentUser ? (
          <div className="h-full p-3 md:p-4">
            <div className="h-full">
              <ChatWindow
                sosRequestId={activeChatSOS}
                currentUser={currentUser}
                onClose={() => setActiveChatSOS(null)}
                readOnly={isArchivedStatus(activeChatCase?.sosRequest?.status)}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <p className="text-sm text-slate-400">Select a conversation to start messaging</p>
          </div>
        )}
      </section>

        </div>
      </section>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Mark SOS as Completed?"
        message="Are you sure you want to finish this case? This will archive the conversation and notify the patient that their medicine needs have been met."
        confirmLabel="Yes, Mark as Done"
        cancelLabel="No, Keep Open"
        isLoading={isCompletingConfirmed}
        icon="check"
        onConfirm={handleConfirmCompletion}
        onCancel={handleCancelCompletion}
      />

      {rejectModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={closeRejectModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Decline SOS Request</h3>
                <p className="text-xs text-slate-500 mt-0.5">Patient: {rejectModal.patientName}</p>
              </div>
              <button
                type="button"
                onClick={closeRejectModal}
                className="p-1.5 rounded-md hover:bg-slate-100"
                aria-label="Close reject modal"
              >
                <XCircle size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="rejection-note">
                Rejection reason (optional)
              </label>
              <textarea
                id="rejection-note"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={4}
                placeholder="Add context for the patient, e.g. medicine currently unavailable."
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-none"
              />
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRejectModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                disabled={rejectingCaseId === rejectModal.sosId}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                disabled={rejectingCaseId === rejectModal.sosId}
              >
                {rejectingCaseId === rejectModal.sosId ? "Declining..." : "Decline Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPrescription && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedPrescription(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Prescription</p>
              <button
                type="button"
                onClick={() => setSelectedPrescription(null)}
                className="p-1.5 rounded-md hover:bg-slate-100"
              >
                <XCircle size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <img src={selectedPrescription} alt="Prescription" className="w-full h-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
