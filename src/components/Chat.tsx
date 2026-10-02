"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { RoleTag } from "@/components/RoleTag";
import { sendMessageAction, markConversationRead } from "@/actions/messages";
import { timeAgo } from "@/lib/utils";
import type { Role } from "@prisma/client";

type OtherUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  bio: string | null;
};

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export function Chat({
  me,
  other,
  initialMessages,
}: {
  me: { id: string };
  other: OtherUser;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Yeni mesajları periyodik olarak çek (yoklama).
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?me=${me.id}&other=${other.id}`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages: Message[] };
        if (active) setMessages(data.messages);
      } catch {
        /* sessizce yoksay */
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [me.id, other.id]);

  // Gelen okunmamışları okundu işaretle.
  useEffect(() => {
    const hasUnread = messages.some(
      (m) => m.senderId === other.id && !m.read
    );
    if (hasUnread) {
      markConversationRead(other.id).catch(() => {});
    }
  }, [messages, other.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    setError(null);
    setSending(true);
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      senderId: me.id,
      receiverId: other.id,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");

    const res = await sendMessageAction({ receiverId: other.id, body });
    if (res.error) {
      setError(res.error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Avatar user={other} size={40} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">@{other.username}</span>
            <RoleTag role={other.role} />
          </div>
          {other.bio && <p className="truncate text-xs text-muted">{other.bio}</p>}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Henüz mesaj yok. İlk mesajı sen yaz!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? "rounded-br-sm bg-brand text-white"
                    : "rounded-bl-sm bg-panel-2 text-foreground"
                }`}
              >
                <p className="break-words">{m.body}</p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    mine ? "text-white/70" : "text-muted"
                  }`}
                >
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-white/10 p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz..."
          maxLength={1000}
          className="w-full rounded-full border border-white/10 bg-panel-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Gönder
        </button>
      </form>
      {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
