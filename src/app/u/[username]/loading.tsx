/** Profil iskeleti. */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-fade-up flex-col items-center gap-3 px-3 py-5">
      <div className="animate-shimmer h-36 w-full rounded-2xl" />
      <div className="animate-shimmer h-24 w-24 rounded-full" />
      <div className="animate-shimmer h-5 w-40 rounded-lg" />
      <div className="animate-shimmer h-4 w-64 rounded-lg" />
      <div className="mt-2 grid w-full grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-shimmer aspect-[9/16] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
