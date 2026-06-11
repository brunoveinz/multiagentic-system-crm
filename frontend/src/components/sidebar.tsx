"use client";

import {
  BarChart3,
  BookOpen,
  KanbanSquare,
  LogOut,
  MessageCircleHeart,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type AppView = "board" | "metrics" | "coach" | "knowledge" | "config";

const ITEMS: { key: AppView; label: string; Icon: LucideIcon }[] = [
  { key: "board", label: "Tablero", Icon: KanbanSquare },
  { key: "metrics", label: "Métricas", Icon: BarChart3 },
  { key: "coach", label: "Coach", Icon: MessageCircleHeart },
  { key: "knowledge", label: "Conocimiento", Icon: BookOpen },
  { key: "config", label: "Configuración", Icon: Settings },
];

export function Sidebar({
  open,
  active,
  orgName,
  onNavigate,
  onClose,
  onLogout,
}: {
  open: boolean;
  active: AppView;
  orgName: string;
  onNavigate: (view: AppView) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <aside className={`sidebar ${open ? "" : "collapsed"}`}>
        <div className="brand">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "linear-gradient(135deg, #5b8cff, #a78bfa)",
              flexShrink: 0,
            }}
          >
            <Zap size={17} color="#fff" />
          </span>
          <span className="brand-text">{orgName}</span>
        </div>

        {ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`nav-item ${active === key ? "active" : ""}`}
            onClick={() => onNavigate(key)}
            title={label}
          >
            <span className="nav-icon">
              <Icon size={18} />
            </span>
            <span className="label">{label}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button className="nav-item" onClick={onLogout} title="Salir">
          <span className="nav-icon">
            <LogOut size={18} />
          </span>
          <span className="label">Salir</span>
        </button>
      </aside>
      <div
        className={`sidebar-backdrop ${open ? "show" : ""}`}
        onClick={onClose}
      />
    </>
  );
}
