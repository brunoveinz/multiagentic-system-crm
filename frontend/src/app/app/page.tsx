"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  getBoard,
  moveLead,
  type BoardStage,
  type LeadCard,
  type Stage,
} from "@/lib/pipeline";
import { Menu, Plus } from "lucide-react";
import { Board } from "@/components/kanban";
import { NewLeadModal } from "@/components/newLeadModal";
import { LeadDetailView } from "@/components/leadDetailView";
import { Sidebar, type AppView } from "@/components/sidebar";
import { MetricsView } from "@/components/metricsView";
import { ConfigView } from "@/components/configView";
import { KnowledgeView } from "@/components/knowledgeView";
import { CoachView } from "@/components/coachView";
import { FloatingChat } from "@/components/floatingChat";

const VIEW_TITLE: Record<AppView, string> = {
  board: "Tablero",
  metrics: "Métricas",
  coach: "Coach",
  knowledge: "Conocimiento",
  config: "Configuración",
};

export default function AppHome() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [board, setBoard] = useState<BoardStage[] | null>(null);
  const [view, setView] = useState<AppView>("board");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);

  // Apertura directa del Coach desde el link del mail diario.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "coach") {
      setView("coach");
      window.history.replaceState({}, "", "/app");
    }
  }, []);

  const loadBoard = useCallback(() => {
    getBoard().then(setBoard).catch(() => setBoard([]));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
    else if (!user.organization) router.replace("/onboarding");
    else loadBoard();
  }, [loading, user, router, loadBoard]);

  // Sidebar abierto por defecto en desktop, cerrado en mobile.
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 820);
  }, []);

  function handleMove(leadId: number, stageId: number) {
    const current = board?.find((c) => c.leads.some((l) => l.id === leadId));
    if (!current || current.id === stageId) return;

    setBoard((prev) => {
      if (!prev) return prev;
      let moving: LeadCard | undefined;
      const stripped = prev.map((col) => {
        const found = col.leads.find((l) => l.id === leadId);
        if (found) {
          moving = { ...found, stage: stageId };
          return { ...col, leads: col.leads.filter((l) => l.id !== leadId) };
        }
        return col;
      });
      if (!moving) return prev;
      return stripped.map((col) =>
        col.id === stageId ? { ...col, leads: [moving!, ...col.leads] } : col,
      );
    });
    moveLead(leadId, stageId).catch(loadBoard);
  }

  function navigate(v: AppView) {
    setView(v);
    if (window.innerWidth < 820) setSidebarOpen(false);
  }

  if (loading || !user || !user.organization || board === null) {
    return <main style={{ padding: "2rem", color: "var(--muted)" }}>Cargando…</main>;
  }

  const org = user.organization;
  const stages: Stage[] = board.map(({ leads: _leads, ...s }) => s);

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        active={view}
        orgName={org.name}
        onNavigate={navigate}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />

      <main className="app-main">
        {selectedLead !== null ? (
          <LeadDetailView
            leadId={selectedLead}
            stages={stages}
            onBack={() => setSelectedLead(null)}
            onDeleted={() => {
              setSelectedLead(null);
              loadBoard();
            }}
          />
        ) : (
          <>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setSidebarOpen((o) => !o)}
                  aria-label="Menú"
                  style={iconBtn}
                >
                  <Menu size={18} />
                </button>
                <h1 style={{ margin: 0, fontSize: "1.4rem" }}>{VIEW_TITLE[view]}</h1>
              </div>
              {view === "board" && (
                <button onClick={() => setShowNew(true)} style={primaryBtn}>
                  <Plus size={16} style={{ marginRight: 6, verticalAlign: "-3px" }} />
                  Nuevo lead
                </button>
              )}
            </header>

            {view === "board" && (
              <Board board={board} onCardClick={setSelectedLead} onMove={handleMove} />
            )}
            {view === "metrics" && (
              <MetricsView northMetric={org.default_north_metric} />
            )}
            {view === "coach" && <CoachView />}
            {view === "knowledge" && <KnowledgeView />}
            {view === "config" && (
              <ConfigView user={user} org={org} onLogout={logout} />
            )}
          </>
        )}
      </main>

      {showNew && (
        <NewLeadModal
          stages={stages}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            loadBoard();
          }}
        />
      )}

      <FloatingChat />
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
const iconBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: "1.1rem",
};
