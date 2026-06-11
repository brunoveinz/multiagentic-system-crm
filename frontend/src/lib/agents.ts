// Tipos y llamadas a la API de IA (conocimiento RAG + agente Redactor).
import { apiFetch } from "./api";

export type DocType =
  | "producto"
  | "caso_exito"
  | "mail_ganador"
  | "objecion"
  | "otro";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  producto: "Producto / servicio",
  caso_exito: "Caso de éxito",
  mail_ganador: "Mail ganador",
  objecion: "Manejo de objeción",
  otro: "Otro",
};

export interface KnowledgeDoc {
  id: number;
  title: string;
  content: string;
  doc_type: DocType;
  is_indexed: boolean;
  created_at: string;
}

export type EmailStatus = "borrador" | "aprobado" | "enviado";

export interface EmailMessage {
  id: number;
  lead: number | null;
  to_email: string;
  subject: string;
  body: string;
  status: EmailStatus;
  generated_by: string;
  rationale: string;
  gmail_message_id: string;
  sent_at: string | null;
  created_at: string;
}

export function getKnowledge(): Promise<KnowledgeDoc[]> {
  return apiFetch<KnowledgeDoc[]>("/api/agents/knowledge/");
}

export function createKnowledge(input: {
  title: string;
  content: string;
  doc_type: DocType;
}): Promise<KnowledgeDoc> {
  return apiFetch<KnowledgeDoc>("/api/agents/knowledge/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateKnowledge(
  id: number,
  input: { title: string; content: string; doc_type: DocType },
): Promise<KnowledgeDoc> {
  return apiFetch<KnowledgeDoc>(`/api/agents/knowledge/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteKnowledge(id: number): Promise<null> {
  return apiFetch<null>(`/api/agents/knowledge/${id}/`, { method: "DELETE" });
}

export function getLeadEmails(leadId: number): Promise<EmailMessage[]> {
  return apiFetch<EmailMessage[]>(`/api/emails/?lead=${leadId}`);
}

export function generateDraft(input: {
  lead: number;
  objetivo: string;
  tono: string;
}): Promise<EmailMessage> {
  return apiFetch<EmailMessage>("/api/agents/draft/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Mails: editar / aprobar / enviar (Fase 5) ---

export function updateEmail(
  id: number,
  input: { subject?: string; body?: string; to_email?: string },
): Promise<EmailMessage> {
  return apiFetch<EmailMessage>(`/api/emails/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function approveEmail(id: number): Promise<EmailMessage> {
  return apiFetch<EmailMessage>(`/api/emails/${id}/approve/`, { method: "POST" });
}

export function sendEmail(id: number): Promise<EmailMessage> {
  return apiFetch<EmailMessage>(`/api/emails/${id}/send/`, { method: "POST" });
}

// --- Conexión de Gmail por empresa ---

export interface EmailAccountConfig {
  configured: boolean;
  host?: string;
  port?: number;
  username?: string;
  from_email?: string;
  from_name?: string;
  use_tls?: boolean;
}

export interface EmailAccountInput {
  host: string;
  port: number;
  username: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  password?: string;
}

export function getEmailAccount(): Promise<EmailAccountConfig> {
  return apiFetch<EmailAccountConfig>("/api/accounts/email/");
}

export function saveEmailAccount(
  input: EmailAccountInput,
): Promise<{ configured: boolean; from_email: string; warning?: string }> {
  return apiFetch("/api/accounts/email/", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// --- Coach + Seguimiento (Fase 6) ---

export interface CoachLog {
  id: number;
  date: string;
  question: string;
  answer: string;
  is_indexed: boolean;
}

export function getCoachToday(): Promise<CoachLog> {
  return apiFetch<CoachLog>("/api/agents/coach/today/");
}

export function answerCoach(answer: string): Promise<CoachLog> {
  return apiFetch<CoachLog>("/api/agents/coach/answer/", {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export function getCoachHistory(): Promise<CoachLog[]> {
  return apiFetch<CoachLog[]>("/api/agents/coach/history/");
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function getChatHistory(): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>("/api/agents/coach/chat/");
}

export function coachChat(message: string): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>("/api/agents/coach/chat/", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export interface Followup {
  id: number;
  name: string;
  company: string;
  stage: string;
  days: number;
}

export function getFollowups(): Promise<Followup[]> {
  return apiFetch<Followup[]>("/api/agents/followups/");
}
