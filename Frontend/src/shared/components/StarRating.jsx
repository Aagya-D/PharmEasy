import React from "react";
import { Star } from "lucide-react";

/**
 * StarRating – read-only star rating display
 *
 * Props:
 *  - rating       : number (0–5, can be decimal e.g. 4.3)
 *  - totalReviews : number (optional, shown as "(12 reviews)")
 *  - size         : number (icon size in px, default 14)
 *  - className    : string (additional classes on the wrapper)
 */
export default function StarRating({
  rating = 0,
  totalReviews,
  size = 14,
  className = "",
}) {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      // Full star
      stars.push(
        <Star
          key={i}
          size={size}
          className="text-yellow-400 fill-yellow-400"
        />
      );
    } else if (i === Math.ceil(rating) && rating % 1 >= 0.25) {
      // Half-ish star (use a partial overlay)
      stars.push(
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="text-gray-300 absolute inset-0" />
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${(rating % 1) * 100}%` }}
          >
            <Star size={size} className="text-yellow-400 fill-yellow-400" />
          </span>
        </span>
      );
    } else {
      // Empty star
      stars.push(
        <Star key={i} size={size} className="text-gray-300" />
      );
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">{stars}</div>
      <span className="text-sm font-medium text-gray-700 ml-1">
        {rating > 0 ? rating.toFixed(1) : "0.0"}
      </span>
      {totalReviews !== undefined && totalReviews !== null && (
        <span className="text-xs text-gray-400">
          ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
}
