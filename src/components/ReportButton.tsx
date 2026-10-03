"use client";

import { useState } from "react";
import { createReportAction } from "@/actions/reports";
import { REPORT_REASONS, type ReportTarget } from "@/lib/reports";

/** 🚩 Şikayet butonu: küçük bayrak, tıklayınca sebep seçmeli kutu açar. */
export function ReportButton({
  target,
  targetId,
}: {
  target: ReportTarget;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("SPAM");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setMessage(null);
    const res = await createReportAction({
      target,
      targetId,
      reason,
      detail: detail.trim() || undefined,
    });
    if (res.error) {
      setMessage(res.error);
    } else {
      setDone(true);
      setMessage("Şikayetin alındı 🐺 Ekibimiz inceleyecek.");
    }
    setSending(false);
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setMessage(null);
        }}
        title="Şikayet et"
        className="text-muted transition hover:text-red-400"
      >
        🚩
      </button>
      {open && !done && (
        <form
          onSubmit={handleSubmit}
          className="absolute bottom-6 right-0 z-30 w-64 rounded-2xl border border-white/15 bg-panel p-3 shadow-2xl"
        >
          <p className="mb-2 text-xs font-bold">🐺 Neden şikayet ediyorsun?</p>
          <div className="flex flex-col gap-1">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.key}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-white/5"
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r.key}
                  onChange={() => setReason(r.key)}
                  className="accent-red-500"
                />
                {r.label}
              </label>
            ))}
          </div>
          <input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={300}
            placeholder="Detay (opsiyonel)"
            className="mt-2 w-full rounded-lg border border-white/10 bg-panel-2 px-2.5 py-1.5 text-xs outline-none focus:border-brand"
          />
          {message && <p className="mt-1.5 text-xs text-red-400">{message}</p>}
          <button
            disabled={sending}
            className="mt-2 w-full rounded-xl bg-red-600 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {sending ? "Gönderiliyor..." : "Şikayeti gönder"}
          </button>
        </form>
      )}
      {open && done && (
        <span className="absolute bottom-6 right-0 z-30 w-56 rounded-xl border border-emerald-500/30 bg-panel px-3 py-2 text-xs text-emerald-400 shadow-2xl">
          {message}
        </span>
      )}
    </span>
  );
}
