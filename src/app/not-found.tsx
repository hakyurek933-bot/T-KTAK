import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-6xl font-black text-brand">404</p>
      <h1 className="mt-2 text-xl font-bold">Sayfa bulunamadı</h1>
      <p className="mt-1 text-sm text-muted">
        Aradığın sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
      >
        Akışa dön
      </Link>
    </div>
  );
}
