import httpClient from "../../../core/services/httpClient";

const patientService = {
  // Get patient dashboard data
  getDashboard: async () => {
    const response = await httpClient.get("/patient/dashboard");
    return response.data;
  },

  // Get patient profile
  getProfile: async () => {
    const response = await httpClient.get("/patient/profile");
    return response.data;
  },

  // Update patient profile
  updateProfile: async (profileData) => {
    const response = await httpClient.put("/patient/profile", profileData);
    return response.data;
  },

  // Get patient orders
  getOrders: async (filters = {}) => {
    const response = await httpClient.get("/patient/orders", { params: filters });
    return response.data;
  },

  // Get single order details
  getOrderDetails: async (orderId) => {
    const response = await httpClient.get(`/patient/orders/${orderId}`);
    return response.data;
  },

  // Get patient prescriptions
  getPrescriptions: async () => {
    const response = await httpClient.get("/patient/prescriptions");
    return response.data;
  },

  // Upload prescription
  uploadPrescription: async (formData) => {
    const response = await httpClient.post("/patient/prescriptions/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Delete prescription
  deletePrescription: async (prescriptionId) => {
    const response = await httpClient.delete(`/patient/prescriptions/${prescriptionId}`);
    return response.data;
  },

  // Download prescription
  downloadPrescription: async (prescriptionId) => {
    const response = await httpClient.get(
      `/patient/prescriptions/${prescriptionId}/download`,
      { responseType: "blob" }
    );
    return response;
  },

  // Get medications
  getMedications: async (filters = {}) => {
    const response = await httpClient.get("/patient/medications", { params: filters });
    return response.data;
  },

  // Remove medication
  removeMedication: async (medicationId) => {
    const response = await httpClient.delete(`/patient/medications/${medicationId}`);
    return response.data;
  },

  // Get nearby pharmacies
  getNearbyPharmacies: async (latitude, longitude, radius = 50) => {
    const response = await httpClient.get("/patient/pharmacies/nearby", {
      params: { latitude, longitude, radius },
    });
    return response.data;
  },

  // Search medications
  searchMedications: async (query) => {
    const response = await httpClient.get("/patient/medications/search", {
      params: { query },
    });
    return response.data;
  },

  // Create order
  createOrder: async (orderData) => {
    const response = await httpClient.post("/patient/orders", orderData);
    return response.data;
  },

  // Get persistent cart
  getCart: async () => {
    const response = await httpClient.get("/cart");
    return response.data;
  },

  // Add medicine to cart (creates or increments)
  addCartItem: async (itemData) => {
    const response = await httpClient.post("/cart/items", itemData);
    return response.data;
  },

  // Update cart item quantity/selected state
  updateCartItem: async (itemId, payload) => {
    const response = await httpClient.patch(`/cart/items/${itemId}`, payload);
    return response.data;
  },

  // Remove cart item
  removeCartItem: async (itemId) => {
    const response = await httpClient.delete(`/cart/items/${itemId}`);
    return response.data;
  },

  // Place order from selected cart items
  placeOrderFromCart: async (payload = null) => {
    const body = Array.isArray(payload)
      ? { itemIds: payload }
      : {
          itemIds: Array.isArray(payload?.itemIds) ? payload.itemIds : undefined,
          items: Array.isArray(payload?.items) ? payload.items : undefined,
          deliveryAddress: payload?.deliveryAddress,
          shippingAddress: payload?.shippingAddress,
          paymentMethod: payload?.paymentMethod,
          contactNumber: payload?.contactNumber,
          summary: payload?.summary,
          latitude: payload?.latitude,
          longitude: payload?.longitude,
        };

    const response = await httpClient.post("/patient/orders/checkout", body);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId) => {
    const response = await httpClient.put(`/patient/orders/${orderId}/cancel`);
    return response.data;
  },

  // Get notifications
  getNotifications: async () => {
    const response = await httpClient.get("/patient/notifications");
    return response.data;
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId) => {
    const response = await httpClient.put(
      `/patient/notifications/${notificationId}/read`
    );
    return response.data;
  },

  // Emergency SOS - Enhanced with full prescription/medicine details
  triggerSOS: async (location) => {
    const response = await httpClient.post("/patient/sos", { location });
    return response.data;
  },

  // Submit SOS Request with medicine details and prescription
  submitSOSRequest: async (sosData) => {
    const formData = new FormData();
    
    // Add medicine details
    formData.append("medicineName", sosData.medicineName);
    formData.append("genericName", sosData.genericName || "");
    formData.append("quantity", sosData.quantity);
    formData.append("urgencyLevel", sosData.urgencyLevel);
    
    // Add patient contact info
    formData.append("patientName", sosData.patientName);
    formData.append("contactNumber", sosData.contactNumber);
    formData.append("address", sosData.address);
    formData.append("latitude", sosData.latitude);
    formData.append("longitude", sosData.longitude);
    formData.append("additionalNotes", sosData.additionalNotes || "");
    formData.append("prescriptionRequired", sosData.prescriptionRequired);
    
    // Add prescription file if present
    if (sosData.prescriptionFile) {
      formData.append("prescription", sosData.prescriptionFile);
    }
    
    const response = await httpClient.post("/patient/sos/request", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Get SOS history (supports ?filter=7days)
  getSOSHistory: async (filter = "all") => {
    const response = await httpClient.get(`/patient/sos/history?filter=${filter}`);
    return response.data;
  },

  // Get single SOS request details
  getSOSDetails: async (sosId) => {
    const response = await httpClient.get(`/patient/sos/${sosId}`);
    return response.data;
  },

  // Get active pending SOS (for countdown)
  getActiveSOS: async () => {
    const response = await httpClient.get("/patient/sos/active");
    return response.data;
  },

  // Search medicines with real-time pharmacy availability
  searchMedicinesWithAvailability: async (query, latitude = null, longitude = null) => {
    const params = { query };
    if (latitude && longitude) {
      params.latitude = latitude;
      params.longitude = longitude;
    }
    const response = await httpClient.get("/medicines/search", { params });
    return response.data;
  },

  // Add medicine to favorites
  addToFavorites: async (data) => {
    const response = await httpClient.post("/patient/favorites", data);
    return response.data;
  },

  // Remove medicine from favorites
  removeFromFavorites: async (id) => {
    const response = await httpClient.delete(`/patient/favorites/${id}`);
    return response.data;
  },

  // Get favorite medicines
  getFavorites: async () => {
    const response = await httpClient.get("/patient/favorites");
    return response.data;
  },

  // Get health records
  getHealthRecords: async () => {
    const response = await httpClient.get("/patient/health-records");
    return response.data;
  },
};

export default patientService;
