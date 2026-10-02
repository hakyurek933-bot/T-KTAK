"use server";

import { prisma } from "@/lib/prisma";

/** Video görüntülenmesini artırır (aynı kullanıcı tekrar açınca fazla artmasın diye client kontrol eder). */
export async function incrementViewAction(postId: string) {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    /* video silinmiş olabilir */
  }
}
