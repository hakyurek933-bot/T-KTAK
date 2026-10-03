import { xpForActivity, levelForXp, badgesFor, type Badge } from "@/lib/level";
import { formatCount } from "@/lib/utils";

/** Profil seviye çubuğu + rozetler (sunucu bileşeni, hesaplanmış değer alır). */
export function ProfileLevel({
  isStaff,
  posts,
  followers,
  likes,
  lives,
  gifts,
  balance,
}: {
  isStaff: boolean;
  posts: number;
  followers: number;
  likes: number;
  lives: number;
  gifts: number;
  balance: number;
}) {
  const xp = xpForActivity({ posts, followers, likes, gifts });
  const info = levelForXp(xp);
  const badges: Badge[] = badgesFor({
    isStaff,
    posts,
    likes,
    lives,
    gifts,
    balance,
  });

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="rounded-full bg-gradient-to-r from-brand to-brand-2 px-3 py-1 text-xs font-extrabold text-white">
          Sv. {info.level} · {info.title}
        </span>
        <span className="text-xs text-muted">{formatCount(info.xp)} XP</span>
      </div>
      <div
        className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10"
        title={
          info.nextXp === null
            ? "Maksimum seviye!"
            : `Sonraki seviye: ${formatCount(info.nextXp)} XP`
        }
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all"
          style={{ width: `${info.progress}%` }}
        />
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {badges.map((b) => (
            <span
              key={b.key}
              title={`${b.name} — ${b.desc}`}
              className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium"
            >
              {b.emoji} {b.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
