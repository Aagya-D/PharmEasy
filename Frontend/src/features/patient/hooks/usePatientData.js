import { useState, useCallback } from "react";
import patientService from "../services/patient.service";

export const usePatientData = () => {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
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

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await patientService.getPrescriptions();
      setPrescriptions(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch prescriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profile,
    orders,
    prescriptions,
    loading,
    error,
    fetchProfile,
    fetchOrders,
    fetchPrescriptions,
  };
};
