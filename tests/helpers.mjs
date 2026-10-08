process.env.ATS_NO_PACING = '1'

/** Replaces global fetch with a route table: { 'url substring': { status?, body? } | Error }. Returns call log. */
export function mockFetch(routes) {
  const calls = []
  globalThis.fetch = async (url) => {
    const u = String(url)
    calls.push(u)
    const key = Object.keys(routes).find((k) => u.includes(k))
    if (key === undefined) throw new Error(`unexpected fetch: ${u}`)
    const r = routes[key]
    if (r instanceof Error) throw r
    const status = r.status ?? 200
    const headers = r.headers ?? {}
    return { ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, json: async () => r.body }
  }
  return calls
}
