"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth, type Organization } from "@/lib/auth";
import {
  CenteredCard,
  ErrorText,
  Field,
  PrimaryButton,
  inputProps,
} from "@/components/ui";

const METRICS: { value: Organization["default_north_metric"]; label: string }[] = [
  { value: "mails", label: "Enviar más mails" },
  { value: "reuniones", label: "Agendar más reuniones" },
  { value: "cierres", label: "Concretar más negocios" },
];

export default function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [metric, setMetric] =
    useState<Organization["default_north_metric"]>("mails");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
    else if (user.organization) router.replace("/app");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/orgs/onboarding/", {
        method: "POST",
        body: JSON.stringify({
          name,
          objective,
          default_north_metric: metric,
        }),
      });
      await refreshUser();
      router.replace("/app");
    } catch {
      setError("No se pudo crear la empresa. Revisa los datos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CenteredCard
      title="Crea tu empresa"
      subtitle="Define qué vendes y qué métrica importa más."
    >
      <form onSubmit={onSubmit}>
        <ErrorText>{error}</ErrorText>
        <Field label="Nombre de la empresa / proyecto">
          <input
            {...inputProps()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </Field>
        <Field label="¿Qué quieres lograr? (objetivo)">
          <textarea
            {...inputProps()}
            rows={3}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ej: vender retornabilidad a embotelladoras del sur."
          />
        </Field>
        <Field label="Tu métrica más valiosa">
          <select
            {...inputProps()}
            value={metric}
            onChange={(e) =>
              setMetric(e.target.value as Organization["default_north_metric"])
            }
          >
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <PrimaryButton disabled={submitting}>
          {submitting ? "Creando…" : "Crear y empezar"}
        </PrimaryButton>
      </form>
    </CenteredCard>
  );
}
