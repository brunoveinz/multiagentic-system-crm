import type { NextConfig } from "next";
import path from "path";

// En producción servimos todo bajo un solo dominio: Next hace de proxy de /api/*
// hacia el contenedor del backend (red interna de Docker). En dev no se usa
// porque el front llama directo a NEXT_PUBLIC_API_BASE_URL.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://api:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No redirigir quitando la barra final, y re-agregarla en el destino del proxy:
  // el backend (Django/DRF) exige rutas con `/` al final.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*/` },
    ];
  },
  // Alias explícito @ -> src para que `next build` lo resuelva sin depender
  // de los paths del tsconfig (que en el build de prod fallaban).
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
};

export default nextConfig;
