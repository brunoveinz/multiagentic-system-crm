// Tipos y llamadas a la API del pipeline (Kanban).
import { apiFetch } from "./api";

export interface Stage {
  id: number;
  name: string;
  order: number;
  is_won: boolean;
  color: string;
}

export interface LeadCard {
  id: number;
  name: string;
  company: string;
  context: string;
  stage: number;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
}

export interface Activity {
  id: number;
  kind: "stage_change" | "email_sent" | "contact_made" | "note";
  description: string;
  actor: string | null;
  created_at: string;
}

export interface LeadDetail extends LeadCard {
  owner: string | null;
  contacts: Contact[];
  activities: Activity[];
}

export interface BoardStage extends Stage {
  leads: LeadCard[];
}

export interface NewLeadInput {
  name: string;
  company: string;
  stage: number;
  context: string;
  contact?: { name: string; email: string; role: string };
}

export function getBoard(): Promise<BoardStage[]> {
  return apiFetch<BoardStage[]>("/api/pipeline/leads/board/");
}

export function getLead(id: number): Promise<LeadDetail> {
  return apiFetch<LeadDetail>(`/api/pipeline/leads/${id}/`);
}

export function createLead(input: NewLeadInput): Promise<LeadCard> {
  const { contact, ...rest } = input;
  return apiFetch<LeadCard>("/api/pipeline/leads/", {
    method: "POST",
    body: JSON.stringify({
      ...rest,
      contacts: contact && contact.name ? [contact] : [],
    }),
  });
}

export function moveLead(id: number, stage: number): Promise<LeadCard> {
  return apiFetch<LeadCard>(`/api/pipeline/leads/${id}/move/`, {
    method: "POST",
    body: JSON.stringify({ stage }),
  });
}

export function addNote(id: number, description: string): Promise<Activity> {
  return apiFetch<Activity>(`/api/pipeline/leads/${id}/note/`, {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

export function deleteLead(id: number): Promise<null> {
  return apiFetch<null>(`/api/pipeline/leads/${id}/`, { method: "DELETE" });
}
