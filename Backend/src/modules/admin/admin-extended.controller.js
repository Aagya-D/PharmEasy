/**
 * Admin Extended Controller
 * Handles advanced admin features: Map data, Inventory Insights, CMS
 */

import { prisma } from '../../database/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';
import notificationService from '../notifications/notification.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

/**
 * Get SOS requests for map
 */
export const getSOSRequests = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const sosRequests = await prisma.sOSRequest.findMany({
      where: {
        status: 'pending',
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, data: sosRequests, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error fetching SOS requests (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Get pharmacy locations for map
 */
export const getPharmacyLocations = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const pharmacies = await prisma.pharmacy.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        pharmacyName: true,
        address: true,
        latitude: true,
        longitude: true,
        contactNumber: true,
        licenseNumber: true,
        verificationStatus: true,
      },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, data: pharmacies, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error fetching pharmacies (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Get inventory insights
 */
export const getInventoryInsights = async (req, res, next) => {
  const startTime = Date.now();
  try {
    // Get all inventory items grouped by generic name
    const inventory = await prisma.inventory.groupBy({
      by: ['genericName'],
      _count: {
        id: true,
      },
      _sum: {
        quantity: true,
      },
    });

    // Find items with low stock or out of stock
    const shortages = await prisma.$queryRaw`
      SELECT 
        "genericName",
        COUNT(*) as "totalPharmacies",
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as "outOfStockCount",
        AVG(quantity) as "avgQuantity"
      FROM "Inventory"
      GROUP BY "genericName"
      HAVING SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) > 0
      ORDER BY "outOfStockCount" DESC
      LIMIT 50
    `;

    const duration = Date.now() - startTime;
    res.json({ 
      success: true, 
      data: { 
        inventory,
        shortages: shortages.map(s => ({
          genericName: s.genericName,
          totalPharmacies: Number(s.totalPharmacies),
          outOfStockCount: Number(s.outOfStockCount),
          avgQuantity: Number(s.avgQuantity),
        })),
      },
      _meta: { duration }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error fetching inventory insights (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Send restock alert to pharmacies
 */
export const sendRestockAlert = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { genericName, message } = req.body;

    if (!genericName) {
      throw new BadRequestError('Generic name is required');
    }

    // Get all verified pharmacies
    const pharmacies = await prisma.pharmacy.findMany({
      where: { verificationStatus: 'VERIFIED' },
      include: { user: true },
    });

    // Log the alert
    await logActivity({
      action: 'RESTOCK_ALERT_SENT',
      message: `Admin sent restock alert for ${genericName} to ${pharmacies.length} pharmacies`,
      userId: req.user.id,
      category: 'INVENTORY',
      metadata: { genericName, pharmacyCount: pharmacies.length },
    });

    const duration = Date.now() - startTime;
    res.json({ 
      success: true, 
      message: `Restock alert sent to ${pharmacies.length} pharmacies`,
      data: { notifiedCount: pharmacies.length },
      _meta: { duration }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error sending restock alert (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Get all health tips
 */
export const getHealthTips = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const healthTips = await prisma.healthTip.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, data: healthTips, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error fetching health tips (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Create health tip
 */
export const createHealthTip = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { title, content, category, imageUrl, publishDate, expiryDate, isActive } = req.body;

    if (!title || !content) {
      throw new BadRequestError('Title and content are required');
    }

    const healthTip = await prisma.healthTip.create({
      data: {
        title,
        content,
        category,
        imageUrl,
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user.id,
      },
    });

    await logActivity({
      action: 'HEALTH_TIP_CREATED',
      message: `Admin created health tip: ${title}`,
      userId: req.user.id,
      category: 'SYSTEM',
      metadata: { healthTipId: healthTip.id },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, data: healthTip, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error creating health tip (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Update health tip
 */
export const updateHealthTip = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { title, content, category, imageUrl, publishDate, expiryDate, isActive } = req.body;

    const healthTip = await prisma.healthTip.update({
      where: { id },
      data: {
        title,
        content,
        category,
        imageUrl,
        publishDate: publishDate ? new Date(publishDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive,
      },
    });

    await logActivity({
      action: 'HEALTH_TIP_UPDATED',
      message: `Admin updated health tip: ${title}`,
      userId: req.user.id,
      category: 'SYSTEM',
      metadata: { healthTipId: id },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, data: healthTip, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error updating health tip (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Delete health tip
 */
export const deleteHealthTip = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    await prisma.healthTip.delete({ where: { id } });

    await logActivity({
      action: 'HEALTH_TIP_DELETED',
      message: `Admin deleted health tip`,
      userId: req.user.id,
      category: 'SYSTEM',
      metadata: { healthTipId: id },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, message: 'Health tip deleted successfully', _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error deleting health tip (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Get all announcements
 */
export const getAnnouncements = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, data: announcements, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error fetching announcements (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Create announcement
 */
export const createAnnouncement = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { title, message, type, priority, targetRole, publishDate, expiryDate, isActive } = req.body;

    if (!title || !message) {
      throw new BadRequestError('Title and message are required');
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type: type || 'info',
        priority: priority || 'normal',
        targetRole,
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user.id,
      },
    });

    await logActivity({
      action: 'ANNOUNCEMENT_CREATED',
      message: `Admin created announcement: ${title}`,
      userId: req.user.id,
      category: 'SYSTEM',
      metadata: { announcementId: announcement.id, priority },
    });

    // Broadcast notification to all target users
    try {
      const notificationCount = await notificationService.notifyAnnouncement(announcement);
      console.log(`[ADMIN] Broadcast notification sent to ${notificationCount} users for announcement: ${title}`);
    } catch (notificationError) {
      console.error('[ADMIN] Failed to broadcast announcement notification:', notificationError);
      // Continue despite notification failure
    }

    const duration = Date.now() - startTime;
    res.json({ success: true, data: announcement, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error creating announcement (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { title, message, type, priority, targetRole, publishDate, expiryDate, isActive } = req.body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        message,
        type,
        priority,
        targetRole,
        publishDate: publishDate ? new Date(publishDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive,
      },
    });

    await logActivity({
      action: 'ANNOUNCEMENT_UPDATED',
      message: `Admin updated announcement: ${title}`,
      userId: req.user.id,
      category: 'SYSTEM',
      metadata: { announcementId: id },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, data: announcement, _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error updating announcement (${duration}ms):`, error);
    next(error);
  }
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    await prisma.announcement.delete({ where: { id } });

    await logActivity({
      action: 'ANNOUNCEMENT_DELETED',
      message: `Admin deleted announcement`,
      userId: req.user.id,
      category: 'SYSTEM',
      metadata: { announcementId: id },
    });

    const duration = Date.now() - startTime;
    res.json({ success: true, message: 'Announcement deleted successfully', _meta: { duration } });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ADMIN] Error deleting announcement (${duration}ms):`, error);
    next(error);
  }
};
