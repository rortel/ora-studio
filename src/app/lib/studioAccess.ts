export function hasStudioAccess(subscription?: string | null) {
  const plan = (subscription || "").trim().toLowerCase();
  if (!plan) return false;
  return plan.includes("studio") || plan.includes("enterprise");
}

