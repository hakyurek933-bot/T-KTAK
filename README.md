# Taktik 🎬💬

Yerli TikTok — kısa video paylaşımı + mesajlaşma platformu. **Kurucu tag'i**, **ban paneli** ve **log paneli** dahil. Vercel'de çalışacak şekilde yapılandırıldı.

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS 4** — tam ekran, dikey kaydırmalı TikTok arayüzü
- **PostgreSQL** (Vercel Postgres / Neon / Supabase) + **Prisma**
- **JWT oturum** (jose) + **bcrypt** şifre hash
- **Vercel Blob** ile video yükleme (link ile ekleme de desteklenir)

## Özellikler

| Özellik | Açıklama |
| --- | --- |
| 📱 Tam ekran akış | Dikey kaydırmalı (snap), otomatik oynatma, dokun-durdur, **çift tık beğeni** |
| 🎯 Sana Özel / Takip | İki akış sekmesi; takip ettiklerinin videoları |
| ❤️ Beğeni / 💬 Yorum | Video üzerinde aksiyon çubuğu; **yorum yanıtları + yorum beğenisi** |
| 🔖 Kaydetme | Videoları kaydet, "Kaydedilenler" sayfasında gör |
| 🔔 Bildirimler | Beğeni, yorum, yanıt ve takip bildirimleri + okunmadı sayacı |
| 🔎 Arama | Kişi ve video açıklaması arama |
| # Hashtag | Açıklamadaki #etiketler tıklanabilir, hashtag sayfası |
| 👥 Takip sistemi | Takip et / bırak, takipçi & takip edilen listeleri |
| 🧭 Keşfet | Video grid'i, içerik üreticileri, istatistikler |
| 👁️ İzlenme | Video başına görüntülenme sayısı |
| ⚙️ Ayarlar | Profil düzenleme (ad, bio, fotoğraf) + şifre değiştirme |
| 📤 Yükleme | Cihazdan (Vercel Blob) veya link ile |
| ✉️ Mesajlaşma | Bire bir DM, canlı yenileme |
| 📧 E-posta ile kayıt | E-posta zorunlu, 6 haneli doğrulama kodu (Resend kuruluysa) |
| 🔵 Google ile giriş | Tek tıkla kayıt/giriş, mevcut hesapla otomatik eşleşme |
| ★ Kurucu tag | Altın renkli "KURUCU" rozeti; **tek kurucu sensin** |
| 🚫 Ban paneli | Banla / banı kaldır, sebep gir; yetki hiyerarşisi |
| 📜 Log paneli | Kayıt, giriş, video, yorum, mesaj, ban, rol değişimi |
| 👑 Roller | FOUNDER (kurucu), MOD (moderatör), USER (üye) |

## Vercel'e deploy (adım adım)

1. **Kodu GitHub'a yükle.** (Git kurulu değilse: https://git-scm.com/download/win)
   ```bash
   git init
   git add .
   git commit -m "Taktik"
   git branch -M main
   git remote add origin <repo-adresi>
   git push -u origin main
   ```

2. **Vercel'de içe aktar** → New Project → repoyu seç.

3. **Postgres veritabanı ekle:** Vercel projesinde **Storage → Create Database → Postgres** (Neon). `DATABASE_URL` otomatik eklenir.

4. **Ortam değişkenlerini ekle** (Project → Settings → Environment Variables):

   | Değişken | Değer |
   | --- | --- |
   | `AUTH_SECRET` | Rastgele uzun bir metin (aşağıdaki komutla üret) |
   | `FOUNDER_USERNAME` | Kendi kullanıcı adın (ör. `senin_adin`) |
   | `FOUNDER_PASSWORD` | Kendi şifren (güçlü) |
   | `FOUNDER_DISPLAY_NAME` | Görünen adın |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob (video yükleme için, opsiyonel) |

   `AUTH_SECRET` üretmek için:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Deploy.** `vercel.json` sayesinde build sırasında otomatik olarak:
   - Prisma istemcisi üretilir (`prisma generate`)
   - Tablolar oluşturulur (`prisma db push`)
   - **Kurucu hesabı (sen) oluşturulur** (`node prisma/seed.mjs`)

6. Site açılınca `FOUNDER_USERNAME` / `FOUNDER_PASSWORD` ile giriş yap. Üstteki kalkan ikonundan **yönetim paneline** ulaşırsın.

> **Önemli:** `FOUNDER_PASSWORD` tanımlamazsan kurucu oluşmaz. Ekledikten sonra **Redeploy** et.

### Tek kurucu garantisi

Seed her deploy'da çalışır ve:
- Seni `FOUNDER` rolüyle günceller,
- **Başka bir FOUNDER varsa onu üyeliğe düşürür** (tek kurucu sensin),
- Şifreni `FOUNDER_PASSWORD` ile günceller.

## Yerel çalıştırma (opsiyonel)

Yerelde de PostgreSQL gerekir (Vercel'deki `DATABASE_URL`'i kullanabilir veya kendi Postgres'ini kurabilirsin).

```bash
npm install
# .env içine bir PostgreSQL DATABASE_URL koy
npm run db:push
npm run seed
npm run dev
```

## Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL bağlantı adresi |
| `AUTH_SECRET` | ✅ | Oturum imzalama anahtarı |
| `FOUNDER_USERNAME` / `FOUNDER_PASSWORD` | ✅ | Kurucu (sen) hesabı |
| `FOUNDER_DISPLAY_NAME` | ➖ | Kurucunun görünen adı |
| `SEED_DEMO` | ➖ | `true` ise örnek üye/video eklenir |
| `BLOB_READ_WRITE_TOKEN` | ➖ | Vercel Blob; yoksa "link ile ekle" çalışır |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ➖ | Google ile giriş (yoksa buton hata verir) |
| `NEXT_PUBLIC_APP_URL` | ➖ | Sitenin tam adresi, örn. `https://taktik.vercel.app` (Google callback için) |
| `RESEND_API_KEY` / `EMAIL_FROM` | ➖ | E-posta doğrulama; yoksa doğrulama otomatik geçilir |
| `FOUNDER_EMAIL` | ➖ | Kurucunun e-postası (seed ile işlenir) |

## Komutlar

```bash
npm run dev           # geliştirme
npm run build         # üretim derlemesi
npm run lint          # eslint
npm run seed          # kurucu (+ SEED_DEMO=true ise örnekler)
npm run db:push       # şemayı veritabanına uygula
npm run vercel-build  # Vercel'in çalıştırdığı build
```

## Mimari

```
src/
├─ actions/          # auth, posts, likes, comments, follow, bookmarks,
│                    #   notifications, profile, views, messages, admin
├─ app/
│  ├─ admin/         # Yönetim paneli (ban + log)
│  ├─ api/           # upload, messages
│  ├─ discover/      # Keşfet
│  ├─ messages/      # DM
│  ├─ notifications/ # Bildirimler
│  ├─ saved/         # Kaydedilenler
│  ├─ search/        # Arama
│  ├─ settings/      # Ayarlar (profil + şifre)
│  ├─ tag/[tag]/     # Hashtag sayfası
│  ├─ u/[username]/  # Profil (+ followers / following)
│  ├─ login, signup, upload
│  └─ page.tsx       # Tam ekran akış (Sana Özel / Takip)
├─ components/       # Feed, FeedItem, CommentSheet, VideoPlayer, Caption, ...
└─ lib/              # prisma, auth, log, notify, utils
```

## Güvenlik

- Tüm sunucu aksiyonları oturumu ve yetkiyi yeniden doğrular.
- Moderatörler yönetici ekibini banlayamaz; rol değiştirme yalnızca kurucuya açıktır.
- Üretimde mutlaka güçlü `AUTH_SECRET` ve `FOUNDER_PASSWORD` kullan.
