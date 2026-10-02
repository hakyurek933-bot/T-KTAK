"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-panel px-4 py-2.5"
    >
      <SearchIcon size={20} className="text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ara"
        autoComplete="off"
        className="w-full bg-transparent text-sm outline-none"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          className="text-muted hover:text-white"
          aria-label="Temizle"
        >
          ✕
        </button>
      )}
    </form>
  );
}
