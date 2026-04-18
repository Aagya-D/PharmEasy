const SAFE_TO_SELL_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getSafeToSellExpiryFilter = (windowDays = SAFE_TO_SELL_WINDOW_DAYS) => ({
  gt: new Date(Date.now() + windowDays * MS_PER_DAY),
});
