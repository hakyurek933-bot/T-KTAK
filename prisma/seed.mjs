// Başlangıç verisi: YALNIZCA kurucu hesabı.
// Örnek üye/video eklemek için: SEED_DEMO=true npm run seed
// Çalıştır: npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.FOUNDER_USERNAME || "kurucu").toLowerCase();
  const password = process.env.FOUNDER_PASSWORD;
  if (!password) {
    console.warn(
      "⚠ FOUNDER_PASSWORD tanımlı değil; kurucu hesabı oluşturulmadı. " +
        "Vercel ortam değişkenlerine ekleyip tekrar deploy edin."
    );
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const founder = await prisma.user.upsert({
    where: { username },
    update: {
      role: "FOUNDER",
      banned: false,
      bannedReason: null,
      bannedAt: null,
      passwordHash,
    },
    create: {
      username,
      displayName: process.env.FOUNDER_DISPLAY_NAME || "Kurucu",
      passwordHash,
      role: "FOUNDER",
      bio: "Taktik kurucusu.",
    },
  });
  console.log(`✓ Kurucu hazır: @${founder.username}`);

  // Kurucu tek kişi olsun: başka FOUNDER varsa üyeliğe düşür.
  const demoted = await prisma.user.updateMany({
    where: { role: "FOUNDER", id: { not: founder.id } },
    data: { role: "USER" },
  });
  if (demoted.count > 0) {
    console.log(`✓ ${demoted.count} eski kurucu üyeliğe düşürüldü (tek kurucu sensin).`);
  }

  if (process.env.SEED_DEMO === "true") {
    const sampleNames = ["zeynep", "mert", "elif", "can"];
    const members = [];
    for (const name of sampleNames) {
      const u = await prisma.user.upsert({
        where: { username: name },
        update: {},
        create: {
          username: name,
          displayName: name[0].toUpperCase() + name.slice(1),
          passwordHash: await bcrypt.hash("uyem1234", 10),
          role: "USER",
          bio: "Merhaba, ben " + name + ".",
        },
      });
      members.push(u);
    }
    console.log(`✓ ${members.length} örnek üye eklendi (şifre: uyem1234)`);

    const sampleVideos = [
      { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", caption: "İlk videom! 🎬 #Taktik" },
      { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", caption: "Bugün hava harika ☀️ #keşfet" },
      { url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", caption: "Kaçış zamanı 🏃 #Taktik" },
    ];
    if ((await prisma.post.count()) === 0) {
      const createdPosts = [];
      for (let i = 0; i < sampleVideos.length; i++) {
        const p = await prisma.post.create({
          data: {
            authorId: members[i % members.length].id,
            videoUrl: sampleVideos[i].url,
            caption: sampleVideos[i].caption,
            viewCount: 100 + i * 37,
          },
        });
        createdPosts.push(p);
      }
      console.log(`✓ ${sampleVideos.length} örnek video eklendi`);

      // Birbirlerini takip etsinler ve kurucu herkesi takip etsin.
      for (const m of members) {
        await prisma.follow.upsert({
          where: { followerId_followingId: { followerId: founder.id, followingId: m.id } },
          update: {},
          create: { followerId: founder.id, followingId: m.id },
        });
      }
      // Örnek beğeni ve yorum.
      await prisma.like.createMany({
        data: members.map((m) => ({ userId: m.id, postId: createdPosts[0].id })),
        skipDuplicates: true,
      });
      await prisma.comment.create({
        data: {
          postId: createdPosts[0].id,
          authorId: members[0].id,
          body: "Harika olmuş! 🔥",
        },
      });
      console.log("✓ Örnek takip, beğeni ve yorum eklendi");
    }
  }

  await prisma.log.create({
    data: {
      action: "SIGNUP",
      actorId: founder.id,
      detail: "Kurucu hesabı seed ile oluşturuldu",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
