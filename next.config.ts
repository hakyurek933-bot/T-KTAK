import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma ve bcrypt native Node modülleri kullanır; sunucu tarafında harici kalsın.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
