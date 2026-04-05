import React, { useMemo, useState } from "react";

const FALLBACK_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23e0f2fe'/%3E%3Cstop offset='100%25' stop-color='%23f0fdfa'/%3E%3C/linearGradient%3E%3ClinearGradient id='pill' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%230ea5e9'/%3E%3Cstop offset='100%25' stop-color='%2314b8a6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='900' fill='url(%23bg)'/%3E%3Ccircle cx='180' cy='180' r='120' fill='%23ffffff' fill-opacity='0.5'/%3E%3Ccircle cx='1020' cy='740' r='180' fill='%23ffffff' fill-opacity='0.45'/%3E%3Cg transform='translate(600 460) rotate(-22)'%3E%3Crect x='-250' y='-90' width='500' height='180' rx='90' fill='%23ffffff'/%3E%3Crect x='-250' y='-90' width='250' height='180' rx='90' fill='url(%23pill)'/%3E%3Cline x1='0' y1='-80' x2='0' y2='80' stroke='%23cbd5e1' stroke-width='10'/%3E%3Ccircle cx='-110' cy='0' r='18' fill='%23e0f2fe'/%3E%3Ccircle cx='110' cy='0' r='18' fill='%23ecfeff'/%3E%3C/g%3E%3Ctext x='600' y='790' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif' font-size='44' fill='%230f766e'%3EMedicine Image Pending%3C/text%3E%3C/svg%3E";

export default function MedicineImage({ src, alt, className = "", fallbackClassName = "" }) {
  const [failed, setFailed] = useState(false);

  const imageSource = useMemo(() => {
    if (!src || failed) return FALLBACK_SVG;
    return src;
  }, [failed, src]);

  return (
    <img
      src={imageSource}
      alt={alt || "Medicine"}
      loading="lazy"
      className={`h-full w-full object-cover ${!src || failed ? fallbackClassName : ""} ${className}`.trim()}
      onError={() => setFailed(true)}
    />
  );
}
