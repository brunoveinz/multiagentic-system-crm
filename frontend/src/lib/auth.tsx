"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { apiFetch, tokenStore } from "./api";

export type NorthMetric = "mails" | "reuniones" | "cierres";

export interface Organization {
  id: number;
  name: string;
  slug: string;
  objective: string;
  default_north_metric: NorthMetric;
  coach_instructions: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  organization: Organization | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser(): Promise<void> {
    if (!tokenStore.access) {
      setUser(null);
      return;
    }
    try {
      setUser(await apiFetch<User>("/api/auth/me/"));
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string): Promise<void> {
    const data = await apiFetch<{ access: string; refresh: string }>(
      "/api/auth/token/",
      { method: "POST", body: JSON.stringify({ username, password }) },
    );
    tokenStore.set(data.access, data.refresh);
    await refreshUser();
  }

  async function signup(
    username: string,
    email: string,
    password: string,
  ): Promise<void> {
    await apiFetch("/api/auth/signup/", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    await login(username, password);
  }

  function logout(): void {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
