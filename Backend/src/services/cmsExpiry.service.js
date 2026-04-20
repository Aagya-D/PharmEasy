import { prisma } from "../database/prisma.js";
import logger from "../utils/logger.js";

export async function purgeExpiredCmsContent({ logResult = false } = {}) {
  const now = new Date();

  const [healthTipsResult, announcementsResult] = await prisma.$transaction([
    prisma.healthTip.deleteMany({
      where: {
        expiryDate: {
          lte: now,
        },
      },
    }),
    prisma.announcement.deleteMany({
      where: {
        expiryDate: {
          lte: now,
        },
      },
    }),
  ]);

  const deletedHealthTips = Number(healthTipsResult?.count || 0);
  const deletedAnnouncements = Number(announcementsResult?.count || 0);
  const deletedTotal = deletedHealthTips + deletedAnnouncements;

  if (logResult && deletedTotal > 0) {
    logger.info("[CMS_EXPIRY] Deleted expired CMS content", {
      deletedHealthTips,
      deletedAnnouncements,
      deletedTotal,
      executedAt: now.toISOString(),
    });
  }

  return {
    deletedHealthTips,
    deletedAnnouncements,
    deletedTotal,
    executedAt: now,
  };
}

export default {
  purgeExpiredCmsContent,
};
