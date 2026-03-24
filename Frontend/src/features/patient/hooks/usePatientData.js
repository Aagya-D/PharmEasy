import { useState, useCallback } from "react";
import patientService from "../services/patient.service";

export const usePatientData = () => {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await patientService.getProfile();
      setProfile(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (filters) => {
    setLoading(true);
    try {
      const response = await patientService.getOrders(filters);
      setOrders(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMedications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await patientService.getMedications();
      setMedications(response.data?.medications || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch medications");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profile,
    orders,
    medications,
    loading,
    error,
    fetchProfile,
    fetchOrders,
    fetchMedications,
  };
};
