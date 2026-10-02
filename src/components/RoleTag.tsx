import { ROLE_LABELS } from "@/lib/utils";
import type { Role } from "@prisma/client";

const STYLES: Record<string, string> = {
  FOUNDER:
    "bg-gradient-to-r from-amber-400 to-yellow-200 text-amber-950 ring-1 ring-amber-300/50",
  MOD: "bg-brand-2/20 text-brand-2 ring-1 ring-brand-2/40",
};

/**
 * Rol rozeti. Kurucu için özel "KURUCU" tag'i gösterilir.
 */
export function RoleTag({ role, className = "" }: { role: Role; className?: string }) {
  if (role === "USER") return null;
  const style = STYLES[role] ?? "bg-white/10 text-white";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style} ${className}`}
      title={ROLE_LABELS[role]}
    >
      {role === "FOUNDER" ? "★ Kurucu" : "Moderatör"}
    </span>
  );
}
