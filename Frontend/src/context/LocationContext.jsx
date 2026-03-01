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
  // Default to Kathmandu
  const defaultLocation = nepalLocations.find(
    (loc) => loc.name === "Kathmandu"
  ) || {
    name: "Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    lat: 27.7172,
    lng: 85.324,
  };

  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [rawDetectedCoords, setRawDetectedCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Update selected location
   */
  const updateLocation = (location) => {
    if (location && location.lat && location.lng) {
      setSelectedLocation(location);
      // Store in localStorage for persistence
      localStorage.setItem("userSearchLocation", JSON.stringify(location));
    }
  };

  /**
   * Confirm exact coordinates (from map pin drag or GPS)
   * Saves the exact lat/lng the user confirmed, preserving the nearest city name
   */
  const confirmExactLocation = (lat, lng, nearestLocation = null) => {
    const base = nearestLocation || findLocationByCoordinates(lat, lng) || {};
    const exactLocation = {
      ...base,
      name: base.name || "Custom Location",
      district: base.district || "Unknown",
      province: base.province || "Unknown",
      lat,
      lng,
      isExactCoords: true,
    };
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
    setIsLoading(true);
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        setIsLoading(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Store raw GPS coordinates for map preview
          setRawDetectedCoords({ latitude, longitude, accuracy });

          const nearestLocation = findLocationByCoordinates(latitude, longitude);
          
          if (nearestLocation) {
            setIsLoading(false);
            // Return both raw coords and nearest location for confirmation
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
          console.log("Geolocation error:", error);
          setIsLoading(false);
          resolve(null);
        },
        {
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
    updateLocation(defaultLocation);
    setRawDetectedCoords(null);
  };

  /**
   * Load location from localStorage on mount
   */
  useEffect(() => {
    const savedLocation = localStorage.getItem("userSearchLocation");
    if (savedLocation) {
      try {
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
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within LocationProvider");
  }
  return context;
};

export default LocationContext;
