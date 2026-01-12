export function readNonEmptyString(v: any, field: string, errors: string[]) {
  const s = typeof v === "string" ? v.trim() : ""
  if (!s) errors.push(`${field} must be a non-empty string`)
  return s
}
