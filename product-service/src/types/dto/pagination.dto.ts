export type PaginationDTO = { page: number, limit: number }

function toInt(v: any) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isInteger(n) ? n : NaN
}

export function validatePagination(q: any): {value?: PaginationDTO, errors?: string[]} {
  const errors: string[] = []
  const page = toInt(q?.page ?? 1)
  const limit = toInt(q?.limit ?? 10)
  if (!Number.isInteger(page) || page < 1) errors.push("page must be integer >= 1")
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.push("limit must be integer between 1 and 100")
  if (errors.length) return {errors}
  return {value: {page, limit}}
}

