// Tipos y llamadas a la API de prospección en mapa (OpenStreetMap).
import { apiFetch } from "./api";
import type { LeadCard } from "./pipeline";

export interface ProspectCandidate {
  name: string;
  lat: number;
  lon: number;
  address: string;
  phone: string;
  website: string;
  category: string;
  already_lead: boolean;
}

export interface ProspectResult {
  label: string;
  location: string;
  center: [number, number] | null;
  bbox: number[] | null; // [south, north, west, east]
  candidates: ProspectCandidate[];
}

/** Texto libre -> el agente lo interpreta -> negocios en el mapa. */
export function prospect(query: string): Promise<ProspectResult> {
  return apiFetch<ProspectResult>("/api/pipeline/leads/prospect/", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

/** Convierte un candidato del mapa en un lead del pipeline. */
export function importProspect(c: ProspectCandidate): Promise<LeadCard> {
  return apiFetch<LeadCard>("/api/pipeline/leads/import_prospect/", {
    method: "POST",
    body: JSON.stringify({
      name: c.name,
      company: c.name,
      address: c.address,
      latitude: c.lat,
      longitude: c.lon,
      phone: c.phone,
      website: c.website,
      category: c.category,
    }),
  });
}
