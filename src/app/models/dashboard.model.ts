// Doit rester synchronisé avec amisache-backend : src/dashboard/dashboard.service.ts

/** GET /dashboard/stats — plateforme (admin/engineer) ou une église (?churchId=). */
export interface DashboardStats {
  pendingRequests: number;
  inProgressRequests: number;
  pendingPayments: number;
  publishedPublications: number;
  /** null quand les chiffres portent sur une seule église. */
  churches: number | null;
  pendingChurches: number | null;
}
