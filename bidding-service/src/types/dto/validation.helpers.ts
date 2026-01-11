export function readNonEmptyString(v: any, field: string, errors: string[]) {
  const s = typeof v === "string" ? v.trim() : ""
  if (!s) errors.push(`${field} must be a non-empty string`)
  return s
}

export function readNumber(v: any, field: string, errors: string[], opts?: {min?: number}) {
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n)) errors.push(`${field} must be a number`)
  else if (opts?.min !== undefined && n < opts.min) errors.push(`${field} must be >= ${opts.min}`)
  return n
}

export function hasProp(obj: any, key: string) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key)
}
