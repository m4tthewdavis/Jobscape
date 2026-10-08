/** Strips characters that carry meaning in PostgREST filter syntax and ilike wildcards from user search input */
export function sanitizeSearch(value) {
  return String(value ?? '').replace(/[,()%*_\\"]/g, ' ').replace(/\s+/g, ' ').trim()
}
