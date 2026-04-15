import React, { createContext, useContext, useState, useEffect } from "react";
import { nepalLocations, findLocationByCoordinates } from "../data/nepalLocations";

/**
 * LocationContext
 * 
 * Manages user's selected location globally across the app
 * Stores user's search location (separate from geolocation)
 * Supports exact GPS coordinates for precise distance calculations
 */
const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  // Default location fallback used when no saved selection exists.
  const defaultLocation = nepalLocations.find(
    (loc) => loc.name === "Kathmandu"
  ) || {
    name: "Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    lat: 27.7172,
    lng: 85.324,
  };

  // Current selected location used across location-aware screens.
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  // Raw geolocation coordinates pending user confirmation.
  const [rawDetectedCoords, setRawDetectedCoords] = useState(null);
  // Loading indicator for geolocation detection flow.
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Update selected location
   */
  const updateLocation = (location) => {
    // Only accept locations that include valid coordinates.
    if (location && location.lat && location.lng) {
      setSelectedLocation(location);
      // Persist selected location for reload/session continuity.
      localStorage.setItem("userSearchLocation", JSON.stringify(location));
    }
  };

  /**
   * Confirm exact coordinates (from map pin drag or GPS)
   * Saves the exact lat/lng the user confirmed, preserving the nearest city name
   */
  const confirmExactLocation = (lat, lng, nearestLocation = null) => {
    // Use nearest known location metadata when available.
    const base = nearestLocation || findLocationByCoordinates(lat, lng) || {};
    // Persist exact coordinates while keeping human-readable location fields.
    const exactLocation = {
      ...base,
      name: base.name || "Custom Location",
      district: base.district || "Unknown",
      province: base.province || "Unknown",
      lat,
      lng,
      isExactCoords: true,
    };
    // Save confirmed location and clear temporary detection marker.
    updateLocation(exactLocation);
    setRawDetectedCoords(null);
    return exactLocation;
  };

  /**
   * Detect location using geolocation API
   * Returns both the raw GPS coords and the nearest matched location
   * so the modal can show a map for visual confirmation
   */
  const detectLocation = async () => {
    // Start geolocation detection loading state.
    setIsLoading(true);
    return new Promise((resolve) => {
      // Browser geolocation support check.
      if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        setIsLoading(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Read raw device coordinates and accuracy value.
          const { latitude, longitude, accuracy } = position.coords;

          // Store raw GPS values so map confirmation can use exact pin.
          setRawDetectedCoords({ latitude, longitude, accuracy });

          // Resolve nearest known location from location dataset.
          const nearestLocation = findLocationByCoordinates(latitude, longitude);
          
          if (nearestLocation) {
            setIsLoading(false);
            // Return nearest location plus raw coordinates for confirmation modal.
            resolve({
              ...nearestLocation,
              _rawLat: latitude,
              _rawLng: longitude,
              _accuracy: accuracy,
            });
          } else {
            setIsLoading(false);
            resolve(null);
          }
        },
        (error) => {
          // Geolocation failure keeps flow non-blocking.
          console.log("Geolocation error:", error);
          setIsLoading(false);
          resolve(null);
        },
        {
          // Request precise location with tight cache/time constraints.
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  /**
   * Reset to default (Kathmandu)
   */
  const resetLocation = () => {
    // Reset selected location to app default.
    updateLocation(defaultLocation);
    // Clear pending raw coordinates.
    setRawDetectedCoords(null);
  };

  /**
   * Load location from localStorage on mount
   */
  useEffect(() => {
    // Restore location preference from localStorage on mount.
    const savedLocation = localStorage.getItem("userSearchLocation");
    if (savedLocation) {
      try {
        // Parse and apply persisted location.
        const location = JSON.parse(savedLocation);
        setSelectedLocation(location);
      } catch (error) {
        console.error("Error loading saved location:", error);
      }
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        selectedLocation,
        rawDetectedCoords,
        updateLocation,
        confirmExactLocation,
        detectLocation,
        resetLocation,
        isLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

/**
 * Hook to use LocationContext
 */
export const useLocation = () => {
  // Enforce provider usage for location consumers.
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within LocationProvider");
  }
  return context;
};

export default LocationContext;
