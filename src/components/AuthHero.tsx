/** Giriş/kayıt sayfaları ortak marka başlığı. */
export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand via-[#e11d48] to-brand-2 text-3xl font-black text-white shadow-[0_0_40px_rgba(254,44,85,0.35)]">
        T
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {["🎬 Kısa video", "🔴 Canlı yayın", "🪙 Coin", "💬 Mesaj"].map((f) => (
          <span
            key={f}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
