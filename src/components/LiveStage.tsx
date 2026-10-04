"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

/** 📷 Gerçek kamera sahnesi (LiveKit).
 *  Yayıncı: kamerasını yayınlar. İzleyici: canlı görüntüyü izler. */
export function LiveStage({
  roomId,
  isPublisher,
}: {
  roomId: string;
  isPublisher: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    let active = true;
    let room: Room | null = null;

    async function connect() {
      try {
        const res = await fetch(
          `/api/livekit-token?room=${encodeURIComponent(roomId)}`
        );
        if (res.status === 503) {
          throw new Error("not-configured");
        }
        if (!res.ok) throw new Error("token");
        const { token, url } = (await res.json()) as {
          token: string;
          url: string;
        };

        room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (!active) return;
          if (track.kind === Track.Kind.Video) {
            track.attach(videoRef.current!);
          } else if (track.kind === Track.Kind.Audio) {
            track.attach(audioRef.current!);
          }
          if (active) setStatus("live");
        });

        await room.connect(url, token);

        if (isPublisher) {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true);
          const pub = [
            ...room.localParticipant.videoTrackPublications.values(),
          ][0];
          pub?.videoTrack?.attach(videoRef.current!);
          if (active) setStatus("live");
        } else {
          // Zaten yayında olanı yakala.
          for (const p of room.remoteParticipants.values()) {
            for (const pub of p.videoTrackPublications.values()) {
              if (pub.videoTrack) {
                pub.videoTrack.attach(videoRef.current!);
                if (active) setStatus("live");
              }
            }
            for (const pub of p.audioTrackPublications.values()) {
              if (pub.audioTrack && audioRef.current) {
                pub.audioTrack.attach(audioRef.current);
              }
            }
          }
        }
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setError(
          err instanceof Error && err.message === "not-configured"
            ? "Kamera servisi henüz bağlanmadı."
            : isPublisher
              ? "Kamera açılamadı. İzin verdiğinden emin ol."
              : "Görüntü alınamadı. Birazdan tekrar dene."
        );
      }
    }

    connect();
    return () => {
      active = false;
      room?.disconnect();
      roomRef.current = null;
    };
  }, [roomId, isPublisher]);

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next).catch(() => {});
    setMicOn(next);
  }

  async function toggleCam() {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next).catch(() => {});
    setCamOn(next);
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <p className="animate-pulse text-sm font-semibold text-white">
            📷 {isPublisher ? "Kamera açılıyor..." : "Canlı görüntü alınıyor..."}
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
          <div>
            <p className="text-4xl">📷</p>
            <p className="mt-2 text-sm font-semibold text-white">Kamera yok</p>
            <p className="mt-1 text-xs text-muted">{error}</p>
          </div>
        </div>
      )}

      {isPublisher && status === "live" && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          <button
            type="button"
            onClick={toggleMic}
            className={`grid h-11 w-11 place-items-center rounded-full text-lg backdrop-blur ${
              micOn ? "bg-white/15 text-white" : "bg-red-600 text-white"
            }`}
            title={micOn ? "Mikrofonu kapat" : "Mikrofonu aç"}
          >
            {micOn ? "🎙️" : "🔇"}
          </button>
          <button
            type="button"
            onClick={toggleCam}
            className={`grid h-11 w-11 place-items-center rounded-full text-lg backdrop-blur ${
              camOn ? "bg-white/15 text-white" : "bg-red-600 text-white"
            }`}
            title={camOn ? "Kamerayı kapat" : "Kamerayı aç"}
          >
            {camOn ? "📷" : "🚫"}
          </button>
        </div>
      )}
    </div>
  );
}
