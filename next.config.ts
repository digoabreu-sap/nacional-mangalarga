import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Carimba o momento exato do build (roda a cada "next build", ou seja, a
  // cada deploy na Vercel) - usado no numero de versao exibido no /admin
  // pra confirmar quando uma mudanca foi de fato publicada.
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
