/**
 * useGeoLocation Hook
 * 
 * Custom hook to access and manage user's geographic location
 * Uses browser's Geolocation API to get current position
 * 
 * Features:
 * - Get user's current latitude and longitude
 * - Track loading state during location fetch
 * - Handle permission errors and timeouts
 * - Manual trigger with "Locate Me" functionality
 * 
 * Usage:
 * const { location, loading, error, getLocation } = useGeoLocation();
 */

import { useState, useEffect } from "react";

export const useGeoLocation = (autoFetch = false) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get user's current position using Geolocation API
   */
  const getLocation = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setLoading(false);
      },
      // Error callback
      (err) => {
        let errorMessage = "Unable to retrieve your location";

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred.";
        }

        setError(errorMessage);
        setLoading(false);
        console.error("Geolocation error:", err);
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0, // Don't use cached position
      }
    );
  };

  /**
   * Watch user's position continuously (for real-time tracking)
   * Returns watchId that can be used to clear the watch
   */
  const watchLocation = (callback) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setLocation(newLocation);
        if (callback) callback(newLocation);
      },
      (err) => {
        console.error("Watch position error:", err);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return watchId;
  };

  /**
   * Clear position watch
   */
  const clearWatch = (watchId) => {
    if (watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  };

  /**
   * Reset location state
   */
  const resetLocation = () => {
    setLocation(null);
    setError(null);
    setLoading(false);
  };

  /**
   * Auto-fetch location on mount if enabled
   */
  useEffect(() => {
    if (autoFetch) {
      getLocation();
    }
  }, [autoFetch]);

  return {
    location,
    loading,
    error,
    getLocation,
    watchLocation,
    clearWatch,
    resetLocation,
    isLocationAvailable: !!location,
  };
};

export default useGeoLocation;
