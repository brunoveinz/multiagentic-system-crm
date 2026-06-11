"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, Send, Target, TrendingUp, Users } from "lucide-react";
import { getDashboard, type Dashboard } from "@/lib/metrics";

const METRIC_LABELS: Record<string, string> = {
  mails: "Enviar más mails",
  reuniones: "Agendar más reuniones",
  cierres: "Concretar más negocios",
};

export function MetricsView({ northMetric }: { northMetric: string }) {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setData(null));
  }, []);

  if (!data) {
    return <p style={{ color: "var(--muted)" }}>Cargando dashboard…</p>;
  }

  const maxStage = Math.max(1, ...data.by_stage.map((s) => s.count));

  return (
    <div>
      <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>
        Norte de la empresa: <strong style={{ color: "var(--text)" }}>{METRIC_LABELS[northMetric] ?? northMetric}</strong>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: "2rem",
        }}
      >
        <Kpi icon={<Users size={18} />} label="Leads totales" value={data.total_leads} />
        <Kpi icon={<Target size={18} />} label="Negocios ganados" value={data.won} accent="var(--ok)" />
        <Kpi icon={<TrendingUp size={18} />} label="Conversión" value={`${data.conversion}%`} accent="var(--accent)" />
        <Kpi icon={<Send size={18} />} label="Mails enviados" value={data.mails_sent} />
        <Kpi icon={<Mail size={18} />} label="Mails por enviar" value={data.mails_pending} accent="#f59e0b" />
        <Kpi icon={<Bell size={18} />} label="Necesitan seguimiento" value={data.needs_followup} accent={data.needs_followup ? "var(--bad)" : "var(--muted)"} />
      </div>

      <h3 style={sectionTitle}>Embudo de ventas</h3>
      <div style={{ background: "var(--panel)", borderRadius: 14, padding: "1.5rem", marginBottom: "2rem" }}>
        {data.by_stage.map((s) => {
          const pct = data.total_leads ? Math.round((s.count / data.total_leads) * 100) : 0;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span style={{ width: 110, fontSize: ".9rem", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color }} />
                {s.name}
              </span>
              <div style={{ flex: 1, background: "#0e131d", borderRadius: 7, height: 28, position: "relative" }}>
                <div
                  style={{
                    width: `${(s.count / maxStage) * 100}%`,
                    background: s.color,
                    height: "100%",
                    borderRadius: 7,
                    minWidth: s.count ? 4 : 0,
                    transition: "width .3s",
                  }}
                />
              </div>
              <span style={{ width: 90, textAlign: "right", fontSize: ".88rem" }}>
                <strong>{s.count}</strong>
                <span style={{ color: "var(--muted)" }}> · {pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div style={{ background: "var(--panel)", borderRadius: 14, padding: "1.25rem 1.4rem" }}>
      <div style={{ color: accent ?? "var(--muted)", marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: "2.1rem", fontWeight: 700, color: accent ?? "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 6 }}>{label}</div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: ".8rem",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "var(--muted)",
};
