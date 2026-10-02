"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CompassIcon,
  PlusIcon,
  InboxIcon,
  UserIcon,
} from "@/components/icons";

export function BottomNav({ username }: { username?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="z-30 flex items-center justify-around border-t border-white/10 bg-ink px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
      <NavButton href="/" label="Akış" active={isActive("/")}>
        <HomeIcon filled={isActive("/")} />
      </NavButton>

      <NavButton href="/discover" label="Keşfet" active={isActive("/discover")}>
        <CompassIcon filled={isActive("/discover")} />
      </NavButton>

      <Link
        href="/upload"
        aria-label="Yükle"
        className="relative -mt-1 grid h-9 w-12 place-items-center"
      >
        <span className="grid h-8 w-12 place-items-center rounded-lg bg-white text-ink">
          <PlusIcon size={24} />
        </span>
      </Link>

      <NavButton
        href="/notifications"
        label="Bildirim"
        active={isActive("/notifications")}
      >
        <InboxIcon filled={isActive("/notifications")} />
      </NavButton>

      <NavButton
        href={username ? `/u/${username}` : "/login"}
        label="Profil"
        active={!!username && pathname.startsWith(`/u/${username}`)}
      >
        <UserIcon filled={!!username && isActive(`/u/${username}`)} />
      </NavButton>
    </nav>
  );
}

function NavButton({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
        active ? "text-white" : "text-muted"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
