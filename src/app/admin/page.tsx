import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { BanForm } from "@/components/admin/BanForm";
import { UnbanButton } from "@/components/admin/UnbanButton";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { CoinAdjustForm } from "@/components/admin/CoinAdjustForm";
import { LOG_ACTION_LABELS } from "@/lib/log";
import { COIN_REASON_LABELS, findGift } from "@/lib/coins";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yönetim — Taktik" };

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!isStaff(me.role)) redirect("/");

  const isFounder = me.role === "FOUNDER";
  const myId = me.id;

  const [users, logs, stats, coinData] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ banned: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        banned: true,
        bannedReason: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
    }),
    prisma.log.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: { select: { username: true } },
        target: { select: { username: true } },
      },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.user.count({ where: { banned: true } }),
      prisma.message.count(),
    ]),
    // Coin verileri ayrı blok: tablolar henüz yoksa panel yine açılır.
    (async () => {
      try {
        const [txs, gifts, liveCount, giftCount, coinsAgg, balances] =
          await Promise.all([
            prisma.coinTransaction.findMany({
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { user: { select: { username: true } } },
            }),
            prisma.liveGift.findMany({
              orderBy: { createdAt: "desc" },
              take: 20,
              include: {
                sender: { select: { username: true } },
                room: { select: { title: true } },
              },
            }),
            prisma.liveRoom.count({ where: { status: "LIVE" } }),
            prisma.liveGift.count(),
            prisma.user.aggregate({ _sum: { coinBalance: true } }),
            prisma.user.findMany({ select: { id: true, coinBalance: true } }),
          ]);
        return {
          txs,
          gifts,
          liveCount,
          giftCount,
          coinsTotal: coinsAgg._sum.coinBalance ?? 0,
          balances: new Map(balances.map((b) => [b.id, b.coinBalance])),
        };
      } catch {
        return null;
      }
    })(),
  ]);

  const [userCount, postCount, bannedCount, messageCount] = stats;

  // Moderatör yönetici ekibini banlayamaz / rol değiştiremez.
  function canBan(targetRole: string, targetId: string) {
    if (targetId === myId) return false;
    if (isFounder) return true;
    return !isStaff(targetRole as never);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Yönetim Paneli</h1>
      <p className="mb-6 text-sm text-muted">
        Kurucu ve moderatörler için ban yönetimi ve denetim kayıtları.
      </p>

      <details className="mb-6 rounded-2xl border border-white/10 bg-panel p-4 text-sm">
        <summary className="cursor-pointer font-semibold">
          Banlama nasıl kullanılır?
        </summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted">
          <li>
            <span className="text-white">Sebep</span> kutusuna kısa bir gerekçe yazın
            (ör. “spam”, “hakaret”). Bu sebep banlı kullanıcıya giriş ekranında
            gösterilir ve log kaydına işlenir.
          </li>
          <li>
            <span className="text-white">Banla</span> butonuna basın. Banlanan kullanıcı
            anında çıkışa düşer, giriş yapamaz, videosu akışta durur ama hesabı
            kilitlenir.
          </li>
          <li>
            Yanlışlıkla banladıysanız aynı satırdaki{" "}
            <span className="text-white">Banı kaldır</span> butonuyla geri açın.
          </li>
          <li>
            <span className="text-white">Rol</span> sütunundan Üye / Moderatör / Kurucu
            seçebilirsiniz. Rol değiştirme yalnızca kurucuya açıktır;
            moderatörler yönetici ekibini banlayamaz.
          </li>
          <li>
            Her işlem (ban, ban kaldırma, rol değişimi) aşağıdaki{" "}
            <span className="text-white">Denetim Kayıtları</span> bölümüne kim, kimi,
            ne zaman olarak düşer.
          </li>
        </ol>
      </details>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Üye", value: userCount },
          { label: "Video", value: postCount },
          { label: "Banlı", value: bannedCount },
          { label: "Mesaj", value: messageCount },
          { label: "Canlı yayın", value: coinData?.liveCount ?? "—" },
          { label: "Hediye", value: coinData?.giftCount ?? "—" },
          { label: "Dolaşımdaki coin", value: coinData?.coinsTotal ?? "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-panel p-4"
          >
            <p className="text-2xl font-bold text-brand-2">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Üyeler
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5">Kullanıcı</th>
                  <th className="px-4 py-2.5">Rol</th>
                  <th className="px-4 py-2.5">Video</th>
                  <th className="px-4 py-2.5">Coin</th>
                  <th className="px-4 py-2.5">Durum</th>
                  <th className="px-4 py-2.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/u/${u.username}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Avatar user={u} size={28} />
                        <span>
                          <span className="font-medium">@{u.username}</span>
                          <span className="ml-1 text-xs text-muted">
                            {u.displayName}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <RoleTag role={u.role} />
                        <RoleSelect
                          userId={u.id}
                          role={u.role}
                          canChange={isFounder && u.id !== myId}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{u._count.posts}</td>
                    <td className="px-4 py-2.5 font-semibold text-amber-300">
                      {coinData ? `🪙 ${coinData.balances.get(u.id) ?? 0}` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.banned ? (
                        <span className="text-xs text-red-400" title={u.bannedReason ?? ""}>
                          Banlı
                          {u.bannedReason ? `: ${u.bannedReason}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400">Aktif</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        {u.banned ? (
                          <UnbanButton userId={u.id} />
                        ) : canBan(u.role, u.id) ? (
                          <BanForm userId={u.id} />
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Coin yönetimi
        </h2>
        {coinData ? (
          <div className="flex flex-col gap-4">
            <CoinAdjustForm />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
                <p className="border-b border-white/10 px-4 py-2.5 text-sm font-semibold">
                  Son coin hareketleri
                </p>
                <ul className="divide-y divide-white/5">
                  {coinData.txs.length === 0 && (
                    <li className="px-4 py-4 text-sm text-muted">Henüz hareket yok.</li>
                  )}
                  {coinData.txs.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                      <span
                        className={`font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {t.amount}
                      </span>
                      <span className="text-foreground/90">@{t.user.username}</span>
                      <span className="text-xs text-muted">
                        {COIN_REASON_LABELS[t.reason] ?? t.reason}
                      </span>
                      <span className="ml-auto text-xs text-muted">
                        {timeAgo(t.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
                <p className="border-b border-white/10 px-4 py-2.5 text-sm font-semibold">
                  Son hediyeler
                </p>
                <ul className="divide-y divide-white/5">
                  {coinData.gifts.length === 0 && (
                    <li className="px-4 py-4 text-sm text-muted">Henüz hediye yok.</li>
                  )}
                  {coinData.gifts.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                      <span className="text-lg">{findGift(g.gift)?.emoji ?? "🎁"}</span>
                      <span className="text-foreground/90">
                        @{g.sender.username} → {g.room.title}
                      </span>
                      <span className="text-xs text-muted">
                        x{g.count} ({g.cost}🪙)
                      </span>
                      <span className="ml-auto text-xs text-muted">
                        {timeAgo(g.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-panel p-4 text-sm text-muted">
            Coin altyapısı henüz hazır değil. Yakında aktif olacak.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Denetim Kayıtları (son 100)
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel">
          <ul className="divide-y divide-white/5">
            {logs.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted">Henüz kayıt yok.</li>
            )}
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm"
              >
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
                  {LOG_ACTION_LABELS[log.action]}
                </span>
                <span className="text-foreground/90">
                  {log.detail ?? "—"}
                </span>
                <span className="ml-auto text-xs text-muted">
                  {timeAgo(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
