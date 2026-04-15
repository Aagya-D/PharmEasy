// Content controller for read-only health tips and announcements.

import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/errors.js";

// Get all currently active and published health tips.
export const getActiveHealthTips = async (req, res, next) => {
  try {
    // Return only active records already published and not expired.
    const healthTips = await prisma.healthTip.findMany({
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

// Get the latest active health tip.
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

// Get active announcements, optionally filtered by target role.
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

    // Apply role filter while still allowing global announcements.
    if (targetRole) {
      whereClause.OR = [
        { targetRole: null },
        { targetRole: targetRole.toUpperCase() },
        { targetRole: 'ALL' },
      ];
    }

    const announcements = await prisma.announcement.findMany({
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

// Get highest-priority active announcement for a target role.
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

// Get active health tips by category.
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
