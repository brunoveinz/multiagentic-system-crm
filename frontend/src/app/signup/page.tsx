"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  CenteredCard,
  ErrorText,
  Field,
  PrimaryButton,
  inputProps,
} from "@/components/ui";

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
      await signup(username, email, password);
      router.replace("/onboarding");
    } catch (err) {
      setError(
        formatApiError(err, "No se pudo crear la cuenta.", {
          username: "Usuario",
          email: "Email",
          password: "Contraseña",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredCard title="Crear cuenta" subtitle="Empieza a vender en minutos.">
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
        <Field label="Email">
          <input
            {...inputProps()}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {submitting ? "Creando…" : "Crear cuenta"}
        </PrimaryButton>
      </form>
      <p style={{ marginTop: "1.25rem", color: "var(--muted)", fontSize: ".9rem" }}>
        ¿Ya tienes cuenta? <Link href="/">Entrar</Link>
      </p>
    </CenteredCard>
  );
}
