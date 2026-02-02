/**
 * Frontend State Monitor Component
 * Displays real-time application state and logs (Development only)
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import logger from "../utils/logger";
import auditor from "../utils/auditor";

export function StateMonitor() {
  const { user, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState([]);
  const [violations, setViolations] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("state");

  // Only show in development
  useEffect(() => {
    if (import.meta.env.MODE !== "development") {
      return;
    }

    // Update logs every 2 seconds
    const interval = setInterval(() => {
      setLogs(logger.getLogs().slice(-20));
      setViolations(auditor.getViolations());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+L to toggle
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (import.meta.env.MODE !== "development" || !isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 right-0 w-[400px] h-[500px] bg-[#1e1e1e] text-[#d4d4d4] border-2 border-[#007acc] rounded-t-lg z-[9999] flex flex-col font-mono text-xs"
    >
      {/* Header */}
      <div
        className="px-3 py-2 bg-[#007acc] text-white flex justify-between items-center"
      >
        <strong>PharmEasy State Monitor</strong>
        <button
          onClick={() => setIsVisible(false)}
          className="bg-transparent border-none text-white cursor-pointer text-base"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex bg-[#2d2d2d] border-b border-[#007acc]"
      >
        {["state", "logs", "violations"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 p-2 text-white border-none cursor-pointer capitalize ${activeTab === tab ? "bg-[#007acc]" : "bg-transparent"}`}
          >
            {tab}
            {tab === "violations" && violations.length > 0 && (
              <span
                className="ml-1 bg-[#f44336] px-1.5 py-0.5 rounded-full text-[10px]"
              >
                {violations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto p-3"
      >
        {activeTab === "state" && (
          <div>
            <div className="mb-3">
              <strong className="text-[#4ec9b0]">Authentication</strong>
              <div className="ml-3 mt-1">
                <div>
                  Authenticated:{" "}
                  <span className={isAuthenticated ? "text-[#4caf50]" : "text-[#f44336]"}>
                    {isAuthenticated ? "✓" : "✗"}
                  </span>
                </div>
                <div>User ID: {user?.id || "N/A"}</div>
                <div>Email: {user?.email || "N/A"}</div>
                <div>Role: {user?.roleId || "N/A"}</div>
              </div>
            </div>

            {user?.roleId === 2 && (
              <div className="mb-3">
                <strong className="text-[#4ec9b0]">Pharmacy Status</strong>
                <div className="ml-3 mt-1">
                  <div>Has Pharmacy: {user.pharmacy ? "✓" : "✗"}</div>
                  {user.pharmacy && (
                    <>
                      <div>Name: {user.pharmacy.pharmacyName}</div>
                      <div>Status: {user.pharmacy.verificationStatus}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="mb-3">
              <strong className="text-[#4ec9b0]">Session</strong>
              <div className="ml-3 mt-1">
                <div>Session ID: {logger.sessionId}</div>
                <div>Initialized: {logger.initialized ? "✓" : "✗"}</div>
              </div>
            </div>

            <button
              onClick={() => {
                logger.exportLogs();
                auditor.exportAudit();
              }}
              className="mt-2 px-3 py-1.5 bg-[#007acc] text-white border-none rounded cursor-pointer"
            >
              Export Logs & Audit
            </button>
          </div>
        )}

        {activeTab === "logs" && (
          <div>
            {logs.length === 0 ? (
              <div className="text-[#888]">No logs yet</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-2 p-1.5 bg-[#2d2d2d] rounded border-l-[3px] ${
                    log.level === "ERROR"
                      ? "border-l-[#f44336]"
                      : log.level === "WARN"
                      ? "border-l-[#ff9800]"
                      : log.level === "INFO"
                      ? "border-l-[#2196f3]"
                      : "border-l-[#4caf50]"
                  }`}
                >
                  <div
                    className="text-[10px] text-[#888] mb-0.5"
                  >
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="font-bold">{log.message}</div>
                  {Object.keys(log.data).length > 0 && (
                    <pre
                      className="mt-1 text-[10px] text-[#ce9178] overflow-auto"
                    >
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "violations" && (
          <div>
            {violations.length === 0 ? (
              <div className="text-[#4caf50]">No violations detected ✓</div>
            ) : (
              violations.map((violation, index) => (
                <div
                  key={index}
                  className="mb-2 p-1.5 bg-[#3d1f1f] rounded border-l-[3px] border-l-[#f44336]"
                >
                  <div className="font-bold text-[#f44336]">
                    {violation.type}
                  </div>
                  <div
                    className="text-[10px] text-[#888] mt-0.5"
                  >
                    {new Date(violation.timestamp).toLocaleString()}
                  </div>
                  <pre
                    className="mt-1 text-[10px] text-[#ce9178] overflow-auto"
                  >
                    {JSON.stringify(violation.details, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-1.5 bg-[#2d2d2d] border-t border-[#007acc] text-[10px] text-[#888]"
      >
        Press Ctrl+Shift+L to toggle | Development Mode Only
      </div>
    </div>
  );
}

export default StateMonitor;
