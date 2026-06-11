// Bloques de UI reutilizables para mantener las páginas limpias y consistentes.
import type { CSSProperties, ReactNode } from "react";

export function CenteredCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          borderRadius: 14,
          padding: "2rem",
          width: "100%",
          maxWidth: 420,
        }}
      >
        <h1 style={{ margin: "0 0 4px", fontSize: "1.6rem" }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: "0 0 1.5rem", color: "var(--muted)" }}>{subtitle}</p>
        )}
        {children}
      </div>
    </main>
  );
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: ".85rem",
  color: "var(--muted)",
  margin: "0 0 6px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "#0e121a",
  color: "var(--text)",
  fontSize: "1rem",
};

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: "1rem" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

export function inputProps(): { style: CSSProperties } {
  return { style: inputStyle };
}

export function PrimaryButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 8,
        border: "none",
        background: disabled ? "#33405e" : "var(--accent)",
        color: "white",
        fontSize: "1rem",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p style={{ color: "var(--bad)", margin: "0 0 1rem", fontSize: ".9rem" }}>
      {children}
    </p>
  );
}
