"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ErrorText, Field, PrimaryButton, inputProps } from "@/components/ui";

export default function LoginHome() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      router.replace("/app");
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-split">
      <aside className="login-aside">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #5b8cff, #a78bfa)",
            }}
          >
            <Zap size={24} color="#fff" />
          </span>
          <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>Ventas</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", lineHeight: 1.15, margin: "0 0 1rem", maxWidth: 460 }}>
          Sistema de ventas automatizado multiagente.
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1.1rem", maxWidth: 440, lineHeight: 1.5 }}>
          Sin humo: un pipeline real con agentes de IA que redactan, hacen seguimiento
          y te entrenan para vender más.
        </p>
      </aside>

      <div className="login-form-wrap">
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem" }}>Entrar</h2>
          <form onSubmit={onSubmit}>
            <ErrorText>{error}</ErrorText>
            <Field label="Usuario">
              <input
                {...inputProps()}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="Contraseña">
              <input
                {...inputProps()}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <PrimaryButton disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar"}
            </PrimaryButton>
          </form>
          <p style={{ marginTop: "1.25rem", color: "var(--muted)", fontSize: ".9rem" }}>
            ¿No tienes cuenta? <Link href="/signup">Crear una</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
