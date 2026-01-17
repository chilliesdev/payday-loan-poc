export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

export function isValidDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  if (normalized.includes(' ')) return false;
  if (!normalized.includes('.')) return false;
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized);
}

export function isValidPaydayDay(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 28;
}

export function getDomainFromEmail(email: string): string {
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : '';
}
