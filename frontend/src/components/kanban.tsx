"use client";

import { useState, type CSSProperties } from "react";
import type { BoardStage } from "@/lib/pipeline";

const columnStyle: CSSProperties = {
  minWidth: 270,
  width: 270,
  borderRadius: 12,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  alignSelf: "flex-start",
};

export function Board({
  board,
  onCardClick,
  onMove,
}: {
  board: BoardStage[];
  onCardClick: (leadId: number) => void;
  onMove: (leadId: number, stageId: number) => void;
}) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12 }}>
      {board.map((stage) => (
        <section
          key={stage.id}
          onDragOver={(e) => {
            e.preventDefault();
            setOverStage(stage.id);
          }}
          onDragLeave={() =>
            setOverStage((s) => (s === stage.id ? null : s))
          }
          onDrop={(e) => {
            e.preventDefault();
            if (dragId != null) onMove(dragId, stage.id);
            setDragId(null);
            setOverStage(null);
          }}
          style={{
            ...columnStyle,
            background: overStage === stage.id ? "#1b2433" : "var(--panel)",
            borderTop: `3px solid ${stage.color}`,
            outline:
              overStage === stage.id ? `1px dashed ${stage.color}` : "none",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: ".8rem",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              fontWeight: 600,
              color: stage.color,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: stage.color,
                }}
              />
              {stage.name}
            </span>
            <span
              style={{
                background: "#0e131d",
                borderRadius: 10,
                padding: "1px 8px",
                color: "var(--muted)",
              }}
            >
              {stage.leads.length}
            </span>
          </header>

          {stage.leads.map((lead) => (
            <article
              key={lead.id}
              draggable
              onDragStart={() => setDragId(lead.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverStage(null);
              }}
              onClick={() => onCardClick(lead.id)}
              style={{
                background: "#0e131d",
                border: "1px solid #232c3b",
                borderLeft: `3px solid ${stage.color}`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "grab",
                opacity: dragId === lead.id ? 0.4 : 1,
              }}
            >
              <strong style={{ display: "block" }}>{lead.name}</strong>
              {lead.company && (
                <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>
                  {lead.company}
                </span>
              )}
            </article>
          ))}

          {stage.leads.length === 0 && (
            <p style={{ color: "#475067", fontSize: ".85rem", margin: "4px 0" }}>
              Arrastra leads aquí
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
