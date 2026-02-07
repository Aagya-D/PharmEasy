/**
 * Content Controller - Public health tips and announcements
 * Handles read-only operations for active content visible to all authenticated users
 */

import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/errors.js";

/**
 * GET /api/content/health-tips
 * Get all active health tips (public)
 * @access Authenticated users (any role)
 */
export const getActiveHealthTips = async (req, res, next) => {
  try {
    const healthTips = await prisma.healthTip.findMany({
      where: {
        isActive: true,
        publishDate: {
          lte: new Date(), // Only published tips
        },
        OR: [
          { expiryDate: null }, // No expiry
          { expiryDate: { gte: new Date() } }, // Not yet expired
        ],
      },
      orderBy: {
        publishDate: 'desc',
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        imageUrl: true,
        publishDate: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      count: healthTips.length,
      data: healthTips,
    });
  } catch (error) {
    console.error("[CONTENT] Error fetching health tips:", error);
    next(error);
  }
};

/**
 * GET /api/content/health-tips/latest
 * Get single most recent active health tip
 * @access Authenticated users (any role)
 */
export const getLatestHealthTip = async (req, res, next) => {
  try {
    const healthTip = await prisma.healthTip.findFirst({
      where: {
        isActive: true,
        publishDate: {
          lte: new Date(),
        },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } },
        ],
      },
      orderBy: {
        publishDate: 'desc',
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        imageUrl: true,
        publishDate: true,
      },
    });

    res.status(200).json({
      success: true,
      data: healthTip,
    });
  } catch (error) {
    console.error("[CONTENT] Error fetching latest health tip:", error);
    next(error);
  }
};

/**
 * GET /api/content/announcements
 * Get all active announcements filtered by target role
 * Query: ?targetRole=PATIENT|PHARMACY|ADMIN (optional)
 * @access Authenticated users (any role)
 */
export const getActiveAnnouncements = async (req, res, next) => {
  try {
    const { targetRole } = req.query;

    const whereClause = {
      isActive: true,
      publishDate: {
        lte: new Date(),
      },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } },
      ],
    };

    // Filter by target role if provided
    if (targetRole) {
      whereClause.OR = [
        { targetRole: null }, // Global announcements
        { targetRole: targetRole.toUpperCase() },
        { targetRole: 'ALL' },
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' }, // high > normal > low
        { publishDate: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        priority: true,
        targetRole: true,
        publishDate: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error("[CONTENT] Error fetching announcements:", error);
    next(error);
  }
};

/**
 * GET /api/content/announcements/priority
 * Get single highest priority announcement for target role
 * Query: ?targetRole=PATIENT|PHARMACY|ADMIN (required)
 * @access Authenticated users (any role)
 */
export const getHighPriorityAnnouncement = async (req, res, next) => {
  try {
    const { targetRole } = req.query;

    if (!targetRole) {
      throw new AppError('Target role is required', 400);
    }

    const whereClause = {
      isActive: true,
      publishDate: {
        lte: new Date(),
      },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } },
      ],
      AND: [
        {
          OR: [
            { targetRole: null },
            { targetRole: targetRole.toUpperCase() },
            { targetRole: 'ALL' },
          ],
        },
      ],
    };

    const announcement = await prisma.announcement.findFirst({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { publishDate: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        priority: true,
        targetRole: true,
        publishDate: true,
      },
    });

    res.status(200).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error("[CONTENT] Error fetching high priority announcement:", error);
    next(error);
  }
};

/**
 * GET /api/content/health-tips/category/:category
 * Get health tips by category
 * @access Authenticated users (any role)
 */
export const getHealthTipsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const healthTips = await prisma.healthTip.findMany({
      where: {
        isActive: true,
        category: category,
        publishDate: {
          lte: new Date(),
        },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date() } },
        ],
      },
      orderBy: {
        publishDate: 'desc',
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        imageUrl: true,
        publishDate: true,
      },
    });

    res.status(200).json({
      success: true,
      count: healthTips.length,
      data: healthTips,
    });
  } catch (error) {
    console.error("[CONTENT] Error fetching health tips by category:", error);
    next(error);
  }
};

export default {
  getActiveHealthTips,
  getLatestHealthTip,
  getActiveAnnouncements,
  getHighPriorityAnnouncement,
  getHealthTipsByCategory,
};
