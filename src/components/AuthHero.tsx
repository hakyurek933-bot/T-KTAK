import Link from "next/link";

/** Açık temalı giriş/kayıt kabuğu: marka + hap sekmeler + beyaz kart. */
export function AuthShell({
  active,
  subtitle,
  children,
}: {
  active: "login" | "signup";
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#eceef2] px-4 py-10 text-neutral-900">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1e293b] font-serif text-3xl font-bold text-white shadow-lg">
          T
        </div>
        <p className="mt-3 font-serif text-3xl font-bold tracking-tight">
          Taktik
        </p>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-neutral-100 p-1 text-sm font-semibold">
          <Link
            href="/login"
            className={
              active === "login"
                ? "rounded-full bg-[#1e293b] py-2 text-center text-white shadow"
                : "py-2 text-center text-neutral-500 hover:text-neutral-800"
            }
          >
            Giriş Yap
          </Link>
          <Link
            href="/signup"
            className={
              active === "signup"
                ? "rounded-full bg-[#1e293b] py-2 text-center text-white shadow"
                : "py-2 text-center text-neutral-500 hover:text-neutral-800"
            }
          >
            Kayıt Ol
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
