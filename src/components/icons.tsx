// Basit SVG ikon seti (TikTok tarzı arayüz için).
type IconProps = { size?: number; className?: string; filled?: boolean };

export function HomeIcon({ size = 26, className = "", filled }: IconProps) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3 3 10v11h6v-6h6v6h6V10z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className}>
      <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
    </svg>
  );
}

export function CompassIcon({ size = 26, className = "", filled }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 5.3-5.3 2.2 2.2-5.3z" fill={filled ? "#0b0b12" : "none"} />
    </svg>
  );
}

export function PlusIcon({ size = 30, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function InboxIcon({ size = 26, className = "", filled }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className}>
      <path d="M4 4h16v11l-4 4H4z" />
      <path d="M8 9h8M8 13h5" stroke={filled ? "#0b0b12" : "currentColor"} />
    </svg>
  );
}

export function UserIcon({ size = 26, className = "", filled }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function HeartIcon({ size = 30, className = "", filled }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#fe2c55" : "none"} stroke={filled ? "#fe2c55" : "currentColor"} strokeWidth="2" strokeLinejoin="round" className={className}>
      <path d="M12 21s-7.5-4.7-10-9.3C.5 8 2.3 4.5 5.8 4.1 8 3.9 9.7 5 12 7.2c2.3-2.2 4-3.3 6.2-3.1 3.5.4 5.3 3.9 3.8 7.6C19.5 16.3 12 21 12 21z" />
    </svg>
  );
}

export function CommentIcon({ size = 30, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.4 4.7 3.6 6.2-.2 1.3-.8 2.5-1.7 3.5 1.9-.3 3.6-1 5-2.1 1 .2 2 .3 3.1.3 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
    </svg>
  );
}

export function ShareIcon({ size = 30, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 20c0-6 4-11 11-11V5l7 7-7 7v-4c-5 0-8 2-11 5z" />
    </svg>
  );
}

export function MusicIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9 18a3 3 0 1 0 3-3V2h6v3h-3v10a3 3 0 1 1-6 3z" />
    </svg>
  );
}

export function SearchIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function ChatIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.4 4.7 3.6 6.2-.2 1.3-.8 2.5-1.7 3.5 1.9-.3 3.6-1 5-2.1 1 .2 2 .3 3.1.3 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
    </svg>
  );
}

export function ShieldIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z" />
    </svg>
  );
}

export function PlayIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 4v16l13-8z" />
    </svg>
  );
}

export function BookmarkIcon({ size = 30, className = "", filled }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#face15" : "none"} stroke={filled ? "#face15" : "currentColor"} strokeWidth="2" strokeLinejoin="round" className={className}>
      <path d="M6 3h12v18l-6-5-6 5z" />
    </svg>
  );
}

export function EyeIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function BellIcon({ size = 26, className = "", filled }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={filled ? "#0b0b12" : "currentColor"} />
    </svg>
  );
}

export function SettingsIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.5H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9.3A1.6 1.6 0 0 0 10.4 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  );
}

export function GridIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function LockIcon({ size = 22, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 10V8a6 6 0 0 1 12 0v2h1v11H5V10zm2 0h8V8a4 4 0 0 0-8 0z" />
    </svg>
  );
}
