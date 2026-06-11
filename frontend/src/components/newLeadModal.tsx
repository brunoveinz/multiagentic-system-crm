"use client";

import { useState } from "react";
import { createLead, type Stage } from "@/lib/pipeline";
import { ErrorText, Field, PrimaryButton, inputProps } from "@/components/ui";

export function NewLeadModal({
  stages,
  onClose,
  onCreated,
}: {
  stages: Stage[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState<number>(stages[0]?.id ?? 0);
  const [context, setContext] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createLead({
        name,
        company,
        stage,
        context,
        contact: { name: contactName, email: contactEmail, role: "" },
      });
      onCreated();
    } catch {
      setError("No se pudo crear el lead.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Nuevo lead</h2>
        <form onSubmit={onSubmit}>
          <ErrorText>{error}</ErrorText>
          <Field label="Nombre (empresa o persona)">
            <input
              {...inputProps()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <Field label="Empresa (opcional)">
            <input
              {...inputProps()}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </Field>
          <Field label="Etapa inicial">
            <select
              {...inputProps()}
              value={stage}
              onChange={(e) => setStage(Number(e.target.value))}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contexto / ángulo de venta (insumo para la IA)">
            <textarea
              {...inputProps()}
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </Field>
          <Field label="Contacto: nombre (opcional)">
            <input
              {...inputProps()}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </Field>
          <Field label="Contacto: email (opcional)">
            <input
              {...inputProps()}
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={ghostBtn}>
              Cancelar
            </button>
            <PrimaryButton disabled={submitting}>
              {submitting ? "Creando…" : "Crear lead"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 50,
};

const panel: React.CSSProperties = {
  background: "var(--panel)",
  borderRadius: 14,
  padding: "1.75rem",
  width: "100%",
  maxWidth: 440,
  maxHeight: "90vh",
  overflowY: "auto",
};

const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: "11px 12px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
};
