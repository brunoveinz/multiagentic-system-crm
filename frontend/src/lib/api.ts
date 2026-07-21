// Cliente HTTP del frontend. Adjunta el JWT, parsea JSON y, ante un 401,
// intenta refrescar el token una sola vez antes de fallar.

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Prefijo público de la API cuando servimos same-origin (prod: API_BASE === "").
// No usamos /api porque en el proxy de Dokploy otra app tiene tomada esa ruta y
// gana por ser más específica que nuestro `/`. Next reescribe /crm-api/* hacia
// /api/* del backend, así que Django no cambia. En dev llamamos directo a Django,
// que sí vive bajo /api, y por eso ahí el prefijo se deja intacto.
const PUBLIC_API_PREFIX = "/crm-api";

function publicPath(path: string): string {
  return API_BASE === ""
    ? path.replace(/^\/api(?=\/|$)/, PUBLIC_API_PREFIX)
    : path;
}

const ACCESS_KEY = "ventas.access";
const REFRESH_KEY = "ventas.refresh";

export const tokenStore = {
  get access(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(typeof data === "object" && data && "detail" in data
      ? String((data as { detail: unknown }).detail)
      : `Error ${status}`);
    this.status = status;
    this.data = data;
  }
}

/**
 * Convierte el cuerpo de error de DRF en un mensaje legible para el usuario.
 * Soporta `{ detail: "..." }`, `{ campo: ["msg", ...], ... }` y strings sueltos.
 * Aplana TODOS los campos (no solo el primero) e incluye el código de estado,
 * para que el usuario nunca quede sin saber por qué falló la operación.
 * `labels` opcional traduce el nombre del campo (p. ej. `username` -> `Usuario`).
 */
export function formatApiError(
  err: unknown,
  fallback: string,
  labels: Record<string, string> = {},
): string {
  if (!(err instanceof ApiError)) return fallback;
  const { data, status } = err;

  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string" && obj.detail.trim()) return obj.detail;

    const parts: string[] = [];
    for (const [field, value] of Object.entries(obj)) {
      const msgs = (Array.isArray(value) ? value : [value]).map(String);
      const label = field === "non_field_errors" ? "" : `${labels[field] ?? field}: `;
      parts.push(`${label}${msgs.join(" ")}`);
    }
    if (parts.length) return parts.join(" · ");
  }

  return `${fallback} (error ${status})`;
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${publicPath(path)}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(tokenStore.access
        ? { Authorization: `Bearer ${tokenStore.access}` }
        : {}),
      ...(init.headers ?? {}),
    },
  });
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}${publicPath("/api/auth/token/refresh/")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { access: string };
  tokenStore.set(data.access);
  return true;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res = await rawFetch(path, init);

  if (res.status === 401 && (await tryRefresh())) {
    res = await rawFetch(path, init);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    throw new ApiError(res.status, data);
  }
  return data as T;
}
