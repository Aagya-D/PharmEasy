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
  // Fetch notification list with pagination controls.
  return httpClient.get(`/notifications?limit=${limit}&skip=${skip}`);
};

/**
 * Get unread notification count
 * Used to display badge in navbar
 * 
 * @returns {Promise} { success, data: { unreadCount: 5 } }
 */
export const getUnreadCount = async () => {
  // Fetch unread badge count for navbar/sidebars.
  return httpClient.get(`/notifications/unread-count`);
};

/**
 * Mark a single notification as read
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise} { success, data: {...notification}, message: "..." }
 */
export const markNotificationAsRead = async (notificationId) => {
  // Mark single notification as read.
  return httpClient.put(`/notifications/${notificationId}/read`);
};

/**
 * Mark all unread notifications as read
 * 
 * @returns {Promise} { success, data: { markedCount: 3 }, message: "..." }
 */
export const markAllAsRead = async () => {
  // Mark all unread notifications as read.
  return httpClient.put(`/notifications/read-all`);
};

/**
 * Delete a notification
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise} { success, message: "..." }
 */
export const deleteNotification = async (notificationId) => {
  // Delete notification permanently.
  return httpClient.delete(`/notifications/${notificationId}`);
};

// Service object export for contexts/components.
const notificationService = {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
};

export default notificationService;
