// Edición de la empresa y de la cuenta del usuario.
import { apiFetch } from "./api";
import type { NorthMetric, Organization } from "./auth";

export function updateOrg(input: {
  name?: string;
  objective?: string;
  default_north_metric?: NorthMetric;
  coach_instructions?: string;
}): Promise<Organization> {
  return apiFetch<Organization>("/api/orgs/me/", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateMe(input: {
  email?: string;
  password?: string;
}): Promise<unknown> {
  return apiFetch("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
