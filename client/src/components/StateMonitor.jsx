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
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: "400px",
        height: "500px",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        border: "2px solid #007acc",
        borderRadius: "8px 8px 0 0",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          backgroundColor: "#007acc",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>PharmEasy State Monitor</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          backgroundColor: "#2d2d2d",
          borderBottom: "1px solid #007acc",
        }}
      >
        {["state", "logs", "violations"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: activeTab === tab ? "#007acc" : "transparent",
              color: "white",
              border: "none",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab}
            {tab === "violations" && violations.length > 0 && (
              <span
                style={{
                  marginLeft: "4px",
                  backgroundColor: "#f44336",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontSize: "10px",
                }}
              >
                {violations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px",
        }}
      >
        {activeTab === "state" && (
          <div>
            <div style={{ marginBottom: "12px" }}>
              <strong style={{ color: "#4ec9b0" }}>Authentication</strong>
              <div style={{ marginLeft: "12px", marginTop: "4px" }}>
                <div>
                  Authenticated:{" "}
                  <span style={{ color: isAuthenticated ? "#4caf50" : "#f44336" }}>
                    {isAuthenticated ? "✓" : "✗"}
                  </span>
                </div>
                <div>User ID: {user?.id || "N/A"}</div>
                <div>Email: {user?.email || "N/A"}</div>
                <div>Role: {user?.roleId || "N/A"}</div>
              </div>
            </div>

            {user?.roleId === 2 && (
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#4ec9b0" }}>Pharmacy Status</strong>
                <div style={{ marginLeft: "12px", marginTop: "4px" }}>
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

            <div style={{ marginBottom: "12px" }}>
              <strong style={{ color: "#4ec9b0" }}>Session</strong>
              <div style={{ marginLeft: "12px", marginTop: "4px" }}>
                <div>Session ID: {logger.sessionId}</div>
                <div>Initialized: {logger.initialized ? "✓" : "✗"}</div>
              </div>
            </div>

            <button
              onClick={() => {
                logger.exportLogs();
                auditor.exportAudit();
              }}
              style={{
                marginTop: "8px",
                padding: "6px 12px",
                backgroundColor: "#007acc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Export Logs & Audit
            </button>
          </div>
        )}

        {activeTab === "logs" && (
          <div>
            {logs.length === 0 ? (
              <div style={{ color: "#888" }}>No logs yet</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "8px",
                    padding: "6px",
                    backgroundColor: "#2d2d2d",
                    borderRadius: "4px",
                    borderLeft: `3px solid ${
                      log.level === "ERROR"
                        ? "#f44336"
                        : log.level === "WARN"
                        ? "#ff9800"
                        : log.level === "INFO"
                        ? "#2196f3"
                        : "#4caf50"
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#888",
                      marginBottom: "2px",
                    }}
                  >
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div style={{ fontWeight: "bold" }}>{log.message}</div>
                  {Object.keys(log.data).length > 0 && (
                    <pre
                      style={{
                        marginTop: "4px",
                        fontSize: "10px",
                        color: "#ce9178",
                        overflow: "auto",
                      }}
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
              <div style={{ color: "#4caf50" }}>No violations detected ✓</div>
            ) : (
              violations.map((violation, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "8px",
                    padding: "6px",
                    backgroundColor: "#3d1f1f",
                    borderRadius: "4px",
                    borderLeft: "3px solid #f44336",
                  }}
                >
                  <div style={{ fontWeight: "bold", color: "#f44336" }}>
                    {violation.type}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#888",
                      marginTop: "2px",
                    }}
                  >
                    {new Date(violation.timestamp).toLocaleString()}
                  </div>
                  <pre
                    style={{
                      marginTop: "4px",
                      fontSize: "10px",
                      color: "#ce9178",
                      overflow: "auto",
                    }}
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
        style={{
          padding: "6px 12px",
          backgroundColor: "#2d2d2d",
          borderTop: "1px solid #007acc",
          fontSize: "10px",
          color: "#888",
        }}
      >
        Press Ctrl+Shift+L to toggle | Development Mode Only
      </div>
    </div>
  );
}

export default StateMonitor;
