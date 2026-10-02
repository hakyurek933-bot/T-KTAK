"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Açıklamayı hashtag ve mention'lara ayırıp link yapar.
 * Uzunsa "devamını gör" ile açılır.
 */
export function Caption({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 90;

  const nodes = text.split(/(\s+)/).map((part, i) => {
    if (/^#[\p{L}\p{N}_]+$/u.test(part)) {
      return (
        <Link
          key={i}
          href={`/tag/${part.slice(1).toLowerCase()}`}
          className="font-semibold text-brand-2 hover:underline"
        >
          {part}
        </Link>
      );
    }
    if (/^@[\w.]+$/.test(part)) {
      return (
        <Link
          key={i}
          href={`/u/${part.slice(1).toLowerCase()}`}
          className="font-semibold hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });

  return (
    <p className={className}>
      <span className={!expanded && long ? "line-clamp-2" : ""}>{nodes}</span>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-1 text-xs font-semibold text-white/70 hover:text-white"
        >
          {expanded ? "daha az" : "devamını gör"}
        </button>
      )}
    </p>
  );
}
