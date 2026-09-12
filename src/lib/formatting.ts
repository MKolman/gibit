export function formatScore(val: number | null | undefined): string {
  if (val === null || val === undefined) return '/';
  return val.toFixed(2);
}

export function formatRaw(val: number | null | undefined): string {
  if (val === null || val === undefined) return '/';
  return String(val);
}

export function exerciseText(
  raw: number | null | undefined,
  norm: number | null | undefined
): string {
  const r = formatRaw(raw);
  if (raw === null || raw === undefined || norm === null || norm === undefined) return r;
  return `${r} (${formatScore(norm)})`;
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}