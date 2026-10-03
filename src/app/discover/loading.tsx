/** Keşfet iskeleti. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-up px-3 py-5">
      <div className="animate-shimmer mb-4 h-7 w-32 rounded-lg" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-shimmer h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-shimmer aspect-[9/16] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
