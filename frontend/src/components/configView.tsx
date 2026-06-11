"use client";

import { useEffect, useState } from "react";
import { Building2, Mail, Pencil, UserRound } from "lucide-react";
import { useAuth, type NorthMetric, type Organization, type User } from "@/lib/auth";
import { getEmailAccount, saveEmailAccount, type EmailAccountConfig } from "@/lib/agents";
import { updateMe, updateOrg } from "@/lib/account";
import { Field, inputProps } from "@/components/ui";

const METRICS: { value: NorthMetric; label: string }[] = [
  { value: "mails", label: "Enviar más mails" },
  { value: "reuniones", label: "Agendar más reuniones" },
  { value: "cierres", label: "Concretar más negocios" },
];
const METRIC_LABEL: Record<string, string> = Object.fromEntries(
  METRICS.map((m) => [m.value, m.label]),
);

export function ConfigView({
  user,
  org,
  onLogout,
}: {
  user: User;
  org: Organization;
  onLogout: () => void;
}) {
  const { refreshUser } = useAuth();

  const [editOrg, setEditOrg] = useState(false);
  const [name, setName] = useState(org.name);
  const [objective, setObjective] = useState(org.objective);
  const [metric, setMetric] = useState<NorthMetric>(org.default_north_metric);
  const [savingOrg, setSavingOrg] = useState(false);

  const [editAcc, setEditAcc] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [savingAcc, setSavingAcc] = useState(false);

  const [smtp, setSmtp] = useState<EmailAccountConfig | null>(null);
  const [editSmtp, setEditSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState("");
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState(user.email);
  const [fromEmail, setFromEmail] = useState(user.email);
  const [fromName, setFromName] = useState(org.name);
  const [useTls, setUseTls] = useState(true);
  const [smtpPass, setSmtpPass] = useState("");

  useEffect(() => {
    getEmailAccount()
      .then((d) => {
        setSmtp(d);
        if (d.configured) {
          setHost(d.host ?? "");
          setPort(d.port ?? 587);
          setSmtpUser(d.username ?? "");
          setFromEmail(d.from_email ?? "");
          setFromName(d.from_name || org.name);
          setUseTls(d.use_tls ?? true);
        } else {
          setEditSmtp(true);
        }
      })
      .catch(() => setSmtp({ configured: false }));
  }, [org.name]);

  async function saveSmtp() {
    setSavingSmtp(true);
    setSmtpMsg("");
    try {
      const res = await saveEmailAccount({
        host,
        port,
        username: smtpUser,
        from_email: fromEmail,
        from_name: fromName,
        use_tls: useTls,
        ...(smtpPass ? { password: smtpPass } : {}),
      });
      setSmtpPass("");
      setSmtp(await getEmailAccount());
      setEditSmtp(false);
      if (res.warning) setSmtpMsg(res.warning);
    } finally {
      setSavingSmtp(false);
    }
  }

  async function saveOrg() {
    setSavingOrg(true);
    try {
      await updateOrg({ name, objective, default_north_metric: metric });
      await refreshUser();
      setEditOrg(false);
    } finally {
      setSavingOrg(false);
    }
  }

  async function saveAcc() {
    setSavingAcc(true);
    try {
      await updateMe({ email, ...(password ? { password } : {}) });
      await refreshUser();
      setPassword("");
      setEditAcc(false);
    } finally {
      setSavingAcc(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 22,
        alignItems: "start",
      }}
    >
      {/* Empresa */}
      <Card
        icon={<Building2 size={20} />}
        tint="#5b8cff"
        title="Empresa"
        subtitle="Identidad y norte de ventas"
        onEdit={!editOrg ? () => setEditOrg(true) : undefined}
      >
        {editOrg ? (
          <>
            <Field label="Nombre">
              <input {...inputProps()} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Objetivo">
              <textarea {...inputProps()} rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
            </Field>
            <Field label="Métrica norte (value metric)">
              <select {...inputProps()} value={metric} onChange={(e) => setMetric(e.target.value as NorthMetric)}>
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Actions saving={savingOrg} onSave={saveOrg} onCancel={() => {
              setName(org.name); setObjective(org.objective); setMetric(org.default_north_metric); setEditOrg(false);
            }} />
          </>
        ) : (
          <>
            <Row label="Nombre" value={org.name} />
            <Row label="Objetivo" value={org.objective || "—"} />
            <Row label="Métrica norte" value={METRIC_LABEL[org.default_north_metric]} last />
          </>
        )}
      </Card>

      {/* Correo (SMTP) */}
      <Card
        icon={<Mail size={20} />}
        tint="#36d399"
        title="Correo de la empresa"
        subtitle="SMTP de envío"
        onEdit={smtp?.configured && !editSmtp ? () => setEditSmtp(true) : undefined}
      >
        {smtp === null ? (
          <span style={{ color: "var(--muted)" }}>Cargando…</span>
        ) : editSmtp ? (
          <>
            <Field label="Servidor SMTP">
              <input {...inputProps()} value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
            </Field>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Puerto">
                  <input {...inputProps()} type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
                </Field>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26, color: "var(--muted)", fontSize: ".9rem" }}>
                <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} />
                TLS (587)
              </label>
            </div>
            <Field label="Usuario SMTP">
              <input {...inputProps()} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            </Field>
            <Field label="Contraseña (app password)">
              <input {...inputProps()} type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder={smtp.configured ? "Dejar en blanco para no cambiarla" : ""} />
            </Field>
            <Field label="Remitente (From)">
              <input {...inputProps()} type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </Field>
            <Field label="Nombre del remitente">
              <input {...inputProps()} value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </Field>
            <p style={{ color: "var(--muted)", fontSize: ".78rem", lineHeight: 1.5, margin: "0 0 12px" }}>
              Con Gmail/Workspace necesitás una <strong>App Password</strong> (requiere 2FA activado).
            </p>
            {smtpMsg && <p style={{ color: "#f59e0b", fontSize: ".85rem", margin: "0 0 10px" }}>{smtpMsg}</p>}
            <Actions
              saving={savingSmtp}
              onSave={saveSmtp}
              onCancel={() => {
                setEditSmtp(false);
                setSmtpMsg("");
              }}
            />
          </>
        ) : smtp.configured ? (
          <>
            <div style={connectedBox}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--ok)" }} />
              <span>Configurado: <strong>{smtp.from_email}</strong></span>
            </div>
            <div style={{ marginTop: 12 }}>
              <Row label="Servidor" value={`${smtp.host}:${smtp.port}`} last />
            </div>
            {smtpMsg && <p style={{ color: "#f59e0b", fontSize: ".85rem", marginTop: 10 }}>{smtpMsg}</p>}
          </>
        ) : (
          <span style={{ color: "var(--muted)" }}>Configurá el correo de envío…</span>
        )}
      </Card>

      {/* Cuenta */}
      <Card
        icon={<UserRound size={20} />}
        tint="#a78bfa"
        title="Cuenta"
        subtitle="Tus datos de acceso"
        onEdit={!editAcc ? () => setEditAcc(true) : undefined}
      >
        {editAcc ? (
          <>
            <Field label="Email">
              <input {...inputProps()} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Nueva contraseña (opcional)">
              <input {...inputProps()} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejar en blanco para no cambiarla" />
            </Field>
            <Actions saving={savingAcc} onSave={saveAcc} onCancel={() => {
              setEmail(user.email); setPassword(""); setEditAcc(false);
            }} />
          </>
        ) : (
          <>
            <Row label="Usuario" value={user.username} />
            <Row label="Email" value={user.email || "—"} last />
            <button onClick={onLogout} style={logoutBtn}>Cerrar sesión</button>
          </>
        )}
      </Card>
    </div>
  );
}

function Card({
  icon,
  tint,
  title,
  subtitle,
  onEdit,
  children,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  subtitle: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.4rem" }}>
        <span style={{ ...badge, background: `${tint}22`, color: tint }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{title}</h3>
          <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>{subtitle}</span>
        </div>
        {onEdit && (
          <button onClick={onEdit} style={editBtn}>
            <Pencil size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
            Editar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "11px 0",
        borderBottom: last ? "none" : "1px solid #1b232f",
      }}
    >
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ textAlign: "right", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Actions({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      <button onClick={onCancel} style={ghostBtn}>Cancelar</button>
      <button onClick={onSave} disabled={saving} style={primaryBtn}>
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid #1d2533",
  borderRadius: 16,
  padding: "1.6rem 1.75rem",
  boxShadow: "0 1px 3px rgba(0,0,0,.25)",
};
const badge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 42,
  height: 42,
  borderRadius: 12,
  flexShrink: 0,
};
const connectedBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#0e131d",
  borderRadius: 10,
  padding: "12px 14px",
  borderLeft: "3px solid var(--ok)",
};
const editBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2a3140",
  color: "var(--text)",
  borderRadius: 8,
  padding: "6px 13px",
  fontSize: ".82rem",
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
};
const logoutBtn: React.CSSProperties = {
  marginTop: 18,
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
};
