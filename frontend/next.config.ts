import type { NextConfig } from "next";
import path from "path";

// En producción servimos todo bajo un solo dominio: Next hace de proxy de /api/*
// hacia el contenedor del backend (red interna de Docker). En dev no se usa
// porque el front llama directo a NEXT_PUBLIC_API_BASE_URL.
// OJO: `rewrites()` se evalúa en `next build`, no en runtime — el destino queda
// horneado en .next/routes-manifest.json. Por eso este valor tiene que llegar
// como ARG de build (ver Dockerfile.prod); ponerlo solo en `environment:` del
// compose no tiene ningún efecto. Y por eso el default apunta al nombre real del
// servicio: un `api` genérico colisiona en la red compartida de Dokploy.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://ventas-api:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No redirigir quitando la barra final, y re-agregarla en el destino del proxy:
  // el backend (Django/DRF) exige rutas con `/` al final.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Prefijo público real (ver PUBLIC_API_PREFIX en src/lib/api.ts): /api está
      // tomado por otra app en el proxy de Dokploy, así que exponemos /crm-api.
      { source: "/crm-api/:path*", destination: `${API_PROXY_TARGET}/api/:path*/` },
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
