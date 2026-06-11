"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Eye, History, Link2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  answerCoach,
  getCoachHistory,
  getCoachToday,
  type CoachLog,
} from "@/lib/agents";
import { updateOrg } from "@/lib/account";

export function CoachView() {
  const { user, refreshUser } = useAuth();
  const org = user?.organization;

  const [today, setToday] = useState<CoachLog | null>(null);
  const [history, setHistory] = useState<CoachLog[]>([]);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const formUrl =
    (typeof window !== "undefined" ? window.location.origin : "") + "/app?view=coach";

  const [instructions, setInstructions] = useState(org?.coach_instructions ?? "");
  const [savingInstr, setSavingInstr] = useState(false);
  const [instrSaved, setInstrSaved] = useState(false);

  function loadCoaching() {
    getCoachToday().then(setToday).catch(() => setToday(null));
    getCoachHistory().then(setHistory).catch(() => setHistory([]));
  }

  useEffect(() => {
    loadCoaching();
  }, []);

  async function onAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setSaving(true);
    try {
      await answerCoach(answer.trim());
      setAnswer("");
      loadCoaching();
    } finally {
      setSaving(false);
    }
  }

  async function saveInstructions() {
    setSavingInstr(true);
    setInstrSaved(false);
    try {
      await updateOrg({ coach_instructions: instructions });
      await refreshUser();
      setInstrSaved(true);
    } finally {
      setSavingInstr(false);
    }
  }

  const answered = today?.answer?.trim();

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Entrenar al coach */}
        <section style={card}>
          <div style={cardHead}>
            <Sparkles size={18} color="var(--accent)" />
            <h3 style={cardTitle}>Entrená a tu coach</h3>
          </div>
          <p style={{ color: "var(--muted)", fontSize: ".9rem", lineHeight: 1.5, margin: "0 0 14px" }}>
            Estas instrucciones se le inyectan <strong>siempre</strong> al coach — tanto al chat como
            a la pregunta diaria. Acá le decís tu estilo, tu foco y tus reglas para que te ayude a
            vender como vos querés.
          </p>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={7}
            placeholder="Ej: Priorizá que agende reuniones. Recordame hacer follow-up a las 48h. Tono directo, sin vueltas. Pedí siempre referidos al cerrar."
            style={area}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={saveInstructions} disabled={savingInstr} style={primaryBtn}>
              {savingInstr ? "Guardando…" : "Guardar instrucciones"}
            </button>
            {instrSaved && <span style={{ color: "var(--ok)" }}>✓ Guardado</span>}
          </div>
        </section>

        {/* Skill diaria */}
        <section style={card}>
          <div style={cardHead}>
            <CalendarClock size={18} color="#f59e0b" />
            <h3 style={cardTitle}>Coaching diario</h3>
          </div>
          <div style={skillRow}>
            <CalendarClock size={15} />
            <span>Cada día a las <strong>08:00</strong> te llega esta pregunta por mail.</span>
          </div>
          <div style={skillRow}>
            <Link2 size={15} />
            <span>El mail incluye un link que abre el formulario para responder.</span>
          </div>
          <div style={linkBox}>
            <code style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {formUrl}
            </code>
            <button onClick={() => setShowForm(true)} style={previewBtn}>
              <Eye size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />
              Ver formulario
            </button>
          </div>

          {today === null ? (
            <p style={{ color: "var(--muted)" }}>Cargando…</p>
          ) : (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: "var(--muted)", fontSize: ".75rem", marginBottom: 6 }}>
                PREGUNTA DE HOY
              </div>
              <p style={{ fontSize: "1.02rem", lineHeight: 1.45, margin: "0 0 12px" }}>
                {today.question}
              </p>
              {answered ? (
                <div style={answeredBox}>
                  <div style={{ color: "var(--muted)", fontSize: ".78rem", marginBottom: 4 }}>
                    Respondida hoy ✓
                  </div>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{today.answer}</p>
                </div>
              ) : (
                <form onSubmit={onAnswer}>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={3}
                    placeholder="¿Qué hiciste hoy para vender más? ¿Qué estás mejorando?"
                    style={area}
                  />
                  <button type="submit" disabled={saving} style={primaryBtn}>
                    {saving ? "Guardando…" : "Responder"}
                  </button>
                </form>
              )}
            </div>
          )}

          <button onClick={() => setShowHistory(true)} style={historyBtn}>
            <History size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Ver historial
          </button>
        </section>
      </div>

      {showHistory && (
        <div style={overlay} onClick={() => setShowHistory(false)}>
          <aside style={drawer} onClick={(e) => e.stopPropagation()}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Historial de coaching</h2>
              <button onClick={() => setShowHistory(false)} style={closeBtn} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>
            {history.filter((h) => h.answer).length === 0 ? (
              <p style={{ color: "var(--muted)" }}>Todavía no hay respuestas anteriores.</p>
            ) : (
              history
                .filter((h) => h.answer)
                .map((h) => (
                  <article key={h.id} style={histCard}>
                    <div style={{ color: "var(--muted)", fontSize: ".75rem", marginBottom: 6 }}>{h.date}</div>
                    <p style={{ margin: "0 0 6px", fontSize: ".9rem" }}><strong>P:</strong> {h.question}</p>
                    <p style={{ margin: 0, fontSize: ".9rem", color: "var(--muted)" }}>
                      <strong style={{ color: "var(--text)" }}>R:</strong> {h.answer}
                    </p>
                  </article>
                ))
            )}
          </aside>
        </div>
      )}

      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={formCard} onClick={(e) => e.stopPropagation()}>
            <div style={formHeader}>
              <Sparkles size={18} color="#fff" />
              <strong style={{ flex: 1 }}>Tu coaching de hoy</strong>
              <button onClick={() => setShowForm(false)} style={formClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "1.6rem" }}>
              <p style={{ fontSize: "1.12rem", lineHeight: 1.45, margin: "0 0 1.2rem" }}>
                {today?.question ?? "…"}
              </p>
              {answered ? (
                <div style={answeredBox}>
                  <div style={{ color: "var(--muted)", fontSize: ".78rem", marginBottom: 4 }}>
                    Ya respondiste hoy ✓
                  </div>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{today?.answer}</p>
                </div>
              ) : (
                <form onSubmit={onAnswer}>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={4}
                    placeholder="¿Qué hiciste hoy para vender más? ¿Qué estás mejorando?"
                    style={area}
                    autoFocus
                  />
                  <button type="submit" disabled={saving} style={primaryBtn}>
                    {saving ? "Guardando…" : "Responder"}
                  </button>
                </form>
              )}
              <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: 16 }}>
                Así se ve el formulario que abre el link del mail diario.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const card: React.CSSProperties = {
  background: "var(--panel)",
  borderRadius: 14,
  padding: "1.5rem 1.75rem",
};
const cardHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 };
const cardTitle: React.CSSProperties = { margin: 0, fontSize: "1.05rem" };
const skillRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "var(--muted)",
  fontSize: ".9rem",
  padding: "5px 0",
};
const area: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "#0e121a",
  color: "var(--text)",
  fontSize: "1rem",
  marginBottom: 10,
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
const answeredBox: React.CSSProperties = {
  background: "#0e131d",
  borderRadius: 10,
  padding: "12px 14px",
  borderLeft: "3px solid var(--ok)",
};
const historyBtn: React.CSSProperties = {
  marginTop: 18,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: ".88rem",
};
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 50,
};
const drawer: React.CSSProperties = {
  background: "var(--panel)",
  width: "100%",
  maxWidth: 420,
  height: "100%",
  padding: "1.75rem",
  overflowY: "auto",
  boxShadow: "-8px 0 24px rgba(0,0,0,.4)",
};
const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
};
const histCard: React.CSSProperties = {
  background: "#0e131d",
  borderRadius: 10,
  padding: "12px 14px",
  marginBottom: 10,
};
const linkBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#0e131d",
  border: "1px solid #1d2533",
  borderRadius: 8,
  padding: "8px 10px",
  marginTop: 10,
  fontSize: ".8rem",
  color: "var(--muted)",
};
const previewBtn: React.CSSProperties = {
  flexShrink: 0,
  background: "transparent",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  borderRadius: 7,
  padding: "5px 11px",
  fontSize: ".8rem",
  cursor: "pointer",
};
const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 60,
};
const formCard: React.CSSProperties = {
  background: "var(--panel)",
  borderRadius: 16,
  width: "100%",
  maxWidth: 480,
  overflow: "hidden",
  boxShadow: "0 16px 50px rgba(0,0,0,.55)",
};
const formHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 18px",
  background: "linear-gradient(135deg, #5b8cff, #a78bfa)",
  color: "white",
};
const formClose: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  cursor: "pointer",
};
