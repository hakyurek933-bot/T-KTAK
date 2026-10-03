/** Genel yükleme ekranı (sayfa geçişlerinde). */
export default function Loading() {
  return (
    <div className="grid flex-1 place-items-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-14 w-14 animate-pulse place-items-center rounded-3xl bg-gradient-to-br from-brand to-brand-2 text-2xl font-black text-white">
          T
        </div>
        <p className="text-sm text-muted">Yükleniyor...</p>
      </div>
    </div>
  );
}
