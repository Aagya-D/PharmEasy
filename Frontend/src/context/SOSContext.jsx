import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * SOSContext
 * 
 * Manages SOS request state globally for the pharmacy admin
 * Tracks pending SOS count for sidebar badge and provides access to current SOS data
 */
const SOSContext = createContext();

export const SOSProvider = ({ children }) => {
  // Full SOS list currently visible to pharmacy admin.
  const [pendingSOS, setPendingSOS] = useState([]);
  // Count of SOS entries still in pending status.
  const [sosCount, setSosCount] = useState(0);
  // Loading state for SOS fetch requests.
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Update SOS count from fetched data
   */
  const updateSOSCount = useCallback((sosRequests) => {
    // Derive pending count from latest SOS request array.
    const pending = Array.isArray(sosRequests)
      ? sosRequests.filter(r => r.status === 'pending').length
      : 0;

    // Save derived count and backing SOS list.
    setSosCount(pending);
    setPendingSOS(sosRequests || []);
  }, []);

  /**
   * Fetch SOS requests and update count
   */
  const fetchSOSRequests = useCallback(async (httpClient) => {
    // Start loading state before request.
    setIsLoading(true);
    try {
      // Fetch nearby SOS requests using default 10km radius.
      const response = await httpClient.get("/pharmacy/sos/nearby", {
        params: { radius: 10 }
      });

      // Update context state only on successful payload.
      if (response.data.success && response.data.data.sosRequests) {
        updateSOSCount(response.data.data.sosRequests);
      }
    } catch (error) {
      console.error("Error fetching SOS requests:", error);
    } finally {
      // Always clear loading state.
      setIsLoading(false);
    }
  }, [updateSOSCount]);

  /**
   * Reset count (useful after responding to an SOS)
   */
  const resetCount = useCallback(() => {
    // Reset both pending count and SOS list.
    setSosCount(0);
    setPendingSOS([]);
  }, []);

  // Provide SOS state and actions to children.
  return (
    <SOSContext.Provider
      value={{
        sosCount,
        pendingSOS,
        isLoading,
        updateSOSCount,
        fetchSOSRequests,
        resetCount,
      }}
    >
      {children}
    </SOSContext.Provider>
  );
};

/**
 * Hook to use SOSContext
 */
export const useSOSContext = () => {
  // Enforce provider usage for SOS hook consumers.
  const context = useContext(SOSContext);
  if (!context) {
    throw new Error("useSOSContext must be used within SOSProvider");
  }
  return context;
};

export default SOSContext;
