"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import {
  addNote,
  deleteLead,
  getLead,
  type Activity,
  type LeadDetail,
  type Stage,
} from "@/lib/pipeline";
import {
  approveEmail,
  generateDraft,
  getLeadEmails,
  sendEmail,
  updateEmail,
  type EmailMessage,
} from "@/lib/agents";

const KIND_LABEL: Record<Activity["kind"], string> = {
  stage_change: "Cambio de etapa",
  email_sent: "Mail enviado",
  contact_made: "Contacto",
  note: "Nota",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadDetailView({
  leadId,
  stages,
  onBack,
  onDeleted,
}: {
  leadId: number;
  stages: Stage[];
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [tono, setTono] = useState("cercano y profesional");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Edición / acciones de un mail
  const [editingEmail, setEditingEmail] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const loadEmails = useCallback(() => {
    getLeadEmails(leadId).then(setEmails).catch(() => setEmails([]));
  }, [leadId]);

  const loadLead = useCallback(() => {
    getLead(leadId).then(setLead);
  }, [leadId]);

  useEffect(() => {
    loadLead();
    loadEmails();
  }, [loadLead, loadEmails]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addNote(leadId, note.trim());
      setNote("");
      loadLead();
    } finally {
      setSaving(false);
    }
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!objetivo.trim()) return;
    setGenerating(true);
    try {
      const draft = await generateDraft({ lead: leadId, objetivo, tono });
      setObjetivo("");
      setGenOpen(false);
      loadEmails();
      setExpanded(draft.id);
    } finally {
      setGenerating(false);
    }
  }

  function startEditEmail(m: EmailMessage) {
    setEditingEmail(m.id);
    setEditSubject(m.subject);
    setEditBody(m.body);
  }

  async function saveEmailEdit(id: number) {
    setEmailBusy(true);
    try {
      await updateEmail(id, { subject: editSubject, body: editBody });
      setEditingEmail(null);
      loadEmails();
    } finally {
      setEmailBusy(false);
    }
  }

  async function onApprove(id: number) {
    setEmailBusy(true);
    try {
      await approveEmail(id);
      loadEmails();
    } finally {
      setEmailBusy(false);
    }
  }

  async function onSend(id: number) {
    setEmailBusy(true);
    try {
      await sendEmail(id);
      loadEmails();
      loadLead(); // refleja la actividad "Mail enviado" en el timeline
    } catch {
      alert("No se pudo enviar. ¿Configuraste el correo (SMTP) en Configuración?");
    } finally {
      setEmailBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("¿Eliminar este lead? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      await deleteLead(leadId);
      onDeleted();
    } catch {
      setDeleting(false);
    }
  }

  if (!lead) {
    return <p style={{ color: "var(--muted)" }}>Cargando…</p>;
  }

  const stage = stages.find((s) => s.id === lead.stage);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} style={backBtn}>
            <ArrowLeft size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />
            Tablero
          </button>
          <div>
            <h2 style={{ margin: 0 }}>{lead.name}</h2>
            {lead.company && (
              <span style={{ color: "var(--muted)" }}>{lead.company}</span>
            )}
          </div>
          {stage && (
            <span
              style={{
                fontSize: ".75rem",
                padding: "3px 10px",
                borderRadius: 20,
                border: `1px solid ${stage.color}`,
                color: stage.color,
              }}
            >
              {stage.name}
            </span>
          )}
        </div>
        <button onClick={onDelete} disabled={deleting} style={deleteBtn}>
          <Trash2 size={15} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {deleting ? "Eliminando…" : "Eliminar"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Columna izquierda: contexto + contactos + timeline */}
        <div style={{ flex: "1 1 340px", minWidth: 300 }}>
          <Card>
            <h3 style={sectionTitle}>Contexto del cliente</h3>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              {lead.context || <span style={muted}>Sin contexto cargado.</span>}
            </p>
          </Card>

          <Card>
            <h3 style={sectionTitle}>Contactos</h3>
            {lead.contacts.length === 0 ? (
              <p style={muted}>Sin contactos.</p>
            ) : (
              lead.contacts.map((c) => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <strong>{c.name}</strong>
                  {c.role && <span style={muted}> · {c.role}</span>}
                  <div style={{ ...muted, fontSize: ".85rem" }}>{c.email}</div>
                </div>
              ))
            )}
          </Card>

          <Card>
            <h3 style={sectionTitle}>Timeline</h3>
            <form onSubmit={submitNote} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Agregar nota…"
                style={noteInput}
              />
              <button type="submit" disabled={saving} style={addBtn}>
                +
              </button>
            </form>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {lead.activities.map((a) => (
                <li key={a.id} style={activityRow}>
                  <span style={dot(a.kind)} />
                  <div>
                    <div style={{ fontSize: ".9rem" }}>{a.description}</div>
                    <div style={{ ...muted, fontSize: ".75rem" }}>
                      {KIND_LABEL[a.kind]} · {formatDate(a.created_at)}
                      {a.actor ? ` · ${a.actor}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Columna derecha: mails */}
        <div style={{ flex: "1 1 340px", minWidth: 300 }}>
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ ...sectionTitle, marginTop: 0 }}>Mails</h3>
              <button onClick={() => setGenOpen((o) => !o)} style={genBtn}>
                <Sparkles size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Generar con IA
              </button>
            </div>

            {genOpen && (
              <form onSubmit={onGenerate} style={{ marginBottom: 12 }}>
                <textarea
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Objetivo del mail (ej: agendar una reunión de 20 min)"
                  rows={2}
                  style={genInput}
                  autoFocus
                />
                <input
                  value={tono}
                  onChange={(e) => setTono(e.target.value)}
                  placeholder="Tono"
                  style={{ ...genInput, marginTop: 6 }}
                />
                <button type="submit" disabled={generating} style={genSubmit}>
                  {generating ? "Redactando con IA…" : "Redactar borrador"}
                </button>
              </form>
            )}

            {emails.length === 0 && !genOpen && (
              <p style={muted}>Sin mails. Generá uno con IA.</p>
            )}
            {emails.map((m) => (
              <div key={m.id} style={emailCard}>
                <button
                  onClick={() => setExpanded((e) => (e === m.id ? null : m.id))}
                  style={emailHeader}
                >
                  <span style={statusBadge(m.status)}>{m.status}</span>
                  <span style={{ flex: 1, textAlign: "left" }}>{m.subject}</span>
                </button>
                {expanded === m.id && (
                  <div style={{ padding: "0 12px 12px" }}>
                    {editingEmail === m.id ? (
                      <div>
                        <input
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          style={{ ...genInput, marginBottom: 6 }}
                        />
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={8}
                          style={genInput}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            onClick={() => setEditingEmail(null)}
                            style={ghostSmall}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => saveEmailEdit(m.id)}
                            disabled={emailBusy}
                            style={primarySmall}
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ ...muted, fontSize: ".78rem", marginBottom: 6 }}>
                          Para: {m.to_email || "—"}
                          {m.generated_by ? ` · por ${m.generated_by}` : ""}
                        </div>
                        <p style={{ whiteSpace: "pre-wrap", fontSize: ".88rem", margin: 0 }}>
                          {m.body}
                        </p>
                        {m.rationale && (
                          <p style={{ ...muted, fontSize: ".78rem", marginTop: 8, fontStyle: "italic" }}>
                            💡 {m.rationale}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          {m.status === "borrador" && (
                            <>
                              <button onClick={() => startEditEmail(m)} style={ghostSmall}>
                                Editar
                              </button>
                              <button
                                onClick={() => onApprove(m.id)}
                                disabled={emailBusy}
                                style={primarySmall}
                              >
                                Aprobar
                              </button>
                            </>
                          )}
                          {m.status === "aprobado" && (
                            <button
                              onClick={() => onSend(m.id)}
                              disabled={emailBusy}
                              style={{ ...primarySmall, background: "var(--ok)" }}
                            >
                              {emailBusy ? "Enviando…" : "Enviar"}
                            </button>
                          )}
                          {m.status === "enviado" && (
                            <span style={{ color: "var(--ok)", fontSize: ".85rem" }}>
                              ✓ Enviado
                              {m.sent_at
                                ? ` · ${new Date(m.sent_at).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                                : ""}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

const muted: React.CSSProperties = { color: "var(--muted)" };
const sectionTitle: React.CSSProperties = {
  fontSize: ".75rem",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "var(--muted)",
  marginTop: 0,
};
const backBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
};
const deleteBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #5b2330",
  background: "transparent",
  color: "var(--bad)",
  cursor: "pointer",
};
const noteInput: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "#0e121a",
  color: "var(--text)",
};
const addBtn: React.CSSProperties = {
  padding: "0 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "white",
  fontSize: "1.1rem",
  cursor: "pointer",
};
const activityRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "8px 0",
  borderBottom: "1px solid #1d2533",
};
const genBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  borderRadius: 8,
  padding: "5px 10px",
  fontSize: ".8rem",
  cursor: "pointer",
};
const genInput: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "#0e121a",
  color: "var(--text)",
  fontSize: ".9rem",
};
const genSubmit: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  padding: "9px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
const ghostSmall: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: ".85rem",
};
const primarySmall: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: ".85rem",
};
const emailCard: React.CSSProperties = {
  background: "#0e131d",
  border: "1px solid #232c3b",
  borderRadius: 10,
  marginBottom: 8,
};
const emailHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  background: "transparent",
  border: "none",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: ".9rem",
};
function statusBadge(status: EmailMessage["status"]): React.CSSProperties {
  const color =
    status === "enviado"
      ? "var(--ok)"
      : status === "aprobado"
        ? "var(--accent)"
        : "#f59e0b";
  return {
    fontSize: ".68rem",
    padding: "2px 8px",
    borderRadius: 20,
    border: `1px solid ${color}`,
    color,
    flexShrink: 0,
    textTransform: "uppercase",
  };
}
function dot(kind: Activity["kind"]): React.CSSProperties {
  const color =
    kind === "stage_change"
      ? "var(--accent)"
      : kind === "email_sent"
        ? "var(--ok)"
        : "#475067";
  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    marginTop: 6,
    flexShrink: 0,
  };
}
