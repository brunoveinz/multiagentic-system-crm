// Dashboard de métricas de la empresa.
import { apiFetch } from "./api";

export interface StageMetric {
  id: number;
  name: string;
  color: string;
  is_won: boolean;
  count: number;
}

export interface Dashboard {
  total_leads: number;
  won: number;
  conversion: number;
  mails_sent: number;
  mails_pending: number;
  needs_followup: number;
  by_stage: StageMetric[];
}

export function getDashboard(): Promise<Dashboard> {
  return apiFetch<Dashboard>("/api/metrics/dashboard/");
}
