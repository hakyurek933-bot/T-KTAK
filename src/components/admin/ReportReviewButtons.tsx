"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewReportAction } from "@/actions/reports";

/** Admin şikayet inceleme butonları: reddet veya içeriği sil. */
export function ReportReviewButtons({
  reportId,
  canDelete,
}: {
  reportId: string;
  canDelete: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handle(decision: "dismiss" | "delete") {
    if (
      decision === "delete" &&
      !confirm("İçerik kalıcı olarak silinsin mi?")
    )
      return;
    setBusy(decision);
    setMessage(null);
    const res = await reviewReportAction(reportId, decision);
    if (res.error) {
      setMessage(res.error);
      setBusy(null);
    } else {
      router.refresh();
    }
  }

  return (
    <span className="flex items-center gap-1.5">
      {message && <span className="text-xs text-red-400">{message}</span>}
      {canDelete && (
        <button
          type="button"
          onClick={() => handle("delete")}
          disabled={busy !== null}
          className="rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy === "delete" ? "..." : "İçeriği sil"}
        </button>
      )}
      <button
        type="button"
        onClick={() => handle("dismiss")}
        disabled={busy !== null}
        className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-muted hover:text-white disabled:opacity-60"
      >
        {busy === "dismiss" ? "..." : "Reddet"}
      </button>
    </span>
  );
}
