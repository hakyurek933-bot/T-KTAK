"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          background: "#0b0b12",
          color: "#f4f4f7",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 48, margin: 0 }}>🛠️</p>
          <h1>Bir şeyler ters gitti</h1>
          <p style={{ color: "#8b8b9e" }}>
            Sunucu sayfayı oluştururken hata verdi. En sık sebep veritabanı
            bağlantısının eksik olmasıdır.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#8b8b9e" }}>
              Hata kodu: {error.digest}
            </p>
          )}
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#fe2c55",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                padding: "8px 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tekrar dene
            </button>
            <a
              href="/api/health"
              style={{
                border: "1px solid rgba(255,255,255,.2)",
                color: "#fff",
                borderRadius: 999,
                padding: "8px 20px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Durumu kontrol et
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
