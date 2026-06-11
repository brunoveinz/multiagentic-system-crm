"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { coachChat, getChatHistory } from "@/lib/agents";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !loaded) {
      getChatHistory()
        .then((h) => setMessages(h.map((m) => ({ role: m.role, content: m.content }))))
        .catch(() => {})
        .finally(() => setLoaded(true));
    }
  }, [open, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await coachChat(text);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Tuve un problema. Reintentá." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={fab} aria-label="Hablar con el coach">
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div style={panel}>
      <header style={header}>
        <strong>Coach de ventas</strong>
        <button onClick={() => setOpen(false)} style={closeBtn} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>

      <div style={log}>
        {!loaded ? (
          <p style={hint}>Cargando…</p>
        ) : messages.length === 0 ? (
          <p style={hint}>Pedile consejo: “¿cómo cierro este negocio?”, “¿qué le respondo?”…</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}
            >
              <span style={m.role === "user" ? bubbleUser : bubbleAI}>{m.content}</span>
            </div>
          ))
        )}
        {loading && <p style={hint}>El coach está pensando…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} style={inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribile…"
          style={textInput}
          autoFocus
        />
        <button type="submit" disabled={loading} style={sendBtn}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

const fab: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  width: 56,
  height: 56,
  borderRadius: "50%",
  border: "none",
  background: "linear-gradient(135deg, #5b8cff, #a78bfa)",
  color: "white",
  cursor: "pointer",
  boxShadow: "0 6px 20px rgba(91,140,255,.4)",
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const panel: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  width: "min(380px, calc(100vw - 32px))",
  height: "min(560px, calc(100vh - 48px))",
  background: "var(--panel)",
  border: "1px solid #232c3b",
  borderRadius: 16,
  boxShadow: "0 12px 40px rgba(0,0,0,.5)",
  display: "flex",
  flexDirection: "column",
  zIndex: 60,
  overflow: "hidden",
};
const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 16px",
  borderBottom: "1px solid #1d2533",
  background: "linear-gradient(135deg, #161b2e, #1b1530)",
};
const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
};
const log: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
};
const hint: React.CSSProperties = { color: "var(--muted)", margin: 0, fontSize: ".9rem" };
const bubbleBase: React.CSSProperties = {
  maxWidth: "82%",
  padding: "9px 13px",
  borderRadius: 14,
  fontSize: ".9rem",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
};
const bubbleUser: React.CSSProperties = {
  ...bubbleBase,
  background: "var(--accent)",
  color: "white",
  borderBottomRightRadius: 4,
};
const bubbleAI: React.CSSProperties = {
  ...bubbleBase,
  background: "#0e131d",
  border: "1px solid #232c3b",
  borderBottomLeftRadius: 4,
};
const inputRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: 12,
  borderTop: "1px solid #1d2533",
};
const textInput: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "#0e121a",
  color: "var(--text)",
};
const sendBtn: React.CSSProperties = {
  padding: "0 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "white",
  cursor: "pointer",
};
