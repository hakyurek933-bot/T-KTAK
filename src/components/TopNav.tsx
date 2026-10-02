import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { SearchBar } from "@/components/SearchBar";
import { SettingsIcon, BellIcon } from "@/components/icons";

export async function TopNav() {
  const user = await getCurrentUser();

  let unread = 0;
  if (user) {
    unread = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
  }

  return (
    <header className="z-30 flex items-center gap-3 border-b border-white/10 bg-ink px-3 py-2.5 sm:px-4">
      <Link href="/" className="flex shrink-0 items-center gap-1.5" aria-label="Taktik">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-sm font-black text-ink">
          T
        </span>
        <span className="hidden text-lg font-extrabold tracking-tight sm:block">Taktik</span>
      </Link>

      <div className="mx-auto hidden w-full max-w-sm md:block">
        <SearchBar />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
        <Link
          href="/search"
          title="Ara"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </Link>

        {user ? (
          <>
            <Link
              href="/saved"
              title="Kaydedilenler"
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M6 3h12v18l-6-5-6 5z" />
              </svg>
            </Link>

            <Link
              href="/notifications"
              title="Bildirimler"
              className="relative grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"
            >
              <BellIcon size={22} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>

            {isStaff(user.role) && (
              <Link
                href="/admin"
                title="Yönetim"
                className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z" />
                </svg>
              </Link>
            )}

            <Link
              href="/settings"
              title="Ayarlar"
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"
            >
              <SettingsIcon size={20} />
            </Link>

            <Link href={`/u/${user.username}`} title="Profil">
              <Avatar user={user} size={30} />
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-muted hover:text-white">
              Giriş
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand/90"
            >
              Kayıt ol
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
