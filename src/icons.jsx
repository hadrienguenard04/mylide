// ─── MYLIDE Icon Library — SVG icons, clean & on-brand ───────────────────────
// Usage: <Icon name="star" size={20} color="#CC2936" />

const ICONS = {
  star: (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      strokeLinejoin="round" strokeLinecap="round" />
  ),
  gift: (
    <>
      <polyline points="20 12 20 22 4 22 4 12" strokeLinejoin="round" strokeLinecap="round"/>
      <rect x="2" y="7" width="20" height="5" strokeLinejoin="round"/>
      <line x1="12" y1="22" x2="12" y2="7" strokeLinecap="round"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" strokeLinejoin="round"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" strokeLinejoin="round"/>
    </>
  ),
  quote: (
    <>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" strokeLinejoin="round"/>
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" strokeLinejoin="round"/>
    </>
  ),
  crown: (
    <path d="M2 20h20M5 20L3 8l5 4 4-7 4 7 5-4-2 12H5z" strokeLinejoin="round" strokeLinecap="round"/>
  ),
  diamond: (
    <path d="M2.7 10.3l9 9a1 1 0 001.4 0l9-9a1 1 0 000-1.4l-4-4a1 1 0 00-.7-.3H7.4a1 1 0 00-.7.3l-4 4a1 1 0 000 1.4z" strokeLinejoin="round"/>
  ),
  warning: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
    </>
  ),
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinejoin="round"/>
  ),
  zap: (
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinejoin="round" strokeLinecap="round"/>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/>
      <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
    </>
  ),
  message: (
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinejoin="round"/>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4"/>
    </>
  ),
  chart: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/>
      <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/>
      <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/>
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinejoin="round"/>
      <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="4"/>
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinejoin="round"/>
      <path d="M10 11v6M14 11v6" strokeLinecap="round"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinejoin="round"/>
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round"/>
    </>
  ),
  shield: (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round"/>
  ),
  refresh: (
    <>
      <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" strokeLinecap="round"/>
    </>
  ),
};

export function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.8, filled = false, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : color}
      strokeWidth={strokeWidth}
      style={{ display: "inline-block", flexShrink: 0, ...style }}
    >
      {ICONS[name] || null}
    </svg>
  );
}
