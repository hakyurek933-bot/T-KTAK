/** İstemci tarafı video ön kontrolleri (sunucuya gitmeden eler). */

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function probeSrc(src: string, timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    const timer = setTimeout(() => finish(false), timeoutMs);
    function finish(ok: boolean) {
      clearTimeout(timer);
      v.removeAttribute("src");
      v.load();
      resolve(ok);
    }
    v.addEventListener("error", () => finish(false), { once: true });
    v.addEventListener("canplay", () => finish(true), { once: true });
    v.src = src;
  });
}

/** Uzak video adresi bu tarayıcıda oynatılabiliyor mu? */
export function probeUrlPlayable(url: string): Promise<boolean> {
  return probeSrc(url);
}

/** Seçilen dosya bu tarayıcıda oynatılabiliyor mu? (codec/format tuzağı) */
export function probeFilePlayable(file: File): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  try {
    const test = document.createElement("video");
    if (file.type && test.canPlayType(file.type) === "") {
      return Promise.resolve(false);
    }
  } catch {
    /* ön kontrol başarısızsa gerçek yükleme testine devam et */
  }
  const url = URL.createObjectURL(file);
  return probeSrc(url).finally(() => URL.revokeObjectURL(url));
}
