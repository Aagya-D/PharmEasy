import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * SOSContext
 * 
 * Manages SOS request state globally for the pharmacy admin
 * Tracks pending SOS count for sidebar badge and provides access to current SOS data
 */
const SOSContext = createContext();

export const SOSProvider = ({ children }) => {
  const [pendingSOS, setPendingSOS] = useState([]);
  const [sosCount, setSosCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Update SOS count from fetched data
   */
  const updateSOSCount = useCallback((sosRequests) => {
    const pending = Array.isArray(sosRequests)
      ? sosRequests.filter(r => r.status === 'pending').length
      : 0;
    
    setSosCount(pending);
    setPendingSOS(sosRequests || []);
  }, []);

  /**
   * Fetch SOS requests and update count
   */
  const fetchSOSRequests = useCallback(async (httpClient) => {
    setIsLoading(true);
    try {
      const response = await httpClient.get("/pharmacy/sos/nearby", {
        params: { radius: 10 }
      });

      if (response.data.success && response.data.data.sosRequests) {
        updateSOSCount(response.data.data.sosRequests);
      }
    } catch (error) {
      console.error("Error fetching SOS requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, [updateSOSCount]);

  /**
   * Reset count (useful after responding to an SOS)
   */
  const resetCount = useCallback(() => {
    setSosCount(0);
    setPendingSOS([]);
  }, []);

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
  const context = useContext(SOSContext);
  if (!context) {
    throw new Error("useSOSContext must be used within SOSProvider");
  }
  return context;
};

export default SOSContext;
