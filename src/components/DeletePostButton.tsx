"use client";

import { useTransition } from "react";
import { deletePostAction } from "@/actions/posts";

export function DeletePostButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Bu videoyu silmek istediğine emin misin?")) return;
    startTransition(async () => {
      await deletePostAction(postId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      title="Videoyu sil"
      className="text-xs text-muted transition hover:text-red-400 disabled:opacity-50"
    >
      {isPending ? "Siliniyor..." : "Sil"}
    </button>
  );
}
