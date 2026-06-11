"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createKnowledge,
  deleteKnowledge,
  getKnowledge,
  updateKnowledge,
  DOC_TYPE_LABELS,
  type DocType,
  type KnowledgeDoc,
} from "@/lib/agents";
import { ErrorText, Field, PrimaryButton, inputProps } from "@/components/ui";

export function KnowledgeView() {
  const [docs, setDocs] = useState<KnowledgeDoc[] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("producto");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getKnowledge().then(setDocs).catch(() => setDocs([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresca mientras haya documentos indexándose.
  useEffect(() => {
    if (!docs?.some((d) => !d.is_indexed)) return;
    const t = setTimeout(load, 2500);
    return () => clearTimeout(t);
  }, [docs, load]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDocType("producto");
    setContent("");
    setError("");
  }

  function startEdit(doc: KnowledgeDoc) {
    setEditingId(doc.id);
    setTitle(doc.title);
    setDocType(doc.doc_type);
    setContent(doc.content);
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setError("");
    setSaving(true);
    try {
      if (editingId !== null) {
        await updateKnowledge(editingId, { title, content, doc_type: docType });
      } else {
        await createKnowledge({ title, content, doc_type: docType });
      }
      resetForm();
      load();
    } catch {
      setError("No se pudo guardar el documento.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar este documento del conocimiento?")) return;
    if (editingId === id) resetForm();
    await deleteKnowledge(id);
    load();
  }

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      <section style={{ flex: "1 1 320px", maxWidth: 460 }}>
        <h2 style={{ marginTop: 0 }}>
          {editingId !== null ? "Editar documento" : "Agregar conocimiento"}
        </h2>
        <p style={{ color: "var(--muted)", marginTop: -8, fontSize: ".9rem" }}>
          Lo que cargues aquí alimenta al agente Redactor (RAG) para fundamentar los mails.
        </p>
        <form onSubmit={onSubmit}>
          <ErrorText>{error}</ErrorText>
          <Field label="Título">
            <input
              {...inputProps()}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field label="Tipo">
            <select
              {...inputProps()}
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
            >
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contenido">
            <textarea
              {...inputProps()}
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe el producto, un caso de éxito, un mail que funcionó, cómo responder una objeción…"
              required
            />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            {editingId !== null && (
              <button type="button" onClick={resetForm} style={cancelBtn}>
                Cancelar
              </button>
            )}
            <PrimaryButton disabled={saving}>
              {saving
                ? "Guardando…"
                : editingId !== null
                  ? "Actualizar"
                  : "Guardar e indexar"}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section style={{ flex: "1 1 320px" }}>
        <h2 style={{ marginTop: 0 }}>Base de conocimiento</h2>
        {docs === null ? (
          <p style={{ color: "var(--muted)" }}>Cargando…</p>
        ) : docs.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Aún no hay documentos.</p>
        ) : (
          docs.map((d) => (
            <article
              key={d.id}
              style={{
                background: "var(--panel)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 10,
                outline: editingId === d.id ? "1px solid var(--accent)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <button
                  onClick={() =>
                    setExpandedId((id) => (id === d.id ? null : d.id))
                  }
                  style={titleBtn}
                >
                  {d.title}
                </button>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => startEdit(d)} title="Editar" style={iconBtn}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => onDelete(d.id)} title="Eliminar" style={iconBtn}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <span style={tag}>{DOC_TYPE_LABELS[d.doc_type]}</span>
                <span
                  style={{
                    ...tag,
                    color: d.is_indexed ? "var(--ok)" : "var(--muted)",
                    borderColor: d.is_indexed ? "var(--ok)" : "#2a3140",
                  }}
                >
                  {d.is_indexed ? "● indexado" : "○ indexando…"}
                </span>
              </div>
              {expandedId === d.id && (
                <p
                  style={{
                    marginTop: 10,
                    fontSize: ".88rem",
                    color: "var(--text)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {d.content}
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}

const tag: React.CSSProperties = {
  fontSize: ".72rem",
  padding: "2px 8px",
  borderRadius: 20,
  border: "1px solid #2a3140",
  color: "var(--muted)",
};
const titleBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: "1rem",
  cursor: "pointer",
  textAlign: "left",
  padding: 0,
};
const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  padding: 2,
};
const cancelBtn: React.CSSProperties = {
  flex: 1,
  padding: "11px 12px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
};
