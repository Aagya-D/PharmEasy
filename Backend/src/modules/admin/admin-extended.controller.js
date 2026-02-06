/**
 * Admin Support & Ticketing Controller
 * Handles ticket management and support system
 */

import { prisma } from '../../database/prisma.js';
import { logActivity } from '../../utils/activityLogger.js';

/**
 * Get all tickets (with optional filtering)
 */
export const getAllTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

/**
 * Update ticket status and resolution
 */
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    const updateData = { status };
    
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user.id;
      if (resolution) updateData.resolution = resolution;
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    await logActivity({
      action: 'TICKET_UPDATED',
      message: `Admin updated ticket #${id} status to ${status}`,
      userId: req.user.id,
      category: 'SYSTEM',
      metadata: { ticketId: id, status },
    });

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
};

/**
 * Get SOS requests for map
 */
const getSOSRequests = async (req, res) => {
  try {
    const sosRequests = await prisma.sOSRequest.findMany({
      where: {
        status: 'pending',
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: sosRequests });
  } catch (error) {
    console.error('Error fetching SOS requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch SOS requests' });
  }
};

/**
 * Get pharmacy locations for map
 */
const getPharmacyLocations = async (req, res) => {
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

    res.json({ success: true, data: pharmacies });
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pharmacies' });
  }
};

/**
 * Get inventory insights - shortage tracker
 */
const getInventoryInsights = async (req, res) => {
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
      } 
    });
  } catch (error) {
    console.error('Error fetching inventory insights:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory insights' });
  }
};

/**
 * Send restock alert to pharmacies
 */
const sendRestockAlert = async (req, res) => {
  try {
    const { genericName, message } = req.body;

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

    // In a real system, you would send notifications here (email, SMS, push)
    // For now, we'll just log it
    
    res.json({ 
      success: true, 
      message: `Restock alert sent to ${pharmacies.length} pharmacies`,
      data: { notifiedCount: pharmacies.length }
    });
  } catch (error) {
    console.error('Error sending restock alert:', error);
    res.status(500).json({ success: false, message: 'Failed to send restock alert' });
  }
};

/**
 * Get all health tips
 */
const getHealthTips = async (req, res) => {
  try {
    const healthTips = await prisma.healthTip.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: healthTips });
  } catch (error) {
    console.error('Error fetching health tips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch health tips' });
  }
};

/**
 * Create health tip
 */
const createHealthTip = async (req, res) => {
  try {
    const { title, content, category, imageUrl, publishDate, expiryDate, isActive } = req.body;

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

    res.json({ success: true, data: healthTip });
  } catch (error) {
    console.error('Error creating health tip:', error);
    res.status(500).json({ success: false, message: 'Failed to create health tip' });
  }
};

/**
 * Update health tip
 */
const updateHealthTip = async (req, res) => {
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

    res.json({ success: true, data: healthTip });
  } catch (error) {
    console.error('Error updating health tip:', error);
    res.status(500).json({ success: false, message: 'Failed to update health tip' });
  }
};

/**
 * Delete health tip
 */
const deleteHealthTip = async (req, res) => {
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

    res.json({ success: true, message: 'Health tip deleted successfully' });
  } catch (error) {
    console.error('Error deleting health tip:', error);
    res.status(500).json({ success: false, message: 'Failed to delete health tip' });
  }
};

/**
 * Get all announcements
 */
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
};

/**
 * Create announcement
 */
const createAnnouncement = async (req, res) => {
  try {
    const { title, message, type, priority, targetRole, publishDate, expiryDate, isActive } = req.body;

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

    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
};

/**
 * Update announcement
 */
const updateAnnouncement = async (req, res) => {
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

    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (req, res) => {
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

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
};
