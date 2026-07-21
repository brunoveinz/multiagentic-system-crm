"use client";

// Prospección en mapa: el vendedor describe lo que busca, el agente lo interpreta
// y OpenStreetMap muestra los negocios. Desde acá se agregan como leads.
//
// Leaflet se importa dinámicamente (usa `window`, rompería en SSR) y dibujamos
// los negocios como circleMarkers para no depender de los assets de íconos.
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Globe, MapPin, Phone, Plus, Search } from "lucide-react";
import type { Map as LeafletMap, CircleMarker, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  prospect,
  importProspect,
  type ProspectCandidate,
  type ProspectResult,
} from "@/lib/prospect";
import { formatApiError } from "@/lib/api";

const EXAMPLES = [
  "Clínicas dentales en Providencia",
  "Restaurantes en Las Condes",
  "Ferreterías en Maipú",
  "Hoteles en Valparaíso",
];

const LOADING_PHASES = [
  "Interpretando tu búsqueda…",
  "Ubicando la zona en el mapa…",
  "Buscando negocios cercanos…",
];

const PIN = { radius: 8, color: "#5b8cff", weight: 2, fillColor: "#5b8cff", fillOpacity: 0.55 };
const PIN_ADDED = { ...PIN, color: "#3fb950", fillColor: "#3fb950" };

export function ProspectView() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProspectResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const markersRef = useRef<Record<number, CircleMarker>>({});

  // Limpia el mapa al desmontar la vista.
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Mensajes que van rotando mientras se busca (da sensación de progreso real:
  // primero el agente interpreta, luego se consulta el mapa).
  useEffect(() => {
    if (!loading) {
      setPhase(0);
      return;
    }
    const t = setInterval(() => setPhase((p) => (p + 1) % LOADING_PHASES.length), 1600);
    return () => clearInterval(t);
  }, [loading]);

  const runSearch = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSelected(null);
    setAdded(new Set());
    try {
      const res = await prospect(q);
      setResult(res);
      if (res.candidates.length === 0) {
        setError(
          res.center
            ? "No encontré negocios de ese tipo en esa zona. Prueba otro rubro o lugar."
            : "No pude ubicar ese lugar. Sé más específico (incluye ciudad).",
        );
      }
    } catch (err) {
      setError(formatApiError(err, "No se pudo completar la búsqueda."));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // (Re)dibuja el mapa cada vez que llegan resultados nuevos.
  useEffect(() => {
    if (!result?.center || !mapDivRef.current) return;
    let cancelled = false;

    (async () => {
      if (!LRef.current) {
        const mod = await import("leaflet");
        LRef.current = mod.default ?? mod;
      }
      if (cancelled || !mapDivRef.current) return;
      const L = LRef.current;

      if (!mapRef.current) {
        mapRef.current = L.map(mapDivRef.current).setView(result.center!, 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current!);
        layerRef.current = L.layerGroup().addTo(mapRef.current!);
      }

      layerRef.current!.clearLayers();
      markersRef.current = {};
      const points: [number, number][] = [];

      result.candidates.forEach((c, i) => {
        const marker: CircleMarker = L.circleMarker([c.lat, c.lon], PIN)
          .addTo(layerRef.current!)
          .bindPopup(popupHtml(c));
        marker.on("click", () => setSelected(i));
        markersRef.current[i] = marker;
        points.push([c.lat, c.lon]);
      });

      if (points.length) {
        mapRef.current!.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
      } else {
        mapRef.current!.setView(result.center!, 13);
      }
      // El contenedor puede haber cambiado de tamaño mientras cargaba.
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
    };
  }, [result]);

  function focusCandidate(i: number) {
    setSelected(i);
    const c = result?.candidates[i];
    const marker = markersRef.current[i];
    if (c && marker && mapRef.current) {
      mapRef.current.setView([c.lat, c.lon], 17, { animate: true });
      marker.openPopup();
    }
  }

  async function onAdd(i: number) {
    const c = result?.candidates[i];
    if (!c) return;
    setAddingIdx(i);
    try {
      await importProspect(c);
      setAdded((prev) => new Set(prev).add(i));
      markersRef.current[i]?.setStyle(PIN_ADDED);
    } catch (err) {
      setError(formatApiError(err, "No se pudo agregar el lead."));
    } finally {
      setAddingIdx(null);
    }
  }

  const candidates = result?.candidates ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Buscador */}
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <div style={{ position: "relative", flex: "1 1 320px" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dime qué buscas… ej: clínicas dentales en Providencia"
              style={{
                width: "100%",
                padding: "11px 12px 11px 38px",
                borderRadius: 8,
                border: "1px solid #2a3140",
                background: "#0e121a",
                color: "var(--text)",
                fontSize: "1rem",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              padding: "11px 20px",
              borderRadius: 8,
              border: "none",
              background: loading || !query.trim() ? "#33405e" : "var(--accent)",
              color: "white",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading || !query.trim() ? "default" : "pointer",
            }}
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                runSearch(ex);
              }}
              style={chip}
            >
              {ex}
            </button>
          ))}
        </div>

        {result?.label && !error && (
          <p style={{ color: "var(--muted)", margin: "12px 0 0", fontSize: ".9rem" }}>
            Mostrando <strong style={{ color: "var(--text)" }}>{result.label}</strong> en{" "}
            {result.location} · {candidates.length} resultado
            {candidates.length === 1 ? "" : "s"}
          </p>
        )}
        {error && (
          <p style={{ color: "var(--bad)", margin: "12px 0 0", fontSize: ".9rem" }}>{error}</p>
        )}
      </div>

      {/* Mapa + lista */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch", flex: 1 }}>
        <div
          style={{
            position: "relative",
            flex: "1 1 380px",
            minHeight: 460,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #2a3140",
            background: "var(--panel)",
          }}
        >
          {result ? (
            <div ref={mapDivRef} style={{ width: "100%", height: "100%", minHeight: 460 }} />
          ) : (
            <div
              style={{
                height: "100%",
                minHeight: 460,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
                gap: 10,
                textAlign: "center",
                padding: 24,
              }}
            >
              <MapPin size={40} strokeWidth={1.4} />
              <p style={{ maxWidth: 320, margin: 0 }}>
                Describe qué tipo de negocios quieres prospectar y aparecerán en el mapa
                para agregarlos como leads.
              </p>
            </div>
          )}

          {/* Overlay de carga: no desmonta el mapa (lo cubre), así no se pierde
              la instancia de Leaflet entre búsquedas. */}
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(10,13,20,0.72)",
                backdropFilter: "blur(2px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                zIndex: 500,
              }}
            >
              <div className="spinner" />
              <p style={{ color: "var(--text)", margin: 0, fontWeight: 600 }}>
                {LOADING_PHASES[phase]}
              </p>
            </div>
          )}
        </div>

        {loading && candidates.length === 0 && (
          <div style={{ flex: "1 1 300px", maxWidth: 420, display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 96 }} />
            ))}
          </div>
        )}

        {!loading && candidates.length > 0 && (
          <div
            style={{
              flex: "1 1 300px",
              maxWidth: 420,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 560,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {candidates.map((c, i) => {
              const isAdded = added.has(i) || c.already_lead;
              return (
                <article
                  key={`${c.name}-${i}`}
                  onMouseEnter={() => setSelected(i)}
                  style={{
                    background: "var(--panel)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    outline: selected === i ? "1px solid var(--accent)" : "none",
                    cursor: "pointer",
                  }}
                  onClick={() => focusCandidate(i)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{c.name}</span>
                    {c.category && <span style={chip}>{c.category}</span>}
                  </div>
                  {c.address && (
                    <p style={metaLine}>
                      <MapPin size={13} /> {c.address}
                    </p>
                  )}
                  {c.phone && (
                    <p style={metaLine}>
                      <Phone size={13} /> {c.phone}
                    </p>
                  )}
                  {c.website && (
                    <p style={metaLine}>
                      <Globe size={13} />{" "}
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "var(--accent)", textDecoration: "none" }}
                      >
                        {prettyUrl(c.website)}
                      </a>
                    </p>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAdded) onAdd(i);
                    }}
                    disabled={isAdded || addingIdx === i}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: isAdded ? "transparent" : "var(--accent)",
                      color: isAdded ? "var(--ok)" : "white",
                      fontWeight: 600,
                      fontSize: ".9rem",
                      cursor: isAdded ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      outline: isAdded ? "1px solid var(--ok)" : "none",
                    }}
                  >
                    {isAdded ? (
                      <>
                        <Check size={15} /> En el pipeline
                      </>
                    ) : addingIdx === i ? (
                      <>
                        <span
                          className="spinner"
                          style={{ width: 14, height: 14, borderWidth: 2 }}
                        />
                        Buscando contacto…
                      </>
                    ) : (
                      <>
                        <Plus size={15} /> Agregar como lead
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function popupHtml(c: ProspectCandidate): string {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]!));
  const lines = [`<strong>${esc(c.name)}</strong>`];
  if (c.address) lines.push(esc(c.address));
  if (c.phone) lines.push(esc(c.phone));
  return `<div style="font-size:13px;line-height:1.4">${lines.join("<br/>")}</div>`;
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const chip: React.CSSProperties = {
  fontSize: ".72rem",
  padding: "3px 9px",
  borderRadius: 20,
  border: "1px solid #2a3140",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const metaLine: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  margin: "6px 0 0",
  fontSize: ".85rem",
  color: "var(--muted)",
};
