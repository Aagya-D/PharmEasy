/**
 * Notification Service - Frontend API wrapper for notification endpoints
 * 
 * Handles:
 * - Fetching user notifications
 * - Getting unread count for navbar badge
 * - Marking notifications as read
 * - Deleting notifications
 */

import httpClient from "./httpClient";

/**
 * Get all notifications for the current user with pagination
 * 
 * @param {number} limit - Results per page (default 20)
 * @param {number} skip - Pagination offset (default 0)
 * @returns {Promise} { success, data: [...notifications], meta: {...} }
 */
export const getNotifications = async (limit = 20, skip = 0) => {
  return httpClient.get(`/notifications?limit=${limit}&skip=${skip}`);
};

/**
 * Get unread notification count
 * Used to display badge in navbar
 * 
 * @returns {Promise} { success, data: { unreadCount: 5 } }
 */
export const getUnreadCount = async () => {
  return httpClient.get(`/notifications/unread-count`);
};

/**
 * Mark a single notification as read
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise} { success, data: {...notification}, message: "..." }
 */
export const markNotificationAsRead = async (notificationId) => {
  return httpClient.put(`/notifications/${notificationId}/read`);
};

/**
 * Mark all unread notifications as read
 * 
 * @returns {Promise} { success, data: { markedCount: 3 }, message: "..." }
 */
export const markAllAsRead = async () => {
  return httpClient.put(`/notifications/read-all`);
};

/**
 * Delete a notification
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise} { success, message: "..." }
 */
export const deleteNotification = async (notificationId) => {
  return httpClient.delete(`/notifications/${notificationId}`);
};

const notificationService = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;
